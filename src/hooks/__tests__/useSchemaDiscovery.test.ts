import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSchemaDiscovery } from '../useSchemaDiscovery';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';

// Mock the SearchProvider hook
vi.mock('../../providers/SearchProvider', () => ({
  useSearchContext: vi.fn()
}));

import { useSearchContext } from '../../providers/SearchProvider';

describe('useSchemaDiscovery', () => {
  let mockClient: any;
  let mockContext: any;
  
  const mockSchema: CollectionSchema = {
    name: 'products',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string', facet: true },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string', facet: true },
      { name: 'price', type: 'float', facet: true },
      { name: 'rating', type: 'int32', facet: true },
      { name: 'in_stock', type: 'bool', facet: true },
      { name: 'tags', type: 'string[]', facet: true },
      { name: 'created_at', type: 'int64' }
    ],
    default_sorting_field: 'created_at'
  };

  // Helper to update mock context
  const updateMockContext = (updates: Partial<typeof mockContext>) => {
    mockContext = { ...mockContext, ...updates };
    vi.mocked(useSearchContext).mockReturnValue(mockContext);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      retrieveSchema: vi.fn().mockResolvedValue(mockSchema)
    };
    
    mockContext = {
      state: { schema: null },
      client: mockClient,
      collection: 'products'
    };
    
    vi.mocked(useSearchContext).mockReturnValue(mockContext);
  });

  describe('basic functionality', () => {
    it('discovers schema on mount', async () => {
      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.schema).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockClient.retrieveSchema).toHaveBeenCalledWith('products');
    });

    it('handles schema fetch errors', async () => {
      const error = new Error('Schema not found');
      vi.mocked(mockClient.retrieveSchema).mockRejectedValue(error);

      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toEqual(error);
      expect(result.current.schema).toBeNull();
    });

    it('does not fetch schema when already loaded', () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.schema).toEqual(mockSchema);
      expect(mockClient.retrieveSchema).not.toHaveBeenCalled();
    });

    it('calls onSchemaLoad callback when schema is loaded', async () => {
      const onSchemaLoad = vi.fn();
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({ onSchemaLoad })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onSchemaLoad).toHaveBeenCalledWith(mockSchema);
    });
  });

  describe('facet configuration generation', () => {
    it('generates facet configurations from schema', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.facetConfigs).toHaveLength(6);
      expect(result.current.facetConfigs.map(f => f.field)).toEqual([
        'name', 'category', 'price', 'rating', 'in_stock', 'tags'
      ]);
      
      // Check facet types
      const priceFacet = result.current.facetConfigs.find(f => f.field === 'price');
      expect(priceFacet?.type).toBe('numeric');
      
      const categoryFacet = result.current.facetConfigs.find(f => f.field === 'category');
      // category is in the default select patterns, so it will be select type
      expect(categoryFacet?.type).toBe('select');
      expect(categoryFacet?.disjunctive).toBe(true); // checkbox facets are disjunctive by default
      
      const inStockFacet = result.current.facetConfigs.find(f => f.field === 'in_stock');
      expect(inStockFacet?.type).toBe('select');
    });

    it('identifies searchable fields', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.searchableFields).toContain('name');
      expect(result.current.searchableFields).toContain('description');
      expect(result.current.searchableFields).toContain('category');
      expect(result.current.searchableFields).toContain('tags');
      // Note: All fields are considered searchable in the current implementation
    });

    it('identifies sortable fields', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      const sortableFields = result.current.sortableFields;
      // All fields except array types are sortable
      expect(sortableFields.length).toBeGreaterThan(0);
      expect(sortableFields.map(f => f.field)).toContain('price');
      expect(sortableFields.map(f => f.field)).toContain('rating');
      expect(sortableFields.map(f => f.field)).toContain('created_at');
    });

    it('excludes fields based on patterns', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({ excludeFields: ['tags', 'rating'] })
      );

      const facetFields = result.current.facetConfigs.map(f => f.field);
      expect(facetFields).not.toContain('tags');
      expect(facetFields).not.toContain('rating');
      expect(facetFields).toContain('name');
      expect(facetFields).toContain('category');
    });

    it('respects maxFacets option', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({ maxFacets: 3 })
      );

      expect(result.current.facetConfigs).toHaveLength(3);
    });

    it('excludes numeric facets when includeNumericFacets is false', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({ includeNumericFacets: false })
      );

      const facetFields = result.current.facetConfigs.map(f => f.field);
      expect(facetFields).not.toContain('price');
      expect(facetFields).not.toContain('rating');
      expect(facetFields).toContain('name');
      expect(facetFields).toContain('category');
    });

    it('applies facet overrides', async () => {
      mockContext.state.schema = mockSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({
          facetOverrides: {
            category: { label: 'Product Category', expanded: false },
            price: { type: 'range' as const }
          }
        })
      );

      const categoryFacet = result.current.facetConfigs.find(f => f.field === 'category');
      expect(categoryFacet?.label).toBe('Product Category');
      expect(categoryFacet?.expanded).toBe(false);
      
      const priceFacet = result.current.facetConfigs.find(f => f.field === 'price');
      expect(priceFacet?.type).toBe('range');
    });
  });

  describe('pattern configurations', () => {
    it('uses custom date patterns', async () => {
      const dateSchema: CollectionSchema = {
        name: 'events',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'event_date', type: 'string', facet: true },
          { name: 'start_time', type: 'int64', facet: true },
          { name: 'created_at', type: 'int64', facet: true }
        ]
      };
      
      mockContext.state.schema = dateSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({
          patterns: {
            datePatterns: [
              { pattern: 'date', matchType: 'contains' },
              { pattern: 'time', matchType: 'contains' }
            ]
          }
        })
      );

      const dateFacets = result.current.facetConfigs.filter(f => f.type === 'date');
      expect(dateFacets.length).toBeGreaterThan(0);
      expect(dateFacets.map(f => f.field)).toContain('event_date');
      
      // start_time is int64, so it will be numeric type unless it matches date patterns
      const startTimeFacet = result.current.facetConfigs.find(f => f.field === 'start_time');
      expect(startTimeFacet?.type).toBe('numeric'); // int64 fields default to numeric
    });

    it('uses custom select patterns', async () => {
      const statusSchema: CollectionSchema = {
        name: 'orders',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'status', type: 'string', facet: true },
          { name: 'order_type', type: 'string', facet: true },
          { name: 'description', type: 'string', facet: true }
        ]
      };
      
      mockContext.state.schema = statusSchema;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery({
          patterns: {
            selectFieldPatterns: [
              { pattern: 'status', matchType: 'exact' },
              { pattern: 'type', matchType: 'contains' }
            ]
          }
        })
      );

      const statusFacet = result.current.facetConfigs.find(f => f.field === 'status');
      expect(statusFacet?.type).toBe('select');
      
      const typeFacet = result.current.facetConfigs.find(f => f.field === 'order_type');
      expect(typeFacet?.type).toBe('select');
      
      const descFacet = result.current.facetConfigs.find(f => f.field === 'description');
      expect(descFacet?.type).toBe('checkbox');
    });
  });

  describe('edge cases', () => {
    it('handles empty schema fields', async () => {
      const emptySchema: CollectionSchema = {
        name: 'empty',
        fields: []
      };
      mockContext.state.schema = emptySchema;

      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.facetConfigs).toEqual([]);
      expect(result.current.searchableFields).toEqual([]);
      expect(result.current.sortableFields).toEqual([]);
    });

    it('handles schema without facetable fields', async () => {
      const noFacetsSchema: CollectionSchema = {
        name: 'nofacets',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' }
        ]
      };
      mockContext.state.schema = noFacetsSchema;

      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.facetConfigs).toEqual([]);
    });

    it('handles complex field types', async () => {
      const complexSchema: CollectionSchema = {
        name: 'complex',
        fields: [
          { name: 'nested', type: 'object' },
          { name: 'geo', type: 'geopoint' },
          { name: 'multi', type: 'string[]', facet: true }
        ]
      };
      mockContext.state.schema = complexSchema;

      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      const multiFacet = result.current.facetConfigs.find(f => f.field === 'multi');
      expect(multiFacet).toBeDefined();
      expect(multiFacet?.type).toBe('checkbox');
      expect(multiFacet?.disjunctive).toBe(true); // Array fields are disjunctive
    });

    it('returns empty arrays before schema is loaded', () => {
      mockContext.state.schema = null;
      
      const { result } = renderHook(() => 
        useSchemaDiscovery()
      );

      expect(result.current.facetConfigs).toEqual([]);
      expect(result.current.searchableFields).toEqual([]);
      expect(result.current.sortableFields).toEqual([]);
    });

    it('handles disjunctive facet patterns', async () => {
      const disjunctiveSchema: CollectionSchema = {
        name: 'products',
        fields: [
          { name: 'categories', type: 'string', facet: true },
          { name: 'tags', type: 'string', facet: true },
          { name: 'brand', type: 'string', facet: true }
        ]
      };
      mockContext.state.schema = disjunctiveSchema;

      const { result } = renderHook(() => 
        useSchemaDiscovery({
          patterns: {
            disjunctivePatterns: [
              { pattern: 'categories', matchType: 'exact' },
              { pattern: 'tags', matchType: 'exact' }
            ]
          }
        })
      );

      const categoriesFacet = result.current.facetConfigs.find(f => f.field === 'categories');
      expect(categoriesFacet?.disjunctive).toBe(true);
      
      const tagsFacet = result.current.facetConfigs.find(f => f.field === 'tags');
      expect(tagsFacet?.disjunctive).toBe(true);
      
      const brandFacet = result.current.facetConfigs.find(f => f.field === 'brand');
      expect(brandFacet?.disjunctive).toBe(true); // All checkbox facets are disjunctive by default
    });
  });
});

