/**
 * @fileoverview Main hook for performing searches and managing search state.
 * Handles query debouncing, filter building, and automatic search triggers.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import { buildFilterString } from '../utils/filterBuilder';
import { buildCombinedSortString } from '../utils/sortBuilder';
import type { UseSearchReturn, SearchRequest } from '../types';

/**
 * Options for configuring the useSearch hook
 */
export interface UseSearchOptions {
  /** Fields to search in (comma-separated) */
  queryBy?: string;
  /** Debounce delay for search queries in milliseconds */
  debounceMs?: number;
  /** Whether to search on mount */
  searchOnMount?: boolean;
  /** Maximum number of facet values to return */
  maxFacetValues?: number;
  /** Callback when search succeeds */
  onSearchSuccess?: (results: any) => void;
  /** Callback when search fails */
  onSearchError?: (error: Error) => void;
}

/**
 * Main hook for performing searches and managing search state
 * @param options - Configuration options
 * @returns Search state and actions
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    queryBy,
    debounceMs = 300,
    searchOnMount = true,
    maxFacetValues = 10000,
    onSearchSuccess,
    onSearchError,
  } = options;

  const { state, dispatch, client, collection, config, initialSearchParams } = useSearchContext();
  
  // Refs for managing debouncing and preventing duplicate searches
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef<string>('');
  const isSearchingRef = useRef(false);
  
  // Keep a ref to the latest state to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Builds the search request from current state
   */
  const buildSearchRequest = useCallback((): SearchRequest => {
    // Use the ref to get the latest state
    const currentState = stateRef.current;
    
    // Build filter string from all filter types
    const filterBy = buildFilterString({
      disjunctiveFacets: currentState.disjunctiveFacets,
      numericFilters: currentState.numericFilters,
      dateFilters: currentState.dateFilters,
      selectiveFilters: currentState.selectiveFilters,
      customFilters: currentState.customFilters,
      additionalFilters: currentState.additionalFilters,
      schema: currentState.schema,
      useNumericRanges: currentState.useNumericRanges,
      numericFacetRanges: currentState.numericFacetRanges,
    });

    // Build facet_by string from facet configurations
    const facetBy = currentState.facets
      .map(f => f.field)
      .filter(Boolean)
      .join(',');

    // Build query_by from schema if not provided
    let searchFields = queryBy || initialSearchParams?.query_by;
    if (!searchFields && currentState.schema?.fields) {
      // Get all searchable fields from schema
      const searchableFields = currentState.schema.fields
        .filter(field => 
          field.index !== false && 
          (field.type === 'string' || field.type === 'string[]')
        )
        .map(field => field.name);
      
      if (searchableFields.length > 0) {
        searchFields = searchableFields.join(',');
      }
    }

    return {
      q: currentState.query || '*',
      query_by: searchFields || '*', // Use * as fallback to search all fields
      filter_by: filterBy || undefined,
      facet_by: facetBy || undefined,
      max_facet_values: maxFacetValues,
      page: currentState.page,
      per_page: currentState.perPage || initialSearchParams?.per_page || 20,
      sort_by: buildCombinedSortString(currentState.sortBy, currentState.multiSortBy) || initialSearchParams?.sort_by || undefined,
    };
  }, [
    queryBy,
    maxFacetValues,
    initialSearchParams,
  ]);

  /**
   * Performs the actual search request
   */
  const performSearch = useCallback(async (request: SearchRequest) => {
    // Prevent duplicate searches
    const searchKey = JSON.stringify(request);
    if (searchKey === lastSearchRef.current && isSearchingRef.current) {
      return;
    }

    lastSearchRef.current = searchKey;
    isSearchingRef.current = true;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Use the ref to get the latest state
      const currentState = stateRef.current;
      
      // Check if we need to perform disjunctive facet queries
      const hasDisjunctiveFacets = Object.keys(currentState.disjunctiveFacets).some(
        field => currentState.disjunctiveFacets[field]?.length > 0
      );

      if (hasDisjunctiveFacets && config.enableDisjunctiveFacetQueries) {
        // Perform parallel queries for disjunctive facets
        const disjunctiveQueries: SearchRequest[] = [];
        
        // Main query with all filters
        disjunctiveQueries.push(request);

        // Additional queries for each disjunctive facet (without that facet's filter)
        for (const [field, values] of Object.entries(currentState.disjunctiveFacets)) {
          if (values && values.length > 0) {
            // Build filter without this facet
            const filterWithoutFacet = buildFilterString({
              disjunctiveFacets: {
                ...currentState.disjunctiveFacets,
                [field]: [], // Exclude this facet
              },
              numericFilters: currentState.numericFilters,
              dateFilters: currentState.dateFilters,
              selectiveFilters: currentState.selectiveFilters,
              customFilters: currentState.customFilters,
              additionalFilters: currentState.additionalFilters,
              schema: currentState.schema,
              useNumericRanges: currentState.useNumericRanges,
              numericFacetRanges: currentState.numericFacetRanges,
            });
            

            disjunctiveQueries.push({
              ...request,
              filter_by: filterWithoutFacet || undefined,
              page: 1, // Only need first page for facet counts
              per_page: 0, // Don't need results, just facet counts
              facet_by: field, // Only get counts for this facet
            });
          }
        }

        // Execute all queries in parallel
        const results = await client.multiSearch(collection, disjunctiveQueries);
        
        // Merge facet counts from parallel queries
        const mainResult = results[0];
        if (mainResult.facet_counts && results.length > 1) {
          for (let i = 1; i < results.length; i++) {
            const facetResult = results[i];
            if (facetResult.facet_counts?.[0]) {
              // Replace the facet counts with the unfiltered version
              const facetIndex = mainResult.facet_counts.findIndex(
                (f: any) => f.field_name === facetResult.facet_counts![0].field_name
              );
              if (facetIndex >= 0) {
                mainResult.facet_counts[facetIndex] = facetResult.facet_counts[0];
              }
            }
          }
        }

        dispatch({ type: 'SET_RESULTS', payload: mainResult });
        
        // Update accumulated facet values if enabled
        if (currentState.accumulateFacets && mainResult.facet_counts) {
          for (const facetResult of mainResult.facet_counts) {
            const values = facetResult.counts.map((c: any) => c.value);
            dispatch({ 
              type: 'UPDATE_ACCUMULATED_FACETS', 
              payload: { field: facetResult.field_name, values } 
            });
          }
        }
        
        // Update numeric facet bounds
        if (mainResult.facet_counts && currentState.schema) {
          for (const facetResult of mainResult.facet_counts) {
            const field = currentState.schema.fields?.find(f => f.name === facetResult.field_name);
            if (field && ['int32', 'int64', 'float'].includes(field.type)) {
              const numericValues = facetResult.counts
                .map((c: any) => parseFloat(c.value))
                .filter((n: number) => !isNaN(n));
              
              if (numericValues.length > 0) {
                // If accumulating facets, use the accumulated bounds instead
                if (currentState.accumulateFacets && currentState.accumulatedFacetValues[facetResult.field_name]?.numericBounds) {
                  const accBounds = currentState.accumulatedFacetValues[facetResult.field_name].numericBounds!;
                  dispatch({
                    type: 'UPDATE_NUMERIC_FACET_BOUNDS',
                    payload: {
                      field: facetResult.field_name,
                      min: accBounds.min,
                      max: accBounds.max,
                    },
                  });
                } else {
                  dispatch({
                    type: 'UPDATE_NUMERIC_FACET_BOUNDS',
                    payload: {
                      field: facetResult.field_name,
                      min: Math.min(...numericValues),
                      max: Math.max(...numericValues),
                    },
                  });
                }
              }
            }
          }
        }
        
        onSearchSuccess?.(mainResult);
      } else {
        // Simple search without disjunctive faceting
        const results = await client.search(collection, request);
        dispatch({ type: 'SET_RESULTS', payload: results });
        
        // Update accumulated facet values if enabled
        if (currentState.accumulateFacets && results.facet_counts) {
          for (const facetResult of results.facet_counts) {
            const values = facetResult.counts.map((c: any) => c.value);
            dispatch({ 
              type: 'UPDATE_ACCUMULATED_FACETS', 
              payload: { field: facetResult.field_name, values } 
            });
          }
        }
        
        // Update numeric facet bounds
        if (results.facet_counts && currentState.schema) {
          for (const facetResult of results.facet_counts) {
            const field = currentState.schema.fields?.find(f => f.name === facetResult.field_name);
            if (field && ['int32', 'int64', 'float'].includes(field.type)) {
              const numericValues = facetResult.counts
                .map((c: any) => parseFloat(c.value))
                .filter((n: number) => !isNaN(n));
              
              if (numericValues.length > 0) {
                // If accumulating facets, use the accumulated bounds instead
                if (currentState.accumulateFacets && currentState.accumulatedFacetValues[facetResult.field_name]?.numericBounds) {
                  const accBounds = currentState.accumulatedFacetValues[facetResult.field_name].numericBounds!;
                  dispatch({
                    type: 'UPDATE_NUMERIC_FACET_BOUNDS',
                    payload: {
                      field: facetResult.field_name,
                      min: accBounds.min,
                      max: accBounds.max,
                    },
                  });
                } else {
                  dispatch({
                    type: 'UPDATE_NUMERIC_FACET_BOUNDS',
                    payload: {
                      field: facetResult.field_name,
                      min: Math.min(...numericValues),
                      max: Math.max(...numericValues),
                    },
                  });
                }
              }
            }
          }
        }
        
        onSearchSuccess?.(results);
      }
    } catch (error) {
      const searchError = error instanceof Error ? error : new Error('Search failed');
      dispatch({ type: 'SET_ERROR', payload: searchError });
      onSearchError?.(searchError);
    } finally {
      isSearchingRef.current = false;
    }
  }, [
    client,
    collection,
    config.enableDisjunctiveFacetQueries,
    dispatch,
    onSearchSuccess,
    onSearchError,
  ]);

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((request: SearchRequest) => {
    if (searchTimeoutRef.current) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(request);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  /**
   * Main search function
   */
  const search = useCallback(async (query?: string) => {
    if (query !== undefined) {
      dispatch({ type: 'SET_QUERY', payload: query });
    }
    
    const request = buildSearchRequest();
    await performSearch(request);
  }, [buildSearchRequest, performSearch, dispatch]);

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

  // Effect to trigger search when relevant state changes
  useEffect(() => {
    // Skip if we haven't performed initial search yet and searchOnMount is false
    if (!state.searchPerformed && !searchOnMount) {
      return;
    }

    const request = buildSearchRequest();
    
    // Use debouncing for query changes, immediate search for other changes
    if (state.query !== lastSearchRef.current) {
      debouncedSearch(request);
    } else {
      performSearch(request);
    }
  }, [
    state.query,
    state.page,
    state.perPage,
    state.sortBy,
    state.multiSortBy,
    state.additionalFilters,
    state.disjunctiveFacets,
    state.numericFilters,
    state.dateFilters,
    state.selectiveFilters,
    state.customFilters,
    state.searchPerformed,
    searchOnMount,
    buildSearchRequest,
    debouncedSearch,
    performSearch,
  ]);

  // Effect to search on mount if configured
  useEffect(() => {
    if (searchOnMount && !state.searchPerformed) {
      const request = buildSearchRequest();
      performSearch(request);
    }
  }, []); // Only run once on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
    };
  }, []);

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