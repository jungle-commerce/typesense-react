/**
 * @fileoverview Hook for managing advanced faceting functionality including
 * disjunctive, numeric, date, selective, and custom filters.
 */

import { useCallback, useMemo } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import { parseFilterString } from '../utils/filterBuilder';
import type { UseAdvancedFacetsReturn } from '../types';

/**
 * Hook for managing advanced faceting functionality
 * @param onFacetChange - Optional callback when facets change
 * @returns Advanced facets state and actions
 */
export function useAdvancedFacets(
  onFacetChange?: (filterType: string, field: string, value: any) => void
): UseAdvancedFacetsReturn {
  const { state, dispatch } = useSearchContext();

  /**
   * Toggles a disjunctive facet value
   */
  const toggleFacetValue = useCallback((field: string, value: string) => {
    dispatch({ type: 'TOGGLE_DISJUNCTIVE_FACET', payload: { field, value } });
    onFacetChange?.('disjunctive', field, value);
  }, [dispatch, onFacetChange]);

  /**
   * Sets a numeric range filter
   */
  const setNumericFilter = useCallback((field: string, min?: number, max?: number) => {
    dispatch({ type: 'SET_NUMERIC_FILTER', payload: { field, min, max } });
    onFacetChange?.('numeric', field, { min, max });
  }, [dispatch, onFacetChange]);

  /**
   * Sets a date range filter
   */
  const setDateFilter = useCallback((field: string, start?: Date | string, end?: Date | string) => {
    dispatch({ type: 'SET_DATE_FILTER', payload: { field, start, end } });
    onFacetChange?.('date', field, { start, end });
  }, [dispatch, onFacetChange]);

  /**
   * Sets a selective (single-value) filter
   */
  const setSelectiveFilter = useCallback((field: string, value: string) => {
    dispatch({ type: 'SET_SELECTIVE_FILTER', payload: { field, value } });
    onFacetChange?.('selective', field, value);
  }, [dispatch, onFacetChange]);

  /**
   * Sets custom attribute filters
   */
  const setCustomFilter = useCallback((field: string, values: string[]) => {
    dispatch({ type: 'SET_CUSTOM_FILTER', payload: { field, values } });
    onFacetChange?.('custom', field, values);
  }, [dispatch, onFacetChange]);

  /**
   * Clears a specific filter
   */
  const clearFilter = useCallback((
    field: string, 
    filterType: 'disjunctive' | 'numeric' | 'date' | 'selective' | 'custom'
  ) => {
    dispatch({ type: 'CLEAR_FILTER', payload: { field, filterType } });
    onFacetChange?.(filterType, field, null);
  }, [dispatch, onFacetChange]);

  /**
   * Clears all filters
   */
  const clearAllFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
    onFacetChange?.('all', '', null);
  }, [dispatch, onFacetChange]);

  /**
   * Alias for toggleFacetValue - toggles a facet value
   */
  // @ts-ignore - Kept for backward compatibility
  const _toggleFacet = useCallback((field: string, value: string) => {
    toggleFacetValue(field, value);
  }, [toggleFacetValue]);

  /**
   * Clears all facets for a specific field
   */
  // @ts-ignore - Kept for backward compatibility
  const _clearFieldFacets = useCallback((field: string) => {
    // Clear all filter types for this field
    if (state.disjunctiveFacets[field]?.length > 0) {
      dispatch({ type: 'CLEAR_FILTER', payload: { field, filterType: 'disjunctive' } });
    }
    if (state.numericFilters[field]) {
      dispatch({ type: 'CLEAR_FILTER', payload: { field, filterType: 'numeric' } });
    }
    if (state.dateFilters[field]) {
      dispatch({ type: 'CLEAR_FILTER', payload: { field, filterType: 'date' } });
    }
    if (state.selectiveFilters[field]) {
      dispatch({ type: 'CLEAR_FILTER', payload: { field, filterType: 'selective' } });
    }
    if (state.customFilters[field]?.length > 0) {
      dispatch({ type: 'CLEAR_FILTER', payload: { field, filterType: 'custom' } });
    }
    onFacetChange?.('clear_field', field, null);
  }, [dispatch, state, onFacetChange]);

  /**
   * Builds a filter string from current filter state
   */
  // @ts-ignore - Kept for backward compatibility
  const _buildFilterString = useCallback((): string => {
    const filters: string[] = [];

    // Add disjunctive facets
    Object.entries(state.disjunctiveFacets).forEach(([field, values]) => {
      if (values && values.length > 0) {
        const escapedValues = values.map(v => `\`${v}\``);
        filters.push(`${field}:=[${escapedValues.join(', ')}]`);
      }
    });

    // Add numeric filters
    Object.entries(state.numericFilters).forEach(([field, range]) => {
      if (range.min !== undefined || range.max !== undefined) {
        const min = range.min ?? '*';
        const max = range.max ?? '*';
        filters.push(`${field}:[${min}..${max}]`);
      }
    });

    // Add date filters
    Object.entries(state.dateFilters).forEach(([field, range]) => {
      if (range.start || range.end) {
        const start = range.start ? new Date(range.start).getTime() : '*';
        const end = range.end ? new Date(range.end).getTime() : '*';
        filters.push(`${field}:[${start}..${end}]`);
      }
    });

    // Add selective filters
    Object.entries(state.selectiveFilters).forEach(([field, value]) => {
      filters.push(`${field}:\`${value}\``);
    });

    // Add custom filters
    Object.entries(state.customFilters).forEach(([field, values]) => {
      if (values && values.length > 0) {
        const escapedValues = values.map(v => `\`${v}\``);
        filters.push(`${field}:=[${escapedValues.join(', ')}]`);
      }
    });

    return filters.join(' && ');
  }, [state]);

  /**
   * Gets facet counts for a specific field from search results
   */
  // @ts-ignore - Kept for backward compatibility
  const _getFacetCounts = useCallback((field: string): Array<{ value: string; count: number }> => {
    if (!state.results?.facet_counts) return [];
    
    const facet = state.results.facet_counts.find((f: any) => f.field_name === field);
    if (!facet) return [];

    return facet.counts.map((c: any) => ({
      value: c.value,
      count: c.count
    }));
  }, [state.results]);

  /**
   * Calculates the total number of active filters
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;

    // Count disjunctive facets
    Object.values(state.disjunctiveFacets).forEach(values => {
      if (values && values.length > 0) count += values.length;
    });

    // Count numeric filters
    count += Object.keys(state.numericFilters).length;

    // Count date filters
    count += Object.keys(state.dateFilters).length;

    // Count selective filters
    count += Object.keys(state.selectiveFilters).length;

    // Count custom filters
    Object.values(state.customFilters).forEach(values => {
      if (values && values.length > 0) count += 1; // Count as single filter regardless of values
    });

    return count;
  }, [
    state.disjunctiveFacets,
    state.numericFilters,
    state.dateFilters,
    state.selectiveFilters,
    state.customFilters
  ]);

  return {
    // Filter states
    disjunctiveFacets: state.disjunctiveFacets,
    numericFilters: state.numericFilters,
    dateFilters: state.dateFilters,
    selectiveFilters: state.selectiveFilters,
    customFilters: state.customFilters,
    activeFilterCount,

    // Actions
    actions: {
      toggleFacetValue,
      setNumericFilter,
      setDateFilter,
      setSelectiveFilter,
      setCustomFilter,
      clearFilter,
      clearAllFilters,
    },
  };
}

/**
 * Helper function to parse filters from URL or saved state
 * @param filterString - Filter string to parse
 * @returns Parsed filter states
 */
