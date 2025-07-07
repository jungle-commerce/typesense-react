import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNumericFacetRange, valuesToRange, isValueInRange } from '../useNumericFacetRange';
import { createSearchProviderWrapper, createMockSearchResponse } from '../../test/testUtils';
import type { FacetCounts, CollectionSchema } from '../../types';

describe('useNumericFacetRange', () => {
  const mockSchema: CollectionSchema = {
    name: 'products',
    fields: [
      { name: 'price', type: 'float', facet: true },
      { name: 'rating', type: 'int32', facet: true },
      { name: 'category', type: 'string', facet: true }
    ]
  };

  const mockPriceFacets: FacetCounts = {
    field_name: 'price',
    counts: [
      { value: '10', count: 5 },
      { value: '20', count: 8 },
      { value: '30', count: 3 },
      { value: '50', count: 6 },
      { value: '100', count: 2 },
      { value: '200', count: 1 }
    ]
  };

  const mockRatingFacets: FacetCounts = {
    field_name: 'rating',
    counts: [
      { value: '1', count: 2 },
      { value: '2', count: 5 },
      { value: '3', count: 10 },
      { value: '4', count: 15 },
      { value: '5', count: 8 }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('numeric field detection', () => {
    it('identifies numeric fields correctly', () => {
      const mockSearchResponse = createMockSearchResponse({
        facet_counts: [mockPriceFacets, mockRatingFacets]
      });

      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          results: mockSearchResponse
        }
      });

      const { result: priceResult } = renderHook(() => useNumericFacetRange('price'), { wrapper });
      const { result: ratingResult } = renderHook(() => useNumericFacetRange('rating'), { wrapper });
      const { result: categoryResult } = renderHook(() => useNumericFacetRange('category'), { wrapper });

      expect(priceResult.current.isNumeric).toBe(true);
      expect(priceResult.current.fieldType).toBe('float');

      expect(ratingResult.current.isNumeric).toBe(true);
      expect(ratingResult.current.fieldType).toBe('int32');

      expect(categoryResult.current.isNumeric).toBe(false);
      expect(categoryResult.current.fieldType).toBe('string');
    });
  });

  describe('bounds calculation', () => {
    it('calculates bounds from facet values', () => {
      const mockSearchResponse = createMockSearchResponse({
        facet_counts: [mockPriceFacets]
      });

      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          results: mockSearchResponse
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.bounds).toEqual({ min: 10, max: 200 });
    });

    it('returns null bounds for non-numeric fields', () => {
      const mockSearchResponse = createMockSearchResponse({
        facet_counts: [{
          field_name: 'category',
          counts: [
            { value: 'Electronics', count: 10 },
            { value: 'Books', count: 5 }
          ]
        }]
      });

      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema },
        initialSearchResults: mockSearchResponse
      });

      const { result } = renderHook(() => useNumericFacetRange('category'), { wrapper });

      expect(result.current.bounds).toBe(null);
    });

    it('returns null bounds when no values available', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.bounds).toBe(null);
    });

    it('uses stored bounds from numericFacetRanges if available', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          numericFacetRanges: {
            price: {
              mode: 'range',
              bounds: { min: 5, max: 500 }
            }
          }
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.bounds).toEqual({ min: 5, max: 500 });
    });
  });

  describe('mode management', () => {
    it('defaults to individual mode', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.mode).toBe('individual');
    });

    it('switches between individual and range modes', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      act(() => {
        result.current.setMode('range');
      });

      expect(result.current.mode).toBe('range');

      act(() => {
        result.current.setMode('individual');
      });

      expect(result.current.mode).toBe('individual');
    });

    it('converts individual selections to range when switching modes', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          disjunctiveFacets: {
            price: ['20', '50', '100']
          }
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.selectedValues).toEqual(['20', '50', '100']);

      act(() => {
        result.current.setMode('range');
      });

      expect(result.current.currentRange).toEqual({ min: 20, max: 100 });
    });

    it('clears range when switching to individual mode', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          numericFacetRanges: {
            price: {
              mode: 'range',
              currentRange: { min: 10, max: 100 }
            }
          }
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.currentRange).toEqual({ min: 10, max: 100 });

      act(() => {
        result.current.setMode('individual');
      });

      expect(result.current.currentRange).toBe(null);
    });
  });

  describe('range operations', () => {
    it('sets a range', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      act(() => {
        result.current.setRange(25, 150);
      });

      expect(result.current.mode).toBe('range');
      expect(result.current.currentRange).toEqual({ min: 25, max: 150 });
    });

    it('clears a range', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          numericFacetRanges: {
            price: {
              mode: 'range',
              currentRange: { min: 10, max: 100 }
            }
          }
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      act(() => {
        result.current.clearRange();
      });

      expect(result.current.currentRange).toBe(null);
    });

    it('automatically switches to range mode when setting range', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.mode).toBe('individual');

      act(() => {
        result.current.setRange(50, 200);
      });

      expect(result.current.mode).toBe('range');
    });
  });

  describe('accumulated facets integration', () => {
    it('uses merged values when accumulation is enabled', () => {
      const mockSearchResponse = createMockSearchResponse({
        facet_counts: [mockPriceFacets]
      });

      const wrapper = createSearchProviderWrapper({
        accumulateFacets: true,
        initialState: { 
          schema: mockSchema,
          results: mockSearchResponse
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.values).toHaveLength(6);
    });

    it('uses accumulated bounds when available', () => {
      const mockSearchResponse = createMockSearchResponse({
        facet_counts: [mockPriceFacets]
      });

      // The test expects that when accumulation is enabled and accumulated bounds exist,
      // those bounds should be used instead of calculating from current values
      const wrapper = createSearchProviderWrapper({
        accumulateFacets: true,
        initialState: { 
          schema: mockSchema,
          results: mockSearchResponse,
          accumulatedFacetValues: {
            price: {
              values: new Set(['5', '10', '300']),
              orderedValues: ['5', '10', '300'],
              numericBounds: { min: 5, max: 300 }
            }
          }
        }
      });

      const { result } = renderHook(() => useNumericFacetRange('price'), { wrapper });

      expect(result.current.bounds).toEqual({ min: 5, max: 300 });
    });
  });
});

