import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { badRequest } from "./errors";

const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();
const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8).max(128);
export const objectIdParam = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID format");
export const schemas = {
  register: strictObject({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email,
    password,
    role: z.enum(["student"]).optional(),
  }),
  email: strictObject({ email }),
  emailCode: strictObject({ email, code: z.string().regex(/^\d{6}$/) }),
  login: strictObject({ email, password: z.string().min(1) }),
  reset: strictObject({ email, code: z.string().regex(/^\d{6}$/), password }),
  studentProfile: strictObject({
    phone: z.string().optional(),
    bio: z.string().optional(),
    address: z.string().optional(),
    institution: z.string().optional(),
    matricNumber: z.string().optional(),
    faculty: z.string().optional(),
    department: z.string().optional(),
    level: z
      .enum(["100L", "200L", "300L", "400L", "500L", "HND1", "HND2", "Other"])
      .optional(),
    internshipType: z
      .enum([
        "SIWES",
        "Industrial Training",
        "General Internship",
        "School Internship",
        "Other",
      ])
      .optional(),
    internshipStartPeriod: z.string().datetime().optional(),
    internshipEndPeriod: z.string().datetime().optional(),
    preferredLocations: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    profilePictureUrl: z.string().optional(),
  }),
  submission: strictObject({
    type: z.enum(["url", "manual"]),
    sourceUrl: z.string().url().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    internshipType: z
      .enum([
        "SIWES",
        "Industrial Training",
        "General Internship",
        "School Internship",
        "Other",
      ])
      .optional(),
    startPeriod: z.string().optional(),
    endPeriod: z.string().optional(),
    deadline: z.string().optional(),
    requirements: z.string().optional(),
    skills: z.array(z.string()).optional(),
    applicationUrl: z.string().optional(),
  }),
  application: strictObject({ listingId: z.string().min(1) }),
  notificationRead: strictObject({}),
  reason: strictObject({ reason: z.string().min(1) }),
  flag: strictObject({ issue: z.string().min(1), type: z.enum(["cv", "profile"]) }),
  invitation: strictObject({ email }),
  approveSubmission: strictObject({
    companyId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    adminNote: z.string().optional(),
  }),
  companyCreate: strictObject({
    name: z.string().min(2).max(100),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    description: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    state: z.string().optional(),
    logo: z.string().url().optional(),
  }),
  companyUpdate: strictObject({
    name: z.string().min(2).max(100).optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    description: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    state: z.string().optional(),
    logo: z.string().url().optional(),
  }),
  listingCreate: strictObject({
    companyId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    title: z.string().min(3).max(200),
    description: z.string().min(10),
    locations: z.array(z.string()).optional(),
    workMode: z.enum(["onsite", "remote", "hybrid"]).optional(),
    internshipType: z
      .enum([
        "SIWES",
        "Industrial Training",
        "General Internship",
        "School Internship",
        "Other",
      ])
      .optional(),
    category: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    applicationDeadline: z.string().datetime().optional(),
    requirements: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    openings: z.number().int().positive().optional(),
    applicationUrl: z.string().url().optional(),
  }),
  listingUpdate: strictObject({
    companyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).optional(),
    locations: z.array(z.string()).optional(),
    workMode: z.enum(["onsite", "remote", "hybrid"]).optional(),
    internshipType: z.string().optional(),
    category: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    applicationDeadline: z.string().datetime().optional(),
    requirements: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    openings: z.number().int().positive().optional(),
    applicationUrl: z.string().url().optional(),
  }),
  action: strictObject({
    adminNote: z.string().optional(),
    note: z.string().optional(),
  }),
  placement: strictObject({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      note: z.string().optional(),
    })
    .refine((v) => new Date(v.startDate) < new Date(v.endDate), {
      message: "startDate must be before endDate.",
    }),
  close: strictObject({ reason: z.string().optional() }),
  closeListing: strictObject({ reason: z.string().optional() }),
  expireListing: strictObject({ reason: z.string().optional() }),
  acceptInvitation: strictObject({
      token: z.string().min(1),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      password,
      confirmPassword: z.string().min(8),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Passwords do not match",
    }),
};
export const validate =
  (schema: z.ZodType) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return next(
        badRequest(
          "Request validation failed",
          result.error.issues.map((issue) => readableIssue(issue)),
        ),
      );
    }
    request.body = result.data;
    next();
  };

const readableName = (path: string) =>
  path === "body"
    ? "The request body"
    : path
        .split(".")
        .pop()!
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (value) => value.toUpperCase());

const readableIssue = (issue: z.ZodIssue) => {
  const path = issue.path.map(String).join(".") || "body";
  const name = readableName(path);
  const detail = issue as z.ZodIssue & {
    expected?: string;
    received?: string;
    input?: unknown;
    format?: string;
    keys?: string[];
    values?: unknown[];
    minimum?: number;
    maximum?: number;
    origin?: string;
  };
  let message = issue.message;
  let fix = "Correct this value and submit again.";

  if (issue.code === "unrecognized_keys") {
    const keys = detail.keys?.join(", ") || "the unsupported fields";
    message = `Remove unsupported field${detail.keys?.length === 1 ? "" : "s"}: ${keys}.`;
    fix = "Send only the fields documented for this endpoint.";
  } else if (issue.code === "invalid_type" && (detail.received === "undefined" || detail.input === undefined)) {
    message = `${name} is required.`;
    fix = `Provide ${path === "body" ? "the request body" : `a value for ${path}`} and submit again.`;
  } else if (issue.code === "invalid_format") {
    if (detail.format === "email") {
      message = `${name} must be a valid email address.`;
      fix = "Use an email such as name@example.com.";
    } else if (detail.format === "url") {
      message = `${name} must be a valid URL.`;
      fix = "Include the full http:// or https:// URL.";
    } else if (detail.format === "datetime") {
      message = `${name} must be a valid ISO date-time.`;
      fix = "Use a date such as 2026-10-01T00:00:00.000Z.";
    }
  } else if (issue.code === "invalid_value" && detail.values?.length) {
    message = `${name} must be one of: ${detail.values.join(", ")}.`;
    fix = `Choose one of the accepted ${path} values.`;
  } else if (issue.code === "too_small" && detail.minimum !== undefined) {
    const unit = detail.origin === "array" ? "items" : "characters";
    message = `${name} must contain at least ${detail.minimum} ${unit}.`;
    fix = `Provide at least ${detail.minimum} ${unit}.`;
  } else if (issue.code === "too_big" && detail.maximum !== undefined) {
    const unit = detail.origin === "array" ? "items" : "characters";
    message = `${name} must contain no more than ${detail.maximum} ${unit}.`;
    fix = `Reduce it to ${detail.maximum} ${unit} or fewer.`;
  } else if (issue.code === "custom" && issue.message === "Passwords do not match") {
    message = "Password and confirmPassword must match.";
    fix = "Enter the same password in both fields.";
  }

  return { path, message, fix, code: issue.code };
};
