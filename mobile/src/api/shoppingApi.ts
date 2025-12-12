import { apiClient } from './apiClient';

export interface ShoppingItem {
  _id: string;
  householdId: string;
  name: string;
  quantity?: string;
  category?: string;
  isShared: boolean;
  ownerId?: { _id: string; name: string; email: string };
  addedBy: { _id: string; name: string; email: string };
  completed: boolean;
  createdAt: string;
}

export interface CreateShoppingItemData {
  householdId: string;
  name: string;
  quantity?: string;
  category?: string;
  isShared: boolean;
  ownerId?: string;
}

export interface UpdateShoppingItemData {
  name?: string;
  quantity?: string;
  category?: string;
  isShared?: boolean;
  ownerId?: string;
  completed?: boolean;
}

export const shoppingApi = {
  getShoppingItems: async (householdId: string, completed?: boolean): Promise<ShoppingItem[]> => {
    const params = completed !== undefined ? { completed: completed.toString() } : {};
    const response = await apiClient.instance.get(`/shopping/household/${householdId}`, { params });
    return response.data;
  },

  createShoppingItem: async (data: CreateShoppingItemData): Promise<ShoppingItem> => {
    const response = await apiClient.instance.post('/shopping', data);
    return response.data;
  },

  updateShoppingItem: async (id: string, data: UpdateShoppingItemData): Promise<ShoppingItem> => {
    const response = await apiClient.instance.patch(`/shopping/${id}`, data);
    return response.data;
  },

  deleteShoppingItem: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/shopping/${id}`);
    return response.data;
  },
};