describe('valuesToRange helper', () => {
  it('converts string values to numeric range', () => {
    const range = valuesToRange(['10', '20', '30', '50']);
    expect(range).toEqual({ min: 10, max: 50 });
  });

  it('filters out non-numeric values', () => {
    const range = valuesToRange(['10', 'abc', '30', 'def', '50']);
    expect(range).toEqual({ min: 10, max: 50 });
  });

  it('returns null for empty array', () => {
    const range = valuesToRange([]);
    expect(range).toBe(null);
  });

  it('returns null for all non-numeric values', () => {
    const range = valuesToRange(['abc', 'def', 'ghi']);
    expect(range).toBe(null);
  });

  it('handles single value', () => {
    const range = valuesToRange(['25']);
    expect(range).toEqual({ min: 25, max: 25 });
  });
});

describe('isValueInRange helper', () => {
  const range = { min: 10, max: 50 };

  it('returns true for values within range', () => {
    expect(isValueInRange('25', range)).toBe(true);
    expect(isValueInRange('10', range)).toBe(true);
    expect(isValueInRange('50', range)).toBe(true);
  });

  it('returns false for values outside range', () => {
    expect(isValueInRange('5', range)).toBe(false);
    expect(isValueInRange('100', range)).toBe(false);
  });

  it('returns false for non-numeric values', () => {
    expect(isValueInRange('abc', range)).toBe(false);
    expect(isValueInRange('', range)).toBe(false);
  });

  it('handles decimal values', () => {
    expect(isValueInRange('25.5', range)).toBe(true);
    expect(isValueInRange('9.99', range)).toBe(false);
    expect(isValueInRange('50.01', range)).toBe(false);
  });
});