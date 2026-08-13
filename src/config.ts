import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/internstack"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  VERIFY_EMAIL_URL: z.string().url().optional(),
  RESET_PASSWORD_URL: z.string().url().optional(),
  SUPPORT_URL: z.string().url().optional(),
  APP_TIME_ZONE: z.string().default("Africa/Lagos"),
  ACCESS_TOKEN_SECRET: z.string().min(16).optional(),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  ACCESS_COOKIE_NAME: z.string().default("access_token"),
  REFRESH_COOKIE_NAME: z.string().default("refresh_token"),
  ACCESS_COOKIE_MAX_AGE_MS: z.coerce.number().int().positive().default(900_000),
  REFRESH_COOKIE_MAX_AGE_MS: z.coerce.number().int().positive().default(2_592_000_000),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  CSRF_COOKIE_NAME: z.string().default("csrf_token"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  EMAIL_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  LOG_TO_DATABASE: z.enum(["true", "false"]).default("true"),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  OTP_EXPIRATION_MINUTES: z.coerce.number().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_API_URL: z.string().url().default("https://api.brevo.com/v3/smtp/email"),
  EMAIL_FROM_NAME: z.string().default("InternStack"),
  EMAIL_HOST: z.string().default("smtp-relay.brevo.com"),
  EMAIL_PORT: z.coerce.number().positive().default(587),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().default("no-reply@internstack.com.ng"),

  EMAIL_LOGO_URL: z.string().url().default("https://internstack-backend.onrender.com/logoo.png"),
  GLOBAL_RATE_LIMIT: z.coerce.number().int().positive().default(100),
  GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  REGISTER_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  REGISTER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),
  EMAIL_CODE_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  EMAIL_CODE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600_000),
  RESEND_RATE_LIMIT: z.coerce.number().int().positive().default(3),
  RESEND_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  PASSWORD_RESET_RATE_LIMIT: z.coerce.number().int().positive().default(3),
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.message}`);
if (parsed.data.NODE_ENV === "production") {
  if (!parsed.data.ACCESS_TOKEN_SECRET) throw new Error("ACCESS_TOKEN_SECRET must be set in production");
  if (parsed.data.COOKIE_SECURE !== "true") throw new Error("COOKIE_SECURE=true is required in production");
  if (!parsed.data.EMAIL_API_KEY && !(parsed.data.EMAIL_USER && parsed.data.EMAIL_PASSWORD)) {
    throw new Error("Production email credentials are required");
  }
}

const clientUrl = new URL(parsed.data.CLIENT_URL);
const frontendUrl = (route: string) => new URL(route, clientUrl).toString();

export const config = {
  ...parsed.data,
  VERIFY_EMAIL_URL: parsed.data.VERIFY_EMAIL_URL ?? frontendUrl("/verify-email"),
  RESET_PASSWORD_URL: parsed.data.RESET_PASSWORD_URL ?? frontendUrl("/reset-password"),
  SUPPORT_URL: parsed.data.SUPPORT_URL ?? frontendUrl("/contact-us"),
  ACCESS_TOKEN_SECRET: parsed.data.ACCESS_TOKEN_SECRET ?? "development-only-change-this-secret",
  COOKIE_SECURE: parsed.data.COOKIE_SECURE === "true",
  LOG_TO_DATABASE: parsed.data.LOG_TO_DATABASE === "true",
};
export type Config = typeof config;