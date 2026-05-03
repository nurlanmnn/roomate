import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { authApi } from '../api/authApi';
import { logger } from './logger';

/**
 * Notifications are intentionally OFF in Expo Go and ON in real builds
 * (TestFlight / App Store / bare workflow).
 *
 * Why: Expo Go shares a generic Expo push project, which means *every*
 * Expo Go user worldwide can theoretically receive someone else's pushes
 * if tokens leak. We also saw stray pings during local filter testing
 * (#mobile-perf debugging). Production builds use the app's own APNs
 * credentials so they're isolated and safe.
 *
 * `executionEnvironment === 'storeClient'` → Expo Go
 * `executionEnvironment === 'standalone'` → built app (TestFlight/App Store)
 * `executionEnvironment === 'bare'`        → bare React Native workflow
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const NOTIFICATIONS_ENABLED = !isExpoGo;

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
 * Request permission and return an Expo push token, or null if the device
 * can't or shouldn't receive pushes (Expo Go, simulator, denied perms).
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
    // Required for EAS/standalone — token must be scoped to your Expo project.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Sync the current Expo push token to the backend (or remove any stale
 * token on Expo Go where notifications are off).
 */
export async function registerPushTokenWithBackend(): Promise<boolean> {
  if (!NOTIFICATIONS_ENABLED) {
    try {
      await authApi.removePushToken();
    } catch {
      /* best-effort cleanup */
    }
    return false;
  }

  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return false;
    await authApi.registerPushToken(token);
    return true;
  } catch (error) {
    logger.error('Failed to register push token', error);
    return false;
  }
}

export async function removePushTokenFromBackend(): Promise<void> {
  try {
    await authApi.removePushToken();
  } catch (error) {
    logger.error('Failed to remove push token', error);
  }
}

/**
 * Returns the user's current iOS-level notification permission state. Used by
 * NotificationSettingsScreen to render the "Open iOS Settings" hint when
 * permission has been denied at the OS level.
 */
export async function getPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unavailable'
> {
  if (!NOTIFICATIONS_ENABLED) return 'unavailable';
  if (!Device.isDevice) return 'unavailable';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * Prompt for iOS notification permission. Safe to call repeatedly — once the
 * user has denied or accepted, iOS returns the same answer without showing
 * the dialog again. In that case the user must change it in Settings.
 */
export async function requestPermission(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unavailable'
> {
  if (!NOTIFICATIONS_ENABLED) return 'unavailable';
  if (!Device.isDevice) return 'unavailable';
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

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
