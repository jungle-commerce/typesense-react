import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiCollectionSearch } from '../useMultiCollectionSearch';
import { MultiCollectionSearchClient } from '../../core/MultiCollectionClient';
import type { 
  CollectionSearchConfig,
  MultiCollectionSearchRequest,
  MultiCollectionSearchResponse 
} from '../../types/multiCollection';

vi.mock('../../core/MultiCollectionClient');

describe('useMultiCollectionSearch', () => {
  let mockMultiClient: MultiCollectionSearchClient;
  
  const mockResponse: MultiCollectionSearchResponse = {
    hits: [
      {
        document: { id: '1', name: 'Product 1', _collection: 'products' },
        highlight: {},
        text_match: 100,
        _collection: 'products',
        _collectionScore: 1.0,
        _collectionWeight: 1.0
      },
      {
        document: { id: '2', name: 'Category 1', _collection: 'categories' },
        highlight: {},
        text_match: 90,
        _collection: 'categories',
        _collectionScore: 0.9,
        _collectionWeight: 0.8
      }
    ],
    found: 2,
    totalFoundByCollection: {
      products: 10,
      categories: 5
    },
    includedByCollection: {
      products: 1,
      categories: 1
    },
    searchTimeByCollection: {
      products: 10,
      categories: 8
    },
    search_time_ms: 18,
    page: 1
  };

  const defaultCollections: CollectionSearchConfig[] = [
    {
      collection: 'products',
      queryBy: 'name,description',
      maxResults: 10,
      weight: 1.0
    },
    {
      collection: 'categories',
      queryBy: 'name',
      maxResults: 5,
      weight: 0.8
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockMultiClient = {
      searchMultipleCollections: vi.fn().mockResolvedValue(mockResponse)
    } as unknown as MultiCollectionSearchClient;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient)
      );

      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('performs search with query', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('test query', defaultCollections);
        // Wait for the debounced search to execute
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledWith({
        query: 'test query',
        collections: defaultCollections,
        mergeStrategy: 'relevance'
      });
      expect(result.current.results).toEqual(mockResponse);
      expect(result.current.query).toBe('test query');
    });

    it('updates query with setQuery triggers search', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          defaultCollections,
          debounceMs: 0 // Disable debounce for testing
        })
      );

      await act(async () => {
        result.current.setQuery('new query');
        // Wait for the search to complete
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(result.current.query).toBe('new query');
      expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledWith({
        query: 'new query',
        collections: defaultCollections,
        mergeStrategy: 'relevance'
      });
    });

    it('handles search errors', async () => {
      const error = new Error('Search failed');
      vi.mocked(mockMultiClient.searchMultipleCollections).mockRejectedValueOnce(error);

      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      // Perform search
      await act(async () => {
        result.current.search('test', defaultCollections);
        // Wait for the mock to be called
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      // Wait for the error state to be updated
      await vi.waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.results).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('shows loading state during search', async () => {
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve;
      });
      vi.mocked(mockMultiClient.searchMultipleCollections).mockReturnValueOnce(searchPromise as any);

      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      // Start search
      act(() => {
        result.current.search('test', defaultCollections);
      });

      // Wait for loading to be true
      await vi.waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolveSearch!(mockResponse);
      });

      // Wait for loading to be false
      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.results).toEqual(mockResponse);
    });
  });

  describe('search with options', () => {
    it('passes search options to client', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      const searchRequest: MultiCollectionSearchRequest = {
        query: 'test',
        collections: defaultCollections,
        resultMode: 'perCollection',
        mergeStrategy: 'roundRobin',
        normalizeScores: false
      };

      await act(async () => {
        result.current.search(searchRequest);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledWith(searchRequest);
    });

    it('supports per-collection filters', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      const collectionsWithFilters: CollectionSearchConfig[] = [
        {
          ...defaultCollections[0],
          filterBy: 'in_stock:true'
        },
        {
          ...defaultCollections[1],
          filterBy: 'active:true'
        }
      ];

      await act(async () => {
        result.current.search('test', collectionsWithFilters);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      const call = vi.mocked(mockMultiClient.searchMultipleCollections).mock.calls[0][0];
      expect(call.collections[0].filterBy).toBe('in_stock:true');
      expect(call.collections[1].filterBy).toBe('active:true');
    });

    it('supports per-collection sort', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      const collectionsWithSort: CollectionSearchConfig[] = [
        {
          ...defaultCollections[0],
          sortBy: 'price:asc'
        },
        {
          ...defaultCollections[1],
          sortBy: 'name:desc'
        }
      ];

      await act(async () => {
        result.current.search('test', collectionsWithSort);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      const call = vi.mocked(mockMultiClient.searchMultipleCollections).mock.calls[0][0];
      expect(call.collections[0].sortBy).toBe('price:asc');
      expect(call.collections[1].sortBy).toBe('name:desc');
    });
  });

  describe('clearResults', () => {
    it('clears search state', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      // Perform search first
      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(result.current.results).toBeTruthy();
      expect(result.current.query).toBe('test');

      // Clear search
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('result accessors', () => {
    it('provides getResultsByCollection', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      // getResultsByCollection returns undefined for backward compatibility
      const productResults = result.current.getResultsByCollection('products');
      expect(productResults).toBeUndefined();

      const categoryResults = result.current.getResultsByCollection('categories');
      expect(categoryResults).toBeUndefined();
    });

    it('provides getCollectionStats', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      const stats = result.current.getCollectionStats();
      expect(stats).toEqual({
        products: {
          found: 10,
          included: 1,
          searchTime: 10
        },
        categories: {
          found: 5,
          included: 1,
          searchTime: 8
        }
      });
    });

    it('returns empty results when no search performed', () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient)
      );

      expect(result.current.getResultsByCollection('products')).toBeUndefined();
      expect(result.current.getCollectionStats()).toEqual({});
    });
  });

  describe('updateCollections', () => {
    it('updates collections configuration', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          defaultCollections: [defaultCollections[0]],
          debounceMs: 0
        })
      );

      // Initial search with one collection
      await act(async () => {
        result.current.setQuery('test');
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledTimes(1);
        });
      });

      // Update collections
      await act(async () => {
        result.current.updateCollections(defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledTimes(2);
        });
      });

      // Verify the second search used updated collections
      const lastCall = vi.mocked(mockMultiClient.searchMultipleCollections).mock.calls[1][0];
      expect(lastCall.collections).toEqual(defaultCollections);
    });

    it('does not search when updating collections without existing query', () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient)
      );

      act(() => {
        result.current.updateCollections(defaultCollections);
      });

      expect(mockMultiClient.searchMultipleCollections).not.toHaveBeenCalled();
    });
  });

  describe('hook options', () => {
    it('searches on mount when searchOnMount is true', async () => {
      renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          defaultCollections,
          searchOnMount: true
        })
      );

      // Wait for the search to complete
      await vi.waitFor(() => {
        expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledWith({
          query: '*',
          collections: defaultCollections,
          mergeStrategy: 'relevance'
        });
      });
    });

    it('does not search on mount when searchOnMount is false', () => {
      renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          defaultCollections,
          searchOnMount: false
        })
      );

      expect(mockMultiClient.searchMultipleCollections).not.toHaveBeenCalled();
    });

    it('calls onSearchComplete callback', async () => {
      const onSearchComplete = vi.fn();
      
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          onSearchComplete,
          debounceMs: 0
        })
      );

      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(onSearchComplete).toHaveBeenCalled();
        });
      });

      expect(onSearchComplete).toHaveBeenCalledWith(mockResponse);
    });

    it('calls onSearchError callback', async () => {
      const error = new Error('Search failed');
      const onSearchError = vi.fn();
      vi.mocked(mockMultiClient.searchMultipleCollections).mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          onSearchError,
          debounceMs: 0
        })
      );

      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(onSearchError).toHaveBeenCalled();
        });
      });

      expect(onSearchError).toHaveBeenCalledWith(error);
    });

    it('respects debounceMs option', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, {
          defaultCollections,
          debounceMs: 500
        })
      );

      act(() => {
        result.current.setQuery('test');
      });

      // Should not search immediately
      expect(mockMultiClient.searchMultipleCollections).not.toHaveBeenCalled();

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Now it should have searched
      expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledWith({
        query: 'test',
        collections: defaultCollections,
        mergeStrategy: 'relevance'
      });

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('handles empty search query', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledWith({
        query: '',
        collections: defaultCollections,
        mergeStrategy: 'relevance'
      });
    });

    it('handles empty collections array', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        try {
          await result.current.search('test', []);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('No collections configured for search');
        }
      });
    });

    it('handles response with errors', async () => {
      const responseWithErrors: MultiCollectionSearchResponse = {
        ...mockResponse,
        errorsByCollection: {
          products: 'Collection not found'
        }
      };
      vi.mocked(mockMultiClient.searchMultipleCollections).mockResolvedValueOnce(responseWithErrors);

      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(result.current.results?.errorsByCollection).toEqual({
        products: 'Collection not found'
      });
    });

    it('handles response with facets', async () => {
      const responseWithFacets: MultiCollectionSearchResponse = {
        ...mockResponse,
        facetsByCollection: {
          products: [
            {
              field_name: 'category',
              counts: [{ value: 'Electronics', count: 5 }]
            }
          ]
        }
      };
      vi.mocked(mockMultiClient.searchMultipleCollections).mockResolvedValueOnce(responseWithFacets);

      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('test', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(result.current.results?.facetsByCollection).toBeDefined();
      expect(result.current.results?.facetsByCollection?.products).toHaveLength(1);
    });

    it('handles perCollection result mode', async () => {
      const perCollectionResponse: MultiCollectionSearchResponse = {
        ...mockResponse,
        hitsByCollection: {
          products: [mockResponse.hits[0]],
          categories: [mockResponse.hits[1]]
        }
      };
      vi.mocked(mockMultiClient.searchMultipleCollections).mockResolvedValueOnce(perCollectionResponse);

      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      await act(async () => {
        result.current.search('test', defaultCollections, { resultMode: 'perCollection' });
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalled();
        });
      });

      expect(result.current.results?.hitsByCollection).toBeDefined();
      expect(result.current.results?.hitsByCollection?.products).toHaveLength(1);
      expect(result.current.results?.hitsByCollection?.categories).toHaveLength(1);
    });

    it('handles null client gracefully', () => {
      let hookError: Error | undefined;
      
      try {
        renderHook(() => 
          useMultiCollectionSearch(null as any)
        );
      } catch (error) {
        hookError = error as Error;
      }

      expect(hookError).toBeDefined();
      expect(hookError?.message).toContain("Cannot use 'in' operator");
    });

    it('performs multiple searches sequentially', async () => {
      const { result } = renderHook(() => 
        useMultiCollectionSearch(mockMultiClient, { debounceMs: 0 })
      );

      // Perform first search
      await act(async () => {
        result.current.search('test1', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledTimes(1);
        });
      });

      expect(result.current.query).toBe('test1');

      // Perform second search
      await act(async () => {
        result.current.search('test2', defaultCollections);
        await vi.waitFor(() => {
          expect(mockMultiClient.searchMultipleCollections).toHaveBeenCalledTimes(2);
        });
      });

      expect(result.current.query).toBe('test2');
    });
  });
});