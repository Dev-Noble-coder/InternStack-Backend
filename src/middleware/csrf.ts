import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { AppError } from "../errors";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function issueCsrfToken(_request: Request, response: Response): void {
  const token = crypto.randomBytes(32).toString("base64url");
  response.cookie(config.CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE as "strict" | "lax" | "none",
    path: "/",
    maxAge: config.REFRESH_COOKIE_MAX_AGE_MS,
  });
  response.json({ csrfToken: token });
}

export function csrfProtection(request: Request, _response: Response, next: NextFunction): void {
  if (!unsafeMethods.has(request.method) || request.path === "/api/auth/csrf") {
    next();
    return;
  }
  const cookieToken = request.cookies?.[config.CSRF_COOKIE_NAME];
  const headerToken = request.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length ||
      !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    next(new AppError(403, "CSRF token required", "CSRF_INVALID"));
    return;
  }
  next();
}