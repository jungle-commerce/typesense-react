/**
 * @fileoverview Regression tests for the provider-level search engine.
 *
 * A list page mounts many `useSearch()` call sites (search box, results
 * table, one per facet, ...). Search scheduling is provider-owned, so any
 * number of call sites must produce exactly ONE request per trigger — when
 * each call site owned its own auto-search effect, a page with N of them
 * issued N byte-identical requests on every mount and filter change.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { SearchProvider } from '../SearchProvider';
import { useSearch } from '../../hooks/useSearch';
import { MockTypesenseClient, createMockSearchResponse } from '../../test/testUtils';
import type { SearchProviderProps } from '../../types';

// Mock the TypesenseClient module
vi.mock('../../core/TypesenseClient', () => ({
  TypesenseSearchClient: vi.fn().mockImplementation(() => mockClient),
}));

const mockClient = new MockTypesenseClient();

/** A component that consumes useSearch the way facets/tables/sidebars do */
const Consumer: React.FC<{ id: number }> = ({ id }) => {
  const { state } = useSearch();
  return <span data-testid={`consumer-${id}`}>{state.results?.found ?? '-'}</span>;
};

/** Exposes actions so tests can drive state changes */
let capturedActions: ReturnType<typeof useSearch>['actions'] | null = null;
const ActionsProbe: React.FC = () => {
  const { actions } = useSearch();
  capturedActions = actions;
  return null;
};

const defaultProps: Omit<SearchProviderProps, 'children'> = {
  config: {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'test-key',
  },
  collection: 'products',
};

const renderTree = (consumerCount: number, props?: Partial<SearchProviderProps>) =>
  render(
    <SearchProvider {...defaultProps} {...props}>
      <ActionsProbe />
      {Array.from({ length: consumerCount }, (_, i) => (
        <Consumer key={i} id={i} />
      ))}
    </SearchProvider>
  );

