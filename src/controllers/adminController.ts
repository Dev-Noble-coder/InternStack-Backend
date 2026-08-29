import { Request, Response, NextFunction } from "express";
import {
  Application,
  AuditLog,
  Company,
  Listing,
  ListingSubmission,
  Notification,
  StudentProfile,
  User,
} from "../models";
import { AuthRequest } from "../middleware/auth";
import { AppError, badRequest } from "../errors";
import { createAuditLog } from "../services/audit";
import {
  createNotification,
  sendNotificationEmail,
} from "../services/notifications";
import { TokenService } from "../services/tokens";
import { calculateVettingScore } from "../services/vetting";
import { objectIdParam } from "../validation";
import { logger } from "../logging/logger";
const tokenService = new TokenService();
const paging = (r: Request) => {
  const page = Number(r.query.page ?? 1),
    limit = Math.min(100, Number(r.query.limit ?? 20));
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1
  )
    throw badRequest("page and limit must be valid integers");
  return { page, limit };
};
const result = (items: any[], page: number, limit: number, total: number) => ({
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
const actor = (r: AuthRequest) => r.identity!.userId;
const assertId = (value: unknown) => {
  if (!objectIdParam.safeParse(value).success)
    throw new AppError(400, "Invalid ID format.", "VALIDATION_ERROR");
};
const validateListingDates = (body: any) => {
  if (
    body.startDate &&
    body.endDate &&
    new Date(body.startDate) >= new Date(body.endDate)
  )
    throw new AppError(
      400,
      "startDate must be before endDate.",
      "VALIDATION_ERROR",
    );
  if (
    body.applicationDeadline &&
    body.startDate &&
    new Date(body.applicationDeadline) > new Date(body.startDate)
  )
    throw new AppError(
      400,
      "applicationDeadline must be on or before startDate.",
      "VALIDATION_ERROR",
    );
};
export async function dashboard(r: AuthRequest, s: Response, n: NextFunction) {
  try {
    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      totalListings,
      totalCompanies,
      activeApplications,
      placementsConfirmed,
      recentUsers,
      recentApplications,
      pendingSubmissions,
      unreadCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: { $in: ["admin", "super_admin"] } }),
      Listing.countDocuments(),
      Company.countDocuments(),
      Application.countDocuments({ status: { $in: ["applied", "reviewed"] } }),
      Application.countDocuments({ "placement.confirmed": true }),
      User.find().sort({ createdAt: -1 }).limit(5).lean(),
      Application.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("studentId", "firstName lastName")
        .populate("listingId", "title")
        .lean(),
      ListingSubmission.countDocuments({ status: "pending" }),
      Notification.countDocuments({
        userId: r.identity!.userId,
        isRead: false,
      }),
    ]);
    s.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalStudents,
          totalAdmins,
          totalListings,
          totalCompanies,
          activeApplications,
          placementsConfirmed,
        },
        recentUsers,
        recentApplications,
        notifications: { unreadCount },
        pendingSubmissions,
      },
    });
  } catch (e) {
    n(e);
  }
}
export async function users(r: AuthRequest, s: Response, n: NextFunction) {
  try {
    const { page, limit } = paging(r);
    const f: any = {};
    if (r.query.role) f.role = r.query.role;
    if (r.query.status) f.status = r.query.status;
    if (r.query.search) {
      const term = new RegExp(String(r.query.search), "i");
      const profiles = await StudentProfile.find({
        $or: [{ matricNumber: term }, { institution: term }],
      })
        .select("userId")
        .lean();
      f.$or = [
        { firstName: term },
        { lastName: term },
        { email: term },
        { _id: { $in: profiles.map((profile) => profile.userId) } },
      ];
    }
    const [items, total] = await Promise.all([
      User.find(f)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(f),
    ]);
    s.json(result(items, page, limit, total));
  } catch (e) {
    n(e);
  }
}
export async function user(r: AuthRequest, s: Response, n: NextFunction) {
  try {
    assertId(r.params.id);
    const item = await User.findById(r.params.id).lean();
    if (!item) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    const profile = await StudentProfile.findOne({ userId: item._id }).lean();
    const applicationCount = await Application.countDocuments({
      studentId: item._id,
    });
    const activeApplications = await Application.countDocuments({
      studentId: item._id,
      status: { $in: ["applied", "reviewed"] },
    });
    s.json({
      success: true,
      data: { ...item, profile, applicationCount, activeApplications },
    });
  } catch (e) {
    n(e);
  }
}
async function changeStatus(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
  status: "suspended" | "active" | "deactivated",
) {
  try {
    assertId(r.params.id);
    const item = await User.findById(r.params.id);
    if (!item) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    if (status === "suspended" && item.status === "suspended")
      throw new AppError(400, "Already suspended", "ALREADY_SUSPENDED");
    if (status === "deactivated" && r.identity!.role !== "super_admin")
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    if (
      status === "suspended" &&
      item.role !== "student" &&
      r.identity!.role !== "super_admin"
    )
      throw new AppError(403, "Cannot suspend admin", "CANNOT_SUSPEND_ADMIN");
    item.status = status;
    await item.save();
    if (status !== "active") await tokenService.revokeAll(item._id);
    await createAuditLog(
      status === "suspended"
        ? "USER_SUSPENDED"
        : status === "active"
          ? "USER_REACTIVATED"
          : "USER_DEACTIVATED",
      actor(r),
      "User",
      item._id,
      r.body,
    );
    s.json({ success: true, message: `User ${status}`, data: item });
  } catch (e) {
    n(e);
  }
}
export const suspend = (r: AuthRequest, s: Response, n: NextFunction) =>
  changeStatus(r, s, n, "suspended");
