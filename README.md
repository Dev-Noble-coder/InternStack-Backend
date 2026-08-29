# InternStack Backend

## 1. Project Overview

InternStack is an internship platform connecting students with internship listings and supporting applications, submissions, administration, notifications, and vetting.

This repository contains the backend HTTP API, authentication, MongoDB models, business services, email delivery, audit logging, and Web Intelligence Crawler integration.

Stack: Node.js, TypeScript, Express 5, Mongoose 8, and Zod 4.

## 2. Architecture

- Entry point: `src/server.ts`. There is currently no `src/index.ts` file.
- Routes are registered in `src/app.ts` under `/api/`.
- Models are in `src/models/index.ts`.
- Controllers are in `src/controllers/`.
- Services are in `src/services/`.
- Validation schemas are in `src/validation.ts`.
- Email templates are in `src/emails/templates/index.ts`.

## 3. Environment Variables

### Required

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string. |
| `CLIENT_URL` | Comma-separated frontend URLs allowed by CORS. |
| `ACCESS_TOKEN_SECRET` | Secret used to sign access tokens; required in production. |
| `COOKIE_SECURE` | Must be `true` in production HTTPS deployments. |

### Email

| Variable | Description |
|---|---|
| `EMAIL_API_KEY` | Brevo API key; preferred API delivery credential. |
| `EMAIL_API_URL` | Brevo email API URL. |
| `EMAIL_FROM_NAME` | Display name for outgoing email. |
| `EMAIL_HOST` | SMTP host used by the SMTP email provider. |
| `EMAIL_PORT` | SMTP port. |
| `EMAIL_USER` | SMTP username; alternative to Brevo API delivery. |
| `EMAIL_PASSWORD` | SMTP password; alternative to Brevo API delivery. |
| `EMAIL_FROM` | Sender email address. |
| `EMAIL_LOGO_URL` | Logo URL used by email templates. |

Production requires either `EMAIL_API_KEY` or both `EMAIL_USER` and `EMAIL_PASSWORD`.

### Scraper

| Variable | Description |
|---|---|
| `SCRAPER_BASE_URL` | Web Intelligence Crawler service base URL. |
| `SCRAPER_DEVICE_ID` | Device identifier sent to the crawler. |

