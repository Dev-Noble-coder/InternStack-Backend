import { Request, Response, NextFunction } from "express";
import { Log } from "../models/log";
import { badRequest } from "../errors";

export async function listLogs(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestedLimit = Number(request.query.limit ?? 50);
    const requestedPage = Number(request.query.page ?? 1);
    if (!Number.isInteger(requestedLimit) || !Number.isInteger(requestedPage)) {
      next(badRequest("page and limit must be integers"));
      return;
    }
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const page = Math.max(requestedPage, 1);
    const [logs, total] = await Promise.all([
      Log.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Log.countDocuments(),
    ]);
    response.json({
      logs,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}
