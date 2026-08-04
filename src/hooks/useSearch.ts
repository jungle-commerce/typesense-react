/**
 * @fileoverview Main hook for reading search state and dispatching search
 * actions.
 *
 * Search *scheduling* lives in the provider (`useProviderSearchEngine`), not
 * here: a page typically has many `useSearch()` call sites (search box,
 * results table, one per facet, ...) and state changes must trigger exactly
 * ONE request — when every call site owned its own auto-search effect, each
 * state change fanned out into N byte-identical network requests.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import type { UseSearchReturn } from '../types';

/**
 * Options for configuring the useSearch hook
 */
export interface UseSearchOptions {
  /**
   * Fields to search in (comma-separated). Only applies to searches started
   * by THIS hook's `actions.search()`; auto-searches use the provider-level
   * `queryBy`.
   */
  queryBy?: string;
  /**
   * @deprecated Debouncing is provider-wide now — set `debounceMs` on
   * `SearchProvider` instead. This option is ignored.
   */
  debounceMs?: number;
  /**
   * @deprecated The mount search is provider-wide now — set `searchOnMount`
   * on `SearchProvider` instead. This option is ignored.
   */
  searchOnMount?: boolean;
  /**
   * Maximum number of facet values to return. Only applies to searches
   * started by THIS hook's `actions.search()`; auto-searches use the
   * provider-level `maxFacetValues`.
   */
  maxFacetValues?: number;
  /** Callback when a search succeeds (fires for every provider search) */
  onSearchSuccess?: (results: any) => void;
  /** Callback when a search fails (fires for every provider search) */
  onSearchError?: (error: Error) => void;
}

/**
 * Main hook for reading search state and dispatching search actions
 * @param options - Configuration options
 * @returns Search state and actions
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    queryBy,
    maxFacetValues,
    onSearchSuccess,
    onSearchError,
  } = options;

  const { state, dispatch, searchEngine } = useSearchContext();

  // Forward lifecycle callbacks through refs so the subscription survives
  // re-renders with unstable callback identities.
  const onSearchSuccessRef = useRef(onSearchSuccess);
  onSearchSuccessRef.current = onSearchSuccess;
  const onSearchErrorRef = useRef(onSearchError);
  onSearchErrorRef.current = onSearchError;

  useEffect(() => {
    return searchEngine.subscribe({
      onSearchSuccess: results => onSearchSuccessRef.current?.(results),
      onSearchError: error => onSearchErrorRef.current?.(error),
    });
  }, [searchEngine]);

  /**
   * Main search function — runs one search now via the provider engine
   */
  const search = useCallback(async (query?: string) => {
    if (query !== undefined) {
      dispatch({ type: 'SET_QUERY', payload: query });
    }

    // Per-hook overrides only apply to imperative searches from this hook
    const hasOverrides = queryBy !== undefined || maxFacetValues !== undefined;
    const request = hasOverrides
      ? searchEngine.buildRequest({ queryBy, maxFacetValues })
      : undefined;

    await searchEngine.search(request);
  }, [searchEngine, dispatch, queryBy, maxFacetValues]);

  /**
   * Set search query with debouncing
   */
  const setQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_QUERY', payload: query });
  }, [dispatch]);

  /**
   * Set page number
   */
  const setPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, [dispatch]);

  /**
   * Set results per page
   */
  const setPerPage = useCallback((perPage: number) => {
    dispatch({ type: 'SET_PER_PAGE', payload: perPage });
  }, [dispatch]);

  /**
   * Set sort order
   */
  const setSortBy = useCallback((sortBy: string) => {
    dispatch({ type: 'SET_SORT_BY', payload: sortBy });
  }, [dispatch]);

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
  }, [dispatch]);

  /**
   * Reset search to initial state
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET_SEARCH' });
  }, [dispatch]);

  /**
   * Set additional filters
   */
  const setAdditionalFilters = useCallback((filters: string) => {
    dispatch({ type: 'SET_ADDITIONAL_FILTERS', payload: filters });
  }, [dispatch]);

  /**
   * Set multiple sort fields
   */
  const setMultiSortBy = useCallback((sorts: Array<{ field: string; order: 'asc' | 'desc' }>) => {
    dispatch({ type: 'SET_MULTI_SORT_BY', payload: sorts });
  }, [dispatch]);

  /**
   * Add a sort field
   */
  const addSortField = useCallback((field: string, order: 'asc' | 'desc' = 'desc') => {
    dispatch({ type: 'ADD_SORT_FIELD', payload: { field, order } });
  }, [dispatch]);

  /**
   * Remove a sort field
   */
  const removeSortField = useCallback((field: string) => {
    dispatch({ type: 'REMOVE_SORT_FIELD', payload: field });
  }, [dispatch]);

  /**
   * Clear all sort fields
   */
  const clearMultiSort = useCallback(() => {
    dispatch({ type: 'CLEAR_MULTI_SORT' });
  }, [dispatch]);

  return {
    state,
    actions: {
      search,
      setQuery,
      setPage,
      setPerPage,
      setSortBy,
      clearAllFilters,
      reset,
      setAdditionalFilters,
      setMultiSortBy,
      addSortField,
      removeSortField,
      clearMultiSort,
    },
    loading: state.loading,
    error: state.error,
  };
}

/**
 * Helper to check if a facet is disjunctive
 */
export function isDisjunctiveFacet(facetConfig: any): boolean {
  return facetConfig.disjunctive === true || facetConfig.type === 'checkbox';
}

/**
 * Helper to get total results count
 */
export function getTotalResults(state: any): number {
  return state.results?.found || 0;
}

/**
 * Helper to get total pages
 */
export function getTotalPages(state: any): number {
  if (!state.results) return 0;
  return Math.ceil(state.results.found / state.perPage);
}

/**
 * Helper to check if there's a next page
 */
export function hasNextPage(state: any): boolean {
  return state.page < getTotalPages(state);
}

/**
 * Helper to check if there's a previous page
 */
export function hasPreviousPage(state: any): boolean {
  return state.page > 1;
}

/**
 * Helper to get current results range
 */
export function getResultsRange(state: any): string {
  if (!state.results || state.results.found === 0) return '0 results';

  const start = (state.page - 1) * state.perPage + 1;
  const end = Math.min(start + state.results.hits.length - 1, state.results.found);

  return `${start}-${end} of ${state.results.found}`;
}
