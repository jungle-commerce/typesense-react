/**
 * @fileoverview TypesenseClient wrapper that adds caching and request optimization
 * to the standard Typesense client.
 */

import Typesense from 'typesense';
import type { Client } from 'typesense';
import type { SearchRequest, TypesenseSearchResponse, TypesenseConfig } from '../types';

/**
 * Cache entry structure for storing search results
 */
interface CacheEntry {
  key: string;
  value: TypesenseSearchResponse;
  timestamp: number;
}

/**
 * Enhanced Typesense client with caching and request optimization
 */
export class TypesenseSearchClient {
  private client: Client;
  private cache: Map<string, CacheEntry>;
  private cacheTimeout: number;
  private maxCacheSize: number;

  /**
   * Creates a new TypesenseSearchClient instance
   * @param config - Typesense configuration or existing client instance
   * @param cacheTimeout - Cache timeout in milliseconds (default: 5 minutes)
   * @param maxCacheSize - Maximum number of cached entries (default: 100)
   */
  constructor(
    config: TypesenseConfig | Client,
    cacheTimeout: number = 5 * 60 * 1000,
    maxCacheSize: number = 100
  ) {
    // Initialize client from config or use existing instance
    if ('nodes' in config) {
      // Ensure all ports are numbers
      const nodes = config.nodes.map(node => ({
        ...node,
        port: typeof node.port === 'string' ? parseInt(node.port, 10) : node.port
      }));
      
      this.client = new Typesense.Client({
        ...config,
        nodes,
        connectionTimeoutSeconds: config.connectionTimeoutSeconds || 10,
        numRetries: config.numRetries || 3,
        retryIntervalSeconds: config.retryIntervalSeconds || 0.1,
      });
    } else {
      this.client = config;
    }

    this.cache = new Map();
    this.cacheTimeout = cacheTimeout;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Generates a cache key from search parameters
   * @param collection - Collection name
   * @param params - Search parameters
   * @returns Cache key string
   */
  private generateCacheKey(collection: string, params: SearchRequest): string {
    // Sort params to ensure consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key as keyof SearchRequest];
        return acc;
      }, {} as any);

    return `${collection}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Cleans expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.cacheTimeout) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Manages cache size by removing oldest entries when limit is reached
   */
  private manageCacheSize(): void {
    if (this.cache.size > this.maxCacheSize) {
      // Convert to array and sort by timestamp
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest entries
      const entriesToRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Performs a cached search request
   * @param collection - Collection name to search
   * @param params - Search parameters
   * @param useCache - Whether to use cache (default: true)
   * @returns Search response promise
   */
  async search(
    collection: string,
    params: SearchRequest,
    useCache: boolean = true
  ): Promise<TypesenseSearchResponse> {
    // Check cache first if enabled
    if (useCache) {
      const cacheKey = this.generateCacheKey(collection, params);
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        // Return cached result
        return Promise.resolve(cached.value);
      }
    }

    try {
      // Perform the search
      const searchParams = params.preset ? params : { ...params, preset: undefined };
      const cleanedParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, v]) => v !== undefined)
      );
      
      const response = await this.client
        .collections(collection)
        .documents()
        .search(cleanedParams) as TypesenseSearchResponse;

      // Cache the result if caching is enabled
      if (useCache) {
        const cacheKey = this.generateCacheKey(collection, params);
        this.cache.set(cacheKey, {
          key: cacheKey,
          value: response,
          timestamp: Date.now()
        });

        // Clean up cache
        this.cleanCache();
        this.manageCacheSize();
      }

      return response;
    } catch (error) {
      // Enhance error with more context
      const enhancedError = new Error(
        `Typesense search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      (enhancedError as any).originalError = error;
      (enhancedError as any).collection = collection;
      (enhancedError as any).params = params;
      throw enhancedError;
    }
  }

  /**
   * Performs multiple searches in parallel (for disjunctive faceting)
   * @param collection - Collection name
   * @param searches - Array of search parameters
   * @param useCache - Whether to use cache
   * @returns Array of search responses
   */
  async multiSearch(
    collection: string,
    searches: SearchRequest[],
    useCache: boolean = true
  ): Promise<TypesenseSearchResponse[]> {
    const promises = searches.map(params => 
      this.search(collection, params, useCache)
    );

    return Promise.all(promises);
  }

  /**
   * Gets collection schema
   * @param collection - Collection name
   * @returns Collection schema
   */
  async getSchema(collection: string): Promise<any> {
    try {
      return await this.client.collections(collection).retrieve();
    } catch (error) {
      const enhancedError = new Error(
        `Failed to retrieve schema: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      (enhancedError as any).originalError = error;
      (enhancedError as any).collection = collection;
      throw enhancedError;
    }
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; timeout: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      timeout: this.cacheTimeout
    };
  }

  /**
   * Gets the underlying Typesense client instance
   * @returns Typesense client
   */
  getClient(): Client {
    return this.client;
  }
}