import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authApi } from '../api/authApi';
import { logger } from './logger';

/**
 * Feature flag — push notifications are temporarily disabled while the feature
 * is still being polished. Flip this to `true` once the backend + UX are ready.
 *
 * While `false`:
 *  - No permission prompt is shown
 *  - No Expo push token is requested or sent to the backend
 *  - Any previously-registered token (including a stale Expo Go token) is
 *    cleared from the backend so the user stops receiving stray pushes
 *  - Foreground notification banners / sounds / badges are suppressed
 *  - Notification listeners are not attached
 */
export const NOTIFICATIONS_ENABLED = false;

if (NOTIFICATIONS_ENABLED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} else {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!NOTIFICATIONS_ENABLED) return null;
  if (Platform.OS === 'android') return null;
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Register push token with the backend. When the feature flag is off this
 * instead clears any stale token already stored on the backend (e.g. a token
 * from Expo Go), so the user immediately stops receiving push notifications.
 */
export async function registerPushTokenWithBackend(): Promise<boolean> {
  if (!NOTIFICATIONS_ENABLED) {
    try {
      await authApi.removePushToken();
    } catch {
      // Best-effort cleanup; ignore errors (e.g. offline, unauthenticated).
    }
    return false;
  }

  try {
    const token = await registerForPushNotificationsAsync();

    if (!token) {
      return false;
    }

    await authApi.registerPushToken(token);
    return true;
  } catch (error) {
    logger.error('Failed to register push token', error);
    return false;
  }
}

/**
 * Remove push token from backend (on logout)
 */
export async function removePushTokenFromBackend(): Promise<void> {
  try {
    await authApi.removePushToken();
  } catch (error) {
    logger.error('Failed to remove push token', error);
  }
}

/**
 * Add notification listeners
 */
export function addNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  if (!NOTIFICATIONS_ENABLED) {
    return () => {};
  }

  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationResponse?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
