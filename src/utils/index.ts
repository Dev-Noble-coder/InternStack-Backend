import crypto from "crypto";
import bcrypt from "bcryptjs";
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const randomCode = () => crypto.randomInt(100000, 1000000).toString();
export const randomToken = () => crypto.randomBytes(48).toString("base64url");
export const hashSecret = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
export const hashPassword = (value: string) => bcrypt.hash(value, 12);
export const comparePassword = (value: string, hash: string) =>
  bcrypt.compare(value, hash);
