# Testing Guide for typesense-react

This guide provides comprehensive patterns and strategies for testing applications built with typesense-react.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Mocking Strategies](#mocking-strategies)
5. [Test Utilities](#test-utilities)
6. [Best Practices](#best-practices)

## Testing Setup

### Required Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Test Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
});
```

### Test Setup File (src/test/setup.ts)

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

## Unit Testing

### Testing Search Components

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchProvider } from 'typesense-react';

// Mock the TypesenseSearchClient
vi.mock('typesense-react/core/TypesenseClient', () => ({
  TypesenseSearchClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      hits: [
        { document: { id: '1', name: 'Product 1' } },
        { document: { id: '2', name: 'Product 2' } }
      ],
      found: 2,
      search_time_ms: 5,
      page: 1,
      facet_counts: []
    })
  }))
}));

describe('SearchComponent', () => {
  const defaultConfig = {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'test-key'
  };

  it('should display search results', async () => {
    render(
      <SearchProvider config={defaultConfig} collection="products">
        <YourSearchComponent />
      </SearchProvider>
    );

    // Wait for results to load
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });
  });

  it('should handle search input', async () => {
    const user = userEvent.setup();
    
    render(
      <SearchProvider config={defaultConfig} collection="products">
        <YourSearchComponent />
      </SearchProvider>
    );

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'test query');

    await waitFor(() => {
      expect(searchInput).toHaveValue('test query');
    });
  });
});
```

### Testing Hooks

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from 'typesense-react';
import { createSearchProviderWrapper } from './testUtils';

describe('useSearch hook', () => {
  it('should update query state', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper()
    });

    act(() => {
      result.current.actions.setQuery('test query');
    });

    await waitFor(() => {
      expect(result.current.state.query).toBe('test query');
    });
  });

  it('should handle pagination', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper()
    });

    act(() => {
      result.current.actions.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.state.page).toBe(2);
    });
  });

  it('should handle filters', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper()
    });

    act(() => {
      result.current.actions.setAdditionalFilters('category:=Electronics');
    });

    await waitFor(() => {
      expect(result.current.state.additionalFilters).toBe('category:=Electronics');
    });
  });
});
```

### Testing Facets

```tsx
import { renderHook, act } from '@testing-library/react';
import { useFacetState } from 'typesense-react';
import { createSearchProviderWrapper } from './testUtils';

describe('useFacetState hook', () => {
  it('should toggle facet values', () => {
    const { result } = renderHook(
      () => useFacetState({ field: 'category', type: 'checkbox' }),
      { wrapper: createSearchProviderWrapper() }
    );

    act(() => {
      result.current.toggle('Electronics');
    });

    expect(result.current.selectedValues).toContain('Electronics');

    act(() => {
      result.current.toggle('Electronics');
    });

    expect(result.current.selectedValues).not.toContain('Electronics');
  });

  it('should handle numeric facets', () => {
    const { result } = renderHook(
      () => useFacetState({ field: 'price', type: 'numeric' }),
      { wrapper: createSearchProviderWrapper() }
    );

    act(() => {
      result.current.setRange({ min: 10, max: 100 });
    });

    expect(result.current.range).toEqual({ min: 10, max: 100 });
  });
});
```

## Integration Testing

### Testing with Real Typesense Server

```tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import Typesense from 'typesense';
import { useSearch, SearchProvider } from 'typesense-react';

