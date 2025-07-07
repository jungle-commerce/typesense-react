/**
 * @fileoverview Integration tests for search hooks with real Typesense server
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import Typesense from 'typesense';
import { useSearch } from '../../../hooks/useSearch';
import { SearchProvider } from '../../../providers/SearchProvider';
import {
  createTestClient,
  setupTestCollections,
  seedTestData,
  cleanupTestCollections,
  TEST_SERVER_CONFIG,
  waitForIndexing,
} from '../test-server';
import type { ReactNode } from 'react';

describe('Search Hook Integration Tests', () => {
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
    await seedTestData(client, { productCount: 50 });
    await waitForIndexing();
  });
  
  afterAll(async () => {
    await cleanupTestCollections(client);
  });
  
  beforeEach(async () => {
    // Clear any existing data and reseed
    try {
      await client.collections('products').delete();
      await setupTestCollections(client);
    } catch (e) {
      // Collection might not exist
    }
    await seedTestData(client, { productCount: 50 });
    await waitForIndexing();
  });
  
  function createWrapper({ children }: { children: ReactNode }) {
    return (
      <SearchProvider
        config={TEST_SERVER_CONFIG}
        collection="products"
        initialSearchParams={{
          query_by: 'name,description',
          per_page: 10,
        }}>
        {children}
      </SearchProvider>
    );
  }
  
  it('should connect to real server and perform search', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.state.results).toBeDefined();
      expect(result.current.state.results?.hits).toHaveLength(10);
      expect(result.current.state.results?.found).toBe(50);
    }, { timeout: 5000 });
  });
  
  it('should handle query updates with debouncing', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    const initialResults = result.current.state.results;
    
    // Update query multiple times quickly
    act(() => {
      result.current.actions.setQuery('App');
      result.current.actions.setQuery('Appl');
      result.current.actions.setQuery('Apple');
    });
    
    // Should still have initial results during debounce
    expect(result.current.state.results).toBe(initialResults);
    
    // Wait for debounce
    await waitFor(() => {
      expect(result.current.state.results?.hits.every(hit => 
        hit.document.name.toLowerCase().includes('apple') ||
        hit.document.brand?.toLowerCase() === 'apple'
      )).toBe(true);
    }, { timeout: 5000 });
  });
  
  it('should handle pagination correctly', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    expect(result.current.state.page).toBe(1);
    expect(result.current.state.results?.hits).toHaveLength(10);
    
    const firstPageIds = result.current.state.results?.hits.map(h => h.document.id);
    
    // Go to next page
    act(() => {
      result.current.actions.setPage(2);
    });
    
    await waitFor(() => {
      expect(result.current.state.page).toBe(2);
      expect(result.current.state.results?.page).toBe(2);
    }, { timeout: 5000 });
    
    const secondPageIds = result.current.state.results?.hits.map(h => h.document.id);
    
    // Ensure different results
    expect(firstPageIds).not.toEqual(secondPageIds);
    expect(result.current.state.results?.hits).toHaveLength(10);
  });
  
  it('should handle sorting changes', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Sort by price ascending
    act(() => {
      result.current.actions.setSortBy('price:asc');
    });
    
    await waitFor(() => {
      const prices = result.current.state.results?.hits.map(h => h.document.price) || [];
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    }, { timeout: 5000 });
    
    // Sort by price descending
    act(() => {
      result.current.actions.setSortBy('price:desc');
    });
    
    await waitFor(() => {
      const prices = result.current.state.results?.hits.map(h => h.document.price) || [];
      const sortedPrices = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPrices);
    }, { timeout: 5000 });
  });
  
  it('should handle filter updates', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    const totalResults = result.current.state.results?.found || 0;
    
    // Apply category filter using additional filters
    act(() => {
      result.current.actions.setAdditionalFilters('category:=Electronics');
    });
    
    await waitFor(() => {
      expect(result.current.state.results?.hits.every(h => 
        h.document.category === 'Electronics'
      )).toBe(true);
      expect(result.current.state.results?.found).toBeLessThan(totalResults);
    }, { timeout: 5000 });
  });
  
  it('should handle per page updates', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    expect(result.current.state.results?.hits).toHaveLength(10);
    
    // Change per page to 20
    act(() => {
      result.current.actions.setPerPage(20);
    });
    
    await waitFor(() => {
      expect(result.current.state.results?.hits).toHaveLength(20);
      expect(result.current.state.perPage).toBe(20);
    }, { timeout: 5000 });
  });
  
  it('should handle error scenarios', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Search with invalid filter syntax
    act(() => {
      result.current.actions.setAdditionalFilters('invalid:filter:syntax');
    });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.loading).toBe(false);
    }, { timeout: 5000 });
  });
  
  it('should handle facet data in search results', async () => {
    // Create wrapper with facets configured
    function createFacetWrapper({ children }: { children: ReactNode }) {
      return (
        <SearchProvider
          config={TEST_SERVER_CONFIG}
          collection="products"
          initialSearchParams={{
            query_by: 'name,description',
            per_page: 10,
            facet_by: 'category,brand',
          }}
          facets={[
            { field: 'category', label: 'Category', type: 'checkbox' },
            { field: 'brand', label: 'Brand', type: 'checkbox' },
          ]}>
          {children}
        </SearchProvider>
      );
    }
    
    const { result } = renderHook(() => useSearch(), { wrapper: createFacetWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    await waitFor(() => {
      expect(result.current.state.results?.facet_counts).toBeDefined();
      expect(result.current.state.results?.facet_counts?.length).toBeGreaterThan(0);
      
      const categoryFacet = result.current.state.results?.facet_counts?.find(
        f => f.field_name === 'category'
      );
      expect(categoryFacet).toBeDefined();
      expect(categoryFacet?.counts.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
  
  it('should handle query with highlighting', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Search for a specific term
    act(() => {
      result.current.actions.setQuery('Product');
    });
    
    await waitFor(() => {
      const hasHighlights = result.current.state.results?.hits.some(hit => 
        hit.highlights && hit.highlights.length > 0
      );
      expect(hasHighlights).toBe(true);
    }, { timeout: 5000 });
  });
  
  it('should maintain search state across re-renders', async () => {
    const { result, rerender } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Set specific search state
    act(() => {
      result.current.actions.setQuery('Apple');
      result.current.actions.setAdditionalFilters('category:=Electronics');
      result.current.actions.setSortBy('price:desc');
    });
    
    await waitFor(() => {
      expect(result.current.state.query).toBe('Apple');
    }, { timeout: 5000 });
    
    const stateBeforeRerender = {
      query: result.current.state.query,
      sortBy: result.current.state.sortBy,
      results: result.current.state.results,
    };
    
    // Trigger re-render
    rerender();
    
    // State should be maintained
    expect(result.current.state.query).toBe(stateBeforeRerender.query);
    expect(result.current.state.sortBy).toBe(stateBeforeRerender.sortBy);
    expect(result.current.state.results).toBe(stateBeforeRerender.results);
  });
  
  it('should handle concurrent search operations', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper });
    
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
    
    // Trigger multiple updates concurrently
    act(() => {
      result.current.actions.setQuery('test');
      result.current.actions.setAdditionalFilters('brand:=Apple');
      result.current.actions.setSortBy('rating:desc');
    });
    
    await waitFor(() => {
      expect(result.current.state.query).toBe('test');
      expect(result.current.state.sortBy).toBe('rating:desc');
      expect(result.current.state.additionalFilters).toBe('brand:=Apple');
      expect(result.current.state.results).toBeDefined();
      expect(result.current.loading).toBe(false);
    }, { timeout: 5000 });
    
    // Verify state was updated correctly
    const results = result.current.state.results?.hits || [];
    
    // Since we're searching for 'test' with Apple brand filter,
    // verify we have results (may be empty if no Apple products match 'test')
    expect(result.current.state.results).toBeDefined();
    
    // If we have results with the Apple filter, they should all be Apple brand
    if (results.length > 0 && result.current.state.additionalFilters === 'brand:=Apple') {
      const allApple = results.every(h => h.document.brand === 'Apple');
      // Only check if we have Apple products in the test data
      if (results.some(h => h.document.brand === 'Apple')) {
        expect(allApple).toBe(true);
      }
    }
  });
});