import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authApi } from '../api/authApi';
import * as SecureStore from 'expo-secure-store';
import { registerPushTokenWithBackend, removePushTokenFromBackend, addNotificationListeners } from '../utils/notifications';
import { logger } from '../utils/logger';
import { prefetch, clearAllCache } from '../utils/queryCache';
import { householdsApi } from '../api/householdsApi';

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
        registerPushTokenWithBackend().catch((e) => logger.error('Push token registration', e));
      }
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        logger.error('Auth check failed', error);
      }
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up notification listeners
  useEffect(() => {
    const cleanup = addNotificationListeners(
      (_notification) => {},
      (response) => {
        const _data = response.notification.request.content.data;
        // Navigation can be handled here based on notification type
      }
    );
    return cleanup;
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.user);
    // Warm the households list immediately — by the time the navigator
    // finishes its transition into HouseholdSelect the list is already in
    // the cache, so the screen paints with no spinner.
    prefetch('households:list', () => householdsApi.getHouseholds());
    // Register push token after login
    registerPushTokenWithBackend().catch((e) => logger.error('Push token registration', e));
  };

  const signup = async (name: string, email: string, password: string) => {
    await authApi.signup({ name, email, password });
    // After signup, user needs to verify email, so we don't auto-login
  };

  const logout = async () => {
    // Remove push token before logout
    await removePushTokenFromBackend().catch((e) => logger.error('Remove push token', e));
    await authApi.logout();
    // Drop all cached data on logout so the next account doesn't briefly
    // see the previous user's dashboard.
    clearAllCache();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch (error) {
      logger.error('Failed to refresh user', error);
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