describe('Search Integration Tests', () => {
  let client: Typesense.Client;
  
  beforeAll(async () => {
    client = new Typesense.Client({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'xyz'
    });

    // Create test collection
    await client.collections().create({
      name: 'test_products',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string', facet: true },
        { name: 'price', type: 'float', facet: true }
      ]
    });

    // Seed test data
    await client.collections('test_products').documents().import([
      { id: '1', name: 'iPhone', category: 'Electronics', price: 999 },
      { id: '2', name: 'Book', category: 'Books', price: 19.99 }
    ]);
  });

  afterAll(async () => {
    await client.collections('test_products').delete();
  });

  it('should search real data', async () => {
    const wrapper = ({ children }) => (
      <SearchProvider
        config={{
          nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
          apiKey: 'xyz'
        }}
        collection="test_products"
        initialSearchParams={{ query_by: 'name' }}
      >
        {children}
      </SearchProvider>
    );

    const { result } = renderHook(() => useSearch(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.results?.found).toBe(2);
    }, { timeout: 5000 });
  });
});
```

### Testing Error Scenarios

```tsx
describe('Error Handling Tests', () => {
  it('should handle network errors', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper({
        config: {
          nodes: [{ host: 'invalid-host', port: 8108, protocol: 'http' }],
          apiKey: 'test'
        }
      })
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle invalid queries', async () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper()
    });

    act(() => {
      result.current.actions.setAdditionalFilters('invalid:filter:syntax');
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

## Mocking Strategies

### Creating Mock Data

```typescript
// testUtils.ts
export const mockSearchResponse = {
  hits: [
    {
      document: { id: '1', name: 'Product 1', price: 99.99 },
      highlight: { name: { snippet: '<mark>Product</mark> 1' } }
    }
  ],
  found: 100,
  search_time_ms: 5,
  page: 1,
  facet_counts: [
    {
      field_name: 'category',
      counts: [
        { value: 'Electronics', count: 45 },
        { value: 'Books', count: 32 }
      ]
    }
  ]
};

export class MockTypesenseClient {
  search = vi.fn().mockResolvedValue(mockSearchResponse);
  multiSearch = vi.fn().mockResolvedValue({ results: [mockSearchResponse] });
  getSchema = vi.fn().mockResolvedValue({
    name: 'products',
    fields: [
      { name: 'name', type: 'string' },
      { name: 'category', type: 'string', facet: true }
    ]
  });
}
```

### Mocking TypesenseSearchClient

```typescript
// In your test file or setup
vi.mock('typesense-react/core/TypesenseClient', () => ({
  TypesenseSearchClient: vi.fn().mockImplementation(() => new MockTypesenseClient())
}));
```

### Testing with Different Response Scenarios

```typescript
describe('Search Response Scenarios', () => {
  let mockClient: MockTypesenseClient;

  beforeEach(() => {
    mockClient = new MockTypesenseClient();
    vi.mocked(TypesenseSearchClient).mockImplementation(() => mockClient);
  });

  it('should handle empty results', async () => {
    mockClient.search.mockResolvedValueOnce({
      hits: [],
      found: 0,
      search_time_ms: 1,
      page: 1,
      facet_counts: []
    });

    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper()
    });

    await waitFor(() => {
      expect(result.current.state.results?.found).toBe(0);
    });
  });

  it('should handle large result sets', async () => {
    mockClient.search.mockResolvedValueOnce({
      hits: Array(100).fill(null).map((_, i) => ({
        document: { id: `${i}`, name: `Product ${i}` }
      })),
      found: 10000,
      search_time_ms: 50,
      page: 1
    });

    const { result } = renderHook(() => useSearch(), {
      wrapper: createSearchProviderWrapper()
    });

    await waitFor(() => {
      expect(result.current.state.results?.found).toBe(10000);
      expect(result.current.state.results?.hits).toHaveLength(100);
    });
  });
});
```

## Test Utilities

### Custom Test Wrapper

```typescript
// testUtils.tsx
import React from 'react';
import { SearchProvider } from 'typesense-react';
import type { SearchProviderProps } from 'typesense-react';

export function createSearchProviderWrapper(options?: Partial<SearchProviderProps>) {
  const defaultProps: SearchProviderProps = {
    config: {
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key'
    },
    collection: 'products',
    ...options
  };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SearchProvider {...defaultProps}>{children}</SearchProvider>;
  };
}
```

### Custom Render Functions

```typescript
import { render, RenderOptions } from '@testing-library/react';

export function renderWithSearchProvider(
  ui: React.ReactElement,
  options?: Partial<SearchProviderProps> & RenderOptions
) {
  const { ...renderOptions } = options || {};
  const Wrapper = createSearchProviderWrapper(options);
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
```

### Async Test Helpers

```typescript
export async function waitForSearchResults(result: any) {
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.state.results).toBeDefined();
  });
}

export async function waitForError(result: any) {
  await waitFor(() => {
    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
  });
}
```

## Best Practices

### 1. Test Isolation

Always isolate your tests from external dependencies:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Reset any global state
});

afterEach(() => {
  cleanup();
});
```

### 2. Use Descriptive Test Names

```typescript
describe('SearchProvider', () => {
  describe('when search returns no results', () => {
    it('should display empty state message', async () => {
      // test implementation
    });
  });

  describe('when network error occurs', () => {
    it('should display error message and retry button', async () => {
      // test implementation
    });
  });
});
```

### 3. Test User Interactions

```typescript
it('should update results when user types in search box', async () => {
  const user = userEvent.setup();
  const { getByRole } = renderWithSearchProvider(<SearchBox />);
  
  const input = getByRole('searchbox');
  await user.type(input, 'laptop');
  
  await waitFor(() => {
    expect(mockClient.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ q: 'laptop' })
    );
  });
});
```

### 4. Test Debouncing

```typescript
it('should debounce search requests', async () => {
  const { result } = renderHook(() => useSearch({ debounceMs: 300 }), {
    wrapper: createSearchProviderWrapper()
  });

  // Type quickly
  act(() => {
    result.current.actions.setQuery('a');
    result.current.actions.setQuery('ab');
    result.current.actions.setQuery('abc');
  });

  // Should not have called search yet
  expect(mockClient.search).not.toHaveBeenCalled();

  // Wait for debounce
  await waitFor(() => {
    expect(mockClient.search).toHaveBeenCalledTimes(1);
    expect(mockClient.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ q: 'abc' })
    );
  }, { timeout: 400 });
});
```

### 5. Test Error Recovery

```typescript
it('should recover from errors when retry is clicked', async () => {
  mockClient.search
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce(mockSearchResponse);

  const { result } = renderHook(() => useSearch(), {
    wrapper: createSearchProviderWrapper()
  });

  // Wait for error
  await waitForError(result);

  // Retry
  act(() => {
    result.current.actions.search();
  });

  // Should recover
  await waitForSearchResults(result);
});
```

### 6. Performance Testing

```typescript
it('should handle rapid state updates efficiently', async () => {
  const { result } = renderHook(() => useSearch(), {
    wrapper: createSearchProviderWrapper()
  });

  const startTime = performance.now();

  // Perform many updates
  for (let i = 0; i < 100; i++) {
    act(() => {
      result.current.actions.setPage(i + 1);
    });
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Should complete quickly
  expect(duration).toBeLessThan(100); // milliseconds
});
```

### 7. Snapshot Testing for UI Components

```typescript
it('should match snapshot for search results', () => {
  const { container } = renderWithSearchProvider(
    <SearchResults results={mockSearchResponse} />
  );
  
  expect(container).toMatchSnapshot();
});
```

### 8. Testing Accessibility

```typescript
it('should be accessible', async () => {
  const { container } = renderWithSearchProvider(<SearchInterface />);
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Common Testing Patterns

### Testing Loading States

```typescript
it('should show loading indicator during search', async () => {
  mockClient.search.mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(mockSearchResponse), 100))
  );

  const { getByText, queryByText } = renderWithSearchProvider(<SearchUI />);
  
  expect(getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(queryByText('Loading...')).not.toBeInTheDocument();
  });
});
```

### Testing Facet Interactions

```typescript
it('should update search when facet is selected', async () => {
  const { getByLabelText } = renderWithSearchProvider(
    <FacetList field="category" />
  );

  const electronicsCheckbox = getByLabelText('Electronics');
  await userEvent.click(electronicsCheckbox);

  await waitFor(() => {
    expect(mockClient.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        filter_by: expect.stringContaining('category:=Electronics')
      })
    );
  });
});
```

### Testing Multi-Collection Search

```typescript
it('should search across multiple collections', async () => {
  const { result } = renderHook(() => useMultiCollectionSearch(), {
    wrapper: createMultiCollectionWrapper(['products', 'categories'])
  });

  act(() => {
    result.current.search('test query');
  });

  await waitFor(() => {
    expect(mockClient.multiSearch).toHaveBeenCalledWith({
      searches: expect.arrayContaining([
        expect.objectContaining({ collection: 'products' }),
        expect.objectContaining({ collection: 'categories' })
      ])
    });
  });
});
```

This guide provides comprehensive patterns for testing typesense-react applications. Follow these practices to ensure your search implementation is robust and reliable.