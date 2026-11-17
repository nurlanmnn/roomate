/// <reference path="../src/types/express.d.ts" />
/**
 * Vercel serverless entry. vercel.json rewrites every path here, and the
 * Express app handles routing exactly as it does on a normal server.
 */
import app from '../src/app';

export default app;
