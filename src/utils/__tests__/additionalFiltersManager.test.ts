import { describe, it, expect } from 'vitest';
import {
  parseAdditionalFilters,
  mergeAdditionalFilters,
  removeFilterFromAdditionalFilters,
  validateAdditionalFilters,
  hasFieldInAdditionalFilters,
  getFilterForField,
  combineAdditionalFilters,
  updateFilterInAdditionalFilters,
  extractFieldFromFilter
} from '../additionalFiltersManager';

describe('additionalFiltersManager', () => {
  describe('parseAdditionalFilters', () => {
    it('parses simple equality filter', () => {
      const result = parseAdditionalFilters('category:=Electronics');
      expect(result.get('category')).toBe('category:=Electronics');
      expect(result.size).toBe(1);
    });

    it('parses filter with backtick-quoted value', () => {
      const result = parseAdditionalFilters('category:=`Electronics & Gadgets`');
      expect(result.get('category')).toBe('category:=`Electronics & Gadgets`');
    });

    it('parses multiple filters with AND', () => {
      const result = parseAdditionalFilters('category:=Electronics && price:>=100');
      expect(result.get('category')).toBe('category:=Electronics');
      expect(result.get('price')).toBe('price:>=100');
      expect(result.size).toBe(2);
    });

    it('parses array filter', () => {
      const result = parseAdditionalFilters('tags:=[`new`,`featured`]');
      expect(result.get('tags')).toBe('tags:=[`new`,`featured`]');
    });

    it('parses numeric range filter', () => {
      const result = parseAdditionalFilters('price:>=100 && price:<=500');
      // Both price filters would overwrite each other in the Map
      expect(result.has('price')).toBe(true);
    });

    it('parses negation filter', () => {
      const result = parseAdditionalFilters('category:!=Electronics');
      expect(result.get('category')).toBe('category:!=Electronics');
    });

    it('handles empty string', () => {
      const result = parseAdditionalFilters('');
      expect(result.size).toBe(0);
    });

    it('handles null/undefined', () => {
      expect(parseAdditionalFilters(null as any).size).toBe(0);
      expect(parseAdditionalFilters(undefined as any).size).toBe(0);
    });

    it('parses complex nested expressions', () => {
      const result = parseAdditionalFilters('(category:=Electronics || category:=Books) && price:<100');
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('mergeAdditionalFilters', () => {
    it('merges two filter strings', () => {
      const result = mergeAdditionalFilters('category:=Electronics', 'price:>=100');
      expect(result).toBe('category:=Electronics && price:>=100');
    });

    it('handles empty first filter', () => {
      const result = mergeAdditionalFilters('', 'price:>=100');
      expect(result).toBe('price:>=100');
    });

    it('handles empty second filter', () => {
      const result = mergeAdditionalFilters('category:=Electronics', '');
      expect(result).toBe('category:=Electronics');
    });

    it('handles both empty', () => {
      const result = mergeAdditionalFilters('', '');
      expect(result).toBe('');
    });

    it('avoids duplicate filters', () => {
      const result = mergeAdditionalFilters('category:=Electronics', 'category:=Electronics');
      expect(result).toBe('category:=Electronics');
    });

    it('merges complex expressions', () => {
      const result = mergeAdditionalFilters(
        'category:=Electronics && price:>=100',
        'brand:=Apple && in_stock:=true'
      );
      expect(result).toContain('category:=Electronics');
      expect(result).toContain('price:>=100');
      expect(result).toContain('brand:=Apple');
      expect(result).toContain('in_stock:=true');
    });
  });

  describe('removeFilterFromAdditionalFilters', () => {
    it('removes specific field filter', () => {
      const result = removeFilterFromAdditionalFilters(
        'category:=Electronics && price:>=100',
        'category'
      );
      expect(result).toBe('price:>=100');
    });

    it('removes all filters for a field', () => {
      const result = removeFilterFromAdditionalFilters(
        'price:>=100 && price:<=500 && category:=Electronics',
        'price'
      );
      expect(result).toBe('category:=Electronics');
    });

    it('handles removing non-existent field', () => {
      const result = removeFilterFromAdditionalFilters(
        'category:=Electronics',
        'brand'
      );
      expect(result).toBe('category:=Electronics');
    });

    it('handles empty filter string', () => {
      const result = removeFilterFromAdditionalFilters('', 'category');
      expect(result).toBe('');
    });

    it('returns empty string when all filters removed', () => {
      const result = removeFilterFromAdditionalFilters(
        'category:=Electronics',
        'category'
      );
      expect(result).toBe('');
    });
  });

  describe('validateAdditionalFilters', () => {
    it('validates correct filter syntax', () => {
      const result1 = validateAdditionalFilters('category:=Electronics');
      expect(result1.isValid).toBe(true);
      const result2 = validateAdditionalFilters('price:>=100');
      expect(result2.isValid).toBe(true);
    });

    it('validates complex expressions', () => {
      const result = validateAdditionalFilters('category:=Electronics && price:>=100');
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid syntax', () => {
      const result1 = validateAdditionalFilters('category=');
      expect(result1.isValid).toBe(false);
      const result2 = validateAdditionalFilters('invalid filter');
      expect(result2.isValid).toBe(false);
    });

    it('handles empty string', () => {
      const result = validateAdditionalFilters('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('getFilterForField', () => {
    it('gets filter for specific field', () => {
      const filter = getFilterForField(
        'category:=Electronics && price:>=100',
        'category'
      );
      expect(filter).toBe('category:=Electronics');
    });

    it('returns null for non-existent field', () => {
      const filter = getFilterForField(
        'category:=Electronics',
        'brand'
      );
      expect(filter).toBeNull();
    });

    it('handles empty filter string', () => {
      const filter = getFilterForField('', 'category');
      expect(filter).toBeNull();
    });
  });

  describe('hasFieldInAdditionalFilters', () => {
    it('finds existing field', () => {
      expect(hasFieldInAdditionalFilters(
        'category:=Electronics && price:>=100',
        'category'
      )).toBe(true);
    });

    it('returns false for non-existent field', () => {
      expect(hasFieldInAdditionalFilters(
        'category:=Electronics',
        'brand'
      )).toBe(false);
    });

    it('handles empty filter', () => {
      expect(hasFieldInAdditionalFilters('', 'category')).toBe(false);
    });
  });

  describe('extractFieldFromFilter', () => {
    it('extracts field from simple filter', () => {
      const field = extractFieldFromFilter('category:=Electronics');
      expect(field).toBe('category');
    });

    it('extracts field from numeric filter', () => {
      const field = extractFieldFromFilter('price:>=100');
      expect(field).toBe('price');
    });

    it('extracts field from array filter', () => {
      const field = extractFieldFromFilter('tags:=[`new`,`featured`]');
      expect(field).toBe('tags');
    });

    it('returns null for invalid filter', () => {
      const field = extractFieldFromFilter('invalid');
      expect(field).toBeNull();
    });

    it('handles complex field names', () => {
      const field = extractFieldFromFilter('product_category:=Electronics');
      expect(field).toBe('product_category');
    });
  });

  describe('combineAdditionalFilters', () => {
    it('combines filters from Map', () => {
      const filterMap = new Map([
        ['category', 'category:=Electronics'],
        ['price', 'price:>=100']
      ]);
      const result = combineAdditionalFilters(filterMap);
      expect(result).toContain('category:=Electronics');
      expect(result).toContain('price:>=100');
      expect(result).toContain('&&');
    });

    it('handles single filter', () => {
      const filterMap = new Map([
        ['category', 'category:=Electronics']
      ]);
      const result = combineAdditionalFilters(filterMap);
      expect(result).toBe('category:=Electronics');
    });

    it('handles empty Map', () => {
      const filterMap = new Map();
      const result = combineAdditionalFilters(filterMap);
      expect(result).toBe('');
    });
  });

  describe('updateFilterInAdditionalFilters', () => {
    it('updates existing filter', () => {
      const result = updateFilterInAdditionalFilters(
        'category:=Electronics && price:>=100',
        'category',
        'category:=Books'
      );
      expect(result).toContain('category:=Books');
      expect(result).toContain('price:>=100');
    });

    it('adds new filter if field not present', () => {
      const result = updateFilterInAdditionalFilters(
        'category:=Electronics',
        'price',
        'price:>=100'
      );
      expect(result).toContain('category:=Electronics');
      expect(result).toContain('price:>=100');
    });

    it('handles empty initial filters', () => {
      const result = updateFilterInAdditionalFilters(
        '',
        'category',
        'category:=Electronics'
      );
      expect(result).toBe('category:=Electronics');
    });
  });
});