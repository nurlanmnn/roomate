import { apiClient } from './apiClient';

export interface ExpenseShare {
  userId: string;
  amount: number;
}

export interface Expense {
  _id: string;
  householdId: string;
  createdBy?: { _id: string; name: string; email: string; avatarUrl?: string } | null;
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

export type UpdateExpenseData = Omit<CreateExpenseData, 'householdId'>;

export interface PairwiseBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;
  sinceDate?: string; // Oldest expense date that contributes to this balance
}

/** Paginated response when GET includes ?limit= */
export interface PaginatedExpenses {
  items: Expense[];
  total: number;
}

export interface ExpenseInsightsPayload {
  byCategory: Array<{ category: string; amount: number; percentage: number; count: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
  predictions: { nextMonth: number; trend: 'increasing' | 'decreasing' | 'stable' };
  totalSpent: number;
  averageMonthly: number;
}

export interface HomeExpenseSummary {
  expenseCount: number;
  calendarMonthTotal: number;
  categoryTotals: {
    week: ExpenseInsightsPayload['byCategory'];
    month: ExpenseInsightsPayload['byCategory'];
    year: ExpenseInsightsPayload['byCategory'];
    all: ExpenseInsightsPayload['byCategory'];
  };
  insights: ExpenseInsightsPayload;
}

export const expensesApi = {
  getHomeExpenseSummary: async (householdId: string): Promise<HomeExpenseSummary> => {
    const response = await apiClient.instance.get(`/expenses/household/${householdId}/home-summary`);
    return response.data;
  },

  getExpenses: async (
    householdId: string,
    pagination?: { limit: number; skip?: number }
  ): Promise<Expense[] | PaginatedExpenses> => {
    const response = await apiClient.instance.get(`/expenses/household/${householdId}`, {
      params:
        pagination != null
          ? { limit: pagination.limit, skip: pagination.skip ?? 0 }
          : undefined,
    });
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

  updateExpense: async (id: string, data: UpdateExpenseData): Promise<Expense> => {
    const response = await apiClient.instance.put(`/expenses/${id}`, data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/expenses/${id}`);
    return response.data;
  },

  getInsights: async (householdId: string): Promise<ExpenseInsightsPayload> => {
    const response = await apiClient.instance.get(`/expenses/household/${householdId}/insights`);
    return response.data;
  },
};

