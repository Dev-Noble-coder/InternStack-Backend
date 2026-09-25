import { Response, NextFunction } from "express";
import { AdminInvitation, Notification, User } from "../models";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "../errors";
import { randomToken, hashSecret } from "../utils";
import { createEmailService } from "../services/email";
import { createAuditLog } from "../services/audit";
import { objectIdParam } from "../validation";
import { config } from "../config";
const assertId = (value: unknown) => {
  if (!objectIdParam.safeParse(value).success)
    throw new AppError(400, "Invalid ID format.", "VALIDATION_ERROR");
};
export async function createInvitation(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    const email = r.body.email.trim().toLowerCase();
    if (await AdminInvitation.exists({ email, status: "pending" }))
      throw new AppError(
        409,
        "Invitation already pending",
        "INVITE_ALREADY_PENDING",
      );
    if (await User.exists({ email }))
      throw new AppError(
        409,
        "Email already registered",
        "EMAIL_ALREADY_REGISTERED",
      );
    const token = randomToken();
    const item = await AdminInvitation.create({
      email,
      tokenHash: hashSecret(token),
      invitedBy: r.identity!.userId,
      expiresAt: new Date(Date.now() + 72 * 3600000),
    });
    const url = new URL(
      "/accept-invitation",
      config.CLIENT_URL,
    );
    url.searchParams.set("token", token);
    await createEmailService().sendAdminInvitationEmail({
      to: email,
      inviteUrl: url.toString(),
      expiresInHours: 72,
    });
    await createAuditLog(
      "ADMIN_INVITED",
      r.identity!.userId,
      "Invitation",
      item._id,
    );
    await Notification.create({
      userId: r.identity!.userId,
      type: "ADMIN_INVITATION",
      title: "Admin Invitation Sent",
      message: `An invitation has been sent to ${item.email}.`,
      metadata: { invitationId: item._id, email: item.email },
    });
    s.status(201).json({
      success: true,
      data: { id: item._id, status: item.status },
    });
  } catch (e) {
    n(e);
  }
}
export async function listInvitations(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    const page = Math.max(1, Number(r.query.page || 1)),
      limit = Math.min(100, Math.max(1, Number(r.query.limit || 20)));
    const f: any = {};
    if (r.query.status) f.status = r.query.status;
    const [items, total] = await Promise.all([
      AdminInvitation.find(f)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminInvitation.countDocuments(f),
    ]);
    s.json({
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
  } catch (e) {
    n(e);
  }
}
export async function revokeInvitation(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    const item = await AdminInvitation.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Invitation not found", "INVITATION_NOT_FOUND");
    if (item.status === "accepted")
      throw new AppError(409, "Invitation already used", "INVITE_ALREADY_USED");
    item.status = "revoked";
    await item.save();
    await createAuditLog(
      "ADMIN_INVITE_REVOKED",
      r.identity!.userId,
      "Invitation",
      item._id,
    );
    s.json({ success: true, data: item });
  } catch (e) {
    n(e);
  }
}

export async function resendAdminInvitation(
  r: AuthRequest,
  s: Response,
  n: NextFunction,
) {
  try {
    assertId(r.params.id);
    const item = await AdminInvitation.findById(r.params.id);
    if (!item)
      throw new AppError(404, "Invitation not found", "INVITATION_NOT_FOUND");
    if (item.status !== "pending")
      throw new AppError(
        400,
        "Only pending invitations can be resent.",
        "INVITATION_NOT_PENDING",
      );
    const token = randomToken();
    item.tokenHash = hashSecret(token);
    item.expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await item.save();
    const url = new URL(
      "/accept-invitation",
      config.CLIENT_URL,
    );
    url.searchParams.set("token", token);
    await createEmailService().sendAdminInvitationEmail({
      to: item.email,
      inviteUrl: url.toString(),
      expiresInHours: 72,
    });
    await createAuditLog(
      "INVITATION_RESENT",
      r.identity!.userId,
      "Invitation",
      item._id,
    );
    s.json({
      success: true,
      message: "Invitation resent.",
      data: { invitation: item },
    });
  } catch (e) {
    n(e);
  }
}
