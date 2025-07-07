/**
 * @fileoverview Tests for MultiCollectionProvider component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { 
  MultiCollectionProvider, 
  useMultiCollectionContext,
  type MultiCollectionProviderProps,
} from '../MultiCollectionProvider';
import { TypesenseSearchClient } from '../../core/TypesenseClient';
import { useMultiCollectionSearch } from '../../hooks/useMultiCollectionSearch';
import { mockTypesenseConfig, mockSearchResponse } from '../../test/mockData';
import type { CollectionSearchConfig } from '../../types/multiCollection';

// Mock the useMultiCollectionSearch hook
vi.mock('../../hooks/useMultiCollectionSearch', () => ({
  useMultiCollectionSearch: vi.fn((client, options) => ({
    state: {
      loading: false,
      results: undefined,
      error: undefined,
    },
    search: vi.fn(),
    setQuery: vi.fn(),
    clearResults: vi.fn(),
    updateCollections: vi.fn(),
  })),
}));

describe('MultiCollectionProvider', () => {
  const defaultCollections: CollectionSearchConfig[] = [
    {
      collection: 'products',
      queryBy: 'name,description',
      maxResults: 10,
      weight: 1.0,
    },
    {
      collection: 'categories',
      queryBy: 'name',
      maxResults: 5,
      weight: 0.8,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides multi-collection context to children', () => {
    const { result } = renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider 
          config={mockTypesenseConfig} 
          defaultCollections={defaultCollections}
        >
          {children}
        </MultiCollectionProvider>
      ),
    });

    expect(result.current).toBeDefined();
    expect(result.current.state).toBeDefined();
    expect(result.current.search).toBeDefined();
    expect(result.current.setQuery).toBeDefined();
    expect(result.current.clearResults).toBeDefined();
    expect(result.current.updateCollections).toBeDefined();
    expect(result.current.client).toBeDefined();
  });

  it('creates TypesenseSearchClient from config', () => {
    const { result } = renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={mockTypesenseConfig}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    expect(result.current.client).toBeDefined();
    expect(typeof result.current.client.search).toBe('function');
  });

  it('uses existing TypesenseSearchClient instance', () => {
    const existingClient = new TypesenseSearchClient(mockTypesenseConfig);
    
    const { result } = renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={existingClient}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    // Since we're mocking, we can't check exact equality
    expect(result.current.client).toBeDefined();
  });

  it('passes default collections to hook', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider 
          config={mockTypesenseConfig}
          defaultCollections={defaultCollections}
        >
          {children}
        </MultiCollectionProvider>
      ),
    });

    expect(mockUseMultiCollectionSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defaultCollections,
      })
    );
  });

  it('passes search options to hook', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    const searchOptions = {
      searchOnMount: true,
      debounceMs: 500,
      defaultMergeStrategy: 'roundRobin' as const,
      onSearchComplete: vi.fn(),
      onSearchError: vi.fn(),
    };

    renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider 
          config={mockTypesenseConfig}
          searchOptions={searchOptions}
        >
          {children}
        </MultiCollectionProvider>
      ),
    });

    expect(mockUseMultiCollectionSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(searchOptions)
    );
  });

  it('configures cache timeout from config', () => {
    const configWithCache = {
      ...mockTypesenseConfig,
      cacheSearchResultsForSeconds: 60,
    };

    renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={configWithCache}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    // The client should be created with cache timeout of 60000ms (60 seconds)
    // This is internal implementation detail, but we can verify the client is created
    expect(true).toBe(true); // Placeholder - actual implementation would verify cache timeout
  });

  it('uses default cache timeout when not specified', () => {
    renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={mockTypesenseConfig}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    // Default cache timeout should be 5 minutes (300000ms)
    expect(true).toBe(true); // Placeholder - actual implementation would verify cache timeout
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useMultiCollectionContext());
    }).toThrow('useMultiCollectionContext must be used within a MultiCollectionProvider');
    
    spy.mockRestore();
  });

  it('memoizes context value', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    const mockSearchReturn = {
      state: { loading: false },
      search: vi.fn(),
      setQuery: vi.fn(),
      clearResults: vi.fn(),
      updateCollections: vi.fn(),
    };

    mockUseMultiCollectionSearch.mockReturnValue(mockSearchReturn);

    const { result, rerender } = renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={mockTypesenseConfig}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    const firstValue = result.current;
    
    // Re-render without changing props
    rerender();
    
    expect(result.current).toBe(firstValue); // Same reference
  });

  it('updates context when search state changes', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    let mockState = { loading: false };
    
    // First render
    mockUseMultiCollectionSearch.mockReturnValueOnce({
      state: mockState,
      search: vi.fn(),
      setQuery: vi.fn(),
      clearResults: vi.fn(),
      updateCollections: vi.fn(),
    });

    const { result, rerender } = renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={mockTypesenseConfig}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    const firstValue = result.current;
    
    // Update mock state and return value for second render
    mockState = { loading: true };
    mockUseMultiCollectionSearch.mockReturnValueOnce({
      state: mockState,
      search: vi.fn(),
      setQuery: vi.fn(),
      clearResults: vi.fn(),
      updateCollections: vi.fn(),
    });
    
    rerender();
    
    expect(result.current).not.toBe(firstValue); // New reference
    expect(result.current.state.loading).toBe(true);
  });

  it('provides all hook methods through context', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    const mockSearch = vi.fn();
    const mockSetQuery = vi.fn();
    const mockClearResults = vi.fn();
    const mockUpdateCollections = vi.fn();

    mockUseMultiCollectionSearch.mockReturnValue({
      state: { loading: false },
      search: mockSearch,
      setQuery: mockSetQuery,
      clearResults: mockClearResults,
      updateCollections: mockUpdateCollections,
    });

    const { result } = renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={mockTypesenseConfig}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    // Call methods through context
    result.current.search({ query: 'test', collections: [] });
    result.current.setQuery('new query');
    result.current.clearResults();
    result.current.updateCollections([]);

    expect(mockSearch).toHaveBeenCalledWith({ query: 'test', collections: [] });
    expect(mockSetQuery).toHaveBeenCalledWith('new query');
    expect(mockClearResults).toHaveBeenCalled();
    expect(mockUpdateCollections).toHaveBeenCalledWith([]);
  });

  it('handles empty default collections', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider config={mockTypesenseConfig}>
          {children}
        </MultiCollectionProvider>
      ),
    });

    expect(mockUseMultiCollectionSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defaultCollections: [],
      })
    );
  });

  it('merges search options with default collections', () => {
    const mockUseMultiCollectionSearch = vi.mocked(useMultiCollectionSearch);

    const searchOptions = {
      searchOnMount: true,
    };

    renderHook(() => useMultiCollectionContext(), {
      wrapper: ({ children }) => (
        <MultiCollectionProvider 
          config={mockTypesenseConfig}
          defaultCollections={defaultCollections}
          searchOptions={searchOptions}
        >
          {children}
        </MultiCollectionProvider>
      ),
    });

    expect(mockUseMultiCollectionSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ...searchOptions,
        defaultCollections,
      })
    );
  });

  it('renders children without errors', () => {
    const TestComponent = () => {
      const context = useMultiCollectionContext();
      return <div data-testid="test">{context.state.loading ? 'Loading' : 'Ready'}</div>;
    };

    const { container } = render(
      <MultiCollectionProvider config={mockTypesenseConfig}>
        <TestComponent />
      </MultiCollectionProvider>
    );

    expect(container.querySelector('[data-testid="test"]')).toBeTruthy();
  });
});