describe('provider-level search engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedActions = null;
    mockClient.search.mockResolvedValue(createMockSearchResponse());
    mockClient.multiSearch.mockResolvedValue([createMockSearchResponse()]);
  });

  it('performs exactly ONE mount search regardless of consumer count', async () => {
    renderTree(29);

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });

    // Settle: the searchPerformed flip must not schedule a redundant repeat
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockClient.search).toHaveBeenCalledTimes(1);
  });

  it('performs exactly ONE search per filter change regardless of consumer count', async () => {
    renderTree(29);

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });
    mockClient.search.mockClear();

    await act(async () => {
      capturedActions!.setAdditionalFilters('orderedAt:>=1770000000000');
    });

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockClient.search).toHaveBeenCalledTimes(1);
  });

  it('debounces query changes into ONE search', async () => {
    renderTree(10, { debounceMs: 50 });

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });
    mockClient.search.mockClear();

    await act(async () => {
      capturedActions!.setQuery('t');
    });
    await act(async () => {
      capturedActions!.setQuery('te');
    });
    await act(async () => {
      capturedActions!.setQuery('test');
    });

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });
    expect(mockClient.search).toHaveBeenCalledWith(
      'products',
      expect.objectContaining({ q: 'test' })
    );
  });

  it('does not mount-search when the provider disables searchOnMount', async () => {
    renderTree(10, { searchOnMount: false });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockClient.search).not.toHaveBeenCalled();
  });

  it('imperative actions.search() re-runs identical params (refresh flows)', async () => {
    renderTree(5);

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });

    // A verified-refresh poller clears the client cache and re-runs the
    // byte-identical search — the engine must not swallow it
    await act(async () => {
      await capturedActions!.search();
    });
    expect(mockClient.search).toHaveBeenCalledTimes(2);
  });

  it('notifies every subscribed onSearchSuccess exactly once per search', async () => {
    const onSuccessA = vi.fn();
    const onSuccessB = vi.fn();

    const SubscriberA: React.FC = () => {
      useSearch({ onSearchSuccess: onSuccessA });
      return null;
    };
    const SubscriberB: React.FC = () => {
      useSearch({ onSearchSuccess: onSuccessB });
      return null;
    };

    render(
      <SearchProvider {...defaultProps}>
        <SubscriberA />
        <SubscriberB />
        <Consumer id={0} />
      </SearchProvider>
    );

    await waitFor(() => {
      expect(onSuccessA).toHaveBeenCalledTimes(1);
      expect(onSuccessB).toHaveBeenCalledTimes(1);
    });
  });

  it('forced search reaches the client even while an identical search is in flight', async () => {
    // Refresh flows: clearCache() + actions.search() with identical params
    // must reach the network — the in-flight auto-search must not swallow it
    let resolveFirst: (v: unknown) => void;
    mockClient.search
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValue(createMockSearchResponse());

    renderTree(3);

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });

    // Mount search still unresolved — force an identical search
    await act(async () => {
      const forced = capturedActions!.search();
      resolveFirst!(createMockSearchResponse());
      await forced;
    });

    expect(mockClient.search).toHaveBeenCalledTimes(2);
  });

  it('a stale slow response cannot overwrite a newer one (last intent wins)', async () => {
    const page1 = { ...createMockSearchResponse(), found: 111, page: 1 };
    const page2 = { ...createMockSearchResponse(), found: 222, page: 2 };
    const page3 = { ...createMockSearchResponse(), found: 333, page: 3 };

    let resolvePage2: (v: unknown) => void;
    mockClient.search
      .mockResolvedValueOnce(page1)
      .mockImplementationOnce(() => new Promise(resolve => { resolvePage2 = resolve; }))
      .mockResolvedValueOnce(page3);

    const { getByTestId } = renderTree(3);
    await waitFor(() => {
      expect(getByTestId('consumer-0').textContent).toBe('111');
    });

    // Rapid page changes: page-2 request hangs, page-3 resolves immediately
    await act(async () => {
      capturedActions!.setPage(2);
    });
    await act(async () => {
      capturedActions!.setPage(3);
    });
    await waitFor(() => {
      expect(getByTestId('consumer-0').textContent).toBe('333');
    });

    // The late page-2 response arrives — it must be dropped
    await act(async () => {
      resolvePage2!(page2);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(getByTestId('consumer-0').textContent).toBe('333');
  });

  it('mount search with a non-empty initial query fires immediately (not debounced)', async () => {
    renderTree(3, {
      debounceMs: 5000,
      initialState: { query: 'shoes' },
    });

    // Well before any 5s debounce could fire
    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
    expect(mockClient.search).toHaveBeenCalledWith(
      'products',
      expect.objectContaining({ q: 'shoes' })
    );
  });

  it('searchOnMount=false still searches when the user types (autocomplete pattern)', async () => {
    renderTree(3, { searchOnMount: false, debounceMs: 20 });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockClient.search).not.toHaveBeenCalled();

    await act(async () => {
      capturedActions!.setQuery('wheel');
    });

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });
    expect(mockClient.search).toHaveBeenCalledWith(
      'products',
      expect.objectContaining({ q: 'wheel' })
    );
  });

  it('reset() repopulates the list instead of blanking it permanently', async () => {
    const { getByTestId } = renderTree(3);

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(1);
    });

    // reset() rebuilds the same initial request — it must run again
    await act(async () => {
      capturedActions!.reset();
    });

    await waitFor(() => {
      expect(mockClient.search).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(getByTestId('consumer-0').textContent).not.toBe('-');
    });
  });

  it('numeric facet bounds come from exact stats, not the returned top-N values', async () => {
    // Typesense's stats carry the true extremes even when only a few facet
    // values are requested — bounds from values alone would clamp the range
    // slider to the most common values.
    const response = {
      ...createMockSearchResponse(),
      facet_counts: [
        {
          field_name: 'priceTotal',
          counts: [
            { value: '29.95', count: 4000 },
            { value: '49.95', count: 3000 },
          ],
          stats: { min: 0, max: 88725, avg: 39.9, sum: 28250742 },
        },
      ],
    };
    mockClient.search.mockResolvedValue(response);

    let observedBounds: unknown;
    const BoundsProbe: React.FC = () => {
      const { state } = useSearch();
      observedBounds = state.numericFacetRanges?.priceTotal?.bounds;
      return null;
    };

    render(
      <SearchProvider
        {...defaultProps}
        initialState={{
          schema: {
            name: 'products',
            fields: [{ name: 'priceTotal', type: 'float', facet: true }],
          } as any,
        }}
      >
        <BoundsProbe />
      </SearchProvider>
    );

    await waitFor(() => {
      expect(observedBounds).toEqual({ min: 0, max: 88725 });
    });
  });
});
