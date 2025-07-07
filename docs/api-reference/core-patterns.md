# Core API Patterns and Best Practices

This document outlines best practices and common patterns for using the typesense-react core APIs effectively.

## Table of Contents
- [TypesenseSearchClient Patterns](#typesensesearchclient-patterns)
- [MultiCollectionSearchClient Patterns](#multicollectionsearchclient-patterns)
- [State Management Patterns](#state-management-patterns)
- [Performance Optimization](#performance-optimization)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Patterns](#testing-patterns)

---

## TypesenseSearchClient Patterns

### 1. Client Initialization Pattern

**Best Practice:** Create a singleton instance and reuse it across your application.

```typescript
// clientInstance.ts
import { TypesenseSearchClient } from 'typesense-react';

let clientInstance: TypesenseSearchClient | null = null;

export function getSearchClient(): TypesenseSearchClient {
  if (!clientInstance) {
    clientInstance = new TypesenseSearchClient({
      nodes: [{
        host: process.env.TYPESENSE_HOST || 'localhost',
        port: parseInt(process.env.TYPESENSE_PORT || '8108'),
        protocol: process.env.TYPESENSE_PROTOCOL || 'http',
      }],
      apiKey: process.env.TYPESENSE_API_KEY || '',
    }, 
    5 * 60 * 1000, // 5 minute cache
    100 // Max 100 cached searches
    );
  }
  return clientInstance;
}
```

### 2. Cache Strategy Pattern

**Best Practice:** Configure cache based on data volatility.

```typescript
// Frequently changing data - short cache
const realtimeClient = new TypesenseSearchClient(config, 30 * 1000); // 30 seconds

// Static catalog data - long cache
const catalogClient = new TypesenseSearchClient(config, 30 * 60 * 1000); // 30 minutes

// User-specific data - no cache
const userResults = await client.search('user_data', params, false);
```

### 3. Search Parameter Building Pattern

**Best Practice:** Use builder functions for complex search parameters.

```typescript
class SearchParamsBuilder {
  private params: Partial<SearchRequest> = {};

  constructor(query: string, queryBy: string) {
    this.params.q = query;
    this.params.query_by = queryBy;
  }

  withFilters(filters: Record<string, any>): this {
    const filterStrings = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([field, value]) => {
        if (Array.isArray(value)) {
          return `${field}:[${value.join(',')}]`;
        }
        if (typeof value === 'object' && 'min' in value) {
          return `${field}:[${value.min}..${value.max}]`;
        }
        return `${field}:=${value}`;
      });
    
    this.params.filter_by = filterStrings.join(' && ');
    return this;
  }

  withFacets(facets: string[]): this {
    this.params.facet_by = facets.join(',');
    this.params.max_facet_values = 100;
    return this;
  }

  withPagination(page: number, perPage: number): this {
    this.params.page = page;
    this.params.per_page = perPage;
    return this;
  }

  withSort(sortBy: string): this {
    this.params.sort_by = sortBy;
    return this;
  }

  withHighlighting(fields?: string[]): this {
    const highlightFields = fields?.join(',') || this.params.query_by;
    this.params.highlight_fields = highlightFields;
    this.params.highlight_full_fields = highlightFields;
    return this;
  }

  build(): SearchRequest {
    return this.params as SearchRequest;
  }
}

// Usage
const params = new SearchParamsBuilder('laptop', 'name,description')
  .withFilters({
    brand: ['apple', 'dell'],
    price: { min: 500, max: 1500 },
    in_stock: true,
  })
  .withFacets(['brand', 'category', 'price'])
  .withSort('popularity:desc')
  .withPagination(1, 20)
  .withHighlighting()
  .build();

const results = await client.search('products', params);
```

### 4. Preset Management Pattern

**Best Practice:** Define search presets for different contexts.

```typescript
const SEARCH_PRESETS = {
  quickSearch: {
    query_by: 'name,tags',
    per_page: 10,
    num_typos: 2,
    prefix: true,
  },
  detailedSearch: {
    query_by: 'name,description,tags,specifications',
    per_page: 20,
    facet_by: 'brand,category,price_range',
    max_facet_values: 100,
    highlight_fields: 'name,description',
    include_fields: 'id,name,price,image,rating',
  },
  mobileSearch: {
    query_by: 'name',
    per_page: 5,
    include_fields: 'id,name,price,thumbnail',
    search_cutoff_ms: 100,
  },
};

// Apply preset
async function searchWithPreset(query: string, preset: keyof typeof SEARCH_PRESETS) {
  const params = {
    q: query,
    ...SEARCH_PRESETS[preset],
  };
  return client.search('products', params);
}
```

---

## MultiCollectionSearchClient Patterns

### 1. Collection Configuration Pattern

**Best Practice:** Define collection configurations centrally.

```typescript
interface CollectionProfile {
  collection: string;
  weight: number;
  queryFields: string;
  resultLimit: number;
  filters?: string;
}

const COLLECTION_PROFILES: Record<string, CollectionProfile[]> = {
  ecommerce: [
    {
      collection: 'products',
      weight: 1.0,
      queryFields: 'name,description,brand',
      resultLimit: 20,
    },
    {
      collection: 'categories',
      weight: 0.7,
      queryFields: 'name,description',
      resultLimit: 5,
    },
    {
      collection: 'brands',
      weight: 0.5,
      queryFields: 'name,description',
      resultLimit: 3,
    },
  ],
  documentation: [
    {
      collection: 'guides',
      weight: 1.0,
      queryFields: 'title,content',
      resultLimit: 10,
    },
    {
      collection: 'api_reference',
      weight: 0.9,
      queryFields: 'endpoint,description',
      resultLimit: 10,
    },
    {
      collection: 'faqs',
      weight: 0.6,
      queryFields: 'question,answer',
      resultLimit: 5,
    },
  ],
};

async function searchProfile(query: string, profile: keyof typeof COLLECTION_PROFILES) {
  const collections = COLLECTION_PROFILES[profile].map(config => ({
    collection: config.collection,
    queryBy: config.queryFields,
    maxResults: config.resultLimit,
    weight: config.weight,
    filterBy: config.filters,
  }));

  return multiClient.searchMultipleCollections({
    query,
    collections,
    mergeStrategy: 'relevance',
    normalizeScores: true,
  });
}
```

### 2. Dynamic Collection Selection Pattern

**Best Practice:** Select collections based on query characteristics.

```typescript
async function intelligentSearch(query: string) {
  const collections: CollectionSearchConfig[] = [];

  // Always search main products
  collections.push({
    collection: 'products',
    queryBy: 'name,description',
    maxResults: 20,
    weight: 1.0,
  });

  // Add reviews for specific product queries
  if (query.match(/review|rating|feedback/i)) {
    collections.push({
      collection: 'reviews',
      queryBy: 'title,content',
      maxResults: 10,
      weight: 0.8,
      filterBy: 'verified:true',
    });
  }

  // Add FAQs for question-like queries
  if (query.match(/\?|how|what|when|where|why/i)) {
    collections.push({
      collection: 'faqs',
      queryBy: 'question,answer',
      maxResults: 5,
      weight: 0.6,
    });
  }

  // Add specifications for technical queries
  if (query.match(/spec|technical|feature|dimension/i)) {
    collections.push({
      collection: 'specifications',
      queryBy: 'spec_name,spec_value',
      maxResults: 10,
      weight: 0.7,
    });
  }

  return multiClient.searchMultipleCollections({
    query,
    collections,
    mergeStrategy: 'relevance',
    normalizeScores: true,
  });
}
```

### 3. Result Post-Processing Pattern

**Best Practice:** Process and enrich results after multi-collection search.

```typescript
interface EnrichedResult {
  hit: MultiCollectionSearchHit;
  displayType: string;
  priority: number;
  metadata: Record<string, any>;
}

function processMultiCollectionResults(
  response: MultiCollectionSearchResponse
): EnrichedResult[] {
  return response.hits.map(hit => {
    const enriched: EnrichedResult = {
      hit,
      displayType: getDisplayType(hit._collection),
      priority: calculatePriority(hit),
      metadata: extractMetadata(hit),
    };

    // Add collection-specific enrichments
    switch (hit._collection) {
      case 'products':
        enriched.metadata.priceFormatted = formatPrice(hit.document.price);
        enriched.metadata.availability = checkAvailability(hit.document);
        break;
      case 'reviews':
        enriched.metadata.rating = hit.document.rating;
        enriched.metadata.helpfulCount = hit.document.helpful_count;
        break;
      case 'faqs':
        enriched.metadata.category = hit.document.category;
        enriched.metadata.views = hit.document.view_count;
        break;
    }

    return enriched;
  });
}

function getDisplayType(collection: string): string {
  const displayTypes: Record<string, string> = {
    products: 'product-card',
    reviews: 'review-snippet',
    faqs: 'faq-accordion',
    categories: 'category-link',
  };
  return displayTypes[collection] || 'generic-result';
}

function calculatePriority(hit: MultiCollectionSearchHit): number {
  // Combine multiple factors for priority
  const scoreFactor = hit._normalizedScore;
  const weightFactor = hit._collectionWeight;
  const positionFactor = 1 / (hit._collectionRank + 1);
  
  return scoreFactor * weightFactor * positionFactor;
}
```

---

## State Management Patterns

### 1. Controlled Search State Pattern

**Best Practice:** Centralize search state management.

```typescript
import { useReducer, useCallback } from 'react';
import { searchReducer, initialSearchState, SearchState, SearchAction } from 'typesense-react';

export function useSearchState(initialOverrides?: Partial<SearchState>) {
  const [state, dispatch] = useReducer(
    searchReducer,
    { ...initialSearchState, ...initialOverrides }
  );

  // Wrapped dispatch functions
  const setQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_QUERY', payload: query });
  }, []);

  const toggleFacet = useCallback((field: string, value: string) => {
    dispatch({ 
      type: 'TOGGLE_DISJUNCTIVE_FACET', 
      payload: { field, value } 
    });
  }, []);

  const setNumericFilter = useCallback(
    (field: string, min?: number, max?: number) => {
      dispatch({ 
        type: 'SET_NUMERIC_FILTER', 
        payload: { field, min, max } 
      });
    }, []
  );

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const clearAllFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_SEARCH' });
  }, []);

  return {
    state,
    dispatch,
    actions: {
      setQuery,
      toggleFacet,
      setNumericFilter,
      setPage,
      clearAllFilters,
      reset,
    },
  };
}
```

### 2. Filter Synchronization Pattern

**Best Practice:** Keep URL and state in sync.

```typescript
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function useUrlSyncedSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useSearchState();

  // Sync URL to state on mount/URL change
  useEffect(() => {
    const updates: Partial<SearchState> = {};

    // Parse query
    const query = searchParams.get('q');
    if (query) updates.query = query;

    // Parse filters
    const filters = searchParams.get('filters');
    if (filters) {
      try {
        const parsed = JSON.parse(filters);
        updates.disjunctiveFacets = parsed.facets || {};
        updates.numericFilters = parsed.numeric || {};
      } catch (e) {
        console.error('Invalid filter format');
      }
    }

    // Parse pagination
    const page = searchParams.get('page');
    if (page) updates.page = parseInt(page, 10);

    // Apply all updates at once
    if (Object.keys(updates).length > 0) {
      dispatch({ type: 'BATCH_UPDATE', payload: updates });
    }
  }, [searchParams]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (state.query) {
      params.set('q', state.query);
    }

    const hasFilters = 
      Object.keys(state.disjunctiveFacets).length > 0 ||
      Object.keys(state.numericFilters).length > 0;

    if (hasFilters) {
      params.set('filters', JSON.stringify({
        facets: state.disjunctiveFacets,
        numeric: state.numericFilters,
      }));
    }

    if (state.page > 1) {
      params.set('page', state.page.toString());
    }

    setSearchParams(params, { replace: true });
  }, [state.query, state.disjunctiveFacets, state.numericFilters, state.page]);

  return { state, dispatch };
}
```

### 3. Debounced Search Pattern

**Best Practice:** Debounce search requests to avoid excessive API calls.

```typescript
import { useMemo, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';

function useDebounedSearch(client: TypesenseSearchClient, delay = 300) {
  const { state, dispatch } = useSearchState();
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchState: SearchState) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const params = buildSearchParams(searchState);
      const results = await client.search('products', params);
      
      dispatch({ type: 'SET_RESULTS', payload: results });
    } catch (error) {
      if (error.name !== 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    }
  }, [client, dispatch]);

  const debouncedSearch = useMemo(
    () => debounce(performSearch, delay),
    [performSearch, delay]
  );

  // Trigger search on state changes
  useEffect(() => {
    if (state.query || Object.keys(state.disjunctiveFacets).length > 0) {
      debouncedSearch(state);
    }
  }, [state, debouncedSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearch]);

  return { state, dispatch };
}
```

---

## Performance Optimization

### 1. Lazy Loading Pattern

**Best Practice:** Load facet values on demand.

```typescript
class LazyFacetLoader {
  private loadedFacets = new Set<string>();
  private facetCache = new Map<string, any[]>();

  async loadFacetValues(
    client: TypesenseSearchClient,
    collection: string,
    facetField: string
  ): Promise<any[]> {
    const cacheKey = `${collection}:${facetField}`;
    
    if (this.facetCache.has(cacheKey)) {
      return this.facetCache.get(cacheKey)!;
    }

    const results = await client.search(collection, {
      q: '*',
      query_by: facetField,
      facet_by: facetField,
      max_facet_values: 1000,
      per_page: 0, // Don't need documents
    });

    const facetValues = results.facet_counts?.[0]?.counts || [];
    this.facetCache.set(cacheKey, facetValues);
    this.loadedFacets.add(facetField);

    return facetValues;
  }

  isLoaded(facetField: string): boolean {
    return this.loadedFacets.has(facetField);
  }

  clearCache(): void {
    this.loadedFacets.clear();
    this.facetCache.clear();
  }
}
```

### 2. Request Batching Pattern

**Best Practice:** Batch multiple operations when possible.

```typescript
class SearchBatcher {
  private pendingSearches: Map<string, {
    params: SearchRequest;
    callbacks: Array<{
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }>;
  }> = new Map();

  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private client: TypesenseSearchClient,
    private batchDelay = 10
  ) {}

  async search(collection: string, params: SearchRequest): Promise<TypesenseSearchResponse> {
    const key = this.getCacheKey(collection, params);

    return new Promise((resolve, reject) => {
      if (!this.pendingSearches.has(key)) {
        this.pendingSearches.set(key, {
          params,
          callbacks: [],
        });
      }

      this.pendingSearches.get(key)!.callbacks.push({ resolve, reject });

      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.executeBatch(), this.batchDelay);
      }
    });
  }

  private async executeBatch() {
    const searches = Array.from(this.pendingSearches.entries());
    this.pendingSearches.clear();
    this.batchTimeout = null;

    // Group by collection
    const byCollection = searches.reduce((acc, [key, data]) => {
      const [collection] = key.split(':');
      if (!acc[collection]) acc[collection] = [];
      acc[collection].push(data);
      return acc;
    }, {} as Record<string, typeof searches[0][1][]>);

    // Execute searches per collection
    for (const [collection, collectionSearches] of Object.entries(byCollection)) {
      try {
        const results = await this.client.multiSearch(
          collection,
          collectionSearches.map(s => s.params)
        );

        collectionSearches.forEach((search, index) => {
          search.callbacks.forEach(cb => cb.resolve(results[index]));
        });
      } catch (error) {
        collectionSearches.forEach(search => {
          search.callbacks.forEach(cb => cb.reject(error));
        });
      }
    }
  }

  private getCacheKey(collection: string, params: SearchRequest): string {
    return `${collection}:${JSON.stringify(params)}`;
  }
}
```

### 3. Virtual Scrolling Pattern

**Best Practice:** Implement virtual scrolling for large result sets.

```typescript
interface VirtualScrollState {
  visibleStart: number;
  visibleEnd: number;
  bufferSize: number;
  totalItems: number;
  pageSize: number;
}

class VirtualScrollManager {
  private state: VirtualScrollState;
  private cache = new Map<number, any[]>();

  constructor(pageSize = 20, bufferSize = 5) {
    this.state = {
      visibleStart: 0,
      visibleEnd: pageSize,
      bufferSize,
      totalItems: 0,
      pageSize,
    };
  }

  async loadVisibleRange(
    client: TypesenseSearchClient,
    collection: string,
    baseParams: SearchRequest
  ): Promise<any[]> {
    const startPage = Math.floor(this.state.visibleStart / this.state.pageSize);
    const endPage = Math.ceil(this.state.visibleEnd / this.state.pageSize);
    
    const results: any[] = [];

    for (let page = startPage; page <= endPage; page++) {
      if (!this.cache.has(page)) {
        // Load page
        const response = await client.search(collection, {
          ...baseParams,
          page: page + 1, // 1-indexed
          per_page: this.state.pageSize,
        });

        this.cache.set(page, response.hits);
        this.state.totalItems = response.found;
      }

      const pageResults = this.cache.get(page) || [];
      const startIdx = page === startPage 
        ? this.state.visibleStart % this.state.pageSize 
        : 0;
      const endIdx = page === endPage
        ? (this.state.visibleEnd % this.state.pageSize) || this.state.pageSize
        : this.state.pageSize;

      results.push(...pageResults.slice(startIdx, endIdx));
    }

    // Preload buffer pages
    this.preloadBuffer(client, collection, baseParams);

    return results;
  }

  private async preloadBuffer(
    client: TypesenseSearchClient,
    collection: string,
    baseParams: SearchRequest
  ): Promise<void> {
    const startPage = Math.floor(this.state.visibleStart / this.state.pageSize);
    const endPage = Math.ceil(this.state.visibleEnd / this.state.pageSize);

    const preloadPages: number[] = [];

    // Preload before
    for (let i = 1; i <= this.state.bufferSize; i++) {
      const page = startPage - i;
      if (page >= 0 && !this.cache.has(page)) {
        preloadPages.push(page);
      }
    }

    // Preload after
    for (let i = 1; i <= this.state.bufferSize; i++) {
      const page = endPage + i;
      const maxPage = Math.ceil(this.state.totalItems / this.state.pageSize);
      if (page < maxPage && !this.cache.has(page)) {
        preloadPages.push(page);
      }
    }

    // Load in parallel
    await Promise.all(
      preloadPages.map(async (page) => {
        const response = await client.search(collection, {
          ...baseParams,
          page: page + 1,
          per_page: this.state.pageSize,
        });
        this.cache.set(page, response.hits);
      })
    );
  }

  updateVisibleRange(start: number, end: number): void {
    this.state.visibleStart = start;
    this.state.visibleEnd = end;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## Error Handling Patterns

### 1. Retry Pattern with Exponential Backoff

**Best Practice:** Implement intelligent retry logic.

```typescript
class RetryableSearchClient {
  constructor(
    private client: TypesenseSearchClient,
    private maxRetries = 3,
    private initialDelay = 1000
  ) {}

  async search(
    collection: string,
    params: SearchRequest,
    options?: { signal?: AbortSignal }
  ): Promise<TypesenseSearchResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Check if aborted
        if (options?.signal?.aborted) {
          throw new Error('Search aborted');
        }

        return await this.client.search(collection, params);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (this.isClientError(error)) {
          throw error;
        }

        // Don't retry if aborted
        if (error.message === 'Search aborted') {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.initialDelay * Math.pow(2, attempt);
        
        if (attempt < this.maxRetries) {
          await this.delay(delay, options?.signal);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Search failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private isClientError(error: any): boolean {
    // Check if it's a 4xx error
    return error?.originalError?.response?.status >= 400 && 
           error?.originalError?.response?.status < 500;
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Delay aborted'));
        });
      }
    });
  }
}
```

### 2. Graceful Degradation Pattern

**Best Practice:** Provide fallback behavior when services are unavailable.

```typescript
class FallbackSearchClient {
  private healthCheck = {
    isHealthy: true,
    lastCheck: 0,
    checkInterval: 30000, // 30 seconds
  };

  constructor(
    private primaryClient: TypesenseSearchClient,
    private fallbackData?: any
  ) {}

  async search(
    collection: string,
    params: SearchRequest
  ): Promise<TypesenseSearchResponse> {
    // Check health periodically
    if (Date.now() - this.healthCheck.lastCheck > this.healthCheck.checkInterval) {
      await this.checkHealth();
    }

    if (!this.healthCheck.isHealthy) {
      return this.getFallbackResults(params);
    }

    try {
      const results = await this.primaryClient.search(collection, params);
      this.healthCheck.isHealthy = true;
      return results;
    } catch (error) {
      console.error('Search failed, using fallback:', error);
      this.healthCheck.isHealthy = false;
      return this.getFallbackResults(params);
    }
  }

  private async checkHealth(): Promise<void> {
    this.healthCheck.lastCheck = Date.now();
    
    try {
      // Simple health check - try to get schema
      await this.primaryClient.getSchema('health_check').catch(() => {
        // Collection might not exist, but connection works
      });
      this.healthCheck.isHealthy = true;
    } catch (error) {
      this.healthCheck.isHealthy = false;
    }
  }

  private getFallbackResults(params: SearchRequest): TypesenseSearchResponse {
    // Return cached/static data or empty results
    if (this.fallbackData) {
      // Filter fallback data based on query
      const filtered = this.filterFallbackData(this.fallbackData, params.q);
      return {
        hits: filtered,
        found: filtered.length,
        search_time_ms: 0,
        page: 1,
        out_of: filtered.length,
        request_params: params,
      };
    }

    // Empty results
    return {
      hits: [],
      found: 0,
      search_time_ms: 0,
      page: 1,
      out_of: 0,
      request_params: params,
    };
  }

  private filterFallbackData(data: any[], query: string): any[] {
    const queryLower = query.toLowerCase();
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(queryLower)
    );
  }
}
```

### 3. Error Context Enhancement Pattern

**Best Practice:** Add context to errors for better debugging.

```typescript
class ErrorContextEnhancer {
  static enhanceError(
    error: any,
    context: {
      operation: string;
      collection?: string;
      params?: any;
      timestamp?: number;
      userId?: string;
      sessionId?: string;
    }
  ): Error {
    const enhanced = new Error(
      `${context.operation} failed: ${error.message || 'Unknown error'}`
    );

    // Copy stack trace
    enhanced.stack = error.stack;

    // Add context
    Object.assign(enhanced, {
      originalError: error,
      context: {
        ...context,
        timestamp: context.timestamp || Date.now(),
        environment: process.env.NODE_ENV,
      },
    });

    return enhanced;
  }

