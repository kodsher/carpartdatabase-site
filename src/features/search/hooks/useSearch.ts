/**
 * Search Hook
 *
 * Custom hook for searching parts with debouncing
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchState, SearchOptions } from '../types';
import { Part, SearchFilters } from '@/types';
import { debounce } from '@/lib/utils';

const DEFAULT_OPTIONS: SearchOptions = {
  pageSize: 20,
  debounceMs: 300,
};

export function useSearch(options: SearchOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    hasMore: false,
  });

  // Debounced search function
  const searchParts = useCallback(
    debounce(async (query: string, filters?: SearchFilters, page: number = 1) => {
      if (!query && !filters) {
        setState((prev) => ({ ...prev, results: [], loading: false, total: 0, hasMore: false }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.condition) params.set('condition', filters.condition);
        if (filters?.minPrice) params.set('minPrice', filters.minPrice.toString());
        if (filters?.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
        if (filters?.inStock !== undefined) params.set('inStock', filters.inStock.toString());
        params.set('page', page.toString());
        params.set('limit', (opts.pageSize || 20).toString());

        const response = await fetch(`/api/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        setState({
          query,
          results: data.parts || [],
          loading: false,
          error: null,
          total: data.total || 0,
          page,
          hasMore: (page * (opts.pageSize || 20)) < (data.total || 0),
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    }, opts.debounceMs || 300),
    [opts.debounceMs, opts.pageSize]
  );

  // Load more results
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      searchParts(state.query, undefined, state.page + 1);
    }
  }, [state.hasMore, state.loading, state.page, state.query, searchParts]);

  // Reset search
  const reset = useCallback(() => {
    setState({
      query: '',
      results: [],
      loading: false,
      error: null,
      total: 0,
      page: 1,
      hasMore: false,
    });
  }, []);

  return {
    ...state,
    search: searchParts,
    loadMore,
    reset,
  };
}
