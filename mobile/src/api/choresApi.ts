import { apiClient } from './apiClient';

export type ChoreFrequency = 'weekly' | 'biweekly';

export interface ChoreRotationMember {
  _id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface ChoreCompletion {
  /** ISO timestamp of the first day (midnight) of the completed period. */
  periodStart: string;
  completedBy: string;
  completedAt: string | null;
}

export interface ChoreRotation {
  _id: string;
  householdId: string;
  name: string;
  rotationOrder: ChoreRotationMember[];
  frequency: ChoreFrequency;
  startDate: string;
  createdAt: string;
  currentAssignee: { _id: string; name: string } | null;
  /** Server-computed ISO start of the period containing "now". */
  currentPeriodStart?: string;
  /** True when `currentPeriodStart` is in `completions`. */
  currentPeriodCompleted?: boolean;
  completions?: ChoreCompletion[];
}

export interface ChoreScheduleAssignment {
  choreId: string;
  choreName: string;
  assigneeId: string;
  assigneeName: string;
  periodStart: string;
  periodEnd: string;
}

export interface CreateChoreData {
  householdId: string;
  name: string;
  rotationOrder: string[];
  frequency: ChoreFrequency;
  startDate: string;
}

export interface UpdateChoreData {
  name?: string;
  rotationOrder?: string[];
  frequency?: ChoreFrequency;
  startDate?: string;
}

export const choresApi = {
  getChores: async (householdId: string, week?: string): Promise<ChoreRotation[]> => {
    const params = week ? { week } : {};
    const response = await apiClient.instance.get(`/chores/household/${householdId}`, { params });
    return response.data;
  },

  getSchedule: async (householdId: string, from: string, to: string): Promise<ChoreScheduleAssignment[]> => {
    const response = await apiClient.instance.get(`/chores/household/${householdId}/schedule`, {
      params: { from, to },
    });
    return response.data;
  },

  createChore: async (data: CreateChoreData): Promise<ChoreRotation> => {
    const response = await apiClient.instance.post('/chores', data);
    return response.data;
  },

  updateChore: async (id: string, data: UpdateChoreData): Promise<ChoreRotation> => {
    const response = await apiClient.instance.patch(`/chores/${id}`, data);
    return response.data;
  },

  deleteChore: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/chores/${id}`);
    return response.data;
  },

  /** Marks the chore's current (or provided) period as done. Server returns
   *  the updated chore in the same shape as `getChores`. */
  markComplete: async (id: string, periodStart?: string): Promise<ChoreRotation> => {
    const response = await apiClient.instance.post(`/chores/${id}/complete`, {
      ...(periodStart ? { periodStart } : {}),
    });
    return response.data;
  },

  /** Unmarks the chore's current (or provided) period as done. */
  markIncomplete: async (id: string, periodStart?: string): Promise<ChoreRotation> => {
    const response = await apiClient.instance.post(`/chores/${id}/uncomplete`, {
      ...(periodStart ? { periodStart } : {}),
    });
    return response.data;
  },
};
