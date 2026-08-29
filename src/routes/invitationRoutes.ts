import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate, schemas } from "../validation";
import * as c from "../controllers/invitationController";
export const createInvitationRouter = () => {
  const r = Router();
  r.use(authenticate, authorize("super_admin"));
  r.post("/", validate(schemas.invitation), c.createInvitation);
  r.get("/", c.listInvitations);
  r.post("/:id/resend", c.resendAdminInvitation);
  r.delete("/:id", c.revokeInvitation);
  return r;
};
