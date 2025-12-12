import sgMail from '@sendgrid/mail';
import { config } from './env';

if (config.sendgridApiKey) {
  sgMail.setApiKey(config.sendgridApiKey);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!config.sendgridApiKey) {
    console.warn('SendGrid API key not configured. Email would be sent to:', options.to);
    console.warn('Subject:', options.subject);
    return;
  }

  if (!config.sendgridFromEmail) {
    throw new Error('SENDGRID_FROM_EMAIL environment variable is required');
  }

  try {
    await sgMail.send({
      from: config.sendgridFromEmail,
      ...options,
    });
    console.log('Email sent successfully to:', options.to);
  } catch (error: any) {
    console.error('Error sending email:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', JSON.stringify(error.response.body.errors, null, 2));
    }
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

