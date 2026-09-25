import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function requestTimeout(_request: Request, response: Response, next: NextFunction): void {
  response.setTimeout(config.REQUEST_TIMEOUT_MS, () => {
    if (!response.headersSent) response.status(408).json({
      error: {
        code: "REQUEST_TIMEOUT",
        message: "The request took too long to complete.",
        fix: "Check the connection and retry the request.",
      },
    });
  });
  next();
}
