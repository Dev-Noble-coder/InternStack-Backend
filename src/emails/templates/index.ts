import {
  EmailDocument,
  ctaButton,
  emailContent,
  emailLayout,
  escapeHtml,
  escapeUrl,
  heading,
  eyebrow,
  paragraph,
  codeBlock,
  securityNotice,
  infoBlock,
} from "../components";

const greeting = (firstName: string): string =>
  paragraph(`Hi ${escapeHtml(firstName)},`);

export type VerificationEmailInput = {
  firstName: string;
  verificationCode: string;
  verificationUrl: string;
  expirationMinutes: number;
};

export const verificationEmail = (
  input: VerificationEmailInput,
): EmailDocument => ({
  subject: "Verify your InternStack email",
  html: emailLayout(
    "Confirm your email to activate your InternStack account.",
    emailContent(
      [
        eyebrow("VERIFY YOUR EMAIL"),
        heading("Confirm your email<br>to get started"),
        greeting(input.firstName),
        paragraph(
          "Thanks for signing up! Please use the verification code below to confirm your email address and activate your InternStack account.",
        ),
        codeBlock(
          "VERIFICATION CODE",
          input.verificationCode,
          input.expirationMinutes,
        ),
        securityNotice(
          "If you didn't create an InternStack account, you can safely ignore this email.",
        ),
        ctaButton("VERIFY EMAIL", input.verificationUrl),
      ].join(""),
    ),
  ),
  text: `Confirm your InternStack email\n\nHi ${input.firstName},\n\nYour verification code is ${input.verificationCode}. It expires in ${input.expirationMinutes} minutes.\n\nVerify your email: ${input.verificationUrl}`,
});

export type WelcomeEmailInput = {
  firstName: string;
  appUrl: string;
};

export const welcomeEmail = (input: WelcomeEmailInput): EmailDocument => ({
  subject: `Welcome to InternStack, ${input.firstName}`,
  html: emailLayout(
    "Your InternStack journey starts here.",
    emailContent(
      [
        eyebrow("WELCOME TO INTERNSTACK"),
        heading("You're in. Let's build<br>your future."),
        greeting(input.firstName),
        paragraph(
          "Your email is verified, and your InternStack account is now active.",
        ),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background-color:#20294d;"><tr><td style="padding:22px 20px;border-left:6px solid #f6a800;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:28px;font-weight:700;color:#ffffff;">Build your career, layer by layer.</td></tr></table>`,
        paragraph(
          "InternStack equips you with tools for professional CVs, logbooks, and discovering SIWES opportunities from top Nigerian companies.",
        ),
        ctaButton("GO TO INTERNSTACK", input.appUrl),
      ].join(""),
    ),
  ),
  text: `Welcome to InternStack, ${input.firstName}\n\nYour email is verified, and your account is now active.\n\nGo to InternStack: ${input.appUrl}`,
});

export type PasswordResetEmailInput = {
  firstName: string;
  resetCode: string;
  resetPasswordUrl: string;
  expirationMinutes: number;
};

export const passwordResetEmail = (
  input: PasswordResetEmailInput,
): EmailDocument => ({
  subject: "Your InternStack password reset code",
  html: emailLayout(
    "Use this code to reset your InternStack password.",
    emailContent(
      [
        eyebrow("PASSWORD RESET"),
        heading("Reset your password<br>to regain access"),
        greeting(input.firstName),
        paragraph(
          "We received a request to reset the password for your InternStack account.",
        ),
        codeBlock("RESET CODE", input.resetCode, input.expirationMinutes),
        securityNotice(
          "If you didn't request a password reset, you can safely ignore this email. Your password will not change unless you complete the reset process.",
        ),
        ctaButton("RESET PASSWORD", input.resetPasswordUrl),
      ].join(""),
    ),
  ),
  text: `Your InternStack password reset code\n\nHi ${input.firstName},\n\nYour reset code is ${input.resetCode}. It expires in ${input.expirationMinutes} minutes.\n\nReset your password: ${input.resetPasswordUrl}`,
});

export type PasswordChangedEmailInput = {
  firstName: string;
  email: string;
  changedAt: string;
  supportUrl: string;
};

export const passwordChangedEmail = (
  input: PasswordChangedEmailInput,
): EmailDocument => ({
  subject: "Your InternStack password was changed",
  html: emailLayout(
    "Your InternStack account password has been updated.",
    emailContent(
      [
        eyebrow("SECURITY ALERT"),
        heading("Your password was<br>successfully changed"),
        greeting(input.firstName),
        paragraph(
          "This is a confirmation that your InternStack password was changed.",
        ),
        infoBlock([
          ["Changed on", input.changedAt],
          ["Account", input.email],
        ]),
        paragraph("If you made this change, no further action is required."),
        securityNotice(
          "If you didn't make this change, secure your account immediately by contacting our support team.",
        ),
        ctaButton("CONTACT SUPPORT", input.supportUrl),
      ].join(""),
    ),
  ),
  text: `Your InternStack password was changed\n\nHi ${input.firstName},\n\nChanged on: ${input.changedAt}\nAccount: ${input.email}\n\nIf you did not make this change, contact support: ${input.supportUrl}`,
});
