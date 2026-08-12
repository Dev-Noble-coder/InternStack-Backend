import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, "Internal server error", "INTERNAL_ERROR");
  if (appError.status >= 500) console.error(error);
  response
    .status(appError.status)
    .json({ error: { code: appError.code, message: appError.message } });
}
