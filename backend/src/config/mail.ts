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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Roomate, ${name}!</h2>
      <p>Please verify your email address using the OTP code below:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="font-size: 36px; letter-spacing: 8px; color: #4CAF50; margin: 0;">${otp}</h1>
      </div>
      <p>Enter this code in the app to verify your email address.</p>
      <p style="color: #999; font-size: 12px;">This code will expire in 10 minutes.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify your email address - Roomate',
    html,
  });
};

