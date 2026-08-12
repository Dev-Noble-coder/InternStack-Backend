import { AuthCode } from "../models";
import { config } from "../config";
import { AppError } from "../errors";
import { hashSecret, randomCode } from "../utils";
export class AuthCodeService {
  async removeForUser(userId: any): Promise<void> { await AuthCode.deleteMany({ userId }); }
  async issue(userId: any, purpose: "email_verification" | "password_reset"): Promise<string> {
    await AuthCode.updateMany({ userId, purpose, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });
    const code = randomCode();
    await AuthCode.create({ userId, purpose, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + config.OTP_EXPIRATION_MINUTES * 60000) });
    return code;
  }
  async verify(userId: any, purpose: "email_verification" | "password_reset", code: string): Promise<void> {
    const record = await AuthCode.findOne({ userId, purpose, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!record) throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    if (record.attempts >= config.OTP_MAX_ATTEMPTS) throw new AppError(429, "Too many code attempts", "CODE_ATTEMPTS_EXCEEDED");
    if (hashSecret(code) !== record.codeHash) {
      const failed = await AuthCode.findOneAndUpdate({ _id: record._id, usedAt: { $exists: false }, attempts: { $lt: config.OTP_MAX_ATTEMPTS } }, { $inc: { attempts: 1 } }, { new: true });
      if (failed && failed.attempts >= config.OTP_MAX_ATTEMPTS) await AuthCode.updateOne({ _id: failed._id, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });
      throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    }
    const consumed = await AuthCode.findOneAndUpdate({ _id: record._id, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } }, { new: true });
    if (!consumed) throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
  }
}