  static async withErrorContext<T>(
    operation: string,
    context: any,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw this.enhanceError(error, { operation, ...context });
    }
  }
}

// Usage
const results = await ErrorContextEnhancer.withErrorContext(
  'Product search',
  { collection: 'products', userId: currentUser.id },
  () => client.search('products', searchParams)
);
```

---

## Testing Patterns

### 1. Mock Client Pattern

**Best Practice:** Create type-safe mocks for testing.

```typescript
class MockTypesenseSearchClient implements Partial<TypesenseSearchClient> {
  private mockResponses = new Map<string, TypesenseSearchResponse>();
  private callHistory: Array<{ method: string; args: any[] }> = [];

  setMockResponse(key: string, response: TypesenseSearchResponse): void {
    this.mockResponses.set(key, response);
  }

  async search(
    collection: string,
    params: SearchRequest
  ): Promise<TypesenseSearchResponse> {
    this.callHistory.push({ method: 'search', args: [collection, params] });
    
    const key = `${collection}:${params.q}`;
    const response = this.mockResponses.get(key);
    
    if (!response) {
      throw new Error(`No mock response for ${key}`);
    }
    
    return Promise.resolve(response);
  }

  getCallHistory(): typeof this.callHistory {
    return this.callHistory;
  }

  wasCalledWith(method: string, ...args: any[]): boolean {
    return this.callHistory.some(
      call => call.method === method && 
      JSON.stringify(call.args) === JSON.stringify(args)
    );
  }

