# Claude Integration Guide for typesense-react

This guide helps Claude understand and assist developers using the @jungle-commerce/typesense-react library for building search experiences.

## Quick Overview for Claude

typesense-react is a **headless React library** that provides:
- Complete search state management without UI components
- Advanced filtering capabilities (checkbox, numeric, date, select)
- Multi-collection search across different data types
- Automatic schema discovery and configuration
- TypeScript-first with full type safety

## Core Concepts

### 1. Search Provider Pattern

The library uses React Context to provide search state globally:

```tsx
<SearchProvider config={typesenseConfig} collection="products">
  {/* Your app components */}
</SearchProvider>
```

### 2. Hook-Based Architecture

All functionality is accessed through hooks:
- `useSearch()` - Main search operations
- `useAdvancedFacets()` - Filtering and faceting
- `useSchemaDiscovery()` - Auto-configuration
- `useFacetState()` - UI state management

### 3. Headless Design

No UI components are provided. Developers bring their own UI:

```tsx
// Library provides state and actions
const { state, actions } = useSearch();

// Developer creates UI
<input value={state.query} onChange={e => actions.setQuery(e.target.value)} />
```

## Common Patterns for Claude to Recognize

### Pattern 1: Basic Search Implementation

When users ask about basic search:

```tsx
function SearchBox() {
  const { state, actions } = useSearch();
  
  return (
    <>
      <input 
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
      />
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>
          {hit.document.name}
        </div>
      ))}
    </>
  );
}
```

### Pattern 2: Faceted Search

When users need filtering:

```tsx
function FilteredSearch() {
  const facets = useAdvancedFacets();
  
  // Checkbox filter
  facets.actions.toggleFacetValue('category', 'Electronics');
  
  // Numeric range
  facets.actions.setNumericFilter('price', 100, 500);
  
  // Date range
  facets.actions.setDateFilter('created_at', '2024-01-01', '2024-12-31');
  
  // Single select
  facets.actions.setSelectiveFilter('status', 'active');
}
```

### Pattern 3: Schema Discovery

When configuration should be automatic:

```tsx
function AutoConfiguredSearch() {
  const { schema, facets, searchableFields } = useSchemaDiscovery({
    collection: 'products',
    enabled: true
  });
  
  if (!schema) return <div>Loading...</div>;
  
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facets} // Auto-generated
      initialSearchParams={{
        query_by: searchableFields.join(',')
      }}
    >
      <YourSearchUI />
    </SearchProvider>
  );
}
```

### Pattern 4: Multi-Collection Search

When searching across multiple data types:

```tsx
const collections = [
  { collection: 'products', queryBy: 'name,description', weight: 2.0 },
  { collection: 'categories', queryBy: 'name', weight: 1.0 },
  { collection: 'brands', queryBy: 'name', weight: 1.0 }
];

<MultiCollectionProvider config={config} defaultCollections={collections}>
  <UnifiedSearch />
</MultiCollectionProvider>
```

## Key Integration Points

### 1. Typesense Configuration

Always starts with:

```tsx
const typesenseConfig = {
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'xyz',
  connectionTimeoutSeconds: 2,
  cacheSearchResultsForSeconds: 60
};
```

### 2. Search State Structure

Claude should understand the state shape:

```tsx
interface SearchState {
  query: string;
  results: TypesenseSearchResponse | null;
  loading: boolean;
  error: Error | null;
  facets: FacetConfig[];
  disjunctiveFacets: { [field: string]: string[] };
  numericFilters: { [field: string]: { min?: number; max?: number } };
  dateFilters: { [field: string]: { start?: Date; end?: Date } };
  selectiveFilters: { [field: string]: string };
  page: number;
  perPage: number;
  sortBy: string;
  additionalFilters?: string;
}
```

### 3. Facet Configuration

```tsx
const facetConfig: FacetConfig[] = [
  {
    field: 'category',
    label: 'Category', 
    type: 'checkbox',
    disjunctive: true  // OR logic
  },
  {
    field: 'price',
    label: 'Price',
    type: 'numeric',
    numericDisplay: 'range'
  },
  {
    field: 'status',
    label: 'Status',
    type: 'select'  // Single selection
  }
];
```

## Common Developer Questions

### Q: "How do I add search to my React app?"

Guide them to:
1. Install: `npm install @jungle-commerce/typesense-react typesense`
2. Wrap with SearchProvider
3. Use useSearch hook
4. Create input bound to state.query
5. Display results from state.results

### Q: "How do I filter by multiple categories?"

