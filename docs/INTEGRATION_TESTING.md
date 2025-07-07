# Integration Testing Guide

This guide explains how to set up and run integration tests for the typesense-react package.

## Overview

Integration tests verify that the library works correctly with a real Typesense server. They test:

- Advanced search scenarios
- Cross-schema queries
- Complex filter combinations
- Error handling and recovery
- Performance characteristics
- Multi-collection operations

## Prerequisites

1. **Docker** (recommended) or a running Typesense instance
2. **Node.js** 18+ and pnpm
3. **Environment variables** (optional):
   - `TYPESENSE_HOST`: Typesense server host (default: localhost)
   - `TYPESENSE_PORT`: Typesense server port (default: 8108)
   - `TYPESENSE_PROTOCOL`: Protocol to use (default: http)
   - `TYPESENSE_API_KEY`: API key (default: xyz123)

## Quick Start

### Using Docker (Recommended)

1. Start Typesense using Docker:
```bash
docker run -d \
  --name typesense \
  -p 8108:8108 \
  -v $(pwd)/typesense-data:/data \
  typesense/typesense:0.25.1 \
  --data-dir /data \
  --api-key=xyz123
```

2. Run integration tests:
```bash
pnpm test:integration
```

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  typesense:
    image: typesense/typesense:0.25.1
    ports:
      - "8108:8108"
    volumes:
      - ./typesense-data:/data
    command: >
      --data-dir /data
      --api-key=xyz123
      --enable-cors
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8108/health"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Then run:
```bash
docker-compose up -d
pnpm test:integration
```

## Available Test Commands

```bash
# Run all integration tests
pnpm test:integration

# Run integration tests with UI
pnpm test:integration:ui

# Run integration tests with coverage
pnpm test:integration:coverage

# Watch mode for development
pnpm test:integration:watch

# Run all tests (unit + integration)
pnpm test:all

# Run all tests with coverage
pnpm test:all:coverage
```

## Test Structure

### Advanced Integration Tests (`advanced.test.ts`)
- Cross-schema search scenarios
- Complex filter combinations with AND/OR logic
- Advanced sorting with tiebreakers
- Aggregation queries
- Synonym and curation testing
- Performance optimization tests

### Error Handling Tests (`error-handling.test.ts`)
- Network failure simulation
- Invalid query syntax handling
- Schema mismatch detection
- Rate limiting scenarios
- Partial failure recovery
- Timeout and cancellation

## Writing Integration Tests

### Test Setup

Integration tests use a shared setup file that:
1. Waits for Typesense to be ready
2. Cleans up test collections before/after tests
3. Provides utility functions

```typescript
import { createTestClient, waitForIndexing } from './setup';

describe('My Integration Test', () => {
  let client: Client;
  
  beforeAll(async () => {
    client = await createTestClient();
    // Create test collections
  });
  
  afterAll(async () => {
    // Cleanup
  });
});
```

### Best Practices

1. **Isolation**: Each test suite should create its own test collections with unique names
2. **Cleanup**: Always clean up test data in `afterAll` hooks
3. **Prefixing**: Use `test_` prefix for all test collection names
4. **Timeouts**: Allow sufficient time for indexing operations
5. **Error Handling**: Test both success and failure scenarios

### Performance Testing

Integration tests include performance benchmarks:

```typescript
it('should handle large result sets efficiently', async () => {
  const startTime = Date.now();
  const result = await searchClient.search(collection, params);
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(1000); // Should complete within 1 second
  expect(result.search_time_ms).toBeLessThan(100); // Typesense should be fast
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      typesense:
        image: typesense/typesense:0.25.1
        ports:
          - 8108:8108
        options: >-
          --health-cmd "curl -f http://localhost:8108/health"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:integration
        env:
          TYPESENSE_HOST: localhost
          TYPESENSE_PORT: 8108
          TYPESENSE_API_KEY: xyz123
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Typesense is running: `docker ps`
   - Check port availability: `lsof -i :8108`
   - Verify environment variables

2. **Test Timeouts**
   - Increase timeout in `vitest.config.integration.ts`
   - Check Typesense server logs: `docker logs typesense`
   - Ensure adequate system resources

3. **Cleanup Failures**
   - Manually remove test collections: `curl -X DELETE http://localhost:8108/collections/test_*`
   - Restart Typesense if needed

### Debug Mode

Run tests with verbose output:
```bash
DEBUG=* pnpm test:integration
```

View Typesense logs:
```bash
docker logs -f typesense
```

## Test Coverage

Integration tests aim for:
- 100+ test cases across 4 domain schemas
- All hook integrations tested with real data
- Error handling for all failure modes
- Performance benchmarks for common operations

Current coverage can be viewed by running:
```bash
pnpm test:integration:coverage
open coverage/integration/index.html
```

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Add appropriate setup/teardown
4. Document any special requirements
5. Update this guide if needed

## Resources

- [Typesense Documentation](https://typesense.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Docker Documentation](https://docs.docker.com/)