import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate, schemas } from "../validation";
import * as controller from "../controllers/studentController";
export const createStudentRouter = () => {
  const router = Router();
  router.use(authenticate, authorize("student"));
  router.get("/profile", controller.getProfile);
  router.put(
    "/profile",
    validate(schemas.studentProfile),
    controller.updateProfile,
  );
  router.get("/dashboard", controller.dashboard);
  router.get("/applications", controller.listApplications);
  router.get("/applications/:id", controller.getApplication);
  router.delete("/applications/:id", controller.withdrawApplication);
  router.post(
    "/submissions",
    validate(schemas.submission),
    controller.createSubmission,
  );
  router.get("/submissions", controller.listSubmissions);
  return router;
};
