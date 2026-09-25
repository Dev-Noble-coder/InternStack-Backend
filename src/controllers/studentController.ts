import { Request, Response, NextFunction } from "express";
import {
  Application,
  Listing,
  ListingSubmission,
  Notification,
  StudentProfile,
  User,
} from "../models";
import { AppError, badRequest } from "../errors";
import { calculateCompletion } from "../services/profile";
import {
  createNotification,
  sendNotificationEmail,
} from "../services/notifications";
import { AuthRequest } from "../middleware/auth";
import { objectIdParam } from "../validation";
import { createUrlSubmission } from "../services/submissionService";
import { logger } from "../logging/logger";

const id = (request: AuthRequest) => request.identity!.userId;
const assertId = (value: unknown) => {
  if (!objectIdParam.safeParse(value).success)
    throw new AppError(400, "Invalid ID format.", "VALIDATION_ERROR");
};
const pageArgs = (request: Request) => {
  const page = Math.max(1, Number(request.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 20)));
  if (!Number.isInteger(page) || !Number.isInteger(limit))
    throw badRequest("page and limit must be integers");
  return { page, limit };
};
const paginated = (
  items: any[],
  page: number,
  limit: number,
  total: number,
) => ({
  success: true,
  data: {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  },
});

export async function getProfile(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    let profile = await StudentProfile.findOne({ userId: id(request) });
    if (!profile)
      profile = await StudentProfile.create({ userId: id(request) });
    const values = calculateCompletion(profile);
    await StudentProfile.updateOne({ _id: profile._id }, values);
    response.json({
      success: true,
      data: { ...profile.toObject(), ...values },
    });
  } catch (e) {
    next(e);
  }
}
export async function updateProfile(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const { cv, profilePictureUrl: _picture, ...updates } = request.body;
    let profile = await StudentProfile.findOneAndUpdate(
      { userId: id(request) },
      {
        $set: {
          ...updates,
          internshipStartPeriod: updates.internshipStartPeriod
            ? new Date(updates.internshipStartPeriod)
            : undefined,
          internshipEndPeriod: updates.internshipEndPeriod
            ? new Date(updates.internshipEndPeriod)
            : undefined,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const values = calculateCompletion(profile);
    profile = (await StudentProfile.findByIdAndUpdate(profile._id, values, {
      new: true,
    }))!;
    response.json({ success: true, data: profile });
  } catch (e) {
    next(e);
  }
}
export async function dashboard(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const user = await User.findById(id(request));
    const profile = await StudentProfile.findOne({ userId: id(request) });
    const active = await Application.countDocuments({
      studentId: id(request),
      status: { $in: ["applied", "reviewed"] },
    });
    const total = await Application.countDocuments({ studentId: id(request) });
    const query: any = { status: "published" };
    if (profile?.preferredLocations?.length || profile?.internshipType)
      query.$or = [
        { locations: { $in: profile.preferredLocations ?? [] } },
        { internshipType: profile.internshipType },
      ];
    let suggested = await Listing.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("companyId", "name logo website")
      .lean();
    if (suggested.length < 5)
      suggested = await Listing.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("companyId", "name logo website")
        .lean();
    const values = calculateCompletion(profile ?? {});
    response.json({
      success: true,
      data: {
        profile: {
          firstName: user?.firstName,
          profilePicture: user?.profilePicture,
          ...values,
        },
        applications: { active, total },
        suggestedListings: suggested,
        notifications: {
          unreadCount: await Notification.countDocuments({
            userId: id(request),
            isRead: false,
          }),
        },
      },
    });
  } catch (e) {
    next(e);
  }
}
const withWithdraw = (application: any) => ({
  ...application,
  canWithdraw:
    ["applied", "reviewed"].includes(application.status) &&
    new Date(application.appliedAt).getTime() > Date.now() - 86400000,
});
export async function listApplications(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = pageArgs(request);
    const filter: any = { studentId: id(request) };
    if (request.query.status) filter.status = request.query.status;
    const [items, total] = await Promise.all([
      Application.find(filter)
        .sort({ appliedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("listingId", "title status")
        .populate("companyId", "name logo")
        .lean(),
      Application.countDocuments(filter),
    ]);
    response.json(paginated(items.map(withWithdraw), page, limit, total));
  } catch (e) {
    next(e);
  }
}
export async function getApplication(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    assertId(request.params.id);
    const application = await Application.findById(request.params.id)
      .populate("listingId", "title status")
      .populate("companyId", "name logo")
      .lean();
    if (!application)
      throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
    if (String(application.studentId) !== id(request))
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    response.json({ success: true, data: withWithdraw(application) });
  } catch (e) {
    next(e);
  }
}
export async function withdrawApplication(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    assertId(request.params.id);
    const application = await Application.findById(request.params.id);
    if (!application)
      throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
    if (String(application.studentId) !== id(request))
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    if (!["applied", "reviewed"].includes(application.status))
      throw new AppError(
        409,
        "Application cannot be withdrawn in its current status",
        "CANNOT_WITHDRAW_STATUS",
      );
    if (new Date(application.appliedAt).getTime() <= Date.now() - 86400000)
      throw new AppError(
        409,
        "Withdrawal period has expired",
        "WITHDRAWAL_PERIOD_EXPIRED",
      );
    application.status = "withdrawn";
    application.withdrawnAt = new Date();
    await application.save();
    response.json({
      success: true,
      message: "Application withdrawn",
      data: application,
    });
    try {
      const notificationApplication = await Application.findById(
        application._id,
      )
        .populate("listingId", "title")
        .populate("companyId", "name");
      if (!notificationApplication) return;
      const notification = await createNotification(
        notificationApplication.studentId,
        "APPLICATION_WITHDRAWN",
        "Application withdrawn",
        `Your application to ${(notificationApplication.listingId as any)?.title ?? "the listing"} has been withdrawn.`,
        {
          applicationId: notificationApplication._id,
          listingId: notificationApplication.listingId,
          listingTitle:
            (notificationApplication.listingId as any)?.title ?? "the listing",
          companyName:
            (notificationApplication.companyId as any)?.name ?? "the company",
        },
      );
      await sendNotificationEmail(notification);
    } catch (error) {
      logger.error(
        "Application withdrawal notification failed",
        error,
        undefined,
        {
          applicationId: application._id.toString(),
        },
      );
    }
  } catch (e) {
    next(e);
  }
}
export async function createSubmission(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const body = request.body;
    if (body.type === "url" && !body.sourceUrl)
      throw badRequest("sourceUrl is required");
    if (body.type === "manual" && (!body.company || !body.title))
      throw badRequest("company and title are required");
    if (body.type === "url") {
      const result = await createUrlSubmission({
        userId: id(request),
        sourceUrl: body.sourceUrl,
        idempotencyKey: request.get("Idempotency-Key") ?? undefined,
      });
      response.status(202).json({ success: true, data: result });
      return;
    }
    const submission = await ListingSubmission.create({
      submittedBy: id(request),
      type: body.type,
      manualData: body,
    });
    response.status(201).json({
      success: true,
      data: { submissionId: submission._id, status: submission.status },
    });
  } catch (e) {
    next(e);
  }
}
export async function listSubmissions(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = pageArgs(request);
    const filter: any = { submittedBy: id(request) };
    if (request.query.status) filter.status = request.query.status;
    const [items, total] = await Promise.all([
      ListingSubmission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ListingSubmission.countDocuments(filter),
    ]);
    response.json(paginated(items, page, limit, total));
  } catch (e) {
    next(e);
  }
}
