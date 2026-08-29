import { Notification, User } from "../models";
import { createEmailService } from "./email";
import { logger } from "../logging/logger";
export type NotificationType =
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_REVIEWED"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "APPLICATION_WITHDRAWN"
  | "PLACEMENT_CONFIRMED"
  | "LISTING_CLOSED"
  | "LISTING_EXPIRED"
  | "ADMIN_INVITATION"
  | "PROFILE_CV_ISSUE";
export const createNotification = (
  userId: any,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: object,
) => Notification.create({ userId, type, title, message, metadata });
export async function sendNotificationEmail(notification: any): Promise<void> {
  try {
    const user = await User.findById(notification.userId);
    if (!user) return;
    const email = createEmailService();
    const type = notification.type as NotificationType;
    const data = notification.metadata ?? {};
    if (type === "PROFILE_CV_ISSUE")
      return email.sendProfileCvIssueEmail({
        to: user.email,
        firstName: user.firstName,
        issue: data.issue,
        type: data.type,
      });
    if (type === "APPLICATION_WITHDRAWN")
      return email.sendApplicationWithdrawnEmail({
        to: user.email,
        firstName: user.firstName,
        listingTitle: data.listingTitle ?? "the listing",
      });
    if (
      type === "LISTING_CLOSED" ||
      type === "LISTING_EXPIRED" ||
      type === "ADMIN_INVITATION"
    )
      return;
    if (type === "APPLICATION_SUBMITTED")
      return email.sendApplicationSubmittedEmail({
        to: user.email,
        firstName: user.firstName,
        companyName: data.companyName,
        listingTitle: data.listingTitle,
      });
    if (type === "APPLICATION_REVIEWED")
      return email.sendApplicationReviewedEmail({
        to: user.email,
        firstName: user.firstName,
        companyName: data.companyName,
      });
    if (type === "APPLICATION_ACCEPTED")
      return email.sendApplicationAcceptedEmail({
        to: user.email,
        firstName: user.firstName,
        companyName: data.companyName,
      });
    if (type === "APPLICATION_REJECTED")
      return email.sendApplicationRejectedEmail({
        to: user.email,
        firstName: user.firstName,
        companyName: data.companyName,
      });
    if (type === "PLACEMENT_CONFIRMED")
      return email.sendPlacementConfirmedEmail({
        to: user.email,
        firstName: user.firstName,
        companyName: data.companyName,
        startDate: data.startDate,
        endDate: data.endDate,
      });
  } catch (error) {
    logger.error("Notification email delivery failed", error);
  }
}
