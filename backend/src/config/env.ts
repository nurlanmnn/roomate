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
  // AWS Speech (Transcribe) configuration
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  awsS3Region: process.env.AWS_S3_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsSessionToken: process.env.AWS_SESSION_TOKEN || '',
  awsS3Bucket: process.env.AWS_S3_BUCKET || '',
  awsTranscribeLanguageCode: process.env.AWS_TRANSCRIBE_LANGUAGE_CODE || 'en-US',
};

