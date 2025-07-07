#!/usr/bin/env node

/**
 * CLI script for seeding Typesense with test data
 * Usage: node scripts/seed-data.js [options]
 */

import { Client } from 'typesense';
import { TestDataSeeder } from '../dist/test/integration/seed-data.js';
import { parseArgs } from 'util';

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    size: {
      type: 'string',
      default: 'small',
      short: 's',
    },
    collections: {
      type: 'string',
      short: 'c',
    },
    'edge-cases': {
      type: 'boolean',
      default: false,
      short: 'e',
    },
    reset: {
      type: 'boolean',
      default: false,
      short: 'r',
    },
    host: {
      type: 'string',
      default: 'localhost',
      short: 'h',
    },
    port: {
      type: 'string',
      default: '8108',
      short: 'p',
    },
    'api-key': {
      type: 'string',
      default: 'test_api_key',
      short: 'k',
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
});

// Show help
if (args.help) {
  console.log(`
Typesense Test Data Seeder

Usage: node scripts/seed-data.js [options]

Options:
  -s, --size <size>         Dataset size: small, medium, large (default: small)
  -c, --collections <list>  Comma-separated list of collections to seed
                           Available: ecommerce, blog, movies, realestate
                           (default: all)
  -e, --edge-cases         Include edge case documents
  -r, --reset              Clear all collections before seeding
  -h, --host <host>        Typesense host (default: localhost)
  -p, --port <port>        Typesense port (default: 8108)
  -k, --api-key <key>      Typesense API key (default: test_api_key)
  --help                   Show this help message

Examples:
  # Seed all collections with small dataset
  node scripts/seed-data.js

  # Seed only ecommerce with medium dataset
  node scripts/seed-data.js -s medium -c ecommerce

  # Reset and seed all collections with large dataset including edge cases
  node scripts/seed-data.js -s large -r -e

  # Seed to a remote Typesense instance
  node scripts/seed-data.js -h typesense.example.com -p 443 -k your-api-key
`);
  process.exit(0);
}

// Validate size argument
const validSizes = ['small', 'medium', 'large'];
if (!validSizes.includes(args.size)) {
  console.error(`Invalid size: ${args.size}. Must be one of: ${validSizes.join(', ')}`);
  process.exit(1);
}

// Parse collections
let collections;
if (args.collections) {
  collections = args.collections.split(',').map(c => c.trim());
  const validCollections = ['ecommerce', 'blog', 'movies', 'realestate'];
  const invalidCollections = collections.filter(c => !validCollections.includes(c));
  
  if (invalidCollections.length > 0) {
    console.error(`Invalid collections: ${invalidCollections.join(', ')}`);
    console.error(`Valid collections are: ${validCollections.join(', ')}`);
    process.exit(1);
  }
}

// Create Typesense client
const client = new Client({
  nodes: [{
    host: args.host,
    port: parseInt(args.port),
    protocol: args.port === '443' ? 'https' : 'http',
  }],
  apiKey: args['api-key'],
  connectionTimeoutSeconds: 10,
  numRetries: 3,
  retryIntervalSeconds: 0.5,
});

// Check connection
console.log(`\nConnecting to Typesense at ${args.host}:${args.port}...`);
try {
  const health = await client.health.retrieve();
  console.log('✓ Connected successfully\n');
} catch (error) {
  console.error('✗ Failed to connect to Typesense');
  console.error(`  ${error.message}`);
  console.error('\nMake sure Typesense is running and accessible.');
  console.error('You can start it with: docker-compose up -d');
  process.exit(1);
}

// Create seeder
const seeder = new TestDataSeeder(client);

// Seed data
try {
  const config = {
    size: args.size,
    includeEdgeCases: args['edge-cases'],
    collections,
  };

  if (args.reset) {
    console.log('Resetting collections...\n');
    await seeder.clearAll();
  }

  console.log(`Seeding with configuration:`);
  console.log(`  Size: ${config.size}`);
  console.log(`  Collections: ${config.collections?.join(', ') || 'all'}`);
  console.log(`  Edge cases: ${config.includeEdgeCases ? 'yes' : 'no'}`);
  console.log('');

  const results = await seeder.seedAll(config);
  
  // Check for errors
  const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
  if (totalErrors > 0) {
    console.error(`\n⚠️  Completed with ${totalErrors} errors`);
    process.exit(1);
  } else {
    console.log('\n✅ Seeding completed successfully!');
  }
} catch (error) {
  console.error('\n✗ Seeding failed:');
  console.error(`  ${error.message}`);
  process.exit(1);
}