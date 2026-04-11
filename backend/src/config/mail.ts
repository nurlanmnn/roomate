import { config } from './env';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;

  const user = config.brevoSmtpUser?.trim();
  const pass = config.brevoSmtpPass?.trim();

  if (!user || !pass) {
    return null;
  }

  const port = Number(config.brevoSmtpPort || 587);
  transporter = nodemailer.createTransport({
    host: config.brevoSmtpHost,
    port: Number.isFinite(port) ? port : 587,
    secure: port === 465, // true for 465, false for other ports (STARTTLS)
    auth: { user, pass },
  });

  return transporter;
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Optional HTTPS URL to a logo image (e.g. hosted PNG). Set EMAIL_LOGO_URL in env. */
function logoBlock(): string {
  const url = config.emailLogoUrl?.trim();
  if (url) {
    const safe = escapeHtml(url);
    return `<img src="${safe}" alt="Roomate" width="120" height="auto" style="display:block;margin:0 auto 20px;border:0;height:auto;max-width:100%;" />`;
  }
  return `<div style="font-size:22px;font-weight:700;color:#15803d;letter-spacing:-0.02em;text-align:center;margin:0 0 20px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Roomate</div>`;
}

const BRAND = '#15803d';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

function wrapEmailHtml(bodyInner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roomate</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid ${BORDER};overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 24px;">
              ${logoBlock()}
              ${bodyInner}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid ${BORDER};background:#fafafa;">
              <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#334155;line-height:1.5;margin:0;">
                Sincerely,<br />
                <span style="font-weight:600;color:${BRAND};">The Roomate team</span>
              </p>
            </td>
          </tr>
        </table>
        <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:${MUTED};max-width:560px;margin:16px auto 0;line-height:1.45;text-align:center;">
          You received this message because of an action on your Roomate account.<br />
          If you did not expect this email, you can safely ignore it.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlock(otp: string): string {
  const safe = escapeHtml(otp);
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:22px 16px;text-align:center;margin:20px 0;">
  <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:0.28em;color:${BRAND};">${safe}</span>
</div>`;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const tx = getTransporter();
  if (!tx) {
    console.warn('Brevo SMTP not configured. Email would be sent to:', options.to);
    console.warn('Subject:', options.subject);
    return;
  }

  if (!config.emailFrom) {
    throw new Error('EMAIL_FROM environment variable is required');
  }

  try {
    await tx.sendMail({ from: config.emailFrom, ...options });
    console.log('Email sent successfully to:', options.to);
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  const safeName = escapeHtml(name);
  const inner = `
  <h1 style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#0f172a;margin:0 0 12px;line-height:1.35;">Welcome, ${safeName}!</h1>
  <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#475569;line-height:1.55;margin:0 0 8px;">Thanks for joining Roomate. Use this verification code to confirm your email address:</p>
  ${codeBlock(otp)}
  <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#475569;line-height:1.55;margin:0;">Open the Roomate app and enter the code on the verification screen. This code expires in <strong>10 minutes</strong>.</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify your email — Roomate',
    html: wrapEmailHtml(inner),
  });
};

export const sendEmailChangeVerificationEmail = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  const safeName = escapeHtml(name);
  const inner = `
  <h1 style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#0f172a;margin:0 0 12px;line-height:1.35;">Confirm your new email, ${safeName}</h1>
  <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#475569;line-height:1.55;margin:0 0 8px;">You asked to change the email on your Roomate account to this address. Enter this code in the app to confirm:</p>
  ${codeBlock(otp)}
  <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#475569;line-height:1.55;margin:0;">If you did not request this change, you can ignore this email. Your current email stays unchanged. Code expires in <strong>10 minutes</strong>.</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Confirm your new email — Roomate',
    html: wrapEmailHtml(inner),
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  const safeName = escapeHtml(name);
  const inner = `
  <h1 style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#0f172a;margin:0 0 12px;line-height:1.35;">Reset your password, ${safeName}</h1>
  <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#475569;line-height:1.55;margin:0 0 8px;">We received a request to reset your Roomate password. Use this code in the app:</p>
  ${codeBlock(otp)}
  <p style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#475569;line-height:1.55;margin:0;">If you did not request a reset, you can ignore this email. Code expires in <strong>10 minutes</strong>.</p>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset your password — Roomate',
    html: wrapEmailHtml(inner),
  });
};
