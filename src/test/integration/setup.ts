/**
 * @fileoverview Setup file for integration tests
 * Initializes test environment and provides global utilities
 */

import { beforeAll, afterAll } from 'vitest';
import Typesense from 'typesense';
import type { Client } from 'typesense';
import { TestDataSeeder } from './seed-data';

// Global test configuration
export const INTEGRATION_TEST_CONFIG = {
  nodes: [{
    host: process.env.TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.TYPESENSE_PORT || '8108'),
    protocol: process.env.TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 10,
  numRetries: 3,
  retryIntervalSeconds: 0.5
};

// Global client instance for cleanup
let globalClient: Client;

// Wait for Typesense server to be ready
async function waitForTypesense(client: Client, maxAttempts = 30, delayMs = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.health.retrieve();
      console.log('✓ Typesense server is ready');
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error('✗ Typesense server is not available after', maxAttempts, 'attempts');
        console.error('  Make sure Typesense is running on', INTEGRATION_TEST_CONFIG.nodes[0].host + ':' + INTEGRATION_TEST_CONFIG.nodes[0].port);
        console.error('  You can start it with: docker-compose up -d typesense');
        return false;
      }
      console.log(`  Waiting for Typesense... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

// Global setup
beforeAll(async () => {
  console.log('\n🚀 Setting up integration test environment...\n');
  
  globalClient = new Typesense.Client(INTEGRATION_TEST_CONFIG);
  
  // Check if Typesense is available
  const isReady = await waitForTypesense(globalClient);
  if (!isReady) {
    throw new Error('Typesense server is not available. Integration tests cannot run.');
  }
  
  // Clean up any existing test collections
  try {
    const collections = await globalClient.collections().retrieve();
    const testCollections = collections.filter(c => c.name.startsWith('test_'));
    
    if (testCollections.length > 0) {
      console.log(`  Cleaning up ${testCollections.length} existing test collections...`);
      for (const collection of testCollections) {
        try {
          await globalClient.collections(collection.name).delete();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }
  } catch (error) {
    console.warn('  Warning: Could not clean up existing collections:', error);
  }
  
  console.log('\n✅ Integration test environment ready\n');
});

// Global teardown
afterAll(async () => {
  console.log('\n🧹 Cleaning up integration test environment...\n');
  
  if (globalClient) {
    try {
      // Clean up test collections
      const collections = await globalClient.collections().retrieve();
      const testCollections = collections.filter(c => c.name.startsWith('test_'));
      
      if (testCollections.length > 0) {
        console.log(`  Removing ${testCollections.length} test collections...`);
        for (const collection of testCollections) {
          try {
            await globalClient.collections(collection.name).delete();
          } catch (e) {
            console.warn(`  Warning: Could not delete collection ${collection.name}:`, e);
          }
        }
      }
    } catch (error) {
      console.warn('  Warning: Error during cleanup:', error);
    }
  }
  
  console.log('\n✅ Cleanup complete\n');
});

// Export utilities for tests
export async function createTestClient(): Promise<Client> {
  const client = new Typesense.Client(INTEGRATION_TEST_CONFIG);
  
  // Verify connection
  try {
    await client.health.retrieve();
    return client;
  } catch (error) {
    throw new Error(`Failed to connect to Typesense: ${error}`);
  }
}

export async function cleanupCollection(client: Client, collectionName: string): Promise<void> {
  try {
    await client.collections(collectionName).delete();
  } catch (error) {
    // Collection might not exist, which is fine
  }
}

export async function waitForIndexing(ms: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// Performance measurement utilities
export function startTimer(): { stop: () => number } {
  const start = performance.now();
  return {
    stop: () => performance.now() - start
  };
}

export function expectPerformance(actualMs: number, expectedMs: number, tolerance: number = 0.2): void {
  const lowerBound = expectedMs * (1 - tolerance);
  const upperBound = expectedMs * (1 + tolerance);
  
  if (actualMs < lowerBound || actualMs > upperBound) {
    throw new Error(
      `Performance expectation failed: ${actualMs.toFixed(2)}ms is not within ` +
      `${tolerance * 100}% of expected ${expectedMs}ms (${lowerBound.toFixed(2)}-${upperBound.toFixed(2)}ms)`
    );
  }
}

// Test data seeding utilities
let globalSeeder: TestDataSeeder;

export async function seedTestCollections(
  size: 'small' | 'medium' | 'large' = 'small',
  collections?: string[]
): Promise<void> {
  if (!globalSeeder) {
    globalSeeder = new TestDataSeeder(globalClient);
  }
  
  await globalSeeder.seedAll({
    size,
    collections,
    includeEdgeCases: false
  });
}

export async function resetTestCollections(): Promise<void> {
  if (!globalSeeder) {
    globalSeeder = new TestDataSeeder(globalClient);
  }
  
  await globalSeeder.clearAll();
}

export async function seedCollectionWithData(
  collectionName: string,
  documents: any[]
): Promise<void> {
  const collection = globalClient.collections(collectionName);
  
  // Import documents in batches
  const batchSize = 100;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await collection.documents().import(batch, { action: 'create' });
  }
}

// Environment check
if (process.env.CI) {
  console.log('📦 Running in CI environment');
}

if (process.env.TYPESENSE_HOST) {
  console.log(`🔗 Using custom Typesense host: ${process.env.TYPESENSE_HOST}`);
}