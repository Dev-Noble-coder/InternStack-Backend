import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { config } from "../config";
import { ExtractionJob, ListingSubmission } from "../models";
import { extractFromUrl } from "./scraper";
import { logger } from "../logging/logger";

const queueName = "internstack-opportunity-extraction";
let queue: Queue | undefined;
let worker: Worker | undefined;
let connection: Redis | undefined;

export type SubmissionEvent = {
  type: "submission_status" | "submission_completed" | "submission_failed";
  submissionId: string;
  status: string;
  data?: unknown;
  message?: string;
};

export function isExtractionQueueConfigured() {
  return Boolean(config.REDIS_URL);
}

export async function enqueueExtraction(input: {
  jobId: string;
  submissionId: string;
  submittedBy: string;
  sourceUrl: string;
}) {
  if (!config.REDIS_URL) throw new Error("REDIS_URL is required for extraction");
  if (!queue) initializeQueue();
  await queue!.add("extract-opportunity", input, {
    jobId: input.jobId,
    attempts: config.EXTRACTION_MAX_ATTEMPTS,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: false,
  });
}

export function startExtractionWorker(publish: (event: SubmissionEvent) => Promise<void> | void) {
  if (!config.REDIS_URL || worker) return;
  connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  worker = new Worker(queueName, async (job) => {
    const { submissionId } = job.data as { submissionId: string };
    const submission = await ListingSubmission.findById(submissionId);
    const extractionJob = await ExtractionJob.findOne({ submissionId });
    if (!submission || !extractionJob) throw new Error("Extraction job record not found");
    extractionJob.status = "processing";
    extractionJob.attempts = job.attemptsMade + 1;
    extractionJob.processingStartedAt = new Date();
    submission.status = "processing";
    submission.extractionStatus = "processing";
    submission.extractionAttempts = extractionJob.attempts;
    submission.processingStartedAt = new Date();
    submission.lastAttemptAt = new Date();
    await Promise.all([extractionJob.save(), submission.save()]);
    await publish({ type: "submission_status", submissionId, status: "processing" });
    try {
      const extracted = await extractFromUrl(submission.sourceUrl!);
      if (!extracted) throw new Error("The scraper returned no extraction data");
      submission.extractedData = extracted as any;
      submission.status = "reviewed";
      submission.extractionStatus = "completed";
      submission.extractionError = undefined;
      submission.completedAt = new Date();
      extractionJob.status = "completed";
      extractionJob.completedAt = new Date();
      await Promise.all([submission.save(), extractionJob.save()]);
      await publish({ type: "submission_completed", submissionId, status: "reviewed", data: extracted });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      extractionJob.lastError = message;
      if (job.attemptsMade + 1 >= config.EXTRACTION_MAX_ATTEMPTS) {
        submission.status = "failed";
        submission.extractionStatus = "failed";
        submission.extractionError = message;
        extractionJob.status = "failed";
        await Promise.all([submission.save(), extractionJob.save()]);
        await publish({ type: "submission_failed", submissionId, status: "failed", message: "Opportunity extraction failed" });
      } else {
        await Promise.all([submission.save(), extractionJob.save()]);
      }
      throw error;
    }
  }, { connection, concurrency: 2 });
  worker.on("error", (error) => logger.error("Extraction worker error", error));
}

export async function initializeExtractionQueue() {
  if (!config.REDIS_URL) return;
  initializeQueue();
}

function initializeQueue() {
  if (queue || !config.REDIS_URL) return;
  connection = connection ?? new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue(queueName, { connection });
}

export async function closeExtractionQueue() {
  await worker?.close();
  await queue?.close();
  await connection?.quit();
  worker = undefined;
  queue = undefined;
  connection = undefined;
}
