import { Response, NextFunction } from "express";
import { Application, Listing, StudentProfile } from "../models";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "../errors";
import {
  createNotification,
  sendNotificationEmail,
} from "../services/notifications";
export async function createApplication(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const studentId = request.identity!.userId;
    const listing = await Listing.findById(request.body.listingId);
    if (!listing)
      throw new AppError(404, "Listing not found", "LISTING_NOT_FOUND");
    if (listing.status !== "published")
      throw new AppError(
        409,
        listing.status === "expired"
          ? "Listing has expired"
          : "Listing is closed",
        listing.status === "expired" ? "LISTING_EXPIRED" : "LISTING_CLOSED",
      );
    if (listing.applicationDeadline && listing.applicationDeadline < new Date())
      throw new AppError(
        409,
        "Application deadline has passed",
        "DEADLINE_PASSED",
      );
    const profile = await StudentProfile.findOne({ userId: studentId });
    if (!profile?.institution || !profile.matricNumber)
      throw new AppError(
        422,
        "Student profile is incomplete",
        "PROFILE_INCOMPLETE",
      );
    if (!profile.cv?.url)
      throw new AppError(422, "A CV is required", "CV_REQUIRED");
    if (
      (await Application.countDocuments({
        studentId,
        status: { $in: ["applied", "reviewed"] },
      })) >= 2
    )
      throw new AppError(
        409,
        "Application limit reached",
        "APPLICATION_LIMIT_REACHED",
      );
    if (
      await Application.exists({
        studentId,
        companyId: listing.companyId,
        status: { $in: ["applied", "reviewed"] },
      })
    )
      throw new AppError(
        409,
        "An active application already exists for this company",
        "COMPANY_APPLICATION_EXISTS",
      );
    if (
      await Application.exists({
        studentId,
        listingId: listing._id,
        status: { $in: ["applied", "reviewed"] },
      })
    )
      throw new AppError(409, "Already applied", "ALREADY_APPLIED");
    const application = await Application.create({
      studentId,
      listingId: listing._id,
      companyId: listing.companyId,
      cvSnapshot: {
        url: profile.cv.url,
        filename: profile.cv.filename ?? "CV",
      },
    });
    const notification = await createNotification(
      studentId,
      "APPLICATION_SUBMITTED",
      "Application submitted",
      `Your application for ${listing.title} was submitted.`,
      {
        applicationId: application._id,
        listingId: listing._id,
        companyId: listing.companyId,
        listingTitle: listing.title,
      },
    );
    void sendNotificationEmail(notification).catch(() => undefined);
    response.status(201).json({ success: true, data: application });
  } catch (e) {
    next(e);
  }
}
