/**
 * @fileoverview Tests for filterBuilder utility functions
 */

import { describe, it, expect } from 'vitest';
import { 
  buildFilter, 
  buildNumericFilter, 
  buildGeoFilter,
  combineFilters,
  buildFacetFilter
} from '../filterBuilder';

describe('filterBuilder', () => {
  describe('buildFilter', () => {
    it('builds simple equality filter', () => {
      const filter = buildFilter('category', 'electronics');
      expect(filter).toBe('category:=electronics');
    });

    it('builds array filter with multiple values', () => {
      const filter = buildFilter('category', ['electronics', 'computers']);
      expect(filter).toBe('category:=[electronics,computers]');
    });

    it('builds exact match filter', () => {
      const filter = buildFilter('title', 'exact match', true);
      expect(filter).toBe('title:=`exact match`');
    });

    it('handles empty values', () => {
      const filter = buildFilter('category', '');
      expect(filter).toBe('');
    });

    it('handles null/undefined values', () => {
      expect(buildFilter('category', null as any)).toBe('');
      expect(buildFilter('category', undefined as any)).toBe('');
    });

    it('escapes special characters in values', () => {
      const filter = buildFilter('name', 'value with spaces & special chars');
      expect(filter).toBe('name:=value with spaces & special chars');
    });

    it('builds negation filter', () => {
      const filter = buildFilter('category', 'electronics', false, true);
      expect(filter).toBe('category:!=electronics');
    });

    it('builds negation filter with array', () => {
      const filter = buildFilter('category', ['electronics', 'computers'], false, true);
      expect(filter).toBe('category:!=[electronics,computers]');
    });
  });

  describe('buildNumericFilter', () => {
    it('builds range filter', () => {
      const filter = buildNumericFilter('price', 10, 100);
      expect(filter).toBe('price:[10..100]');
    });

    it('builds min only filter', () => {
      const filter = buildNumericFilter('price', 10);
      expect(filter).toBe('price:>=10');
    });

    it('builds max only filter', () => {
      const filter = buildNumericFilter('price', undefined, 100);
      expect(filter).toBe('price:<=100');
    });

    it('returns empty string when no values', () => {
      const filter = buildNumericFilter('price');
      expect(filter).toBe('');
    });

    it('handles zero values correctly', () => {
      const filter = buildNumericFilter('price', 0, 100);
      expect(filter).toBe('price:[0..100]');
    });

    it('handles negative values', () => {
      const filter = buildNumericFilter('temperature', -10, 10);
      expect(filter).toBe('temperature:[-10..10]');
    });

    it('builds exact numeric match', () => {
      const filter = buildNumericFilter('quantity', 5, 5);
      expect(filter).toBe('quantity:[5..5]');
    });

    it('handles floating point numbers', () => {
      const filter = buildNumericFilter('rating', 3.5, 4.5);
      expect(filter).toBe('rating:[3.5..4.5]');
    });
  });

  describe('buildGeoFilter', () => {
    it('builds geo radius filter', () => {
      const filter = buildGeoFilter('location', 40.7128, -74.0060, 10);
      expect(filter).toBe('location:(40.7128,-74.0060,10 km)');
    });

    it('builds filter with custom unit', () => {
      const filter = buildGeoFilter('location', 40.7128, -74.0060, 5, 'mi');
      expect(filter).toBe('location:(40.7128,-74.0060,5 mi)');
    });

    it('handles different coordinate formats', () => {
      const filter = buildGeoFilter('location', 51.5074, -0.1278, 20);
      expect(filter).toBe('location:(51.5074,-0.1278,20 km)');
    });

    it('validates coordinates', () => {
      // Invalid latitude
      expect(() => buildGeoFilter('location', 91, 0, 10)).toThrow();
      expect(() => buildGeoFilter('location', -91, 0, 10)).toThrow();
      
      // Invalid longitude
      expect(() => buildGeoFilter('location', 0, 181, 10)).toThrow();
      expect(() => buildGeoFilter('location', 0, -181, 10)).toThrow();
    });

    it('validates radius', () => {
      expect(() => buildGeoFilter('location', 0, 0, -1)).toThrow();
      expect(() => buildGeoFilter('location', 0, 0, 0)).toThrow();
    });
  });

  describe('combineFilters', () => {
    it('combines multiple filters with AND', () => {
      const filters = ['category:=electronics', 'price:[10..100]', 'in_stock:=true'];
      const combined = combineFilters(filters);
      expect(combined).toBe('category:=electronics && price:[10..100] && in_stock:=true');
    });

    it('filters out empty strings', () => {
      const filters = ['category:=electronics', '', 'price:[10..100]', ''];
      const combined = combineFilters(filters);
      expect(combined).toBe('category:=electronics && price:[10..100]');
    });

    it('returns single filter without &&', () => {
      const filters = ['category:=electronics'];
      const combined = combineFilters(filters);
      expect(combined).toBe('category:=electronics');
    });

    it('returns empty string for empty array', () => {
      const combined = combineFilters([]);
      expect(combined).toBe('');
    });

    it('returns empty string for array of empty strings', () => {
      const combined = combineFilters(['', '', '']);
      expect(combined).toBe('');
    });

    it('combines with custom operator', () => {
      const filters = ['category:=electronics', 'category:=computers'];
      const combined = combineFilters(filters, ' || ');
      expect(combined).toBe('category:=electronics || category:=computers');
    });
  });

  describe('buildFacetFilter', () => {
    it('builds facet filter from selections', () => {
      const selections = {
        category: ['electronics', 'computers'],
        brand: ['apple'],
        in_stock: ['true']
      };
      
      const filter = buildFacetFilter(selections);
      expect(filter).toContain('category:=[electronics,computers]');
      expect(filter).toContain('brand:=apple');
      expect(filter).toContain('in_stock:=true');
      expect(filter.split(' && ')).toHaveLength(3);
    });

    it('ignores empty arrays', () => {
      const selections = {
        category: ['electronics'],
        brand: [],
        in_stock: ['true']
      };
      
      const filter = buildFacetFilter(selections);
      expect(filter).toContain('category:=electronics');
      expect(filter).toContain('in_stock:=true');
      expect(filter).not.toContain('brand');
    });

    it('handles single value arrays', () => {
      const selections = {
        category: ['electronics']
      };
      
      const filter = buildFacetFilter(selections);
      expect(filter).toBe('category:=electronics');
    });

    it('returns empty string for no selections', () => {
      const filter = buildFacetFilter({});
      expect(filter).toBe('');
    });

    it('handles special characters in facet values', () => {
      const selections = {
        category: ['Books & Media', 'Home & Garden']
      };
      
      const filter = buildFacetFilter(selections);
      expect(filter).toBe('category:=[Books & Media,Home & Garden]');
    });
  });
});