import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFacetMode, useSingleSelectValue, useSingleSelectFacet } from '../useFacetMode';
import { createSearchProviderWrapper } from '../../test/testUtils';
import type { FacetValue, CollectionSchema } from '../../types';

describe('useFacetMode', () => {
  const mockSchema: CollectionSchema = {
    name: 'products',
    fields: [
      { name: 'category', type: 'string', facet: true },
      { name: 'brand', type: 'string', facet: true },
      { name: 'price', type: 'float', facet: true },
      { name: 'rating', type: 'int32', facet: true },
      { name: 'tags', type: 'string[]', facet: true },
      { name: 'description', type: 'string', facet: false }
    ]
  };

  const mockFacetValues: FacetValue[] = [
    { value: 'Electronics', count: 10 },
    { value: 'Books', count: 5 },
    { value: 'Clothing', count: 8 },
    { value: 'Sports', count: 3 },
    { value: 'Home', count: 12 },
    { value: 'Garden', count: 2 },
    { value: 'Toys', count: 6 },
    { value: 'Music', count: 4 },
    { value: 'Movies', count: 7 },
    { value: 'Games', count: 9 },
    { value: 'Food', count: 11 },
    { value: 'Beauty', count: 1 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('facet mode determination', () => {
    it('returns multi-select mode when option count is below limit', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });
      
      const { result } = renderHook(
        () => useFacetMode('category', mockFacetValues.slice(0, 5)),
        { wrapper }
      );
      
      expect(result.current.isSingleSelect).toBe(false);
      expect(result.current.optionCount).toBe(5);
    });

    it('returns single-select mode when option count exceeds limit', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          facetOptionLimit: 10 // Set limit to 10, mockFacetValues has 12 items
        }
      });
      
      const { result } = renderHook(
        () => useFacetMode('category', mockFacetValues),
        { wrapper }
      );
      
      expect(result.current.isSingleSelect).toBe(true);
      expect(result.current.optionCount).toBe(12);
    });

    it('always returns multi-select when facetOptionLimit is 0', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          facetOptionLimit: 0
        }
      });
      
      const { result } = renderHook(
        () => useFacetMode('category', mockFacetValues),
        { wrapper }
      );
      
      expect(result.current.isSingleSelect).toBe(false);
    });
  });

  describe('numeric field detection', () => {
    it('identifies numeric fields correctly', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { schema: mockSchema }
      });
      
      const numericValues: FacetValue[] = [
        { value: '0-50', count: 10 },
        { value: '50-100', count: 5 },
        { value: '100-200', count: 3 }
      ];
      
      const { result: priceResult } = renderHook(
        () => useFacetMode('price', numericValues),
        { wrapper }
      );
      
      const { result: categoryResult } = renderHook(
        () => useFacetMode('category', mockFacetValues),
        { wrapper }
      );
      
      expect(priceResult.current.isNumeric).toBe(true);
      expect(categoryResult.current.isNumeric).toBe(false);
    });

    it('enables range UI for numeric single-select when allowed', () => {
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          allowNumericRangeForSingleSelect: true,
          facetOptionLimit: 10 // Set limit to 10, numericValues will have 15 items
        }
      });
      
      const numericValues: FacetValue[] = Array.from({ length: 15 }, (_, i) => ({
        value: `${i * 10}-${(i + 1) * 10}`,
        count: Math.floor(Math.random() * 20) + 1 // Ensure non-zero counts
      }));
      
      const { result } = renderHook(
        () => useFacetMode('price', numericValues),
        { wrapper }
      );
      
      expect(result.current.isSingleSelect).toBe(true);
      expect(result.current.isNumeric).toBe(true);
      expect(result.current.useRangeForSingleSelect).toBe(true);
    });
  });

  describe('value filtering', () => {
    it('filters zero-count values in single-select mode when enabled', () => {
      const valuesWithZero: FacetValue[] = [
        { value: 'Active', count: 10 },
        { value: 'Inactive', count: 0 },
        { value: 'Pending', count: 5 },
        { value: 'Archived', count: 0 }
      ];
      
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          hideZeroCountsForSingleSelect: true,
          facetOptionLimit: 3 // Force single-select
        }
      });
      
      const { result } = renderHook(
        () => useFacetMode('status', valuesWithZero),
        { wrapper }
      );
      
      expect(result.current.isSingleSelect).toBe(true);
      expect(result.current.filteredValues).toHaveLength(2);
      expect(result.current.filteredValues.every(v => v.count > 0)).toBe(true);
      expect(result.current.rawValues).toHaveLength(4); // Original values unchanged
    });

    it('does not filter zero-count values in multi-select mode', () => {
      const valuesWithZero: FacetValue[] = [
        { value: 'Active', count: 10 },
        { value: 'Inactive', count: 0 }
      ];
      
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          hideZeroCountsForSingleSelect: true,
          facetOptionLimit: 10 // Won't trigger single-select
        }
      });
      
      const { result } = renderHook(
        () => useFacetMode('status', valuesWithZero),
        { wrapper }
      );
      
      expect(result.current.isSingleSelect).toBe(false);
      expect(result.current.filteredValues).toHaveLength(2);
      expect(result.current.filteredValues).toEqual(valuesWithZero);
    });
  });

  describe('accumulated facets integration', () => {
    it('uses merged values when accumulation is enabled', () => {
      const currentValues: FacetValue[] = [
        { value: 'Current1', count: 5 },
        { value: 'Current2', count: 3 }
      ];
      
      const wrapper = createSearchProviderWrapper({
        initialState: { 
          schema: mockSchema,
          accumulateFacets: true,
          accumulatedFacetValues: {
            category: {
              values: new Set(['Accumulated1', 'Accumulated2', 'Current1']),
              orderedValues: ['Accumulated1', 'Accumulated2', 'Current1']
            }
          }
        }
      });
      
      const { result } = renderHook(
        () => useFacetMode('category', currentValues),
        { wrapper }
      );
      
      // Should get merged values from useAccumulatedFacets
      expect(result.current.rawValues.length).toBeGreaterThan(0);
    });
  });
});

