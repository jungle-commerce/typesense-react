/**
 * @fileoverview Hook for synchronizing SearchState with URL query parameters
 * Enables bookmarking and sharing of search results with filters applied
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  serializeSearchState,
  deserializeSearchParams,
  type UrlSerializerOptions,
  type UrlDeserializerOptions,
} from '../utils/urlSerializer';
import type { SearchState } from '../types';

/**
 * Options for useSearchUrlSync hook
 */
export interface UseSearchUrlSyncOptions extends UrlSerializerOptions, UrlDeserializerOptions {
  /** Whether URL sync is enabled (default: true) */
  enabled?: boolean;
  /** Debounce delay in ms for URL updates (default: 0 = no debounce) */
  debounceMs?: number;
  /** URL params to preserve when syncing (won't be overwritten) */
  preserveParams?: string[];
  /** Callback when URL changes via popstate (browser back/forward) */
  onUrlChange?: (state: Partial<SearchState>) => void;
}

/**
 * Return type for useSearchUrlSync hook
 */
export interface UseSearchUrlSyncReturn {
  /** Initial state derived from URL on mount */
  initialState: Partial<SearchState>;
  /** Sync state to URL */
  syncToUrl: (state: Partial<SearchState>, options?: { replace?: boolean }) => void;
  /** Clear all search params from URL */
  clearUrl: () => void;
}

/**
 * Hook for bidirectional sync between SearchState and URL query parameters
 *
 * @example
 * ```tsx
 * const { initialState, syncToUrl } = useSearchUrlSync({
 *   facetFields: ['status', 'category'],
 *   numericFields: ['price'],
 * });
 *
 * // Use initialState to initialize SearchProvider
 * // Call syncToUrl when state changes
 * ```
 */
export const useSearchUrlSync = (
  options: UseSearchUrlSyncOptions = {}
): UseSearchUrlSyncReturn => {
  const {
    enabled = true,
    debounceMs = 0,
    preserveParams = [],
    onUrlChange,
    paramPrefix,
    defaultPerPage,
    excludeFields,
    facetFields,
    numericFields,
    dateFields,
    selectiveFields,
  } = options;

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build serializer options
  const serializerOptions: UrlSerializerOptions = useMemo(
    () => ({
      paramPrefix,
      defaultPerPage,
      excludeFields,
    }),
    [paramPrefix, defaultPerPage, excludeFields]
  );

  // Build deserializer options
  const deserializerOptions: UrlDeserializerOptions = useMemo(
    () => ({
      paramPrefix,
      facetFields,
      numericFields,
      dateFields,
      selectiveFields,
    }),
    [paramPrefix, facetFields, numericFields, dateFields, selectiveFields]
  );

  // Get initial state from URL on mount
  const initialState = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return deserializeSearchParams(params, deserializerOptions);
  }, [deserializerOptions]);

  // Build URL string from params, preserving specified params
  const buildUrlString = useCallback(
    (searchParams: URLSearchParams): string => {
      const currentParams = new URLSearchParams(window.location.search);

      // Start with preserved params from current URL
      const finalParams = new URLSearchParams();
      for (const param of preserveParams) {
        const value = currentParams.get(param);
        if (value) {
          finalParams.set(param, value);
        }
      }

      // Add search params
      searchParams.forEach((value, key) => {
        finalParams.set(key, value);
      });

      const queryString = finalParams.toString();
      return queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    },
    [preserveParams]
  );

  // Sync state to URL
  const syncToUrl = useCallback(
    (state: Partial<SearchState>, syncOptions?: { replace?: boolean }) => {
      if (!enabled || typeof window === 'undefined') return;

      const doSync = () => {
        const params = serializeSearchState(state, serializerOptions);
        const url = buildUrlString(params);

        if (syncOptions?.replace) {
          window.history.replaceState(null, '', url);
        } else {
          window.history.pushState(null, '', url);
        }
      };

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (debounceMs > 0) {
        debounceTimerRef.current = setTimeout(doSync, debounceMs);
      } else {
        doSync();
      }
    },
    [enabled, serializerOptions, buildUrlString, debounceMs]
  );

  // Clear all search params from URL
  const clearUrl = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    const currentParams = new URLSearchParams(window.location.search);

    // Build URL with only preserved params
    const finalParams = new URLSearchParams();
    for (const param of preserveParams) {
      const value = currentParams.get(param);
      if (value) {
        finalParams.set(param, value);
      }
    }

    const queryString = finalParams.toString();
    const url = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.pushState(null, '', url);
  }, [enabled, preserveParams]);

  // Handle popstate (browser back/forward)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handlePopstate = () => {
      if (onUrlChange) {
        const params = new URLSearchParams(window.location.search);
        const state = deserializeSearchParams(params, deserializerOptions);
        onUrlChange(state);
      }
    };

    window.addEventListener('popstate', handlePopstate);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
      // Clean up debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, onUrlChange, deserializerOptions]);

  return {
    initialState,
    syncToUrl,
    clearUrl,
  };
};
