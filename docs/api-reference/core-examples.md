# Core API Examples

This document provides working examples for the core APIs, extracted from the test files.

## Table of Contents
- [TypesenseSearchClient Examples](#typesensesearchclient-examples)
- [MultiCollectionSearchClient Examples](#multicollectionsearchclient-examples)
- [searchReducer Examples](#searchreducer-examples)

---

## TypesenseSearchClient Examples

### Basic Initialization

```typescript
import { TypesenseSearchClient } from 'typesense-react';

// Initialize with configuration
const client = new TypesenseSearchClient({
  nodes: [
    {
      host: 'localhost',
      port: 8108,
      protocol: 'http',
    },
  ],
  apiKey: 'your-api-key',
});

// Initialize with custom cache settings
const clientWithCache = new TypesenseSearchClient(
  {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'your-api-key',
  },
  10 * 60 * 1000, // 10 minute cache timeout
  200 // Max 200 cache entries
);

// Initialize with existing Typesense client
import Typesense from 'typesense';
const existingClient = new Typesense.Client({...});
const wrappedClient = new TypesenseSearchClient(existingClient);
```

### Basic Search

```typescript
// Simple search
const results = await client.search('products', {
  q: 'laptop',
  query_by: 'title,description',
});

// Search with filters
const filteredResults = await client.search('products', {
  q: 'laptop',
  query_by: 'title,description',
  filter_by: 'price:[100..1000] && in_stock:true',
  sort_by: 'price:desc',
});

// Search without cache
const freshResults = await client.search('products', {
  q: 'laptop',
  query_by: 'title',
}, false); // Bypass cache
```

### Advanced Search Parameters

```typescript
const advancedResults = await client.search('products', {
  q: 'laptop',
  query_by: 'title,description,tags',
  filter_by: 'price:[100..1000] && in_stock:true',
  facet_by: 'category,brand,price',
  sort_by: '_text_match:desc,price:asc',
  max_facet_values: 100,
  facet_query: 'brand:apple',
  page: 2,
  per_page: 50,
  group_by: 'category',
  group_limit: 3,
  include_fields: 'title,price,image',
  exclude_fields: 'description,reviews',
  highlight_fields: 'title,tags',
  highlight_full_fields: 'description',
  highlight_affix_num_tokens: 4,
  highlight_start_tag: '<mark>',
  highlight_end_tag: '</mark>',
  snippet_threshold: 50,
  num_typos: 2,
  min_len_1typo: 5,
  min_len_2typo: 8,
  typo_tokens_threshold: 2,
  drop_tokens_threshold: 3,
  prefix: true,
  infix: 'always',
  pre_segmented_query: false,
  query_by_weights: '3,2,1',
  limit_hits: 200,
  search_cutoff_ms: 150,
  use_cache: true,
  cache_ttl: 120,
  prioritize_exact_match: true,
  exhaustive_search: false,
  pinned_hits: '123,456',
  hidden_hits: '789,012',
  preset: 'mobile_search',
});
```

### Multi-Search (Disjunctive Faceting)

```typescript
// Search with different filter combinations for disjunctive faceting
const searches = [
  { q: 'laptop', query_by: 'title', filter_by: 'brand:=apple' },
  { q: 'laptop', query_by: 'title', filter_by: 'brand:=dell' },
  { q: 'laptop', query_by: 'title', filter_by: 'brand:=hp' },
];

const multiResults = await client.multiSearch('products', searches);
// Returns array of results for each search
```

### Schema Retrieval

```typescript
// Get collection schema
const schema = await client.getSchema('products');
console.log('Collection fields:', schema.fields);
console.log('Default sorting:', schema.default_sorting_field);
```

### Cache Management

```typescript
// Get cache statistics
const stats = client.getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
console.log(`Cache timeout: ${stats.timeout}ms`);

// Clear cache
client.clearCache();
console.log('Cache cleared');

// Get underlying Typesense client
const underlyingClient = client.getClient();
```

### Error Handling

```typescript
try {
  await client.search('non-existent-collection', {
    q: 'test',
    query_by: 'title',
  });
} catch (error) {
  // Enhanced error with context
  console.error('Search failed:', error.message);
  console.error('Collection:', error.collection);
  console.error('Parameters:', error.params);
  console.error('Original error:', error.originalError);
}
```

---

## MultiCollectionSearchClient Examples

### Basic Multi-Collection Search

```typescript
import { MultiCollectionSearchClient } from 'typesense-react';

// Initialize
const multiClient = new MultiCollectionSearchClient(client);

// Search multiple collections
const multiResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [
    {
      collection: 'products',
      queryBy: 'name,description',
      maxResults: 10,
      weight: 1.0,
    },
    {
      collection: 'categories',
      queryBy: 'name',
      maxResults: 5,
      weight: 0.8,
    },
  ],
});

console.log('Total found:', multiResults.found);
console.log('Found by collection:', multiResults.totalFoundByCollection);
console.log('Search time by collection:', multiResults.searchTimeByCollection);
```

### Merge Strategies

```typescript
// Relevance-based merging (default)
const relevanceResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [
    { collection: 'products', weight: 1.0 },
    { collection: 'reviews', weight: 0.7 },
  ],
  mergeStrategy: 'relevance',
  normalizeScores: true, // Normalize scores across collections
});

// Round-robin merging
const roundRobinResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [
    { collection: 'products', maxResults: 10 },
    { collection: 'categories', maxResults: 10 },
  ],
  mergeStrategy: 'roundRobin',
});

// Collection order merging
const orderedResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [
    { collection: 'featured_products' },
    { collection: 'regular_products' },
  ],
  mergeStrategy: 'collectionOrder',
});
```

### Result Modes

```typescript
// Interleaved results only
const interleavedResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [{ collection: 'products' }, { collection: 'reviews' }],
  resultMode: 'interleaved',
});
console.log('Merged hits:', interleavedResults.hits);

// Per-collection results only
const perCollectionResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [{ collection: 'products' }, { collection: 'reviews' }],
  resultMode: 'perCollection',
});
console.log('Products:', perCollectionResults.hitsByCollection.products);
console.log('Reviews:', perCollectionResults.hitsByCollection.reviews);

// Both merged and per-collection
const bothResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [{ collection: 'products' }, { collection: 'reviews' }],
  resultMode: 'both',
});
console.log('Merged:', bothResults.hits);
console.log('By collection:', bothResults.hitsByCollection);
```

### Advanced Configuration

```typescript
const advancedMultiResults = await multiClient.searchMultipleCollections({
  query: 'gaming laptop',
  collections: [
    {
      collection: 'products',
      namespace: 'product', // Custom namespace for results
      queryBy: 'name,description,specs',
      sortBy: 'popularity:desc',
      filterBy: 'in_stock:true && price:<2000',
      facetBy: 'brand,price_range',
      includeFacets: true,
      maxResults: 20,
      includeFields: 'id,name,price,image',
      weight: 1.0,
    },
    {
      collection: 'reviews',
      namespace: 'review',
      queryBy: 'title,content',
      sortBy: 'rating:desc',
      filterBy: 'verified:true',
      maxResults: 10,
      excludeFields: 'user_email,internal_notes',
      weight: 0.5,
    },
  ],
  mergeStrategy: 'relevance',
  normalizeScores: true,
  globalMaxResults: 25, // Limit total results
  enableHighlighting: true,
  highlightConfig: {
    startTag: '<em>',
    endTag: '</em>',
    affixNumTokens: 10,
  },
});

// Access facets by collection
if (advancedMultiResults.facetsByCollection) {
  console.log('Product facets:', advancedMultiResults.facetsByCollection.products);
}
```

### Error Handling

```typescript
const results = await multiClient.searchMultipleCollections({
  query: 'test',
  collections: [
    { collection: 'valid_collection' },
    { collection: 'invalid_collection' },
  ],
});

// Check for errors by collection
if (results.errorsByCollection) {
  Object.entries(results.errorsByCollection).forEach(([collection, error]) => {
    console.error(`Error in ${collection}:`, error);
  });
}

// Results will still include successful collections
console.log('Successful results:', results.hits.length);
```

### Schema-Based Auto-Configuration

```typescript
// Let the client infer query fields from schema
const autoConfigResults = await multiClient.searchMultipleCollections({
  query: 'laptop',
  collections: [
    {
      collection: 'products',
      // queryBy will be inferred from schema's string fields
      // sortBy will use schema's default_sorting_field if available
    },
  ],
});

// Clear schema cache if needed
multiClient.clearSchemaCache();
```

---

## searchReducer Examples

### Basic State Management

```typescript
import { searchReducer, initialSearchState } from 'typesense-react';

// Initialize state
let state = initialSearchState;

// Set query
state = searchReducer(state, {
  type: 'SET_QUERY',
  payload: 'laptop',
});
// state.query = 'laptop', state.page = 1

// Set results
state = searchReducer(state, {
  type: 'SET_RESULTS',
  payload: {
    hits: [{ document: { id: '1', name: 'Gaming Laptop' } }],
    found: 1,
    facet_counts: [],
    search_time_ms: 10,
    page: 1,
    out_of: 1,
    request_params: {},
  },
});
// state.results = {...}, state.loading = false, state.searchPerformed = true
```

### Filter Management

```typescript
// Disjunctive facets (multi-select)
state = searchReducer(state, {
  type: 'TOGGLE_DISJUNCTIVE_FACET',
  payload: { field: 'brand', value: 'apple' },
});
// state.disjunctiveFacets = { brand: ['apple'] }

state = searchReducer(state, {
  type: 'TOGGLE_DISJUNCTIVE_FACET',
  payload: { field: 'brand', value: 'dell' },
});
// state.disjunctiveFacets = { brand: ['apple', 'dell'] }

// Numeric filters
state = searchReducer(state, {
  type: 'SET_NUMERIC_FILTER',
  payload: { field: 'price', min: 500, max: 1500 },
});
// state.numericFilters = { price: { min: 500, max: 1500 } }

// Date filters
state = searchReducer(state, {
  type: 'SET_DATE_FILTER',
  payload: { field: 'created_at', start: '2023-01-01', end: '2023-12-31' },
});
// state.dateFilters = { created_at: { start: '2023-01-01', end: '2023-12-31' } }

// Selective filters (single-select)
state = searchReducer(state, {
  type: 'SET_SELECTIVE_FILTER',
  payload: { field: 'status', value: 'in_stock' },
});
// state.selectiveFilters = { status: 'in_stock' }

// Custom filters
state = searchReducer(state, {
  type: 'SET_CUSTOM_FILTER',
  payload: { field: 'tags', values: ['gaming', 'high-performance'] },
});
// state.customFilters = { tags: ['gaming', 'high-performance'] }
```

### Clearing Filters

```typescript
// Clear specific filter
state = searchReducer(state, {
  type: 'CLEAR_FILTER',
  payload: { field: 'brand', filterType: 'disjunctive' },
});

// Clear all filters
state = searchReducer(state, {
  type: 'CLEAR_ALL_FILTERS',
});
// All filter objects reset to {}
```

### Pagination and Sorting

```typescript
// Set page
state = searchReducer(state, {
  type: 'SET_PAGE',
  payload: 2,
});

// Set items per page (resets to page 1)
state = searchReducer(state, {
  type: 'SET_PER_PAGE',
  payload: 50,
});

// Single sort
state = searchReducer(state, {
  type: 'SET_SORT_BY',
  payload: 'price:desc',
});

// Multi-field sorting
state = searchReducer(state, {
  type: 'SET_MULTI_SORT_BY',
  payload: [
    { field: 'popularity', order: 'desc' },
    { field: 'price', order: 'asc' },
  ],
});

// Add sort field
state = searchReducer(state, {
  type: 'ADD_SORT_FIELD',
  payload: { field: 'rating', order: 'desc' },
});

// Remove sort field
state = searchReducer(state, {
  type: 'REMOVE_SORT_FIELD',
  payload: 'price',
});
```

### Advanced Facet Management

```typescript
// Enable facet accumulation
state = searchReducer(state, {
  type: 'SET_ACCUMULATE_FACETS',
  payload: true,
});

// Update accumulated facet values
state = searchReducer(state, {
  type: 'UPDATE_ACCUMULATED_FACETS',
  payload: { field: 'brand', values: ['apple', 'dell', 'hp'] },
});

// Configure facet display options
state = searchReducer(state, {
  type: 'SET_MOVE_SELECTED_TO_TOP',
  payload: true,
});

state = searchReducer(state, {
  type: 'SET_REORDER_BY_COUNT',
  payload: true,
});

state = searchReducer(state, {
  type: 'SET_FACET_OPTION_LIMIT',
  payload: 100,
});

// Numeric range facets
state = searchReducer(state, {
  type: 'SET_USE_NUMERIC_RANGES',
  payload: true,
});

state = searchReducer(state, {
  type: 'SET_NUMERIC_FACET_MODE',
  payload: { field: 'price', mode: 'range' },
});

state = searchReducer(state, {
  type: 'SET_NUMERIC_FACET_RANGE',
  payload: { field: 'price', min: 100, max: 1000 },
});

state = searchReducer(state, {
  type: 'UPDATE_NUMERIC_FACET_BOUNDS',
  payload: { field: 'price', min: 0, max: 5000 },
});
```

### Batch Updates

```typescript
// Update multiple fields at once
state = searchReducer(state, {
  type: 'BATCH_UPDATE',
  payload: {
    query: 'gaming laptop',
    disjunctiveFacets: { brand: ['asus', 'msi'] },
    numericFilters: { price: { min: 1000, max: 2000 } },
    sortBy: 'popularity:desc',
    perPage: 25,
  },
});
// Page automatically resets to 1 due to filter changes
```

### Reset and Initial State

```typescript
// Reset search (preserves configuration)
state = searchReducer(state, {
  type: 'RESET_SEARCH',
});
// Query, results, filters cleared; facets, schema, config preserved

// Create initial state with overrides
import { createInitialState } from 'typesense-react';

const customInitialState = createInitialState({
  query: 'initial query',
  perPage: 50,
  facets: ['brand', 'category', 'price'],
  accumulateFacets: true,
  facetOptionLimit: 100,
});
```

### Error Handling

```typescript
// Set loading state
state = searchReducer(state, {
  type: 'SET_LOADING',
  payload: true,
});

// Handle search error
state = searchReducer(state, {
  type: 'SET_ERROR',
  payload: 'Search failed: Network error',
});
// state.error = 'Search failed: Network error', state.loading = false
```

### Schema Management

```typescript
// Set collection schema
state = searchReducer(state, {
  type: 'SET_SCHEMA',
  payload: {
    name: 'products',
    fields: [
      { name: 'name', type: 'string' },
      { name: 'price', type: 'float' },
      { name: 'brand', type: 'string', facet: true },
    ],
    default_sorting_field: 'popularity',
  },
});
```

### Additional Filters

```typescript
// Set additional filter string
state = searchReducer(state, {
  type: 'SET_ADDITIONAL_FILTERS',
  payload: 'store_id:=123 && available_online:true',
});
```

## Complete Example: Search Implementation

```typescript
import { TypesenseSearchClient, searchReducer, initialSearchState } from 'typesense-react';

// Initialize
const client = new TypesenseSearchClient({
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'your-api-key',
});

let state = initialSearchState;

// User types in search box
state = searchReducer(state, {
  type: 'SET_QUERY',
  payload: 'gaming laptop',
});

// User selects filters
state = searchReducer(state, {
  type: 'TOGGLE_DISJUNCTIVE_FACET',
  payload: { field: 'brand', value: 'asus' },
});

state = searchReducer(state, {
  type: 'SET_NUMERIC_FILTER',
  payload: { field: 'price', min: 1000, max: 2000 },
});

// Build search parameters from state
const searchParams = {
  q: state.query,
  query_by: 'name,description',
  filter_by: [
    // Build filters from state
    ...Object.entries(state.disjunctiveFacets).map(([field, values]) =>
      `${field}:[${values.join(',')}]`
    ),
    ...Object.entries(state.numericFilters).map(([field, range]) =>
      `${field}:[${range.min}..${range.max}]`
    ),
  ].join(' && '),
  sort_by: state.sortBy || '_text_match:desc',
  page: state.page,
  per_page: state.perPage,
};

// Perform search
state = searchReducer(state, { type: 'SET_LOADING', payload: true });

try {
  const results = await client.search('products', searchParams);
  state = searchReducer(state, {
    type: 'SET_RESULTS',
    payload: results,
  });
} catch (error) {
  state = searchReducer(state, {
    type: 'SET_ERROR',
    payload: error.message,
  });
}
```