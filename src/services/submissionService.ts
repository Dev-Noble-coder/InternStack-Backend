import { AppError, badRequest } from "../errors";
import { config } from "../config";
import { ExtractionJob, ListingSubmission } from "../models";
import { enqueueExtraction } from "./extractionQueue";
import { normalizeSubmissionUrl } from "./urlSafety";
import { assertSubmissionRateLimit } from "./submissionRateLimit";

const activeStatuses = ["pending", "processing"];

export async function createUrlSubmission(input: { userId: string; sourceUrl: string; idempotencyKey?: string }) {
  const sourceUrl = await normalizeSubmissionUrl(input.sourceUrl);
  if (!input.idempotencyKey && input.sourceUrl.length > 512) throw badRequest("idempotencyKey is required for this request");
  if (input.idempotencyKey) {
    const existing = await ListingSubmission.findOne({ submittedBy: input.userId, idempotencyKey: input.idempotencyKey });
    if (existing) return { submissionId: existing._id.toString(), status: existing.status };
  }
  await assertSubmissionRateLimit(input.userId);
  const activeCount = await ListingSubmission.countDocuments({
    submittedBy: input.userId,
    extractionStatus: { $in: ["queued", "processing"] },
  });
  if (activeCount >= 3)
    throw new AppError(429, "Too many active extraction jobs", "ACTIVE_JOB_LIMIT");
  const duplicate = await ListingSubmission.findOne({ submittedBy: input.userId, sourceUrl, status: { $in: activeStatuses } });
  if (duplicate) return { submissionId: duplicate._id.toString(), status: duplicate.status };
  const submission = await ListingSubmission.create({
    submittedBy: input.userId,
    type: "url",
    sourceUrl,
    idempotencyKey: input.idempotencyKey,
    extractionStatus: "queued",
  });
  const job = await ExtractionJob.create({
    submissionId: submission._id,
    submittedBy: input.userId,
    sourceUrl,
    normalizedUrl: sourceUrl,
    maxAttempts: config.EXTRACTION_MAX_ATTEMPTS,
  });
  submission.extractionJobId = job._id.toString();
  await submission.save();
  try {
    await enqueueExtraction({
      jobId: job._id.toString(),
      submissionId: submission._id.toString(),
      submittedBy: input.userId,
      sourceUrl,
    });
  } catch (error) {
    await ExtractionJob.findByIdAndUpdate(job._id, {
      status: "failed",
      lastError: error instanceof Error ? error.message : String(error),
    });
    await ListingSubmission.findByIdAndUpdate(submission._id, {
      status: "failed",
      extractionStatus: "failed",
      extractionError: "Extraction queue is unavailable",
    });
    throw new AppError(503, "Opportunity extraction is temporarily unavailable", "EXTRACTION_UNAVAILABLE");
  }
  return { submissionId: submission._id.toString(), status: submission.status };
}

export async function getSubmissionSnapshot(submissionId: string, userId: string) {
  const item = await ListingSubmission.findOne({ _id: submissionId, submittedBy: userId }).lean();
  if (!item) throw new AppError(404, "Submission not found", "SUBMISSION_NOT_FOUND");
  return { type: "submission_snapshot", submissionId, status: item.status, data: item.extractedData, error: item.extractionError };
}
