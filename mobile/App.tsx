import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { HouseholdProvider } from './src/context/HouseholdContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </HouseholdProvider>
    </AuthProvider>
  );
}

