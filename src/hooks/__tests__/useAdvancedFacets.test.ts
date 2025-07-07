/**
 * @fileoverview Tests for useAdvancedFacets hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdvancedFacets, parseFilters, hasActiveFilters, getActiveFilterValues } from '../useAdvancedFacets';
import { createSearchProviderWrapper } from '../../test/testUtils';

describe('useAdvancedFacets', () => {
  describe('Hook functionality', () => {
    it('initializes with empty filter states', () => {
      const { result } = renderHook(() => useAdvancedFacets(), {
        wrapper: createSearchProviderWrapper(),
      });

      expect(result.current.disjunctiveFacets).toEqual({});
      expect(result.current.numericFilters).toEqual({});
      expect(result.current.dateFilters).toEqual({});
      expect(result.current.selectiveFilters).toEqual({});
      expect(result.current.customFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('toggles disjunctive facet values', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper(),
      });

      act(() => {
        result.current.actions.toggleFacetValue('category', 'Electronics');
      });

      expect(result.current.disjunctiveFacets).toEqual({
        category: ['Electronics'],
      });
      expect(result.current.activeFilterCount).toBe(1);
      expect(onFacetChange).toHaveBeenCalledWith('disjunctive', 'category', 'Electronics');

      act(() => {
        result.current.actions.toggleFacetValue('category', 'Books');
      });

      expect(result.current.disjunctiveFacets).toEqual({
        category: ['Electronics', 'Books'],
      });
      expect(result.current.activeFilterCount).toBe(2);

      // Toggle off
      act(() => {
        result.current.actions.toggleFacetValue('category', 'Electronics');
      });

      expect(result.current.disjunctiveFacets).toEqual({
        category: ['Books'],
      });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('sets numeric filters', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper(),
      });

      act(() => {
        result.current.actions.setNumericFilter('price', 10, 100);
      });

      expect(result.current.numericFilters).toEqual({
        price: { min: 10, max: 100 },
      });
      expect(result.current.activeFilterCount).toBe(1);
      expect(onFacetChange).toHaveBeenCalledWith('numeric', 'price', { min: 10, max: 100 });

      // Update existing filter
      act(() => {
        result.current.actions.setNumericFilter('price', 20, 200);
      });

      expect(result.current.numericFilters).toEqual({
        price: { min: 20, max: 200 },
      });
      expect(result.current.activeFilterCount).toBe(1);

      // Set only min
      act(() => {
        result.current.actions.setNumericFilter('rating', 4);
      });

      expect(result.current.numericFilters).toEqual({
        price: { min: 20, max: 200 },
        rating: { min: 4 },
      });
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('sets date filters', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper(),
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      act(() => {
        result.current.actions.setDateFilter('created_at', startDate, endDate);
      });

      expect(result.current.dateFilters).toEqual({
        created_at: { start: startDate, end: endDate },
      });
      expect(result.current.activeFilterCount).toBe(1);
      expect(onFacetChange).toHaveBeenCalledWith('date', 'created_at', { start: startDate, end: endDate });

      // Set with string dates
      act(() => {
        result.current.actions.setDateFilter('updated_at', '2023-06-01', '2023-06-30');
      });

      expect(result.current.dateFilters).toEqual({
        created_at: { start: startDate, end: endDate },
        updated_at: { start: '2023-06-01', end: '2023-06-30' },
      });
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('sets selective filters', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper(),
      });

      act(() => {
        result.current.actions.setSelectiveFilter('status', 'active');
      });

      expect(result.current.selectiveFilters).toEqual({
        status: 'active',
      });
      expect(result.current.activeFilterCount).toBe(1);
      expect(onFacetChange).toHaveBeenCalledWith('selective', 'status', 'active');

      // Replace existing filter
      act(() => {
        result.current.actions.setSelectiveFilter('status', 'inactive');
      });

      expect(result.current.selectiveFilters).toEqual({
        status: 'inactive',
      });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('sets custom filters', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper(),
      });

      act(() => {
        result.current.actions.setCustomFilter('tags', ['featured', 'new']);
      });

      expect(result.current.customFilters).toEqual({
        tags: ['featured', 'new'],
      });
      expect(result.current.activeFilterCount).toBe(1); // Counts as single filter
      expect(onFacetChange).toHaveBeenCalledWith('custom', 'tags', ['featured', 'new']);

      // Update with new values
      act(() => {
        result.current.actions.setCustomFilter('tags', ['sale']);
      });

      expect(result.current.customFilters).toEqual({
        tags: ['sale'],
      });
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('clears specific filters', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper({
          initialState: {
            disjunctiveFacets: { category: ['Electronics'] },
            numericFilters: { price: { min: 10, max: 100 } },
            dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
            selectiveFilters: { status: 'active' },
            customFilters: { tags: ['featured'] },
          },
        }),
      });

      expect(result.current.activeFilterCount).toBe(5);

      act(() => {
        result.current.actions.clearFilter('category', 'disjunctive');
      });

      expect(result.current.disjunctiveFacets).toEqual({});
      expect(result.current.activeFilterCount).toBe(4);
      expect(onFacetChange).toHaveBeenCalledWith('disjunctive', 'category', null);

      act(() => {
        result.current.actions.clearFilter('price', 'numeric');
      });

      expect(result.current.numericFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(3);

      act(() => {
        result.current.actions.clearFilter('created_at', 'date');
      });

      expect(result.current.dateFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(2);

      act(() => {
        result.current.actions.clearFilter('status', 'selective');
      });

      expect(result.current.selectiveFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(1);

      act(() => {
        result.current.actions.clearFilter('tags', 'custom');
      });

      expect(result.current.customFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('clears all filters', () => {
      const onFacetChange = vi.fn();
      const { result } = renderHook(() => useAdvancedFacets(onFacetChange), {
        wrapper: createSearchProviderWrapper({
          initialState: {
            disjunctiveFacets: { 
              category: ['Electronics', 'Books'],
              brand: ['Apple', 'Samsung'],
            },
            numericFilters: { 
              price: { min: 10, max: 100 },
              rating: { min: 4 },
            },
            dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
            selectiveFilters: { status: 'active' },
            customFilters: { tags: ['featured', 'new'] },
          },
        }),
      });

      expect(result.current.activeFilterCount).toBe(9);

      act(() => {
        result.current.actions.clearAllFilters();
      });

      expect(result.current.disjunctiveFacets).toEqual({});
      expect(result.current.numericFilters).toEqual({});
      expect(result.current.dateFilters).toEqual({});
      expect(result.current.selectiveFilters).toEqual({});
      expect(result.current.customFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(0);
      expect(onFacetChange).toHaveBeenCalledWith('all', '', null);
    });

    it('correctly counts active filters', () => {
      const { result } = renderHook(() => useAdvancedFacets(), {
        wrapper: createSearchProviderWrapper({
          initialState: {
            disjunctiveFacets: { 
              category: ['Electronics', 'Books', 'Music'], // 3 values
              brand: ['Apple'], // 1 value
            },
            numericFilters: { 
              price: { min: 10, max: 100 }, // 1 filter
              rating: { min: 4 }, // 1 filter
            },
            dateFilters: { 
              created_at: { start: '2023-01-01', end: '2023-12-31' }, // 1 filter
            },
            selectiveFilters: { 
              status: 'active', // 1 filter
              availability: 'in_stock', // 1 filter
            },
            customFilters: { 
              tags: ['featured', 'new', 'sale'], // 1 filter (counts as one)
              colors: ['red', 'blue'], // 1 filter (counts as one)
            },
          },
        }),
      });

      // 3 + 1 (disjunctive) + 2 (numeric) + 1 (date) + 2 (selective) + 2 (custom) = 11
      expect(result.current.activeFilterCount).toBe(11);
    });
  });

  describe('Helper functions', () => {
    describe('parseFilters', () => {
      it('calls parseFilterString from utils', () => {
        const filterString = 'category:electronics && price:>100';
        const result = parseFilters(filterString);
        expect(result).toBeDefined();
      });
    });

    describe('hasActiveFilters', () => {
      it('returns true when field has disjunctive facets', () => {
        const filters = {
          disjunctiveFacets: { category: ['Electronics'] },
        };
        expect(hasActiveFilters('category', filters)).toBe(true);
        expect(hasActiveFilters('brand', filters)).toBe(false);
      });

      it('returns true when field has numeric filters', () => {
        const filters = {
          numericFilters: { price: { min: 10, max: 100 } },
        };
        expect(hasActiveFilters('price', filters)).toBe(true);
        expect(hasActiveFilters('rating', filters)).toBe(false);
      });

      it('returns true when field has date filters', () => {
        const filters = {
          dateFilters: { created_at: { start: '2023-01-01', end: '2023-12-31' } },
        };
        expect(hasActiveFilters('created_at', filters)).toBe(true);
        expect(hasActiveFilters('updated_at', filters)).toBe(false);
      });

      it('returns true when field has selective filters', () => {
        const filters = {
          selectiveFilters: { status: 'active' },
        };
        expect(hasActiveFilters('status', filters)).toBe(true);
        expect(hasActiveFilters('type', filters)).toBe(false);
      });

      it('returns true when field has custom filters', () => {
        const filters = {
          customFilters: { tags: ['featured'] },
        };
        expect(hasActiveFilters('tags', filters)).toBe(true);
        expect(hasActiveFilters('colors', filters)).toBe(false);
      });

      it('returns false when field has no filters', () => {
        const filters = {
          disjunctiveFacets: { category: [] }, // Empty array
          numericFilters: {},
          dateFilters: {},
          selectiveFilters: {},
          customFilters: { tags: [] }, // Empty array
        };
        expect(hasActiveFilters('category', filters)).toBe(false);
        expect(hasActiveFilters('tags', filters)).toBe(false);
        expect(hasActiveFilters('price', filters)).toBe(false);
      });
    });

    describe('getActiveFilterValues', () => {
      it('returns disjunctive facet values', () => {
        const filters = {
          disjunctiveFacets: { category: ['Electronics', 'Books'] },
        };
        expect(getActiveFilterValues('category', filters)).toEqual(['Electronics', 'Books']);
      });

      it('returns selective filter value', () => {
        const filters = {
          selectiveFilters: { status: 'active' },
        };
        expect(getActiveFilterValues('status', filters)).toEqual(['active']);
      });

      it('returns custom filter values', () => {
        const filters = {
          customFilters: { tags: ['featured', 'new'] },
        };
        expect(getActiveFilterValues('tags', filters)).toEqual(['featured', 'new']);
      });

      it('combines values from multiple filter types', () => {
        const filters = {
          disjunctiveFacets: { field: ['value1', 'value2'] },
          selectiveFilters: { field: 'value3' },
          customFilters: { field: ['value4', 'value5'] },
        };
        expect(getActiveFilterValues('field', filters)).toEqual(['value1', 'value2', 'value3', 'value4', 'value5']);
      });

      it('returns empty array when field has no values', () => {
        const filters = {
          disjunctiveFacets: {},
          selectiveFilters: {},
          customFilters: {},
        };
        expect(getActiveFilterValues('field', filters)).toEqual([]);
      });

      it('handles undefined filter states', () => {
        const filters = {};
        expect(getActiveFilterValues('field', filters)).toEqual([]);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles undefined onFacetChange callback', () => {
      const { result } = renderHook(() => useAdvancedFacets(), {
        wrapper: createSearchProviderWrapper(),
      });

      // Should not throw
      expect(() => {
        act(() => {
          result.current.actions.toggleFacetValue('category', 'Electronics');
        });
      }).not.toThrow();
    });

    it('handles clearing non-existent filters', () => {
      const { result } = renderHook(() => useAdvancedFacets(), {
        wrapper: createSearchProviderWrapper(),
      });

      // Should not throw
      expect(() => {
        act(() => {
          result.current.actions.clearFilter('nonexistent', 'disjunctive');
        });
      }).not.toThrow();
    });

    it('handles empty custom filter arrays', () => {
      const { result } = renderHook(() => useAdvancedFacets(), {
        wrapper: createSearchProviderWrapper(),
      });

      act(() => {
        result.current.actions.setCustomFilter('tags', []);
      });

      expect(result.current.customFilters).toEqual({});
      expect(result.current.activeFilterCount).toBe(0);
    });
  });
});