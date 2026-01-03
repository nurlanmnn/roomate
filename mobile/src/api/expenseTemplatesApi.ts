import { apiClient } from './apiClient';

export interface ExpenseTemplateShare {
  userId: string;
  amount?: number;
}

export interface ExpenseTemplate {
  _id: string;
  householdId?: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  splitMethod: 'even' | 'manual';
  defaultParticipants: Array<{
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }>;
  defaultShares?: ExpenseTemplateShare[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseTemplateData {
  householdId?: string;
  name: string;
  description?: string;
  category?: string;
  splitMethod: 'even' | 'manual';
  defaultParticipants: string[];
  defaultShares?: ExpenseTemplateShare[];
}

export const expenseTemplatesApi = {
  getTemplates: async (householdId?: string): Promise<ExpenseTemplate[]> => {
    const params = householdId ? { householdId } : {};
    const response = await apiClient.instance.get('/expense-templates', { params });
    return response.data;
  },

  getTemplate: async (id: string): Promise<ExpenseTemplate> => {
    const response = await apiClient.instance.get(`/expense-templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: CreateExpenseTemplateData): Promise<ExpenseTemplate> => {
    const response = await apiClient.instance.post('/expense-templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Partial<CreateExpenseTemplateData>): Promise<ExpenseTemplate> => {
    const response = await apiClient.instance.patch(`/expense-templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.instance.delete(`/expense-templates/${id}`);
  },
};

