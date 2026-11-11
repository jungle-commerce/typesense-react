/**
 * @fileoverview Tests for buildSearchRequest
 */

import { describe, it, expect } from 'vitest';
import { buildSearchRequest } from '../requestBuilder';
import { createInitialState } from '../../core/searchReducer';

describe('buildSearchRequest', () => {
  it('sends initialSearchParams keys the builder does not set', () => {
    const request = buildSearchRequest(createInitialState({ query: 'lws.mch.00' }), {
      queryBy: 'searchText',
      initialSearchParams: { max_candidates: 10000, exhaustive_search: false },
    });

    expect(request).toMatchObject({
      q: 'lws.mch.00',
      query_by: 'searchText',
      max_candidates: 10000,
      exhaustive_search: false,
    });
  });

  it('keeps built keys over the same keys in initialSearchParams', () => {
    const request = buildSearchRequest(
      createInitialState({
        query: 'shoe',
        page: 3,
        facets: [{ field: 'brand', label: 'Brand', type: 'checkbox' }],
        sortBy: 'price:asc',
      }),
      {
        maxFacetValues: 50,
        initialSearchParams: {
          q: 'ignored',
          facet_by: 'every,field',
          max_facet_values: 9999,
          page: 1,
          filter_by: 'stale:true',
          sort_by: 'createdAt:desc',
        },
      }
    );

    expect(request).toMatchObject({
      q: 'shoe',
      facet_by: 'brand',
      max_facet_values: 50,
      page: 3,
      sort_by: 'price:asc',
    });
    expect(request.filter_by).toBeUndefined();
  });

  it('still falls back to initialSearchParams for query_by, per_page and sort_by', () => {
    const request = buildSearchRequest(createInitialState({ perPage: 0 }), {
      initialSearchParams: { query_by: 'name', per_page: 50, sort_by: 'createdAt:desc' },
    });

    expect(request).toMatchObject({ query_by: 'name', per_page: 50, sort_by: 'createdAt:desc' });
  });
});
