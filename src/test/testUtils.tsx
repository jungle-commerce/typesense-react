/**
 * @fileoverview Test utilities and custom render functions
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { SearchProvider } from '../providers/SearchProvider';
import { MultiCollectionProvider } from '../multiCollection';
import { mockTypesenseConfig } from './mockData';
import type { SearchProviderProps } from '../types';

interface WrapperProps {
  children: React.ReactNode;
}

/**
 * Create a wrapper component for SearchProvider
 */
export function createSearchProviderWrapper(options?: {
  initialState?: any;
  initialSearchResults?: any;
  defaultOptions?: any;
  [key: string]: any;
}) {
  const { initialState, initialSearchResults, defaultOptions, ...providerProps } = options || {};
  
  // Build the initial state from various options
  const combinedInitialState = {
    ...initialState,
    // Handle initialSearchResults for backward compatibility
    ...(initialSearchResults ? { results: initialSearchResults } : {}),
    // Handle defaultOptions
    ...(defaultOptions || {}),
  };
  
  return function Wrapper({ children }: WrapperProps) {
    return (
      <SearchProvider
        config={mockTypesenseConfig}
        collection="products"
        initialState={combinedInitialState}
        {...providerProps}
      >
        {children}
      </SearchProvider>
    );
  };
}

/**
 * Custom render function with SearchProvider
 */
export function renderWithSearchProvider(
  ui: React.ReactElement,
  {
    providerProps,
    ...renderOptions
  }: {
    providerProps?: Partial<SearchProviderProps>;
  } & RenderOptions = {}
) {
  const Wrapper = createSearchProviderWrapper(providerProps);
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Custom render function with MultiCollectionProvider
 */
export function renderWithMultiCollectionProvider(
  ui: React.ReactElement,
  {
    collections = [],
    config = mockTypesenseConfig,
    ...renderOptions
  }: {
    collections?: any[];
    config?: any;
  } & RenderOptions = {}
) {
  function Wrapper({ children }: WrapperProps) {
    return (
      <MultiCollectionProvider
        config={config}
        defaultCollections={collections}
      >
        {children}
      </MultiCollectionProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock Typesense client
 */
export class MockTypesenseClient {
  search = vi.fn();
  multiSearch = vi.fn();
  retrieveSchema = vi.fn();
  
  collections = vi.fn(() => ({
    retrieve: vi.fn(),
  }));
}

/**
 * Create a mock search response
 */
export function createMockSearchResponse(overrides: any = {}) {
  return {
    facet_counts: [],
    found: 0,
    hits: [],
    out_of: 0,
    page: 1,
    request_params: {
      collection_name: 'products',
      per_page: 20,
      q: '*',
    },
    search_cutoff: false,
    search_time_ms: 1,
    ...overrides,
  };
}

/**
 * Wait for async updates
 */
export async function waitForAsync() {
  return new Promise(resolve => setTimeout(resolve, 0));
}