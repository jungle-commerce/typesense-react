/**
 * @fileoverview Hook for managing UI state of facets (search, expansion, scroll position)
 * that needs to persist across re-renders but not in the main search state.
 */

import { useRef, useCallback } from 'react';

/**
 * UI state for individual facets
 */
interface FacetUIState {
  searchQuery: string;
  isExpanded: boolean;
  scrollTop: number;
}

/**
 * Map of facet field names to their UI states
 */
type FacetUIStateMap = Record<string, FacetUIState>;

/**
 * Hook for managing facet UI state
 * @returns Facet UI state and management functions
 */
export function useFacetState() {
  // Use ref to store state without causing re-renders
  const stateRef = useRef<FacetUIStateMap>({});

  /**
   * Gets the UI state for a specific facet
   * @param field - Facet field name
   * @returns UI state for the facet
   */
  const getFacetState = useCallback((field: string): FacetUIState => {
    if (!stateRef.current[field]) {
      stateRef.current[field] = {
        searchQuery: '',
        isExpanded: true,
        scrollTop: 0,
      };
    }
    return stateRef.current[field];
  }, []);

  /**
   * Sets the search query for a facet
   * @param field - Facet field name
   * @param query - Search query
   */
  const setFacetSearch = useCallback((field: string, query: string) => {
    const state = getFacetState(field);
    state.searchQuery = query;
  }, [getFacetState]);

  /**
   * Toggles the expansion state of a facet
   * @param field - Facet field name
   * @param expanded - Optional explicit expanded state
   */
  const toggleFacetExpansion = useCallback((field: string, expanded?: boolean) => {
    const state = getFacetState(field);
    state.isExpanded = expanded !== undefined ? expanded : !state.isExpanded;
  }, [getFacetState]);

  /**
   * Sets the scroll position for a facet
   * @param field - Facet field name
   * @param scrollTop - Scroll position
   */
  const setFacetScroll = useCallback((field: string, scrollTop: number) => {
    const state = getFacetState(field);
    state.scrollTop = scrollTop;
  }, [getFacetState]);

  /**
   * Resets the UI state for a facet
   * @param field - Facet field name
   */
  const resetFacetState = useCallback((field: string) => {
    stateRef.current[field] = {
      searchQuery: '',
      isExpanded: true,
      scrollTop: 0,
    };
  }, []);

  /**
   * Resets all facet UI states
   */
  const resetAllFacetStates = useCallback(() => {
    stateRef.current = {};
  }, []);

  return {
    getFacetState,
    setFacetSearch,
    toggleFacetExpansion,
    setFacetScroll,
    resetFacetState,
    resetAllFacetStates,
  };
}

/**
 * Hook for managing a single facet's UI state
 * @param field - Facet field name
 * @returns UI state and actions for the specific facet
 */
export function useSingleFacetState(field: string) {
  const {
    getFacetState,
    setFacetSearch,
    toggleFacetExpansion,
    setFacetScroll,
    resetFacetState,
  } = useFacetState();

  const state = getFacetState(field);

  return {
    searchQuery: state.searchQuery,
    isExpanded: state.isExpanded,
    scrollTop: state.scrollTop,
    setSearch: (query: string) => setFacetSearch(field, query),
    toggleExpansion: (expanded?: boolean) => toggleFacetExpansion(field, expanded),
    setScroll: (scrollTop: number) => setFacetScroll(field, scrollTop),
    reset: () => resetFacetState(field),
  };
}