import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

export function requestLogger(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  response.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const level =
      response.statusCode >= 500
        ? "error"
        : response.statusCode >= 400
          ? "warn"
          : "info";
    logger.write({
      level,
      message: `${request.method} ${request.originalUrl} ${response.statusCode}`,
      request: {
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        ip: request.ip,
        userAgent: request.get("user-agent"),
        durationMs,
      },
    });
  });
  next();
}
