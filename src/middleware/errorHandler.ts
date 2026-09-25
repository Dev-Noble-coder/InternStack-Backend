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
      : new AppError(500, "We could not complete the request.", "INTERNAL_ERROR");

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

  const responseError: {
    code: string;
    message: string;
    fix: string;
    details?: unknown;
  } = {
    code: appError.code,
    message: appError.message,
    fix: fixFor(appError),
  };
  if (appError.details !== undefined) responseError.details = appError.details;

  response.status(appError.status).json({ error: responseError });
}

function fixFor(error: AppError): string {
  const fixes: Record<string, string> = {
    VALIDATION_ERROR: "Correct the listed fields and submit the request again.",
    CSRF_INVALID: "Request a fresh CSRF token and send it in the X-CSRF-Token header.",
    UNAUTHENTICATED: "Sign in again, then retry the request.",
    ACCOUNT_INACTIVE: "Reactivate the account, then sign in again.",
    FORBIDDEN: "Use an account with the required permission for this action.",
    NOT_FOUND: "Check the URL or resource ID and try again.",
    ROUTE_NOT_FOUND: "Check the URL and HTTP method against the API documentation.",
    RATE_LIMITED: "Wait briefly, then retry after the allowed interval.",
    ACTIVE_JOB_LIMIT: "Wait for an existing job to finish before submitting another.",
    EXTRACTION_UNAVAILABLE: "Try again shortly; the extraction service is temporarily unavailable.",
    REQUEST_TIMEOUT: "Check the connection and retry the request.",
  };

  if (fixes[error.code]) return fixes[error.code];
  if (error.status === 404) return "Check the resource ID or URL and try again.";
  if (error.status === 409) return "Refresh the resource, resolve the conflict, and try again.";
  if (error.status === 422) return "Complete the required profile information, then try again.";
  if (error.status === 429) return "Wait briefly, then retry after the allowed interval.";
  if (error.status === 503) return "Try again shortly; a required service is temporarily unavailable.";
  if (error.status >= 500) return "Try again later. If the problem continues, contact support.";
  return "Check the request and try again.";
}