  clearHistory(): void {
    this.callHistory = [];
  }
}
```

### 2. Test Data Builder Pattern

**Best Practice:** Use builders for test data creation.

```typescript
class SearchResponseBuilder {
  private response: Partial<TypesenseSearchResponse> = {
    hits: [],
    found: 0,
    search_time_ms: 1,
    page: 1,
    out_of: 0,
    request_params: {},
  };

  withHits(hits: any[]): this {
    this.response.hits = hits.map(doc => ({
      document: doc,
      highlight: {},
      text_match: Math.random() * 100000,
    }));
    this.response.found = hits.length;
    this.response.out_of = hits.length;
    return this;
  }

  withFacets(facets: Record<string, Array<{ value: string; count: number }>>): this {
    this.response.facet_counts = Object.entries(facets).map(([field, counts]) => ({
      field_name: field,
      counts,
    }));
    return this;
  }

  withPagination(page: number, perPage: number, total: number): this {
    this.response.page = page;
    this.response.found = total;
    this.response.out_of = total;
    return this;
  }

  build(): TypesenseSearchResponse {
    return this.response as TypesenseSearchResponse;
  }
}

// Usage in tests
const mockResponse = new SearchResponseBuilder()
  .withHits([
    { id: '1', name: 'Product 1', price: 100 },
    { id: '2', name: 'Product 2', price: 200 },
  ])
  .withFacets({
    brand: [
      { value: 'Apple', count: 10 },
      { value: 'Samsung', count: 8 },
    ],
  })
  .withPagination(1, 20, 100)
  .build();
