import { apiClient } from './apiClient';

export interface AddressLocation {
  lat: number;
  lng: number;
}

export interface AddressSuggestion extends AddressLocation {
  id: string;
  /** One-line address, saved as the household's address when picked. */
  label: string;
  line1: string;
  line2: string;
}

export const geoApi = {
  /** Address suggestions (OpenStreetMap via the backend). Needs at least 3 characters. */
  searchAddress: async (q: string, lang: string, signal?: AbortSignal): Promise<AddressSuggestion[]> => {
    const response = await apiClient.instance.get('/geo/address-search', { params: { q, lang }, signal });
    return response.data?.results ?? [];
  },
};
