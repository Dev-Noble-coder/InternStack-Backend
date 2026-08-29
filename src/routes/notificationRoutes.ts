import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as controller from "../controllers/notificationController";
export const createNotificationRouter = () => {
  const router = Router();
  router.use(authenticate);
  router.get("/", controller.listNotifications);
  router.get("/unread-count", controller.unreadCount);
  router.patch("/read-all", controller.markAllRead);
  router.patch("/:id/read", controller.markRead);
  return router;
};
