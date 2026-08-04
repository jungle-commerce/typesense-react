/**
 * @fileoverview Provider-level search engine. Owns the ONE auto-search effect
 * per SearchProvider, so any number of `useSearch()` call sites share a single
 * scheduled search per state change instead of each firing their own copy.
 *
 * Before this existed, the auto-search effect lived inside `useSearch()`: a
 * page with N call sites (search box, results table, one per facet, ...)
 * issued N byte-identical requests on every mount / filter / sort / page
 * change, and the pile-up pushed requests past the HTTP client's connection
 * timeout, whose automatic retries amplified the storm further.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { buildSearchRequest, type BuildSearchRequestOptions } from '../utils/requestBuilder';
import { buildFilterString } from '../utils/filterBuilder';
import type {
  SearchAction,
  SearchEngine,
  SearchEventListeners,
  SearchRequest,
  SearchState,
  TypesenseSearchResponse,
} from '../types';

/**
 * Parameters for the provider search engine
 */
interface UseProviderSearchEngineParams {
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  client: any; // TypesenseSearchClient
  collection: string;
  initialSearchParams?: Partial<SearchRequest>;
  /** Whether the provider performs the initial search on mount */
  searchOnMount: boolean;
  /** Enable per-facet exclusion queries for disjunctive (multi-select) facets */
  enableDisjunctiveFacetQueries: boolean;
  /** Debounce delay applied to query (text) changes */
  debounceMs: number;
  /** Maximum number of facet values to return */
  maxFacetValues: number;
  /** Fields to search in (comma-separated). Overrides schema-derived fields. */
  queryBy?: string;
}

/**
 * Creates the single search engine for a SearchProvider.
 * @param params - Engine configuration
 * @returns Engine handle exposed through the search context
 */
