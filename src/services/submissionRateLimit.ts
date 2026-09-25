import Redis from "ioredis";
import { config } from "../config";
import { AppError } from "../errors";

const WINDOW_SECONDS = 60;
const MAX_PER_MINUTE = 5;
const localCounts = new Map<string, { count: number; expiresAt: number }>();
let redis: Redis | undefined;

export async function assertSubmissionRateLimit(userId: string) {
  if (config.REDIS_URL) {
    redis ??= new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    const key = `internstack:submission-rate:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    if (count > MAX_PER_MINUTE) throw new AppError(429, "Too many extraction submissions", "RATE_LIMITED");
    return;
  }
  const now = Date.now();
  const current = localCounts.get(userId);
  if (!current || current.expiresAt <= now) {
    localCounts.set(userId, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > MAX_PER_MINUTE) throw new AppError(429, "Too many extraction submissions", "RATE_LIMITED");
}
