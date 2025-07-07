/**
 * @fileoverview Comprehensive tests for searchReducer
 * Tests all action types, state transitions, edge cases, and error states
 */

import { searchReducer, initialSearchState, createInitialState } from '../searchReducer';
import type { SearchState, SearchAction } from '../../types';

describe('searchReducer', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(initialSearchState).toEqual({
        query: '',
        results: null,
        loading: false,
        error: null,
        facets: [],
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
        customFilters: {},
        page: 1,
        perPage: 20,
        sortBy: '',
        multiSortBy: undefined,
        additionalFilters: undefined,
        schema: null,
        searchPerformed: false,
        lastSearchAt: undefined,
        accumulatedFacetValues: {},
        accumulateFacets: false,
        moveSelectedToTop: false,
        reorderByCount: true,
        useNumericRanges: false,
        numericFacetRanges: {},
        facetOptionLimit: 0,
        hideZeroCountsForSingleSelect: true,
        allowNumericRangeForSingleSelect: true,
      });
    });

    it('should create initial state with overrides', () => {
      const overrides = {
        query: 'test query',
        page: 2,
        perPage: 50,
        multiSortBy: [{ field: 'name', order: 'asc' as const }],
      };
      const state = createInitialState(overrides);
      expect(state.query).toBe('test query');
      expect(state.page).toBe(2);
      expect(state.perPage).toBe(50);
      expect(state.multiSortBy).toEqual([{ field: 'name', order: 'asc' }]);
      expect(state.loading).toBe(false); // Default value preserved
    });

    it('should handle undefined multiSortBy in overrides', () => {
      const state = createInitialState({ multiSortBy: undefined });
      expect(state.multiSortBy).toBeUndefined();
    });
  });

  describe('SET_QUERY', () => {
    it('should set query and reset page to 1', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = { type: 'SET_QUERY', payload: 'new query' };
      const newState = searchReducer(state, action);
      
      expect(newState.query).toBe('new query');
      expect(newState.page).toBe(1);
    });

    it('should handle empty query', () => {
      const state = { ...initialSearchState, query: 'old query' };
      const action: SearchAction = { type: 'SET_QUERY', payload: '' };
      const newState = searchReducer(state, action);
      
      expect(newState.query).toBe('');
      expect(newState.page).toBe(1);
    });
  });

  describe('SET_RESULTS', () => {
    it('should set results and update related fields', () => {
      const mockResults = {
        hits: [{ id: '1', name: 'Test' }],
        found: 1,
        facet_counts: [],
      };
      const state = { ...initialSearchState, loading: true, error: 'Previous error' };
      const action: SearchAction = { type: 'SET_RESULTS', payload: mockResults as any };
      const newState = searchReducer(state, action);
      
      expect(newState.results).toEqual(mockResults);
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
      expect(newState.searchPerformed).toBe(true);
      expect(newState.lastSearchAt).toBeDefined();
      expect(typeof newState.lastSearchAt).toBe('number');
    });

    it('should handle null results', () => {
      const state = { ...initialSearchState, results: { hits: [], found: 0 } as any };
      const action: SearchAction = { type: 'SET_RESULTS', payload: null };
      const newState = searchReducer(state, action);
      
      expect(newState.results).toBeNull();
      expect(newState.loading).toBe(false);
      expect(newState.searchPerformed).toBe(true);
    });
  });

  describe('SET_LOADING', () => {
    it('should set loading to true and clear error', () => {
      const state = { ...initialSearchState, error: 'Previous error' };
      const action: SearchAction = { type: 'SET_LOADING', payload: true };
      const newState = searchReducer(state, action);
      
      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it('should set loading to false and preserve error', () => {
      const state = { ...initialSearchState, error: 'Existing error', loading: true };
      const action: SearchAction = { type: 'SET_LOADING', payload: false };
      const newState = searchReducer(state, action);
      
      expect(newState.loading).toBe(false);
      expect(newState.error).toBe('Existing error');
    });
  });

  describe('SET_ERROR', () => {
    it('should set error and set loading to false', () => {
      const state = { ...initialSearchState, loading: true };
      const action: SearchAction = { type: 'SET_ERROR', payload: 'Search failed' };
      const newState = searchReducer(state, action);
      
      expect(newState.error).toBe('Search failed');
      expect(newState.loading).toBe(false);
    });

    it('should handle null error', () => {
      const state = { ...initialSearchState, error: 'Previous error' };
      const action: SearchAction = { type: 'SET_ERROR', payload: null };
      const newState = searchReducer(state, action);
      
      expect(newState.error).toBeNull();
      expect(newState.loading).toBe(false);
    });
  });

  describe('SET_FACETS', () => {
    it('should set facets array', () => {
      const facets = ['category', 'brand', 'price'];
      const action: SearchAction = { type: 'SET_FACETS', payload: facets };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.facets).toEqual(facets);
    });

    it('should handle empty facets array', () => {
      const state = { ...initialSearchState, facets: ['old', 'facets'] };
      const action: SearchAction = { type: 'SET_FACETS', payload: [] };
      const newState = searchReducer(state, action);
      
      expect(newState.facets).toEqual([]);
    });
  });

  describe('SET_DISJUNCTIVE_FACETS', () => {
    it('should set disjunctive facets and reset page', () => {
      const disjunctiveFacets = { category: ['electronics', 'books'], brand: ['apple'] };
      const state = { ...initialSearchState, page: 3 };
      const action: SearchAction = { type: 'SET_DISJUNCTIVE_FACETS', payload: disjunctiveFacets };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual(disjunctiveFacets);
      expect(newState.page).toBe(1);
    });

    it('should handle empty disjunctive facets', () => {
      const state = { ...initialSearchState, disjunctiveFacets: { old: ['value'] } };
      const action: SearchAction = { type: 'SET_DISJUNCTIVE_FACETS', payload: {} };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({});
      expect(newState.page).toBe(1);
    });
  });

  describe('TOGGLE_DISJUNCTIVE_FACET', () => {
    it('should add value to new field', () => {
      const action: SearchAction = {
        type: 'TOGGLE_DISJUNCTIVE_FACET',
        payload: { field: 'category', value: 'electronics' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.disjunctiveFacets).toEqual({ category: ['electronics'] });
      expect(newState.page).toBe(1);
    });

    it('should add value to existing field', () => {
      const state = {
        ...initialSearchState,
        disjunctiveFacets: { category: ['books'] },
      };
      const action: SearchAction = {
        type: 'TOGGLE_DISJUNCTIVE_FACET',
        payload: { field: 'category', value: 'electronics' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({ category: ['books', 'electronics'] });
    });

    it('should remove existing value', () => {
      const state = {
        ...initialSearchState,
        disjunctiveFacets: { category: ['books', 'electronics'] },
      };
      const action: SearchAction = {
        type: 'TOGGLE_DISJUNCTIVE_FACET',
        payload: { field: 'category', value: 'books' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({ category: ['electronics'] });
    });

    it('should remove field when last value is removed', () => {
      const state = {
        ...initialSearchState,
        disjunctiveFacets: { category: ['books'], brand: ['apple'] },
      };
      const action: SearchAction = {
        type: 'TOGGLE_DISJUNCTIVE_FACET',
        payload: { field: 'category', value: 'books' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({ brand: ['apple'] });
    });
  });

  describe('SET_NUMERIC_FILTER', () => {
    it('should set numeric filter with min and max', () => {
      const action: SearchAction = {
        type: 'SET_NUMERIC_FILTER',
        payload: { field: 'price', min: 10, max: 100 },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.numericFilters).toEqual({ price: { min: 10, max: 100 } });
      expect(newState.page).toBe(1);
    });

    it('should set numeric filter with only min', () => {
      const action: SearchAction = {
        type: 'SET_NUMERIC_FILTER',
        payload: { field: 'price', min: 10, max: undefined },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.numericFilters).toEqual({ price: { min: 10, max: undefined } });
    });

    it('should set numeric filter with only max', () => {
      const action: SearchAction = {
        type: 'SET_NUMERIC_FILTER',
        payload: { field: 'price', min: undefined, max: 100 },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.numericFilters).toEqual({ price: { min: undefined, max: 100 } });
    });

    it('should remove filter when both min and max are undefined', () => {
      const state = {
        ...initialSearchState,
        numericFilters: { price: { min: 10, max: 100 }, rating: { min: 3, max: 5 } },
      };
      const action: SearchAction = {
        type: 'SET_NUMERIC_FILTER',
        payload: { field: 'price', min: undefined, max: undefined },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFilters).toEqual({ rating: { min: 3, max: 5 } });
    });
  });

  describe('SET_DATE_FILTER', () => {
    it('should set date filter with start and end', () => {
      const action: SearchAction = {
        type: 'SET_DATE_FILTER',
        payload: { field: 'created_at', start: '2023-01-01', end: '2023-12-31' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.dateFilters).toEqual({
        created_at: { start: '2023-01-01', end: '2023-12-31' },
      });
      expect(newState.page).toBe(1);
    });

    it('should set date filter with only start', () => {
      const action: SearchAction = {
        type: 'SET_DATE_FILTER',
        payload: { field: 'created_at', start: '2023-01-01', end: null },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.dateFilters).toEqual({
        created_at: { start: '2023-01-01', end: null },
      });
    });

    it('should remove filter when both start and end are falsy', () => {
      const state = {
        ...initialSearchState,
        dateFilters: {
          created_at: { start: '2023-01-01', end: '2023-12-31' },
          updated_at: { start: '2023-06-01', end: '2023-06-30' },
        },
      };
      const action: SearchAction = {
        type: 'SET_DATE_FILTER',
        payload: { field: 'created_at', start: '', end: null },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.dateFilters).toEqual({
        updated_at: { start: '2023-06-01', end: '2023-06-30' },
      });
    });
  });

  describe('SET_SELECTIVE_FILTER', () => {
    it('should set selective filter', () => {
      const action: SearchAction = {
        type: 'SET_SELECTIVE_FILTER',
        payload: { field: 'status', value: 'active' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.selectiveFilters).toEqual({ status: 'active' });
      expect(newState.page).toBe(1);
    });

    it('should update existing selective filter', () => {
      const state = {
        ...initialSearchState,
        selectiveFilters: { status: 'pending', priority: 'high' },
      };
      const action: SearchAction = {
        type: 'SET_SELECTIVE_FILTER',
        payload: { field: 'status', value: 'active' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.selectiveFilters).toEqual({ status: 'active', priority: 'high' });
    });

    it('should remove filter when value is empty', () => {
      const state = {
        ...initialSearchState,
        selectiveFilters: { status: 'active', priority: 'high' },
      };
      const action: SearchAction = {
        type: 'SET_SELECTIVE_FILTER',
        payload: { field: 'status', value: '' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.selectiveFilters).toEqual({ priority: 'high' });
    });
  });

  describe('SET_CUSTOM_FILTER', () => {
    it('should set custom filter with values', () => {
      const action: SearchAction = {
        type: 'SET_CUSTOM_FILTER',
        payload: { field: 'tags', values: ['tag1', 'tag2', 'tag3'] },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.customFilters).toEqual({ tags: ['tag1', 'tag2', 'tag3'] });
      expect(newState.page).toBe(1);
    });

    it('should update existing custom filter', () => {
      const state = {
        ...initialSearchState,
        customFilters: { tags: ['old1', 'old2'], labels: ['label1'] },
      };
      const action: SearchAction = {
        type: 'SET_CUSTOM_FILTER',
        payload: { field: 'tags', values: ['new1', 'new2'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.customFilters).toEqual({
        tags: ['new1', 'new2'],
        labels: ['label1'],
      });
    });

    it('should remove filter when values is empty', () => {
      const state = {
        ...initialSearchState,
        customFilters: { tags: ['tag1', 'tag2'], labels: ['label1'] },
      };
      const action: SearchAction = {
        type: 'SET_CUSTOM_FILTER',
        payload: { field: 'tags', values: [] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.customFilters).toEqual({ labels: ['label1'] });
    });

    it('should remove filter when values is null', () => {
      const state = {
        ...initialSearchState,
        customFilters: { tags: ['tag1'], labels: ['label1'] },
      };
      const action: SearchAction = {
        type: 'SET_CUSTOM_FILTER',
        payload: { field: 'tags', values: null as any },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.customFilters).toEqual({ labels: ['label1'] });
    });
  });

  describe('CLEAR_FILTER', () => {
    it('should clear disjunctive filter', () => {
      const state = {
        ...initialSearchState,
        disjunctiveFacets: { category: ['books'], brand: ['apple'] },
        page: 5,
      };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'category', filterType: 'disjunctive' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({ brand: ['apple'] });
      expect(newState.page).toBe(1);
    });

    it('should clear numeric filter', () => {
      const state = {
        ...initialSearchState,
        numericFilters: { price: { min: 10, max: 100 }, rating: { min: 3, max: 5 } },
      };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'price', filterType: 'numeric' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFilters).toEqual({ rating: { min: 3, max: 5 } });
    });

    it('should clear date filter', () => {
      const state = {
        ...initialSearchState,
        dateFilters: {
          created_at: { start: '2023-01-01', end: '2023-12-31' },
          updated_at: { start: '2023-06-01', end: '2023-06-30' },
        },
      };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'created_at', filterType: 'date' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.dateFilters).toEqual({
        updated_at: { start: '2023-06-01', end: '2023-06-30' },
      });
    });

    it('should clear selective filter', () => {
      const state = {
        ...initialSearchState,
        selectiveFilters: { status: 'active', priority: 'high' },
      };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'status', filterType: 'selective' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.selectiveFilters).toEqual({ priority: 'high' });
    });

    it('should clear custom filter', () => {
      const state = {
        ...initialSearchState,
        customFilters: { tags: ['tag1', 'tag2'], labels: ['label1'] },
      };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'tags', filterType: 'custom' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.customFilters).toEqual({ labels: ['label1'] });
    });

    it('should return unchanged state for unknown filter type', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'test', filterType: 'unknown' as any },
      };
      const newState = searchReducer(state, action);
      
      expect(newState).toEqual(state);
    });

    it('should handle clearing non-existent filter', () => {
      const state = {
        ...initialSearchState,
        disjunctiveFacets: { brand: ['apple'] },
      };
      const action: SearchAction = {
        type: 'CLEAR_FILTER',
        payload: { field: 'nonexistent', filterType: 'disjunctive' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({ brand: ['apple'] });
    });
  });

  describe('CLEAR_ALL_FILTERS', () => {
    it('should clear all filters and reset page', () => {
      const state: SearchState = {
        ...initialSearchState,
        disjunctiveFacets: { category: ['books'] },
        numericFilters: { price: { min: 10, max: 100 } },
        dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
        selectiveFilters: { status: 'active' },
        customFilters: { tags: ['tag1'] },
        page: 5,
      };
      const action: SearchAction = { type: 'CLEAR_ALL_FILTERS' };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({});
      expect(newState.numericFilters).toEqual({});
      expect(newState.dateFilters).toEqual({});
      expect(newState.selectiveFilters).toEqual({});
      expect(newState.customFilters).toEqual({});
      expect(newState.page).toBe(1);
    });
  });

  describe('SET_PAGE', () => {
    it('should set page number', () => {
      const action: SearchAction = { type: 'SET_PAGE', payload: 5 };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.page).toBe(5);
    });

    it('should handle page 1', () => {
      const state = { ...initialSearchState, page: 10 };
      const action: SearchAction = { type: 'SET_PAGE', payload: 1 };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(1);
    });
  });

  describe('SET_PER_PAGE', () => {
    it('should set per page and reset page to 1', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = { type: 'SET_PER_PAGE', payload: 50 };
      const newState = searchReducer(state, action);
      
      expect(newState.perPage).toBe(50);
      expect(newState.page).toBe(1);
    });
  });

  describe('SET_SORT_BY', () => {
    it('should set sort by and reset page', () => {
      const state = { ...initialSearchState, page: 3 };
      const action: SearchAction = { type: 'SET_SORT_BY', payload: 'price:desc' };
      const newState = searchReducer(state, action);
      
      expect(newState.sortBy).toBe('price:desc');
      expect(newState.page).toBe(1);
    });

    it('should handle empty sort', () => {
      const state = { ...initialSearchState, sortBy: 'old:sort' };
      const action: SearchAction = { type: 'SET_SORT_BY', payload: '' };
      const newState = searchReducer(state, action);
      
      expect(newState.sortBy).toBe('');
    });
  });

  describe('SET_SCHEMA', () => {
    it('should set schema', () => {
      const schema = { name: 'products', fields: [{ name: 'title', type: 'string' }] };
      const action: SearchAction = { type: 'SET_SCHEMA', payload: schema as any };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.schema).toEqual(schema);
    });

    it('should handle null schema', () => {
      const state = { ...initialSearchState, schema: { name: 'old' } as any };
      const action: SearchAction = { type: 'SET_SCHEMA', payload: null };
      const newState = searchReducer(state, action);
      
      expect(newState.schema).toBeNull();
    });
  });

  describe('RESET_SEARCH', () => {
    it('should reset to initial state but preserve configuration', () => {
      const state: SearchState = {
        ...initialSearchState,
        query: 'test',
        results: { hits: [], found: 0 } as any,
        loading: true,
        error: 'Error',
        page: 5,
        facets: ['category', 'brand'],
        schema: { name: 'products' } as any,
        accumulateFacets: true,
        accumulatedFacetValues: { category: { values: new Set(['books']), orderedValues: ['books'], lastUpdated: Date.now() } },
        moveSelectedToTop: true,
        reorderByCount: false,
        useNumericRanges: true,
        numericFacetRanges: { price: { mode: 'range' } },
        facetOptionLimit: 100,
        hideZeroCountsForSingleSelect: false,
        allowNumericRangeForSingleSelect: false,
      };
      const action: SearchAction = { type: 'RESET_SEARCH' };
      const newState = searchReducer(state, action);
      
      // Check reset fields
      expect(newState.query).toBe('');
      expect(newState.results).toBeNull();
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
      expect(newState.page).toBe(1);
      
      // Check preserved fields
      expect(newState.facets).toEqual(['category', 'brand']);
      expect(newState.schema).toEqual({ name: 'products' });
      expect(newState.accumulateFacets).toBe(true);
      expect(newState.accumulatedFacetValues).toEqual(state.accumulatedFacetValues);
      expect(newState.moveSelectedToTop).toBe(true);
      expect(newState.reorderByCount).toBe(false);
      expect(newState.useNumericRanges).toBe(true);
      expect(newState.numericFacetRanges).toEqual({ price: { mode: 'range' } });
      expect(newState.facetOptionLimit).toBe(100);
      expect(newState.hideZeroCountsForSingleSelect).toBe(false);
      expect(newState.allowNumericRangeForSingleSelect).toBe(false);
    });
  });

  describe('BATCH_UPDATE', () => {
    it('should update multiple fields at once', () => {
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          query: 'new query',
          page: 3,
          perPage: 50,
          sortBy: 'price:asc',
        },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.query).toBe('new query');
      expect(newState.page).toBe(1); // Should reset due to query change
      expect(newState.perPage).toBe(50);
      expect(newState.sortBy).toBe('price:asc');
    });

    it('should reset page when filters are updated', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          disjunctiveFacets: { category: ['books'] },
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.disjunctiveFacets).toEqual({ category: ['books'] });
      expect(newState.page).toBe(1);
    });

    it('should reset page for numeric filters update', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          numericFilters: { price: { min: 10, max: 100 } },
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(1);
    });

    it('should reset page for date filters update', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(1);
    });

    it('should reset page for selective filters update', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          selectiveFilters: { status: 'active' },
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(1);
    });

    it('should reset page for custom filters update', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          customFilters: { tags: ['tag1'] },
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(1);
    });

    it('should preserve page from payload if provided', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          loading: true,
          page: 10,
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(10);
    });

    it('should preserve current page if no filter changes', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          loading: true,
          error: null,
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(5);
    });
  });

  describe('SET_ACCUMULATE_FACETS', () => {
    it('should set accumulate facets to true', () => {
      const action: SearchAction = { type: 'SET_ACCUMULATE_FACETS', payload: true };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.accumulateFacets).toBe(true);
    });

    it('should set accumulate facets to false', () => {
      const state = { ...initialSearchState, accumulateFacets: true };
      const action: SearchAction = { type: 'SET_ACCUMULATE_FACETS', payload: false };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulateFacets).toBe(false);
    });
  });

  describe('UPDATE_ACCUMULATED_FACETS', () => {
    it('should add new facet values', () => {
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'category', values: ['books', 'electronics'] },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.accumulatedFacetValues.category).toBeDefined();
      expect(newState.accumulatedFacetValues.category.values).toBeInstanceOf(Set);
      expect(Array.from(newState.accumulatedFacetValues.category.values)).toEqual(['books', 'electronics']);
      expect(newState.accumulatedFacetValues.category.orderedValues).toEqual(['books', 'electronics']);
      expect(newState.accumulatedFacetValues.category.lastUpdated).toBeDefined();
    });

    it('should append to existing facet values', () => {
      const state = {
        ...initialSearchState,
        accumulatedFacetValues: {
          category: {
            values: new Set(['books']),
            orderedValues: ['books'],
            lastUpdated: Date.now() - 1000,
          },
        },
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'category', values: ['electronics', 'books', 'toys'] },
      };
      const newState = searchReducer(state, action);
      
      expect(Array.from(newState.accumulatedFacetValues.category.values)).toEqual(['books', 'electronics', 'toys']);
      expect(newState.accumulatedFacetValues.category.orderedValues).toEqual(['books', 'electronics', 'toys']);
    });

    it('should handle numeric facets and calculate bounds', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'price', type: 'float' },
          ],
        } as any,
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['10.5', '25.99', '5.0'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.price.numericBounds).toEqual({
        min: 5.0,
        max: 25.99,
      });
    });

    it('should update numeric bounds with new values', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'price', type: 'int32' },
          ],
        } as any,
        accumulatedFacetValues: {
          price: {
            values: new Set(['10', '20']),
            orderedValues: ['10', '20'],
            numericBounds: { min: 10, max: 20 },
            lastUpdated: Date.now() - 1000,
          },
        },
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['5', '30', '15'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.price.numericBounds).toEqual({
        min: 5,
        max: 30,
      });
    });

    it('should handle non-numeric values for numeric fields', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'price', type: 'float' },
          ],
        } as any,
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['10.5', 'invalid', '25.99'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.price.numericBounds).toEqual({
        min: 10.5,
        max: 25.99,
      });
      expect(Array.from(newState.accumulatedFacetValues.price.values)).toContain('invalid');
    });

    it('should handle int64 numeric type', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'count', type: 'int64' },
          ],
        } as any,
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'count', values: ['100', '200', '50'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.count.numericBounds).toEqual({
        min: 50,
        max: 200,
      });
    });
  });

  describe('CLEAR_ACCUMULATED_FACETS', () => {
    it('should clear specific field', () => {
      const state = {
        ...initialSearchState,
        accumulatedFacetValues: {
          category: {
            values: new Set(['books']),
            orderedValues: ['books'],
            lastUpdated: Date.now(),
          },
          brand: {
            values: new Set(['apple']),
            orderedValues: ['apple'],
            lastUpdated: Date.now(),
          },
        },
      };
      const action: SearchAction = {
        type: 'CLEAR_ACCUMULATED_FACETS',
        payload: 'category',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.category).toBeUndefined();
      expect(newState.accumulatedFacetValues.brand).toBeDefined();
    });

    it('should clear all fields when payload is undefined', () => {
      const state = {
        ...initialSearchState,
        accumulatedFacetValues: {
          category: {
            values: new Set(['books']),
            orderedValues: ['books'],
            lastUpdated: Date.now(),
          },
          brand: {
            values: new Set(['apple']),
            orderedValues: ['apple'],
            lastUpdated: Date.now(),
          },
        },
      };
      const action: SearchAction = {
        type: 'CLEAR_ACCUMULATED_FACETS',
        payload: undefined,
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues).toEqual({});
    });
  });

  describe('SET_MOVE_SELECTED_TO_TOP', () => {
    it('should set moveSelectedToTop to true', () => {
      const action: SearchAction = { type: 'SET_MOVE_SELECTED_TO_TOP', payload: true };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.moveSelectedToTop).toBe(true);
    });

    it('should set moveSelectedToTop to false', () => {
      const state = { ...initialSearchState, moveSelectedToTop: true };
      const action: SearchAction = { type: 'SET_MOVE_SELECTED_TO_TOP', payload: false };
      const newState = searchReducer(state, action);
      
      expect(newState.moveSelectedToTop).toBe(false);
    });
  });

  describe('SET_REORDER_BY_COUNT', () => {
    it('should set reorderByCount to true', () => {
      const state = { ...initialSearchState, reorderByCount: false };
      const action: SearchAction = { type: 'SET_REORDER_BY_COUNT', payload: true };
      const newState = searchReducer(state, action);
      
      expect(newState.reorderByCount).toBe(true);
    });

    it('should set reorderByCount to false', () => {
      const action: SearchAction = { type: 'SET_REORDER_BY_COUNT', payload: false };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.reorderByCount).toBe(false);
    });
  });

  describe('SET_USE_NUMERIC_RANGES', () => {
    it('should set useNumericRanges to true', () => {
      const action: SearchAction = { type: 'SET_USE_NUMERIC_RANGES', payload: true };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.useNumericRanges).toBe(true);
    });

    it('should set useNumericRanges to false', () => {
      const state = { ...initialSearchState, useNumericRanges: true };
      const action: SearchAction = { type: 'SET_USE_NUMERIC_RANGES', payload: false };
      const newState = searchReducer(state, action);
      
      expect(newState.useNumericRanges).toBe(false);
    });
  });

  describe('SET_NUMERIC_FACET_MODE', () => {
    it('should set numeric facet mode', () => {
      const action: SearchAction = {
        type: 'SET_NUMERIC_FACET_MODE',
        payload: { field: 'price', mode: 'range' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.numericFacetRanges.price).toEqual({ mode: 'range' });
    });

    it('should update existing numeric facet range', () => {
      const state = {
        ...initialSearchState,
        numericFacetRanges: {
          price: { mode: 'list', currentRange: { min: 10, max: 100 } },
        },
      };
      const action: SearchAction = {
        type: 'SET_NUMERIC_FACET_MODE',
        payload: { field: 'price', mode: 'range' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        mode: 'range',
        currentRange: { min: 10, max: 100 },
      });
    });
  });

  describe('SET_NUMERIC_FACET_RANGE', () => {
    it('should set numeric facet range and update filters', () => {
      const action: SearchAction = {
        type: 'SET_NUMERIC_FACET_RANGE',
        payload: { field: 'price', min: 10, max: 100 },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        currentRange: { min: 10, max: 100 },
      });
      expect(newState.numericFilters.price).toEqual({ min: 10, max: 100 });
      expect(newState.page).toBe(1);
    });

    it('should update existing range', () => {
      const state = {
        ...initialSearchState,
        numericFacetRanges: {
          price: { mode: 'range', bounds: { min: 0, max: 1000 } },
        },
        page: 5,
      };
      const action: SearchAction = {
        type: 'SET_NUMERIC_FACET_RANGE',
        payload: { field: 'price', min: 50, max: 200 },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        mode: 'range',
        bounds: { min: 0, max: 1000 },
        currentRange: { min: 50, max: 200 },
      });
      expect(newState.numericFilters.price).toEqual({ min: 50, max: 200 });
      expect(newState.page).toBe(1);
    });
  });

  describe('UPDATE_NUMERIC_FACET_BOUNDS', () => {
    it('should update numeric facet bounds', () => {
      const action: SearchAction = {
        type: 'UPDATE_NUMERIC_FACET_BOUNDS',
        payload: { field: 'price', min: 0, max: 1000 },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        bounds: { min: 0, max: 1000 },
      });
    });

    it('should update existing bounds', () => {
      const state = {
        ...initialSearchState,
        numericFacetRanges: {
          price: {
            mode: 'range',
            currentRange: { min: 10, max: 100 },
            bounds: { min: 5, max: 500 },
          },
        },
      };
      const action: SearchAction = {
        type: 'UPDATE_NUMERIC_FACET_BOUNDS',
        payload: { field: 'price', min: 0, max: 1000 },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        mode: 'range',
        currentRange: { min: 10, max: 100 },
        bounds: { min: 0, max: 1000 },
      });
    });
  });

  describe('CLEAR_NUMERIC_FACET_RANGE', () => {
    it('should clear numeric facet range and filter', () => {
      const state = {
        ...initialSearchState,
        numericFacetRanges: {
          price: {
            mode: 'range',
            currentRange: { min: 10, max: 100 },
            bounds: { min: 0, max: 1000 },
          },
          rating: {
            currentRange: { min: 3, max: 5 },
          },
        },
        numericFilters: {
          price: { min: 10, max: 100 },
          rating: { min: 3, max: 5 },
        },
        page: 5,
      };
      const action: SearchAction = {
        type: 'CLEAR_NUMERIC_FACET_RANGE',
        payload: 'price',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        mode: 'range',
        bounds: { min: 0, max: 1000 },
      });
      expect(newState.numericFilters.price).toBeUndefined();
      expect(newState.numericFilters.rating).toEqual({ min: 3, max: 5 });
      expect(newState.page).toBe(1);
    });

    it('should handle clearing non-existent range', () => {
      const state = {
        ...initialSearchState,
        numericFilters: { price: { min: 10, max: 100 } },
      };
      const action: SearchAction = {
        type: 'CLEAR_NUMERIC_FACET_RANGE',
        payload: 'nonexistent',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFilters).toEqual({ price: { min: 10, max: 100 } });
    });
  });

  describe('SET_FACET_OPTION_LIMIT', () => {
    it('should set facet option limit', () => {
      const action: SearchAction = { type: 'SET_FACET_OPTION_LIMIT', payload: 100 };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.facetOptionLimit).toBe(100);
    });

    it('should set facet option limit to 0 (no limit)', () => {
      const state = { ...initialSearchState, facetOptionLimit: 50 };
      const action: SearchAction = { type: 'SET_FACET_OPTION_LIMIT', payload: 0 };
      const newState = searchReducer(state, action);
      
      expect(newState.facetOptionLimit).toBe(0);
    });
  });

  describe('SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT', () => {
    it('should set hideZeroCountsForSingleSelect to true', () => {
      const state = { ...initialSearchState, hideZeroCountsForSingleSelect: false };
      const action: SearchAction = { type: 'SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT', payload: true };
      const newState = searchReducer(state, action);
      
      expect(newState.hideZeroCountsForSingleSelect).toBe(true);
    });

    it('should set hideZeroCountsForSingleSelect to false', () => {
      const action: SearchAction = { type: 'SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT', payload: false };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.hideZeroCountsForSingleSelect).toBe(false);
    });
  });

  describe('SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT', () => {
    it('should set allowNumericRangeForSingleSelect to true', () => {
      const state = { ...initialSearchState, allowNumericRangeForSingleSelect: false };
      const action: SearchAction = { type: 'SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT', payload: true };
      const newState = searchReducer(state, action);
      
      expect(newState.allowNumericRangeForSingleSelect).toBe(true);
    });

    it('should set allowNumericRangeForSingleSelect to false', () => {
      const action: SearchAction = { type: 'SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT', payload: false };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.allowNumericRangeForSingleSelect).toBe(false);
    });
  });

  describe('SET_ADDITIONAL_FILTERS', () => {
    it('should set additional filters and reset page', () => {
      const additionalFilters = 'status:=active && priority:=high';
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = { type: 'SET_ADDITIONAL_FILTERS', payload: additionalFilters };
      const newState = searchReducer(state, action);
      
      expect(newState.additionalFilters).toBe(additionalFilters);
      expect(newState.page).toBe(1);
    });

    it('should handle undefined additional filters', () => {
      const state = { ...initialSearchState, additionalFilters: 'old:filter' };
      const action: SearchAction = { type: 'SET_ADDITIONAL_FILTERS', payload: undefined };
      const newState = searchReducer(state, action);
      
      expect(newState.additionalFilters).toBeUndefined();
      expect(newState.page).toBe(1);
    });
  });

  describe('SET_MULTI_SORT_BY', () => {
    it('should set multi sort by and reset page', () => {
      const multiSortBy = [
        { field: 'price', order: 'desc' as const },
        { field: 'rating', order: 'asc' as const },
      ];
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = { type: 'SET_MULTI_SORT_BY', payload: multiSortBy };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toEqual(multiSortBy);
      expect(newState.page).toBe(1);
    });

    it('should handle undefined multi sort', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [{ field: 'old', order: 'asc' as const }],
      };
      const action: SearchAction = { type: 'SET_MULTI_SORT_BY', payload: undefined };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toBeUndefined();
    });
  });

  describe('ADD_SORT_FIELD', () => {
    it('should add new sort field', () => {
      const action: SearchAction = {
        type: 'ADD_SORT_FIELD',
        payload: { field: 'price', order: 'desc' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.multiSortBy).toEqual([{ field: 'price', order: 'desc' }]);
      expect(newState.page).toBe(1);
    });

    it('should add to existing sort fields', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [{ field: 'rating', order: 'desc' as const }],
      };
      const action: SearchAction = {
        type: 'ADD_SORT_FIELD',
        payload: { field: 'price', order: 'asc' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toEqual([
        { field: 'rating', order: 'desc' },
        { field: 'price', order: 'asc' },
      ]);
    });

    it('should update existing sort field', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [
          { field: 'price', order: 'asc' as const },
          { field: 'rating', order: 'desc' as const },
        ],
      };
      const action: SearchAction = {
        type: 'ADD_SORT_FIELD',
        payload: { field: 'price', order: 'desc' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toEqual([
        { field: 'price', order: 'desc' },
        { field: 'rating', order: 'desc' },
      ]);
    });
  });

  describe('REMOVE_SORT_FIELD', () => {
    it('should remove sort field', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [
          { field: 'price', order: 'desc' as const },
          { field: 'rating', order: 'asc' as const },
        ],
        page: 5,
      };
      const action: SearchAction = {
        type: 'REMOVE_SORT_FIELD',
        payload: 'price',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toEqual([{ field: 'rating', order: 'asc' }]);
      expect(newState.page).toBe(1);
    });

    it('should set multiSortBy to undefined when last field is removed', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [{ field: 'price', order: 'desc' as const }],
      };
      const action: SearchAction = {
        type: 'REMOVE_SORT_FIELD',
        payload: 'price',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toBeUndefined();
    });

    it('should handle removing non-existent field', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [{ field: 'price', order: 'desc' as const }],
      };
      const action: SearchAction = {
        type: 'REMOVE_SORT_FIELD',
        payload: 'nonexistent',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toEqual([{ field: 'price', order: 'desc' }]);
    });

    it('should handle empty multiSortBy', () => {
      const action: SearchAction = {
        type: 'REMOVE_SORT_FIELD',
        payload: 'price',
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.multiSortBy).toBeUndefined();
    });
  });

  describe('CLEAR_MULTI_SORT', () => {
    it('should clear all multi sort fields', () => {
      const state = {
        ...initialSearchState,
        multiSortBy: [
          { field: 'price', order: 'desc' as const },
          { field: 'rating', order: 'asc' as const },
        ],
        page: 5,
      };
      const action: SearchAction = { type: 'CLEAR_MULTI_SORT' };
      const newState = searchReducer(state, action);
      
      expect(newState.multiSortBy).toBeUndefined();
      expect(newState.page).toBe(1);
    });

    it('should handle already undefined multiSortBy', () => {
      const action: SearchAction = { type: 'CLEAR_MULTI_SORT' };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.multiSortBy).toBeUndefined();
    });
  });

  describe('Unknown action type', () => {
    it('should return current state for unknown action', () => {
      const state = { ...initialSearchState, query: 'test' };
      const action = { type: 'UNKNOWN_ACTION' } as any;
      const newState = searchReducer(state, action);
      
      expect(newState).toBe(state);
      expect(newState.query).toBe('test');
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state when setting query', () => {
      const originalState = { ...initialSearchState };
      const frozenState = Object.freeze(originalState);
      const action: SearchAction = { type: 'SET_QUERY', payload: 'new query' };
      
      expect(() => searchReducer(frozenState, action)).not.toThrow();
      const newState = searchReducer(frozenState, action);
      expect(newState).not.toBe(frozenState);
      expect(frozenState.query).toBe('');
    });

    it('should not mutate nested objects when toggling disjunctive facets', () => {
      const originalState = {
        ...initialSearchState,
        disjunctiveFacets: Object.freeze({ category: Object.freeze(['books']) }),
      };
      const action: SearchAction = {
        type: 'TOGGLE_DISJUNCTIVE_FACET',
        payload: { field: 'category', value: 'electronics' },
      };
      
      expect(() => searchReducer(originalState, action)).not.toThrow();
      const newState = searchReducer(originalState, action);
      expect(newState.disjunctiveFacets).not.toBe(originalState.disjunctiveFacets);
      expect(originalState.disjunctiveFacets.category).toEqual(['books']);
    });

    it('should not mutate accumulated facet values', () => {
      const frozenSet = Object.freeze(new Set(['books']));
      const originalState = {
        ...initialSearchState,
        accumulatedFacetValues: Object.freeze({
          category: Object.freeze({
            values: frozenSet,
            orderedValues: Object.freeze(['books']),
            lastUpdated: Date.now(),
          }),
        }),
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'category', values: ['electronics'] },
      };
      
      const newState = searchReducer(originalState, action);
      expect(newState.accumulatedFacetValues).not.toBe(originalState.accumulatedFacetValues);
      expect(Array.from(originalState.accumulatedFacetValues.category.values)).toEqual(['books']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle SET_DATE_FILTER with empty string for end', () => {
      const action: SearchAction = {
        type: 'SET_DATE_FILTER',
        payload: { field: 'created_at', start: '2023-01-01', end: '' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.dateFilters).toEqual({
        created_at: { start: '2023-01-01', end: '' },
      });
    });

    it('should handle UPDATE_ACCUMULATED_FACETS with empty values array', () => {
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'category', values: [] },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.accumulatedFacetValues.category).toBeDefined();
      expect(Array.from(newState.accumulatedFacetValues.category.values)).toEqual([]);
    });

    it('should handle numeric bounds for field without schema', () => {
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['10', '20'] },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.accumulatedFacetValues.price.numericBounds).toBeUndefined();
    });

    it('should handle BATCH_UPDATE with all filter types', () => {
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          query: 'test',
          disjunctiveFacets: { category: ['books'] },
          numericFilters: { price: { min: 10, max: 100 } },
          dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
          selectiveFilters: { status: 'active' },
          customFilters: { tags: ['tag1'] },
          sortBy: 'price:asc',
          perPage: 50,
          page: 10, // This should be reset to 1 due to filter changes
        },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.query).toBe('test');
      expect(newState.disjunctiveFacets).toEqual({ category: ['books'] });
      expect(newState.numericFilters).toEqual({ price: { min: 10, max: 100 } });
      expect(newState.dateFilters).toEqual({ created_at: { start: '2023-01-01', end: '2023-12-31' } });
      expect(newState.selectiveFilters).toEqual({ status: 'active' });
      expect(newState.customFilters).toEqual({ tags: ['tag1'] });
      expect(newState.sortBy).toBe('price:asc');
      expect(newState.perPage).toBe(50);
      expect(newState.page).toBe(1); // Reset due to filter changes
    });

    it('should handle RESET_SEARCH with all configuration fields set', () => {
      const state: SearchState = {
        query: 'test',
        results: { hits: [], found: 0 } as any,
        loading: true,
        error: 'Error',
        facets: ['category', 'brand'],
        disjunctiveFacets: { category: ['books'] },
        numericFilters: { price: { min: 10, max: 100 } },
        dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
        selectiveFilters: { status: 'active' },
        customFilters: { tags: ['tag1'] },
        page: 5,
        perPage: 50,
        sortBy: 'price:desc',
        multiSortBy: [{ field: 'price', order: 'desc' }],
        additionalFilters: 'custom:filter',
        schema: { name: 'products', fields: [] } as any,
        searchPerformed: true,
        lastSearchAt: Date.now(),
        accumulatedFacetValues: {
          category: {
            values: new Set(['books', 'electronics']),
            orderedValues: ['books', 'electronics'],
            lastUpdated: Date.now(),
          },
        },
        accumulateFacets: true,
        moveSelectedToTop: true,
        reorderByCount: false,
        useNumericRanges: true,
        numericFacetRanges: {
          price: {
            mode: 'range',
            bounds: { min: 0, max: 1000 },
            currentRange: { min: 10, max: 100 },
          },
        },
        facetOptionLimit: 100,
        hideZeroCountsForSingleSelect: false,
        allowNumericRangeForSingleSelect: false,
      };
      
      const action: SearchAction = { type: 'RESET_SEARCH' };
      const newState = searchReducer(state, action);
      
      // Check all fields are reset or preserved correctly
      expect(newState.query).toBe('');
      expect(newState.results).toBeNull();
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
      expect(newState.disjunctiveFacets).toEqual({});
      expect(newState.numericFilters).toEqual({});
      expect(newState.dateFilters).toEqual({});
      expect(newState.selectiveFilters).toEqual({});
      expect(newState.customFilters).toEqual({});
      expect(newState.page).toBe(1);
      expect(newState.perPage).toBe(20);
      expect(newState.sortBy).toBe('');
      expect(newState.multiSortBy).toBeUndefined();
      expect(newState.additionalFilters).toBeUndefined();
      expect(newState.searchPerformed).toBe(false);
      expect(newState.lastSearchAt).toBeUndefined();
      
      // Configuration fields should be preserved
      expect(newState.facets).toEqual(['category', 'brand']);
      expect(newState.schema).toEqual({ name: 'products', fields: [] });
      expect(newState.accumulatedFacetValues).toEqual(state.accumulatedFacetValues);
      expect(newState.accumulateFacets).toBe(true);
      expect(newState.moveSelectedToTop).toBe(true);
      expect(newState.reorderByCount).toBe(false);
      expect(newState.useNumericRanges).toBe(true);
      expect(newState.numericFacetRanges).toEqual(state.numericFacetRanges);
      expect(newState.facetOptionLimit).toBe(100);
      expect(newState.hideZeroCountsForSingleSelect).toBe(false);
      expect(newState.allowNumericRangeForSingleSelect).toBe(false);
    });

    it('should handle numeric facet with only bounds (no current range)', () => {
      const state = {
        ...initialSearchState,
        numericFacetRanges: {
          price: {
            bounds: { min: 0, max: 1000 },
          },
        },
      };
      const action: SearchAction = {
        type: 'CLEAR_NUMERIC_FACET_RANGE',
        payload: 'price',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFacetRanges.price).toEqual({
        bounds: { min: 0, max: 1000 },
      });
    });

    it('should handle UPDATE_ACCUMULATED_FACETS for numeric field with existing non-numeric bounds', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'rating', type: 'float' },
          ],
        } as any,
        accumulatedFacetValues: {
          rating: {
            values: new Set(['good', 'bad']),
            orderedValues: ['good', 'bad'],
            lastUpdated: Date.now(),
          },
        },
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'rating', values: ['4.5', '3.2'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.rating.numericBounds).toEqual({
        min: 3.2,
        max: 4.5,
      });
      expect(Array.from(newState.accumulatedFacetValues.rating.values)).toContain('good');
      expect(Array.from(newState.accumulatedFacetValues.rating.values)).toContain('4.5');
    });

    it('should handle field not found in schema for UPDATE_ACCUMULATED_FACETS', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'price', type: 'float' },
          ],
        } as any,
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'unknown_field', values: ['10', '20'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.unknown_field.numericBounds).toBeUndefined();
    });

    it('should handle SET_DATE_FILTER with only end date', () => {
      const action: SearchAction = {
        type: 'SET_DATE_FILTER',
        payload: { field: 'created_at', start: null, end: '2023-12-31' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.dateFilters).toEqual({
        created_at: { start: null, end: '2023-12-31' },
      });
    });

    it('should handle SET_SELECTIVE_FILTER with numeric string value', () => {
      const action: SearchAction = {
        type: 'SET_SELECTIVE_FILTER',
        payload: { field: 'priority', value: '1' },
      };
      const newState = searchReducer(initialSearchState, action);
      
      expect(newState.selectiveFilters).toEqual({ priority: '1' });
    });

    it('should handle createInitialState with partial arrays', () => {
      const state = createInitialState({
        facets: ['custom'],
        multiSortBy: [],
      });
      
      expect(state.facets).toEqual(['custom']);
      expect(state.multiSortBy).toEqual([]);
    });

    it('should handle BATCH_UPDATE without page reset when no filter changes', () => {
      const state = { ...initialSearchState, page: 5 };
      const action: SearchAction = {
        type: 'BATCH_UPDATE',
        payload: {
          loading: true,
          error: 'test error',
          results: { hits: [], found: 0 } as any,
        },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.page).toBe(5);
      expect(newState.loading).toBe(true);
      expect(newState.error).toBe('test error');
    });

    it('should handle SET_DATE_FILTER with both start and end as empty strings', () => {
      const state = {
        ...initialSearchState,
        dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
      };
      const action: SearchAction = {
        type: 'SET_DATE_FILTER',
        payload: { field: 'created_at', start: '', end: '' },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.dateFilters).toEqual({});
    });

    it('should handle SET_SELECTIVE_FILTER with null value', () => {
      const state = {
        ...initialSearchState,
        selectiveFilters: { status: 'active' },
      };
      const action: SearchAction = {
        type: 'SET_SELECTIVE_FILTER',
        payload: { field: 'status', value: null as any },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.selectiveFilters).toEqual({});
    });

    it('should handle CLEAR_NUMERIC_FACET_RANGE with field that has no numeric filter', () => {
      const state = {
        ...initialSearchState,
        numericFacetRanges: {
          price: { bounds: { min: 0, max: 1000 } },
        },
      };
      const action: SearchAction = {
        type: 'CLEAR_NUMERIC_FACET_RANGE',
        payload: 'price',
      };
      const newState = searchReducer(state, action);
      
      expect(newState.numericFilters).toEqual({});
      expect(newState.numericFacetRanges.price).toEqual({ bounds: { min: 0, max: 1000 } });
    });

    it('should preserve numeric bounds when updating accumulated facets with existing bounds', () => {
      const state = {
        ...initialSearchState,
        schema: {
          fields: [
            { name: 'price', type: 'int32' },
          ],
        } as any,
        accumulatedFacetValues: {
          price: {
            values: new Set(['15', '25']),
            orderedValues: ['15', '25'],
            numericBounds: { min: 15, max: 25 },
            lastUpdated: Date.now() - 1000,
          },
        },
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['20'] },
      };
      const newState = searchReducer(state, action);
      
      // Should not change bounds as 20 is within existing range
      expect(newState.accumulatedFacetValues.price.numericBounds).toEqual({
        min: 15,
        max: 25,
      });
      expect(Array.from(newState.accumulatedFacetValues.price.values)).toContain('20');
    });

    it('should handle schema with no fields array', () => {
      const state = {
        ...initialSearchState,
        schema: {} as any,
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['10'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.price.numericBounds).toBeUndefined();
    });

    it('should handle undefined schema fields', () => {
      const state = {
        ...initialSearchState,
        schema: { fields: undefined } as any,
      };
      const action: SearchAction = {
        type: 'UPDATE_ACCUMULATED_FACETS',
        payload: { field: 'price', values: ['10'] },
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues.price.numericBounds).toBeUndefined();
    });

    it('should handle CLEAR_ACCUMULATED_FACETS with null payload', () => {
      const state = {
        ...initialSearchState,
        accumulatedFacetValues: {
          category: {
            values: new Set(['books']),
            orderedValues: ['books'],
            lastUpdated: Date.now(),
          },
        },
      };
      const action: SearchAction = {
        type: 'CLEAR_ACCUMULATED_FACETS',
        payload: null as any,
      };
      const newState = searchReducer(state, action);
      
      expect(newState.accumulatedFacetValues).toEqual({});
    });
  });
});