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

  /** Same as createWrapper but with facet accumulation enabled */
  function createAccumulatingWrapper({ children }: { children: ReactNode }) {
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
        accumulateFacets={true}
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
        () => ({ search: useSearch(), facets: useAdvancedFacets() }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.search.loading).toBe(false);
        expect(result.current.search.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });

      const categoryFacet = result.current.search.state.results?.facet_counts?.find(
        f => f.field_name === 'category'
      );

      // Apply some filters
      act(() => {
        const firstValue = categoryFacet?.counts[0]?.value;
        if (firstValue) {
          result.current.facets.actions.toggleFacetValue('category', firstValue);
        }
        result.current.facets.actions.setNumericFilter('price', 100, 500);
      });

      await waitFor(() => {
        expect(result.current.facets.activeFilterCount).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Clear all
      act(() => {
        result.current.facets.actions.clearAllFilters();
      });

      await waitFor(() => {
        expect(result.current.facets.activeFilterCount).toBe(0);
        expect(result.current.facets.disjunctiveFacets.category).toBeUndefined();
        expect(result.current.facets.numericFilters.price).toBeUndefined();
      }, { timeout: 5000 });
    });
    
    it('should handle facet count updates after filtering', async () => {
      const { result } = renderHook(
        () => ({ search: useSearch(), facets: useAdvancedFacets() }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.search.loading).toBe(false);
        expect(result.current.search.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });

      const getFacetCounts = (field: string) =>
        result.current.search.state.results?.facet_counts?.find(
          f => f.field_name === field
        )?.counts ?? [];

      const initialResults = result.current.search.state.results;
      const initialBrandCount = getFacetCounts('brand').length;
      const firstCategory = getFacetCounts('category')[0]?.value;

      expect(firstCategory).toBeDefined();

      // Filter by category
      act(() => {
        if (firstCategory) {
          result.current.facets.actions.toggleFacetValue('category', firstCategory);
        }
      });

      await waitFor(() => {
        // A new search reflecting the filter must have completed
        expect(result.current.search.state.results).not.toBe(initialResults);
        expect(result.current.search.loading).toBe(false);
        // Brand counts should update based on selected category
        const updatedBrandCount = getFacetCounts('brand').length;
        expect(updatedBrandCount).toBeLessThanOrEqual(initialBrandCount);
      }, { timeout: 5000 });
    });
  });
  
  describe('useAccumulatedFacets', () => {
    it('should accumulate facets across searches', async () => {
      const { result } = renderHook(
        () => useAccumulatedFacets(),
        { wrapper: createAccumulatingWrapper }
      );

      await waitFor(() => {
        expect(result.current.accumulatedFacetValues.category).toBeDefined();
        expect(result.current.accumulatedFacetValues.brand).toBeDefined();
      }, { timeout: 5000 });

      const initialCategories = result.current.accumulatedFacetValues.category.orderedValues;
      const initialBrands = result.current.accumulatedFacetValues.brand.orderedValues;

      expect(initialCategories.length).toBeGreaterThan(0);
      expect(initialBrands.length).toBeGreaterThan(0);

      // Verify counts via the merged view (accumulated values + current counts)
      const totalCategoryCount = result.current.getMergedFacetValues('category')
        .reduce((sum, facetValue) => sum + facetValue.count, 0);
      expect(totalCategoryCount).toBeGreaterThan(0);
    });
    
    it('should maintain accumulated facets when filters change', async () => {
      const { result } = renderHook(
        () => ({
          search: useSearch(),
          facets: useAdvancedFacets(),
          accumulated: useAccumulatedFacets(),
        }),
        { wrapper: createAccumulatingWrapper }
      );

      await waitFor(() => {
        expect(result.current.accumulated.accumulatedFacetValues.category).toBeDefined();
      }, { timeout: 5000 });

      const initialCategories = [
        ...result.current.accumulated.accumulatedFacetValues.category.orderedValues,
      ];
      expect(initialCategories.length).toBeGreaterThan(0);

      const initialResults = result.current.search.state.results;

      // Apply a filter that narrows results to a single category
      act(() => {
        result.current.facets.actions.setSelectiveFilter('category', initialCategories[0]);
      });

      await waitFor(() => {
        // A new, filtered search must have completed
        expect(result.current.search.state.results).not.toBe(initialResults);
        expect(result.current.search.loading).toBe(false);
      }, { timeout: 5000 });

      // Accumulated facets should still contain all values seen
      expect(
        result.current.accumulated.accumulatedFacetValues.category.orderedValues
      ).toEqual(initialCategories);

      // And the merged view still exposes every accumulated value
      const mergedValues = result.current.accumulated.getMergedFacetValues('category')
        .map(facetValue => facetValue.value);
      expect([...mergedValues].sort()).toEqual([...initialCategories].sort());
    });
    
    it('should reset accumulated facets', async () => {
      const { result } = renderHook(
        () => useAccumulatedFacets(),
        { wrapper: createAccumulatingWrapper }
      );

      await waitFor(() => {
        expect(
          result.current.accumulatedFacetValues.category?.orderedValues.length
        ).toBeGreaterThan(0);
        expect(
          result.current.accumulatedFacetValues.brand?.orderedValues.length
        ).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Reset
      act(() => {
        result.current.clearAccumulatedFacets();
      });

      expect(result.current.accumulatedFacetValues.category).toBeUndefined();
      expect(result.current.accumulatedFacetValues.brand).toBeUndefined();
    });
    
    it('should handle array field facets', async () => {
      const { result } = renderHook(
        () => useAccumulatedFacets(),
        { wrapper: createAccumulatingWrapper }
      );

      await waitFor(() => {
        expect(result.current.accumulatedFacetValues.tags).toBeDefined();
      }, { timeout: 5000 });

      const tagValues = result.current.accumulatedFacetValues.tags.orderedValues;
      expect(tagValues.length).toBeGreaterThan(0);

      // Each tag should have a positive count in the merged view
      const mergedTags = result.current.getMergedFacetValues('tags');
      expect(mergedTags.length).toBeGreaterThan(0);
      mergedTags.forEach(tag => {
        expect(tag.count).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Facet Performance', () => {
    it('should handle large number of facet values efficiently', async () => {
      const startTime = Date.now();

      const { result } = renderHook(
        () => ({ search: useSearch(), facets: useAdvancedFacets() }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.search.state.results?.facet_counts).toBeDefined();
      }, { timeout: 5000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds

      // Test filtering performance
      const filterStartTime = Date.now();

      const facetCounts = result.current.search.state.results?.facet_counts ?? [];

      act(() => {
        // Apply one filter per non-numeric facet field
        facetCounts.forEach(facet => {
          if (facet.field_name !== 'price' && facet.field_name !== 'rating' && facet.counts.length > 0) {
            result.current.facets.actions.toggleFacetValue(facet.field_name, facet.counts[0].value);
          }
        });
      });

      await waitFor(() => {
        expect(result.current.facets.activeFilterCount).toBeGreaterThan(0);
      }, { timeout: 5000 });

      const filterTime = Date.now() - filterStartTime;
      expect(filterTime).toBeLessThan(1000); // Filtering should be fast
    });
  });
});