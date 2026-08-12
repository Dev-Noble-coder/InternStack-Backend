import { Router, Request } from "express";
import { AuthController } from "../controllers/authController";
import { AuthService } from "../services/auth";
import { validate, schemas } from "../validation";
import { RateLimiter } from "../services/rateLimiter";
import { rateLimit, authenticate } from "../middleware/auth";
import { config } from "../config";

export function createAuthRouter(
  controller: AuthController,
  limiter: RateLimiter,
): Router {
  const router = Router();
  const ip = (request: Request) => `ip:${request.ip}`;
  const account = (request: Request) =>
    `account:${String(request.body.email || "")
      .trim()
      .toLowerCase()}`;
  const limited = (
    key: (request: Request) => string,
    count: number,
    windowMs: number,
  ) => rateLimit(limiter, key, count, windowMs);

  router.post(
    "/register",
    limited(
      ip,
      config.REGISTER_RATE_LIMIT,
      config.REGISTER_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.register),
    controller.register,
  );
  router.post(
    "/verify-email",
    limited(
      account,
      config.EMAIL_CODE_RATE_LIMIT,
      config.EMAIL_CODE_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.emailCode),
    controller.verifyEmail,
  );
  router.post(
    "/resend-verification",
    limited(
      account,
      config.RESEND_RATE_LIMIT,
      config.RESEND_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.email),
    controller.resendVerification,
  );
  router.post(
    "/login",
    limited(ip, config.LOGIN_RATE_LIMIT, config.LOGIN_RATE_LIMIT_WINDOW_MS),
    limited(
      account,
      config.LOGIN_RATE_LIMIT,
      config.LOGIN_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.login),
    controller.login,
  );
  router.post("/refresh", controller.refresh);
  router.get("/me", authenticate, controller.me);
  router.post("/logout", controller.logout);
  router.post(
    "/forgot-password",
    limited(
      account,
      config.RESEND_RATE_LIMIT,
      config.RESEND_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.email),
    controller.forgotPassword,
  );
  router.post(
    "/verify-password-reset",
    limited(
      account,
      config.EMAIL_CODE_RATE_LIMIT,
      config.EMAIL_CODE_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.emailCode),
    controller.verifyPasswordReset,
  );
  router.post(
    "/reset-password",
    limited(
      account,
      config.EMAIL_CODE_RATE_LIMIT,
      config.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    ),
    validate(schemas.reset),
    controller.resetPassword,
  );
  return router;
}
