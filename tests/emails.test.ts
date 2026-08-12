import {
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
  welcomeEmail,
} from "../src/emails";

describe("transactional email templates", () => {
  const common = {
    firstName: "Ada & Grace",
    verificationCode: "482913",
    resetCode: "731204",
    verificationUrl:
      "https://app.example.com/verify-email?email=ada%40example.com",
    resetPasswordUrl:
      "https://app.example.com/reset-password?email=ada%40example.com",
    appUrl: "https://app.example.com",
    supportUrl: "https://app.example.com/contact",
    expirationMinutes: 15,
  };

  test("renders verification details without leaking unrelated secrets", () => {
    const email = verificationEmail(common);
    expect(email.subject).toBe("Verify your InternStack email");
    expect(email.html).toContain("482913");
    expect(email.html).toContain(common.verificationUrl);
    expect(email.html).toContain("This code expires in 15 minutes.");
    expect(email.html).toContain("If you didn't create an InternStack account");
    expect(email.html).toContain("Ada &amp; Grace");
    expect(email.html).not.toContain("731204");
  });

  test("renders the welcome brand block and app URL", () => {
    const email = welcomeEmail({ firstName: "Ada", appUrl: common.appUrl });
    expect(email.subject).toBe("Welcome to InternStack, Ada");
    expect(email.html).toContain("Build your career, layer by layer.");
    expect(email.html).toContain(common.appUrl);
    expect(email.html).not.toContain(common.resetCode);
  });

  test("renders password reset details and does not include a password", () => {
    const email = passwordResetEmail({
      firstName: "Ada",
      resetCode: common.resetCode,
      resetPasswordUrl: common.resetPasswordUrl,
      expirationMinutes: common.expirationMinutes,
    });
    expect(email.subject).toBe("Your InternStack password reset code");
    expect(email.html).toContain(common.resetCode);
    expect(email.html).toContain(common.resetPasswordUrl);
    expect(email.html).toContain(
      "Your password will not change unless you complete the reset process",
    );
    expect(email.html).not.toContain("correct horse battery staple");
  });

  test("renders password-changed information and support URL", () => {
    const email = passwordChangedEmail({
      firstName: "Ada",
      email: "ada@example.com",
      changedAt: "October 26, 2023 at 10:45 AM WAT",
      supportUrl: common.supportUrl,
    });
    expect(email.subject).toBe("Your InternStack password was changed");
    expect(email.html).toContain("October 26, 2023 at 10:45 AM WAT");
    expect(email.html).toContain("ada@example.com");
    expect(email.html).toContain(common.supportUrl);
    expect(email.html).not.toContain("731204");
  });
});
