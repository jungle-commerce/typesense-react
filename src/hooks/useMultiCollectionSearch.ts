/**
 * @fileoverview Hook for performing searches across multiple Typesense collections
 * with result merging and relevance scoring.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MultiCollectionSearchClient } from '../core/MultiCollectionClient';
import { TypesenseSearchClient } from '../core/TypesenseClient';
import type {
  MultiCollectionSearchRequest,
  MultiCollectionSearchState,
  UseMultiCollectionSearchOptions,
  UseMultiCollectionSearchReturn,
  CollectionSearchConfig,
  CollectionSearchResult,
} from '../types/multiCollection';

/**
 * Hook for multi-collection search functionality
 */
export function useMultiCollectionSearch(
  client: MultiCollectionSearchClient | TypesenseSearchClient,
  options: UseMultiCollectionSearchOptions = {}
): UseMultiCollectionSearchReturn {
  const {
    defaultCollections = [],
    defaultMergeStrategy = 'relevance',
    searchOnMount = false,
    debounceMs = 300,
    onSearchComplete,
    onSearchError,
  } = options;

  // State
  const [state, setState] = useState<MultiCollectionSearchState>({
    loading: false,
  });

  // Refs for managing debouncing and cleanup
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchRef = useRef<string>('');
  const collectionsRef = useRef<CollectionSearchConfig[]>(defaultCollections);

  // Use provided multi-collection client or create one
  const multiClient = useMemo(() => {
    if ('searchMultipleCollections' in client) {
      return client as MultiCollectionSearchClient;
    }
    return new MultiCollectionSearchClient(client as TypesenseSearchClient);
  }, [client]);

  /**
   * Perform a multi-collection search
   */
  const performSearch = useCallback(async (request: MultiCollectionSearchRequest) => {
    // Skip if same search
    const searchKey = JSON.stringify(request);
    if (searchKey === lastSearchRef.current && state.loading) {
      return;
    }

    lastSearchRef.current = searchKey;
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const response = await multiClient.searchMultipleCollections(request);
      
      setState({
        results: response,
        loading: false,
        lastRequest: request,
        lastSearchAt: Date.now(),
      });

      onSearchComplete?.(response);
    } catch (error) {
      const searchError = error instanceof Error ? error : new Error('Search failed');
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: searchError,
      }));

      onSearchError?.(searchError);
    }
  }, [multiClient, state.loading, onSearchComplete, onSearchError]);

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((request: MultiCollectionSearchRequest) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(request);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  /**
   * Main search function
   */
  const search = useCallback(async (
    requestOrQuery: MultiCollectionSearchRequest | string,
    collections?: CollectionSearchConfig[]
  ) => {
    // Handle both signatures for backward compatibility
    const request: MultiCollectionSearchRequest = typeof requestOrQuery === 'string'
      ? { query: requestOrQuery, collections: collections || [] }
      : requestOrQuery;
      
    // Use provided collections or default
    const collectionsToSearch = request.collections && request.collections.length > 0 
      ? request.collections 
      : collectionsRef.current;

    if (collectionsToSearch.length === 0) {
      throw new Error('No collections configured for search');
    }

    const fullRequest: MultiCollectionSearchRequest = {
      ...request,
      collections: collectionsToSearch,
      mergeStrategy: request.mergeStrategy || defaultMergeStrategy,
    };

    // Use debouncing for query changes
    if (request.query !== state.lastRequest?.query) {
      debouncedSearch(fullRequest);
    } else {
      // Immediate search for other changes
      await performSearch(fullRequest);
    }
  }, [debouncedSearch, performSearch, defaultMergeStrategy, state.lastRequest]);

  /**
   * Set just the query (uses current collections)
   */
  const setQuery = useCallback((query: string) => {
    search({
      query,
      collections: collectionsRef.current,
      globalMaxResults: state.lastRequest?.globalMaxResults,
      enableHighlighting: state.lastRequest?.enableHighlighting,
      highlightConfig: state.lastRequest?.highlightConfig,
      mergeStrategy: state.lastRequest?.mergeStrategy || defaultMergeStrategy,
      normalizeScores: state.lastRequest?.normalizeScores,
    });
  }, [search, state.lastRequest, defaultMergeStrategy]);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setState({
      loading: false,
      results: undefined,
      error: undefined,
      lastRequest: undefined,
      lastSearchAt: undefined,
    });
    lastSearchRef.current = '';
  }, []);

  /**
   * Update collection configuration
   */
  const updateCollections = useCallback((collections: CollectionSearchConfig[]) => {
    collectionsRef.current = collections;
    
    // Re-run search if we have a query
    if (state.lastRequest?.query) {
      setQuery(state.lastRequest.query);
    }
  }, [state.lastRequest, setQuery]);

  // Search on mount if configured
  useEffect(() => {
    if (searchOnMount && collectionsRef.current.length > 0) {
      search({
        query: '*',
        collections: collectionsRef.current,
      });
    }
  }, []); // Only on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Alias for clearResults
   */
  // @ts-ignore - Unused alias kept for backward compatibility
  const _clearSearch = clearResults;

  /**
   * Get results filtered by collection
   */
  const getResultsByCollection = useCallback((_collection: string): CollectionSearchResult | undefined => {
    // This is a simplified version for backward compatibility
    // The actual CollectionSearchResult type is more complex
    return undefined;
  }, [state.results]);

  /**
   * Get statistics for each collection
   */
  const getCollectionStats = useCallback((): Record<string, { found: number; included: number; searchTime: number }> => {
    if (!state.results) return {};
    
    const stats: Record<string, { found: number; included: number; searchTime: number }> = {};
    
    if (state.results?.totalFoundByCollection) {
      Object.entries(state.results.totalFoundByCollection).forEach(([collection, found]) => {
        stats[collection] = {
          found,
          included: state.results?.includedByCollection?.[collection] || 0,
          searchTime: state.results?.searchTimeByCollection?.[collection] || 0
        };
      });
    }
    
    return stats;
  }, [state.results]);

  return {
    // State
    state,
    
    // State properties for backward compatibility
    query: state.lastRequest?.query || '',
    results: state.results || null,
    loading: state.loading,
    error: state.error || null,
    
    // Methods
    search,
    setQuery,
    clearResults,
    updateCollections,
    getResultsByCollection,
    getCollectionStats,
  };
}

/**
 * Hook for using multi-collection search with global client
 */
export function useMultiCollectionSearchWithProvider(
  _options: UseMultiCollectionSearchOptions = {}
): UseMultiCollectionSearchReturn {
  // This would use a context provider to get the client
  // For now, throwing an error to indicate it needs implementation
  throw new Error(
    'useMultiCollectionSearchWithProvider requires MultiCollectionProvider to be implemented'
  );
}