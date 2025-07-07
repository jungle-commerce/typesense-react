/**
 * @fileoverview MultiCollectionProvider component that provides multi-collection
 * search functionality to child components via React Context.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { TypesenseSearchClient } from '../core/TypesenseClient';
import { useMultiCollectionSearch } from '../hooks/useMultiCollectionSearch';
import type { TypesenseConfig } from '../types';
import type { 
  CollectionSearchConfig,
  UseMultiCollectionSearchReturn,
  UseMultiCollectionSearchOptions,
} from '../types/multiCollection';

/**
 * Context value for multi-collection search
 */
interface MultiCollectionContextValue extends UseMultiCollectionSearchReturn {
  client: TypesenseSearchClient;
}

/**
 * Props for MultiCollectionProvider
 */
export interface MultiCollectionProviderProps {
  /** Child components */
  children: React.ReactNode;
  
  /** Typesense configuration or client instance */
  config: TypesenseConfig | TypesenseSearchClient;
  
  /** Default collections to search */
  defaultCollections?: CollectionSearchConfig[];
  
  /** Hook options */
  searchOptions?: UseMultiCollectionSearchOptions;
}

/**
 * Context for multi-collection search
 */
const MultiCollectionContext = createContext<MultiCollectionContextValue | null>(null);

/**
 * Provider component for multi-collection search
 */
export const MultiCollectionProvider: React.FC<MultiCollectionProviderProps> = ({
  children,
  config,
  defaultCollections = [],
  searchOptions = {},
}) => {
  // Initialize or use existing client
  const client = useMemo(() => {
    if (config instanceof TypesenseSearchClient) {
      return config;
    }
    
    const cacheTimeout = config.cacheSearchResultsForSeconds 
      ? config.cacheSearchResultsForSeconds * 1000 
      : 5 * 60 * 1000;
      
    return new TypesenseSearchClient(config, cacheTimeout);
  }, [config]);

  // Initialize multi-collection search
  const multiSearch = useMultiCollectionSearch(client, {
    ...searchOptions,
    defaultCollections,
  });

  // Create context value
  const contextValue = useMemo(() => ({
    ...multiSearch,
    client,
  }), [multiSearch, client]);

  return (
    <MultiCollectionContext.Provider value={contextValue}>
      {children}
    </MultiCollectionContext.Provider>
  );
};

/**
 * Hook to use multi-collection search context
 */
export function useMultiCollectionContext(): MultiCollectionContextValue {
  const context = useContext(MultiCollectionContext);
  
  if (!context) {
    throw new Error(
      'useMultiCollectionContext must be used within a MultiCollectionProvider'
    );
  }
  
  return context;
}