# Core API Reference

This document provides comprehensive API documentation for the core modules of typesense-react.

## Table of Contents
- [TypesenseSearchClient](#typesensesearchclient)
- [MultiCollectionSearchClient](#multicollectionsearchclient)
- [searchReducer](#searchreducer)
- [Types and Interfaces](#types-and-interfaces)

---

## TypesenseSearchClient

Enhanced Typesense client with caching and request optimization capabilities.

### Constructor

```typescript
constructor(
  config: TypesenseConfig | Client,
  cacheTimeout?: number,
  maxCacheSize?: number
)
```

#### Parameters
- `config` - Either a TypesenseConfig object or an existing Typesense Client instance
- `cacheTimeout` - Cache timeout in milliseconds (default: 300000 / 5 minutes)
- `maxCacheSize` - Maximum number of cached entries (default: 100)

#### TypesenseConfig Interface
```typescript
interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number | string;  // Automatically converted to number
    protocol: string;
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
  cacheSearchResultsForSeconds?: number;
}
```

### Methods

#### search
Performs a cached search request.

```typescript
async search(
  collection: string,
  params: SearchRequest,
  useCache?: boolean
): Promise<TypesenseSearchResponse>
```

**Parameters:**
- `collection` - Name of the collection to search
- `params` - Search parameters (see SearchRequest type below)
- `useCache` - Whether to use cache (default: true)

**Returns:** Promise resolving to TypesenseSearchResponse

**Throws:** Enhanced error with context including collection name and parameters

#### multiSearch
Performs multiple searches in parallel (useful for disjunctive faceting).

```typescript
async multiSearch(
  collection: string,
  searches: SearchRequest[],
  useCache?: boolean
): Promise<TypesenseSearchResponse[]>
```

**Parameters:**
- `collection` - Name of the collection to search
- `searches` - Array of search parameters
- `useCache` - Whether to use cache (default: true)

**Returns:** Array of search responses

#### getSchema
Retrieves the schema for a collection.

```typescript
async getSchema(collection: string): Promise<any>
```

**Parameters:**
- `collection` - Name of the collection

**Returns:** Collection schema object

**Throws:** Enhanced error with context

#### clearCache
Clears the entire search cache.

```typescript
clearCache(): void
```

#### getCacheStats
Gets current cache statistics.

```typescript
getCacheStats(): {
  size: number;
  maxSize: number;
  timeout: number;
}
```

**Returns:** Object containing cache size, max size, and timeout

#### getClient
Gets the underlying Typesense client instance.

```typescript
getClient(): Client
```

**Returns:** The Typesense client instance

### Cache Behavior
- Cache keys are generated from collection name and sorted search parameters
- Cache entries expire after the configured timeout
- Expired entries are automatically cleaned on new searches
- When max cache size is reached, oldest entries are evicted
- Cache can be disabled per search by setting `useCache` to false

---

## MultiCollectionSearchClient

Client for searching across multiple Typesense collections in parallel with result merging.

### Constructor

```typescript
constructor(clientOrConfig: TypesenseSearchClient | TypesenseConfig | Client)
```

#### Parameters
- `clientOrConfig` - Either an existing TypesenseSearchClient, TypesenseConfig, or Typesense Client

### Methods

#### searchMultipleCollections
Searches multiple collections in parallel and merges results.

```typescript
async searchMultipleCollections(
  request: MultiCollectionSearchRequest
): Promise<MultiCollectionSearchResponse>
```

**Parameters:**
- `request` - Multi-collection search request configuration

#### MultiCollectionSearchRequest
```typescript
interface MultiCollectionSearchRequest {
  query: string;
  collections: CollectionSearchConfig[];
  mergeStrategy?: 'relevance' | 'roundRobin' | 'collectionOrder';
  resultMode?: 'interleaved' | 'perCollection' | 'both';
  normalizeScores?: boolean;
  globalMaxResults?: number;
  enableHighlighting?: boolean;
  highlightConfig?: {
    startTag?: string;
    endTag?: string;
    affixNumTokens?: number;
  };
}
```

#### CollectionSearchConfig
```typescript
interface CollectionSearchConfig {
  collection: string;
  namespace?: string;
  weight?: number;
  queryBy?: string;
  sortBy?: string;
  filterBy?: string;
  facetBy?: string;
  includeFacets?: boolean;
  maxResults?: number;
  includeFields?: string;
  excludeFields?: string;
}
```

#### MultiCollectionSearchResponse
```typescript
interface MultiCollectionSearchResponse {
  hits: MultiCollectionSearchHit[];
  found: number;
  totalFoundByCollection: Record<string, number>;
  includedByCollection: Record<string, number>;
  searchTimeMs: number;
  searchTimeByCollection: Record<string, number>;
  query: string;
  facetsByCollection?: Record<string, any>;
  errorsByCollection?: Record<string, string>;
  hitsByCollection?: Record<string, MultiCollectionSearchHit[]>;
  resultMode: 'interleaved' | 'perCollection' | 'both';
}
```

#### clearSchemaCache
Clears the internal schema cache.

```typescript
clearSchemaCache(): void
```

### Merge Strategies

1. **relevance** - Merges by normalized and weighted scores
2. **roundRobin** - Takes results from each collection in turn
3. **collectionOrder** - Returns all results from first collection, then second, etc.

### Result Modes

1. **interleaved** - Returns merged hits array only
2. **perCollection** - Returns hits organized by collection
3. **both** - Returns both merged hits and per-collection organization

### Features
- Automatic schema discovery for query field inference
- Score normalization across collections
- Collection weighting for relevance tuning
- Parallel execution with individual error handling
- Facet support per collection
- Field selection and exclusion
- Highlighting configuration

---

## searchReducer

Redux-style reducer for managing search state.

### Initial State

```typescript
const initialSearchState: SearchState = {
  query: '',
  results: null,
  loading: false,
  error: null,
  facets: [],
  disjunctiveFacets: {},
  numericFilters: {},
  dateFilters: {},
  selectiveFilters: {},
  customFilters: {},
  page: 1,
  perPage: 20,
  sortBy: '',
  multiSortBy: undefined,
  additionalFilters: undefined,
  schema: null,
  searchPerformed: false,
  lastSearchAt: undefined,
  accumulatedFacetValues: {},
  accumulateFacets: false,
  moveSelectedToTop: false,
  reorderByCount: true,
  useNumericRanges: false,
  numericFacetRanges: {},
  facetOptionLimit: 0,
  hideZeroCountsForSingleSelect: true,
  allowNumericRangeForSingleSelect: true,
};
```

### Action Types

#### Query and Results
- `SET_QUERY` - Sets search query and resets page to 1
- `SET_RESULTS` - Sets search results and updates metadata
- `SET_LOADING` - Sets loading state
- `SET_ERROR` - Sets error state

#### Filters
- `SET_DISJUNCTIVE_FACETS` - Sets all disjunctive facets
- `TOGGLE_DISJUNCTIVE_FACET` - Toggles a single facet value
- `SET_NUMERIC_FILTER` - Sets numeric range filter
- `SET_DATE_FILTER` - Sets date range filter
- `SET_SELECTIVE_FILTER` - Sets single-select filter
- `SET_CUSTOM_FILTER` - Sets custom filter array
- `CLEAR_FILTER` - Clears specific filter
- `CLEAR_ALL_FILTERS` - Clears all filters

#### Pagination and Sorting
- `SET_PAGE` - Sets current page
- `SET_PER_PAGE` - Sets items per page (resets to page 1)
- `SET_SORT_BY` - Sets sort field
- `SET_MULTI_SORT_BY` - Sets multiple sort fields
- `ADD_SORT_FIELD` - Adds or updates a sort field
- `REMOVE_SORT_FIELD` - Removes a sort field
- `CLEAR_MULTI_SORT` - Clears all multi-sort fields

#### Facet Management
- `SET_FACETS` - Sets facet configuration
- `SET_ACCUMULATE_FACETS` - Enables/disables facet accumulation
- `UPDATE_ACCUMULATED_FACETS` - Updates accumulated facet values
- `CLEAR_ACCUMULATED_FACETS` - Clears accumulated values
- `SET_MOVE_SELECTED_TO_TOP` - Configures selected facet positioning
- `SET_REORDER_BY_COUNT` - Configures facet count ordering
- `SET_USE_NUMERIC_RANGES` - Enables numeric range facets
- `SET_NUMERIC_FACET_MODE` - Sets mode for numeric facet
- `SET_NUMERIC_FACET_RANGE` - Sets numeric facet range
- `UPDATE_NUMERIC_FACET_BOUNDS` - Updates numeric bounds
- `CLEAR_NUMERIC_FACET_RANGE` - Clears numeric range
- `SET_FACET_OPTION_LIMIT` - Sets max facet options
- `SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT` - Configures zero count hiding
- `SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT` - Configures numeric range for single-select

#### Other Actions
- `SET_SCHEMA` - Sets collection schema
- `SET_ADDITIONAL_FILTERS` - Sets additional filter string
- `RESET_SEARCH` - Resets to initial state (preserves configuration)
- `BATCH_UPDATE` - Updates multiple fields at once

### Helper Functions

#### createInitialState
Creates initial state with custom overrides.

```typescript
function createInitialState(overrides?: Partial<SearchState>): SearchState
```

---

## Types and Interfaces

### SearchRequest
```typescript
interface SearchRequest {
  q: string;
  query_by: string;
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  facet_query?: string;
  page?: number;
  per_page?: number;
  group_by?: string;
  group_limit?: number;
  include_fields?: string;
  exclude_fields?: string;
  highlight_fields?: string;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  snippet_threshold?: number;
  num_typos?: number;
  min_len_1typo?: number;
  min_len_2typo?: number;
  typo_tokens_threshold?: number;
  drop_tokens_threshold?: number;
  prefix?: boolean;
  infix?: string;
  pre_segmented_query?: boolean;
  query_by_weights?: string;
  limit_hits?: number;
  search_cutoff_ms?: number;
  use_cache?: boolean;
  cache_ttl?: number;
  prioritize_exact_match?: boolean;
  exhaustive_search?: boolean;
  pinned_hits?: string;
  hidden_hits?: string;
  preset?: string;
}
```

### TypesenseSearchResponse
```typescript
interface TypesenseSearchResponse {
  hits: SearchHit[];
  found: number;
  out_of: number;
  search_time_ms: number;
  page: number;
  facet_counts?: FacetCount[];
  request_params: any;
}
```

### SearchHit
```typescript
interface SearchHit {
  document: any;
  highlight?: Record<string, { snippet: string }>;
  text_match?: number;
  geo_distance_meters?: number;
  vector_distance?: number;
}
```

### MultiCollectionSearchHit
```typescript
interface MultiCollectionSearchHit extends SearchHit {
  _collection: string;
  _namespace?: string;
  _collectionRank: number;
  _originalScore: number;
  _normalizedScore: number;
  _mergedScore: number;
  _collectionWeight: number;
}
```

### SearchState
```typescript
interface SearchState {
  query: string;
  results: TypesenseSearchResponse | null;
  loading: boolean;
  error: string | null;
  facets: string[];
  disjunctiveFacets: Record<string, string[]>;
  numericFilters: Record<string, { min?: number; max?: number }>;
  dateFilters: Record<string, { start?: string | null; end?: string | null }>;
  selectiveFilters: Record<string, string>;
  customFilters: Record<string, string[]>;
  page: number;
  perPage: number;
  sortBy: string;
  multiSortBy?: Array<{ field: string; order: 'asc' | 'desc' }>;
  additionalFilters?: string;
  schema: any | null;
  searchPerformed: boolean;
  lastSearchAt?: number;
  accumulatedFacetValues: Record<string, AccumulatedFacetData>;
  accumulateFacets: boolean;
  moveSelectedToTop: boolean;
  reorderByCount: boolean;
  useNumericRanges: boolean;
  numericFacetRanges: Record<string, NumericFacetRange>;
  facetOptionLimit: number;
  hideZeroCountsForSingleSelect: boolean;
  allowNumericRangeForSingleSelect: boolean;
}
```

## Error Handling

All errors thrown by TypesenseSearchClient and MultiCollectionSearchClient are enhanced with additional context:

```typescript
interface EnhancedError extends Error {
  originalError: any;
  collection?: string;
  params?: any;
}
```

This makes debugging easier by providing the original error along with the context in which it occurred.

## Performance Considerations

1. **Caching** - TypesenseSearchClient implements intelligent caching to reduce API calls
2. **Parallel Execution** - MultiCollectionSearchClient executes all collection searches in parallel
3. **Schema Caching** - Collection schemas are cached to avoid repeated retrieval
4. **Cache Management** - Automatic cleanup of expired entries and size management
5. **Score Normalization** - Efficient normalization only when needed

## Best Practices

1. **Cache Configuration** - Set appropriate cache timeout based on data freshness requirements
2. **Collection Weights** - Use weights to tune relevance across collections
3. **Error Handling** - Always handle errors from multi-collection searches as individual collections may fail
4. **Result Modes** - Choose appropriate result mode based on UI requirements
5. **Schema Discovery** - Let the client infer query fields from schema when possible