### Optional

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production`; default `development`. |
| `PORT` | HTTP port; default `4000`. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | MongoDB server selection timeout; default `5000`. |
| `VERIFY_EMAIL_URL` | Frontend email-verification URL. |
| `RESET_PASSWORD_URL` | Frontend password-reset URL. |
| `SUPPORT_URL` | Frontend support URL. |
| `APP_TIME_ZONE` | Time zone used for email dates; default `Africa/Lagos`. |
| `ACCESS_TOKEN_TTL` | Access-token lifetime; default `15m`. |
| `REFRESH_TOKEN_TTL` | Refresh-token lifetime; default `30d`. |
| `ACCESS_COOKIE_NAME` | Access cookie name; default `access_token`. |
| `REFRESH_COOKIE_NAME` | Refresh cookie name; default `refresh_token`. |
| `ACCESS_COOKIE_MAX_AGE_MS` | Access-cookie lifetime in milliseconds. |
| `REFRESH_COOKIE_MAX_AGE_MS` | Refresh-cookie lifetime in milliseconds. |
| `COOKIE_SAME_SITE` | Cookie SameSite policy: `strict`, `lax`, or `none`. |
| `CSRF_COOKIE_NAME` | CSRF cookie name; default `csrf_token`. |
| `REQUEST_TIMEOUT_MS` | General request timeout. |
| `EMAIL_REQUEST_TIMEOUT_MS` | Email request timeout. |
| `LOG_TO_DATABASE` | Whether application logs are persisted. |
| `LOG_RETENTION_DAYS` | Database log retention period. |
| `OTP_EXPIRATION_MINUTES` | Verification/reset code lifetime. |
| `OTP_MAX_ATTEMPTS` | Maximum failed code attempts. |
| `OTP_RESEND_COOLDOWN_SECONDS` | Minimum delay between verification-code requests. |
| `GLOBAL_RATE_LIMIT` | Global requests allowed per IP per window. |
| `GLOBAL_RATE_LIMIT_WINDOW_MS` | Global rate-limit window. |
| `REGISTER_RATE_LIMIT` | Registration requests allowed per IP. |
| `REGISTER_RATE_LIMIT_WINDOW_MS` | Registration rate-limit window. |
| `EMAIL_CODE_RATE_LIMIT` | Email-code verification requests allowed per account. |
| `EMAIL_CODE_RATE_LIMIT_WINDOW_MS` | Email-code rate-limit window. |
| `RESEND_RATE_LIMIT` | Resend requests allowed per account. |
| `RESEND_RATE_LIMIT_WINDOW_MS` | Resend rate-limit window. |
| `LOGIN_RATE_LIMIT` | Login requests allowed per IP/account. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Login rate-limit window. |
| `PASSWORD_RESET_RATE_LIMIT` | Password-reset rate-limit setting. |
| `PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` | Password-reset rate-limit window. |

## 4. Getting Started

### Prerequisites

- Node.js compatible with the repository toolchain (`tsx`, TypeScript 5.9).
- A running MongoDB instance.

### Local setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Start the development server:

```bash
npm run dev
```

Health check:

```http
GET http://localhost:4000/health
```

## 5. Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Starts the TypeScript server with `tsx watch`. |
| `npm run build` | Installs development dependencies and compiles TypeScript. |
| `npm start` | Starts the compiled server from `dist/src/server.js`. |
| `npm test` | Runs Jest serially. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Runs TypeScript without emitting files. |

## 6. API Overview

All mutating requests require the CSRF cookie/header pair. Authenticated browser requests must include credentials so cookies are sent.

| Group | Base Path | Auth |
|---|---|---|
| Auth | `/api/auth` | Public; CSRF for mutations |
| Student Profile | `/api/student/profile` | Student |
| Student Dashboard | `/api/student/dashboard` | Student |
| Student Listings | `/api/listings` | Public |
| Student Applications | `/api/applications`, `/api/student/applications` | Student |
| Student Submissions | `/api/submissions`, `/api/student/submissions` | Student |
| Student Notifications | `/api/notifications` | Authenticated user |
| Admin Dashboard | `/api/admin/dashboard` | Admin / Super Admin |
| Admin Users | `/api/admin/users` | Admin / Super Admin |
| Admin Students | `/api/admin/students` | Admin / Super Admin |
| Admin Companies | `/api/admin/companies` | Admin / Super Admin |
| Admin Listings | `/api/admin/listings` | Admin / Super Admin |
| Admin Submissions | `/api/admin/submissions` | Admin / Super Admin |
| Admin Applications | `/api/admin/applications` | Admin / Super Admin |
| Admin Audit Logs | `/api/admin/audit-logs` | Admin / Super Admin |
| Application Logs | `/api/logs` | Admin |
| Admin Invitations | `/api/admin/invitations` | Super Admin |

## 7. Key Business Rules

- A student can have at most 2 active applications.
- A student can have at most 1 active application per company.
- Withdrawal is allowed only within 24 hours of applying and only while status is `applied` or `reviewed`.
- A CV snapshot is stored when the student applies.
- Vetting scores range from 0–100, are admin-only, and are never shown to students.
- Placement confirmation requires `startDate` and `endDate`.
- `super_admin` cannot be created through the public API; seed it manually.
- Public registration always creates a `student` user.
- Company website is a hard unique constraint.
- Similar company names return a soft `409`; `?force=true` bypasses that check.

## 8. Services

- `src/services/tokens.ts` — `TokenService` creates, rotates, validates, and revokes refresh sessions; access JWTs are also generated here.
- `src/services/authCodes.ts` — issues and verifies email-verification and password-reset codes.
- `src/services/email.ts` — `EmailService` with Brevo API, Brevo SMTP, and memory fallback implementations.
- `src/services/rateLimiter.ts` — process-local in-memory rate limiter.
- `src/services/profile.ts` — calculates student profile completion.
- `src/services/audit.ts` — writes AuditLog records.
- `src/services/notifications.ts` — exports `createNotification` and `sendNotificationEmail`.
- `src/services/vetting.ts` — exports `calculateVettingScore`.
- `src/services/scraper.ts` — exports `extractFromUrl`, which calls the Web Intelligence Crawler.

## 9. Email Notifications

`sendNotificationEmail()` sends emails for these 7 notification types:

- `PROFILE_CV_ISSUE`
- `APPLICATION_WITHDRAWN`
- `APPLICATION_SUBMITTED`
- `APPLICATION_REVIEWED`
- `APPLICATION_ACCEPTED`
- `APPLICATION_REJECTED`
- `PLACEMENT_CONFIRMED`

These 3 types create Notification documents but do not send notification emails through `sendNotificationEmail()`:

- `LISTING_CLOSED`
- `LISTING_EXPIRED`
- `ADMIN_INVITATION`

Admin invitations still send their separate invitation email directly from the invitation controller.

## 10. Web Intelligence Crawler Integration

1. A student submits a listing URL.
2. The backend saves a `ListingSubmission` with status `pending` and returns `201`.
3. `setImmediate` starts `extractFromUrl(url)` in the background.
4. The submission status changes to `processing`, then `reviewed` on success or `failed` on failure.
5. `SCRAPER_BASE_URL` and `SCRAPER_DEVICE_ID` must be set in `.env` for extraction.
6. If the crawler is unavailable, the submission becomes `failed`; an administrator can enter listing data manually.

## 11. Phases Completed

- Phase 1: Authentication, student flows, admin flows, and core models.
- Phase 2: Vetting, submission approval to listing, invitation resend, notification emails, admin filters, and Zod validation.
- Phase 2.5: Cleanup including audit type fixes, withdrawn email template, ObjectId validation, date validation, and category filtering.
- Scraper integration: Asynchronous listing extraction through the Web Intelligence Crawler.

## 12. Known Limitations (V1)

- No file upload; Cloudinary is not integrated. CV and profile-picture URLs are stored as strings.
- No WebSocket support; notifications are polling-based.
- No payment or token system; planned for V1.5.
- Listing auto-close when capacity is reached is not implemented.
- Institution is free text with no lookup table.
- Listing category taxonomy exists as a field, but allowed values are not defined.
