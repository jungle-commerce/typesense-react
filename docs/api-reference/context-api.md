# Typesense React Context API Guide

This guide covers how to access and use the context values provided by the typesense-react providers.

## Table of Contents
1. [SearchContext API](#searchcontext-api)
2. [MultiCollectionContext API](#multicollectioncontext-api)
3. [State Management with Dispatch](#state-management-with-dispatch)
4. [Best Practices](#best-practices)

## SearchContext API

### Accessing the Context

The SearchContext is accessed using the `useSearchContext` hook:

```tsx
import { useSearchContext } from 'typesense-react';

function MyComponent() {
  const context = useSearchContext();
  // Use context values
}
```

**Important**: This hook must be used within a SearchProvider. It will throw an error if used outside.

### Context Structure

```typescript
interface SearchContextValue {
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  client: TypesenseSearchClient;
  collection: string;
  initialSearchParams?: Partial<SearchRequest>;
  config: {
    searchOnMount: boolean;
    performanceMode: boolean;
    enableDisjunctiveFacetQueries: boolean;
  };
}
```

### State Properties

The `state` object contains all search-related data:

```typescript
interface SearchState {
  // Core search properties
  query: string;
  results: TypesenseSearchResponse | null;
  loading: boolean;
  error: Error | null;
  
  // Pagination
  page: number;
  perPage: number;
  
  // Sorting
  sortBy: string;
  multiSortBy?: Array<{ field: string; order: 'asc' | 'desc' }>;
  
  // Filters
  disjunctiveFacets: DisjunctiveFacetState;
  numericFilters: NumericFilterState;
  dateFilters: DateFilterState;
  selectiveFilters: SelectiveFilterState;
  customFilters: CustomFilterState;
  additionalFilters?: string;
  
  // Facets
  facets: FacetConfig[];
  accumulatedFacetValues: AccumulatedFacetValues;
  accumulateFacets: boolean;
  
  // Schema
  schema: CollectionSchema | null;
  
  // Search metadata
  searchPerformed: boolean;
  lastSearchAt?: number;
  
  // Facet behavior configuration
  moveSelectedToTop: boolean;
  reorderByCount: boolean;
  useNumericRanges: boolean;
  numericFacetRanges: NumericFacetRangesState;
  facetOptionLimit: number;
  hideZeroCountsForSingleSelect: boolean;
  allowNumericRangeForSingleSelect: boolean;
}
```

### Accessing State Values

```tsx
function SearchResults() {
  const { state } = useSearchContext();
  
  // Access search results
  if (state.loading) {
    return <div>Loading...</div>;
  }
  
  if (state.error) {
    return <div>Error: {state.error.message}</div>;
  }
  
  if (!state.results) {
    return <div>No results yet</div>;
  }
  
  return (
    <div>
      <p>Found {state.results.found} results</p>
      <p>Current query: {state.query}</p>
      <p>Page {state.page} of {Math.ceil(state.results.found / state.perPage)}</p>
      
      {state.results.hits?.map(hit => (
        <div key={hit.document.id}>
          {hit.document.name}
        </div>
      ))}
    </div>
  );
}
```

### Using the Client

Access the Typesense client directly for custom operations:

```tsx
function CustomSearch() {
  const { client, collection } = useSearchContext();
  
  const performCustomSearch = async () => {
    // Direct client usage
    const results = await client.search(collection, {
      q: 'custom query',
      query_by: 'name',
      filter_by: 'price:>100'
    });
    
    console.log(results);
  };
  
  return <button onClick={performCustomSearch}>Custom Search</button>;
}
```

### Accessing Configuration

```tsx
function SearchBehavior() {
  const { config, initialSearchParams } = useSearchContext();
  
  console.log('Search on mount:', config.searchOnMount);
  console.log('Performance mode:', config.performanceMode);
  console.log('Disjunctive facets:', config.enableDisjunctiveFacetQueries);
  console.log('Initial params:', initialSearchParams);
  
  return <div>...</div>;
}
```

## MultiCollectionContext API

### Accessing the Context

```tsx
import { useMultiCollectionContext } from 'typesense-react';

function MultiSearchComponent() {
  const context = useMultiCollectionContext();
  // Use context values
}
```

### Context Structure

```typescript
interface MultiCollectionContextValue {
  // State
  state: MultiCollectionSearchState;
  query: string;
  results: MultiCollectionSearchResponse | null;
  loading: boolean;
  error: Error | null;
  
  // Actions
  search: (request: MultiCollectionSearchRequest) => Promise<void>;
  setQuery: (query: string) => void;
  clearResults: () => void;
  updateCollections: (collections: CollectionSearchConfig[]) => void;
  
  // Utilities
  getResultsByCollection: (collection: string) => CollectionSearchResult | undefined;
  getCollectionStats: () => Record<string, { found: number; included: number; searchTime: number }>;
  
  // Client
  client: TypesenseSearchClient;
}
```

### Performing Multi-Collection Search

```tsx
function GlobalSearch() {
  const { search, loading, results } = useMultiCollectionContext();
  
  const handleSearch = async (query: string) => {
    await search({
      query,
      collections: [
        {
          collection: 'products',
          queryBy: 'name,description',
          maxResults: 10,
          weight: 2.0
        },
        {
          collection: 'categories',
          queryBy: 'name',
          maxResults: 5,
          weight: 1.5
        }
      ],
      mergeStrategy: 'relevance',
      normalizeScores: true,
      resultMode: 'interleaved'
    });
  };
  
  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {loading && <div>Searching...</div>}
      {results && (
        <div>
          Found {results.found} total results
          {results.hits.map(hit => (
            <div key={hit.document.id}>
              {hit._collection}: {hit.document.name}
              (Score: {hit._mergedScore.toFixed(2)})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Getting Collection-Specific Results

```tsx
function CollectionResults() {
  const { getResultsByCollection, getCollectionStats } = useMultiCollectionContext();
  
  // Get results for specific collection
  const productResults = getResultsByCollection('products');
  
  // Get statistics for all collections
  const stats = getCollectionStats();
  
  return (
    <div>
      <h3>Collection Statistics</h3>
      {Object.entries(stats).map(([collection, stat]) => (
        <div key={collection}>
          {collection}: Found {stat.found}, Included {stat.included}, 
          Time: {stat.searchTime}ms
        </div>
      ))}
    </div>
  );
}
```

## State Management with Dispatch

### Available Actions

The dispatch function accepts various action types for state updates:

```typescript
type SearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_RESULTS'; payload: TypesenseSearchResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PER_PAGE'; payload: number }
  | { type: 'SET_SORT_BY'; payload: string }
  | { type: 'TOGGLE_DISJUNCTIVE_FACET'; payload: { field: string; value: string } }
  | { type: 'SET_NUMERIC_FILTER'; payload: { field: string; min?: number; max?: number } }
  | { type: 'SET_DATE_FILTER'; payload: { field: string; start?: Date | string; end?: Date | string } }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'RESET_SEARCH' }
  | { type: 'BATCH_UPDATE'; payload: Partial<SearchState> }
  // ... and many more
```

### Common Dispatch Patterns

#### Updating Query

```tsx
function SearchInput() {
  const { dispatch } = useSearchContext();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_QUERY', payload: e.target.value });
  };
  
  return <input onChange={handleChange} />;
}
```

#### Managing Filters

```tsx
function FilterControls() {
  const { dispatch, state } = useSearchContext();
  
  // Toggle facet value
  const toggleFacet = (field: string, value: string) => {
    dispatch({ 
      type: 'TOGGLE_DISJUNCTIVE_FACET', 
      payload: { field, value } 
    });
  };
  
  // Set numeric range
  const setNumericRange = (field: string, min: number, max: number) => {
    dispatch({ 
      type: 'SET_NUMERIC_FILTER', 
      payload: { field, min, max } 
    });
  };
  
  // Set date range
  const setDateRange = (field: string, start: Date, end: Date) => {
    dispatch({ 
      type: 'SET_DATE_FILTER', 
      payload: { field, start, end } 
    });
  };
  
  // Clear all filters
  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
  };
  
  return (
    <div>
      {/* Filter UI */}
    </div>
  );
}
```

#### Pagination

```tsx
function Pagination() {
  const { dispatch, state } = useSearchContext();
  
  const totalPages = Math.ceil((state.results?.found || 0) / state.perPage);
  
  const goToPage = (page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  };
  
  const changePageSize = (size: number) => {
    dispatch({ type: 'SET_PER_PAGE', payload: size });
  };
  
  return (
    <div>
      <select onChange={(e) => changePageSize(Number(e.target.value))}>
        <option value="10">10 per page</option>
        <option value="20">20 per page</option>
        <option value="50">50 per page</option>
      </select>
      
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i} onClick={() => goToPage(i + 1)}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}
```

#### Batch Updates

```tsx
function BulkStateUpdate() {
  const { dispatch } = useSearchContext();
  
  const applyPreset = () => {
    dispatch({
      type: 'BATCH_UPDATE',
      payload: {
        query: 'electronics',
        sortBy: 'price:asc',
        perPage: 50,
        page: 1,
        disjunctiveFacets: {
          category: ['laptops', 'phones']
        }
      }
    });
  };
  
  return <button onClick={applyPreset}>Apply Electronics Preset</button>;
}
```

### Advanced State Management

#### Managing Numeric Facet Ranges

```tsx
function NumericFacetControl() {
  const { dispatch, state } = useSearchContext();
  
  // Set facet to range mode
  const enableRangeMode = (field: string) => {
    dispatch({
      type: 'SET_NUMERIC_FACET_MODE',
      payload: { field, mode: 'range' }
    });
  };
  
  // Update bounds
  const updateBounds = (field: string, min: number, max: number) => {
    dispatch({
      type: 'UPDATE_NUMERIC_FACET_BOUNDS',
      payload: { field, min, max }
    });
  };
  
  // Set current range
  const setRange = (field: string, min: number, max: number) => {
    dispatch({
      type: 'SET_NUMERIC_FACET_RANGE',
      payload: { field, min, max }
    });
  };
  
  return <div>...</div>;
}
```

#### Multi-Sort Management

```tsx
function MultiSortControl() {
  const { dispatch, state } = useSearchContext();
  
  // Add sort field
  const addSort = (field: string, order: 'asc' | 'desc') => {
    dispatch({
      type: 'ADD_SORT_FIELD',
      payload: { field, order }
    });
  };
  
  // Remove sort field
  const removeSort = (field: string) => {
    dispatch({
      type: 'REMOVE_SORT_FIELD',
      payload: field
    });
  };
  
  // Clear all sorts
  const clearSorts = () => {
    dispatch({ type: 'CLEAR_MULTI_SORT' });
  };
  
  return (
    <div>
      Current sorts: {state.multiSortBy?.map(s => `${s.field}:${s.order}`).join(', ')}
    </div>
  );
}
```

## Best Practices

### 1. Error Handling

Always wrap context usage in error boundaries:

```tsx
function SafeSearchComponent() {
  try {
    const { state } = useSearchContext();
    return <div>{/* Component content */}</div>;
  } catch (error) {
    return <div>This component must be used within a SearchProvider</div>;
  }
}
```

### 2. Performance Optimization

Memoize expensive computations:

```tsx
function OptimizedResults() {
  const { state } = useSearchContext();
  
  const processedResults = useMemo(() => {
    if (!state.results?.hits) return [];
    
    return state.results.hits.map(hit => ({
      ...hit,
      formattedPrice: formatCurrency(hit.document.price),
      categoryPath: buildCategoryPath(hit.document.category)
    }));
  }, [state.results]);
  
  return <div>...</div>;
}
```

### 3. Selective Context Usage

Only subscribe to needed context values:

```tsx
function QueryDisplay() {
  const { state } = useSearchContext();
  // Only uses state.query, won't re-render on other state changes
  
  return <div>Current search: {state.query}</div>;
}
```

### 4. Custom Hooks

Create custom hooks for common patterns:

```tsx
function useSearchResults() {
  const { state } = useSearchContext();
  
  return {
    results: state.results?.hits || [],
    totalFound: state.results?.found || 0,
    isLoading: state.loading,
    error: state.error,
    hasSearched: state.searchPerformed
  };
}

function ResultsList() {
  const { results, totalFound, isLoading } = useSearchResults();
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Found {totalFound} results</div>;
}
```

### 5. Type Safety

Always type your component props when passing context values:

```tsx
interface SearchResultProps {
  hit: SearchHit<ProductDocument>;
  isSelected: boolean;
}

function SearchResult({ hit, isSelected }: SearchResultProps) {
  return <div>...</div>;
}
```

### 6. Testing

Mock the context for testing:

```tsx
const mockContextValue: SearchContextValue = {
  state: {
    query: 'test',
    results: null,
    loading: false,
    error: null,
    // ... other state properties
  },
  dispatch: vi.fn(),
  client: mockClient,
  collection: 'test-collection',
  config: {
    searchOnMount: false,
    performanceMode: false,
    enableDisjunctiveFacetQueries: true
  }
};

const wrapper = ({ children }) => (
  <SearchContext.Provider value={mockContextValue}>
    {children}
  </SearchContext.Provider>
);
```