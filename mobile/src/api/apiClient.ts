import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

const getDevServerHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // Older manifest format (Expo Go)
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ||
    // Newer manifest format (EAS updates)
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) return null;
  // hostUri looks like "192.168.0.14:8081" or "exp://192.168.0.14:8081"
  const cleaned = hostUri.replace(/^.*:\/\//, '');
  return cleaned.split(':')[0] || null;
};

const getScriptUrlHost = (): string | null => {
  const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode?.scriptURL;
  if (!scriptURL) return null;
  // scriptURL looks like "http://192.168.0.14:8081/index.bundle?..."
  try {
    return new URL(scriptURL).hostname || null;
  } catch {
    const match = scriptURL.match(/https?:\/\/([^:/]+)/);
    return match?.[1] || null;
  }
};

/**
 * Production: set via app.config.js extra.apiUrl (from EXPO_PUBLIC_API_URL at build time) or EAS env.
 * Falls back to placeholder until you configure production URL.
 */
const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
    const fromEnv = typeof process !== 'undefined' && (process as unknown as { env?: { EXPO_PUBLIC_API_URL?: string } }).env?.EXPO_PUBLIC_API_URL;
    const prod = fromExtra || fromEnv || 'https://your-production-api.com';
    return prod.startsWith('http') ? prod : `https://${prod}`;
  }
  const host = getScriptUrlHost() || getDevServerHost() || 'localhost';
  return `http://${host}:3000`;
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear token
          await SecureStore.deleteItemAsync('auth_token');
        }
        return Promise.reject(error);
      }
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('auth_token', token);
  }

  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
  }
}

export const apiClient = new ApiClient();

