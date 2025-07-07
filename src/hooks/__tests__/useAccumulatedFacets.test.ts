import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccumulatedFacets } from '../useAccumulatedFacets';
import { createSearchProviderWrapper, createMockSearchResponse } from '../../test/testUtils';
import type { FacetCounts } from 'typesense/lib/Typesense/Documents';

describe('useAccumulatedFacets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty accumulated facets', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.accumulatedFacetValues).toEqual({});
    expect(result.current.mergedFacetResults).toEqual([]);
    expect(result.current.getMergedFacetValues('category')).toEqual([]);
  });

  it('returns current facet values when accumulation is disabled', () => {
    const facetCounts: FacetCounts[] = [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 10 },
          { value: 'Books', count: 5 }
        ]
      }
    ];

    const mockSearchResponse = createMockSearchResponse({
      facet_counts: facetCounts,
      found: 100
    });

    const wrapper = createSearchProviderWrapper({
      initialSearchResults: mockSearchResponse
    });

    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    // Should return current values when accumulation is disabled
    const values = result.current.getMergedFacetValues('category');
    expect(values).toHaveLength(2);
    expect(values[0]).toEqual({ value: 'Electronics', count: 10 });
    expect(values[1]).toEqual({ value: 'Books', count: 5 });
  });

  it('toggles facet accumulation', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.isAccumulatingFacets).toBe(false);

    act(() => {
      result.current.setAccumulateFacets(true);
    });

    expect(result.current.isAccumulatingFacets).toBe(true);
  });

  it('toggles move selected to top', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.isMoveSelectedToTop).toBe(false);

    act(() => {
      result.current.setMoveSelectedToTop(true);
    });

    expect(result.current.isMoveSelectedToTop).toBe(true);
  });

  it('toggles reorder by count', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.isReorderByCount).toBe(true);

    act(() => {
      result.current.setReorderByCount(false);
    });

    expect(result.current.isReorderByCount).toBe(false);
  });

  it('sets facet option limit', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.facetOptionLimit).toBe(0); // 0 means no limit

    act(() => {
      result.current.setFacetOptionLimit(10);
    });

    expect(result.current.facetOptionLimit).toBe(10);
  });

  it('clears accumulated facets for all fields', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    act(() => {
      result.current.clearAccumulatedFacets();
    });

    expect(result.current.accumulatedFacetValues).toEqual({});
  });

  it('clears accumulated facets for specific field', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    act(() => {
      result.current.clearAccumulatedFacets('category');
    });

    // This would clear only the category field if there were accumulated values
    expect(result.current.accumulatedFacetValues).toEqual({});
  });

  it('sorts facet values by count when reorderByCount is enabled', () => {
    const facetCounts: FacetCounts[] = [
      {
        field_name: 'category',
        counts: [
          { value: 'Books', count: 5 },
          { value: 'Electronics', count: 10 },
          { value: 'Clothing', count: 3 }
        ]
      }
    ];

    const mockSearchResponse = createMockSearchResponse({
      facet_counts: facetCounts,
      found: 100
    });

    const wrapper = createSearchProviderWrapper({
      initialSearchResults: mockSearchResponse
    });

    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    const values = result.current.getMergedFacetValues('category');
    expect(values).toHaveLength(3);
    expect(values[0].value).toBe('Electronics'); // Highest count
    expect(values[1].value).toBe('Books');
    expect(values[2].value).toBe('Clothing'); // Lowest count
  });

  it('moves selected values to top when enabled', () => {
    const facetCounts: FacetCounts[] = [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 10 },
          { value: 'Books', count: 5 },
          { value: 'Clothing', count: 8 }
        ]
      }
    ];

    const mockSearchResponse = createMockSearchResponse({
      facet_counts: facetCounts,
      found: 100
    });

    const wrapper = createSearchProviderWrapper({
      initialSearchResults: mockSearchResponse,
      defaultOptions: {
        moveSelectedToTop: true,
        reorderByCount: false
      }
    });

    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    // Pass active values to simulate selected items
    const values = result.current.getMergedFacetValues('category', ['Books', 'Clothing']);
    expect(values).toHaveLength(3);
    expect(values[0].value).toBe('Books'); // Selected, moved to top
    expect(values[1].value).toBe('Clothing'); // Selected, moved to top
    expect(values[2].value).toBe('Electronics'); // Not selected
  });

  it('returns merged facet results with hasAccumulatedValues flag', () => {
    const facetCounts: FacetCounts[] = [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 10 }
        ]
      }
    ];

    const mockSearchResponse = createMockSearchResponse({
      facet_counts: facetCounts,
      found: 100
    });

    const wrapper = createSearchProviderWrapper({
      initialSearchResults: mockSearchResponse
    });

    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    const mergedResults = result.current.mergedFacetResults;
    expect(mergedResults).toHaveLength(1);
    expect(mergedResults[0].field_name).toBe('category');
    expect(mergedResults[0].hasAccumulatedValues).toBe(false); // No accumulated values yet
  });

  it('toggles numeric ranges setting', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.isUseNumericRanges).toBe(false);

    act(() => {
      result.current.setUseNumericRanges(true);
    });

    expect(result.current.isUseNumericRanges).toBe(true);
  });

  it('toggles hide zero counts for single select', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.hideZeroCountsForSingleSelect).toBe(true);

    act(() => {
      result.current.setHideZeroCountsForSingleSelect(false);
    });

    expect(result.current.hideZeroCountsForSingleSelect).toBe(false);
  });

  it('toggles allow numeric range for single select', () => {
    const wrapper = createSearchProviderWrapper();
    const { result } = renderHook(() => useAccumulatedFacets(), { wrapper });
    
    expect(result.current.allowNumericRangeForSingleSelect).toBe(true);

    act(() => {
      result.current.setAllowNumericRangeForSingleSelect(false);
    });

    expect(result.current.allowNumericRangeForSingleSelect).toBe(false);
  });
});