import { emailTokens } from "../styles/tokens";

export type EmailDocument = {
  subject: string;
  html: string;
  text: string;
};

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const escapeUrl = (value: string): string => escapeHtml(value);

const stackMark = `
  <span style="display:inline-block;width:24px;height:20px;vertical-align:middle;margin-right:8px;">
    <span style="display:block;width:18px;height:5px;border:3px solid ${emailTokens.colors.gold};transform:skewY(-24deg);margin:0 0 2px 2px;"></span>
    <span style="display:block;width:18px;height:5px;border:3px solid ${emailTokens.colors.gold};transform:skewY(-24deg);margin:0 0 2px 2px;"></span>
    <span style="display:block;width:18px;height:5px;border:3px solid ${emailTokens.colors.gold};transform:skewY(-24deg);margin:0 0 0 2px;"></span>
  </span>`;

export const brandLogo = (light = true): string => `
  <span style="font-family:${emailTokens.fontFamily};font-size:24px;line-height:28px;font-weight:700;letter-spacing:0;color:${light ? emailTokens.colors.white : emailTokens.colors.navy};">
    ${stackMark}<span style="color:${emailTokens.colors.gold};">Intern</span><span style="color:${light ? emailTokens.colors.white : emailTokens.colors.navy};">Stack</span>
  </span>`;

export const preheader = (value: string): string => `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(value)}</div>`;

export const emailHeader = (): string => `
  <tr>
    <td style="background-color:${emailTokens.colors.navyDark};padding:24px 32px;text-align:left;">
      ${brandLogo(true)}
    </td>
  </tr>`;

export const emailFooter = (): string => `
  <tr>
    <td style="background-color:${emailTokens.colors.navyDark};padding:28px 32px;color:${emailTokens.colors.white};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:${emailTokens.fontFamily};font-size:13px;line-height:20px;color:${emailTokens.colors.white};vertical-align:top;padding-bottom:18px;">
            ${brandLogo(true)}<br>
            <span style="color:#cbd2e7;">Build your career, layer by layer.</span>
          </td>
          <td style="font-family:${emailTokens.fontFamily};font-size:13px;line-height:20px;color:#cbd2e7;text-align:right;vertical-align:top;padding-bottom:18px;">
            Need help?<br><span style="color:${emailTokens.colors.gold};font-weight:700;">Contact support</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border-top:1px solid #4c577f;padding-top:14px;font-family:${emailTokens.fontFamily};font-size:11px;line-height:16px;color:#aeb8d3;">
            &copy; 2026 InternStack. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

export const emailLayout = (preheaderText: string, content: string): string => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>InternStack</title>
  <style>
    @media screen and (max-width:620px) {
      .email-shell { width:100% !important; }
      .email-pad { padding-left:22px !important; padding-right:22px !important; }
      .email-heading { font-size:32px !important; line-height:38px !important; }
      .email-button { display:block !important; width:auto !important; text-align:center !important; }
      .footer-cell { display:block !important; width:100% !important; text-align:left !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${emailTokens.colors.navy};font-family:${emailTokens.fontFamily};">
  ${preheader(preheaderText)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${emailTokens.colors.navy};">
    <tr><td align="center" style="padding:24px 10px;">
      <table role="presentation" class="email-shell" width="${emailTokens.width}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${emailTokens.width}px;background-color:${emailTokens.colors.white};">
        ${emailHeader()}
        <tr><td style="height:12px;background-color:${emailTokens.colors.gold};font-size:0;line-height:0;">&nbsp;</td></tr>
        ${content}
        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const emailContent = (content: string): string => `
  <tr>
    <td class="email-pad" style="padding:38px 48px 44px;background-color:${emailTokens.colors.white};">
      ${content}
    </td>
  </tr>`;

export const eyebrow = (value: string): string => `
  <div style="font-family:${emailTokens.fontFamily};font-size:12px;line-height:18px;letter-spacing:1.2px;font-weight:700;color:${emailTokens.colors.goldDark};">${escapeHtml(value)}</div>`;

export const heading = (value: string): string => `
  <h1 class="email-heading" style="margin:10px 0 20px;font-family:${emailTokens.fontFamily};font-size:40px;line-height:45px;font-weight:800;color:${emailTokens.colors.navyDark};">${value}</h1>`;

export const paragraph = (value: string): string => `
  <p style="margin:0 0 18px;font-family:${emailTokens.fontFamily};font-size:16px;line-height:25px;color:${emailTokens.colors.text};">${value}</p>`;

export const ctaButton = (label: string, url: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr><td bgcolor="${emailTokens.colors.gold}" style="border:1px solid ${emailTokens.colors.goldDark};box-shadow:4px 4px 0 ${emailTokens.colors.navyDark};">
      <a class="email-button" href="${escapeUrl(url)}" style="display:inline-block;padding:14px 26px;font-family:${emailTokens.fontFamily};font-size:14px;line-height:18px;font-weight:700;letter-spacing:.3px;color:${emailTokens.colors.navyDark};text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

export const codeBlock = (
  label: string,
  code: string,
  expirationMinutes: number,
): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 20px;background-color:${emailTokens.colors.surface};border:1px solid ${emailTokens.colors.border};">
    <tr><td style="padding:18px 20px 16px;border-left:6px solid ${emailTokens.colors.gold};">
      <div style="font-family:${emailTokens.fontFamily};font-size:11px;line-height:16px;letter-spacing:1px;font-weight:700;color:${emailTokens.colors.navyLight};">${escapeHtml(label)}</div>
      <div style="margin-top:7px;font-family:${emailTokens.fontFamily};font-size:34px;line-height:40px;letter-spacing:8px;font-weight:800;color:${emailTokens.colors.navyDark};">${escapeHtml(code)}</div>
      <div style="margin-top:8px;font-family:${emailTokens.fontFamily};font-size:12px;line-height:18px;color:${emailTokens.colors.muted};">This code expires in ${expirationMinutes} minutes.</div>
    </td></tr>
  </table>`;

export const securityNotice = (value: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;background-color:#fff8e8;border-left:4px solid ${emailTokens.colors.gold};">
    <tr><td style="padding:13px 15px;font-family:${emailTokens.fontFamily};font-size:13px;line-height:20px;color:${emailTokens.colors.text};">${value}</td></tr>
  </table>`;

export const infoBlock = (rows: Array<[string, string]>): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background-color:${emailTokens.colors.surface};border:1px solid ${emailTokens.colors.border};">
    ${rows.map(([label, value]) => `<tr><td style="padding:11px 16px;font-family:${emailTokens.fontFamily};font-size:12px;line-height:18px;color:${emailTokens.colors.muted};border-bottom:1px solid ${emailTokens.colors.border};">${escapeHtml(label)}</td><td style="padding:11px 16px;text-align:right;font-family:${emailTokens.fontFamily};font-size:13px;line-height:18px;font-weight:700;color:${emailTokens.colors.text};border-bottom:1px solid ${emailTokens.colors.border};">${escapeHtml(value)}</td></tr>`).join("")}
  </table>`;
