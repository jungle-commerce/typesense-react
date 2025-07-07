/**
 * Test helpers for integration tests
 * Provides utilities for schema management, data seeding, query building, and cleanup
 */

import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { SearchParams } from 'typesense/lib/Typesense/Documents';
import { TypesenseTestClient, TEST_CONFIG } from './setup';

/**
 * Schema creation and deletion utilities
 */
export class SchemaHelper {
  constructor(private client: TypesenseTestClient) {}

  /**
   * Create multiple collections at once
   */
  async createCollections(schemas: CollectionCreateSchema[]): Promise<void> {
    for (const schema of schemas) {
      await this.client.createCollection(schema);
    }
  }

  /**
   * Delete multiple collections at once
   */
  async deleteCollections(names: string[]): Promise<void> {
    for (const name of names) {
      await this.client.deleteCollection(name);
    }
  }

  /**
   * Check if a collection exists
   */
  async collectionExists(name: string): Promise<boolean> {
    try {
      const collectionName = name.startsWith(TEST_CONFIG.collectionPrefix) 
        ? name 
        : `${TEST_CONFIG.collectionPrefix}${name}`;
      
      await this.client.getClient().collections(collectionName).retrieve();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(name: string) {
    const collectionName = name.startsWith(TEST_CONFIG.collectionPrefix) 
      ? name 
      : `${TEST_CONFIG.collectionPrefix}${name}`;
    
    return await this.client.getClient().collections(collectionName).retrieve();
  }
}

/**
 * Data seeding utilities
 */
export class DataSeeder {
  constructor(private client: TypesenseTestClient) {}

  /**
   * Seed a collection with data
   */
  async seedCollection<T extends Record<string, any>>(
    collectionName: string,
    documents: T[],
    options: { batchSize?: number } = {}
  ): Promise<void> {
    const { batchSize = 100 } = options;
    const collection = this.getCollectionName(collectionName);
    
    // Import in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.client.getClient()
        .collections(collection)
        .documents()
        .import(batch, { action: 'create' });
    }
  }

  /**
   * Seed multiple collections
   */
  async seedCollections(
    data: Array<{ collection: string; documents: any[] }>
  ): Promise<void> {
    for (const { collection, documents } of data) {
      await this.seedCollection(collection, documents);
    }
  }

  /**
   * Update documents in a collection
   */
  async updateDocuments<T extends Record<string, any>>(
    collectionName: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<void> {
    const collection = this.getCollectionName(collectionName);
    
    for (const { id, data } of updates) {
      await this.client.getClient()
        .collections(collection)
        .documents(id)
        .update(data);
    }
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(
    collectionName: string,
    ids: string[]
  ): Promise<void> {
    const collection = this.getCollectionName(collectionName);
    
    for (const id of ids) {
      await this.client.getClient()
        .collections(collection)
        .documents(id)
        .delete();
    }
  }

  /**
   * Clear all documents from a collection
   */
  async clearCollection(collectionName: string): Promise<void> {
    const collection = this.getCollectionName(collectionName);
    
    // Delete all documents using filter
    await this.client.getClient()
      .collections(collection)
      .documents()
      .delete({ filter_by: 'id:!=null' });
  }

  private getCollectionName(name: string): string {
    return name.startsWith(TEST_CONFIG.collectionPrefix) 
      ? name 
      : `${TEST_CONFIG.collectionPrefix}${name}`;
  }
}

/**
 * Query builder utilities
 */
export class QueryBuilder {
  private params: SearchParams;

  constructor(query: string = '*') {
    this.params = { q: query, query_by: '' };
  }

  /**
   * Set the query string
   */
  query(q: string): this {
    this.params.q = q;
    return this;
  }

  /**
   * Set query fields
   */
  queryBy(fields: string | string[]): this {
    this.params.query_by = Array.isArray(fields) ? fields.join(',') : fields;
    return this;
  }

  /**
   * Add filter
   */
  filter(filterStr: string): this {
    if (this.params.filter_by) {
      this.params.filter_by += ` && ${filterStr}`;
    } else {
      this.params.filter_by = filterStr;
    }
    return this;
  }

  /**
   * Add facet fields
   */
  facets(fields: string | string[]): this {
    this.params.facet_by = Array.isArray(fields) ? fields.join(',') : fields;
    return this;
  }

  /**
   * Set sorting
   */
  sort(sortStr: string): this {
    this.params.sort_by = sortStr;
    return this;
  }

  /**
   * Set pagination
   */
  page(page: number, perPage: number = 10): this {
    this.params.page = page;
    this.params.per_page = perPage;
    return this;
  }

  /**
   * Set result limit
   */
  limit(limit: number): this {
    this.params.per_page = limit;
    return this;
  }

  /**
   * Include specific fields
   */
  include(fields: string | string[]): this {
    this.params.include_fields = Array.isArray(fields) ? fields.join(',') : fields;
    return this;
  }

  /**
   * Exclude specific fields
   */
  exclude(fields: string | string[]): this {
    this.params.exclude_fields = Array.isArray(fields) ? fields.join(',') : fields;
    return this;
  }

  /**
   * Enable highlighting
   */
  highlight(fields?: string | string[]): this {
    if (fields) {
      this.params.highlight_fields = Array.isArray(fields) ? fields.join(',') : fields;
    }
    this.params.highlight_full_fields = this.params.highlight_fields;
    return this;
  }

  /**
   * Set group by
   */
  groupBy(field: string, limit: number = 3): this {
    this.params.group_by = field;
    this.params.group_limit = limit;
    return this;
  }

  /**
   * Enable typo tolerance
   */
  typoTolerance(enabled: boolean = true): this {
    this.params.typo_tokens_threshold = enabled ? 1 : 0;
    return this;
  }

  /**
   * Build the search parameters
   */
  build(): SearchParams {
    return { ...this.params };
  }
}

/**
 * Cleanup utilities
 */
export class CleanupHelper {
  private cleanupTasks: Array<() => Promise<void>> = [];

  constructor(private client: TypesenseTestClient) {}

  /**
   * Register a cleanup task
   */
  register(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Register collection for cleanup
   */
  registerCollection(name: string): void {
    this.register(async () => {
      await this.client.deleteCollection(name);
    });
  }

  /**
   * Register multiple collections for cleanup
   */
  registerCollections(names: string[]): void {
    names.forEach(name => this.registerCollection(name));
  }

  /**
   * Execute all cleanup tasks
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];
    
    // Execute in reverse order (LIFO)
    for (const task of this.cleanupTasks.reverse()) {
      try {
        await task();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    this.cleanupTasks = [];
    
    if (errors.length > 0) {
      console.warn(`${errors.length} cleanup tasks failed`);
    }
  }
}

/**
 * Test data validation utilities
 */
export class ValidationHelper {
  /**
   * Validate search results structure
   */
  static validateSearchResults(results: any): void {
    expect(results).toHaveProperty('hits');
    expect(results).toHaveProperty('found');
    expect(results).toHaveProperty('search_time_ms');
    expect(Array.isArray(results.hits)).toBe(true);
  }

  /**
   * Validate facet results
   */
  static validateFacetResults(results: any, expectedFacets: string[]): void {
    expect(results).toHaveProperty('facet_counts');
    expect(Array.isArray(results.facet_counts)).toBe(true);
    
    const facetFields = results.facet_counts.map((f: any) => f.field_name);
    expectedFacets.forEach(facet => {
      expect(facetFields).toContain(facet);
    });
  }

  /**
   * Validate document structure
   */
  static validateDocument(doc: any, requiredFields: string[]): void {
    requiredFields.forEach(field => {
      expect(doc).toHaveProperty(field);
    });
  }

  /**
   * Validate collection schema
   */
  static async validateCollectionSchema(
    client: TypesenseTestClient,
    collectionName: string,
    expectedFields: string[]
  ): Promise<void> {
    const helper = new SchemaHelper(client);
    const info = await helper.getCollectionInfo(collectionName);
    
    const fieldNames = info.fields?.map(f => f.name) || [];
    expectedFields.forEach(field => {
      expect(fieldNames).toContain(field);
    });
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceHelper {
  private measurements: Map<string, number[]> = new Map();

  /**
   * Measure operation time
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
    
    return result;
  }

  /**
   * Get statistics for a measurement
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const times = this.measurements.get(name);
    if (!times || times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      median: sorted[Math.floor(count / 2)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * Print performance report
   */
  printReport(): void {
    console.log('\n📊 Performance Report:');
    console.log('━'.repeat(80));
    
    for (const [name, times] of this.measurements.entries()) {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`\n${name}:`);
        console.log(`  Samples: ${stats.count}`);
        console.log(`  Min: ${stats.min.toFixed(2)}ms`);
        console.log(`  Max: ${stats.max.toFixed(2)}ms`);
        console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
        console.log(`  Median: ${stats.median.toFixed(2)}ms`);
        console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
        console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
      }
    }
    
    console.log('\n' + '━'.repeat(80));
  }
}

/**
 * Create helper instances for a test suite
 */
export function createHelpers(client: TypesenseTestClient) {
  return {
    schema: new SchemaHelper(client),
    data: new DataSeeder(client),
    query: () => new QueryBuilder(),
    cleanup: new CleanupHelper(client),
    performance: new PerformanceHelper(),
  };
}