import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/roommate-app',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@roommate-app.com',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:19006',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

export const getEnv = () => config;

