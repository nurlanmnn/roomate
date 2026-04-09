import { apiClient } from './apiClient';

export interface ShoppingList {
  _id: string;
  householdId: string;
  name: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface ShoppingItem {
  _id: string;
  householdId: string;
  listId: string;
  name: string;
  quantity?: number;
  weight?: number;
  weightUnit?: string;
  category?: string;
  isShared: boolean;
  ownerId?: { _id: string; name: string; email: string };
  addedBy: { _id: string; name: string; email: string };
  completed: boolean;
  createdAt: string;
}

export interface CreateShoppingListData {
  householdId: string;
  name: string;
}

export interface UpdateShoppingListData {
  name: string;
}

export type WeightUnit = 'lbs' | 'kg' | 'g' | 'oz' | 'liter' | 'ml' | 'fl oz' | 'cup' | 'pint' | 'quart' | 'gallon';

export interface CreateShoppingItemData {
  householdId: string;
  listId: string;
  name: string;
  quantity?: number;
  weight?: number;
  weightUnit?: WeightUnit;
  category?: string;
  isShared: boolean;
  ownerId?: string;
}

export interface UpdateShoppingItemData {
  name?: string;
  quantity?: number;
  weight?: number;
  weightUnit?: WeightUnit;
  category?: string;
  isShared?: boolean;
  ownerId?: string;
  completed?: boolean;
}

export interface ShoppingItemStats {
  total: number;
  pending: number;
}

export interface PaginatedShoppingItems {
  items: ShoppingItem[];
  total: number;
}

export const shoppingApi = {
  getHouseholdItemStats: async (householdId: string): Promise<ShoppingItemStats> => {
    const response = await apiClient.instance.get(`/shopping/household/${householdId}/item-stats`);
    return response.data;
  },

  // Shopping Lists
  getShoppingLists: async (householdId: string): Promise<ShoppingList[]> => {
    const response = await apiClient.instance.get(`/shopping/lists/household/${householdId}`);
    return response.data;
  },

  createShoppingList: async (data: CreateShoppingListData): Promise<ShoppingList> => {
    const response = await apiClient.instance.post('/shopping/lists', data);
    return response.data;
  },

  updateShoppingList: async (id: string, data: UpdateShoppingListData): Promise<ShoppingList> => {
    const response = await apiClient.instance.patch(`/shopping/lists/${id}`, data);
    return response.data;
  },

  deleteShoppingList: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/shopping/lists/${id}`);
    return response.data;
  },

  // Shopping Items
  getShoppingItems: async (
    listId: string,
    completed?: boolean,
    pagination?: { limit: number; skip?: number }
  ): Promise<ShoppingItem[] | PaginatedShoppingItems> => {
    const params: Record<string, string | number> = {};
    if (completed !== undefined) params.completed = completed.toString();
    if (pagination != null) {
      params.limit = pagination.limit;
      params.skip = pagination.skip ?? 0;
    }
    const response = await apiClient.instance.get(`/shopping/items/list/${listId}`, { params });
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

