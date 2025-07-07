# Typesense React Providers Guide

This guide provides comprehensive documentation for the providers available in the typesense-react library.

## Table of Contents
1. [SearchProvider](#searchprovider)
2. [MultiCollectionProvider](#multicollectionprovider)
3. [Provider Nesting Patterns](#provider-nesting-patterns)
4. [Advanced Configuration](#advanced-configuration)

## SearchProvider

The `SearchProvider` is the core provider that manages search state and provides it to child components via React Context.

### Basic Setup

```tsx
import { SearchProvider } from 'typesense-react';

function App() {
  return (
    <SearchProvider
      config={{
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'your-api-key'
      }}
      collection="products"
    >
      {/* Your app components */}
    </SearchProvider>
  );
}
```

### Props Reference

#### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `TypesenseConfig` | Typesense client configuration |
| `collection` | `string` | The collection name to search |
| `children` | `ReactNode` | Child components |

#### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialState` | `Partial<SearchState>` | `{}` | Initial search state values |
| `initialSearchParams` | `Partial<SearchRequest>` | `undefined` | Initial search parameters |
| `facets` | `FacetConfig[]` | `[]` | Facet configurations |
| `searchOnMount` | `boolean` | `false` | Whether to perform search on mount |
| `onStateChange` | `(state: SearchState) => void` | `undefined` | Callback when state changes |
| `performanceMode` | `boolean` | `false` | Enable performance optimizations |
| `enableDisjunctiveFacetQueries` | `boolean` | `true` | Enable OR logic for facets |
| `accumulateFacets` | `boolean` | `false` | Accumulate facet values across searches |

### TypesenseConfig Structure

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

### Initial State Configuration

You can provide initial state values to customize the search behavior:

```tsx
<SearchProvider
  config={config}
  collection="products"
  initialState={{
    query: 'initial search',
    page: 1,
    perPage: 20,
    sortBy: 'price:asc',
    schema: collectionSchema,
    facetOptionLimit: 100,
    moveSelectedToTop: true,
    reorderByCount: false,
    useNumericRanges: true,
    hideZeroCountsForSingleSelect: true,
    allowNumericRangeForSingleSelect: true
  }}
>
```

### Facet Configuration

Define facets with rich configuration options:

```tsx
const facets: FacetConfig[] = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 10,
    searchable: true,
    expanded: true,
    sortBy: 'count'
  },
  {
    field: 'price',
    label: 'Price',
    type: 'numeric',
    numericDisplay: 'range',
    rangeStep: 10
  },
  {
    field: 'created_at',
    label: 'Date Created',
    type: 'date',
    dateFormat: 'yyyy-MM-dd'
  }
];

<SearchProvider
  config={config}
  collection="products"
  facets={facets}
>
```

### Context Value Structure

The SearchProvider provides the following context value:

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

### Accessing Context

Use the `useSearchContext` hook to access the search context:

```tsx
import { useSearchContext } from 'typesense-react';

function SearchComponent() {
  const { state, dispatch, client, collection } = useSearchContext();
  
  // Access search state
  console.log(state.query, state.results);
  
  // Dispatch actions
  dispatch({ type: 'SET_QUERY', payload: 'new search' });
  
  return <div>...</div>;
}
```

## MultiCollectionProvider

The `MultiCollectionProvider` enables searching across multiple Typesense collections with result merging and relevance scoring.

### Basic Setup

```tsx
import { MultiCollectionProvider } from 'typesense-react';

function App() {
  return (
    <MultiCollectionProvider
      config={{
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'your-api-key'
      }}
      defaultCollections={[
        {
          collection: 'products',
          queryBy: 'name,description',
          maxResults: 10,
          weight: 1.0
        },
        {
          collection: 'categories',
          queryBy: 'name',
          maxResults: 5,
          weight: 0.8
        }
      ]}
    >
      {/* Your app components */}
    </MultiCollectionProvider>
  );
}
```

### Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `config` | `TypesenseConfig \| TypesenseSearchClient` | Typesense configuration or client instance |
| `children` | `ReactNode` | Child components |
| `defaultCollections` | `CollectionSearchConfig[]` | Default collections to search |
| `searchOptions` | `UseMultiCollectionSearchOptions` | Search behavior options |

### CollectionSearchConfig Structure

```typescript
interface CollectionSearchConfig {
  collection: string;
  namespace?: string;
  queryBy?: string;
  sortBy?: string;
  maxResults?: number;
  weight?: number;
  filterBy?: string;
  includeFacets?: boolean;
  facetBy?: string;
  includeFields?: string;
  excludeFields?: string;
}
```

### Search Options

```typescript
interface UseMultiCollectionSearchOptions {
  defaultCollections?: CollectionSearchConfig[];
  defaultMergeStrategy?: 'relevance' | 'roundRobin' | 'collectionOrder';
  searchOnMount?: boolean;
  debounceMs?: number;
  onSearchComplete?: (response: MultiCollectionSearchResponse) => void;
  onSearchError?: (error: Error) => void;
}
```

### Using Existing Client

You can pass an existing TypesenseSearchClient instance:

```tsx
const client = new TypesenseSearchClient(config);

<MultiCollectionProvider config={client}>
  {/* Your app */}
</MultiCollectionProvider>
```

### Context Value

The MultiCollectionProvider provides:

```typescript
interface MultiCollectionContextValue {
  state: MultiCollectionSearchState;
  query: string;
  results: MultiCollectionSearchResponse | null;
  loading: boolean;
  error: Error | null;
  search: (request: MultiCollectionSearchRequest) => Promise<void>;
  setQuery: (query: string) => void;
  clearResults: () => void;
  updateCollections: (collections: CollectionSearchConfig[]) => void;
  getResultsByCollection: (collection: string) => CollectionSearchResult | undefined;
  getCollectionStats: () => Record<string, { found: number; included: number; searchTime: number }>;
  client: TypesenseSearchClient;
}
```

### Accessing Context

```tsx
import { useMultiCollectionContext } from 'typesense-react';

function MultiSearchComponent() {
  const { search, results, loading, error } = useMultiCollectionContext();
  
  const handleSearch = async () => {
    await search({
      query: 'search term',
      collections: [
        { collection: 'products', queryBy: 'name,description' },
        { collection: 'categories', queryBy: 'name' }
      ],
      mergeStrategy: 'relevance',
      normalizeScores: true
    });
  };
  
  return <div>...</div>;
}
```

## Provider Nesting Patterns

### Multiple Independent Search Contexts

You can nest multiple SearchProviders for different collections:

```tsx
<SearchProvider config={config} collection="products">
  <ProductSearch />
  
  <SearchProvider config={config} collection="categories">
    <CategorySearch />
  </SearchProvider>
</SearchProvider>
```

### Multi-Collection with Individual Search

Combine MultiCollectionProvider with SearchProvider:

```tsx
<MultiCollectionProvider config={config}>
  <GlobalSearch />
  
  <SearchProvider config={config} collection="products">
    <DetailedProductSearch />
  </SearchProvider>
</MultiCollectionProvider>
```

### Shared Configuration

Create a shared configuration for consistency:

```tsx
const sharedConfig = {
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'your-api-key',
  cacheSearchResultsForSeconds: 300
};

function App() {
  return (
    <>
      <SearchProvider config={sharedConfig} collection="products">
        <ProductsSection />
      </SearchProvider>
      
      <MultiCollectionProvider config={sharedConfig}>
        <GlobalSearchSection />
      </MultiCollectionProvider>
    </>
  );
}
```

## Advanced Configuration

### Performance Optimization

Enable performance mode for large datasets:

```tsx
<SearchProvider
  config={config}
  collection="products"
  performanceMode={true}
  initialState={{
    perPage: 50,
    facetOptionLimit: 50
  }}
>
```

### Cache Configuration

Configure result caching:

```tsx
const config = {
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'your-api-key',
  cacheSearchResultsForSeconds: 600 // 10 minutes
};
```

### State Change Monitoring

Monitor state changes for analytics or debugging:

```tsx
<SearchProvider
  config={config}
  collection="products"
  onStateChange={(state) => {
    console.log('Search state updated:', state);
    // Send to analytics
    analytics.track('search_state_change', {
      query: state.query,
      resultsCount: state.results?.found,
      page: state.page
    });
  }}
>
```

### Dynamic Collection Configuration

Update collections dynamically in MultiCollectionProvider:

```tsx
function DynamicMultiSearch() {
  const { updateCollections } = useMultiCollectionContext();
  
  const addCollection = () => {
    updateCollections([
      { collection: 'products', queryBy: 'name' },
      { collection: 'categories', queryBy: 'name' },
      { collection: 'brands', queryBy: 'name' } // New collection
    ]);
  };
  
  return <button onClick={addCollection}>Add Brands</button>;
}
```

### Error Handling

Both providers handle errors internally, but you can add additional error handling:

```tsx
<MultiCollectionProvider
  config={config}
  searchOptions={{
    onSearchError: (error) => {
      console.error('Search failed:', error);
      // Show user notification
      showErrorNotification(error.message);
    }
  }}
>
```

## Best Practices

1. **Provider Placement**: Place providers as high in the component tree as needed, but not higher than necessary to avoid unnecessary re-renders.

2. **Configuration Reuse**: Create a shared configuration object for consistency across providers.

3. **Performance Considerations**: 
   - Enable `performanceMode` for large datasets
   - Configure appropriate cache timeouts
   - Use `accumulateFacets` judiciously as it increases memory usage

4. **State Management**: Use the provided dispatch actions instead of directly modifying state.

5. **Error Boundaries**: Wrap providers with error boundaries for production applications.

6. **Testing**: Both providers can be easily mocked for testing by providing mock clients or configurations.