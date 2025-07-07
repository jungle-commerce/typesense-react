# Testing Guide for typesense-react

This guide covers all aspects of testing the typesense-react library, including unit tests, integration tests, and testing strategies for applications using this library.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Running Tests](#running-tests)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Writing New Tests](#writing-new-tests)
6. [Debugging Tests](#debugging-tests)
7. [Test Coverage](#test-coverage)
8. [CI/CD Setup](#cicd-setup)
9. [Testing in Your Application](#testing-in-your-application)

## Prerequisites

Before running tests, ensure you have:

1. **Node.js 18+** and **pnpm** installed
2. **Docker** (for integration tests)
3. All dependencies installed:
   ```bash
   pnpm install
   ```

## Running Tests

### Quick Start

```bash
# Run all unit tests
pnpm test

# Run all integration tests (requires Docker)
pnpm test:integration

# Run all tests
pnpm test:all

# Run tests in watch mode
pnpm test:watch
```

### Test Commands

| Command | Description |
|---------|-------------|
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:coverage` | Run unit tests with coverage |
| `pnpm test:ui` | Run unit tests with Vitest UI |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:integration:watch` | Run integration tests in watch mode |
| `pnpm test:integration:coverage` | Run integration tests with coverage |
| `pnpm test:integration:ui` | Run integration tests with Vitest UI |
| `pnpm test:all` | Run all tests |
| `pnpm test:all:coverage` | Run all tests with coverage |

## Unit Testing

Unit tests verify individual components, hooks, and utilities in isolation.

### Test Structure

```
src/
├── core/
│   ├── __tests__/
│   │   ├── TypesenseClient.test.ts
│   │   ├── searchReducer.test.ts
│   │   └── MultiCollectionClient.test.ts
├── hooks/
│   ├── __tests__/
│   │   ├── useSearch.test.ts
│   │   ├── useAdvancedFacets.test.ts
│   │   └── ...
├── providers/
│   ├── __tests__/
│   │   ├── SearchProvider.test.tsx
│   │   └── MultiCollectionProvider.test.tsx
└── utils/
    ├── __tests__/
    │   ├── filterBuilder.test.ts
    │   ├── sortBuilder.test.ts
    │   └── ...
```

### Running Specific Unit Tests

```bash
# Run tests for a specific file
pnpm test src/hooks/__tests__/useSearch.test.ts

# Run tests matching a pattern
pnpm test --grep "useSearch"

# Run tests for a specific directory
pnpm test src/hooks
```

### Mock Setup

Unit tests use mocked Typesense clients to avoid external dependencies:

```typescript
import { createMockClient } from '../../test/createMockClient';

const mockClient = createMockClient({
  search: vi.fn().mockResolvedValue(mockSearchResponse)
});
```

## Integration Testing

Integration tests verify the library works correctly with a real Typesense server.

### Docker Setup

1. **Using Docker Run**:
   ```bash
   docker run -d \
     --name typesense-test \
     -p 8108:8108 \
     -v $(pwd)/typesense-data:/data \
     typesense/typesense:0.25.1 \
     --data-dir /data \
     --api-key=xyz123 \
     --enable-cors
   ```

2. **Using Docker Compose** (recommended):
   ```bash
   # Start Typesense
   docker-compose -f docker-compose.test.yml up -d
   
   # Run tests
   pnpm test:integration
   
   # Stop Typesense
   docker-compose -f docker-compose.test.yml down
   ```

3. **Using the Test Script**:
   ```bash
   # This automatically starts Docker and runs tests
   ./scripts/test-integration.sh
   ```

### Integration Test Categories

1. **Schema Tests** (`schemas/`): Test different domain schemas
2. **Hook Tests** (`hooks/`): Test hooks with real data
3. **Advanced Tests** (`advanced.test.ts`): Complex scenarios
4. **Error Handling** (`error-handling.test.ts`): Failure scenarios
5. **Performance Tests** (`performance.test.tsx`): Load and speed tests

### Troubleshooting Docker Issues

1. **Port Already in Use**:
   ```bash
   # Find process using port 8108
   lsof -i :8108
   
   # Kill the process or use a different port
   docker run -p 8109:8108 ...
   ```

2. **Container Not Starting**:
   ```bash
   # Check logs
   docker logs typesense-test
   
   # Remove and recreate
   docker rm -f typesense-test
   docker run ...
   ```

3. **Permission Issues**:
   ```bash
   # Fix volume permissions
   sudo chown -R $(whoami):$(whoami) ./typesense-data
   ```

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { createWrapper } from '../../test/testUtils';

describe('useSearch', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper({
      config: mockConfig,
      collection: 'products'
    });
  });

  it('should update query and trigger search', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.actions.setQuery('test query');
    });

    expect(result.current.state.query).toBe('test query');
    expect(result.current.state.loading).toBe(true);

    // Wait for search to complete
    await vi.waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    expect(result.current.state.results).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createTestSearchClient } from '../setup';
import { waitForIndexing } from '../helpers';

describe('Product Search Integration', () => {
  let client: Client;
  let searchClient: TypesenseSearchClient;
  const collectionName = 'test_products_' + Date.now();

  beforeAll(async () => {
    client = await createTestClient();
    searchClient = createTestSearchClient();

    // Create collection
    await client.collections().create({
      name: collectionName,
      fields: [
        { name: 'name', type: 'string' },
        { name: 'price', type: 'float', facet: true },
        { name: 'category', type: 'string', facet: true }
      ]
    });

    // Index test data
    await client.collections(collectionName).documents().import([
      { id: '1', name: 'Product 1', price: 99.99, category: 'Electronics' },
      { id: '2', name: 'Product 2', price: 149.99, category: 'Electronics' }
    ]);

    await waitForIndexing();
  });

  afterAll(async () => {
    await client.collections(collectionName).delete();
  });

  it('should search products with filters', async () => {
    const results = await searchClient.search(collectionName, {
      q: 'product',
      query_by: 'name',
      filter_by: 'price:<150'
    });

    expect(results.found).toBe(2);
    expect(results.hits[0].document.name).toBe('Product 1');
  });
});
```

## Debugging Tests

### Debug Mode

```bash
# Run tests with Node debugger
node --inspect-brk ./node_modules/.bin/vitest run

# With environment debug logging
DEBUG=* pnpm test
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "autoAttachChildProcesses": true,
  "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
  "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${file}"],
  "smartStep": true,
  "console": "integratedTerminal"
}
```

### Common Debugging Tips

1. **Add Console Logs**:
   ```typescript
   console.log('State:', JSON.stringify(state, null, 2));
   ```

2. **Use `test.only`**:
   ```typescript
   it.only('should focus on this test', () => {
     // This test will run in isolation
   });
   ```

3. **Increase Timeouts**:
   ```typescript
   it('slow test', async () => {
     // Test code
   }, { timeout: 10000 }); // 10 seconds
   ```

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Goals

- **Unit Tests**: >90% coverage for all modules
- **Integration Tests**: Cover all major user flows
- **Combined**: >95% overall coverage

### Improving Coverage

1. Check uncovered lines in the HTML report
2. Add tests for edge cases
3. Test error conditions
4. Cover all exported functions

## CI/CD Setup

### GitHub Actions

The project uses GitHub Actions for automated testing:

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      typesense:
        image: typesense/typesense:0.25.1
        ports:
          - 8108:8108
        options: >-
          --health-cmd "curl -f http://localhost:8108/health"
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:integration
```

