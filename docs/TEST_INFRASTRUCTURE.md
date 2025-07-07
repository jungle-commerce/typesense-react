# Test Infrastructure Documentation

This document describes the test infrastructure setup for the typesense-react library.

## Overview

The test infrastructure includes:
- Docker Compose configurations for Typesense
- Test data seeding utilities
- GitHub Actions CI/CD workflows
- Integration and unit test setups

## Docker Setup

### Development Environment

```bash
# Start Typesense for development
npm run docker:up

# Stop Typesense
npm run docker:down
```

Configuration: `docker-compose.yml`
- Port: 8108
- API Key: test_api_key
- Persistent data volume

### Test Environment

```bash
# Start Typesense for testing
npm run docker:test:up

# Stop and clean up test containers
npm run docker:test:down
```

Configuration: `docker-compose.test.yml`
- Port: 8109 (to avoid conflicts)
- API Key: test_api_key
- Temporary data (cleaned between runs)

## Test Data Seeding

### Using the Seed Script

```bash
# Seed with default small dataset
npm run seed

# Reset and seed with medium dataset
npm run seed:reset -- -s medium

# Seed specific collections
npm run seed -- -c ecommerce,blog

# Include edge cases
npm run seed -- -e

# Custom Typesense instance
npm run seed -- -h typesense.example.com -p 443 -k your-api-key
```

### Available Datasets

1. **E-commerce**: Products, categories, users
2. **Blog**: Posts, authors, comments
3. **Movies**: Movies, actors, genres
4. **Real Estate**: Properties with location data

### Dataset Sizes

- **Small**: ~10-50 documents per collection (quick tests)
- **Medium**: ~50-200 documents per collection (comprehensive tests)
- **Large**: ~500-1000 documents per collection (performance tests)

### Programmatic Seeding

```typescript
import { TestDataSeeder } from './test/integration/seed-data';
import { createTestClient } from './test/integration/setup';

const client = await createTestClient();
const seeder = new TestDataSeeder(client);

// Seed all collections
await seeder.seedAll({
  size: 'medium',
  includeEdgeCases: true,
  collections: ['ecommerce', 'blog']
});

// Reset and seed
await seeder.resetAndSeed({ size: 'small' });

// Clear all test data
await seeder.clearAll();
```

## Running Tests

### Unit Tests

```bash
# Run unit tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch

# UI mode
npm run test:ui
```

### Integration Tests

```bash
# Run integration tests (requires Typesense)
npm run test:integration

# With coverage
npm run test:integration:coverage

# Using Docker
npm run test:integration:docker

# Watch mode
npm run test:integration:watch
```

### All Tests

```bash
# Run all tests
npm run test:all

# Run all tests with coverage
npm run test:all:coverage

# CI mode (lint + all tests + coverage)
npm run test:ci
```

## CI/CD Workflows

### Main CI Workflow (`ci.yml`)

Runs on every push and PR:
1. **Lint**: Code style checks
2. **Unit Tests**: Run on Node 18 and 20
3. **Integration Tests**: Run with Typesense service
4. **Build**: Verify package builds correctly
5. **Example Tests**: Test example applications

### Docker Tests Workflow (`docker-tests.yml`)

Tests Docker configurations:
- Validates docker-compose files
- Tests container startup and health
- Runs integration tests with Docker

### Performance Tests Workflow (`performance-tests.yml`)

Scheduled weekly or manual:
- Tests with different dataset sizes
- Measures search latency and indexing speed
- Uploads performance metrics

## Local Development Setup

### Prerequisites

1. Node.js 18 or 20
2. Docker and Docker Compose
3. npm or pnpm

### Quick Start

```bash
# Install dependencies
npm install

# Start Typesense
npm run docker:up

# Build the library
npm run build

# Seed test data
npm run seed

# Run tests
npm run test:all
```

### Environment Variables

For integration tests:
- `TYPESENSE_HOST`: Typesense host (default: localhost)
- `TYPESENSE_PORT`: Typesense port (default: 8108)
- `TYPESENSE_PROTOCOL`: Protocol (default: http)
- `TYPESENSE_API_KEY`: API key (default: test_api_key)

## Troubleshooting

### Typesense Connection Issues

```bash
# Check if Typesense is running
docker ps | grep typesense

# Check Typesense logs
docker logs typesense-react-dev

# Test health endpoint
curl http://localhost:8108/health
```

### Test Failures

1. Ensure Typesense is running: `npm run docker:up`
2. Check port conflicts: Use port 8109 for tests
3. Clear test data: `npm run seed:reset`
4. Check logs: `docker-compose logs`

### CI Failures

1. Check workflow logs in GitHub Actions
2. Verify Typesense service started correctly
3. Check for timeout issues (increase wait times)
4. Review coverage thresholds

## Best Practices

1. **Isolation**: Each test should clean up after itself
2. **Deterministic**: Use seeded random data for consistency
3. **Performance**: Use appropriate dataset sizes
4. **Edge Cases**: Test with special characters and extreme values
5. **Documentation**: Update this guide when adding new features

## Adding New Test Data

1. Add schema to `fixtures/schemas.ts`
2. Create generator in `fixtures/testData.ts`
3. Add seeder class in `seed-data.ts`
4. Update seed script collections list
5. Document in this guide

## Performance Testing

For performance benchmarks:

```typescript
import { startTimer, expectPerformance } from './test/integration/setup';

const timer = startTimer();
// ... perform operation ...
const elapsed = timer.stop();

// Assert performance within 20% tolerance
expectPerformance(elapsed, 50, 0.2); // Expect ~50ms
```

## Continuous Improvement

- Monitor CI build times
- Track test coverage trends
- Review and update test data regularly
- Performance benchmark baselines
- Keep dependencies updated