import { Response, NextFunction } from "express";
import { Notification } from "../models";
import { AuthRequest } from "../middleware/auth";
import { AppError, badRequest } from "../errors";
const paging = (r: AuthRequest) => {
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
export async function listNotifications(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = paging(request);
    const filter: any = { userId: request.identity!.userId };
    if (request.query.isRead !== undefined)
      filter.isRead = request.query.isRead === "true";
    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    response.json({
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
    next(e);
  }
}
export async function unreadCount(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json({
      success: true,
      data: {
        count: await Notification.countDocuments({
          userId: request.identity!.userId,
          isRead: false,
        }),
      },
    });
  } catch (e) {
    next(e);
  }
}
export async function markRead(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const notification = await Notification.findById(request.params.id);
    if (!notification)
      throw new AppError(
        404,
        "Notification not found",
        "NOTIFICATION_NOT_FOUND",
      );
    if (String(notification.userId) !== request.identity!.userId)
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    notification.isRead = true;
    await notification.save();
    response.json({ success: true, data: notification });
  } catch (e) {
    next(e);
  }
}
export async function markAllRead(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    await Notification.updateMany(
      { userId: request.identity!.userId, isRead: false },
      { $set: { isRead: true } },
    );
    response.json({
      success: true,
      message: "Notifications marked as read",
      data: {},
    });
  } catch (e) {
    next(e);
  }
}
