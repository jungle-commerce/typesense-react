/**
 * @fileoverview Barrel export for multi-collection search functionality.
 * This module provides all exports related to searching across multiple
 * Typesense collections.
 */

// Core exports
export { MultiCollectionSearchClient } from '../core/MultiCollectionClient';

// Hook exports
export { 
  useMultiCollectionSearch,
  useMultiCollectionSearchWithProvider,
} from '../hooks/useMultiCollectionSearch';

// Provider exports
export { 
  MultiCollectionProvider,
  useMultiCollectionContext,
  type MultiCollectionProviderProps,
} from '../providers/MultiCollectionProvider';

// Type exports
export type {
  // Configuration types
  CollectionSearchConfig,
  MultiCollectionSearchRequest,
  
  // Response types
  MultiCollectionSearchHit,
  MultiCollectionSearchResponse,
  CollectionSearchResult,
  
  // State and hook types
  MultiCollectionSearchState,
  UseMultiCollectionSearchOptions,
  UseMultiCollectionSearchReturn,
} from '../types/multiCollection';