/**
 * @fileoverview Integration tests for multi-collection search with real Typesense server
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import Typesense from 'typesense';
import { useMultiCollectionSearch } from '../../../hooks/useMultiCollectionSearch';
import { MultiCollectionProvider } from '../../../multiCollection';
import {
  createTestClient,
  setupTestCollections,
  seedTestData,
  cleanupTestCollections,
  TEST_SERVER_CONFIG,
  waitForIndexing,
} from '../test-server';
import React from 'react';
import type { ReactNode } from 'react';
import type { CollectionSearchConfig } from '../../../types/multiCollection';
import { TypesenseSearchClient } from '../../../core/TypesenseClient';

describe('Multi-Collection Search Integration Tests', () => {
  let client: Typesense.Client;
  
  beforeAll(async () => {
    client = createTestClient();
    
    // Check if server is running
    try {
      await client.health.retrieve();
    } catch (error) {
      console.error('Typesense server is not running. Please start it with: docker run -p 8108:8108 -v/tmp:/data typesense/typesense:0.25.2 --data-dir /data --api-key=xyz');
      throw error;
    }
    
    await setupTestCollections(client);
    await seedTestData(client, { productCount: 100, userCount: 50 });
    await waitForIndexing();
  });
  
  afterAll(async () => {
    await cleanupTestCollections(client);
  });
  
  beforeEach(async () => {
    // Clear and reseed data
    try {
      await client.collections('products').delete();
      await client.collections('categories').delete();
      await client.collections('users').delete();
      await setupTestCollections(client);
    } catch (e) {
      // Collections might not exist
    }
    await seedTestData(client, { productCount: 100, userCount: 50 });
    await waitForIndexing();
  });
  
  const collectionConfigs: CollectionSearchConfig[] = [
    {
      name: 'products',
      searchParams: {
        query_by: 'name,description',
        per_page: 10,
      },
      weight: 2,
    },
    {
      name: 'categories',
      searchParams: {
        query_by: 'name,description',
        per_page: 5,
      },
      weight: 1.5,
    },
    {
      name: 'users',
      searchParams: {
        query_by: 'name,email',
        per_page: 5,
      },
      weight: 1,
    },
  ];
  
  function createWrapper() {
    const typesenseClient = new TypesenseSearchClient(TEST_SERVER_CONFIG);
    return { typesenseClient };
  }
  
  it('should search across multiple collections', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.results).toBeDefined();
    }, { timeout: 5000 });
    
    const { hits, totalFoundByCollection } = result.current.results!;
    
    // Should have results from all collections
    expect(totalFoundByCollection.products).toBeGreaterThan(0);
    expect(totalFoundByCollection.categories).toBeGreaterThan(0);
    expect(totalFoundByCollection.users).toBeGreaterThan(0);
    
    // Verify hit metadata
    hits.forEach(hit => {
      expect(hit._collection).toBeDefined();
      expect(hit._collectionRank).toBeDefined();
      expect(hit._originalScore).toBeDefined();
      expect(hit._normalizedScore).toBeDefined();
      expect(hit._mergedScore).toBeDefined();
      expect(hit._collectionWeight).toBeDefined();
    });
  });
  
  it('should handle query updates across collections', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Search for "1" which should match product, category, and user IDs
    act(() => {
      result.current.setQuery('1');
    });
    
    await waitFor(() => {
      expect(result.current.query).toBe('1');
      const hits = result.current.results?.hits || [];
      
      // Should find matches in all collections
      const collections = [...new Set(hits.map(h => h._collection))];
      expect(collections.length).toBeGreaterThan(1);
      
      // Verify highlighting
      const highlightedHits = hits.filter(hit => 
        Object.values(hit.highlight || {}).some(h => 
          h.snippet?.includes('<mark>')
        )
      );
      expect(highlightedHits.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
  
  it('should respect collection weights in result ordering', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Search for a common term
    act(() => {
      result.current.setQuery('Product');
    });
    
    await waitFor(() => {
      const hits = result.current.results?.hits || [];
      
      // Products should appear higher due to higher weight
      const productHits = hits.filter(h => h._collection === 'products');
      const categoryHits = hits.filter(h => h._collection === 'categories');
      
      if (productHits.length > 0 && categoryHits.length > 0) {
        const firstProductIndex = hits.findIndex(h => h._collection === 'products');
        const firstCategoryIndex = hits.findIndex(h => h._collection === 'categories');
        
        // With equal relevance, products should come first due to higher weight
        expect(firstProductIndex).toBeLessThan(firstCategoryIndex);
      }
    }, { timeout: 5000 });
  });
  
  it('should handle collection-specific filters', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Update collections with filter
    const updatedConfigs = collectionConfigs.map(config => 
      config.name === 'products' 
        ? { ...config, searchParams: { ...config.searchParams, filter_by: 'category:=Electronics' } }
        : config
    );
    
    act(() => {
      result.current.updateCollections(updatedConfigs);
    });
    
    await waitFor(() => {
      const productHits = result.current.results?.hits.filter(h => h._collection === 'products') || [];
      
      // All product hits should be electronics
      productHits.forEach(hit => {
        expect(hit.document.category).toBe('Electronics');
      });
      
      // Other collections should still have results
      expect(result.current.results?.totalFoundByCollection.categories).toBeGreaterThan(0);
      expect(result.current.results?.totalFoundByCollection.users).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
  
  it('should handle different merge strategies', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
      defaultMergeStrategy: 'relevance',
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Search with collection-weighted strategy
    act(() => {
      result.current.search({
        query: 'test',
        collections: collectionConfigs,
        mergeStrategy: 'collection-weighted',
      });
    });
    
    await waitFor(() => {
      const hits = result.current.results?.hits || [];
      
      // Verify hits have weighted scores
      hits.forEach(hit => {
        expect(hit._mergedScore).toBeDefined();
        expect(hit._collectionWeight).toBeDefined();
      });
    }, { timeout: 5000 });
    
    // Search with relevance strategy
    act(() => {
      result.current.search({
        query: 'test',
        collections: collectionConfigs,
        mergeStrategy: 'relevance',
      });
    });
    
    await waitFor(() => {
      const hits = result.current.results?.hits || [];
      
      // Verify hits are sorted by relevance
      for (let i = 1; i < hits.length; i++) {
        expect(hits[i - 1]._mergedScore).toBeGreaterThanOrEqual(hits[i]._mergedScore);
      }
    }, { timeout: 5000 });
  });
  
  it('should handle pagination across collections', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    const firstPageHits = result.current.results?.hits.map(h => ({
      id: h.document.id,
      collection: h._collection,
    }));
    
    // Search next page
    act(() => {
      result.current.search({
        query: result.current.query || '*',
        collections: collectionConfigs,
        globalMaxResults: 20,
        page: 2,
      });
    });
    
    await waitFor(() => {
      const secondPageHits = result.current.results?.hits.map(h => ({
        id: h.document.id,
        collection: h._collection,
      }));
      
      // Should have different results
      expect(secondPageHits).not.toEqual(firstPageHits);
    }, { timeout: 5000 });
  });
  
  it('should handle collection enable/disable', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    const initialTotal = result.current.results?.found || 0;
    
    // Remove users collection
    const filteredConfigs = collectionConfigs.filter(c => c.name !== 'users');
    
    act(() => {
      result.current.updateCollections(filteredConfigs);
    });
    
    await waitFor(() => {
      expect(result.current.results?.totalFoundByCollection.users).toBeUndefined();
      expect(result.current.results?.found).toBeLessThan(initialTotal);
      
      // No user hits
      const userHits = result.current.results?.hits.filter(h => h._collection === 'users');
      expect(userHits?.length).toBe(0);
    }, { timeout: 5000 });
    
    // Re-add users collection
    act(() => {
      result.current.updateCollections(collectionConfigs);
    });
    
    await waitFor(() => {
      expect(result.current.results?.totalFoundByCollection.users).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
  
  it('should handle error in one collection gracefully', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Add invalid collection
    act(() => {
      result.current.updateCollections([
        ...collectionConfigs,
        {
          name: 'non_existent',
          searchParams: {
            query_by: 'name',
          },
          weight: 1,
        },
      ]);
    });
    
    await waitFor(() => {
      // Should still get results from valid collections
      expect(result.current.results?.totalFoundByCollection.products).toBeGreaterThan(0);
      expect(result.current.results?.totalFoundByCollection.categories).toBeGreaterThan(0);
      
      // Error info might be in the response
      const collectionStats = result.current.getCollectionStats();
      expect(collectionStats.products).toBeDefined();
      expect(collectionStats.categories).toBeDefined();
    }, { timeout: 5000 });
  });
  
  it('should handle concurrent searches efficiently', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    const searchStartTime = Date.now();
    
    // Trigger search with multiple options
    act(() => {
      result.current.search({
        query: 'test',
        collections: collectionConfigs,
        globalMaxResults: 50,
        mergeStrategy: 'relevance',
      });
    });
    
    await waitFor(() => {
      expect(result.current.query).toBe('test');
      expect(result.current.results?.hits.length).toBeLessThanOrEqual(50);
    }, { timeout: 5000 });
    
    const searchTime = Date.now() - searchStartTime;
    expect(searchTime).toBeLessThan(2000); // Should complete within 2 seconds
    
    // Verify search times are tracked
    expect(result.current.results?.searchTimeMs).toBeGreaterThan(0);
    expect(result.current.results?.searchTimeByCollection).toBeDefined();
  });
  
  it('should merge results with different schemas correctly', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: true,
    }));
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    const hits = result.current.results?.hits || [];
    
    // Verify each hit has the expected fields based on collection
    hits.forEach(hit => {
      expect(hit.document.id).toBeDefined();
      expect(hit.document.name).toBeDefined();
      
      switch (hit._collection) {
        case 'products':
          expect(hit.document).toHaveProperty('price');
          expect(hit.document).toHaveProperty('category');
          break;
        case 'categories':
          expect(hit.document).toHaveProperty('path');
          expect(hit.document).toHaveProperty('level');
          break;
        case 'users':
          expect(hit.document).toHaveProperty('email');
          expect(hit.document).toHaveProperty('role');
          break;
      }
    });
  });
  
  it('should handle large result sets across collections', async () => {
    const { typesenseClient } = createWrapper();
    const { result } = renderHook(() => useMultiCollectionSearch(typesenseClient, {
      defaultCollections: collectionConfigs,
      searchOnMount: false,
    }));
    
    // Search with large result limit
    act(() => {
      result.current.search({
        query: '*',
        collections: collectionConfigs,
        globalMaxResults: 100,
      });
    });
    
    await waitFor(() => {
      expect(result.current.results?.hits.length).toBeGreaterThan(50);
    }, { timeout: 5000 });
    
    // Verify distribution across collections
    const collectionCounts = result.current.results?.hits.reduce((acc, hit) => {
      acc[hit._collection] = (acc[hit._collection] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Should have results from multiple collections
    expect(Object.keys(collectionCounts!).length).toBeGreaterThan(1);
  });
});