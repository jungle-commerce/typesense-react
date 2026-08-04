/**
 * @fileoverview Builds a Typesense search request from provider search state.
 * Shared by the provider-level search engine and imperative `actions.search()`
 * calls so both produce byte-identical requests for identical state.
 */

import { buildFilterString } from './filterBuilder';
import { buildCombinedSortString } from './sortBuilder';
import type { SearchRequest, SearchState } from '../types';

/**
 * Per-call options that influence the built request
 */
export interface BuildSearchRequestOptions {
  /** Fields to search in (comma-separated). Overrides schema-derived fields. */
  queryBy?: string;
  /** Maximum number of facet values to return */
  maxFacetValues?: number;
  /** Provider-level initial search parameters (query_by / per_page / sort_by fallbacks) */
  initialSearchParams?: Partial<SearchRequest>;
}

/**
 * Builds the search request for the given state.
 * @param state - Current search state
 * @param options - Request options
 * @returns Search request parameters
 */
export function buildSearchRequest(
  state: SearchState,
  options: BuildSearchRequestOptions = {}
): SearchRequest {
  const { queryBy, maxFacetValues = 10000, initialSearchParams } = options;

  // Build filter string from all filter types
  const filterBy = buildFilterString({
    disjunctiveFacets: state.disjunctiveFacets,
    numericFilters: state.numericFilters,
    dateFilters: state.dateFilters,
    selectiveFilters: state.selectiveFilters,
    customFilters: state.customFilters,
    additionalFilters: state.additionalFilters,
    schema: state.schema,
    useNumericRanges: state.useNumericRanges,
    numericFacetRanges: state.numericFacetRanges,
  });

  // Build facet_by string from facet configurations
  const facetBy = state.facets
    .map(f => f.field)
    .filter(Boolean)
    .join(',');

  // Build query_by from schema if not provided
  let searchFields = queryBy || initialSearchParams?.query_by;
  if (!searchFields && state.schema?.fields) {
    // Get all searchable fields from schema
    const searchableFields = state.schema.fields
      .filter(field =>
        field.index !== false &&
        (field.type === 'string' || field.type === 'string[]')
      )
      .map(field => field.name);

    if (searchableFields.length > 0) {
      searchFields = searchableFields.join(',');
    }
  }

  return {
    q: state.query || '*',
    query_by: searchFields || '*', // Use * as fallback to search all fields
    filter_by: filterBy || undefined,
    facet_by: facetBy || undefined,
    max_facet_values: maxFacetValues,
    page: state.page,
    per_page: state.perPage || initialSearchParams?.per_page || 20,
    sort_by: buildCombinedSortString(state.sortBy, state.multiSortBy) || initialSearchParams?.sort_by || undefined,
  };
}
