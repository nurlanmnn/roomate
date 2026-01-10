import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authApi } from '../api/authApi';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Skip on Android for now
  if (Platform.OS === 'android') {
    console.log('Push notifications not configured for Android');
    return null;
  }

  // Must be a real device (not simulator)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    // For Expo Go, we need to handle the case where projectId is not available
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('Expo push token:', token);
    return token;
  } catch (error: any) {
    // Gracefully handle errors - push notifications are optional
    console.log('Push notifications not available:', error.message || error);
    return null;
  }
}

/**
 * Register push token with the backend
 */
export async function registerPushTokenWithBackend(): Promise<boolean> {
  try {
    const token = await registerForPushNotificationsAsync();
    
    if (!token) {
      return false;
    }

    await authApi.registerPushToken(token);
    console.log('Push token registered with backend');
    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
}

/**
 * Remove push token from backend (on logout)
 */
export async function removePushTokenFromBackend(): Promise<void> {
  try {
    await authApi.removePushToken();
    console.log('Push token removed from backend');
  } catch (error) {
    console.error('Failed to remove push token:', error);
  }
}

/**
 * Add notification listeners
 */
export function addNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response:', response);
    onNotificationResponse?.(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
