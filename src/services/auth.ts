import { AuthCode, User } from "../models";
import { AuthCodeService } from "./authCodes";
import { EmailService } from "./email";
import { TokenService, accessToken } from "./tokens";
import { AppError } from "../errors";
import { config } from "../config";
import { comparePassword, hashPassword, normalizeEmail } from "../utils";
import { logger } from "../logging/logger";

export class AuthService {
  constructor(
    private readonly codes: AuthCodeService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
  ) {}

  private emailUrl(baseUrl: string, email: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set("email", email);
    return url.toString();
  }

  private formatEmailDate(date: Date): string {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: config.APP_TIME_ZONE,
    }).format(date);
  }

  private publicUser(user: any) {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      profilePicture: user.profilePicture,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async register(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const email = normalizeEmail(input.email);
    if (await User.exists({ email }))
      throw new AppError(
        409,
        "An account with this email already exists",
        "EMAIL_EXISTS",
      );
    const user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      passwordHash: await hashPassword(input.password),
      role: "student",
    });
    try {
      const code = await this.codes.issue(user._id, "email_verification");
      await this.email.sendVerificationEmail({
        to: email,
        firstName: user.firstName,
        verificationCode: code,
        verificationUrl: this.emailUrl(config.VERIFY_EMAIL_URL, email),
      });
    } catch (error) {
      await this.codes.removeForUser(user._id);
      await User.deleteOne({ _id: user._id });
      logger.error("Verification email delivery failed", error, {
        path: "/api/auth/register",
      });
      throw new AppError(
        503,
        "Registration could not send the verification email. Please try again.",
        "EMAIL_DELIVERY_FAILED",
      );
    }
    return this.publicUser(user);
  }

  async verifyEmail(emailInput: string, code: string) {
    const user = await User.findOne({ email: normalizeEmail(emailInput) });
    if (!user)
      throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    await this.codes.verify(user._id, "email_verification", code);
    user.emailVerified = true;
    await user.save();
    try {
      await this.email.sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        appUrl: config.CLIENT_URL,
      });
    } catch (error) {
      logger.error("Welcome email delivery failed", error, {
        path: "/api/auth/verify-email",
      });
    }
    return this.publicUser(user);
  }

  async resendVerification(emailInput: string) {
    const user = await User.findOne({ email: normalizeEmail(emailInput) });
    if (!user || user.emailVerified) return;
    const recent = await AuthCode.findOne({
      userId: user._id,
      purpose: "email_verification",
      createdAt: {
        $gt: new Date(Date.now() - config.OTP_RESEND_COOLDOWN_SECONDS * 1000),
      },
    });
    if (recent)
      throw new AppError(
        429,
        "Please wait before requesting another code",
        "CODE_COOLDOWN",
      );
    const code = await this.codes.issue(user._id, "email_verification");
    await this.email.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verificationCode: code,
      verificationUrl: this.emailUrl(config.VERIFY_EMAIL_URL, user.email),
    });
  }

  async login(emailInput: string, password: string, metadata?: object) {
    const user = await User.findOne({
      email: normalizeEmail(emailInput),
    }).select("+passwordHash");
    if (!user || !(await comparePassword(password, user.passwordHash)))
      throw new AppError(
        401,
        "Invalid email or password",
        "INVALID_CREDENTIALS",
      );
    if (!user.emailVerified)
      throw new AppError(
        403,
        "Email verification is required",
        "EMAIL_NOT_VERIFIED",
      );
    if (user.status !== "active")
      throw new AppError(403, "This account is not active", "ACCOUNT_INACTIVE");
    user.lastLoginAt = new Date();
    await user.save();
    const session = await this.tokens.createSession(user._id, metadata);
    return {
      user: this.publicUser(user),
      access: accessToken({ userId: user._id.toString(), role: user.role }),
      refresh: session.raw,
    };
  }

  async refresh(raw: string | undefined) {
    if (!raw)
      throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    const rotated = await this.tokens.rotate(raw);
    if (rotated.kind !== "rotated")
      throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    const user = await User.findById(rotated.session.userId);
    if (!user || user.status !== "active")
      throw new AppError(401, "Account is not active", "ACCOUNT_INACTIVE");
    return {
      access: accessToken({ userId: user._id.toString(), role: user.role }),
      refresh: rotated.raw,
    };
  }

  async me(userId: string) {
    const user = await User.findById(userId);
    if (!user)
      throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
    return this.publicUser(user);
  }
  async logout(raw: string | undefined) {
    if (raw) await this.tokens.revoke(raw);
  }
  async forgotPassword(emailInput: string) {
    const user = await User.findOne({ email: normalizeEmail(emailInput) });
    if (user) {
      const code = await this.codes.issue(user._id, "password_reset");
      await this.email.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetCode: code,
        resetPasswordUrl: this.emailUrl(config.RESET_PASSWORD_URL, user.email),
      });
    }
  }
  async verifyReset(emailInput: string, code: string) {
    const user = await User.findOne({ email: normalizeEmail(emailInput) });
    if (!user)
      throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    await this.codes.verify(user._id, "password_reset", code);
  }
  async resetPassword(emailInput: string, code: string, password: string) {
    const user = await User.findOne({ email: normalizeEmail(emailInput) });
    if (!user)
      throw new AppError(400, "Invalid or expired code", "INVALID_CODE");
    await this.codes.verify(user._id, "password_reset", code);
    user.passwordHash = await hashPassword(password);
    await user.save();
    await this.tokens.revokeAll(user._id);
    await this.email.sendPasswordChangedEmail({
      to: user.email,
      firstName: user.firstName,
      email: user.email,
      changedAt: this.formatEmailDate(new Date()),
      supportUrl: config.SUPPORT_URL,
    });
  }
}
