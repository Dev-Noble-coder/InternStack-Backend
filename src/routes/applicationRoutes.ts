import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate, schemas } from "../validation";
import { createApplication } from "../controllers/applicationController";
export const createApplicationRouter = () => {
  const router = Router();
  router.post(
    "/",
    authenticate,
    authorize("student"),
    validate(schemas.application),
    createApplication,
  );
  return router;
};
