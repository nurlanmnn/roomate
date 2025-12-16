import { apiClient } from './apiClient';

export interface Settlement {
  _id: string;
  householdId: string;
  fromUserId: { _id: string; name: string; email: string };
  toUserId: { _id: string; name: string; email: string };
  amount: number;
  method?: string;
  note?: string;
  date: string;
  createdAt: string;
}

export interface CreateSettlementData {
  householdId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  method?: string;
  note?: string;
  date: string;
}

export interface NetBalanceData {
  householdId: string;
  otherUserId: string;
}

export interface NetBalanceResponse {
  settlement: Settlement;
  newNetBalance: number;
}

export const settlementsApi = {
  getSettlements: async (householdId: string): Promise<Settlement[]> => {
    const response = await apiClient.instance.get(`/settlements/household/${householdId}`);
    return response.data;
  },

  createSettlement: async (data: CreateSettlementData): Promise<Settlement> => {
    const response = await apiClient.instance.post('/settlements', data);
    return response.data;
  },

  netBalance: async (data: NetBalanceData): Promise<NetBalanceResponse> => {
    const response = await apiClient.instance.post('/settlements/net-balance', data);
    return response.data;
  },
};

