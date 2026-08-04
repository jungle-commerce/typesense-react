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
   * Requests currently on the wire, keyed like the result cache. Concurrent
   * identical requests (e.g. several components searching the same provider
   * state at once) share one network call instead of stampeding the server.
   */
  private inFlight: Map<string, Promise<TypesenseSearchResponse>>;

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
      this.client = new Typesense.Client({
        ...config,
        nodes: config.nodes,
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
    this.inFlight = new Map();
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
    const cacheKey = this.generateCacheKey(collection, params);

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        // Return cached result
        return Promise.resolve(cached.value);
      }

      // Share an identical request that is already on the wire. Without this,
      // N concurrent callers with the same params produce N network calls —
      // the result cache only helps once a response has landed.
      const pending = this.inFlight.get(cacheKey);
      if (pending) {
        return pending;
      }
    }

    const requestPromise = this.executeSearch(collection, params)
      .then(response => {
        if (useCache) {
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
      })
      .finally(() => {
        // A failed request must not pin the rejection for later callers, and
        // clearCache() may have replaced this entry with a newer request —
        // only remove our own.
        if (this.inFlight.get(cacheKey) === requestPromise) {
          this.inFlight.delete(cacheKey);
        }
      });

    if (useCache) {
      this.inFlight.set(cacheKey, requestPromise);
    }

    return requestPromise;
  }

  /**
   * Executes the search request against Typesense
   * @param collection - Collection name to search
   * @param params - Search parameters
   * @returns Search response promise
   */
  private async executeSearch(
    collection: string,
    params: SearchRequest
  ): Promise<TypesenseSearchResponse> {
    try {
      // Perform the search
      const searchParams = params.preset ? params : { ...params, preset: undefined };
      const cleanedParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, v]) => v !== undefined)
      );

      return await this.client
        .collections(collection)
        .documents()
        .search(cleanedParams) as TypesenseSearchResponse;
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
   * Clears the cache, including in-flight request sharing. A search issued
   * after clearCache() always reaches the network, even if an identical
   * request is still pending — callers use this to force freshness.
   */
  clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; timeout: number; inFlightCount: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      timeout: this.cacheTimeout,
      inFlightCount: this.inFlight.size
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
