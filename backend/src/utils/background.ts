import { waitUntil } from '@vercel/functions';

/**
 * Run work after the response without blocking it (push notifications, etc.).
 * On Vercel the function can be frozen as soon as the response is sent, so the
 * promise is handed to `waitUntil` to keep the instance alive until it settles.
 * On a normal long-running server `waitUntil` is a no-op and the promise just
 * runs. Errors are logged, never thrown.
 */
export const runInBackground = (promise: Promise<unknown>, label = 'Background task'): void => {
  const safe = promise.catch((err) => console.error(`${label} error:`, err));
  try {
    waitUntil(safe);
  } catch {
    // Not running on Vercel — nothing to extend.
  }
};
