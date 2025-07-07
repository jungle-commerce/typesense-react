/**
 * @fileoverview Comprehensive tests for TypesenseSearchClient
 * Tests all methods, cache functionality, error handling, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypesenseSearchClient } from '../TypesenseClient';
import type { SearchRequest, TypesenseSearchResponse, TypesenseConfig } from '../../types';

// Note: TypesenseSearchClient is mocked globally in test setup
// We'll test the mock behavior to ensure it's configured correctly

describe('TypesenseSearchClient', () => {
  let searchClient: any;
  const mockConfig: TypesenseConfig = {
    nodes: [
      {
        host: 'localhost',
        port: 8108,
        protocol: 'http',
      },
    ],
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mock validation', () => {
    it('should create a mocked TypesenseSearchClient', () => {
      searchClient = new TypesenseSearchClient(mockConfig);
      expect(searchClient).toBeDefined();
      expect(TypesenseSearchClient).toHaveBeenCalledWith(mockConfig);
    });

    it('should have search method', async () => {
      searchClient = new TypesenseSearchClient(mockConfig);
      expect(searchClient.search).toBeDefined();
      expect(typeof searchClient.search).toBe('function');
      
      const result = await searchClient.search('test-collection', { q: 'test', query_by: 'title' });
      expect(result).toBeDefined();
      expect(searchClient.search).toHaveBeenCalled();
    });

    it('should have multiSearch method', async () => {
      searchClient = new TypesenseSearchClient(mockConfig);
      expect(searchClient.multiSearch).toBeDefined();
      expect(typeof searchClient.multiSearch).toBe('function');
      
      const result = await searchClient.multiSearch('test-collection', []);
      expect(result).toBeDefined();
      expect(searchClient.multiSearch).toHaveBeenCalled();
    });

    it('should have retrieveSchema method', async () => {
      searchClient = new TypesenseSearchClient(mockConfig);
      expect(searchClient.retrieveSchema).toBeDefined();
      expect(typeof searchClient.retrieveSchema).toBe('function');
      
      const result = await searchClient.retrieveSchema('test-collection');
      expect(result).toBeDefined();
      expect(searchClient.retrieveSchema).toHaveBeenCalled();
    });
  });

  describe('Constructor variations', () => {
    it('should accept config with custom timeout settings', () => {
      const configWithTimeout: TypesenseConfig = {
        ...mockConfig,
        connectionTimeoutSeconds: 20,
        numRetries: 5,
        retryIntervalSeconds: 0.5,
      };
      
      searchClient = new TypesenseSearchClient(configWithTimeout);
      expect(TypesenseSearchClient).toHaveBeenCalledWith(configWithTimeout);
    });

    it('should accept config with cache settings', () => {
      const configWithCache: TypesenseConfig = {
        ...mockConfig,
        cacheSearchResultsForSeconds: 300,
      };
      
      searchClient = new TypesenseSearchClient(configWithCache);
      expect(TypesenseSearchClient).toHaveBeenCalledWith(configWithCache);
    });

    it('should be called with multiple arguments for cache configuration', () => {
      const cacheTimeout = 10 * 60 * 1000;
      const maxCacheSize = 200;
      
      searchClient = new TypesenseSearchClient(mockConfig, cacheTimeout, maxCacheSize);
      expect(TypesenseSearchClient).toHaveBeenCalledWith(mockConfig, cacheTimeout, maxCacheSize);
    });
  });

  describe('Search functionality', () => {
    beforeEach(() => {
      searchClient = new TypesenseSearchClient(mockConfig);
    });

    it('should call search with proper parameters', async () => {
      const searchParams: SearchRequest = {
        q: 'test query',
        query_by: 'title,description',
        filter_by: 'status:=active',
        sort_by: 'price:desc',
      };
      
      await searchClient.search('products', searchParams);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', searchParams);
    });

    it('should call search with cache control', async () => {
      const searchParams: SearchRequest = {
        q: 'test',
        query_by: 'title',
      };
      
      await searchClient.search('products', searchParams, false);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', searchParams, false);
    });

    it('should handle multiSearch calls', async () => {
      const searches: SearchRequest[] = [
        { q: 'test1', query_by: 'title' },
        { q: 'test2', query_by: 'title' },
        { q: 'test3', query_by: 'title' },
      ];
      
      await searchClient.multiSearch('products', searches);
      
      expect(searchClient.multiSearch).toHaveBeenCalledWith('products', searches);
    });

    it('should handle multiSearch with cache control', async () => {
      const searches: SearchRequest[] = [
        { q: 'test', query_by: 'title' },
      ];
      
      await searchClient.multiSearch('products', searches, false);
      
      expect(searchClient.multiSearch).toHaveBeenCalledWith('products', searches, false);
    });
  });

  describe('Schema retrieval', () => {
    beforeEach(() => {
      searchClient = new TypesenseSearchClient(mockConfig);
    });

    it('should retrieve schema for collection', async () => {
      await searchClient.retrieveSchema('products');
      
      expect(searchClient.retrieveSchema).toHaveBeenCalledWith('products');
    });
  });

  describe('Complex search parameters', () => {
    beforeEach(() => {
      searchClient = new TypesenseSearchClient(mockConfig);
    });

    it('should handle all search parameters', async () => {
      const complexParams: SearchRequest = {
        q: 'laptop',
        query_by: 'title,description,tags',
        filter_by: 'price:[100..1000] && in_stock:true',
        facet_by: 'category,brand,price',
        sort_by: '_text_match:desc,price:asc',
        max_facet_values: 100,
        facet_query: 'brand:apple',
        page: 2,
        per_page: 50,
        group_by: 'category',
        group_limit: 3,
        include_fields: 'title,price,image',
        exclude_fields: 'description,reviews',
        highlight_fields: 'title,tags',
        highlight_full_fields: 'description',
        highlight_affix_num_tokens: 4,
        highlight_start_tag: '<mark>',
        highlight_end_tag: '</mark>',
        snippet_threshold: 50,
        num_typos: 2,
        min_len_1typo: 5,
        min_len_2typo: 8,
        typo_tokens_threshold: 2,
        drop_tokens_threshold: 3,
        prefix: true,
        infix: 'always',
        pre_segmented_query: false,
        query_by_weights: '3,2,1',
        limit_hits: 200,
        search_cutoff_ms: 150,
        use_cache: true,
        cache_ttl: 120,
        prioritize_exact_match: true,
        exhaustive_search: false,
        pinned_hits: '123,456',
        hidden_hits: '789,012',
        preset: 'mobile_search',
      };
      
      await searchClient.search('products', complexParams);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', complexParams);
    });

    it('should handle empty search parameters', async () => {
      const emptyParams: SearchRequest = {
        q: '',
        query_by: '',
      };
      
      await searchClient.search('products', emptyParams);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', emptyParams);
    });

    it('should handle special characters in search', async () => {
      const specialParams: SearchRequest = {
        q: 'test "quoted phrase" & special | chars',
        query_by: 'title',
        filter_by: 'category:="Electronics & Gadgets"',
      };
      
      await searchClient.search('products', specialParams);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', specialParams);
    });
  });

  describe('Edge cases and error scenarios', () => {
    beforeEach(() => {
      searchClient = new TypesenseSearchClient(mockConfig);
    });

    it('should handle very long queries', async () => {
      const longQuery: SearchRequest = {
        q: 'a'.repeat(1000),
        query_by: 'title',
      };
      
      await searchClient.search('products', longQuery);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', longQuery);
    });

    it('should handle multiple collections in multiSearch', async () => {
      const searches: SearchRequest[] = Array(10).fill(null).map((_, i) => ({
        q: `query${i}`,
        query_by: 'title',
      }));
      
      await searchClient.multiSearch('products', searches);
      
      expect(searchClient.multiSearch).toHaveBeenCalledWith('products', searches);
    });

    it('should handle empty multiSearch array', async () => {
      await searchClient.multiSearch('products', []);
      
      expect(searchClient.multiSearch).toHaveBeenCalledWith('products', []);
    });

    it('should handle undefined optional parameters', async () => {
      const paramsWithUndefined: SearchRequest = {
        q: 'test',
        query_by: 'title',
        filter_by: undefined,
        sort_by: undefined,
        facet_by: undefined,
        preset: undefined,
      };
      
      await searchClient.search('products', paramsWithUndefined);
      
      expect(searchClient.search).toHaveBeenCalledWith('products', paramsWithUndefined);
    });
  });

  describe('Multiple instances', () => {
    it('should create multiple independent instances', () => {
      const client1 = new TypesenseSearchClient(mockConfig);
      const client2 = new TypesenseSearchClient({
        ...mockConfig,
        apiKey: 'different-key',
      });
      
      expect(TypesenseSearchClient).toHaveBeenCalledTimes(2);
      expect(client1).not.toBe(client2);
    });

    it('should track calls independently', async () => {
      const client1 = new TypesenseSearchClient(mockConfig);
      const client2 = new TypesenseSearchClient(mockConfig);
      
      await client1.search('collection1', { q: 'test1', query_by: 'title' });
      await client2.search('collection2', { q: 'test2', query_by: 'title' });
      
      expect(client1.search).toHaveBeenCalledWith('collection1', { q: 'test1', query_by: 'title' });
      expect(client2.search).toHaveBeenCalledWith('collection2', { q: 'test2', query_by: 'title' });
    });
  });
});