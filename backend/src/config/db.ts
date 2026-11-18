import mongoose from 'mongoose';
import { config } from './env';

/**
 * Connects once and reuses the connection. Throws on failure (the caller
 * decides whether to exit or retry) — on Vercel, exiting the process would
 * just kill the function instance.
 */
export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(config.mongodbUri, {
      // Serverless instances come and go; keep each one's pool small so Atlas
      // M0's connection limit is never close.
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });
    const { host, name } = mongoose.connection;
    console.log(`MongoDB connected successfully (host=${host}, db=${name})`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
