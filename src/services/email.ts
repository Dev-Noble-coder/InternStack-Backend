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

const documentForInput = (
  input:
    | VerificationEmailInput
    | WelcomeEmailInput
    | PasswordResetEmailInput
    | PasswordChangedEmailInput,
): EmailDocument => {
  if ("verificationCode" in input) {
    return verificationEmail({
      firstName: input.firstName,
      verificationCode: input.verificationCode,
      verificationUrl: input.verificationUrl,
      expirationMinutes: config.OTP_EXPIRATION_MINUTES,
    });
  }
  if ("resetCode" in input) {
    return passwordResetEmail({
      firstName: input.firstName,
      resetCode: input.resetCode,
      resetPasswordUrl: input.resetPasswordUrl,
      expirationMinutes: config.OTP_EXPIRATION_MINUTES,
    });
  }
  if ("changedAt" in input) {
    return passwordChangedEmail(input);
  }
  return welcomeEmail(input);
};

const recipientName = (
  input:
    | VerificationEmailInput
    | WelcomeEmailInput
    | PasswordResetEmailInput
    | PasswordChangedEmailInput,
): string => input.firstName;

export class BrevoApiEmailService implements EmailService {
  private async send(
    input:
      | VerificationEmailInput
      | WelcomeEmailInput
      | PasswordResetEmailInput
      | PasswordChangedEmailInput,
  ): Promise<void> {
    const document = documentForInput(input);
    const response = await fetch(config.EMAIL_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.EMAIL_API_KEY!,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(config.EMAIL_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        sender: {
          email: config.EMAIL_FROM,
          name: config.EMAIL_FROM_NAME,
        },
        to: [{ email: input.to, name: recipientName(input) }],
        subject: document.subject,
        htmlContent: document.html,
        textContent: document.text,
      }),
    });

    if (!response.ok) {
      const providerMessage = await response.text();
      throw new Error(
        `Brevo API email request failed with HTTP ${response.status}: ${providerMessage.slice(0, 300)}`,
      );
    }
  }

  sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
    return this.send(input);
  }

  sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    return this.send(input);
  }

  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    return this.send(input);
  }

  sendPasswordChangedEmail(input: PasswordChangedEmailInput): Promise<void> {
    return this.send(input);
  }
}

export class BrevoSmtpEmailService implements EmailService {
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
    return this.send(input.to, documentForInput(input));
  }

  sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    return this.send(input.to, documentForInput(input));
  }

  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    return this.send(input.to, documentForInput(input));
  }

  sendPasswordChangedEmail(input: PasswordChangedEmailInput): Promise<void> {
    return this.send(input.to, documentForInput(input));
  }
}

export const createEmailService = (): EmailService => {
  if (config.EMAIL_API_KEY) {
    return new BrevoApiEmailService();
  }
  if (config.EMAIL_USER && config.EMAIL_PASSWORD) {
    return new BrevoSmtpEmailService();
  }
  return new MemoryEmailService();
};
