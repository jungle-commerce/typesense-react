/**
 * @fileoverview Hook for accessing facet values with accumulation support.
 * Merges current search results with accumulated values to provide stable facet options.
 */

import { useMemo } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import type { FacetResult, FacetValue } from '../types';

/**
 * Merged facet result that combines current and accumulated values
 */
export interface MergedFacetResult extends FacetResult {
  /** Whether this result includes accumulated values */
  hasAccumulatedValues: boolean;
}

/**
 * Hook to get facet values with accumulation support
 * @returns Object with methods to access facet values
 */
export function useAccumulatedFacets() {
  const { state, dispatch } = useSearchContext();

  /**
   * Get merged facet values for a specific field
   */
  const getMergedFacetValues = useMemo(() => {
    return (fieldName: string, activeValues?: string[]): FacetValue[] => {
      // Get current facet result from search results
      const currentFacetResult = state.results?.facet_counts?.find(
        fc => fc.field_name === fieldName
      );

      // If accumulation is disabled or no accumulated values, return current values
      if (!state.accumulateFacets || !state.accumulatedFacetValues[fieldName]) {
        const values = currentFacetResult?.counts || [];
        return applySorting(values, activeValues || []);
      }

      // Get accumulated values for this field
      const accumulatedData = state.accumulatedFacetValues[fieldName];

      // Create a map of current values for quick lookup
      const currentValuesMap = new Map<string, number>();
      if (currentFacetResult?.counts) {
        currentFacetResult.counts.forEach(item => {
          currentValuesMap.set(item.value, item.count);
        });
      }

      // Merge accumulated and current values
      const mergedValues: FacetValue[] = [];
      
      if (state.reorderByCount) {
        // Use accumulated values set (no specific order needed)
        accumulatedData.values.forEach(value => {
          mergedValues.push({
            value,
            count: currentValuesMap.get(value) || 0,
          });
        });
      } else {
        // Use ordered values array to maintain insertion order
        accumulatedData.orderedValues.forEach(value => {
          mergedValues.push({
            value,
            count: currentValuesMap.get(value) || 0,
          });
        });
      }

      // Add any new values from current results that aren't in accumulated
      if (currentFacetResult?.counts) {
        currentFacetResult.counts.forEach(item => {
          if (!accumulatedData.values.has(item.value)) {
            mergedValues.push(item);
          }
        });
      }

      return applySorting(mergedValues, activeValues || []);
    };

    function applySorting(values: FacetValue[], activeValues: string[]): FacetValue[] {
      let sorted = [...values];

      // Apply count-based sorting if enabled
      if (state.reorderByCount) {
        sorted.sort((a, b) => {
          if (a.count !== b.count) {
            return b.count - a.count;
          }
          return a.value.localeCompare(b.value);
        });
      }
      // Otherwise maintain the original order (insertion order for accumulated values)

      // Move selected to top if enabled
      if (state.moveSelectedToTop && activeValues.length > 0) {
        const selected: FacetValue[] = [];
        const unselected: FacetValue[] = [];

        sorted.forEach(value => {
          if (activeValues.includes(value.value)) {
            selected.push(value);
          } else {
            unselected.push(value);
          }
        });

        sorted = [...selected, ...unselected];
      }

      return sorted;
    }
  }, [state.results, state.accumulateFacets, state.accumulatedFacetValues, state.reorderByCount, state.moveSelectedToTop]);

  /**
   * Get all merged facet results
   */
  const mergedFacetResults = useMemo((): MergedFacetResult[] => {
    if (!state.results?.facet_counts) {
      return [];
    }

    return state.results.facet_counts.map(facetResult => {
      const mergedCounts = getMergedFacetValues(facetResult.field_name, []);
      const hasAccumulatedValues = state.accumulateFacets && 
        !!state.accumulatedFacetValues[facetResult.field_name];

      return {
        ...facetResult,
        counts: mergedCounts,
        hasAccumulatedValues,
      };
    });
  }, [state.results, getMergedFacetValues, state.accumulateFacets, state.accumulatedFacetValues]);

  /**
   * Clear accumulated values for a specific field or all fields
   */
  const clearAccumulatedFacets = (field?: string) => {
    dispatch({ type: 'CLEAR_ACCUMULATED_FACETS', payload: field });
  };

  /**
   * Toggle facet accumulation on/off
   */
  const setAccumulateFacets = (enabled: boolean) => {
    dispatch({ type: 'SET_ACCUMULATE_FACETS', payload: enabled });
  };

  /**
   * Toggle moving selected values to top
   */
  const setMoveSelectedToTop = (enabled: boolean) => {
    dispatch({ type: 'SET_MOVE_SELECTED_TO_TOP', payload: enabled });
  };

  /**
   * Toggle reordering by count
   */
  const setReorderByCount = (enabled: boolean) => {
    dispatch({ type: 'SET_REORDER_BY_COUNT', payload: enabled });
  };

  /**
   * Toggle using numeric ranges
   */
  const setUseNumericRanges = (enabled: boolean) => {
    dispatch({ type: 'SET_USE_NUMERIC_RANGES', payload: enabled });
  };

  /**
   * Set facet option limit
   */
  const setFacetOptionLimit = (limit: number) => {
    dispatch({ type: 'SET_FACET_OPTION_LIMIT', payload: limit });
  };

  /**
   * Toggle hiding zero counts for single-select facets
   */
  const setHideZeroCountsForSingleSelect = (hide: boolean) => {
    dispatch({ type: 'SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT', payload: hide });
  };

  /**
   * Toggle allowing numeric range for single-select facets
   */
  const setAllowNumericRangeForSingleSelect = (allow: boolean) => {
    dispatch({ type: 'SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT', payload: allow });
  };

  return {
    getMergedFacetValues,
    mergedFacetResults,
    clearAccumulatedFacets,
    setAccumulateFacets,
    setMoveSelectedToTop,
    setReorderByCount,
    setUseNumericRanges,
    setFacetOptionLimit,
    setHideZeroCountsForSingleSelect,
    setAllowNumericRangeForSingleSelect,
    isAccumulatingFacets: state.accumulateFacets,
    isMoveSelectedToTop: state.moveSelectedToTop,
    isReorderByCount: state.reorderByCount,
    isUseNumericRanges: state.useNumericRanges,
    facetOptionLimit: state.facetOptionLimit,
    hideZeroCountsForSingleSelect: state.hideZeroCountsForSingleSelect,
    allowNumericRangeForSingleSelect: state.allowNumericRangeForSingleSelect,
    accumulatedFacetValues: state.accumulatedFacetValues,
  };
}