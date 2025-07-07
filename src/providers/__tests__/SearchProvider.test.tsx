import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { SearchProvider, useSearchContext } from '../SearchProvider';
import { TypesenseSearchClient } from '../../core/TypesenseClient';
import type { SearchProviderProps, TypesenseSearchResponse, CollectionSchema } from '../../types';

vi.mock('../../core/TypesenseClient');

describe('SearchProvider', () => {
  let mockClient: TypesenseSearchClient;
  
  const mockSearchResponse: TypesenseSearchResponse = {
    found: 10,
    hits: [
      { document: { id: '1', name: 'Product 1' }, highlight: {} },
      { document: { id: '2', name: 'Product 2' }, highlight: {} }
    ],
    facet_counts: [
      {
        field_name: 'category',
        counts: [
          { value: 'Electronics', count: 5 },
          { value: 'Books', count: 3 }
        ]
      }
    ],
    out_of: 100,
    page: 1,
    search_time_ms: 5,
    request_params: {
      q: '*',
      query_by: 'name,description',
      page: 1,
      per_page: 20
    }
  };

  const defaultProps: SearchProviderProps = {
    config: {
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key'
    },
    collection: 'products',
    children: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      search: vi.fn().mockResolvedValue(mockSearchResponse),
      multiSearch: vi.fn().mockResolvedValue([mockSearchResponse]),
      getSchema: vi.fn(),
      clearCache: vi.fn(),
      getClient: vi.fn()
    } as unknown as TypesenseSearchClient;
    
    vi.mocked(TypesenseSearchClient).mockImplementation(() => mockClient);
  });

  describe('initialization', () => {
    it('creates client with config', () => {
      render(
        <SearchProvider {...defaultProps}>
          <div>Test</div>
        </SearchProvider>
      );

      expect(TypesenseSearchClient).toHaveBeenCalledWith(
        defaultProps.config,
        5 * 60 * 1000 // Default cache timeout
      );
    });

    it('uses cache timeout from config if provided', () => {
      const propsWithCacheTimeout = {
        ...defaultProps,
        config: {
          ...defaultProps.config,
          cacheSearchResultsForSeconds: 30
        }
      };

      render(
        <SearchProvider {...propsWithCacheTimeout}>
          <div>Test</div>
        </SearchProvider>
      );

      expect(TypesenseSearchClient).toHaveBeenCalledWith(
        propsWithCacheTimeout.config,
        30 * 1000
      );
    });

    it('initializes with custom initial state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider
            {...defaultProps}
            initialState={{
              query: 'initial search',
              page: 2,
              perPage: 50,
              sortBy: 'price:asc'
            }}
          >
            {children}
          </SearchProvider>
        )
      });

      expect(result.current.state.query).toBe('initial search');
      expect(result.current.state.page).toBe(2);
      expect(result.current.state.perPage).toBe(50);
      expect(result.current.state.sortBy).toBe('price:asc');
    });

    it('sets facets from props', () => {
      const facets = [
        { field: 'category', label: 'Category', type: 'checkbox' as const },
        { field: 'price', label: 'Price', type: 'numeric' as const }
      ];

      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps} facets={facets}>
            {children}
          </SearchProvider>
        )
      });

      expect(result.current.state.facets).toEqual(facets);
    });

    it('sets schema when provided in initial state', () => {
      const schema: CollectionSchema = {
        name: 'products',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'float' }
        ]
      };

      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider 
            {...defaultProps}
            initialState={{ schema }}
          >
            {children}
          </SearchProvider>
        )
      });

      expect(result.current.state.schema).toEqual(schema);
    });
  });

  describe('context value', () => {
    it('provides correct context values', () => {
      const initialSearchParams = { per_page: 10 };
      
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider
            {...defaultProps}
            searchOnMount={false}
            performanceMode={true}
            enableDisjunctiveFacetQueries={false}
            initialSearchParams={initialSearchParams}
          >
            {children}
          </SearchProvider>
        )
      });

      expect(result.current.client).toBe(mockClient);
      expect(result.current.collection).toBe('products');
      expect(result.current.config.searchOnMount).toBe(false);
      expect(result.current.config.performanceMode).toBe(true);
      expect(result.current.config.enableDisjunctiveFacetQueries).toBe(false);
      expect(result.current.initialSearchParams).toEqual(initialSearchParams);
    });
  });

  describe('state management with dispatch', () => {
    it('updates query state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ type: 'SET_QUERY', payload: 'test query' });
      });

      expect(result.current.state.query).toBe('test query');
      expect(result.current.state.page).toBe(1); // Page should reset
    });

    it('updates results state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ type: 'SET_RESULTS', payload: mockSearchResponse });
      });

      expect(result.current.state.results).toEqual(mockSearchResponse);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.searchPerformed).toBe(true);
    });

    it('manages loading state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: true });
      });

      expect(result.current.state.loading).toBe(true);

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: false });
      });

      expect(result.current.state.loading).toBe(false);
    });

    it('manages error state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      const error = new Error('Test error');

      act(() => {
        result.current.dispatch({ type: 'SET_ERROR', payload: error });
      });

      expect(result.current.state.error).toEqual(error);
      expect(result.current.state.loading).toBe(false);
    });

    it('manages facet filters', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      // Toggle disjunctive facet
      act(() => {
        result.current.dispatch({ 
          type: 'TOGGLE_DISJUNCTIVE_FACET', 
          payload: { field: 'category', value: 'Electronics' } 
        });
      });

      expect(result.current.state.disjunctiveFacets.category).toEqual(['Electronics']);

      // Toggle again to remove
      act(() => {
        result.current.dispatch({ 
          type: 'TOGGLE_DISJUNCTIVE_FACET', 
          payload: { field: 'category', value: 'Electronics' } 
        });
      });

      expect(result.current.state.disjunctiveFacets.category).toBeUndefined();

      // Set numeric filter
      act(() => {
        result.current.dispatch({ 
          type: 'SET_NUMERIC_FILTER', 
          payload: { field: 'price', min: 10, max: 100 } 
        });
      });

      expect(result.current.state.numericFilters.price).toEqual({ min: 10, max: 100 });

      // Set date filter
      act(() => {
        result.current.dispatch({ 
          type: 'SET_DATE_FILTER', 
          payload: { field: 'created_at', start: '2023-01-01', end: '2023-12-31' } 
        });
      });

      expect(result.current.state.dateFilters.created_at).toEqual({ 
        start: '2023-01-01', 
        end: '2023-12-31' 
      });
    });

    it('clears all filters', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      // Set various filters
      act(() => {
        result.current.dispatch({ 
          type: 'TOGGLE_DISJUNCTIVE_FACET', 
          payload: { field: 'category', value: 'Electronics' } 
        });
        result.current.dispatch({ 
          type: 'SET_NUMERIC_FILTER', 
          payload: { field: 'price', min: 10, max: 100 } 
        });
        result.current.dispatch({ 
          type: 'SET_SORT_BY', 
          payload: 'price:asc' 
        });
      });

      // Clear all filters
      act(() => {
        result.current.dispatch({ type: 'CLEAR_ALL_FILTERS' });
      });

      expect(result.current.state.disjunctiveFacets).toEqual({});
      expect(result.current.state.numericFilters).toEqual({});
      expect(result.current.state.sortBy).toBe('price:asc'); // sortBy is not cleared
    });

    it('resets search to initial state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider 
            {...defaultProps}
            facets={[{ field: 'category', label: 'Category', type: 'checkbox' as const }]}
          >
            {children}
          </SearchProvider>
        )
      });

      // Change state
      act(() => {
        result.current.dispatch({ type: 'SET_QUERY', payload: 'changed' });
        result.current.dispatch({ type: 'SET_PAGE', payload: 5 });
      });

      // Reset search
      act(() => {
        result.current.dispatch({ type: 'RESET_SEARCH' });
      });

      expect(result.current.state.query).toBe('');
      expect(result.current.state.page).toBe(1);
      // Facets should be preserved
      expect(result.current.state.facets).toHaveLength(1);
    });

    it('manages pagination', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ type: 'SET_PAGE', payload: 3 });
      });

      expect(result.current.state.page).toBe(3);

      act(() => {
        result.current.dispatch({ type: 'SET_PER_PAGE', payload: 50 });
      });

      expect(result.current.state.perPage).toBe(50);
      expect(result.current.state.page).toBe(1); // Page should reset when perPage changes
    });

    it('manages sorting', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      // Set single sort
      act(() => {
        result.current.dispatch({ type: 'SET_SORT_BY', payload: 'price:asc' });
      });

      expect(result.current.state.sortBy).toBe('price:asc');

      // Add multi-sort fields
      act(() => {
        result.current.dispatch({ 
          type: 'ADD_SORT_FIELD', 
          payload: { field: 'category', order: 'asc' } 
        });
        result.current.dispatch({ 
          type: 'ADD_SORT_FIELD', 
          payload: { field: 'price', order: 'desc' } 
        });
      });

      expect(result.current.state.multiSortBy).toEqual([
        { field: 'category', order: 'asc' },
        { field: 'price', order: 'desc' }
      ]);

      // Remove a sort field
      act(() => {
        result.current.dispatch({ 
          type: 'REMOVE_SORT_FIELD', 
          payload: 'category' 
        });
      });

      expect(result.current.state.multiSortBy).toEqual([
        { field: 'price', order: 'desc' }
      ]);

      // Clear multi-sort
      act(() => {
        result.current.dispatch({ type: 'CLEAR_MULTI_SORT' });
      });

      expect(result.current.state.multiSortBy).toBeUndefined();
    });

    it('manages additional filters', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ 
          type: 'SET_ADDITIONAL_FILTERS', 
          payload: 'brand:=Apple && inStock:=true' 
        });
      });

      expect(result.current.state.additionalFilters).toBe('brand:=Apple && inStock:=true');
    });

    it('batch updates state', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ 
          type: 'BATCH_UPDATE', 
          payload: {
            query: 'batch test',
            page: 2,
            perPage: 30,
            sortBy: 'name:asc'
          }
        });
      });

      expect(result.current.state.query).toBe('batch test');
      expect(result.current.state.page).toBe(1); // Page resets due to query change
      expect(result.current.state.perPage).toBe(30);
      expect(result.current.state.sortBy).toBe('name:asc');
    });
  });

  describe('facet accumulation', () => {
    it('accumulates facet values when enabled', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps} accumulateFacets={true}>
            {children}
          </SearchProvider>
        )
      });

      expect(result.current.state.accumulateFacets).toBe(true);

      // Update accumulated facets
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_ACCUMULATED_FACETS',
          payload: { field: 'category', values: ['Electronics', 'Books'] }
        });
      });

      expect(result.current.state.accumulatedFacetValues.category).toBeDefined();
      expect(result.current.state.accumulatedFacetValues.category.orderedValues).toEqual(['Electronics', 'Books']);

      // Add more values
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_ACCUMULATED_FACETS',
          payload: { field: 'category', values: ['Toys', 'Books'] } // Books already exists
        });
      });

      expect(result.current.state.accumulatedFacetValues.category.orderedValues).toEqual(['Electronics', 'Books', 'Toys']);

      // Clear specific field
      act(() => {
        result.current.dispatch({
          type: 'CLEAR_ACCUMULATED_FACETS',
          payload: 'category'
        });
      });

      expect(result.current.state.accumulatedFacetValues.category).toBeUndefined();
    });

    it('tracks numeric bounds for numeric facets', () => {
      const schema: CollectionSchema = {
        name: 'products',
        fields: [
          { name: 'price', type: 'float' }
        ]
      };

      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider 
            {...defaultProps} 
            accumulateFacets={true}
            initialState={{ schema }}
          >
            {children}
          </SearchProvider>
        )
      });

      // Update accumulated facets with numeric values
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_ACCUMULATED_FACETS',
          payload: { field: 'price', values: ['10.5', '25.99', '5.00'] }
        });
      });

      expect(result.current.state.accumulatedFacetValues.price.numericBounds).toEqual({
        min: 5.00,
        max: 25.99
      });
    });
  });

  describe('callbacks', () => {
    it('calls onStateChange when state changes', () => {
      const onStateChange = vi.fn();
      
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps} onStateChange={onStateChange}>
            {children}
          </SearchProvider>
        )
      });

      act(() => {
        result.current.dispatch({ type: 'SET_QUERY', payload: 'test' });
      });

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test' })
      );
    });
  });

  describe('error handling', () => {
    it('throws error when useSearchContext used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useSearchContext());
      }).toThrow('useSearchContext must be used within a SearchProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('numeric facet ranges', () => {
    it('manages numeric facet range modes', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      // Set numeric facet mode
      act(() => {
        result.current.dispatch({
          type: 'SET_NUMERIC_FACET_MODE',
          payload: { field: 'price', mode: 'range' }
        });
      });

      expect(result.current.state.numericFacetRanges.price).toBeDefined();
      expect(result.current.state.numericFacetRanges.price.mode).toBe('range');

      // Update numeric facet bounds
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_NUMERIC_FACET_BOUNDS',
          payload: { field: 'price', min: 0, max: 100 }
        });
      });

      expect(result.current.state.numericFacetRanges.price.bounds).toEqual({ min: 0, max: 100 });

      // Set numeric facet range
      act(() => {
        result.current.dispatch({
          type: 'SET_NUMERIC_FACET_RANGE',
          payload: { field: 'price', min: 10, max: 50 }
        });
      });

      expect(result.current.state.numericFacetRanges.price.currentRange).toEqual({ min: 10, max: 50 });

      // Clear numeric facet range
      act(() => {
        result.current.dispatch({
          type: 'CLEAR_NUMERIC_FACET_RANGE',
          payload: 'price'
        });
      });

      expect(result.current.state.numericFacetRanges.price.currentRange).toBeUndefined();
    });
  });

  describe('configuration flags', () => {
    it('manages facet configuration flags', () => {
      const { result } = renderHook(() => useSearchContext(), {
        wrapper: ({ children }) => (
          <SearchProvider {...defaultProps}>
            {children}
          </SearchProvider>
        )
      });

      // Set move selected to top
      act(() => {
        result.current.dispatch({
          type: 'SET_MOVE_SELECTED_TO_TOP',
          payload: true
        });
      });

      expect(result.current.state.moveSelectedToTop).toBe(true);

      // Set reorder by count
      act(() => {
        result.current.dispatch({
          type: 'SET_REORDER_BY_COUNT',
          payload: false
        });
      });

      expect(result.current.state.reorderByCount).toBe(false);

      // Set use numeric ranges
      act(() => {
        result.current.dispatch({
          type: 'SET_USE_NUMERIC_RANGES',
          payload: true
        });
      });

      expect(result.current.state.useNumericRanges).toBe(true);

      // Set facet option limit
      act(() => {
        result.current.dispatch({
          type: 'SET_FACET_OPTION_LIMIT',
          payload: 100
        });
      });

      expect(result.current.state.facetOptionLimit).toBe(100);

      // Set hide zero counts for single select
      act(() => {
        result.current.dispatch({
          type: 'SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT',
          payload: false
        });
      });

      expect(result.current.state.hideZeroCountsForSingleSelect).toBe(false);

      // Set allow numeric range for single select
      act(() => {
        result.current.dispatch({
          type: 'SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT',
          payload: false
        });
      });

      expect(result.current.state.allowNumericRangeForSingleSelect).toBe(false);
    });
  });
});