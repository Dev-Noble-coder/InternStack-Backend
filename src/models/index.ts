import { Schema, model, Types } from "mongoose";

export type Role = "student" | "admin" | "super_admin";
export type UserStatus = "active" | "suspended" | "deactivated";
const opts = { timestamps: true };
const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "admin", "super_admin"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
    emailVerified: { type: Boolean, default: false },
    profilePicture: String,
    lastLoginAt: Date,
  },
  opts,
);
const AuthCodeSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verifiedAt: Date,
    usedAt: Date,
  },
  opts,
);
AuthCodeSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
AuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    lastUsedAt: Date,
    revokedAt: Date,
    replacedBy: { type: Types.ObjectId, ref: "Session" },
    metadata: Schema.Types.Mixed,
  },
  opts,
);
SessionSchema.index({ userId: 1, revokedAt: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const User = model("User", UserSchema);
export const AuthCode = model("AuthCode", AuthCodeSchema);
export const Session = model("Session", SessionSchema);

const StudentProfileSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    phone: String,
    bio: String,
    address: String,
    institution: String,
    matricNumber: String,
    faculty: String,
    department: String,
    level: {
      type: String,
      enum: ["100L", "200L", "300L", "400L", "500L", "HND1", "HND2", "Other"],
    },
    internshipType: {
      type: String,
      enum: [
        "SIWES",
        "Industrial Training",
        "General Internship",
        "School Internship",
        "Other",
      ],
    },
    internshipStartPeriod: Date,
    internshipEndPeriod: Date,
    preferredLocations: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    cv: { url: String, filename: String, uploadedAt: Date },
    profilePictureUrl: String,
    completionPercentage: { type: Number, default: 0 },
    isReadyToApply: { type: Boolean, default: false },
  },
  opts,
);

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    website: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    logo: String,
    industry: String,
    description: String,
    address: String,
    state: String,
    email: String,
    phone: String,
  },
  opts,
);
CompanySchema.index({ name: "text" });

const ListingSchema = new Schema(
  {
    companyId: {
      type: Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    locations: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "At least one location is required",
      },
    },
    workMode: {
      type: String,
      required: true,
      enum: ["onsite", "remote", "hybrid"],
    },
    internshipType: {
      type: String,
      required: true,
      enum: [
        "SIWES",
        "Industrial Training",
        "General Internship",
        "School Internship",
        "Other",
      ],
    },
    category: String,
    startDate: Date,
    endDate: Date,
    applicationDeadline: Date,
    requirements: String,
    skills: { type: [String], default: [] },
    openings: { type: Number, min: 1 },
    applicationUrl: String,
    submissionId: { type: Types.ObjectId, ref: "ListingSubmission" },
    closeReason: String,
    status: {
      type: String,
      enum: ["published", "closed", "expired"],
      default: "published",
      index: true,
    },
  },
  opts,
);
ListingSchema.index({ title: "text", description: "text", skills: "text" });

const ApplicationSchema = new Schema(
  {
    studentId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    listingId: {
      type: Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    companyId: {
      type: Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["applied", "reviewed", "accepted", "rejected", "withdrawn"],
      default: "applied",
    },
    cvSnapshot: {
      url: { type: String, required: true },
      filename: { type: String, required: true },
    },
    appliedAt: { type: Date, required: true, default: Date.now },
    withdrawnAt: Date,
    adminNote: String,
    forwardedToCompany: { type: Boolean, default: false },
    companyAccepted: { type: Boolean, default: false },
    vettingScore: Number,
    vettingBreakdown: {
      profileCompleteness: Number,
      cvPresent: Number,
      skillsMatch: Number,
      eligibility: Number,
    },
    placement: {
      confirmed: { type: Boolean, default: false },
      startDate: Date,
      endDate: Date,
      confirmedAt: Date,
      note: String,
    },
  },
  opts,
);
ApplicationSchema.index({ studentId: 1, status: 1 });
ApplicationSchema.index({ companyId: 1, studentId: 1, status: 1 });

const submissionShape = {
  company: String,
  title: String,
  description: String,
  location: String,
  internshipType: String,
  startPeriod: String,
  endPeriod: String,
  deadline: String,
  requirements: String,
  skills: { type: [String] },
  applicationUrl: String,
  companyName: String,
  imageUrl: String,
  sourceEmail: String,
  socialLinks: Schema.Types.Mixed,
  keywords: { type: [String], default: [] },
  fetchedAt: String,
  jobTitle: String,
  jobDescription: String,
  employmentType: String,
  hiringOrganizationName: String,
  hiringOrganizationLogo: String,
  locations: { type: [String], default: [] },
};
const ListingSubmissionSchema = new Schema(
  {
    submittedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, required: true, enum: ["url", "manual"] },
    sourceUrl: String,
    extractedData: submissionShape,
    manualData: submissionShape,
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "failed",
        "reviewed",
        "approved",
        "rejected",
      ],
      default: "pending",
    },
    adminNote: String,
    reviewedAt: Date,
  },
  opts,
);

const AdminInvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
    },
    invitedBy: { type: Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  opts,
);
AdminInvitationSchema.index({ email: 1, status: 1 });
AdminInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "APPLICATION_SUBMITTED",
        "APPLICATION_REVIEWED",
        "APPLICATION_ACCEPTED",
        "APPLICATION_REJECTED",
        "APPLICATION_WITHDRAWN",
        "PLACEMENT_CONFIRMED",
        "LISTING_CLOSED",
        "LISTING_EXPIRED",
        "ADMIN_INVITATION",
        "PROFILE_CV_ISSUE",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: Schema.Types.Mixed,
  },
  opts,
);
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

const AuditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    performedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: [
        "Application",
        "User",
        "Listing",
        "Company",
        "Invitation",
        "Submission",
      ],
    },
    targetId: { type: Types.ObjectId, required: true },
    metadata: Schema.Types.Mixed,
    timestamp: { type: Date, required: true, default: Date.now, index: true },
  },
  opts,
);
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ timestamp: -1 });

export const StudentProfile = model("StudentProfile", StudentProfileSchema);
export const Company = model("Company", CompanySchema);
export const Listing = model("Listing", ListingSchema);
export const Application = model("Application", ApplicationSchema);
export const ListingSubmission = model(
  "ListingSubmission",
  ListingSubmissionSchema,
);
export const AdminInvitation = model("AdminInvitation", AdminInvitationSchema);
export const Notification = model("Notification", NotificationSchema);
export const AuditLog = model("AuditLog", AuditLogSchema);

export { Types };
