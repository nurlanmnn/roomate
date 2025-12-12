import { apiClient } from './apiClient';

export interface Goal {
  _id: string;
  householdId: string;
  title: string;
  description?: string;
  status: 'idea' | 'planned' | 'in_progress' | 'done';
  createdBy: { _id: string; name: string; email: string };
  upvotes: Array<{ _id: string; name: string; email: string }>;
  targetDate?: string;
  createdAt: string;
}

export interface CreateGoalData {
  householdId: string;
  title: string;
  description?: string;
  status?: 'idea' | 'planned' | 'in_progress' | 'done';
  targetDate?: string;
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  status?: 'idea' | 'planned' | 'in_progress' | 'done';
  targetDate?: string;
}

export const goalsApi = {
  getGoals: async (householdId: string): Promise<Goal[]> => {
    const response = await apiClient.instance.get(`/goals/household/${householdId}`);
    return response.data;
  },

  createGoal: async (data: CreateGoalData): Promise<Goal> => {
    const response = await apiClient.instance.post('/goals', data);
    return response.data;
  },

  updateGoal: async (id: string, data: UpdateGoalData): Promise<Goal> => {
    const response = await apiClient.instance.patch(`/goals/${id}`, data);
    return response.data;
  },

  upvoteGoal: async (id: string): Promise<Goal> => {
    const response = await apiClient.instance.post(`/goals/${id}/upvote`);
    return response.data;
  },
};

