import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/internstack'), CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ACCESS_TOKEN_SECRET: z.string().min(16).default('development-only-change-this-secret'), ACCESS_TOKEN_TTL: z.string().default('15m'), REFRESH_TOKEN_TTL: z.string().default('30d'),
  ACCESS_COOKIE_NAME: z.string().default('access_token'), REFRESH_COOKIE_NAME: z.string().default('refresh_token'), COOKIE_SECURE: z.enum(['true', 'false']).default('false'), COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  OTP_EXPIRATION_MINUTES: z.coerce.number().positive().default(10), OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5), OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  EMAIL_HOST: z.string().default('smtp-relay.brevo.com'), EMAIL_PORT: z.coerce.number().positive().default(587), EMAIL_USER: z.string().optional(), EMAIL_PASSWORD: z.string().optional(), EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  GLOBAL_RATE_LIMIT: z.coerce.number().int().positive().default(100)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.message}`);
export const config = { ...parsed.data, COOKIE_SECURE: parsed.data.COOKIE_SECURE === 'true' };
export type Config = typeof config;
