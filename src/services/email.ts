import nodemailer from "nodemailer";
import { config } from "../config";
import {
  EmailDocument,
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
  welcomeEmail,
} from "../emails";

export type VerificationEmailInput = {
  to: string;
  firstName: string;
  verificationCode: string;
  verificationUrl: string;
};

export type WelcomeEmailInput = {
  to: string;
  firstName: string;
  appUrl: string;
};

export type PasswordResetEmailInput = {
  to: string;
  firstName: string;
  resetCode: string;
  resetPasswordUrl: string;
};

export type PasswordChangedEmailInput = {
  to: string;
  firstName: string;
  email: string;
  changedAt: string;
  supportUrl: string;
};

export interface EmailService {
  sendVerificationEmail(input: VerificationEmailInput): Promise<void>;
  sendWelcomeEmail(input: WelcomeEmailInput): Promise<void>;
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void>;
  sendPasswordChangedEmail(input: PasswordChangedEmailInput): Promise<void>;
}

type SentEmail = {
  email: string;
  purpose: string;
  code?: string;
  subject?: string;
  html?: string;
  text?: string;
};

export class MemoryEmailService implements EmailService {
  sent: SentEmail[] = [];

  private record(
    to: string,
    purpose: string,
    document: EmailDocument,
    code?: string,
  ): void {
    this.sent.push({
      email: to,
      purpose,
      code,
      subject: document.subject,
      html: document.html,
      text: document.text,
    });
  }

  async sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
    this.record(
      input.to,
      "email_verification",
      verificationEmail({
        firstName: input.firstName,
        verificationCode: input.verificationCode,
        verificationUrl: input.verificationUrl,
        expirationMinutes: config.OTP_EXPIRATION_MINUTES,
      }),
      input.verificationCode,
    );
  }

  async sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    this.record(input.to, "welcome", welcomeEmail(input));
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    this.record(
      input.to,
      "password_reset",
      passwordResetEmail({
        firstName: input.firstName,
        resetCode: input.resetCode,
        resetPasswordUrl: input.resetPasswordUrl,
        expirationMinutes: config.OTP_EXPIRATION_MINUTES,
      }),
      input.resetCode,
    );
  }

  async sendPasswordChangedEmail(
    input: PasswordChangedEmailInput,
  ): Promise<void> {
    this.record(input.to, "password_changed", passwordChangedEmail(input));
  }
}

export class BrevoEmailService implements EmailService {
  private readonly transport = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    },
  });

  private async send(to: string, document: EmailDocument): Promise<void> {
    await this.transport.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject: document.subject,
      html: document.html,
      text: document.text,
    });
  }

  sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
    return this.send(
      input.to,
      verificationEmail({
        firstName: input.firstName,
        verificationCode: input.verificationCode,
        verificationUrl: input.verificationUrl,
        expirationMinutes: config.OTP_EXPIRATION_MINUTES,
      }),
    );
  }

  sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    return this.send(input.to, welcomeEmail(input));
  }

  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    return this.send(
      input.to,
      passwordResetEmail({
        firstName: input.firstName,
        resetCode: input.resetCode,
        resetPasswordUrl: input.resetPasswordUrl,
        expirationMinutes: config.OTP_EXPIRATION_MINUTES,
      }),
    );
  }

  sendPasswordChangedEmail(input: PasswordChangedEmailInput): Promise<void> {
    return this.send(input.to, passwordChangedEmail(input));
  }
}

export const createEmailService = (): EmailService =>
  config.EMAIL_USER && config.EMAIL_PASSWORD
    ? new BrevoEmailService()
    : new MemoryEmailService();
