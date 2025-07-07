/**
 * @fileoverview Hook for managing additional filters in a more convenient way.
 * Provides an abstraction over the raw filter string manipulation.
 */

import { useCallback, useMemo } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import {
  parseAdditionalFilters,
  updateFilterInAdditionalFilters,
  removeFilterFromAdditionalFilters,
  hasFieldInAdditionalFilters,
  getFilterForField,
  mergeAdditionalFilters,
  validateAdditionalFilters as validateFilterString,
} from '../utils/additionalFiltersManager';

/**
 * Return type for the useAdditionalFilters hook
 */
export interface UseAdditionalFiltersReturn {
  /** Parsed filters as a Map */
  filters: Map<string, string>;
  /** Raw filter string */
  filterString: string;
  /** Set or update a filter for a specific field */
  setFilter: (field: string, filter: string) => void;
  /** Remove a filter for a specific field */
  removeFilter: (field: string) => void;
  /** Clear all additional filters */
  clearFilters: () => void;
  /** Check if a filter exists for a field */
  hasFilter: (field: string) => boolean;
  /** Get the filter expression for a field */
  getFilter: (field: string) => string | null;
  /** Replace all filters with a new filter string */
  setFilterString: (filters: string) => void;
  /** Merge new filters with existing ones */
  mergeFilters: (newFilters: string) => void;
  /** Validate a filter string */
  validateFilter: (filterString: string) => { isValid: boolean; error?: string };
}

/**
 * Hook for managing additional filters with a convenient API
 * @returns Object with filter management functions
 */
export function useAdditionalFilters(): UseAdditionalFiltersReturn {
  const { state, dispatch } = useSearchContext();
  
  // Parse current filters into a Map
  const filters = useMemo(
    () => parseAdditionalFilters(state.additionalFilters || ''),
    [state.additionalFilters]
  );
  
  /**
   * Set or update a filter for a specific field
   */
  const setFilter = useCallback((field: string, filter: string) => {
    const validation = validateFilterString(filter);
    if (!validation.isValid) {
      console.error(`Invalid filter: ${validation.error}`);
      return;
    }
    
    const newFilterString = updateFilterInAdditionalFilters(
      state.additionalFilters || '',
      field,
      filter
    );
    dispatch({ type: 'SET_ADDITIONAL_FILTERS', payload: newFilterString });
  }, [state.additionalFilters, dispatch]);
  
  /**
   * Remove a filter for a specific field
   */
  const removeFilter = useCallback((field: string) => {
    const newFilterString = removeFilterFromAdditionalFilters(
      state.additionalFilters || '',
      field
    );
    dispatch({ type: 'SET_ADDITIONAL_FILTERS', payload: newFilterString });
  }, [state.additionalFilters, dispatch]);
  
  /**
   * Clear all additional filters
   */
  const clearFilters = useCallback(() => {
    dispatch({ type: 'SET_ADDITIONAL_FILTERS', payload: '' });
  }, [dispatch]);
  
  /**
   * Check if a filter exists for a field
   */
  const hasFilter = useCallback((field: string) => {
    return hasFieldInAdditionalFilters(state.additionalFilters || '', field);
  }, [state.additionalFilters]);
  
  /**
   * Get the filter expression for a field
   */
  const getFilter = useCallback((field: string) => {
    return getFilterForField(state.additionalFilters || '', field);
  }, [state.additionalFilters]);
  
  /**
   * Replace all filters with a new filter string
   */
  const setFilterString = useCallback((filters: string) => {
    const validation = validateFilterString(filters);
    if (!validation.isValid) {
      console.error(`Invalid filter string: ${validation.error}`);
      return;
    }
    dispatch({ type: 'SET_ADDITIONAL_FILTERS', payload: filters });
  }, [dispatch]);
  
  /**
   * Merge new filters with existing ones
   */
  const mergeFilters = useCallback((newFilters: string) => {
    const validation = validateFilterString(newFilters);
    if (!validation.isValid) {
      console.error(`Invalid filter string: ${validation.error}`);
      return;
    }
    
    const merged = mergeAdditionalFilters(
      state.additionalFilters || '',
      newFilters
    );
    dispatch({ type: 'SET_ADDITIONAL_FILTERS', payload: merged });
  }, [state.additionalFilters, dispatch]);
  
  return {
    filters,
    filterString: state.additionalFilters || '',
    setFilter,
    removeFilter,
    clearFilters,
    hasFilter,
    getFilter,
    setFilterString,
    mergeFilters,
    validateFilter: validateFilterString,
  };
}

/**
 * Hook for managing additional filters with initial filters
 * @param initialFilters - Initial filter string
 * @returns Object with filter management functions
 */
export function useAdditionalFiltersWithInitial(
  initialFilters: string
): UseAdditionalFiltersReturn {
  const additionalFilters = useAdditionalFilters();
  
  // Set initial filters on mount
  useMemo(() => {
    if (initialFilters && !additionalFilters.filterString) {
      additionalFilters.setFilterString(initialFilters);
    }
  }, []); // Only run once on mount
  
  return additionalFilters;
}