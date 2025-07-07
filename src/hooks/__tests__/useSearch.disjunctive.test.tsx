/**
 * @fileoverview Test case to reproduce the disjunctive facet count issue
 * when additionalFilters are changed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { useAdvancedFacets } from '../useAdvancedFacets';
import { useDateFilter } from '../useDateFilter';
import { createSearchProviderWrapper, MockTypesenseClient } from '../../test/testUtils';

// Mock the TypesenseClient module
vi.mock('../../core/TypesenseClient', () => ({
  TypesenseSearchClient: vi.fn().mockImplementation(() => mockClient),
}));

// Create a mock client instance
const mockClient = new MockTypesenseClient();

describe('Disjunctive Facets with Additional Filters', () => {
  const facetConfig = [
    {
      field: 'category',
      label: 'Category',
      type: 'checkbox' as const,
      disjunctive: true,
    },
    {
      field: 'brand',
      label: 'Brand',
      type: 'checkbox' as const,
      disjunctive: true,
    },
  ];

  const mockSearchResponse = {
    hits: [
      { document: { id: '1', name: 'Product 1', category: 'Electronics', brand: 'Apple' } },
      { document: { id: '2', name: 'Product 2', category: 'Books', brand: 'Samsung' } },
    ],
    found: 2,
    facet_counts: [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 10 },
          { value: 'Books', count: 5 },
        ],
      },
      {
        field_name: 'brand',
        counts: [
          { value: 'Apple', count: 8 },
          { value: 'Samsung', count: 7 },
        ],
      },
    ],
  };

  const mockDisjunctiveResponse = {
    ...mockSearchResponse,
    facet_counts: [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 15 }, // Higher count without filter
          { value: 'Books', count: 10 },
        ],
      },
    ],
  };

  const mockDisjunctiveResponseWithDateFilter = {
    ...mockSearchResponse,
    facet_counts: [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 12 }, // Count with date filter but without category filter
          { value: 'Books', count: 8 },
        ],
      },
    ],
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Set up default mock responses
    mockClient.search.mockResolvedValue(mockSearchResponse);
    mockClient.multiSearch.mockResolvedValue([mockSearchResponse, mockDisjunctiveResponse]);
    mockClient.retrieveSchema.mockResolvedValue({
      name: 'products',
      fields: [
        { name: 'name', type: 'string', facet: false },
        { name: 'category', type: 'string', facet: true },
        { name: 'brand', type: 'string', facet: true },
        { name: 'created_at', type: 'int64', facet: false },
      ],
    });
  });

  it('should update disjunctive facet counts when additionalFilters change', async () => {
    const wrapper = createSearchProviderWrapper({
      facets: facetConfig,
      searchOnMount: true,
      enableDisjunctiveFacetQueries: true,
    });

    const { result } = renderHook(
      () => ({
        search: useSearch(),
        facets: useAdvancedFacets(),
      }),
      { wrapper }
    );

    // Wait for initial search
    await waitFor(() => {
      expect(result.current.search.state.loading).toBe(false);
    });

    // Select a disjunctive facet value
    act(() => {
      result.current.facets.actions.toggleFacetValue('category', 'Electronics');
    });

    // Wait for the search with disjunctive queries
    await waitFor(() => {
      expect(mockClient.multiSearch).toHaveBeenCalled();
    });

    const initialMultiSearchCalls = mockClient.multiSearch.mock.calls.length;
    console.log('Initial multiSearch calls:', initialMultiSearchCalls);
    console.log('Initial multiSearch queries:', mockClient.multiSearch.mock.calls);

    // Now add an additional filter (e.g., date filter)
    act(() => {
      result.current.search.actions.setAdditionalFilters('created_at:>1234567890');
    });

    // Wait for the search to complete
    await waitFor(() => {
      expect(result.current.search.state.loading).toBe(false);
    });

    // Check if multiSearch was called again with the additional filter
    await waitFor(() => {
      const newMultiSearchCalls = mockClient.multiSearch.mock.calls.length;
      console.log('New multiSearch calls:', newMultiSearchCalls);
      console.log('All multiSearch queries:', mockClient.multiSearch.mock.calls);
      
      // Should have made another multiSearch call
      expect(newMultiSearchCalls).toBeGreaterThan(initialMultiSearchCalls);
      
      // Check the last call includes the additional filter in all queries
      const lastCall = mockClient.multiSearch.mock.calls[mockClient.multiSearch.mock.calls.length - 1];
      const queries = lastCall[1]; // Second argument is the array of queries
      
      // All queries should include the additional filter
      queries.forEach((query: any, index: number) => {
        console.log(`Query ${index}:`, JSON.stringify(query, null, 2));
        if (query.filter_by) {
          expect(query.filter_by).toContain('created_at:>1234567890');
        } else {
          // This is the bug - the disjunctive query should still have the additional filter
          expect(query.filter_by).toBeDefined();
        }
      });
    });
  });

  it('should update disjunctive facet counts when using date filters', async () => {
    const wrapper = createSearchProviderWrapper({
      facets: facetConfig,
      searchOnMount: true,
      enableDisjunctiveFacetQueries: true,
    });

    const { result } = renderHook(
      () => ({
        search: useSearch(),
        facets: useAdvancedFacets(),
        dateFilter: useDateFilter(),
      }),
      { wrapper }
    );

    // Wait for initial search
    await waitFor(() => {
      expect(result.current.search.state.loading).toBe(false);
    });

    // Select a disjunctive facet value
    act(() => {
      result.current.facets.actions.toggleFacetValue('category', 'Electronics');
    });

    // Wait for the search with disjunctive queries
    await waitFor(() => {
      expect(mockClient.multiSearch).toHaveBeenCalled();
    });

    const initialMultiSearchCalls = mockClient.multiSearch.mock.calls.length;

    // Now add a date filter
    act(() => {
      result.current.dateFilter.setLastNDays('created_at', 30);
    });

    // Wait for the search to complete
    await waitFor(() => {
      expect(result.current.search.state.loading).toBe(false);
    });

    // Check if multiSearch was called again with the date filter
    await waitFor(() => {
      const newMultiSearchCalls = mockClient.multiSearch.mock.calls.length;
      expect(newMultiSearchCalls).toBeGreaterThan(initialMultiSearchCalls);
      
      // Check the last call includes the date filter in all queries
      const lastCall = mockClient.multiSearch.mock.calls[mockClient.multiSearch.mock.calls.length - 1];
      const queries = lastCall[1];
      
      // All queries should include the date filter
      queries.forEach((query: any) => {
        if (query.filter_by) {
          expect(query.filter_by).toMatch(/created_at:[\[\]><=0-9.]+/);
        }
      });
    });
  });

  it('should NOT make disjunctive queries when no disjunctive facets are selected', async () => {
    const wrapper = createSearchProviderWrapper({
      facets: facetConfig,
      searchOnMount: true,
      enableDisjunctiveFacetQueries: true,
    });

    const { result } = renderHook(() => useSearch(), { wrapper });

    // Wait for initial search
    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    // Should use regular search, not multiSearch
    expect(mockClient.search).toHaveBeenCalled();
    expect(mockClient.multiSearch).not.toHaveBeenCalled();

    // Add additional filter without any disjunctive facets selected
    act(() => {
      result.current.actions.setAdditionalFilters('created_at:>1234567890');
    });

    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    // Should still use regular search, not multiSearch
    expect(mockClient.multiSearch).not.toHaveBeenCalled();
  });
});