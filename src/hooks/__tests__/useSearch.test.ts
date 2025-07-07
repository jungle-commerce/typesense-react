/**
 * @fileoverview Tests for useSearch hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { createSearchProviderWrapper, MockTypesenseClient, createMockSearchResponse } from '../../test/testUtils';
import type { SearchProviderProps } from '../../types';

// Mock the TypesenseClient module
vi.mock('../../core/TypesenseClient', () => ({
  TypesenseSearchClient: vi.fn().mockImplementation(() => mockClient),
}));

// Create a mock client instance
const mockClient = new MockTypesenseClient();

describe('useSearch', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Set up default mock responses
    mockClient.search.mockResolvedValue(createMockSearchResponse());
    mockClient.multiSearch.mockResolvedValue([createMockSearchResponse()]);
    mockClient.retrieveSchema.mockResolvedValue({
      name: 'products',
      fields: [
        { name: 'name', type: 'string', facet: false },
        { name: 'category', type: 'string', facet: true },
        { name: 'price', type: 'float', facet: true },
      ],
    });
  });

  it('returns search state and actions', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper(),
    });

    await waitFor(() => {
      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  it('performs search when query is set', async () => {
    const { result } = renderHook(() => useSearch({ debounceMs: 0, searchOnMount: true }), {
      wrapper: createSearchProviderWrapper(),
    });

    // Wait for initial search to complete
    await waitFor(() => {
      expect(result.current.state.searchPerformed).toBe(true);
    });

    // Clear any initial calls
    mockClient.search.mockClear();

    await act(async () => {
      result.current.actions.setQuery('test query');
    });

    // Wait for the search to be triggered
    await waitFor(() => {
      expect(result.current.state.query).toBe('test query');
      expect(mockClient.search).toHaveBeenCalled();
    });
  });

  it('updates pagination', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper(),
    });

    await act(async () => {
      result.current.actions.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.state.page).toBe(2);
    });

    await act(async () => {
      result.current.actions.setPerPage(50);
    });

    await waitFor(() => {
      expect(result.current.state.perPage).toBe(50);
    });
  });

  it('updates sorting', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper(),
    });

    await act(async () => {
      result.current.actions.setSortBy('price:desc');
    });

    await waitFor(() => {
      expect(result.current.state.sortBy).toBe('price:desc');
    });
  });

  it('manages additional filters', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper(),
    });

    await act(async () => {
      result.current.actions.setAdditionalFilters('in_stock:true && featured:true');
    });

    await waitFor(() => {
      expect(result.current.state.additionalFilters).toBe('in_stock:true && featured:true');
    });
  });

  it('manages multi-sort', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper(),
    });

    const sorts = [
      { field: 'price', order: 'desc' as const },
      { field: 'name', order: 'asc' as const },
    ];

    await act(async () => {
      result.current.actions.setMultiSortBy(sorts);
    });

    await waitFor(() => {
      expect(result.current.state.multiSortBy).toEqual(sorts);
    });

    await act(async () => {
      result.current.actions.addSortField('rating', 'desc');
    });

    await waitFor(() => {
      expect(result.current.state.multiSortBy).toHaveLength(3);
    });

    await act(async () => {
      result.current.actions.removeSortField('price');
    });

    await waitFor(() => {
      expect(result.current.state.multiSortBy).toHaveLength(2);
    });

    await act(async () => {
      result.current.actions.clearMultiSort();
    });

    await waitFor(() => {
      expect(result.current.state.multiSortBy).toBeUndefined();
    });
  });

  it('clears all filters', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          query: 'test',
          disjunctiveFacets: { category: ['Electronics'] },
          numericFilters: { price: { min: 10, max: 100 } },
          additionalFilters: 'in_stock:true',
        },
      }),
    });

    await act(async () => {
      result.current.actions.clearAllFilters();
    });

    await waitFor(() => {
      expect(result.current.state.disjunctiveFacets).toEqual({});
      expect(result.current.state.numericFilters).toEqual({});
      // additionalFilters is not cleared by clearAllFilters - it needs to be cleared separately
      expect(result.current.state.additionalFilters).toBe('in_stock:true');
    });
  });

  it('resets search state', async () => {
    const { result } = renderHook(() => useSearch({ searchOnMount: false }), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          query: 'test',
          page: 5,
          sortBy: 'price:desc',
        },
      }),
    });

    await act(async () => {
      result.current.actions.reset();
    });

    await waitFor(() => {
      expect(result.current.state.query).toBe('');
      expect(result.current.state.page).toBe(1);
      expect(result.current.state.sortBy).toBe('');
    });
  });

  it('respects debounce delay', async () => {
    const { result } = renderHook(() => useSearch({ debounceMs: 100, searchOnMount: false }), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          searchPerformed: true, // Mark as already performed to trigger search on query change
        },
      }),
    });

    // Clear previous calls from initialization
    mockClient.search.mockClear();
    
    await act(async () => {
      result.current.actions.setQuery('t');
    });

    // Wait less than debounce time
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockClient.search).not.toHaveBeenCalled();

    await act(async () => {
      result.current.actions.setQuery('te');
    });

    // Wait less than debounce time again
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockClient.search).not.toHaveBeenCalled();

    // Wait for debounce to complete
    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    }, { timeout: 200 });
  });

  it('calls onSearchSuccess callback', async () => {
    const onSearchSuccess = vi.fn();
    const mockSearchResult = createMockSearchResponse({
      found: 10,
      hits: [{ document: { id: '1', name: 'Test' } }],
    });
    
    mockClient.search.mockResolvedValue(mockSearchResult);
    
    const { result } = renderHook(
      () => useSearch({ debounceMs: 0, onSearchSuccess, searchOnMount: true }),
      {
        wrapper: createSearchProviderWrapper(),
      }
    );

    // Wait for initial search to complete
    await waitFor(() => {
      expect(onSearchSuccess).toHaveBeenCalledWith(mockSearchResult);
    });

    expect(result.current.actions.search).toBeDefined();
  });

  it('calls onSearchError callback', async () => {
    const onSearchError = vi.fn();
    const error = new Error('Search failed');
    
    mockClient.search.mockRejectedValue(error);
    
    const { result } = renderHook(
      () => useSearch({ debounceMs: 0, onSearchError, searchOnMount: true }),
      {
        wrapper: createSearchProviderWrapper(),
      }
    );

    // Wait for initial search to fail
    await waitFor(() => {
      expect(onSearchError).toHaveBeenCalledWith(error);
    });

    expect(result.current.actions.search).toBeDefined();
    expect(result.current.error).toEqual(error);
  });

  it('performs search on mount when configured', async () => {
    const { result } = renderHook(
      () => useSearch({ searchOnMount: true, debounceMs: 0 }),
      {
        wrapper: createSearchProviderWrapper(),
      }
    );

    // Should perform search immediately on mount
    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalled();
      expect(result.current.state.searchPerformed).toBe(true);
    });
  });

  it('does not perform search on mount when disabled', async () => {
    mockClient.search.mockClear();
    
    const { result } = renderHook(
      () => useSearch({ searchOnMount: false }),
      {
        wrapper: createSearchProviderWrapper(),
      }
    );

    // Wait a bit to ensure no search is triggered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockClient.search).not.toHaveBeenCalled();
    expect(result.current.state.searchPerformed).toBe(false);
  });

  it('handles direct search calls', async () => {
    const { result } = renderHook(
      () => useSearch({ searchOnMount: false }),
      {
        wrapper: createSearchProviderWrapper(),
      }
    );

    const mockResult = createMockSearchResponse({ found: 5 });
    mockClient.search.mockResolvedValue(mockResult);

    await act(async () => {
      await result.current.actions.search('custom query');
    });

    await waitFor(() => {
      expect(result.current.state.query).toBe('custom query');
      expect(mockClient.search).toHaveBeenCalled();
      expect(result.current.state.results).toEqual(mockResult);
    });
  });
});