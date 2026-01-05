import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/roommate-app',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  // Email (Brevo SMTP)
  brevoSmtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  brevoSmtpPort: process.env.BREVO_SMTP_PORT || '587',
  brevoSmtpUser: process.env.BREVO_SMTP_USER || '', // typically your Brevo login email
  brevoSmtpPass: process.env.BREVO_SMTP_PASS || '', // SMTP key generated in Brevo
  emailFrom: process.env.EMAIL_FROM || 'noreply@roommate-app.com',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:19006',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

export const getEnv = () => config;

