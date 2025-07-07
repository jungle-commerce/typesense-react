/**
 * @fileoverview Tests for sortBuilder utility functions
 */

import { describe, it, expect } from 'vitest';
import { 
  buildSortBy, 
  buildMultiSortBy,
  parseSortString,
  toggleSortDirection,
  getSortDirection,
  isSortActive
} from '../sortBuilder';

describe('sortBuilder', () => {
  describe('buildSortBy', () => {
    it('builds ascending sort', () => {
      const sort = buildSortBy('name', 'asc');
      expect(sort).toBe('name:asc');
    });

    it('builds descending sort', () => {
      const sort = buildSortBy('price', 'desc');
      expect(sort).toBe('price:desc');
    });

    it('defaults to ascending when no order specified', () => {
      const sort = buildSortBy('name');
      expect(sort).toBe('name:asc');
    });

    it('handles invalid order by defaulting to asc', () => {
      const sort = buildSortBy('name', 'invalid' as any);
      expect(sort).toBe('name:asc');
    });

    it('handles special field names', () => {
      const sort = buildSortBy('_text_match', 'desc');
      expect(sort).toBe('_text_match:desc');
    });
  });

  describe('buildMultiSortBy', () => {
    it('builds multi-field sort string', () => {
      const sorts = [
        { field: 'price', order: 'desc' as const },
        { field: 'name', order: 'asc' as const },
        { field: 'rating', order: 'desc' as const }
      ];
      
      const sortString = buildMultiSortBy(sorts);
      expect(sortString).toBe('price:desc,name:asc,rating:desc');
    });

    it('returns empty string for empty array', () => {
      const sortString = buildMultiSortBy([]);
      expect(sortString).toBe('');
    });

    it('handles single sort', () => {
      const sorts = [{ field: 'price', order: 'desc' as const }];
      const sortString = buildMultiSortBy(sorts);
      expect(sortString).toBe('price:desc');
    });

    it('filters out invalid entries', () => {
      const sorts = [
        { field: 'price', order: 'desc' as const },
        { field: '', order: 'asc' as const },
        { field: 'name', order: 'asc' as const }
      ];
      
      const sortString = buildMultiSortBy(sorts);
      expect(sortString).toBe('price:desc,name:asc');
    });

    it('handles special Typesense fields', () => {
      const sorts = [
        { field: '_text_match', order: 'desc' as const },
        { field: '_geo_distance(location)', order: 'asc' as const }
      ];
      
      const sortString = buildMultiSortBy(sorts);
      expect(sortString).toBe('_text_match:desc,_geo_distance(location):asc');
    });
  });

  describe('parseSortString', () => {
    it('parses single sort string', () => {
      const parsed = parseSortString('price:desc');
      expect(parsed).toEqual([{ field: 'price', order: 'desc' }]);
    });

    it('parses multi-sort string', () => {
      const parsed = parseSortString('price:desc,name:asc,rating:desc');
      expect(parsed).toEqual([
        { field: 'price', order: 'desc' },
        { field: 'name', order: 'asc' },
        { field: 'rating', order: 'desc' }
      ]);
    });

    it('returns empty array for empty string', () => {
      const parsed = parseSortString('');
      expect(parsed).toEqual([]);
    });

    it('handles malformed sort strings', () => {
      const parsed = parseSortString('price:desc,invalid,name:asc');
      expect(parsed).toEqual([
        { field: 'price', order: 'desc' },
        { field: 'name', order: 'asc' }
      ]);
    });

    it('defaults to asc for missing order', () => {
      const parsed = parseSortString('price,name:desc');
      expect(parsed).toEqual([
        { field: 'price', order: 'asc' },
        { field: 'name', order: 'desc' }
      ]);
    });

    it('handles whitespace', () => {
      const parsed = parseSortString(' price:desc , name:asc ');
      expect(parsed).toEqual([
        { field: 'price', order: 'desc' },
        { field: 'name', order: 'asc' }
      ]);
    });
  });

  describe('toggleSortDirection', () => {
    it('toggles from asc to desc', () => {
      const toggled = toggleSortDirection('price:asc');
      expect(toggled).toBe('price:desc');
    });

    it('toggles from desc to asc', () => {
      const toggled = toggleSortDirection('price:desc');
      expect(toggled).toBe('price:asc');
    });

    it('handles field without direction', () => {
      const toggled = toggleSortDirection('price');
      expect(toggled).toBe('price:desc');
    });

    it('returns empty string for empty input', () => {
      const toggled = toggleSortDirection('');
      expect(toggled).toBe('');
    });

    it('handles special fields', () => {
      const toggled = toggleSortDirection('_text_match:desc');
      expect(toggled).toBe('_text_match:asc');
    });
  });

  describe('getSortDirection', () => {
    it('extracts asc direction', () => {
      const direction = getSortDirection('price:asc');
      expect(direction).toBe('asc');
    });

    it('extracts desc direction', () => {
      const direction = getSortDirection('price:desc');
      expect(direction).toBe('desc');
    });

    it('returns null for no direction', () => {
      const direction = getSortDirection('price');
      expect(direction).toBe(null);
    });

    it('returns null for empty string', () => {
      const direction = getSortDirection('');
      expect(direction).toBe(null);
    });

    it('handles invalid format', () => {
      const direction = getSortDirection('price:invalid');
      expect(direction).toBe(null);
    });
  });

  describe('isSortActive', () => {
    it('detects active sort field in single sort', () => {
      expect(isSortActive('price', 'price:desc')).toBe(true);
      expect(isSortActive('name', 'price:desc')).toBe(false);
    });

    it('detects active sort field in multi-sort', () => {
      const sortString = 'price:desc,name:asc,rating:desc';
      expect(isSortActive('price', sortString)).toBe(true);
      expect(isSortActive('name', sortString)).toBe(true);
      expect(isSortActive('rating', sortString)).toBe(true);
      expect(isSortActive('category', sortString)).toBe(false);
    });

    it('returns false for empty sort string', () => {
      expect(isSortActive('price', '')).toBe(false);
    });

    it('returns false for empty field', () => {
      expect(isSortActive('', 'price:desc')).toBe(false);
    });

    it('handles exact field matching', () => {
      expect(isSortActive('price', 'price_min:desc')).toBe(false);
      expect(isSortActive('price_min', 'price:desc')).toBe(false);
    });

    it('handles special characters in field names', () => {
      expect(isSortActive('_text_match', '_text_match:desc')).toBe(true);
      expect(isSortActive('_geo_distance(location)', '_geo_distance(location):asc')).toBe(true);
    });
  });
});