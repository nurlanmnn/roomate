import { apiClient } from './apiClient';

export interface Event {
  _id: string;
  householdId: string;
  title: string;
  description?: string;
  type: 'bill' | 'cleaning' | 'social' | 'meal' | 'meeting' | 'maintenance' | 'shopping' | 'trip' | 'birthday' | 'reminder' | 'other';
  date: string;
  endDate?: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface CreateEventData {
  householdId: string;
  title: string;
  description?: string;
  type: 'bill' | 'cleaning' | 'social' | 'meal' | 'meeting' | 'maintenance' | 'shopping' | 'trip' | 'birthday' | 'reminder' | 'other';
  date: string;
  endDate?: string;
}

export interface UpdateEventData {
  householdId: string;
  title: string;
  description?: string;
  type: 'bill' | 'cleaning' | 'social' | 'meal' | 'meeting' | 'maintenance' | 'shopping' | 'trip' | 'birthday' | 'reminder' | 'other';
  date: string;
  endDate?: string;
}

export const eventsApi = {
  getEvents: async (householdId: string): Promise<Event[]> => {
    const response = await apiClient.instance.get(`/events/household/${householdId}`);
    return response.data;
  },

  createEvent: async (data: CreateEventData): Promise<Event> => {
    const response = await apiClient.instance.post('/events', data);
    return response.data;
  },

  updateEvent: async (id: string, data: UpdateEventData): Promise<Event> => {
    const response = await apiClient.instance.put(`/events/${id}`, data);
    return response.data;
  },

  deleteEvent: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.instance.delete(`/events/${id}`);
    return response.data;
  },
};

