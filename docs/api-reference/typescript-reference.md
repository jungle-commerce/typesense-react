# TypeScript Reference Documentation

This comprehensive guide documents all TypeScript types and interfaces in the typesense-react library.

## Table of Contents

- [Core Types](#core-types)
  - [Configuration](#configuration)
  - [Search Request & Response](#search-request--response)
  - [Facet Types](#facet-types)
  - [Filter State Types](#filter-state-types)
  - [Search State & Actions](#search-state--actions)
  - [Provider Types](#provider-types)
  - [Hook Return Types](#hook-return-types)
- [Multi-Collection Types](#multi-collection-types)
- [Utility Types](#utility-types)
  - [Date Filter Types](#date-filter-types)
  - [Sort Builder Types](#sort-builder-types)
  - [Additional Filter Types](#additional-filter-types)
- [Provider Context Types](#provider-context-types)

## Core Types

### Configuration

#### TypesenseConfig

Configuration object for initializing the Typesense client.

```typescript
interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number;
    protocol: string;
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
  cacheSearchResultsForSeconds?: number;
}
```

**Properties:**
- `nodes`: Array of Typesense server nodes
- `apiKey`: API key for authentication
- `connectionTimeoutSeconds`: Connection timeout in seconds (optional)
- `numRetries`: Number of retry attempts (optional)
- `retryIntervalSeconds`: Interval between retries (optional)
- `cacheSearchResultsForSeconds`: Cache duration for search results (optional)

**Usage Example:**
```typescript
const config: TypesenseConfig = {
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz',
  cacheSearchResultsForSeconds: 300
};
```

### Search Request & Response

#### SearchRequest

Extended search request parameters for Typesense API.

```typescript
interface SearchRequest {
  q: string;
  query_by: string;
  filter_by?: string;
  facet_by?: string;
  sort_by?: string;
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
  prefix?: boolean | string;
  infix?: 'off' | 'always' | 'fallback';
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

**Key Properties:**
- `q`: Search query string
- `query_by`: Comma-separated list of fields to query
- `filter_by`: Filter expression (e.g., "price:>100")
- `facet_by`: Comma-separated list of fields to facet
- `sort_by`: Sort expression (e.g., "price:desc,name:asc")

#### SearchHit

Individual search result hit with document data.

```typescript
interface SearchHit<T extends DocumentSchema = Record<string, any>> {
  document: T;
  text_match?: number;
  highlights?: Array<{
    field: string;
    snippet?: string;
    value?: string;
  }>;
}
```

#### TypesenseSearchResponse

Complete search response from Typesense.

```typescript
interface TypesenseSearchResponse<T extends DocumentSchema = Record<string, any>> {
  facet_counts?: SearchResponseFacetCountSchema<T>[];
  hits?: SearchHit<T>[];
  found: number;
  search_time_ms: number;
  page: number;
  request_params: SearchRequest;
  search_cutoff?: boolean;
}
```

### Facet Types

#### FacetConfig

Configuration for UI facet rendering.

```typescript
interface FacetConfig {
  /** Field name in the document */
  field: string;
  /** Display label for the facet */
  label: string;
  /** Type of facet rendering */
  type: 'checkbox' | 'select' | 'numeric' | 'date' | 'custom';
  /** Whether this facet uses disjunctive (OR) logic */
  disjunctive?: boolean;
  /** Maximum number of values to display */
  maxValues?: number;
  /** Whether to show search box for values */
  searchable?: boolean;
  /** Whether facet is initially expanded */
  expanded?: boolean;
  /** Sort order for facet values */
  sortBy?: 'count' | 'value' | 'alpha';
  /** For numeric facets, the step size */
  step?: number;
  /** For date facets, the date format */
  dateFormat?: string;
  /** Custom render function */
  renderLabel?: (value: string) => string;
  /** For numeric facets, how to display them */
  numericDisplay?: 'checkbox' | 'range' | 'both';
  /** For range sliders, the step granularity */
  rangeStep?: number;
}
```

**Usage Example:**
```typescript
const facetConfig: FacetConfig = {
  field: 'category',
  label: 'Product Category',
  type: 'checkbox',
  disjunctive: true,
  maxValues: 10,
  sortBy: 'count'
};
```

#### FacetResult

Facet result from Typesense API.

```typescript
interface FacetResult {
  field_name: string;
  counts: FacetValue[];
  stats?: {
    avg?: number;
    max?: number;
    min?: number;
    sum?: number;
  };
}
```

#### FacetValue

Individual facet value with count.

```typescript
interface FacetValue {
  value: string;
  count: number;
  highlighted?: string;
}
```

### Filter State Types

#### DisjunctiveFacetState

State for disjunctive (OR) facets.

```typescript
interface DisjunctiveFacetState {
  [field: string]: string[];
}
```

**Example:**
```typescript
const disjunctiveState: DisjunctiveFacetState = {
  category: ['electronics', 'books'],
  brand: ['apple', 'samsung']
};
```

#### NumericFilterState

State for numeric range filters.

```typescript
interface NumericFilterState {
  [field: string]: {
    min?: number;
    max?: number;
  };
}
```

**Example:**
```typescript
const numericState: NumericFilterState = {
  price: { min: 10, max: 100 },
  rating: { min: 4 }
};
```

#### DateFilterState

State for date range filters.

```typescript
interface DateFilterState {
  [field: string]: {
    start?: Date | string;
    end?: Date | string;
  };
}
```

#### SelectiveFilterState

State for single-value filters.

```typescript
interface SelectiveFilterState {
  [field: string]: string;
}
```

#### CustomFilterState

State for custom attribute filters.

```typescript
interface CustomFilterState {
  [field: string]: string[];
}
```

### Search State & Actions

#### SearchState

Complete search state managed by the provider.

```typescript
interface SearchState {
  /** Current search query */
  query: string;
  /** Search results from Typesense */
  results: TypesenseSearchResponse | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Available facets configuration */
  facets: FacetConfig[];
  /** Disjunctive facet selections */
  disjunctiveFacets: DisjunctiveFacetState;
  /** Numeric range filters */
  numericFilters: NumericFilterState;
  /** Date range filters */
  dateFilters: DateFilterState;
  /** Selective (single-value) filters */
  selectiveFilters: SelectiveFilterState;
  /** Custom attribute filters */
  customFilters: CustomFilterState;
  /** Current page number (1-indexed) */
  page: number;
  /** Results per page */
  perPage: number;
  /** Sort field and order */
  sortBy: string;
  /** Multiple sort fields with order */
  multiSortBy?: Array<{ field: string; order: 'asc' | 'desc' }>;
  /** Additional raw filter string */
  additionalFilters?: string;
  /** Collection schema */
  schema: CollectionSchema | null;
  /** Whether search has been performed */
  searchPerformed: boolean;
  /** Last search timestamp */
  lastSearchAt?: number;
  /** Accumulated facet values across all searches */
  accumulatedFacetValues: AccumulatedFacetValues;
  /** Whether to accumulate facet values */
  accumulateFacets: boolean;
  /** Whether to move selected facet values to the top */
  moveSelectedToTop: boolean;
  /** Whether to reorder facet values by count */
  reorderByCount: boolean;
  /** Whether to use numeric ranges for numeric facets */
  useNumericRanges: boolean;
  /** Numeric facet range configurations */
  numericFacetRanges: NumericFacetRangesState;
  /** Limit for facet options */
  facetOptionLimit: number;
  /** Whether to hide zero-count options for single-select facets */
  hideZeroCountsForSingleSelect: boolean;
  /** Whether to allow numeric facets to use range behavior */
  allowNumericRangeForSingleSelect: boolean;
}
```

#### SearchAction

Actions for updating search state.

```typescript
type SearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_RESULTS'; payload: TypesenseSearchResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_FACETS'; payload: FacetConfig[] }
  | { type: 'SET_DISJUNCTIVE_FACETS'; payload: DisjunctiveFacetState }
  | { type: 'TOGGLE_DISJUNCTIVE_FACET'; payload: { field: string; value: string } }
  | { type: 'SET_NUMERIC_FILTER'; payload: { field: string; min?: number; max?: number } }
  | { type: 'SET_DATE_FILTER'; payload: { field: string; start?: Date | string; end?: Date | string } }
  | { type: 'SET_SELECTIVE_FILTER'; payload: { field: string; value: string } }
  | { type: 'SET_CUSTOM_FILTER'; payload: { field: string; values: string[] } }
  | { type: 'CLEAR_FILTER'; payload: { field: string; filterType: 'disjunctive' | 'numeric' | 'date' | 'selective' | 'custom' } }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PER_PAGE'; payload: number }
  | { type: 'SET_SORT_BY'; payload: string }
  | { type: 'SET_MULTI_SORT_BY'; payload: Array<{ field: string; order: 'asc' | 'desc' }> }
  | { type: 'SET_ADDITIONAL_FILTERS'; payload: string }
  | { type: 'RESET_SEARCH' }
  | { type: 'BATCH_UPDATE'; payload: Partial<SearchState> };
```

### Provider Types

#### SearchProviderProps

Configuration for SearchProvider component.

```typescript
interface SearchProviderProps {
  /** Typesense configuration */
  config: TypesenseConfig;
  /** Collection name to search */
  collection: string;
  /** Initial search parameters */
  initialSearchParams?: Partial<SearchRequest>;
  /** Initial state values */
  initialState?: Partial<SearchState>;
  /** Facet configurations */
  facets?: FacetConfig[];
  /** Whether to search on mount */
  searchOnMount?: boolean;
  /** Callback when state changes */
  onStateChange?: (state: SearchState) => void;
  /** Children components */
  children: React.ReactNode;
  /** Performance mode - disables some features for better performance */
  performanceMode?: boolean;
  /** Enable disjunctive facet queries */
  enableDisjunctiveFacetQueries?: boolean;
  /** Enable accumulation of facet values across searches */
  accumulateFacets?: boolean;
}
```

#### SearchContextValue

Context value provided by SearchProvider.

```typescript
interface SearchContextValue {
  /** Current search state */
  state: SearchState;
  /** Dispatch function for state updates */
  dispatch: React.Dispatch<SearchAction>;
  /** Typesense client instance */
  client: TypesenseSearchClient;
  /** Collection name */
  collection: string;
  /** Initial search parameters */
  initialSearchParams?: Partial<SearchRequest>;
  /** Search configuration */
  config: {
    searchOnMount: boolean;
    performanceMode: boolean;
    enableDisjunctiveFacetQueries: boolean;
  };
}
```

### Hook Return Types

#### UseSearchReturn

Return type for the `useSearch` hook.

```typescript
interface UseSearchReturn {
  /** Current search state */
  state: SearchState;
  /** Search actions */
  actions: {
    search: (query?: string) => Promise<void>;
    setQuery: (query: string) => void;
    setPage: (page: number) => void;
    setPerPage: (perPage: number) => void;
    setSortBy: (sortBy: string) => void;
    clearAllFilters: () => void;
    reset: () => void;
    setAdditionalFilters: (filters: string) => void;
    setMultiSortBy: (sorts: Array<{ field: string; order: 'asc' | 'desc' }>) => void;
    addSortField: (field: string, order?: 'asc' | 'desc') => void;
    removeSortField: (field: string) => void;
    clearMultiSort: () => void;
  };
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
}
```

#### UseAdvancedFacetsReturn

Return type for the `useAdvancedFacets` hook.

```typescript
interface UseAdvancedFacetsReturn {
  /** Active disjunctive facets */
  disjunctiveFacets: DisjunctiveFacetState;
  /** Active numeric filters */
  numericFilters: NumericFilterState;
  /** Active date filters */
  dateFilters: DateFilterState;
  /** Active selective filters */
  selectiveFilters: SelectiveFilterState;
  /** Active custom filters */
  customFilters: CustomFilterState;
  /** Total active filter count */
  activeFilterCount: number;
  /** Actions for managing facets */
  actions: {
    toggleFacetValue: (field: string, value: string) => void;
    setNumericFilter: (field: string, min?: number, max?: number) => void;
    setDateFilter: (field: string, start?: Date | string, end?: Date | string) => void;
    setSelectiveFilter: (field: string, value: string) => void;
    setCustomFilter: (field: string, values: string[]) => void;
    clearFilter: (field: string, filterType: 'disjunctive' | 'numeric' | 'date' | 'selective' | 'custom') => void;
    clearAllFilters: () => void;
  };
}
```

## Multi-Collection Types

### CollectionSearchConfig

Configuration for searching a specific collection in multi-collection search.

```typescript
interface CollectionSearchConfig {
  /** The Typesense collection name */
  collection: string;
  
  /** Optional namespace prefix for results (e.g., 'product', 'category') */
  namespace?: string;
  
  /** Collection-specific fields to search (comma-separated) */
  queryBy?: string;
  
  /** Collection-specific sort order (e.g., 'popularity:desc') */
  sortBy?: string;
  
  /** Maximum number of results from this collection */
  maxResults?: number;
  
  /** Relevance weight multiplier for merging (default: 1.0) */
  weight?: number;
  
  /** Optional filter for this collection */
  filterBy?: string;
  
  /** Whether to include facets from this collection */
  includeFacets?: boolean;
  
  /** Facet fields for this collection */
  facetBy?: string;
  
  /** Fields to include in the response (comma-separated) */
  includeFields?: string;
  
  /** Fields to exclude from the response (comma-separated) */
  excludeFields?: string;
}
```

**Usage Example:**
```typescript
const collectionConfig: CollectionSearchConfig = {
  collection: 'products',
  namespace: 'product',
  queryBy: 'name,description,tags',
  sortBy: 'popularity:desc',
  maxResults: 20,
  weight: 1.5,
  filterBy: 'in_stock:true'
};
```

### MultiCollectionSearchRequest

Request configuration for multi-collection search.

```typescript
interface MultiCollectionSearchRequest {
  /** The search query */
  query: string;
  
  /** Array of collections to search */
  collections: CollectionSearchConfig[];
  
  /** Global maximum results across all collections */
  globalMaxResults?: number;
  
  /** Enable search term highlighting */
  enableHighlighting?: boolean;
  
  /** Highlighting configuration */
  highlightConfig?: {
    /** HTML tag to start highlight (default: '<mark>') */
    startTag?: string;
    
    /** HTML tag to end highlight (default: '</mark>') */
    endTag?: string;
    
    /** CSS class to apply to highlights */
    cssClass?: string;
    
    /** Number of tokens to include before/after highlight */
    affixNumTokens?: number;
  };
  
  /** How to merge results from different collections */
  mergeStrategy?: 'relevance' | 'roundRobin' | 'collectionOrder';
  
  /** Whether to normalize scores across collections */
  normalizeScores?: boolean;
  
  /** How to return results */
  resultMode?: 'interleaved' | 'perCollection' | 'both';
}
```

### MultiCollectionSearchHit

Extended search hit with multi-collection metadata.

```typescript
interface MultiCollectionSearchHit extends SearchHit {
  /** The collection this hit came from */
  _collection: string;
  
  /** Optional namespace for categorization */
  _namespace?: string;
  
  /** Rank within the original collection results */
  _collectionRank: number;
  
  /** Original relevance score from Typesense */
  _originalScore: number;
  
  /** Normalized score (0-1) within the collection */
  _normalizedScore: number;
  
  /** Final merged score used for sorting */
  _mergedScore: number;
  
  /** Collection weight that was applied */
  _collectionWeight: number;
}
```

### MultiCollectionSearchResponse

Response from multi-collection search.

```typescript
interface MultiCollectionSearchResponse {
  /** Merged and sorted hits from all collections */
  hits: MultiCollectionSearchHit[];
  
  /** Total number of results after merging */
  found: number;
  
  /** Number of results found per collection */
  totalFoundByCollection: Record<string, number>;
  
  /** Number of results included per collection */
  includedByCollection: Record<string, number>;
  
  /** Total search time in milliseconds */
  searchTimeMs: number;
  
  /** Individual search times per collection */
  searchTimeByCollection: Record<string, number>;
  
  /** The original query */
  query: string;
  
  /** Facets by collection (if requested) */
  facetsByCollection?: Record<string, any>;
  
  /** Any errors that occurred per collection */
  errorsByCollection?: Record<string, string>;
  
  /** Results organized by collection */
  hitsByCollection?: Record<string, MultiCollectionSearchHit[]>;
  
  /** The result mode used for this search */
  resultMode: 'interleaved' | 'perCollection' | 'both';
}
```

### UseMultiCollectionSearchReturn

Return type for useMultiCollectionSearch hook.

```typescript
interface UseMultiCollectionSearchReturn {
  /** Current state */
  state: MultiCollectionSearchState;
  
  /** Current query */
  query: string;
  
  /** Search results */
  results: MultiCollectionSearchResponse | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Perform a search */
  search: ((request: MultiCollectionSearchRequest) => Promise<void>) & 
          ((query: string, collections: CollectionSearchConfig[]) => Promise<void>);
  
  /** Set just the query (uses default collections) */
  setQuery: (query: string) => void;
  
  /** Clear results */
  clearResults: () => void;
  
  /** Update collection configuration */
  updateCollections: (collections: CollectionSearchConfig[]) => void;
  
  /** Get results for a specific collection */
  getResultsByCollection: (collection: string) => CollectionSearchResult | undefined;
  
  /** Get collection stats */
  getCollectionStats: () => Record<string, { found: number; included: number; searchTime: number }>;
}
```

## Utility Types

### Date Filter Types

#### DateRangePreset

Available date range presets.

```typescript
type DateRangePreset = 
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR';
```

#### UseDateFilterReturn

Return type for the `useDateFilter` hook.

```typescript
interface UseDateFilterReturn {
  /** Set a date range filter */
  setDateRange: (field: string, start: Date, end: Date) => void;
  /** Set a filter for the last N days */
  setLastNDays: (field: string, days: number) => void;
  /** Set a filter for the last N months */
  setLastNMonths: (field: string, months: number) => void;
  /** Set a filter for the current month */
  setCurrentMonth: (field: string) => void;
  /** Set a filter for the current year */
  setCurrentYear: (field: string) => void;
  /** Set a filter for a specific month */
  setMonth: (field: string, year: number, month: number) => void;
  /** Set a filter for dates after a specific date */
  setAfterDate: (field: string, date: Date) => void;
  /** Set a filter for dates before a specific date */
  setBeforeDate: (field: string, date: Date) => void;
  /** Apply a preset date range */
  applyPreset: (field: string, preset: DateRangePreset) => void;
  /** Clear date filter for a specific field */
  clearDateFilter: (field: string) => void;
  /** Get the current date range for a field */
  getDateRange: (field: string) => { start: Date; end: Date } | null;
  /** Check if a date filter exists for a field */
  hasDateFilter: (field: string) => boolean;
}
```

### Sort Builder Types

#### SortField

Sort field configuration.

```typescript
interface SortField {
  field: string;
  order: 'asc' | 'desc';
}
```

### Additional Filter Types

#### UseAdditionalFiltersReturn

Return type for the `useAdditionalFilters` hook.

```typescript
interface UseAdditionalFiltersReturn {
  /** Parsed filters as a Map */
  filters: Map<string, string>;
  /** Raw filter string */
  filterString: string;
  /** Set or update a filter for a specific field */
  setFilter: (field: string, filter: string) => void;
  /** Remove a filter for a specific field */
  removeFilter: (field: string) => void;
  /** Clear all additional filters */
  clearFilters: () => void;
  /** Check if a filter exists for a field */
  hasFilter: (field: string) => boolean;
  /** Get the filter expression for a field */
  getFilter: (field: string) => string | null;
  /** Replace all filters with a new filter string */
  setFilterString: (filters: string) => void;
  /** Merge new filters with existing ones */
  mergeFilters: (newFilters: string) => void;
  /** Validate a filter string */
  validateFilter: (filterString: string) => { isValid: boolean; error?: string };
}
```

## Provider Context Types

### MultiCollectionProviderProps

Props for MultiCollectionProvider component.

```typescript
interface MultiCollectionProviderProps {
  /** Child components */
  children: React.ReactNode;
  
  /** Typesense configuration or client instance */
  config: TypesenseConfig | TypesenseSearchClient;
  
  /** Default collections to search */
  defaultCollections?: CollectionSearchConfig[];
  
  /** Hook options */
  searchOptions?: UseMultiCollectionSearchOptions;
}
```

## Supporting Types

### NumericFacetRange

Configuration for numeric facet ranges.

```typescript
interface NumericFacetRange {
  /** Whether this facet is in range mode or individual selection mode */
  mode: 'individual' | 'range';
  /** Available bounds from all values */
  bounds: { min: number; max: number };
  /** Currently selected range (when in range mode) */
  currentRange?: { min: number; max: number };
}
```

### AccumulatedFacetValues

Accumulated facet values across searches.

```typescript
interface AccumulatedFacetValues {
  [field: string]: {
    values: Set<string>;
    /** Array to maintain insertion order */
    orderedValues: string[];
    /** Numeric bounds for numeric fields */
    numericBounds?: { min: number; max: number };
    lastUpdated: number;
  };
}
```

### SavedFilter

Configuration for saved filters.

```typescript
interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: {
    query?: string;
    disjunctiveFacets?: DisjunctiveFacetState;
    numericFilters?: NumericFilterState;
    dateFilters?: DateFilterState;
    selectiveFilters?: SelectiveFilterState;
    customFilters?: CustomFilterState;
  };
  createdAt: Date;
  updatedAt?: Date;
}
```

### ColumnConfig

Configuration for table column displays.

```typescript
interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}
```

## Type Guards and Utilities

The library also provides several type utilities and guards for working with these types safely:

```typescript
// Check if a value is a valid DateRangePreset
function isDateRangePreset(value: string): value is DateRangePreset {
  return Object.values(DateRangePresets).includes(value as DateRangePreset);
}

// Type guard for SearchHit
function isSearchHit<T>(value: any): value is SearchHit<T> {
  return value && typeof value === 'object' && 'document' in value;
}

// Type guard for MultiCollectionSearchHit
function isMultiCollectionHit(hit: any): hit is MultiCollectionSearchHit {
  return hit && '_collection' in hit && '_mergedScore' in hit;
}
```

## Generic Type Parameters

Many types support generic parameters for strong typing:

```typescript
// Strongly typed document schema
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

// Usage with generics
const response: TypesenseSearchResponse<Product> = await search();
const hit: SearchHit<Product> = response.hits[0];
const productName: string = hit.document.name; // Type-safe access
```