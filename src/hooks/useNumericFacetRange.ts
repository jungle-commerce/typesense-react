/**
 * @fileoverview Hook for managing numeric facet ranges, supporting both individual
 * checkbox selection and range slider interfaces.
 */

import { useCallback, useMemo } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import { useAccumulatedFacets } from './useAccumulatedFacets';
import type { FacetValue } from '../types';

/**
 * Hook return type for numeric facet range management
 */
export interface UseNumericFacetRangeReturn {
  /** Available bounds based on all values (accumulated or current) */
  bounds: { min: number; max: number } | null;
  /** Currently selected range */
  currentRange: { min: number; max: number } | null;
  /** Individual facet values with counts */
  values: FacetValue[];
  /** Current mode (individual checkbox selection or range) */
  mode: 'individual' | 'range';
  /** Set the facet to range mode and apply a range */
  setRange: (min: number, max: number) => void;
  /** Clear the range selection */
  clearRange: () => void;
  /** Switch between individual and range modes */
  setMode: (mode: 'individual' | 'range') => void;
  /** Check if field is numeric */
  isNumeric: boolean;
  /** Selected individual values (when in individual mode) */
  selectedValues: string[];
  /** Field configuration from schema */
  fieldType: string | null;
}

/**
 * Hook for managing numeric facet ranges
 * @param field - The field name to manage
 * @returns Numeric facet range state and actions
 */
export function useNumericFacetRange(field: string): UseNumericFacetRangeReturn {
  const { state, dispatch } = useSearchContext();
  const { getMergedFacetValues, accumulatedFacetValues } = useAccumulatedFacets();
  
  // Check if field is numeric based on schema
  const fieldSchema = state.schema?.fields?.find(f => f.name === field);
  const isNumeric = fieldSchema?.type ? 
    ['int32', 'int64', 'float'].includes(fieldSchema.type) : false;
  
  // Get current mode and range configuration
  const rangeConfig = state.numericFacetRanges[field];
  const mode = rangeConfig?.mode || 'individual';
  const currentRange = rangeConfig?.currentRange || null;
  
  // Get selected individual values from disjunctive facets
  const selectedValues = state.disjunctiveFacets[field] || [];
  
  // Get facet values (merged if accumulating)
  const values = useMemo(() => {
    if (state.accumulateFacets) {
      return getMergedFacetValues(field, selectedValues);
    }
    return state.results?.facet_counts?.find(fc => fc.field_name === field)?.counts || [];
  }, [state.results, state.accumulateFacets, getMergedFacetValues, field, selectedValues]);
  
  // Calculate bounds
  const bounds = useMemo(() => {
    if (!isNumeric) return null;
    
    // First check if we have bounds in numericFacetRanges
    if (rangeConfig?.bounds) {
      return rangeConfig.bounds;
    }
    
    // Then check accumulated bounds if accumulating
    if (state.accumulateFacets && accumulatedFacetValues[field]?.numericBounds) {
      return accumulatedFacetValues[field].numericBounds!;
    }
    
    // Otherwise calculate from current values
    if (values.length === 0) return null;
    
    const numericValues = values
      .map(v => parseFloat(v.value))
      .filter(n => !isNaN(n));
    
    if (numericValues.length === 0) return null;
    
    return {
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
    };
  }, [isNumeric, rangeConfig, state.accumulateFacets, accumulatedFacetValues, field, values]);
  
  /**
   * Set the facet to range mode and apply a range
   */
  const setRange = useCallback((min: number, max: number) => {
    // First ensure we're in range mode
    if (mode !== 'range') {
      dispatch({ 
        type: 'SET_NUMERIC_FACET_MODE', 
        payload: { field, mode: 'range' } 
      });
    }
    
    // Then set the range
    dispatch({ 
      type: 'SET_NUMERIC_FACET_RANGE', 
      payload: { field, min, max } 
    });
  }, [dispatch, field, mode]);
  
  /**
   * Clear the range selection
   */
  const clearRange = useCallback(() => {
    dispatch({ type: 'CLEAR_NUMERIC_FACET_RANGE', payload: field });
  }, [dispatch, field]);
  
  /**
   * Switch between individual and range modes
   */
  const setMode = useCallback((newMode: 'individual' | 'range') => {
    dispatch({ 
      type: 'SET_NUMERIC_FACET_MODE', 
      payload: { field, mode: newMode } 
    });
    
    // If switching to range mode with individual selections, 
    // convert them to a range
    if (newMode === 'range' && selectedValues.length > 0 && isNumeric) {
      const numericSelectedValues = selectedValues
        .map(v => parseFloat(v))
        .filter(n => !isNaN(n));
      
      if (numericSelectedValues.length > 0) {
        const min = Math.min(...numericSelectedValues);
        const max = Math.max(...numericSelectedValues);
        setRange(min, max);
      }
    }
    
    // If switching to individual mode, clear the range
    if (newMode === 'individual' && currentRange) {
      clearRange();
    }
  }, [dispatch, field, selectedValues, isNumeric, currentRange, setRange, clearRange]);
  
  return {
    bounds,
    currentRange,
    values,
    mode,
    setRange,
    clearRange,
    setMode,
    isNumeric,
    selectedValues,
    fieldType: fieldSchema?.type || null,
  };
}

/**
 * Helper to convert selected individual values to a range
 */
export function valuesToRange(values: string[]): { min: number; max: number } | null {
  const numericValues = values
    .map(v => parseFloat(v))
    .filter(n => !isNaN(n));
  
  if (numericValues.length === 0) return null;
  
  return {
    min: Math.min(...numericValues),
    max: Math.max(...numericValues),
  };
}

/**
 * Helper to check if a value is within a range
 */
export function isValueInRange(
  value: string, 
  range: { min: number; max: number }
): boolean {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return false;
  
  return numValue >= range.min && numValue <= range.max;
}