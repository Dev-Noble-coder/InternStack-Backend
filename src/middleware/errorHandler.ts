import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { logger } from "../logging/logger";

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, "Internal server error", "INTERNAL_ERROR");

  logger.error(
    `${request.method} ${request.originalUrl} failed`,
    error,
    {
      method: request.method,
      path: request.originalUrl,
      statusCode: appError.status,
      ip: request.ip,
      userAgent: request.get("user-agent"),
    },
    { code: appError.code },
  );

  response
    .status(appError.status)
    .json({ error: { code: appError.code, message: appError.message } });
}
