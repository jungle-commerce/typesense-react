/**
 * @fileoverview Hook for determining facet display mode based on option count
 * and configuration settings.
 */

import { useMemo } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import { useAccumulatedFacets } from './useAccumulatedFacets';
import type { FacetValue } from '../types';

/**
 * Result of facet mode determination
 */
export interface FacetModeResult {
  /** Whether this facet should be single-select */
  isSingleSelect: boolean;
  /** Total number of options for this facet */
  optionCount: number;
  /** Filtered values based on mode and settings */
  filteredValues: FacetValue[];
  /** Raw values before filtering */
  rawValues: FacetValue[];
  /** Whether this facet should use range UI instead of dropdown */
  useRangeForSingleSelect: boolean;
  /** Whether this is a numeric facet */
  isNumeric: boolean;
}

/**
 * Hook to determine facet display mode and filter values accordingly
 * @param field - The facet field name
 * @param currentValues - Current facet values from search results
 * @returns Facet mode information and filtered values
 */
export function useFacetMode(field: string, currentValues: FacetValue[]): FacetModeResult {
  const { state } = useSearchContext();
  const { getMergedFacetValues } = useAccumulatedFacets();
  
  // Get active values for this facet
  const activeValues = state.disjunctiveFacets[field] || [];
  
  // Check if this is a numeric field
  const isNumeric = useMemo(() => {
    if (!state.schema?.fields) return false;
    const fieldDef = state.schema.fields.find(f => f.name === field);
    return fieldDef?.type === 'int32' || fieldDef?.type === 'int64' || fieldDef?.type === 'float';
  }, [state.schema, field]);
  
  // Get the appropriate values based on accumulation setting
  const rawValues = useMemo(() => {
    if (state.accumulateFacets) {
      return getMergedFacetValues(field, activeValues);
    }
    return currentValues;
  }, [state.accumulateFacets, getMergedFacetValues, field, activeValues, currentValues]);
  
  // Determine if this facet should be single-select
  const isSingleSelect = useMemo(() => {
    // If no limit is set (0), always use multi-select
    if (state.facetOptionLimit === 0) {
      return false;
    }
    
    // Check if total option count exceeds limit
    return rawValues.length > state.facetOptionLimit;
  }, [state.facetOptionLimit, rawValues.length]);
  
  // Filter values based on mode and settings
  const filteredValues = useMemo(() => {
    // For single-select facets with hideZeroCountsForSingleSelect enabled,
    // filter out zero-count options
    if (isSingleSelect && state.hideZeroCountsForSingleSelect) {
      return rawValues.filter(value => value.count > 0);
    }
    
    // Otherwise return all values
    return rawValues;
  }, [isSingleSelect, state.hideZeroCountsForSingleSelect, rawValues]);
  
  // Determine if this facet should use range UI when in single-select mode
  const useRangeForSingleSelect = useMemo(() => {
    return isSingleSelect && isNumeric && state.allowNumericRangeForSingleSelect;
  }, [isSingleSelect, isNumeric, state.allowNumericRangeForSingleSelect]);
  
  return {
    isSingleSelect,
    optionCount: rawValues.length,
    filteredValues,
    rawValues,
    useRangeForSingleSelect,
    isNumeric,
  };
}

/**
 * Hook to check if any facet value is selected in single-select mode
 */
export function useSingleSelectValue(field: string): string | null {
  const { state } = useSearchContext();
  
  // For single-select, we use the first value in disjunctive facets
  const values = state.disjunctiveFacets[field];
  return values && values.length > 0 ? values[0] : null;
}

/**
 * Hook to handle single-select facet changes
 */
export function useSingleSelectFacet(field: string) {
  const { state, dispatch } = useSearchContext();
  const currentValue = useSingleSelectValue(field);
  
  const setValue = (value: string) => {
    // Clear existing values and set new one
    dispatch({
      type: 'SET_DISJUNCTIVE_FACETS',
      payload: {
        ...state.disjunctiveFacets,
        [field]: value ? [value] : [],
      },
    });
  };
  
  const clearValue = () => {
    const { [field]: _, ...rest } = state.disjunctiveFacets;
    dispatch({
      type: 'SET_DISJUNCTIVE_FACETS',
      payload: rest,
    });
  };
  
  return {
    value: currentValue,
    setValue,
    clearValue,
  };
}