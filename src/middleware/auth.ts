import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { config } from "../config";
import { InMemoryRateLimiter, RateLimiter } from "../services/rateLimiter";
import { verifyAccessToken } from "../services/tokens";
import { User } from "../models";

export type AuthRequest = Request & {
  identity?: { userId: string; role: "student" | "admin" | "super_admin" };
};
export const globalLimiter = new InMemoryRateLimiter();
export async function authenticate(
  request: AuthRequest,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = request.cookies?.[config.ACCESS_COOKIE_NAME];
    if (!token) throw new Error();
    const tokenIdentity = verifyAccessToken(token);
    const user = await User.findById(tokenIdentity.userId).select("role status");
    if (!user) throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
    if (user.status !== "active") throw new AppError(403, "This account is not active", "ACCOUNT_INACTIVE");
    request.identity = { userId: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Authentication required", "UNAUTHENTICATED"));
  }
}
export function authorize(...roles: Array<"student" | "admin" | "super_admin">) {
  return (request: AuthRequest, _response: Response, next: NextFunction) =>
    request.identity && roles.includes(request.identity.role)
      ? next()
      : next(new AppError(403, "Forbidden", "FORBIDDEN"));
}
export function rateLimit(
  limiter: RateLimiter,
  key: (request: Request) => string,
  limit: number,
  windowMs: number,
) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const result = limiter.check(key(request), limit, windowMs);
    if (!result.allowed) {
      response.setHeader("Retry-After", result.retryAfter);
      next(new AppError(429, "Too many requests", "RATE_LIMITED"));
      return;
    }
    next();
  };
}
