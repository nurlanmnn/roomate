import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { HouseholdProvider } from './src/context/HouseholdContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { PerfOverlay } from './src/components/debug/PerfOverlay';
import { perfToggleVisible } from './src/utils/perfDebug';
import { Pressable, View } from 'react-native';
import { OfflineBanner } from './src/components/OfflineBanner';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  SofiaSansSemiCondensed_600SemiBold,
  SofiaSansSemiCondensed_700Bold,
  SofiaSansSemiCondensed_800ExtraBold,
} from '@expo-google-fonts/sofia-sans-semi-condensed';

const AppContent = () => {
  const { theme } = useTheme();
  const tapState = React.useRef<{ count: number; firstAt: number }>({ count: 0, firstAt: 0 });

  const handleSecretTap = () => {
    const now = Date.now();
    const s = tapState.current;
    if (!s.firstAt || now - s.firstAt > 2000) {
      tapState.current = { count: 1, firstAt: now };
      return;
    }
    s.count += 1;
    if (s.count >= 6) {
      tapState.current = { count: 0, firstAt: 0 };
      perfToggleVisible();
    }
  };
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      <OfflineBanner />
      {/* Hidden hotspot: tap 6x quickly to toggle perf overlay (works in TestFlight). */}
      <Pressable
        onPress={handleSecretTap}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 60,
          height: 60,
          opacity: 0.01,
        }}
        accessibilityLabel=" "
      >
        <View />
      </Pressable>
      <PerfOverlay />
    </>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SofiaSansSemiCondensed_600SemiBold,
    SofiaSansSemiCondensed_700Bold,
    SofiaSansSemiCondensed_800ExtraBold,
  });

  // Hold the first frame until the display face is ready; on a load error fall back to the system face.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider>
          <NetworkProvider>
            <AuthProvider>
              <HouseholdProvider>
                <AppContent />
              </HouseholdProvider>
            </AuthProvider>
          </NetworkProvider>
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

