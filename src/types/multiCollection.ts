/**
 * @fileoverview Type definitions for multi-collection search functionality.
 * These types support searching across multiple Typesense collections
 * with result merging and relevance scoring.
 */

import type { SearchHit, TypesenseSearchResponse } from './index';

/**
 * Configuration for searching a specific collection
 */
export interface CollectionSearchConfig {
  /** The Typesense collection name */
  collection: string;
  
  /** Optional namespace prefix for results (e.g., 'product', 'category') */
  namespace?: string;
  
  /** Collection-specific fields to search (comma-separated) */
  queryBy?: string;
  
  /** Collection-specific sort order (e.g., 'popularity:desc') */
  sortBy?: string;
  
  /** Maximum number of results from this collection */
  maxResults?: number;
  
  /** Relevance weight multiplier for merging (default: 1.0) */
  weight?: number;
  
  /** Optional filter for this collection */
  filterBy?: string;
  
  /** Whether to include facets from this collection */
  includeFacets?: boolean;
  
  /** Facet fields for this collection */
  facetBy?: string;
  
  /** Fields to include in the response (comma-separated) */
  includeFields?: string;
  
  /** Fields to exclude from the response (comma-separated) */
  excludeFields?: string;
}

/**
 * Request configuration for multi-collection search
 */
export interface MultiCollectionSearchRequest {
  /** The search query */
  query: string;
  
  /** Array of collections to search */
  collections: CollectionSearchConfig[];
  
  /** Global maximum results across all collections */
  globalMaxResults?: number;
  
  /** Enable search term highlighting */
  enableHighlighting?: boolean;
  
  /** Highlighting configuration */
  highlightConfig?: {
    /** HTML tag to start highlight (default: '<mark>') */
    startTag?: string;
    
    /** HTML tag to end highlight (default: '</mark>') */
    endTag?: string;
    
    /** CSS class to apply to highlights */
    cssClass?: string;
    
    /** Number of tokens to include before/after highlight */
    affixNumTokens?: number;
  };
  
  /** How to merge results from different collections */
  mergeStrategy?: 'relevance' | 'roundRobin' | 'collectionOrder';
  
  /** Whether to normalize scores across collections */
  normalizeScores?: boolean;
  
  /** How to return results: 'interleaved' (merged only), 'perCollection' (separate), or 'both' */
  resultMode?: 'interleaved' | 'perCollection' | 'both';
}

/**
 * Extended search hit with multi-collection metadata
 */
export interface MultiCollectionSearchHit extends SearchHit {
  /** The collection this hit came from */
  _collection: string;
  
  /** Optional namespace for categorization */
  _namespace?: string;
  
  /** Rank within the original collection results */
  _collectionRank: number;
  
  /** Original relevance score from Typesense */
  _originalScore: number;
  
  /** Normalized score (0-1) within the collection */
  _normalizedScore: number;
  
  /** Final merged score used for sorting */
  _mergedScore: number;
  
  /** Collection weight that was applied */
  _collectionWeight: number;
}

/**
 * Response from multi-collection search
 */
export interface MultiCollectionSearchResponse {
  /** Merged and sorted hits from all collections */
  hits: MultiCollectionSearchHit[];
  
  /** Total number of results after merging */
  found: number;
  
  /** Number of results found per collection */
  totalFoundByCollection: Record<string, number>;
  
  /** Number of results included per collection */
  includedByCollection: Record<string, number>;
  
  /** Total search time in milliseconds */
  searchTimeMs: number;
  
  /** Individual search times per collection */
  searchTimeByCollection: Record<string, number>;
  
  /** The original query */
  query: string;
  
  /** Facets by collection (if requested) */
  facetsByCollection?: Record<string, any>;
  
  /** Any errors that occurred per collection */
  errorsByCollection?: Record<string, string>;
  
  /** Results organized by collection (when resultMode is 'perCollection' or 'both') */
  hitsByCollection?: Record<string, MultiCollectionSearchHit[]>;
  
  /** The result mode used for this search */
  resultMode: 'interleaved' | 'perCollection' | 'both';
}

/**
 * State for multi-collection search hook
 */
export interface MultiCollectionSearchState {
  /** Current search results */
  results?: MultiCollectionSearchResponse;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error?: Error;
  
  /** Last search request */
  lastRequest?: MultiCollectionSearchRequest;
  
  /** Timestamp of last search */
  lastSearchAt?: number;
}

/**
 * Options for the useMultiCollectionSearch hook
 */
export interface UseMultiCollectionSearchOptions {
  /** Default collections configuration */
  defaultCollections?: CollectionSearchConfig[];
  
  /** Default merge strategy */
  defaultMergeStrategy?: 'relevance' | 'roundRobin' | 'collectionOrder';
  
  /** Whether to search on mount */
  searchOnMount?: boolean;
  
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  
  /** Callback when search completes */
  onSearchComplete?: (response: MultiCollectionSearchResponse) => void;
  
  /** Callback when search fails */
  onSearchError?: (error: Error) => void;
}

/**
 * Return type for useMultiCollectionSearch hook
 */
export interface UseMultiCollectionSearchReturn {
  /** Current state */
  state: MultiCollectionSearchState;
  
  /** Current query */
  query: string;
  
  /** Search results */
  results: MultiCollectionSearchResponse | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Perform a search */
  search: ((request: MultiCollectionSearchRequest) => Promise<void>) & 
          ((query: string, collections: CollectionSearchConfig[]) => Promise<void>);
  
  /** Set just the query (uses default collections) */
  setQuery: (query: string) => void;
  
  /** Clear results */
  clearResults: () => void;
  
  /** Update collection configuration */
  updateCollections: (collections: CollectionSearchConfig[]) => void;
  
  /** Get results for a specific collection */
  getResultsByCollection: (collection: string) => CollectionSearchResult | undefined;
  
  /** Get collection stats */
  getCollectionStats: () => Record<string, { found: number; included: number; searchTime: number }>;
}

/**
 * Internal type for collection search results
 */
export interface CollectionSearchResult {
  config: CollectionSearchConfig;
  response: TypesenseSearchResponse;
  searchTimeMs: number;
  error?: Error;
}