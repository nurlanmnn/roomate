import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';
import { perfAddNetworkEntry } from '../utils/perfDebug';

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
  private tokenCache: string | null = null;
  private tokenLoadPromise: Promise<string | null> | null = null;

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
        // Avoid a SecureStore read on every request (can be noticeably slow in release builds).
        const token = await this.getTokenCached();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        (config as any).__perf = { startMs: Date.now() };
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => {
        const perf = (response.config as any).__perf as { startMs?: number } | undefined;
        if (perf?.startMs) {
          perfAddNetworkEntry({
            method: (response.config.method || 'GET').toUpperCase(),
            url: String(response.config.url || ''),
            baseURL: String(response.config.baseURL || API_BASE_URL),
            status: response.status,
            durationMs: Date.now() - perf.startMs,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const cfg = (error.config || {}) as any;
        const perf = cfg.__perf as { startMs?: number } | undefined;
        if (perf?.startMs) {
          perfAddNetworkEntry({
            method: String(cfg.method || 'GET').toUpperCase(),
            url: String(cfg.url || ''),
            baseURL: String(cfg.baseURL || API_BASE_URL),
            status: error.response?.status || 'ERR',
            durationMs: Date.now() - perf.startMs,
          });
        }
        if (error.response?.status === 401) {
          // Token expired or invalid - clear token
          await this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }

  private async getTokenCached(): Promise<string | null> {
    if (this.tokenCache) return this.tokenCache;
    if (this.tokenLoadPromise) return this.tokenLoadPromise;
    this.tokenLoadPromise = SecureStore.getItemAsync('auth_token')
      .then((t) => {
        this.tokenCache = t || null;
        return this.tokenCache;
      })
      .finally(() => {
        this.tokenLoadPromise = null;
      });
    return this.tokenLoadPromise;
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('auth_token', token);
    this.tokenCache = token;
  }

  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
    this.tokenCache = null;
  }
}

export const apiClient = new ApiClient();

