/**
 * @fileoverview Tests for URL serialization utilities
 * TDD - RED phase: Writing tests before implementation
 */

import { describe, it, expect } from 'vitest';
import {
  serializeSearchState,
  deserializeSearchParams,
  type UrlSerializerOptions,
} from '../urlSerializer';
import type { SearchState } from '../../types';

const createMinimalState = (overrides: Partial<SearchState> = {}): Partial<SearchState> => ({
  query: '',
  page: 1,
  perPage: 20,
  sortBy: '',
  disjunctiveFacets: {},
  numericFilters: {},
  dateFilters: {},
  selectiveFilters: {},
  customFilters: {},
  multiSortBy: undefined,
  ...overrides,
});

describe('urlSerializer', () => {
  describe('serializeSearchState', () => {
    describe('query serialization', () => {
      it('serializes query to q param', () => {
        const state = createMinimalState({ query: 'laptops' });
        const params = serializeSearchState(state);
        expect(params.get('q')).toBe('laptops');
      });

      it('omits empty query', () => {
        const state = createMinimalState({ query: '' });
        const params = serializeSearchState(state);
        expect(params.has('q')).toBe(false);
      });

      it('encodes special characters in query', () => {
        const state = createMinimalState({ query: 'laptop & accessories' });
        const params = serializeSearchState(state);
        expect(params.get('q')).toBe('laptop & accessories');
      });
    });

    describe('pagination serialization', () => {
      it('serializes page number', () => {
        const state = createMinimalState({ page: 3 });
        const params = serializeSearchState(state);
        expect(params.get('page')).toBe('3');
      });

      it('omits page 1 (default)', () => {
        const state = createMinimalState({ page: 1 });
        const params = serializeSearchState(state);
        expect(params.has('page')).toBe(false);
      });

      it('serializes perPage when different from default', () => {
        const state = createMinimalState({ perPage: 50 });
        const params = serializeSearchState(state);
        expect(params.get('perPage')).toBe('50');
      });

      it('omits perPage when default', () => {
        const state = createMinimalState({ perPage: 20 });
        const params = serializeSearchState(state);
        expect(params.has('perPage')).toBe(false);
      });

      it('respects custom default perPage option', () => {
        const state = createMinimalState({ perPage: 50 });
        const params = serializeSearchState(state, { defaultPerPage: 50 });
        expect(params.has('perPage')).toBe(false);
      });
    });

    describe('sort serialization', () => {
      it('serializes single sort field', () => {
        const state = createMinimalState({ sortBy: 'price:asc' });
        const params = serializeSearchState(state);
        expect(params.get('sort')).toBe('price:asc');
      });

      it('omits empty sortBy', () => {
        const state = createMinimalState({ sortBy: '' });
        const params = serializeSearchState(state);
        expect(params.has('sort')).toBe(false);
      });

      it('serializes multi-sort fields', () => {
        const state = createMinimalState({
          multiSortBy: [
            { field: 'rating', order: 'desc' },
            { field: 'price', order: 'asc' },
          ],
        });
        const params = serializeSearchState(state);
        expect(params.get('sort')).toBe('rating:desc,price:asc');
      });

      it('prefers multiSortBy over sortBy when both present', () => {
        const state = createMinimalState({
          sortBy: 'name:asc',
          multiSortBy: [{ field: 'price', order: 'desc' }],
        });
        const params = serializeSearchState(state);
        expect(params.get('sort')).toBe('price:desc');
      });
    });

    describe('disjunctive facet serialization', () => {
      it('serializes single disjunctive facet value', () => {
        const state = createMinimalState({
          disjunctiveFacets: { status: ['active'] },
        });
        const params = serializeSearchState(state);
        expect(params.get('status')).toBe('active');
      });

      it('serializes multiple disjunctive facet values as comma-separated', () => {
        const state = createMinimalState({
          disjunctiveFacets: { status: ['active', 'pending'] },
        });
        const params = serializeSearchState(state);
        expect(params.get('status')).toBe('active,pending');
      });

      it('omits empty disjunctive facet arrays', () => {
        const state = createMinimalState({
          disjunctiveFacets: { status: [] },
        });
        const params = serializeSearchState(state);
        expect(params.has('status')).toBe(false);
      });

      it('serializes multiple disjunctive facets', () => {
        const state = createMinimalState({
          disjunctiveFacets: {
            status: ['active'],
            category: ['electronics', 'computers'],
          },
        });
        const params = serializeSearchState(state);
        expect(params.get('status')).toBe('active');
        expect(params.get('category')).toBe('electronics,computers');
      });

      it('encodes special characters in facet values', () => {
        const state = createMinimalState({
          disjunctiveFacets: { category: ['Books & Media'] },
        });
        const params = serializeSearchState(state);
        expect(params.get('category')).toBe('Books & Media');
      });
    });

    describe('numeric filter serialization', () => {
      it('serializes numeric range filter', () => {
        const state = createMinimalState({
          numericFilters: { price: { min: 100, max: 500 } },
        });
        const params = serializeSearchState(state);
        expect(params.get('price')).toBe('100..500');
      });

      it('serializes min-only numeric filter', () => {
        const state = createMinimalState({
          numericFilters: { price: { min: 100 } },
        });
        const params = serializeSearchState(state);
        expect(params.get('price')).toBe('100..');
      });

      it('serializes max-only numeric filter', () => {
        const state = createMinimalState({
          numericFilters: { price: { max: 500 } },
        });
        const params = serializeSearchState(state);
        expect(params.get('price')).toBe('..500');
      });

      it('omits empty numeric filters', () => {
        const state = createMinimalState({
          numericFilters: { price: {} },
        });
        const params = serializeSearchState(state);
        expect(params.has('price')).toBe(false);
      });

      it('handles zero values correctly', () => {
        const state = createMinimalState({
          numericFilters: { quantity: { min: 0, max: 100 } },
        });
        const params = serializeSearchState(state);
        expect(params.get('quantity')).toBe('0..100');
      });

      it('handles negative values', () => {
        const state = createMinimalState({
          numericFilters: { temperature: { min: -10, max: 10 } },
        });
        const params = serializeSearchState(state);
        expect(params.get('temperature')).toBe('-10..10');
      });
    });

    describe('date filter serialization', () => {
      it('serializes date range with Date objects', () => {
        const state = createMinimalState({
          dateFilters: {
            created: {
              start: new Date('2024-01-01T00:00:00Z'),
              end: new Date('2024-12-31T23:59:59Z'),
            },
          },
        });
        const params = serializeSearchState(state);
        expect(params.get('created')).toBe('2024-01-01..2024-12-31');
      });

      it('serializes date range with ISO strings', () => {
        const state = createMinimalState({
          dateFilters: {
            created: {
              start: '2024-01-01',
              end: '2024-12-31',
            },
          },
        });
        const params = serializeSearchState(state);
        expect(params.get('created')).toBe('2024-01-01..2024-12-31');
      });

      it('serializes start-only date filter', () => {
        const state = createMinimalState({
          dateFilters: {
            created: { start: '2024-01-01' },
          },
        });
        const params = serializeSearchState(state);
        expect(params.get('created')).toBe('2024-01-01..');
      });

      it('serializes end-only date filter', () => {
        const state = createMinimalState({
          dateFilters: {
            created: { end: '2024-12-31' },
          },
        });
        const params = serializeSearchState(state);
        expect(params.get('created')).toBe('..2024-12-31');
      });

      it('omits empty date filters', () => {
        const state = createMinimalState({
          dateFilters: { created: {} },
        });
        const params = serializeSearchState(state);
        expect(params.has('created')).toBe(false);
      });
    });

    describe('selective filter serialization', () => {
      it('serializes selective filter', () => {
        const state = createMinimalState({
          selectiveFilters: { warehouse: 'warehouse-1' },
        });
        const params = serializeSearchState(state);
        expect(params.get('warehouse')).toBe('warehouse-1');
      });

      it('omits empty selective filters', () => {
        const state = createMinimalState({
          selectiveFilters: { warehouse: '' },
        });
        const params = serializeSearchState(state);
        expect(params.has('warehouse')).toBe(false);
      });
    });

    describe('options', () => {
      it('uses custom param prefix', () => {
        const state = createMinimalState({ query: 'test' });
        const params = serializeSearchState(state, { paramPrefix: 'search_' });
        expect(params.get('search_q')).toBe('test');
        expect(params.has('q')).toBe(false);
      });

      it('excludes specified fields', () => {
        const state = createMinimalState({
          query: 'test',
          page: 2,
          disjunctiveFacets: { status: ['active'] },
        });
        const params = serializeSearchState(state, { excludeFields: ['page'] });
        expect(params.get('q')).toBe('test');
        expect(params.get('status')).toBe('active');
        expect(params.has('page')).toBe(false);
      });
    });
  });

  describe('deserializeSearchParams', () => {
    describe('query deserialization', () => {
      it('deserializes q param to query', () => {
        const params = new URLSearchParams('q=laptops');
        const state = deserializeSearchParams(params);
        expect(state.query).toBe('laptops');
      });

      it('handles missing q param', () => {
        const params = new URLSearchParams('');
        const state = deserializeSearchParams(params);
        expect(state.query).toBeUndefined();
      });

      it('decodes special characters in query', () => {
        const params = new URLSearchParams('q=laptop%20%26%20accessories');
        const state = deserializeSearchParams(params);
        expect(state.query).toBe('laptop & accessories');
      });
    });

    describe('pagination deserialization', () => {
      it('deserializes page param', () => {
        const params = new URLSearchParams('page=3');
        const state = deserializeSearchParams(params);
        expect(state.page).toBe(3);
      });

      it('deserializes perPage param', () => {
        const params = new URLSearchParams('perPage=50');
        const state = deserializeSearchParams(params);
        expect(state.perPage).toBe(50);
      });

      it('ignores invalid page numbers', () => {
        const params = new URLSearchParams('page=invalid');
        const state = deserializeSearchParams(params);
        expect(state.page).toBeUndefined();
      });

      it('ignores negative page numbers', () => {
        const params = new URLSearchParams('page=-1');
        const state = deserializeSearchParams(params);
        expect(state.page).toBeUndefined();
      });
    });

    describe('sort deserialization', () => {
      it('deserializes single sort to sortBy', () => {
        const params = new URLSearchParams('sort=price:asc');
        const state = deserializeSearchParams(params);
        expect(state.sortBy).toBe('price:asc');
      });

      it('deserializes multi-sort to multiSortBy', () => {
        const params = new URLSearchParams('sort=rating:desc,price:asc');
        const state = deserializeSearchParams(params);
        expect(state.multiSortBy).toEqual([
          { field: 'rating', order: 'desc' },
          { field: 'price', order: 'asc' },
        ]);
      });

      it('handles missing sort param', () => {
        const params = new URLSearchParams('');
        const state = deserializeSearchParams(params);
        expect(state.sortBy).toBeUndefined();
        expect(state.multiSortBy).toBeUndefined();
      });
    });

    describe('facet deserialization', () => {
      it('deserializes disjunctive facet with single value', () => {
        const params = new URLSearchParams('status=active');
        const state = deserializeSearchParams(params, {
          facetFields: ['status'],
        });
        expect(state.disjunctiveFacets).toEqual({ status: ['active'] });
      });

      it('deserializes disjunctive facet with multiple values', () => {
        const params = new URLSearchParams('status=active,pending');
        const state = deserializeSearchParams(params, {
          facetFields: ['status'],
        });
        expect(state.disjunctiveFacets).toEqual({ status: ['active', 'pending'] });
      });

      it('ignores unknown params without facetFields config', () => {
        const params = new URLSearchParams('status=active');
        const state = deserializeSearchParams(params);
        expect(state.disjunctiveFacets).toBeUndefined();
      });

      it('decodes special characters in facet values', () => {
        const params = new URLSearchParams('category=Books%20%26%20Media');
        const state = deserializeSearchParams(params, {
          facetFields: ['category'],
        });
        expect(state.disjunctiveFacets).toEqual({ category: ['Books & Media'] });
      });
    });

    describe('numeric filter deserialization', () => {
      it('deserializes numeric range', () => {
        const params = new URLSearchParams('price=100..500');
        const state = deserializeSearchParams(params, {
          numericFields: ['price'],
        });
        expect(state.numericFilters).toEqual({ price: { min: 100, max: 500 } });
      });

      it('deserializes min-only numeric filter', () => {
        const params = new URLSearchParams('price=100..');
        const state = deserializeSearchParams(params, {
          numericFields: ['price'],
        });
        expect(state.numericFilters).toEqual({ price: { min: 100 } });
      });

      it('deserializes max-only numeric filter', () => {
        const params = new URLSearchParams('price=..500');
        const state = deserializeSearchParams(params, {
          numericFields: ['price'],
        });
        expect(state.numericFilters).toEqual({ price: { max: 500 } });
      });

      it('handles zero values', () => {
        const params = new URLSearchParams('quantity=0..100');
        const state = deserializeSearchParams(params, {
          numericFields: ['quantity'],
        });
        expect(state.numericFilters).toEqual({ quantity: { min: 0, max: 100 } });
      });

      it('handles negative values', () => {
        const params = new URLSearchParams('temperature=-10..10');
        const state = deserializeSearchParams(params, {
          numericFields: ['temperature'],
        });
        expect(state.numericFilters).toEqual({ temperature: { min: -10, max: 10 } });
      });

      it('ignores invalid numeric values', () => {
        const params = new URLSearchParams('price=invalid..500');
        const state = deserializeSearchParams(params, {
          numericFields: ['price'],
        });
        expect(state.numericFilters?.price?.min).toBeUndefined();
        expect(state.numericFilters?.price?.max).toBe(500);
      });
    });

    describe('date filter deserialization', () => {
      it('deserializes date range', () => {
        const params = new URLSearchParams('created=2024-01-01..2024-12-31');
        const state = deserializeSearchParams(params, {
          dateFields: ['created'],
        });
        expect(state.dateFilters).toEqual({
          created: { start: '2024-01-01', end: '2024-12-31' },
        });
      });

      it('deserializes start-only date filter', () => {
        const params = new URLSearchParams('created=2024-01-01..');
        const state = deserializeSearchParams(params, {
          dateFields: ['created'],
        });
        expect(state.dateFilters).toEqual({ created: { start: '2024-01-01' } });
      });

      it('deserializes end-only date filter', () => {
        const params = new URLSearchParams('created=..2024-12-31');
        const state = deserializeSearchParams(params, {
          dateFields: ['created'],
        });
        expect(state.dateFilters).toEqual({ created: { end: '2024-12-31' } });
      });
    });

    describe('selective filter deserialization', () => {
      it('deserializes selective filter', () => {
        const params = new URLSearchParams('warehouse=warehouse-1');
        const state = deserializeSearchParams(params, {
          selectiveFields: ['warehouse'],
        });
        expect(state.selectiveFilters).toEqual({ warehouse: 'warehouse-1' });
      });
    });

    describe('options', () => {
      it('uses custom param prefix', () => {
        const params = new URLSearchParams('search_q=test');
        const state = deserializeSearchParams(params, { paramPrefix: 'search_' });
        expect(state.query).toBe('test');
      });
    });
  });

  describe('roundtrip', () => {
    it('serialization and deserialization are inverse operations', () => {
      const originalState = createMinimalState({
        query: 'laptop & accessories',
        page: 3,
        perPage: 50,
        sortBy: 'price:asc',
        disjunctiveFacets: {
          status: ['active', 'pending'],
          category: ['electronics'],
        },
        numericFilters: {
          price: { min: 100, max: 500 },
        },
        dateFilters: {
          created: { start: '2024-01-01', end: '2024-12-31' },
        },
        selectiveFilters: {
          warehouse: 'warehouse-1',
        },
      });

      const options = {
        facetFields: ['status', 'category'],
        numericFields: ['price'],
        dateFields: ['created'],
        selectiveFields: ['warehouse'],
      };

      const params = serializeSearchState(originalState);
      const deserializedState = deserializeSearchParams(params, options);

      expect(deserializedState.query).toBe(originalState.query);
      expect(deserializedState.page).toBe(originalState.page);
      expect(deserializedState.perPage).toBe(originalState.perPage);
      expect(deserializedState.sortBy).toBe(originalState.sortBy);
      expect(deserializedState.disjunctiveFacets).toEqual(originalState.disjunctiveFacets);
      expect(deserializedState.numericFilters).toEqual(originalState.numericFilters);
      expect(deserializedState.dateFilters).toEqual(originalState.dateFilters);
      expect(deserializedState.selectiveFilters).toEqual(originalState.selectiveFilters);
    });

    it('roundtrips multi-sort correctly', () => {
      const originalState = createMinimalState({
        multiSortBy: [
          { field: 'rating', order: 'desc' },
          { field: 'price', order: 'asc' },
        ],
      });

      const params = serializeSearchState(originalState);
      const deserializedState = deserializeSearchParams(params);

      expect(deserializedState.multiSortBy).toEqual(originalState.multiSortBy);
    });
  });
});