export const reactivate = (r: AuthRequest, s: Response, n: NextFunction) =>
  changeStatus(r, s, n, "active");
export const deactivate = (r: AuthRequest, s: Response, n: NextFunction) =>
  changeStatus(r, s, n, "deactivated");
export async function studentProfile(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    const user = await User.findById(r.params.id);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    if (user.role !== "student")
      throw new AppError(400, "User is not a student", "NOT_A_STUDENT");
    s.json({
      success: true,
      data: await StudentProfile.findOne({ userId: user._id }),
    });
  } catch (e) {
    n(e);
  }
}
export async function flag(r: AuthRequest, s: Response, n: NextFunction) {
  try {
    assertId(r.params.id);
    const user = await User.findById(r.params.id);
    if (!user || user.role !== "student")
      throw new AppError(400, "User is not a student", "NOT_A_STUDENT");
    await createNotification(
      user._id,
      "PROFILE_CV_ISSUE",
      "Profile update needed",
      r.body.issue,
      { type: r.body.type },
    );
    const notification = await Notification.findOne({
      userId: user._id,
      type: "PROFILE_CV_ISSUE",
    }).sort({ createdAt: -1 });
    if (notification) void sendNotificationEmail(notification);
    await createAuditLog("PROFILE_FLAGGED", actor(r), "User", user._id, r.body);
    s.json({ success: true, message: "Profile flagged", data: {} });
  } catch (e) {
    n(e);
  }
}
export async function companies(r: Request, s: Response, n: NextFunction) {
  try {
    const { page, limit } = paging(r);
    const f: any = {};
    if (r.query.search)
      f.$or = [
        { name: new RegExp(String(r.query.search), "i") },
        { website: new RegExp(String(r.query.search), "i") },
      ];
    if (r.query.state) f.state = r.query.state;
    const [items, total] = await Promise.all([
      Company.find(f)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Company.countDocuments(f),
    ]);
    s.json(result(items, page, limit, total));
  } catch (e) {
    n(e);
  }
}
export async function createCompany(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    if (await Company.exists({ website: r.body.website }))
      throw new AppError(
        409,
        "Company website already exists",
        "COMPANY_WEBSITE_EXISTS",
      );
    if (
      r.query.force !== "true" &&
      (await Company.exists({
        name: new RegExp(
          `^${String(r.body.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      }))
    )
      throw new AppError(
        409,
        "A company with a similar name already exists. Pass ?force=true to proceed.",
        "COMPANY_NAME_SIMILAR",
      );
    const item = await Company.create(r.body);
    await createAuditLog("COMPANY_CREATED", actor(r), "Company", item._id);
    s.status(201).json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}
export async function getCompany(r: Request, s: Response, n: NextFunction) {
  try {
    assertId(r.params.id);
    const item = await Company.findById(r.params.id).lean();
    if (!item)
      throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    const listings = await Listing.find({ companyId: item._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    s.json({ success: true, data: { ...item, listings } });
  } catch (e) {
    n(e);
  }
}
export async function updateCompany(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    if (
      r.body.website &&
      (await Company.exists({
        website: r.body.website,
        _id: { $ne: r.params.id },
      }))
    )
      throw new AppError(
        409,
        "Another company is already registered with this website.",
        "COMPANY_WEBSITE_DUPLICATE",
      );
    const item = await Company.findByIdAndUpdate(r.params.id, r.body, {
      new: true,
    });
    if (!item)
      throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    await createAuditLog("COMPANY_UPDATED", actor(r), "Company", item._id);
    s.json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}
export async function listings(r: Request, s: Response, n: NextFunction) {
  try {
    const { page, limit } = paging(r);
    const f: any = {};
    for (const key of ["status", "companyId", "internshipType", "workMode"])
      if (r.query[key]) f[key] = r.query[key];
    if (r.query.location) f.locations = r.query.location;
    if (r.query.search)
      f.$or = [
        { title: new RegExp(String(r.query.search), "i") },
        { description: new RegExp(String(r.query.search), "i") },
      ];
    const [items, total] = await Promise.all([
      Listing.find(f)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("companyId", "name logo website")
        .lean(),
      Listing.countDocuments(f),
    ]);
    s.json(result(items, page, limit, total));
  } catch (e) {
    n(e);
  }
}
export async function createListing(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    validateListingDates(r.body);
    const company = await Company.findById(r.body.companyId);
    if (!company)
      throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    const item = await Listing.create({ ...r.body, status: "published" });
    await createAuditLog("LISTING_CREATED", actor(r), "Listing", item._id);
    s.status(201).json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}
export async function getListing(r: Request, s: Response, n: NextFunction) {
  try {
    assertId(r.params.id);
    const item = await Listing.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Listing not found", "LISTING_NOT_FOUND");
    s.json({
      success: true,
      data: {
        ...item.toObject(),
        applicationCount: await Application.countDocuments({
          listingId: item._id,
        }),
      },
    });
  } catch (e) {
    n(e);
  }
}
export async function updateListing(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    validateListingDates(r.body);
    const old = await Listing.findById(r.params.id);
    if (!old) throw new AppError(404, "Listing not found", "LISTING_NOT_FOUND");
    if (["closed", "expired"].includes(old.status))
      throw new AppError(
        409,
        "Listing is not editable",
        "LISTING_NOT_EDITABLE",
      );
    Object.assign(old, r.body);
    await old.save();
    await createAuditLog("LISTING_UPDATED", actor(r), "Listing", old._id);
    s.json({ success: true, data: old });
  } catch (e) {
    n(e);
  }
}
export async function closeListing(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  return endListing(r, s, n, "closed");
}
export async function expireListing(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  return endListing(r, s, n, "expired");
}
async function endListing(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
  status: string,
) {
  try {
    assertId(r.params.id);
    const item = await Listing.findByIdAndUpdate(
      r.params.id,
      {
        status,
        ...(status === "closed" && r.body.reason
          ? { closeReason: r.body.reason }
          : {}),
      },
      { new: true },
    );
    if (!item)
      throw new AppError(404, "Listing not found", "LISTING_NOT_FOUND");
    const apps = await Application.find({
      listingId: item._id,
      status: { $in: ["applied", "reviewed"] },
    });
    await Promise.all(
      apps.map((a) =>
        createNotification(
          a.studentId,
          status === "closed" ? "LISTING_CLOSED" : "LISTING_EXPIRED",
          `Listing ${status}`,
          `A listing you applied to (${item.title}) has ${status}.`,
          { listingId: item._id, listingTitle: item.title },
        ),
      ),
    );
    await createAuditLog(
      status === "closed" ? "LISTING_CLOSED" : "LISTING_EXPIRED",
      actor(r),
      "Listing",
      item._id,
      r.body,
    );
    s.json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}
export async function submissions(r: Request, s: Response, n: NextFunction) {
  try {
    const { page, limit } = paging(r);
    const f: any = {};
    if (r.query.status) f.status = r.query.status;
    const [items, total] = await Promise.all([
      ListingSubmission.find(f)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ListingSubmission.countDocuments(f),
    ]);
    s.json(result(items, page, limit, total));
  } catch (e) {
    n(e);
  }
}
export async function submission(r: Request, s: Response, n: NextFunction) {
  try {
    assertId(r.params.id);
    const item = await ListingSubmission.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Submission not found", "SUBMISSION_NOT_FOUND");
    s.json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}
export async function applications(r: Request, s: Response, n: NextFunction) {
  try {
    const { page, limit } = paging(r);
    const f: any = {};
    for (const k of ["status", "listingId", "companyId", "studentId"])
      if (r.query[k]) f[k] = r.query[k];
    if (r.query.search) {
      const term = new RegExp(String(r.query.search), "i");
      const matchingUsers = await User.find({
        $or: [{ firstName: term }, { lastName: term }, { email: term }],
      })
        .select("_id")
        .lean();
      const matchingProfiles = await StudentProfile.find({ matricNumber: term })
        .select("userId")
        .lean();
      f.studentId = {
        $in: [
          ...matchingUsers.map((user) => user._id),
          ...matchingProfiles.map((profile) => profile.userId),
        ],
      };
    }
    const [items, total] = await Promise.all([
      Application.find(f)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("studentId", "firstName lastName email")
        .populate("listingId", "title")
        .lean(),
      Application.countDocuments(f),
    ]);
    s.json(result(items, page, limit, total));
  } catch (e) {
    n(e);
  }
}
export async function application(r: Request, s: Response, n: NextFunction) {
  try {
    assertId(r.params.id);
    const item = await Application.findById(r.params.id)
      .populate("studentId", "firstName lastName email")
      .populate("listingId")
      .lean();
    if (!item)
      throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
    const vetting = await calculateVettingScore(String(item._id));
    s.json({
      success: true,
      data: {
        ...item,
        vettingScore: vetting.score,
        vettingBreakdown: vetting.breakdown,
      },
    });
  } catch (e) {
    n(e);
  }
}
export async function auditLogs(r: Request, s: Response, n: NextFunction) {
  try {
    const { page, limit } = paging(r);
    const f: any = {};
    for (const k of ["action", "performedBy", "targetType", "targetId"])
      if (r.query[k]) f[k] = r.query[k];
    if (r.query.performedById) f.performedBy = r.query.performedById;
    if (r.query.from || r.query.to) f.timestamp = {};
    if (r.query.from) f.timestamp.$gte = new Date(String(r.query.from));
    if (r.query.to) f.timestamp.$lte = new Date(String(r.query.to));
    const [items, total] = await Promise.all([
      AuditLog.find(f)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(f),
    ]);
    s.json(result(items, page, limit, total));
  } catch (e) {
    n(e);
  }
}
export async function applicationAction(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    const item = await Application.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
    const action = String(r.params.action);
    const transitions: any = {
      review: {
        from: ["applied"],
        to: "reviewed",
        notice: "APPLICATION_REVIEWED",
      },
      accept: {
        from: ["applied", "reviewed"],
        to: "accepted",
        notice: "APPLICATION_ACCEPTED",
      },
      reject: {
        from: ["applied", "reviewed", "accepted"],
        to: "rejected",
        notice: "APPLICATION_REJECTED",
      },
    };
    const t = transitions[action];
    if (!t || !t.from.includes(item.status))
      throw new AppError(
        409,
        "Invalid status transition",
        "INVALID_STATUS_TRANSITION",
      );
    item.status = t.to;
    Object.assign(item, r.body);
    await item.save();
    await createAuditLog(
      `APPLICATION_${t.to.toUpperCase()}`,
      actor(r),
      "Application",
      item._id,
      r.body,
    );
    s.json({ success: true, data: item });
    try {
      const notificationItem = await Application.findById(item._id)
        .populate("listingId", "title")
        .populate("companyId", "name");
      if (!notificationItem) return;
      const notification = await createNotification(
        notificationItem.studentId,
        t.notice,
        `Application ${t.to}`,
        `Your application to ${(notificationItem.listingId as any)?.title ?? "the listing"} is now ${t.to}.`,
        {
          applicationId: notificationItem._id,
          listingId: notificationItem.listingId,
          companyName:
            (notificationItem.companyId as any)?.name ?? "the company",
          listingTitle:
            (notificationItem.listingId as any)?.title ?? "the listing",
        },
      );
      await sendNotificationEmail(notification);
    } catch (error) {
      logger.error("Application notification failed", error, undefined, {
        applicationId: item._id.toString(),
      });
    }
  } catch (e) {
    n(e);
  }
}
export async function confirmPlacement(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    const item = await Application.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Application not found", "APPLICATION_NOT_FOUND");
    if (item.status !== "accepted")
      throw new AppError(
        409,
        "Application is not accepted",
        "NOT_YET_ACCEPTED",
      );
    if (item.placement?.confirmed)
      throw new AppError(
        409,
        "Placement already confirmed",
        "PLACEMENT_ALREADY_CONFIRMED",
      );
    item.placement = {
      confirmed: true,
      startDate: new Date(r.body.startDate),
      endDate: new Date(r.body.endDate),
      confirmedAt: new Date(),
      note: r.body.note,
    } as any;
    item.companyAccepted = true;
    await item.save();
    await createAuditLog(
      "PLACEMENT_CONFIRMED",
      actor(r),
      "Application",
      item._id,
      r.body,
    );
    s.json({ success: true, data: item });
    try {
      const notificationItem = await Application.findById(item._id)
        .populate("listingId", "title")
        .populate("companyId", "name");
      if (!notificationItem) return;
      const notification = await createNotification(
        notificationItem.studentId,
        "PLACEMENT_CONFIRMED",
        "Placement confirmed",
        `Your placement at ${(notificationItem.companyId as any)?.name ?? "the company"} has been confirmed.`,
        {
          applicationId: notificationItem._id,
          listingId: notificationItem.listingId,
          companyName:
            (notificationItem.companyId as any)?.name ?? "the company",
          startDate: r.body.startDate,
          endDate: r.body.endDate,
        },
      );
      await sendNotificationEmail(notification);
    } catch (error) {
      logger.error("Placement notification failed", error, undefined, {
        applicationId: item._id.toString(),
      });
    }
  } catch (e) {
    n(e);
  }
}
export async function submissionAction(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    const action = String(r.params.action);
    if (!["approve", "reject"].includes(action))
      throw new AppError(404, "Route not found", "ROUTE_NOT_FOUND");
    const item = await ListingSubmission.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Submission not found", "SUBMISSION_NOT_FOUND");
    if (["approved", "rejected"].includes(item.status))
      throw new AppError(
        409,
        "Submission already processed",
        "ALREADY_PROCESSED",
      );
    if (action === "approve") {
      const merged: any = {
        ...((item.extractedData as any) ?? {}),
        ...((item.manualData as any) ?? {}),
      };
      if (
        !r.body.companyId ||
        !/^[0-9a-fA-F]{24}$/.test(String(r.body.companyId)) ||
        !merged.title ||
        !merged.description
      )
        throw new AppError(400, "companyId is required.", "VALIDATION_ERROR");
      if (!(await Company.findById(r.body.companyId)))
        throw new AppError(404, "Company not found.", "COMPANY_NOT_FOUND");
      const listing = await Listing.create({
        ...merged,
        companyId: r.body.companyId,
        submissionId: item._id,
        status: "published",
        openings: merged.openings ?? 1,
        workMode: merged.workMode ?? "onsite",
        locations:
          merged.locations ??
          (merged.location ? [merged.location] : ["Not specified"]),
      });
      item.status = "approved";
      item.adminNote = r.body.adminNote;
      item.reviewedAt = new Date();
      await item.save();
      await createAuditLog(
        "LISTING_CREATED",
        actor(r),
        "Listing",
        listing._id,
        { submissionId: item._id },
      );
      s.json({
        success: true,
        message: "Submission approved. Listing created.",
        data: { submission: item, listing },
      });
      return;
    }
    item.status = "rejected";
    item.adminNote = r.body.adminNote;
    item.reviewedAt = new Date();
    await item.save();
    await createAuditLog(
      "SUBMISSION_REJECTED",
      actor(r),
      "Submission",
      item._id,
      r.body,
    );
    s.json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}