export function useProviderSearchEngine(params: UseProviderSearchEngineParams): SearchEngine {
  const {
    state,
    dispatch,
    client,
    collection,
    initialSearchParams,
    searchOnMount,
    enableDisjunctiveFacetQueries,
    debounceMs,
    maxFacetValues,
    queryBy,
  } = params;

  // Latest state for callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Debounce timer and duplicate-search guards
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchKeyRef = useRef<string>('');
  /** Number of searches currently awaiting a response */
  const pendingCountRef = useRef(0);
  /**
   * Monotonic id of the most recently dispatched search. A response only
   * commits (SET_RESULTS / SET_ERROR / listener notify) if its search is
   * still the latest — otherwise a slow earlier response would overwrite a
   * newer one (last-arrival-wins instead of last-intent-wins).
   */
  const searchSeqRef = useRef(0);
  /** The `state.query` value of the last dispatched search — decides debouncing */
  const lastSearchedQueryRef = useRef<string>('');
  /** Whether the auto-search effect has made its initial mount decision */
  const didRunRef = useRef(false);

  // Search lifecycle listeners (registered by useSearch call sites)
  const listenersRef = useRef<Set<SearchEventListeners>>(new Set());

  /**
   * Builds a request from the latest state, applying per-call overrides on
   * top of the provider-level options.
   */
  const buildRequest = useCallback(
    (overrides?: BuildSearchRequestOptions): SearchRequest => {
      return buildSearchRequest(stateRef.current, {
        queryBy: overrides?.queryBy ?? queryBy,
        maxFacetValues: overrides?.maxFacetValues ?? maxFacetValues,
        initialSearchParams,
      });
    },
    [queryBy, maxFacetValues, initialSearchParams]
  );

  /**
   * Performs the actual search request (main query plus one exclusion query
   * per active disjunctive facet group), dispatches results, and notifies
   * listeners.
   *
   * `force` distinguishes imperative searches from auto-triggers: an
   * auto-trigger whose request is identical to the last one dispatched is
   * redundant by definition (same params, same result) and skipped — e.g.
   * the effect re-fires when `searchPerformed` flips after the mount search.
   * A forced search (actions.search(), refresh flows re-searching after
   * clearCache) runs again unless the identical request is still in flight.
   */
  const performSearch = useCallback(async (request?: SearchRequest, options?: { force?: boolean }) => {
    const currentState = stateRef.current;
    const searchRequest = request ?? buildRequest();

    // An auto-trigger whose request matches the last dispatched one is
    // redundant by definition (same params, same result). A forced search
    // always proceeds: refresh flows re-run identical params after
    // clearCache(), and while an identical request is still in flight the
    // sequence guard below makes the forced response the one that commits.
    const searchKey = JSON.stringify(searchRequest);
    if (!options?.force && searchKey === lastSearchKeyRef.current) {
      return;
    }

    lastSearchKeyRef.current = searchKey;
    lastSearchedQueryRef.current = currentState.query;
    const seq = ++searchSeqRef.current;
    pendingCountRef.current += 1;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Check if we need to perform disjunctive facet queries
      const hasDisjunctiveFacets = Object.keys(currentState.disjunctiveFacets).some(
        field => currentState.disjunctiveFacets[field]?.length > 0
      );

      let finalResult: TypesenseSearchResponse;

      if (hasDisjunctiveFacets && enableDisjunctiveFacetQueries) {
        // Perform parallel queries for disjunctive facets
        const disjunctiveQueries: SearchRequest[] = [];

        // Main query with all filters
        disjunctiveQueries.push(searchRequest);

        // Additional queries for each disjunctive facet (without that facet's filter)
        for (const [field, values] of Object.entries(currentState.disjunctiveFacets)) {
          if (values && values.length > 0) {
            // Build filter without this facet
            const filterWithoutFacet = buildFilterString({
              disjunctiveFacets: {
                ...currentState.disjunctiveFacets,
                [field]: [], // Exclude this facet
              },
              numericFilters: currentState.numericFilters,
              dateFilters: currentState.dateFilters,
              selectiveFilters: currentState.selectiveFilters,
              customFilters: currentState.customFilters,
              additionalFilters: currentState.additionalFilters,
              schema: currentState.schema,
              useNumericRanges: currentState.useNumericRanges,
              numericFacetRanges: currentState.numericFacetRanges,
            });

            disjunctiveQueries.push({
              ...searchRequest,
              filter_by: filterWithoutFacet || undefined,
              page: 1, // Only need first page for facet counts
              per_page: 0, // Don't need results, just facet counts
              facet_by: field, // Only get counts for this facet
            });
          }
        }

        // Execute all queries in parallel
        const results = await client.multiSearch(collection, disjunctiveQueries);

        // Merge facet counts from parallel queries — into a NEW result object,
        // because responses may be shared via the client cache / in-flight
        // request dedup and must not be mutated.
        const mainResult = results[0];
        finalResult = mainResult;
        if (mainResult.facet_counts && results.length > 1) {
          const mergedFacetCounts = [...mainResult.facet_counts];
          for (let i = 1; i < results.length; i++) {
            const facetResult = results[i];
            if (facetResult.facet_counts?.[0]) {
              // Replace the facet counts with the unfiltered version
              const facetIndex = mergedFacetCounts.findIndex(
                (f: any) => f.field_name === facetResult.facet_counts![0].field_name
              );
              if (facetIndex >= 0) {
                mergedFacetCounts[facetIndex] = facetResult.facet_counts[0];
              }
            }
          }
          finalResult = { ...mainResult, facet_counts: mergedFacetCounts };
        }
      } else {
        // Simple search without disjunctive faceting
        finalResult = await client.search(collection, searchRequest);
      }

      if (seq !== searchSeqRef.current) {
        // A newer search was dispatched while this one was in flight — its
        // response owns the final state.
        return;
      }

      dispatch({ type: 'SET_RESULTS', payload: finalResult });

      // Update accumulated facet values if enabled
      if (currentState.accumulateFacets && finalResult.facet_counts) {
        for (const facetResult of finalResult.facet_counts) {
          const values = facetResult.counts.map((c: any) => c.value);
          dispatch({
            type: 'UPDATE_ACCUMULATED_FACETS',
            payload: { field: facetResult.field_name, values }
          });
        }
      }

      // Update numeric facet bounds
      if (finalResult.facet_counts && currentState.schema) {
        for (const facetResult of finalResult.facet_counts) {
          const field = currentState.schema.fields?.find(f => f.name === facetResult.field_name);
          if (field && ['int32', 'int64', 'float'].includes(field.type)) {
            // Typesense returns exact min/max stats for numeric facets no
            // matter how few facet values are requested — prefer them over
            // deriving bounds from the returned values, which are the top N
            // by count and can miss the extremes entirely. (This is also
            // what makes a small maxFacetValues safe: faceting a
            // high-cardinality numeric field with a large max_facet_values
            // is O(distinct values) server-side and times out on large
            // filtered result sets, while the stats are free.)
            const stats = facetResult.stats;
            let min: number | undefined;
            let max: number | undefined;
            if (typeof stats?.min === 'number' && typeof stats?.max === 'number') {
              min = stats.min;
              max = stats.max;
            } else {
              const numericValues = facetResult.counts
                .map((c: any) => parseFloat(c.value))
                .filter((n: number) => !isNaN(n));
              if (numericValues.length > 0) {
                min = Math.min(...numericValues);
                max = Math.max(...numericValues);
              }
            }

            if (min !== undefined && max !== undefined) {
              // Accumulated bounds only ever widen, so a narrowed search
              // cannot shrink the slider range mid-session
              const accBounds = currentState.accumulateFacets
                ? currentState.accumulatedFacetValues[facetResult.field_name]?.numericBounds
                : undefined;
              dispatch({
                type: 'UPDATE_NUMERIC_FACET_BOUNDS',
                payload: {
                  field: facetResult.field_name,
                  min: accBounds ? Math.min(accBounds.min, min) : min,
                  max: accBounds ? Math.max(accBounds.max, max) : max,
                },
              });
            }
          }
        }
      }

      listenersRef.current.forEach(listener => {
        try {
          listener.onSearchSuccess?.(finalResult);
        } catch {
          // A throwing listener must not break other listeners or the search
        }
      });
    } catch (error) {
      if (seq !== searchSeqRef.current) {
        // Stale failure — a newer search owns the final state.
        return;
      }
      const searchError = error instanceof Error ? error : new Error('Search failed');
      dispatch({ type: 'SET_ERROR', payload: searchError });
      listenersRef.current.forEach(listener => {
        try {
          listener.onSearchError?.(searchError);
        } catch {
          // A throwing listener must not break other listeners
        }
      });
    } finally {
      pendingCountRef.current -= 1;
    }
  }, [
    buildRequest,
    client,
    collection,
    enableDisjunctiveFacetQueries,
    dispatch,
  ]);

  /**
   * Debounced search for query (text) changes
   */
  const debouncedSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      // Build at fire time so the request reflects the final debounced state
      performSearch();
    }, debounceMs);
  }, [performSearch, debounceMs]);

  // THE auto-search effect — the only one per provider. Triggers a search
  // when any search-relevant state changes (and on mount when searchOnMount).
  useEffect(() => {
    // A reset (RESET_SEARCH) clears the displayed results, so the last
    // request key has nothing on screen to be redundant against — forget it
    // so the rebuilt initial request may run again and repopulate the list.
    if (!state.searchPerformed && state.results === null && pendingCountRef.current === 0) {
      lastSearchKeyRef.current = '';
    }

    if (!didRunRef.current) {
      didRunRef.current = true;
      // searchOnMount=false suppresses ONLY this initial search — later
      // state changes (typing, filters, pagination) schedule normally.
      if (!searchOnMount) {
        return;
      }
      // The initial search is never debounced, even when a non-empty query
      // was restored from the URL into initial state.
      performSearch();
      return;
    }

    const queryChanged = state.query !== lastSearchedQueryRef.current;

    // A searchOnMount=false tree that has never searched stays quiet for
    // non-interactive state churn (StrictMode re-runs, resets, initial
    // syncs); a query change is a real interaction and searches normally.
    if (!state.searchPerformed && !searchOnMount && !queryChanged && pendingCountRef.current === 0) {
      return;
    }

    // Use debouncing for query (text) changes, immediate search for other changes
    if (queryChanged) {
      debouncedSearch();
    } else {
      performSearch();
    }
  }, [
    state.query,
    state.page,
    state.perPage,
    state.sortBy,
    state.multiSortBy,
    state.additionalFilters,
    state.disjunctiveFacets,
    state.numericFilters,
    state.dateFilters,
    state.selectiveFilters,
    state.customFilters,
    state.searchPerformed,
    searchOnMount,
    debouncedSearch,
    performSearch,
  ]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Registers search lifecycle listeners; returns an unsubscribe function
   */
  const subscribe = useCallback((listeners: SearchEventListeners) => {
    listenersRef.current.add(listeners);
    return () => {
      listenersRef.current.delete(listeners);
    };
  }, []);

  /**
   * Imperative search — used by `actions.search()` and refresh flows
   */
  const search = useCallback(async (request?: SearchRequest) => {
    await performSearch(request, { force: true });
  }, [performSearch]);

  return useMemo<SearchEngine>(() => ({
    search,
    buildRequest,
    subscribe,
  }), [search, buildRequest, subscribe]);
}
