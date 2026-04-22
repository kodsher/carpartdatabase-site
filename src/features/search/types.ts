/**
 * Search Feature Types
 */

import { Part, SearchFilters } from '@/types';

export interface SearchState {
  query: string;
  results: Part[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  hasMore: boolean;
}

export interface SearchOptions {
  pageSize?: number;
  debounceMs?: number;
}