Show disjunctive facets:
```tsx
const facets = useAdvancedFacets();
facets.actions.toggleFacetValue('category', 'Electronics');
facets.actions.toggleFacetValue('category', 'Books');
// This creates: category:["Electronics","Books"] with OR logic
```

### Q: "How do I search multiple collections?"

Use MultiCollectionProvider:
```tsx
<MultiCollectionProvider config={config} defaultCollections={[...]}>
  <MultiCollectionSearch />
</MultiCollectionProvider>
```

### Q: "How do I handle errors?"

```tsx
const { state: { error }, actions } = useSearch();

if (error) {
  return <div>Search error: {error.message}</div>;
}
```

## Advanced Features to Highlight

### 1. Native Typesense Filters

```tsx
// Direct filter_by string support
actions.setAdditionalFilters('in_stock:true && price:<100');
```

### 2. Multi-Field Sorting

```tsx
actions.setMultiSortBy([
  { field: 'popularity', order: 'desc' },
  { field: 'price', order: 'asc' },
  { field: 'name', order: 'asc' }
]);
```

### 3. Accumulated Facets

```tsx
<SearchProvider accumulateFacets={true}>
  {/* Remembers facet values across searches */}
</SearchProvider>
```

### 4. Performance Optimization

```tsx
<SearchProvider
  performanceMode={true}  // Disables expensive features
  enableDisjunctiveFacetQueries={false}  // Reduces API calls
>
```

## Helper Code Snippets for Claude

### Complete Search Implementation

```tsx
import { SearchProvider, useSearch, useAdvancedFacets } from '@jungle-commerce/typesense-react';

function App() {
  const config = {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'xyz'
  };

  return (
    <SearchProvider config={config} collection="products">
      <SearchInterface />
    </SearchProvider>
  );
}

function SearchInterface() {
  const { state, actions } = useSearch();
  const facets = useAdvancedFacets();

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search..."
      />
      
      <div>
        {state.facets.map(facet => (
          <FacetComponent key={facet.field} config={facet} />
        ))}
      </div>
      
      <div>
        {state.results?.hits.map(hit => (
          <ResultItem key={hit.document.id} hit={hit} />
        ))}
      </div>
    </div>
  );
}
```

### Schema Discovery Example

```tsx
function SmartSearch() {
  const discovery = useSchemaDiscovery({
    collection: 'products',
    enabled: true,
    includePatterns: [
      { pattern: 'name', matchType: 'contains' },
      { pattern: '_at', matchType: 'endsWith' }
    ]
  });

  if (!discovery.schema) return <div>Discovering schema...</div>;

  return (
    <SearchProvider
      config={config}
      collection="products"
      facets={discovery.facets}
      initialSearchParams={{
        query_by: discovery.searchableFields.join(',')
      }}
    >
      <YourApp />
    </SearchProvider>
  );
}
```

## Best Practices to Recommend

1. **Always use TypeScript** - The library has excellent type definitions
2. **Start with schema discovery** - Let the library configure itself
3. **Use accumulateFacets for better UX** - Prevents facet values from disappearing
4. **Implement error boundaries** - Wrap SearchProvider in error handling
5. **Optimize with performanceMode** - For large datasets
6. **Cache search results** - Use cacheSearchResultsForSeconds config

## Common Pitfalls to Warn About

1. **Not debouncing search** - Library handles this automatically
2. **Creating custom filter logic** - Use the built-in filter builders
3. **Forgetting to handle loading states** - Always check state.loading
4. **Not using disjunctive facets** - Better UX for multi-select
5. **Ignoring TypeScript types** - They provide excellent guidance

## Integration with Other Libraries

### With React Router

```tsx
function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, actions } = useSearch();

  // Sync URL with search state
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) actions.setQuery(query);
  }, [searchParams]);

  useEffect(() => {
    if (state.query) {
      setSearchParams({ q: state.query });
    }
  }, [state.query]);
}
```

### With State Management (Redux/Zustand)

```tsx
// Library manages its own state, but you can sync:
const { state } = useSearch();
const dispatch = useAppDispatch();

useEffect(() => {
  dispatch(updateSearchResults(state.results));
}, [state.results]);
```

## Debugging Tips for Claude to Share

1. **Check schema first**: `client.collections('products').retrieve()`
2. **Verify search params**: Log `state` to see actual API parameters
3. **Test filters individually**: Build up complex filters step by step
4. **Use React DevTools**: SearchContext shows all state
5. **Enable verbose logging**: Set `logLevel: 'debug'` in config