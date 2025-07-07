/**
 * @fileoverview Performance benchmarks for Typesense React integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import Typesense from 'typesense';
import { useSearch } from '../../hooks/useSearch';
import { useAdvancedFacets } from '../../hooks/useAdvancedFacets';
import { useMultiCollectionSearch } from '../../hooks/useMultiCollectionSearch';
import { SearchProvider } from '../../providers/SearchProvider';
import { MultiCollectionProvider } from '../../multiCollection';
import { TypesenseSearchClient } from '../../core/TypesenseClient';
import {
  createTestClient,
  setupTestCollections,
  seedTestData,
  cleanupTestCollections,
  TEST_SERVER_CONFIG,
  waitForIndexing,
  generateTestProducts,
  PRODUCTS_SCHEMA,
  CATEGORIES_SCHEMA,
  USERS_SCHEMA,
} from './test-server';
import type { ReactNode } from 'react';
import type { FacetConfig, CollectionConfig } from '../../types';

describe('Performance Benchmarks', () => {
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
  });
  
  afterAll(async () => {
    await cleanupTestCollections(client);
  });
  
  function createSearchWrapper({ children }: { children: ReactNode }) {
    return (
      <SearchProvider
        config={TEST_SERVER_CONFIG}
        collection="products"
        defaultOptions={{
          queryBy: 'name,description',
          perPage: 20,
        }}>
        {children}
      </SearchProvider>
    );
  }
  
  describe('Query Response Times', () => {
    beforeAll(async () => {
      // Delete and recreate collection to clear all documents
      try {
        await client.collections('products').delete();
      } catch (error) {
        // Collection might not exist
      }
      await client.collections().create(PRODUCTS_SCHEMA);
      await seedTestData(client, { productCount: 1000 });
      await waitForIndexing(2000);
    });
    
    it('should handle simple queries under 100ms', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const startTime = Date.now();
      
      act(() => {
        result.current.actions.setQuery('Apple');
      });
      
      await waitFor(() => {
        expect(result.current.state.query).toBe('Apple');
        expect(result.current.state.results?.request_params.q).toBe('Apple');
      });
      
      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(500); // Allow 500ms for full round-trip including React
      expect(result.current.state.results?.search_time_ms).toBeLessThan(50); // Typesense search itself should be fast
    });
    
    it('should handle complex filters under 200ms', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const startTime = Date.now();
      
      act(() => {
        result.current.actions.setAdditionalFilters('category:=Electronics && price:[100..500] && in_stock:=true && rating:>3');
      });
      
      await waitFor(() => {
        expect(result.current.state.results).toBeDefined();
      });
      
      const filterTime = Date.now() - startTime;
      expect(filterTime).toBeLessThan(500); // Allow 500ms for complex filter processing
    });
    
    it('should handle rapid query changes efficiently', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const queries = ['a', 'ap', 'app', 'appl', 'apple'];
      const startTime = Date.now();
      
      // Simulate rapid typing
      queries.forEach((query, index) => {
        setTimeout(() => {
          act(() => {
            result.current.actions.setQuery(query);
          });
        }, index * 50);
      });
      
      await waitFor(() => {
        expect(result.current.state.query).toBe('apple');
      }, { timeout: 1000 });
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000);
    });
  });
  
  describe('Large Dataset Handling', () => {
    it('should handle 10,000+ documents efficiently', async () => {
      // Generate and import large dataset
      // Delete and recreate collection to clear all documents
      try {
        await client.collections('products').delete();
      } catch (error) {
        // Collection might not exist
      }
      await client.collections().create(PRODUCTS_SCHEMA);
      
      const batchSize = 1000;
      const totalBatches = 10;
      
      console.log('Importing 10,000 products...');
      for (let i = 0; i < totalBatches; i++) {
        const products = generateTestProducts(batchSize).map((p, idx) => ({
          ...p,
          id: `prod-${i * batchSize + idx + 1}`,
        }));
        await client.collections('products').documents().import(products);
      }
      
      await waitForIndexing(3000);
      
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      expect(result.current.state.results?.out_of).toBe(10000);
      
      // Test search performance on large dataset
      const searchStartTime = Date.now();
      
      act(() => {
        result.current.actions.setQuery('Samsung');
      });
      
      await waitFor(() => {
        expect(result.current.state.query).toBe('Samsung');
        expect(result.current.state.results?.request_params.q).toBe('Samsung');
      });
      
      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(500); // Allow 500ms for large dataset search
      expect(result.current.state.results?.search_time_ms).toBeLessThan(100); // Typesense itself should still be fast
    });
    
    it('should paginate through large results efficiently', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      // Test pagination performance
      const pageTimes: number[] = [];
      
      for (let page = 1; page <= 10; page++) {
        const pageStartTime = Date.now();
        
        act(() => {
          result.current.actions.setPage(page);
        });
        
        await waitFor(() => {
          expect(result.current.state.page).toBe(page);
        });
        
        pageTimes.push(Date.now() - pageStartTime);
      }
      
      // Average pagination time should be under 100ms
      const avgPageTime = pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length;
      expect(avgPageTime).toBeLessThan(100);
    });
  });
  
  describe('Concurrent Search Operations', () => {
    beforeAll(async () => {
      // Delete and recreate collection to clear all documents
      try {
        await client.collections('products').delete();
      } catch (error) {
        // Collection might not exist
      }
      await client.collections().create(PRODUCTS_SCHEMA);
      await seedTestData(client, { productCount: 1000 });
      await waitForIndexing(2000);
    });
    
    it('should handle multiple simultaneous searches', async () => {
      const results: any[] = [];
      const startTime = Date.now();
      
      // Create multiple search instances
      const searches = Array(5).fill(null).map((_, index) => 
        renderHook(() => useSearch(), { wrapper: createSearchWrapper })
      );
      
      // Wait for all to initialize
      await Promise.all(searches.map(({ result }) => 
        waitFor(() => expect(result.current.loading).toBe(false))
      ));
      
      // Trigger different searches simultaneously
      searches.forEach(({ result }, index) => {
        act(() => {
          result.current.actions.setQuery(`query${index}`);
          result.current.actions.setAdditionalFilters(`price:>${index * 100}`);
        });
      });
      
      // Wait for all searches to complete
      await Promise.all(searches.map(({ result }, index) => 
        waitFor(() => {
          expect(result.current.state.query).toBe(`query${index}`);
          results.push(result.current.state.results);
        })
      ));
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // All searches should complete within 1 second
      
      // Verify all searches completed successfully
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.search_time_ms).toBeLessThan(100);
      });
    });
  });
  
  describe('Memory Usage Patterns', () => {
    it('should not leak memory during repeated searches', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      // Perform multiple searches
      for (let i = 0; i < 50; i++) {
        act(() => {
          result.current.actions.setQuery(`test${i}`);
        });
        
        await waitFor(() => {
          expect(result.current.state.query).toBe(`test${i}`);
        }, { timeout: 500 });
      }
      
      // Results should be garbage collected - only current results in memory
      expect(result.current.state.results).toBeDefined();
      expect(result.current.state.query).toBe('test49');
    });
    
    it('should handle large result sets without memory issues', async () => {
      const { result } = renderHook(() => useSearch(), { wrapper: createSearchWrapper });
      
      // Request large page size
      act(() => {
        result.current.actions.setPerPage(100);
      });
      
      await waitFor(() => {
        expect(result.current.state.results?.hits).toHaveLength(100);
      });
      
      // Update to smaller page size - previous large results should be released
      act(() => {
        result.current.actions.setPerPage(10);
      });
      
      await waitFor(() => {
        expect(result.current.state.results?.hits).toHaveLength(10);
      });
    });
  });
  
  describe('Facet Calculation Performance', () => {
    const facetConfig: FacetConfig[] = [
      { field: 'category', label: 'Category', type: 'checkbox', disjunctive: true },
      { field: 'brand', label: 'Brand', type: 'checkbox', disjunctive: true },
      { field: 'price', label: 'Price', type: 'numeric', numericDisplay: 'range' },
      { field: 'rating', label: 'Rating', type: 'numeric', numericDisplay: 'slider' },
      { field: 'in_stock', label: 'In Stock', type: 'checkbox' },
      { field: 'tags', label: 'Tags', type: 'checkbox', disjunctive: true },
    ];
    
    function createFacetWrapper({ children }: { children: ReactNode }) {
      return (
        <SearchProvider
          config={TEST_SERVER_CONFIG}
          collection="products"
          defaultOptions={{
            queryBy: 'name,description',
            perPage: 20,
            facetBy: facetConfig.map(f => f.field).join(','),
            maxFacetValues: 100,
          }}
        >
          {children}
        </SearchProvider>
      );
    }
    
    beforeAll(async () => {
      // Delete and recreate collection to clear all documents
      try {
        await client.collections('products').delete();
      } catch (error) {
        // Collection might not exist
      }
      await client.collections().create(PRODUCTS_SCHEMA);
      await seedTestData(client, { productCount: 5000 });
      await waitForIndexing(3000);
    });
    
    it('should calculate facets for large datasets efficiently', async () => {
      const startTime = Date.now();
      
      const { result } = renderHook(
        () => useAdvancedFacets(facetConfig),
        { wrapper: createFacetWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.facetStates.category).toBeDefined();
        expect(result.current.facetStates.brand).toBeDefined();
      });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1500); // Should load within 1.5 seconds
      
      // Verify facet counts
      Object.values(result.current.facetStates).forEach(state => {
        if (state.facetCounts) {
          expect(state.facetCounts.length).toBeGreaterThan(0);
        }
      });
    });
    
    it('should update facet counts quickly when filters change', async () => {
      const { result } = renderHook(
        () => useAdvancedFacets(facetConfig),
        { wrapper: createFacetWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.facetStates.category).toBeDefined();
      });
      
      const updateStartTime = Date.now();
      
      // Apply multiple filters
      act(() => {
        result.current.facetStates.category.handleFacetChange('Electronics');
        result.current.facetStates.price.handleNumericChange({ min: 100, max: 500 });
      });
      
      await waitFor(() => {
        const filterBy = result.current.getFilterBy();
        expect(filterBy).toContain('category:=[Electronics]');
        expect(filterBy).toContain('price:[100..500]');
      });
      
      const updateTime = Date.now() - updateStartTime;
      expect(updateTime).toBeLessThan(500); // Filter updates should be fast
    });
    
    it('should handle complex disjunctive facets efficiently', async () => {
      const { result } = renderHook(
        () => useAdvancedFacets(facetConfig),
        { wrapper: createFacetWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.facetStates.tags).toBeDefined();
      });
      
      const tags = result.current.facetStates.tags.facetCounts.slice(0, 5).map(f => f.value);
      
      const selectionStartTime = Date.now();
      
      // Select multiple disjunctive values
      act(() => {
        tags.forEach(tag => {
          result.current.facetStates.tags.handleFacetChange(tag);
        });
      });
      
      await waitFor(() => {
        expect(result.current.facetStates.tags.selectedValues).toHaveLength(5);
      });
      
      const selectionTime = Date.now() - selectionStartTime;
      expect(selectionTime).toBeLessThan(300);
    });
  });
  
  describe('Multi-Collection Performance', () => {
    const collectionConfigs: CollectionConfig[] = [
      { name: 'products', queryBy: 'name,description', weight: 2 },
      { name: 'categories', queryBy: 'name,description', weight: 1.5 },
      { name: 'users', queryBy: 'name,email', weight: 1 },
    ];
    
    function createMultiWrapper({ children }: { children: ReactNode }) {
      return (
        <MultiCollectionProvider
          config={TEST_SERVER_CONFIG}
          defaultCollections={collectionConfigs}
        >
          {children}
        </MultiCollectionProvider>
      );
    }
    
    beforeAll(async () => {
      // Delete and recreate collections to clear all documents
      const collectionsToReset = [
        { name: 'products', schema: PRODUCTS_SCHEMA },
        { name: 'categories', schema: CATEGORIES_SCHEMA },
        { name: 'users', schema: USERS_SCHEMA },
      ];
      
      for (const { name, schema } of collectionsToReset) {
        try {
          await client.collections(name).delete();
        } catch (error) {
          // Collection might not exist
        }
        await client.collections().create(schema);
      }
      
      await seedTestData(client, { productCount: 1000, userCount: 500 });
      await waitForIndexing(2000);
    });
    
    it('should search multiple collections within acceptable time', async () => {
      const client = new TypesenseSearchClient(TEST_SERVER_CONFIG);
      const { result } = renderHook(
        () => useMultiCollectionSearch(client, {
          defaultCollections: collectionConfigs,
          searchOnMount: true,
        })
      );
      
      const startTime = Date.now();
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.results).toBeDefined();
      });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000);
      
      // Verify we have results
      if (result.current.results) {
        const stats = result.current.getCollectionStats();
        Object.values(stats).forEach(stat => {
          expect(stat.searchTime).toBeLessThan(200);
        });
      }
    });
    
    it('should handle result merging efficiently', async () => {
      const client = new TypesenseSearchClient(TEST_SERVER_CONFIG);
      const { result } = renderHook(
        () => useMultiCollectionSearch(client, {
          defaultCollections: collectionConfigs,
          searchOnMount: true,
        })
      );
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const mergeStartTime = Date.now();
      
      // Switch between result modes
      // Search with different merge strategy
      act(() => {
        result.current.search({
          query: '*',
          collections: collectionConfigs,
          mergeStrategy: 'collection-priority'
        });
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.results).toBeDefined();
      });
      
      const mergeTime = Date.now() - mergeStartTime;
      expect(mergeTime).toBeLessThan(500); // Mode switches should be fast
    });
  });
});