## Testing in Your Application

### Setting Up Tests

When using typesense-react in your application:

1. **Mock the Provider**:
   ```typescript
   import { SearchProvider } from '@jungle-commerce/typesense-react';
   import { render } from '@testing-library/react';

   const mockConfig = {
     nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
     apiKey: 'test-key'
   };

   const renderWithSearch = (ui: React.ReactElement) => {
     return render(
       <SearchProvider config={mockConfig} collection="test">
         {ui}
       </SearchProvider>
     );
   };
   ```

2. **Test Search Interactions**:
   ```typescript
   import { screen, waitFor } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';

   it('should search when typing', async () => {
     renderWithSearch(<SearchComponent />);
     
     const input = screen.getByPlaceholderText('Search...');
     await userEvent.type(input, 'test query');

     await waitFor(() => {
       expect(screen.getByText('Results for: test query')).toBeInTheDocument();
     });
   });
   ```

3. **Mock Hook Responses**:
   ```typescript
   vi.mock('@jungle-commerce/typesense-react', () => ({
     useSearch: () => ({
       state: {
         query: 'test',
         results: mockResults,
         loading: false
       },
       actions: {
         setQuery: vi.fn(),
         search: vi.fn()
       }
     })
   }));
   ```

### Best Practices

1. **Test User Interactions**: Focus on what users do, not implementation details
2. **Use Real Data Structures**: Mock responses should match Typesense format
3. **Test Error States**: Include tests for loading, error, and empty states
4. **Performance Tests**: Monitor render counts and unnecessary re-renders
5. **Accessibility**: Test keyboard navigation and screen reader support

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Typesense Documentation](https://typesense.org/docs/)
- [Docker Documentation](https://docs.docker.com/)