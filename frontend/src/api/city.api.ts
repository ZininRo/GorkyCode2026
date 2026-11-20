import { request } from './client';
import type { CitySearchResponse } from '../types/auth.types';

export const cityApi = {
  search: (query: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      query: query.trim(),
      limit: '20',
    });

    return request<CitySearchResponse>(`/cities?${params.toString()}`, { signal });
  },
};