```

### 3. Integration Test Pattern

**Best Practice:** Test complete search flows.

```typescript
describe('Search Integration', () => {
  let client: TypesenseSearchClient;
  let searchState: ReturnType<typeof useSearchState>;

  beforeEach(() => {
    client = new MockTypesenseSearchClient() as any;
    searchState = renderHook(() => useSearchState()).result.current;
  });

  it('should handle complete search flow', async () => {
    // 1. User enters query
    act(() => {
      searchState.actions.setQuery('laptop');
    });

    // 2. User selects filters
    act(() => {
      searchState.actions.toggleFacet('brand', 'apple');
      searchState.actions.setNumericFilter('price', 500, 1500);
    });

    // 3. Build search params
    const params = buildSearchParams(searchState.state);
    expect(params.q).toBe('laptop');
    expect(params.filter_by).toContain('brand:[apple]');
    expect(params.filter_by).toContain('price:[500..1500]');

    // 4. Perform search
    const response = await client.search('products', params);
    
    // 5. Update state with results
    act(() => {
      searchState.dispatch({ 
        type: 'SET_RESULTS', 
        payload: response 
      });
    });

    // 6. Verify final state
    expect(searchState.state.results).toBeDefined();
    expect(searchState.state.loading).toBe(false);
    expect(searchState.state.searchPerformed).toBe(true);
  });
});
```

## Summary

These patterns represent best practices developed from real-world usage of the typesense-react library:

1. **Client Management**: Use singletons, configure caching strategically
2. **Search Optimization**: Build parameters programmatically, use presets
3. **Multi-Collection**: Define profiles, process results intelligently
4. **State Management**: Centralize state, sync with URLs, debounce requests
5. **Performance**: Implement lazy loading, batching, and virtual scrolling
6. **Error Handling**: Use retries, fallbacks, and context enhancement
7. **Testing**: Create proper mocks and test complete flows

Following these patterns will help you build robust, performant search experiences with typesense-react.