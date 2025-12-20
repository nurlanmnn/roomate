import { apiClient } from './apiClient';

export interface Household {
  _id: string;
  name: string;
  address?: string;
  ownerId: string;
  members: Array<{ _id: string; name: string; email: string; avatarUrl?: string }>;
  joinCode: string;
  createdAt: string;
}

export interface CreateHouseholdData {
  name: string;
  address?: string;
}

export interface JoinHouseholdData {
  joinCode: string;
}

export const householdsApi = {
  getHouseholds: async (): Promise<Household[]> => {
    const response = await apiClient.instance.get('/households');
    return response.data;
  },

  createHousehold: async (data: CreateHouseholdData): Promise<Household> => {
    const response = await apiClient.instance.post('/households', data);
    return response.data;
  },

  joinHousehold: async (data: JoinHouseholdData): Promise<Household> => {
    const response = await apiClient.instance.post('/households/join', data);
    return response.data;
  },

  getHousehold: async (id: string): Promise<Household> => {
    const response = await apiClient.instance.get(`/households/${id}`);
    return response.data;
  },

  leaveHousehold: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.post(`/households/${id}/leave`);
    return response.data;
  },
};

