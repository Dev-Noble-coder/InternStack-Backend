import { Router } from "express";
import { listLogs } from "../controllers/logController";
import { authenticate, authorize } from "../middleware/auth";

export const createLogRouter = (): Router => {
  const router = Router();
  router.get("/", authenticate, authorize("admin"), listLogs);
  return router;
};