export function parseFilters(filterString: string) {
  return parseFilterString(filterString);
}

/**
 * Helper function to check if a field has active filters
 * @param field - Field name to check
 * @param filters - Filter states
 * @returns True if field has active filters
 */
export function hasActiveFilters(
  field: string,
  filters: {
    disjunctiveFacets?: Record<string, string[]>;
    numericFilters?: Record<string, { min?: number; max?: number }>;
    dateFilters?: Record<string, { start?: Date | string; end?: Date | string }>;
    selectiveFilters?: Record<string, string>;
    customFilters?: Record<string, string[]>;
  }
): boolean {
  if (filters.disjunctiveFacets?.[field]?.length) return true;
  if (filters.numericFilters?.[field]) return true;
  if (filters.dateFilters?.[field]) return true;
  if (filters.selectiveFilters?.[field]) return true;
  if (filters.customFilters?.[field]?.length) return true;
  return false;
}

/**
 * Helper function to get active filter values for a field
 * @param field - Field name
 * @param filters - Filter states
 * @returns Array of active filter values
 */
export function getActiveFilterValues(
  field: string,
  filters: {
    disjunctiveFacets?: Record<string, string[]>;
    selectiveFilters?: Record<string, string>;
    customFilters?: Record<string, string[]>;
  }
): string[] {
  const values: string[] = [];

  if (filters.disjunctiveFacets?.[field]) {
    values.push(...filters.disjunctiveFacets[field]);
  }

  if (filters.selectiveFilters?.[field]) {
    values.push(filters.selectiveFilters[field]);
  }

  if (filters.customFilters?.[field]) {
    values.push(...filters.customFilters[field]);
  }

  return values;
}