import { AuthCode } from "../models";
import { Types } from "mongoose";
import { config } from "../config";
import { AppError } from "../errors";
import { hashSecret, randomCode } from "../utils";
export class AuthCodeService {
  async issue(
    userId: any,
    purpose: "email_verification" | "password_reset",
  ): Promise<string> {
    await AuthCode.updateMany(
      { userId, purpose, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    );
    const code = randomCode();
    await AuthCode.create({
      userId,
      purpose,
      codeHash: hashSecret(code),
      expiresAt: new Date(Date.now() + config.OTP_EXPIRATION_MINUTES * 60000),
    });
    return code;
  }
  async verify(
    userId: any,
    purpose: "email_verification" | "password_reset",
    code: string,
  ): Promise<void> {
    const record = await AuthCode.findOne({
      userId,
      purpose,
      usedAt: { $exists: false },
    }).sort({ createdAt: -1 });
    if (!record || record.expiresAt.getTime() <= Date.now())
      throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    if (record.attempts >= config.OTP_MAX_ATTEMPTS)
      throw new AppError(
        429,
        "Too many code attempts",
        "CODE_ATTEMPTS_EXCEEDED",
      );
    if (hashSecret(code) !== record.codeHash) {
      record.attempts += 1;
      if (record.attempts >= config.OTP_MAX_ATTEMPTS)
        record.usedAt = new Date();
      await record.save();
      throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    }
    record.usedAt = new Date();
    await record.save();
  }
}
