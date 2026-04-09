import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { HouseholdProvider } from './src/context/HouseholdContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { PerfOverlay } from './src/components/debug/PerfOverlay';
import { perfToggleVisible } from './src/utils/perfDebug';
import { Pressable, View } from 'react-native';

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
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <HouseholdProvider>
            <AppContent />
          </HouseholdProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

