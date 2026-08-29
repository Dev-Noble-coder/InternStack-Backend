import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate, schemas } from "../validation";
import * as c from "../controllers/adminController";
export const createAdminRouter = () => {
  const r = Router();
  r.use(authenticate, authorize("admin", "super_admin"));
  r.get("/dashboard", c.dashboard);
  r.get("/users", c.users);
  r.get("/users/:id", c.user);
  r.patch("/users/:id/suspend", validate(schemas.reason), c.suspend);
  r.patch("/users/:id/reactivate", c.reactivate);
  r.patch("/users/:id/deactivate", c.deactivate);
  r.get("/students/:id/profile", c.studentProfile);
  r.post("/students/:id/flag", validate(schemas.flag), c.flag);
  r.get("/companies", c.companies);
  r.post("/companies", validate(schemas.companyCreate), c.createCompany);
  r.get("/companies/:id", c.getCompany);
  r.put("/companies/:id", validate(schemas.companyUpdate), c.updateCompany);
  r.get("/listings", c.listings);
  r.post("/listings", validate(schemas.listingCreate), c.createListing);
  r.get("/listings/:id", c.getListing);
  r.put("/listings/:id", validate(schemas.listingUpdate), c.updateListing);
  r.patch("/listings/:id/close", validate(schemas.closeListing), c.closeListing);
  r.patch(
    "/listings/:id/expire",
    validate(schemas.expireListing),
    c.expireListing,
  );
  r.get("/submissions", c.submissions);
  r.get("/submissions/:id", c.submission);
  r.patch(
    "/submissions/:id/approve",
    validate(schemas.approveSubmission),
    c.submissionAction,
  );
  r.patch(
    "/submissions/:id/reject",
    validate(schemas.action),
    c.submissionAction,
  );
  r.get("/applications", c.applications);
  r.get("/applications/:id", c.application);
  r.patch(
    "/applications/:id/confirm-placement",
    validate(schemas.placement),
    c.confirmPlacement,
  );
  r.patch(
    "/applications/:id/review",
    validate(schemas.action),
    c.applicationAction,
  );
  r.patch(
    "/applications/:id/accept",
    validate(schemas.action),
    c.applicationAction,
  );
  r.patch(
    "/applications/:id/reject",
    validate(schemas.action),
    c.applicationAction,
  );
  r.get("/audit-logs", c.auditLogs);
  return r;
};
