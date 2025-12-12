import { apiClient } from './apiClient';

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  signup: async (data: SignupData): Promise<{ user: User }> => {
    const response = await apiClient.instance.post('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.instance.post('/auth/login', data);
    const authResponse: AuthResponse = response.data;
    await apiClient.setToken(authResponse.token);
    return authResponse;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.instance.get('/auth/me');
    return response.data;
  },

  verifyEmail: async (email: string, otp: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.post('/auth/verify-email', { email, otp });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.instance.post('/auth/resend-verification', { email });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.clearToken();
  },
};

