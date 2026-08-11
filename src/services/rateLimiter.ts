export interface RateLimiter { check(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number }; reset(): void; }
type Entry = { count: number; resetAt: number };
export class InMemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, Entry>();
  check(key: string, limit: number, windowMs: number) { const now = Date.now(); const current = this.entries.get(key); const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current; entry.count += 1; this.entries.set(key, entry); return { allowed: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }; }
  reset() { this.entries.clear(); }
}