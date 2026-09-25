import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate, schemas } from "../validation";
import { createSubmission } from "../controllers/studentController";
export const createSubmissionRouter = () => {
  const router = Router();
  router.post(
    "/",
    authenticate,
    authorize("student", "admin"),
    validate(schemas.submission),
    createSubmission,
  );
  return router;
};
