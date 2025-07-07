/**
 * @fileoverview Tests for MultiCollectionClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiCollectionSearchClient } from '../MultiCollectionClient';
import { TypesenseSearchClient } from '../TypesenseClient';
import type { 
  CollectionSearchConfig,
  MultiCollectionSearchRequest,
  MultiCollectionSearchResponse,
} from '../../types/multiCollection';
import { mockTypesenseConfig, mockSearchResponse, mockSchema } from '../../test/mockData';

describe('MultiCollectionClient', () => {
  let mockClient: TypesenseSearchClient;
  let multiClient: MultiCollectionSearchClient;

  beforeEach(() => {
    // Create mock TypesenseSearchClient
    mockClient = {
      search: vi.fn(),
      getSchema: vi.fn(),
      multiSearch: vi.fn(),
      clearCache: vi.fn(),
      getCacheStats: vi.fn(),
      client: {} as any,
    } as any;
    
    // Make the mock object an instance of TypesenseSearchClient
    Object.setPrototypeOf(mockClient, TypesenseSearchClient.prototype);

    multiClient = new MultiCollectionSearchClient(mockClient);
  });

  describe('searchMultipleCollections', () => {
    const defaultCollections: CollectionSearchConfig[] = [
      {
        collection: 'products',
        queryBy: 'name,description',
        maxResults: 10,
        weight: 1.0,
      },
      {
        collection: 'categories',
        queryBy: 'name',
        maxResults: 5,
        weight: 0.8,
      },
    ];

    const defaultRequest: MultiCollectionSearchRequest = {
      query: 'test query',
      collections: defaultCollections,
    };

    it('searches multiple collections in parallel', async () => {
      // Mock responses
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          {
            document: { id: '1', name: 'Product 1' },
            highlight: { name: { snippet: '<mark>Product</mark> 1' } },
            text_match: 100,
          },
          {
            document: { id: '2', name: 'Product 2' },
            highlight: {},
            text_match: 90,
          },
        ],
        found: 2,
        request_params: {
          ...mockSearchResponse.request_params,
          q: 'test query',
          query_by: 'name,description',
        },
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          {
            document: { id: 'c1', name: 'Category 1' },
            highlight: {},
            text_match: 95,
          },
        ],
        found: 1,
        request_params: {
          ...mockSearchResponse.request_params,
          q: 'test query',
          query_by: 'name',
        },
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);

      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections(defaultRequest);

      // Verify both collections were searched
      expect(mockClient.search).toHaveBeenCalledTimes(2);
      expect(mockClient.search).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          q: 'test query',
          query_by: 'name,description',
          per_page: 10,
        }),
        true
      );
      expect(mockClient.search).toHaveBeenCalledWith(
        'categories',
        expect.objectContaining({
          q: 'test query',
          query_by: 'name',
          per_page: 5,
        }),
        true
      );

      // Verify response structure
      expect(result).toMatchObject({
        hits: expect.any(Array),
        found: 3,
        totalFoundByCollection: {
          products: 2,
          categories: 1,
        },
        includedByCollection: {
          products: 2,
          categories: 1,
        },
        searchTimeMs: expect.any(Number),
        searchTimeByCollection: expect.any(Object),
        query: 'test query',
        resultMode: 'interleaved',
      });

      // Verify hits have multi-collection metadata
      expect(result.hits).toHaveLength(3);
      expect(result.hits[0]).toMatchObject({
        _collection: expect.any(String),
        _collectionRank: expect.any(Number),
        _originalScore: expect.any(Number),
        _normalizedScore: expect.any(Number),
        _mergedScore: expect.any(Number),
        _collectionWeight: expect.any(Number),
      });
    });

    it('handles collection search errors gracefully', async () => {
      // Mock one success and one failure
      (mockClient.search as any)
        .mockResolvedValueOnce(mockSearchResponse)
        .mockRejectedValueOnce(new Error('Collection not found'));

      (mockClient.getSchema as any)
        .mockResolvedValueOnce(mockSchema)
        .mockResolvedValueOnce(mockSchema);

      const result = await multiClient.searchMultipleCollections(defaultRequest);

      expect(result.errorsByCollection).toEqual({
        categories: 'Collection not found',
      });
      expect(result.hits).toHaveLength(mockSearchResponse.hits.length);
      expect(result.totalFoundByCollection.products).toBe(mockSearchResponse.found);
    });

    it('merges results by relevance strategy', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: '1' }, text_match: 100 },
          { document: { id: '2' }, text_match: 80 },
        ],
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'c1' }, text_match: 90 },
          { document: { id: 'c2' }, text_match: 70 },
        ],
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        mergeStrategy: 'relevance',
      });

      // Verify ordering by merged score (with weights applied)
      const scores = result.hits.map(hit => hit._mergedScore);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    it('merges results by round-robin strategy', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'p1' } },
          { document: { id: 'p2' } },
          { document: { id: 'p3' } },
        ],
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'c1' } },
          { document: { id: 'c2' } },
        ],
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        mergeStrategy: 'roundRobin',
      });

      // Verify round-robin order: p1, c1, p2, c2, p3
      const ids = result.hits.map(hit => hit.document.id);
      expect(ids).toEqual(['p1', 'c1', 'p2', 'c2', 'p3']);
    });

    it('merges results by collection order strategy', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'p1' } },
          { document: { id: 'p2' } },
        ],
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'c1' } },
          { document: { id: 'c2' } },
        ],
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        mergeStrategy: 'collectionOrder',
      });

      // Verify collection order: all products, then all categories
      const ids = result.hits.map(hit => hit.document.id);
      expect(ids).toEqual(['p1', 'p2', 'c1', 'c2']);
    });

    it('normalizes scores across collections', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: '1' }, text_match: 100 },
          { document: { id: '2' }, text_match: 50 },
        ],
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'c1' }, text_match: 200 },
          { document: { id: 'c2' }, text_match: 100 },
        ],
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        normalizeScores: true,
      });

      // Check normalized scores
      const productHits = result.hits.filter(h => h._collection === 'products');
      const categoryHits = result.hits.filter(h => h._collection === 'categories');

      // Normalized scores should be between 0 and 1
      productHits.forEach(hit => {
        expect(hit._normalizedScore).toBeGreaterThanOrEqual(0);
        expect(hit._normalizedScore).toBeLessThanOrEqual(1);
      });

      categoryHits.forEach(hit => {
        expect(hit._normalizedScore).toBeGreaterThanOrEqual(0);
        expect(hit._normalizedScore).toBeLessThanOrEqual(1);
      });

      // Check that max score in each collection is normalized to 1
      if (productHits.length > 0) {
        expect(Math.max(...productHits.map(h => h._normalizedScore))).toBe(1);
      }
      if (categoryHits.length > 0) {
        expect(Math.max(...categoryHits.map(h => h._normalizedScore))).toBe(1);
      }
    });

    it('applies global max results limit', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: Array(10).fill(null).map((_, i) => ({
          document: { id: `p${i}` },
          text_match: 100 - i,
        })),
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: Array(10).fill(null).map((_, i) => ({
          document: { id: `c${i}` },
          text_match: 90 - i,
        })),
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        globalMaxResults: 5,
      });

      expect(result.hits).toHaveLength(5);
      expect(result.found).toBe(5);
    });

    it('handles highlighting configuration', async () => {
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      await multiClient.searchMultipleCollections({
        ...defaultRequest,
        enableHighlighting: true,
        highlightConfig: {
          startTag: '<em>',
          endTag: '</em>',
          affixNumTokens: 10,
        },
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          highlight_fields: expect.any(String),
          highlight_full_fields: expect.any(String),
          highlight_start_tag: '<em>',
          highlight_end_tag: '</em>',
          highlight_affix_num_tokens: 10,
        }),
        true
      );
    });

    it('includes facets when requested', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        facet_counts: [
          {
            field_name: 'category',
            counts: [
              { value: 'Electronics', count: 10 },
              { value: 'Books', count: 5 },
            ],
          },
        ],
      };

      (mockClient.search as any).mockResolvedValue(productsResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            includeFacets: true,
            facetBy: 'category,brand',
          },
        ],
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          facet_by: 'category,brand',
          max_facet_values: 100,
        }),
        true
      );

      expect(result.facetsByCollection).toEqual({
        products: productsResponse.facet_counts,
      });
    });

    it('handles field inclusion and exclusion', async () => {
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            includeFields: 'id,name,price',
          },
          {
            collection: 'categories',
            excludeFields: 'description,metadata',
          },
        ],
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          include_fields: 'id,name,price',
        }),
        true
      );

      expect(mockClient.search).toHaveBeenCalledWith(
        'categories',
        expect.objectContaining({
          exclude_fields: 'description,metadata',
        }),
        true
      );
    });

    it('returns results per collection when resultMode is perCollection', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'p1' } },
          { document: { id: 'p2' } },
        ],
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'c1' } },
        ],
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        resultMode: 'perCollection',
      });

      expect(result.hits).toHaveLength(0);
      expect(result.hitsByCollection).toBeDefined();
      expect(result.hitsByCollection!.products).toHaveLength(2);
      expect(result.hitsByCollection!.categories).toHaveLength(1);
      expect(result.found).toBe(3); // Total across all collections
    });

    it('returns both merged and per-collection results when resultMode is both', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'p1' }, text_match: 100 },
          { document: { id: 'p2' }, text_match: 80 },
        ],
      };

      const categoriesResponse = {
        ...mockSearchResponse,
        hits: [
          { document: { id: 'c1' }, text_match: 90 },
        ],
      };

      (mockClient.search as any)
        .mockResolvedValueOnce(productsResponse)
        .mockResolvedValueOnce(categoriesResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        ...defaultRequest,
        resultMode: 'both',
      });

      // Should have both merged hits and per-collection hits
      expect(result.hits).toHaveLength(3);
      expect(result.hitsByCollection).toBeDefined();
      expect(result.hitsByCollection!.products).toHaveLength(2);
      expect(result.hitsByCollection!.categories).toHaveLength(1);
    });

    it('applies per-collection max results in perCollection mode', async () => {
      const productsResponse = {
        ...mockSearchResponse,
        hits: Array(10).fill(null).map((_, i) => ({
          document: { id: `p${i}` },
        })),
      };

      (mockClient.search as any).mockResolvedValue(productsResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            maxResults: 3,
          },
        ],
        resultMode: 'perCollection',
      });

      expect(result.hitsByCollection!.products).toHaveLength(3);
    });

    it('uses schema to infer query fields when not specified', async () => {
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            // No queryBy specified
          },
        ],
      });

      // Should use string fields from schema
      expect(mockClient.search).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          query_by: expect.stringContaining('name'),
        }),
        true
      );
    });

    it('uses schema default sort field when not specified', async () => {
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            // No sortBy specified
          },
        ],
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          sort_by: 'created_at:desc',
        }),
        true
      );
    });

    it('applies collection filters', async () => {
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            filterBy: 'in_stock:true && price:<100',
          },
        ],
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          filter_by: 'in_stock:true && price:<100',
        }),
        true
      );
    });

    it('includes namespace in results when specified', async () => {
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [
          {
            collection: 'products',
            namespace: 'product',
          },
        ],
      });

      result.hits.forEach(hit => {
        expect(hit._namespace).toBe('product');
      });
    });

    it('handles empty search results', async () => {
      const emptyResponse = {
        ...mockSearchResponse,
        hits: [],
        found: 0,
      };

      (mockClient.search as any).mockResolvedValue(emptyResponse);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections(defaultRequest);

      expect(result.hits).toHaveLength(0);
      expect(result.found).toBe(0);
      expect(result.totalFoundByCollection).toEqual({
        products: 0,
        categories: 0,
      });
    });

    it('handles score extraction for different score types', async () => {
      const responseWithDifferentScores = {
        ...mockSearchResponse,
        hits: [
          { document: { id: '1' }, text_match: 123456 },
          { document: { id: '2' }, text_match: 1000 },
          { document: { id: '3' }, text_match: 50 },
          { document: { id: '4' }, text_match: 1 }, // Default score
        ],
      };

      (mockClient.search as any).mockResolvedValue(responseWithDifferentScores);
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);

      const result = await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [{ collection: 'products' }],
      });

      expect(result.hits[0]._originalScore).toBe(123456);
      expect(result.hits[1]._originalScore).toBe(1000);
      expect(result.hits[2]._originalScore).toBe(50);
      expect(result.hits[3]._originalScore).toBe(1); // Default score
    });
  });

  describe('clearSchemaCache', () => {
    it('clears the schema cache', async () => {
      (mockClient.getSchema as any).mockResolvedValue(mockSchema);
      (mockClient.search as any).mockResolvedValue(mockSearchResponse);

      // First search should fetch schema
      await multiClient.searchMultipleCollections({
        query: 'test',
        collections: [{ collection: 'products' }],
      });

      expect(mockClient.getSchema).toHaveBeenCalledTimes(1);

      // Second search should use cached schema
      await multiClient.searchMultipleCollections({
        query: 'test2',
        collections: [{ collection: 'products' }],
      });

      expect(mockClient.getSchema).toHaveBeenCalledTimes(1);

      // Clear cache and search again
      multiClient.clearSchemaCache();
      await multiClient.searchMultipleCollections({
        query: 'test3',
        collections: [{ collection: 'products' }],
      });

      expect(mockClient.getSchema).toHaveBeenCalledTimes(2);
    });
  });
});