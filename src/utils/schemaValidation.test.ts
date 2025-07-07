/**
 * @fileoverview Tests for schemaValidation utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateFieldCapabilities,
  findFieldsWithCapabilities,
  getFirstValidField,
  getValidFields,
  isValidSortField,
  isValidFacetField,
  isValidSearchField,
  type FieldCapabilities,
  type ValidatedField
} from './schemaValidation';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';
import { type FieldPattern } from './schemaPatterns';

describe('schemaValidation', () => {
  describe('validateFieldCapabilities', () => {
    it('validates facetable capability', () => {
      const facetableField = { name: 'category', facet: true, type: 'string' };
      const nonFacetableField = { name: 'description', facet: false, type: 'string' };
      
      const capabilities: FieldCapabilities = { facetable: true };
      
      const validResult = validateFieldCapabilities(facetableField, capabilities);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      const invalidResult = validateFieldCapabilities(nonFacetableField, capabilities);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Field "description" is not facetable');
    });

    it('validates sortable capability', () => {
      const sortableField = { name: 'price', sort: true, type: 'float' };
      const nonSortableField = { name: 'tags', sort: false, type: 'string[]' };
      
      const capabilities: FieldCapabilities = { sortable: true };
      
      const validResult = validateFieldCapabilities(sortableField, capabilities);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      const invalidResult = validateFieldCapabilities(nonSortableField, capabilities);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Field "tags" is not sortable');
    });

    it('validates indexed capability', () => {
      const indexedField = { name: 'title', index: true, type: 'string' };
      const nonIndexedField = { name: 'internal_id', index: false, type: 'string' };
      
      const capabilities: FieldCapabilities = { indexed: true };
      
      const validResult = validateFieldCapabilities(indexedField, capabilities);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      const invalidResult = validateFieldCapabilities(nonIndexedField, capabilities);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Field "internal_id" is not indexed');
    });

    it('validates type requirements', () => {
      const stringField = { name: 'title', type: 'string' };
      const numberField = { name: 'price', type: 'float' };
      
      const capabilities: FieldCapabilities = { types: ['string', 'string[]'] };
      
      const validResult = validateFieldCapabilities(stringField, capabilities);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      const invalidResult = validateFieldCapabilities(numberField, capabilities);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Field "price" type "float" is not one of: string, string[]');
    });

    it('validates multiple capabilities', () => {
      const field = { 
        name: 'category', 
        facet: true, 
        sort: false, 
        index: true,
        type: 'string' 
      };
      
      const capabilities: FieldCapabilities = { 
        facetable: true, 
        sortable: true, 
        indexed: true,
        types: ['string']
      };
      
      const result = validateFieldCapabilities(field, capabilities);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContain('Field "category" is not sortable');
    });

    it('returns valid result when no capabilities specified', () => {
      const field = { name: 'any_field', type: 'string' };
      const result = validateFieldCapabilities(field, {});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('handles fields without capability flags gracefully', () => {
      const minimalField = { name: 'field', type: 'string' };
      const capabilities: FieldCapabilities = { facetable: true };
      
      const result = validateFieldCapabilities(minimalField, capabilities);
      expect(result.isValid).toBe(true); // undefined facet is not the same as facet: false
    });
  });

  describe('findFieldsWithCapabilities', () => {
    const mockSchema: CollectionSchema = {
      name: 'test',
      fields: [
        { name: 'created_at', type: 'int64', facet: true, sort: true, index: true },
        { name: 'updated_at', type: 'int64', facet: false, sort: true, index: true },
        { name: 'tags', type: 'string[]', facet: true, sort: false, index: true },
        { name: 'description', type: 'string', facet: false, sort: false, index: true },
        { name: 'price', type: 'float', facet: true, sort: true, index: true }
      ]
    };

    it('finds fields matching patterns', () => {
      const patterns: FieldPattern[] = [
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      const results = findFieldsWithCapabilities(mockSchema, patterns);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.field.name)).toEqual(['created_at', 'updated_at']);
    });

    it('validates capabilities for matched fields', () => {
      const patterns: FieldPattern[] = [
        { pattern: '_at', matchType: 'endsWith' }
      ];
      const capabilities: FieldCapabilities = { facetable: true };
      
      const results = findFieldsWithCapabilities(mockSchema, patterns, capabilities);
      expect(results).toHaveLength(2);
      
      const createdAtResult = results.find(r => r.field.name === 'created_at');
      expect(createdAtResult?.isValid).toBe(true);
      
      const updatedAtResult = results.find(r => r.field.name === 'updated_at');
      expect(updatedAtResult?.isValid).toBe(false);
      expect(updatedAtResult?.errors).toContain('Field "updated_at" is not facetable');
    });

    it('returns empty array for null schema', () => {
      const patterns: FieldPattern[] = [{ pattern: 'test', matchType: 'exact' }];
      expect(findFieldsWithCapabilities(null, patterns)).toEqual([]);
    });

    it('returns empty array for schema without fields', () => {
      const emptySchema: CollectionSchema = { name: 'test', fields: undefined as any };
      const patterns: FieldPattern[] = [{ pattern: 'test', matchType: 'exact' }];
      expect(findFieldsWithCapabilities(emptySchema, patterns)).toEqual([]);
    });

    it('returns empty array when no fields match patterns', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'nonexistent', matchType: 'exact' }
      ];
      
      const results = findFieldsWithCapabilities(mockSchema, patterns);
      expect(results).toHaveLength(0);
    });
  });

  describe('getFirstValidField', () => {
    const mockSchema: CollectionSchema = {
      name: 'test',
      fields: [
        { name: 'created_at', type: 'int64', sort: false, index: true },
        { name: 'updated_at', type: 'int64', sort: true, index: true },
        { name: 'published_at', type: 'int64', sort: true, index: false },
        { name: 'deleted_at', type: 'string', sort: true, index: true }
      ]
    };

    it('returns first field matching pattern with valid capabilities', () => {
      const patterns: FieldPattern[] = [
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      const field = getFirstValidField(mockSchema, patterns, { sortable: true });
      expect(field?.name).toBe('updated_at');
    });

    it('returns null when no fields match capabilities', () => {
      const patterns: FieldPattern[] = [
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      const field = getFirstValidField(mockSchema, patterns, { 
        sortable: true, 
        types: ['float'] 
      });
      expect(field).toBeNull();
    });

    it('returns first matching field when no capabilities specified', () => {
      const patterns: FieldPattern[] = [
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      const field = getFirstValidField(mockSchema, patterns);
      expect(field?.name).toBe('created_at');
    });

    it('validates multiple capabilities', () => {
      const patterns: FieldPattern[] = [
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      const field = getFirstValidField(mockSchema, patterns, { 
        sortable: true,
        indexed: true,
        types: ['int64']
      });
      expect(field?.name).toBe('updated_at');
    });

    it('returns null for null schema', () => {
      const patterns: FieldPattern[] = [{ pattern: 'test', matchType: 'exact' }];
      expect(getFirstValidField(null, patterns)).toBeNull();
    });
  });

  describe('getValidFields', () => {
    const mockSchema: CollectionSchema = {
      name: 'test',
      fields: [
        { name: 'status', type: 'string', facet: true },
        { name: 'user_status', type: 'string', facet: false },
        { name: 'order_status', type: 'string', facet: true },
        { name: 'payment_status', type: 'int32', facet: true }
      ]
    };

    it('returns all valid fields matching patterns', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'status', matchType: 'contains' }
      ];
      
      const fields = getValidFields(mockSchema, patterns, { facetable: true });
      expect(fields).toHaveLength(3);
      expect(fields.map(f => f.name)).toEqual(['status', 'order_status', 'payment_status']);
    });

    it('returns all matching fields when no capabilities specified', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'status', matchType: 'contains' }
      ];
      
      const fields = getValidFields(mockSchema, patterns);
      expect(fields).toHaveLength(4);
    });

    it('filters by type capability', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'status', matchType: 'contains' }
      ];
      
      const fields = getValidFields(mockSchema, patterns, { 
        facetable: true,
        types: ['string']
      });
      expect(fields).toHaveLength(2);
      expect(fields.map(f => f.name)).toEqual(['status', 'order_status']);
    });

    it('returns empty array for null schema', () => {
      const patterns: FieldPattern[] = [{ pattern: 'test', matchType: 'exact' }];
      expect(getValidFields(null, patterns)).toEqual([]);
    });
  });

  describe('isValidSortField', () => {
    it('returns false for explicitly non-sortable fields', () => {
      expect(isValidSortField({ sort: false, type: 'string' })).toBe(false);
    });

    it('returns false for non-indexed fields', () => {
      expect(isValidSortField({ index: false, type: 'string' })).toBe(false);
    });

    it('returns false for optional fields', () => {
      expect(isValidSortField({ optional: true, type: 'string' })).toBe(false);
    });

    it('returns false for array fields', () => {
      expect(isValidSortField({ type: 'string[]' })).toBe(false);
      expect(isValidSortField({ type: 'int32[]' })).toBe(false);
    });

    it('returns false for object fields', () => {
      expect(isValidSortField({ type: 'object' })).toBe(false);
      expect(isValidSortField({ type: 'object[]' })).toBe(false);
    });

    it('returns false for auto fields', () => {
      expect(isValidSortField({ type: 'auto' })).toBe(false);
    });

    it('returns true for valid sortable types', () => {
      expect(isValidSortField({ type: 'int32' })).toBe(true);
      expect(isValidSortField({ type: 'int64' })).toBe(true);
      expect(isValidSortField({ type: 'float' })).toBe(true);
      expect(isValidSortField({ type: 'string' })).toBe(true);
      expect(isValidSortField({ type: 'bool' })).toBe(true);
    });

    it('returns false for unsupported types', () => {
      expect(isValidSortField({ type: 'geopoint' })).toBe(false);
      expect(isValidSortField({ type: 'unknown' })).toBe(false);
    });

    it('validates all conditions together', () => {
      const validField = {
        type: 'int32',
        sort: true,
        index: true,
        optional: false
      };
      expect(isValidSortField(validField)).toBe(true);

      const invalidField = {
        type: 'int32',
        sort: true,
        index: true,
        optional: true // This makes it invalid
      };
      expect(isValidSortField(invalidField)).toBe(false);
    });
  });

  describe('isValidFacetField', () => {
    it('returns true for fields with facet enabled', () => {
      expect(isValidFacetField({ facet: true, type: 'string' })).toBe(true);
    });

    it('returns false for fields without facet enabled', () => {
      expect(isValidFacetField({ facet: false, type: 'string' })).toBe(false);
      expect(isValidFacetField({ type: 'string' })).toBe(false);
    });

    it('returns false for auto fields even with facet enabled', () => {
      expect(isValidFacetField({ facet: true, type: 'auto' })).toBe(false);
    });

    it('returns false for object fields even with facet enabled', () => {
      expect(isValidFacetField({ facet: true, type: 'object' })).toBe(false);
      expect(isValidFacetField({ facet: true, type: 'object[]' })).toBe(false);
    });

    it('returns true for array fields with facet enabled', () => {
      expect(isValidFacetField({ facet: true, type: 'string[]' })).toBe(true);
      expect(isValidFacetField({ facet: true, type: 'int32[]' })).toBe(true);
    });

    it('returns true for numeric fields with facet enabled', () => {
      expect(isValidFacetField({ facet: true, type: 'int32' })).toBe(true);
      expect(isValidFacetField({ facet: true, type: 'float' })).toBe(true);
    });
  });

  describe('isValidSearchField', () => {
    it('returns false for non-indexed fields', () => {
      expect(isValidSearchField({ index: false, type: 'string' })).toBe(false);
    });

    it('returns true for indexed string fields', () => {
      expect(isValidSearchField({ index: true, type: 'string' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'string[]' })).toBe(true);
    });

    it('returns true for indexed numeric fields', () => {
      expect(isValidSearchField({ index: true, type: 'int32' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'int32[]' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'int64' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'int64[]' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'float' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'float[]' })).toBe(true);
    });

    it('returns true for indexed boolean fields', () => {
      expect(isValidSearchField({ index: true, type: 'bool' })).toBe(true);
      expect(isValidSearchField({ index: true, type: 'bool[]' })).toBe(true);
    });

    it('returns true for indexed auto fields', () => {
      expect(isValidSearchField({ index: true, type: 'auto' })).toBe(true);
    });

    it('returns false for unsearchable types', () => {
      expect(isValidSearchField({ index: true, type: 'object' })).toBe(false);
      expect(isValidSearchField({ index: true, type: 'object[]' })).toBe(false);
      expect(isValidSearchField({ index: true, type: 'geopoint' })).toBe(false);
    });

    it('handles missing index property as indexed', () => {
      expect(isValidSearchField({ type: 'string' })).toBe(true);
    });

    it('validates edge cases', () => {
      expect(isValidSearchField({ index: null as any, type: 'string' })).toBe(true);
      expect(isValidSearchField({ index: undefined, type: 'string' })).toBe(true);
      expect(isValidSearchField({ index: false, type: 'auto' })).toBe(false);
    });
  });
});