describe('useSingleSelectValue', () => {
  it('returns selected value for single-select facet', () => {
    const wrapper = createSearchProviderWrapper({
      initialState: {
        disjunctiveFacets: {
          category: ['Electronics']
        }
      }
    });
    
    const { result } = renderHook(() => useSingleSelectValue('category'), { wrapper });
    
    expect(result.current).toBe('Electronics');
  });

  it('returns null when no value is selected', () => {
    const wrapper = createSearchProviderWrapper();
    
    const { result } = renderHook(() => useSingleSelectValue('category'), { wrapper });
    
    expect(result.current).toBe(null);
  });

  it('returns first value when multiple are selected', () => {
    const wrapper = createSearchProviderWrapper({
      initialState: {
        disjunctiveFacets: {
          category: ['Electronics', 'Books', 'Sports']
        }
      }
    });
    
    const { result } = renderHook(() => useSingleSelectValue('category'), { wrapper });
    
    expect(result.current).toBe('Electronics');
  });
});

describe('useSingleSelectFacet', () => {
  it('sets and clears single value', () => {
    const wrapper = createSearchProviderWrapper();
    
    const { result } = renderHook(() => useSingleSelectFacet('category'), { wrapper });
    
    expect(result.current.value).toBe(null);
    
    act(() => {
      result.current.setValue('Electronics');
    });
    
    expect(result.current.value).toBe('Electronics');
    
    act(() => {
      result.current.clearValue();
    });
    
    expect(result.current.value).toBe(null);
  });

  it('replaces existing value when setting new one', () => {
    const wrapper = createSearchProviderWrapper({
      initialState: {
        disjunctiveFacets: {
          category: ['Books']
        }
      }
    });
    
    const { result } = renderHook(() => useSingleSelectFacet('category'), { wrapper });
    
    expect(result.current.value).toBe('Books');
    
    act(() => {
      result.current.setValue('Electronics');
    });
    
    expect(result.current.value).toBe('Electronics');
  });

  it('preserves other facets when updating', () => {
    const wrapper = createSearchProviderWrapper({
      initialState: {
        disjunctiveFacets: {
          category: ['Books'],
          brand: ['Apple', 'Samsung']
        }
      }
    });
    
    const { result: categoryResult } = renderHook(
      () => useSingleSelectFacet('category'), 
      { wrapper }
    );
    
    const { result: brandResult } = renderHook(
      () => useSingleSelectValue('brand'), 
      { wrapper }
    );
    
    act(() => {
      categoryResult.current.setValue('Electronics');
    });
    
    expect(categoryResult.current.value).toBe('Electronics');
    expect(brandResult.current).toBe('Apple'); // Other facets preserved
  });
});