describe('useSchemaDiscovery helper functions', () => {
  describe('shouldBeDisjunctive', () => {
    it('returns true for array fields', async () => {
      const { shouldBeDisjunctive } = await import('../useSchemaDiscovery');
      expect(shouldBeDisjunctive({ name: 'tags', type: 'string[]' })).toBe(true);
    });

    it('uses pattern matching for non-array fields', async () => {
      const { shouldBeDisjunctive } = await import('../useSchemaDiscovery');
      const patterns = [{ pattern: 'categories', matchType: 'exact' as const }];
      expect(shouldBeDisjunctive({ name: 'categories', type: 'string' }, patterns)).toBe(true);
      expect(shouldBeDisjunctive({ name: 'other', type: 'string' }, patterns)).toBe(false);
    });
  });

  describe('getDefaultSortField', () => {
    it('returns default_sorting_field from schema if present', async () => {
      const { getDefaultSortField } = await import('../useSchemaDiscovery');
      const schema: CollectionSchema = {
        name: 'test',
        fields: [],
        default_sorting_field: 'created_at'
      } as any;
      expect(getDefaultSortField(schema)).toBe('created_at:desc');
    });

    it('finds timestamp field by pattern', async () => {
      const { getDefaultSortField } = await import('../useSchemaDiscovery');
      const schema: CollectionSchema = {
        name: 'test',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'created_at', type: 'int64', index: true }
        ]
      };
      expect(getDefaultSortField(schema)).toBe('created_at:desc');
    });

    it('falls back to first numeric field', async () => {
      const { getDefaultSortField } = await import('../useSchemaDiscovery');
      const schema: CollectionSchema = {
        name: 'test',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'score', type: 'float', index: true }
        ]
      };
      expect(getDefaultSortField(schema)).toBe('score:desc');
    });

    it('returns empty string if no suitable field found', async () => {
      const { getDefaultSortField } = await import('../useSchemaDiscovery');
      const schema: CollectionSchema = {
        name: 'test',
        fields: [
          { name: 'data', type: 'object' }
        ]
      };
      expect(getDefaultSortField(schema)).toBe('');
    });

    it('handles null schema', async () => {
      const { getDefaultSortField } = await import('../useSchemaDiscovery');
      expect(getDefaultSortField(null)).toBe('');
    });
  });
});