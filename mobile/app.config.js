/**
 * Dynamic Expo config. Production API URL:
 * - Set EXPO_PUBLIC_API_URL in EAS (recommended): eas env:create --name EXPO_PUBLIC_API_URL --scope project
 * - Or export before local prebuild: EXPO_PUBLIC_API_URL=https://api.example.com npx expo prebuild
 *
 * iOS bundle ID must match the App ID you register in Apple Developer (change BUNDLE_ID below if needed).
 */
const BUNDLE_ID = 'com.roomate.app';

module.exports = () => {
  const raw =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.API_URL ||
    'https://your-production-api.com';
  const apiUrl = raw.startsWith('http') ? raw : `https://${raw}`;

  return {
    expo: {
      name: 'Roomate',
      slug: 'roomate-app',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      splash: {
        backgroundColor: '#ffffff',
        resizeMode: 'contain',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: BUNDLE_ID,
        infoPlist: {
          CFBundleDisplayName: 'Roomate',
          NSCameraUsageDescription:
            'Roomate uses the camera so you can take a profile or household photo.',
          NSPhotoLibraryUsageDescription:
            'Roomate needs access to your photo library so you can choose profile or household images.',
          NSPhotoLibraryAddUsageDescription:
            'Roomate may save images to your library when you export or share content.',
          NSLocationWhenInUseUsageDescription:
            'Roomate uses your location to set or suggest household addresses when you choose.',
          NSUserNotificationsUsageDescription:
            'Roomate sends reminders for chores, events, and household activity.',
        },
      },
      web: {
        favicon: './assets/icon.png',
      },
      plugins: [
        'expo-secure-store',
        [
          'expo-notifications',
          {
            sounds: [],
          },
        ],
      ],
      extra: {
        eas: {
          projectId: 'fd1b9880-afd9-4ea4-863f-1fd639fbf8cf',
        },
        apiUrl,
      },
    },
  };
};
