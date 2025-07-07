/**
 * @fileoverview SearchProvider component that manages the global search state
 * and provides it to child components via React Context.
 */

import React, { createContext, useReducer, useMemo, useEffect } from 'react';
import { TypesenseSearchClient } from '../core/TypesenseClient';
import { searchReducer, createInitialState } from '../core/searchReducer';
import type { 
  SearchProviderProps, 
  SearchContextValue
} from '../types';

/**
 * Search context for providing search state and actions to child components
 */
export const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * SearchProvider component that wraps the application and provides search functionality
 * @param props - SearchProvider configuration props
 */
export const SearchProvider: React.FC<SearchProviderProps> = ({
  children,
  config,
  collection,
  initialState = {},
  initialSearchParams,
  facets = [],
  searchOnMount = false,
  onStateChange,
  performanceMode = false,
  enableDisjunctiveFacetQueries = true,
  accumulateFacets = false,
}) => {
  // Initialize Typesense client with memoization to prevent recreating on every render
  const client = useMemo(() => {
    const cacheTimeout = config.cacheSearchResultsForSeconds 
      ? config.cacheSearchResultsForSeconds * 1000 
      : 5 * 60 * 1000; // Default 5 minutes
    return new TypesenseSearchClient(config, cacheTimeout);
  }, [config]);

  // Initialize state with reducer
  const [state, dispatch] = useReducer(
    searchReducer,
    createInitialState({
      ...initialState,
      facets,
      accumulateFacets,
      perPage: initialSearchParams?.per_page || initialState?.perPage || 20,
    })
  );

  // Call onStateChange when state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  // Set facets if they change
  useEffect(() => {
    if (facets.length > 0) {
      dispatch({ type: 'SET_FACETS', payload: facets });
    }
  }, [facets]);

  // Set schema if provided
  useEffect(() => {
    if (initialState?.schema) {
      dispatch({ type: 'SET_SCHEMA', payload: initialState.schema });
    }
  }, [initialState?.schema]);

  // Create context value with memoization
  const contextValue = useMemo<SearchContextValue>(() => ({
    state,
    dispatch,
    client,
    collection,
    initialSearchParams,
    config: {
      searchOnMount,
      performanceMode,
      enableDisjunctiveFacetQueries,
    },
  }), [
    state, 
    client, 
    collection, 
    initialSearchParams,
    searchOnMount, 
    performanceMode, 
    enableDisjunctiveFacetQueries
  ]);

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
};

/**
 * Hook to access the search context
 * @throws Error if used outside of SearchProvider
 * @returns Search context value
 */
export function useSearchContext(): SearchContextValue {
  const context = React.useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
}