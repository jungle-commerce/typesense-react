/**
 * @fileoverview Integration tests for facet hooks with real Typesense server
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import Typesense from 'typesense';
import { useSearch } from '../../../hooks/useSearch';
import { useAdvancedFacets } from '../../../hooks/useAdvancedFacets';
import { useAccumulatedFacets } from '../../../hooks/useAccumulatedFacets';
import { SearchProvider } from '../../../providers/SearchProvider';
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
import type { FacetConfig } from '../../../types';

describe('Facet Hooks Integration Tests', () => {
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
    await seedTestData(client, { productCount: 100 });
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
    await seedTestData(client, { productCount: 100 });
    await waitForIndexing();
  });
  
  const facetConfig: FacetConfig[] = [
    {
      field: 'category',
      label: 'Category',
      type: 'checkbox',
      disjunctive: true,
    },
    {
      field: 'brand',
      label: 'Brand',
      type: 'checkbox',
      disjunctive: true,
    },
    {
      field: 'price',
      label: 'Price',
      type: 'numeric',
      numericDisplay: 'range',
    },
    {
      field: 'rating',
      label: 'Rating',
      type: 'numeric',
      numericDisplay: 'slider',
    },
    {
      field: 'in_stock',
      label: 'In Stock',
      type: 'checkbox',
    },
    {
      field: 'tags',
      label: 'Tags',
      type: 'checkbox',
      disjunctive: true,
    },
  ];
  
  function createWrapper({ children }: { children: ReactNode }) {
    return (
      <SearchProvider
        config={TEST_SERVER_CONFIG}
        collection="products"
        initialSearchParams={{
          query_by: 'name,description',
          per_page: 20,
          facet_by: facetConfig.map(f => f.field).join(','),
        }}
        facets={facetConfig}
        searchOnMount={true}>
        {children}
      </SearchProvider>
    );
  }
  
  describe('useFacetState', () => {
    it('should handle single value facets with real data', async () => {
      const { result: searchResult } = renderHook(
        () => useSearch(),
        { wrapper: createWrapper }
      );
      
      const { result: facetResult } = renderHook(
        () => useAdvancedFacets(),
        { wrapper: createWrapper }
      );
      
      // Wait for search results
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.state.results).toBeDefined();
        expect(searchResult.current.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });
      
      // Find category facet
      const categoryFacet = searchResult.current.state.results?.facet_counts?.find(
        f => f.field_name === 'category'
      );
      
      expect(categoryFacet).toBeDefined();
      expect(categoryFacet?.counts.length).toBeGreaterThan(0);
      
      // Select a facet value
      const firstValue = categoryFacet?.counts[0]?.value;
      if (firstValue) {
        act(() => {
          facetResult.current.actions.toggleFacetValue('category', firstValue);
        });
        
        await waitFor(() => {
          expect(facetResult.current.disjunctiveFacets.category).toContain(firstValue);
        }, { timeout: 5000 });
      }
    });
    
    it('should handle multi-select facets correctly', async () => {
      const { result: searchResult } = renderHook(
        () => useSearch(),
        { wrapper: createWrapper }
      );
      
      const { result: facetResult } = renderHook(
        () => useAdvancedFacets(),
        { wrapper: createWrapper }
      );
      
      // Wait for search results
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });
      
      // Find brand facet
      const brandFacet = searchResult.current.state.results?.facet_counts?.find(
        f => f.field_name === 'brand'
      );
      
      expect(brandFacet).toBeDefined();
      expect(brandFacet?.counts.length).toBeGreaterThan(1);
      
      const [first, second] = brandFacet?.counts.slice(0, 2) || [];
      
      // Select multiple values
      if (first && second) {
        act(() => {
          facetResult.current.actions.toggleFacetValue('brand', first.value);
          facetResult.current.actions.toggleFacetValue('brand', second.value);
        });
        
        await waitFor(() => {
          expect(facetResult.current.disjunctiveFacets.brand).toHaveLength(2);
          expect(facetResult.current.disjunctiveFacets.brand).toContain(first.value);
          expect(facetResult.current.disjunctiveFacets.brand).toContain(second.value);
        }, { timeout: 5000 });
        
        // Deselect one
        act(() => {
          facetResult.current.actions.toggleFacetValue('brand', first.value);
        });
        
        await waitFor(() => {
          expect(facetResult.current.disjunctiveFacets.brand).toHaveLength(1);
          expect(facetResult.current.disjunctiveFacets.brand).toContain(second.value);
        }, { timeout: 5000 });
      }
    });
    
    it('should handle numeric range facets', async () => {
      const { result: searchResult } = renderHook(
        () => useSearch(),
        { wrapper: createWrapper }
      );
      
      const { result: facetResult } = renderHook(
        () => useAdvancedFacets(),
        { wrapper: createWrapper }
      );
      
      // Wait for search results
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });
      
      // Find price facet
      const priceFacet = searchResult.current.state.results?.facet_counts?.find(
        f => f.field_name === 'price'
      );
      
      expect(priceFacet).toBeDefined();
      expect(priceFacet?.stats).toBeDefined();
      expect(priceFacet?.stats?.min).toBeGreaterThanOrEqual(0);
      expect(priceFacet?.stats?.max).toBeLessThanOrEqual(1100);
      
      // Set range
      act(() => {
        facetResult.current.actions.setNumericFilter('price', 100, 500);
      });
      
      await waitFor(() => {
        expect(facetResult.current.numericFilters.price).toEqual({ min: 100, max: 500 });
      }, { timeout: 5000 });
    });
    
    it('should handle boolean facets', async () => {
      const { result: searchResult } = renderHook(
        () => useSearch(),
        { wrapper: createWrapper }
      );
      
      const { result: facetResult } = renderHook(
        () => useAdvancedFacets(),
        { wrapper: createWrapper }
      );
      
      // Wait for search results
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });
      
      // Find in_stock facet
      const inStockFacet = searchResult.current.state.results?.facet_counts?.find(
        f => f.field_name === 'in_stock'
      );
      
      expect(inStockFacet).toBeDefined();
      expect(inStockFacet?.counts.length).toBeGreaterThanOrEqual(1); // At least one value
      
      const trueCount = inStockFacet?.counts.find(f => f.value === 'true')?.count || 0;
      const falseCount = inStockFacet?.counts.find(f => f.value === 'false')?.count || 0;
      
      expect(trueCount + falseCount).toBeGreaterThan(0);
      
      // Select in stock only
      act(() => {
        facetResult.current.actions.toggleFacetValue('in_stock', 'true');
      });
      
      await waitFor(() => {
        expect(facetResult.current.disjunctiveFacets.in_stock).toContain('true');
      }, { timeout: 5000 });
    });
  });
  
  describe('useAdvancedFacets', () => {
    it('should handle complex filter combinations', async () => {
      const { result: searchResult } = renderHook(
        () => useSearch(),
        { wrapper: createWrapper }
      );
      
      const { result: facetResult } = renderHook(
        () => useAdvancedFacets(),
        { wrapper: createWrapper }
      );
      
      // Wait for initial search
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.state.results).toBeDefined();
      }, { timeout: 5000 });
      
      // Apply multiple filter types
      act(() => {
        facetResult.current.actions.toggleFacetValue('category', 'Electronics');
        facetResult.current.actions.toggleFacetValue('brand', 'Apple');
        facetResult.current.actions.setNumericFilter('price', 500, 1000);
        facetResult.current.actions.toggleFacetValue('in_stock', 'true');
      });
      
      await waitFor(() => {
        expect(facetResult.current.disjunctiveFacets.category).toContain('Electronics');
        expect(facetResult.current.disjunctiveFacets.brand).toContain('Apple');
        expect(facetResult.current.numericFilters.price).toEqual({ min: 500, max: 1000 });
        expect(facetResult.current.disjunctiveFacets.in_stock).toContain('true');
      }, { timeout: 5000 });
      
      // Clear specific filter
      act(() => {
        facetResult.current.actions.clearFilter('category', 'disjunctive');
      });
      
      await waitFor(() => {
        expect(facetResult.current.disjunctiveFacets.category).toBeUndefined();
        expect(facetResult.current.disjunctiveFacets.brand).toContain('Apple');
      }, { timeout: 5000 });
    });
    
    it('should handle disjunctive facets correctly', async () => {
      const { result: searchResult } = renderHook(
        () => useSearch(),
        { wrapper: createWrapper }
      );
      
      const { result: facetResult } = renderHook(
        () => useAdvancedFacets(),
        { wrapper: createWrapper }
      );
      
      // Wait for search results
      await waitFor(() => {
        expect(searchResult.current.loading).toBe(false);
        expect(searchResult.current.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });
      
      // Find tags facet
      const tagsFacet = searchResult.current.state.results?.facet_counts?.find(
        f => f.field_name === 'tags'
      );
      
      if (tagsFacet && tagsFacet.counts.length >= 2) {
        const [first, second] = tagsFacet.counts.slice(0, 2);
        
        // Select multiple tags (disjunctive)
        act(() => {
          facetResult.current.actions.toggleFacetValue('tags', first.value);
          facetResult.current.actions.toggleFacetValue('tags', second.value);
        });
        
        await waitFor(() => {
          expect(facetResult.current.disjunctiveFacets.tags).toHaveLength(2);
          expect(facetResult.current.disjunctiveFacets.tags).toContain(first.value);
          expect(facetResult.current.disjunctiveFacets.tags).toContain(second.value);
        }, { timeout: 5000 });
      }
    });
    
    it('should clear all filters', async () => {
      const { result } = renderHook(
        () => useAdvancedFacets(facetConfig),
        { wrapper: createWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.facetStates.category).toBeDefined();
      }, { timeout: 5000 });
      
      // Apply some filters
      act(() => {
        if (result.current.facetStates.category.facetCounts.length > 0) {
          result.current.facetStates.category.handleFacetChange(
            result.current.facetStates.category.facetCounts[0].value
          );
        }
        result.current.facetStates.price.handleNumericChange({ min: 100, max: 500 });
      });
      
      await waitFor(() => {
        expect(result.current.getFilterBy()).not.toBe('');
      }, { timeout: 5000 });
      
      // Clear all
      act(() => {
        result.current.clearAllFilters();
      });
      
      await waitFor(() => {
        expect(result.current.getFilterBy()).toBe('');
        expect(result.current.facetStates.category.selectedValues).toHaveLength(0);
        expect(result.current.facetStates.price.numericRange).toBeUndefined();
      }, { timeout: 5000 });
    });
    
    it('should handle facet count updates after filtering', async () => {
      const { result } = renderHook(
        () => useAdvancedFacets(facetConfig),
        { wrapper: createWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.facetStates.category).toBeDefined();
      }, { timeout: 5000 });
      
      const initialBrandCount = result.current.facetStates.brand.facetCounts.length;
      
      // Filter by category
      act(() => {
        if (result.current.facetStates.category.facetCounts.length > 0) {
          result.current.facetStates.category.handleFacetChange(
            result.current.facetStates.category.facetCounts[0].value
          );
        }
      });
      
      await waitFor(() => {
        // Brand counts should update based on selected category
        const updatedBrandCount = result.current.facetStates.brand.facetCounts.length;
        expect(updatedBrandCount).toBeLessThanOrEqual(initialBrandCount);
      }, { timeout: 5000 });
    });
  });
  
  describe('useAccumulatedFacets', () => {
    it('should accumulate facets across searches', async () => {
      const { result } = renderHook(
        () => useAccumulatedFacets(['category', 'brand']),
        { wrapper: createWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.accumulatedFacets.category).toBeDefined();
        expect(result.current.accumulatedFacets.brand).toBeDefined();
      }, { timeout: 5000 });
      
      const initialCategories = Object.keys(result.current.accumulatedFacets.category);
      const initialBrands = Object.keys(result.current.accumulatedFacets.brand);
      
      expect(initialCategories.length).toBeGreaterThan(0);
      expect(initialBrands.length).toBeGreaterThan(0);
      
      // Verify counts
      const totalCategoryCount = Object.values(result.current.accumulatedFacets.category)
        .reduce((sum, count) => sum + count, 0);
      expect(totalCategoryCount).toBeGreaterThan(0);
    });
    
    it('should maintain accumulated facets when filters change', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => {
        const [filter, setFilter] = React.useState('');
        
        React.useImperativeHandle(globalThis.testRef, () => ({
          setFilter,
        }));
        
        return (
          <SearchProvider
            config={TEST_SERVER_CONFIG}
            collection="products"
            initialSearchParams={{
              query_by: 'name,description',
              per_page: 20,
              facet_by: 'category,brand',
              filter_by: filter || undefined,
            }}
            facets={[
              { field: 'category', label: 'Category', type: 'checkbox' },
              { field: 'brand', label: 'Brand', type: 'checkbox' }
            ]}
            searchOnMount={true}
          >
            {children}
          </SearchProvider>
        );
      };
      
      globalThis.testRef = React.createRef();
      
      const { result } = renderHook(
        () => useAccumulatedFacets(['category', 'brand']),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.accumulatedFacets.category).toBeDefined();
      }, { timeout: 5000 });
      
      const initialAccumulated = { ...result.current.accumulatedFacets };
      
      // Apply filter
      act(() => {
        globalThis.testRef.current?.setFilter('category:=Electronics');
      });
      
      await waitFor(() => {
        // Accumulated facets should still contain all values seen
        expect(Object.keys(result.current.accumulatedFacets.category)).toEqual(
          Object.keys(initialAccumulated.category)
        );
      }, { timeout: 5000 });
    });
    
    it('should reset accumulated facets', async () => {
      const { result } = renderHook(
        () => useAccumulatedFacets(['category', 'brand']),
        { wrapper: createWrapper }
      );
      
      await waitFor(() => {
        expect(Object.keys(result.current.accumulatedFacets.category).length).toBeGreaterThan(0);
      }, { timeout: 5000 });
      
      // Reset
      act(() => {
        result.current.resetAccumulated();
      });
      
      expect(result.current.accumulatedFacets.category).toEqual({});
      expect(result.current.accumulatedFacets.brand).toEqual({});
    });
    
    it('should handle array field facets', async () => {
      const { result } = renderHook(
        () => useAccumulatedFacets(['tags']),
        { wrapper: createWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.accumulatedFacets.tags).toBeDefined();
      }, { timeout: 5000 });
      
      const tagValues = Object.keys(result.current.accumulatedFacets.tags);
      expect(tagValues.length).toBeGreaterThan(0);
      
      // Each tag should have a positive count
      tagValues.forEach(tag => {
        expect(result.current.accumulatedFacets.tags[tag]).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Facet Performance', () => {
    it('should handle large number of facet values efficiently', async () => {
      const startTime = Date.now();
      
      const { result } = renderHook(
        () => useAdvancedFacets(facetConfig),
        { wrapper: createWrapper }
      );
      
      await waitFor(() => {
        expect(result.current.facetStates.category).toBeDefined();
      }, { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
      
      // Test filtering performance
      const filterStartTime = Date.now();
      
      act(() => {
        // Apply multiple filters
        Object.entries(result.current.facetStates).forEach(([field, state]) => {
          if (state.facetCounts?.length > 0 && field !== 'price' && field !== 'rating') {
            state.handleFacetChange(state.facetCounts[0].value);
          }
        });
      });
      
      await waitFor(() => {
        expect(result.current.getFilterBy()).not.toBe('');
      }, { timeout: 5000 });
      
      const filterTime = Date.now() - filterStartTime;
      expect(filterTime).toBeLessThan(1000); // Filtering should be fast
    });
  });
});