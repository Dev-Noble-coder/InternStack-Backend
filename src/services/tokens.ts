import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { Session } from "../models";
export type Identity = { userId: string; role: "student" | "admin" };
export const accessToken = (identity: Identity): string => jwt.sign(identity, config.ACCESS_TOKEN_SECRET, { expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"] });
export const verifyAccessToken = (token: string): Identity => jwt.verify(token, config.ACCESS_TOKEN_SECRET) as unknown as Identity;
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const randomToken = () => crypto.randomBytes(48).toString("base64url");
const durationMs = (value: string): number => { const match = /^(\d+)([smhd])$/.exec(value); if (!match) return 30 * 86400000; const units: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 }; return Number(match[1]) * units[match[2]]; };
export class TokenService {
  async createSession(userId: any, metadata?: object) { const raw = randomToken(); const session = await Session.create({ userId, refreshTokenHash: hash(raw), expiresAt: new Date(Date.now() + durationMs(config.REFRESH_TOKEN_TTL)), metadata }); return { raw, session }; }
  async rotate(raw: string) {
    const old = await Session.findOneAndUpdate(
      { refreshTokenHash: hash(raw), revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { revokedAt: new Date(), lastUsedAt: new Date() } },
      { new: false },
    );
    if (!old) { const existing = await Session.findOne({ refreshTokenHash: hash(raw) }); if (existing) await this.revokeAll(existing.userId); return { kind: existing ? "reuse" as const : "missing" as const }; }
    const next = await this.createSession(old.userId, old.metadata as object);
    await Session.updateOne({ _id: old._id }, { $set: { replacedBy: next.session._id } });
    return { kind: "rotated" as const, ...next };
  }
  async revoke(raw: string) { await Session.updateOne({ refreshTokenHash: hash(raw), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }); }
  async revokeAll(userId: any) { await Session.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }); }
}