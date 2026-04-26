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
  /** User ids who have muted notifications for this household specifically. */
  notificationMutedBy?: string[];
  joinCode: string;
  /** ISO 4217 currency code (e.g. 'USD', 'EUR'). Locked once the household has
   *  any expenses or settlements; see `currencies.ts` for the supported list. */
  currency: string;
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
  currency?: string;
}

export interface JoinHouseholdData {
  joinCode: string;
}

export interface UpdateHouseholdData {
  name?: string;
  address?: string;
  currency?: string;
}

export interface HouseholdTransactionCount {
  expenseCount: number;
  settlementCount: number;
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

  leaveHousehold: async (id: string): Promise<{ success: boolean; deleted?: boolean; newOwnerId?: string }> => {
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

  /** Owner only — generates a new invite code; old code stops working. */
  regenerateInviteCode: async (householdId: string): Promise<Household> => {
    const response = await apiClient.instance.post(`/households/${householdId}/regenerate-invite`);
    return response.data;
  },

  /** Member-accessible — used by settings to decide if currency is still editable. */
  getTransactionCount: async (householdId: string): Promise<HouseholdTransactionCount> => {
    const response = await apiClient.instance.get(`/households/${householdId}/transaction-count`);
    return response.data;
  },

  /**
   * Toggle whether the *current user* mutes notifications for this household.
   * Combined server-side with the global notificationPreferences.
   */
  setHouseholdNotificationMute: async (
    householdId: string,
    muted: boolean
  ): Promise<{ muted: boolean }> => {
    const response = await apiClient.instance.put(
      `/households/${householdId}/notification-mute`,
      { muted }
    );
    return response.data;
  },
};

