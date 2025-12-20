import { apiClient } from './apiClient';

export interface ExpenseShare {
  userId: string;
  amount: number;
}

export interface Expense {
  _id: string;
  householdId: string;
  description: string;
  totalAmount: number;
  paidBy: { _id: string; name: string; email: string; avatarUrl?: string } | null;
  participants: Array<{ _id: string; name: string; email: string; avatarUrl?: string }>;
  splitMethod: 'even' | 'manual';
  shares: ExpenseShare[];
  date: string;
  category?: string;
  createdAt: string;
}

export interface CreateExpenseData {
  householdId: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  participants: string[];
  splitMethod: 'even' | 'manual';
  shares: ExpenseShare[];
  date: string;
  category?: string;
}

export interface PairwiseBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export const expensesApi = {
  getExpenses: async (householdId: string): Promise<Expense[]> => {
    const response = await apiClient.instance.get(`/expenses/household/${householdId}`);
    return response.data;
  },

  getBalances: async (householdId: string): Promise<PairwiseBalance[]> => {
    const response = await apiClient.instance.get(`/expenses/household/${householdId}/balances`);
    return response.data;
  },

  createExpense: async (data: CreateExpenseData): Promise<Expense> => {
    const response = await apiClient.instance.post('/expenses', data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/expenses/${id}`);
    return response.data;
  },
};

