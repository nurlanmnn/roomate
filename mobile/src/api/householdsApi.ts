import { apiClient } from './apiClient';

export interface HouseholdMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Household {
  _id: string;
  name: string;
  address?: string;
  ownerId: string | HouseholdMember; // Can be string or populated object
  members: HouseholdMember[];
  joinCode: string;
  createdAt: string;
}

// Helper to get ownerId as string
export const getOwnerIdString = (household: Household): string => {
  if (typeof household.ownerId === 'string') {
    return household.ownerId;
  }
  return household.ownerId._id;
};

export interface CreateHouseholdData {
  name: string;
  address?: string;
}

export interface JoinHouseholdData {
  joinCode: string;
}

export interface UpdateHouseholdData {
  name?: string;
  address?: string;
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

  updateHousehold: async (id: string, data: UpdateHouseholdData): Promise<Household> => {
    const response = await apiClient.instance.put(`/households/${id}`, data);
    return response.data;
  },

  removeMember: async (householdId: string, memberId: string): Promise<Household> => {
    const response = await apiClient.instance.delete(`/households/${householdId}/members/${memberId}`);
    return response.data;
  },

  deleteHousehold: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/households/${id}`);
    return response.data;
  },
};

