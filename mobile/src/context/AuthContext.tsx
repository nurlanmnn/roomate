import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authApi } from '../api/authApi';
import * as SecureStore from 'expo-secure-store';
import { registerPushTokenWithBackend, removePushTokenFromBackend, addNotificationListeners } from '../utils/notifications';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const currentUser = await authApi.getMe();
        setUser(currentUser);
        // Register push token after auth check succeeds
        registerPushTokenWithBackend().catch(console.error);
      }
    } catch (error: any) {
      // Only log unexpected errors, not 401s (which are normal when token is invalid/expired)
      if (error?.response?.status !== 401) {
        console.error('Auth check failed:', error);
      }
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up notification listeners
  useEffect(() => {
    const cleanup = addNotificationListeners(
      (notification) => {
        // Handle received notification (app is in foreground)
        console.log('Notification received in foreground:', notification.request.content.title);
      },
      (response) => {
        // Handle notification tap (navigate to relevant screen)
        const data = response.notification.request.content.data;
        console.log('User tapped notification with data:', data);
        // Navigation can be handled here based on notification type
      }
    );

    return cleanup;
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.user);
    // Register push token after login
    registerPushTokenWithBackend().catch(console.error);
  };

  const signup = async (name: string, email: string, password: string) => {
    await authApi.signup({ name, email, password });
    // After signup, user needs to verify email, so we don't auto-login
  };

  const logout = async () => {
    // Remove push token before logout
    await removePushTokenFromBackend().catch(console.error);
    await authApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

