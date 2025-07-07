# Provider Examples for typesense-react

This guide provides comprehensive examples of using the SearchProvider and MultiCollectionProvider components in typesense-react, with real-world configurations and patterns.

## Table of Contents

1. [Basic SearchProvider Setup](#basic-searchprovider-setup)
2. [Advanced SearchProvider Configurations](#advanced-searchprovider-configurations)
3. [MultiCollectionProvider Examples](#multicollectionprovider-examples)
4. [Provider Composition Patterns](#provider-composition-patterns)
5. [Real Configuration Examples](#real-configuration-examples)

## Basic SearchProvider Setup

### Minimal Configuration

The simplest way to set up SearchProvider with just the required props:

```tsx
import React from 'react';
import { SearchProvider } from '@jungle-commerce/typesense-react';

const App = () => {
  const typesenseConfig = {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'xyz123'
  };

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
    >
      <YourSearchInterface />
    </SearchProvider>
  );
};
```

### Basic Search with Facets

Adding facet configuration for filtering:

```tsx
import { SearchProvider, type FacetConfig } from '@jungle-commerce/typesense-react';

const facetConfig: FacetConfig[] = [
  { field: 'category', label: 'Category', type: 'checkbox' },
  { field: 'brand', label: 'Brand', type: 'checkbox' },
  { field: 'price', label: 'Price', type: 'numeric' }
];

function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfig}
      searchOnMount={true}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### With Initial State

Setting up SearchProvider with predefined search state:

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  initialState={{
    query: 'laptop',
    page: 1,
    perPage: 24,
    sortBy: 'price:asc',
    filters: {
      category: ['Electronics'],
      brand: ['Apple', 'Dell']
    }
  }}
  facets={facetConfig}
>
  <SearchInterface />
</SearchProvider>
```

## Advanced SearchProvider Configurations

### Performance Optimization

Configuring SearchProvider for optimal performance:

```tsx
<SearchProvider
  config={{
    ...typesenseConfig,
    cacheSearchResultsForSeconds: 60, // Cache results for 1 minute
    connectionTimeoutSeconds: 10,
    retryIntervalSeconds: 0.1,
    numRetries: 3
  }}
  collection="products"
  performanceMode={true} // Enable performance optimizations
  enableDisjunctiveFacetQueries={true} // Enable smart facet queries
  accumulateFacets={true} // Keep facet values across searches
>
  <HighPerformanceSearch />
</SearchProvider>
```

### With Initial Search Parameters

Setting up Typesense-specific search parameters:

```tsx
const initialSearchParams = {
  query_by: 'name,description,tags',
  query_by_weights: '3,2,1',
  sort_by: '_text_match:desc,rating:desc',
  per_page: 50,
  facet_by: 'category,brand,price',
  filter_by: 'in_stock:true',
  include_fields: 'id,name,price,image_url,rating',
  exclude_fields: 'internal_notes,cost_price',
  highlight_fields: 'name,description',
  highlight_affix_num_tokens: 4,
  highlight_start_tag: '<mark>',
  highlight_end_tag: '</mark>',
  typo_tokens_threshold: 2,
  drop_tokens_threshold: 2,
  enable_overrides: true,
  enable_synonyms: true
};

<SearchProvider
  config={typesenseConfig}
  collection="products"
  initialSearchParams={initialSearchParams}
  facets={facetConfig}
>
  <AdvancedSearchInterface />
</SearchProvider>
```

### With State Change Handler

Tracking search state changes for analytics or debugging:

```tsx
function SearchWithAnalytics() {
  const handleStateChange = (newState) => {
    // Track search queries
    if (newState.query !== previousQuery) {
      analytics.track('Search Query', {
        query: newState.query,
        resultsCount: newState.results?.found || 0
      });
    }
    
    // Track filter usage
    if (newState.filters !== previousFilters) {
      analytics.track('Filters Applied', {
        filters: newState.filters,
        activeFilterCount: Object.keys(newState.filters).length
      });
    }
  };

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfig}
      onStateChange={handleStateChange}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### Complex Facet Configuration

Advanced facet setup with different types and options:

```tsx
const advancedFacets: FacetConfig[] = [
  // Standard checkbox facet
  { 
    field: 'category', 
    label: 'Category', 
    type: 'checkbox',
    maxValues: 10
  },
  
  // Numeric range facet
  { 
    field: 'price', 
    label: 'Price Range', 
    type: 'numeric',
    rangeOptions: {
      min: 0,
      max: 10000,
      step: 100
    }
  },
  
  // Date facet
  { 
    field: 'published_date', 
    label: 'Published Date', 
    type: 'date',
    dateOptions: {
      format: 'YYYY-MM-DD',
      ranges: [
        { label: 'Last 7 days', days: 7 },
        { label: 'Last 30 days', days: 30 },
        { label: 'Last year', days: 365 }
      ]
    }
  },
  
  // Radio button facet
  { 
    field: 'availability', 
    label: 'Availability', 
    type: 'radio'
  },
  
  // Hierarchical facet
  { 
    field: 'category.lvl0', 
    label: 'Category Level 0', 
    type: 'checkbox',
    hierarchical: true
  },
  { 
    field: 'category.lvl1', 
    label: 'Category Level 1', 
    type: 'checkbox',
    hierarchical: true,
    parentField: 'category.lvl0'
  }
];

<SearchProvider
  config={typesenseConfig}
  collection="products"
  facets={advancedFacets}
  accumulateFacets={true}
>
  <AdvancedFilteringInterface />
</SearchProvider>
```

## MultiCollectionProvider Examples

### Basic Multi-Collection Setup

Searching across multiple collections simultaneously:

```tsx
import { MultiCollectionProvider } from '@jungle-commerce/typesense-react';

const defaultCollections = [
  {
    collection: 'products',
    queryBy: 'name,description,brand',
    weight: 2.0,
    maxResults: 30
  },
  {
    collection: 'categories',
    queryBy: 'name,description',
    weight: 1.5,
    maxResults: 10
  },
  {
    collection: 'brands',
    queryBy: 'name,description',
    weight: 1.0,
    maxResults: 10
  }
];

function App() {
  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={defaultCollections}
    >
      <MultiSearchInterface />
    </MultiCollectionProvider>
  );
}
```

### Advanced Multi-Collection Configuration

With search options and custom configurations:

```tsx
<MultiCollectionProvider
  config={typesenseConfig}
  defaultCollections={[
    {
      collection: 'products',
      queryBy: 'name,description,tags',
      weight: 2.0,
      maxResults: 50,
      includeFields: 'id,name,price,image_url,category',
      filterBy: 'in_stock:true',
      sortBy: '_text_match:desc,popularity:desc'
    },
    {
      collection: 'articles',
      queryBy: 'title,content,author',
      weight: 1.5,
      maxResults: 20,
      includeFields: 'id,title,excerpt,author,published_date',
      filterBy: 'status:published',
      highlightFields: 'title,excerpt',
      namespace: 'content' // Custom namespace for grouping
    },
    {
      collection: 'faqs',
      queryBy: 'question,answer',
      weight: 1.0,
      maxResults: 10,
      includeFields: 'id,question,answer,category'
    }
  ]}
  searchOptions={{
    searchOnMount: false,
    debounceMs: 300,
    normalizeScores: true,
    mergeStrategy: 'relevance',
    resultMode: 'interleaved',
    globalMaxResults: 100,
    enableHighlighting: true,
    highlightConfig: {
      startTag: '<mark>',
      endTag: '</mark>',
      affixNumTokens: 4
    }
  }}
>
  <AdvancedMultiSearchInterface />
</MultiCollectionProvider>
```

### Using Existing Client Instance

Sharing a TypesenseSearchClient instance:

```tsx
import { TypesenseSearchClient } from '@jungle-commerce/typesense-react';

// Create a shared client instance
const sharedClient = new TypesenseSearchClient(
  typesenseConfig,
  5 * 60 * 1000 // 5 minute cache
);

function App() {
  return (
    <div>
      {/* Use the same client in multiple providers */}
      <SearchProvider
        config={sharedClient}
        collection="products"
      >
        <ProductSearch />
      </SearchProvider>
      
      <MultiCollectionProvider
        config={sharedClient}
        defaultCollections={collections}
      >
        <GlobalSearch />
      </MultiCollectionProvider>
    </div>
  );
}
```

## Provider Composition Patterns

### Nested Providers

Using multiple providers for different parts of the application:

```tsx
function App() {
  return (
    // Global multi-collection search
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={globalCollections}
    >
      <Header>
        <GlobalSearchBar />
      </Header>
      
      <main>
        {/* Product-specific search */}
        <SearchProvider
          config={typesenseConfig}
          collection="products"
          facets={productFacets}
        >
          <ProductCatalog />
        </SearchProvider>
        
        {/* Article-specific search */}
        <SearchProvider
          config={typesenseConfig}
          collection="articles"
          facets={articleFacets}
        >
          <ArticleSearch />
        </SearchProvider>
      </main>
    </MultiCollectionProvider>
  );
}
```

### Provider with Custom Context

Extending providers with additional context:

```tsx
interface AppSearchContextValue {
  userPreferences: UserSearchPreferences;
  searchHistory: SearchHistoryItem[];
  saveSearch: (query: string) => void;
}

const AppSearchContext = createContext<AppSearchContextValue | null>(null);

function AppSearchProvider({ children }: { children: React.ReactNode }) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const userPreferences = useUserPreferences();
  
  const saveSearch = (query: string) => {
    setSearchHistory(prev => [...prev, { query, timestamp: Date.now() }]);
  };
  
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfig}
      initialState={{
        perPage: userPreferences.resultsPerPage,
        sortBy: userPreferences.defaultSort
      }}
    >
      <AppSearchContext.Provider value={{ userPreferences, searchHistory, saveSearch }}>
        {children}
      </AppSearchContext.Provider>
    </SearchProvider>
  );
}
```

### Provider with Error Boundary

Implementing error handling around providers:

```tsx
class SearchErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Search error:', error, errorInfo);
    // Log to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Search is temporarily unavailable</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

function App() {
  return (
    <SearchErrorBoundary>
      <SearchProvider
        config={typesenseConfig}
        collection="products"
        facets={facetConfig}
      >
        <SearchInterface />
      </SearchProvider>
    </SearchErrorBoundary>
  );
}
```

## Real Configuration Examples

### E-commerce Product Search

Complete example from the basic-search example:

```tsx
// config.ts
export const typesenseConfig = {
  nodes: [{
    host: process.env.REACT_APP_TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.REACT_APP_TYPESENSE_PORT || '8108'),
    protocol: process.env.REACT_APP_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.REACT_APP_TYPESENSE_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 2
};

export const facetConfig: FacetConfig[] = [
  { field: 'category', label: 'Category', type: 'checkbox' },
  { field: 'brand', label: 'Brand', type: 'checkbox' },
  { field: 'price', label: 'Price', type: 'numeric' },
  { field: 'rating', label: 'Rating', type: 'numeric' },
  { field: 'in_stock', label: 'Availability', type: 'radio' }
];

// App.tsx
function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection={collectionName}
      facets={facetConfig}
      searchOnMount={true}
      accumulateFacets={false}
      performanceMode={false}
      enableDisjunctiveFacetQueries={true}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### Content Management System Search

Advanced filtering example configuration:

```tsx
const cmsSearchConfig = {
  nodes: [{ host: 'search.example.com', port: 443, protocol: 'https' }],
  apiKey: process.env.TYPESENSE_SEARCH_API_KEY,
  cacheSearchResultsForSeconds: 300, // 5 minute cache for CMS content
  useServerSideSearchCache: true
};

const cmsFacets: FacetConfig[] = [
  { field: 'content_type', label: 'Content Type', type: 'checkbox' },
  { field: 'status', label: 'Status', type: 'radio' },
  { field: 'author', label: 'Author', type: 'checkbox' },
  { field: 'tags', label: 'Tags', type: 'checkbox', maxValues: 20 },
  { field: 'language', label: 'Language', type: 'checkbox' },
  { field: 'word_count', label: 'Word Count', type: 'numeric' },
  { field: 'published_date', label: 'Published Date', type: 'date' }
];

<SearchProvider
  config={cmsSearchConfig}
  collection="content"
  facets={cmsFacets}
  initialSearchParams={{
    query_by: 'title,content,excerpt,tags',
    query_by_weights: '4,2,3,1',
    filter_by: 'status:published',
    sort_by: 'published_date:desc',
    per_page: 20,
    include_fields: 'id,title,excerpt,author,published_date,content_type,tags',
    highlight_fields: 'title,excerpt',
    facet_by: cmsFacets.map(f => f.field).join(','),
    max_facet_values: 100
  }}
  performanceMode={true}
  accumulateFacets={true}
>
  <CMSSearchInterface />
</SearchProvider>
```

### Multi-Collection Universal Search

Real example from the multi-collection demo:

```tsx
const universalSearchCollections: CollectionSearchConfig[] = [
  {
    collection: 'products',
    queryBy: 'name,description,brand,category',
    weight: 2.0,
    maxResults: 30,
    includeFields: 'id,name,price,image_url,brand,category',
    filterBy: 'in_stock:true',
    namespace: 'product'
  },
  {
    collection: 'categories',
    queryBy: 'name,description',
    weight: 1.5,
    maxResults: 10,
    includeFields: 'id,name,description,parent_category,product_count',
    namespace: 'category'
  },
  {
    collection: 'brands',
    queryBy: 'name,description',
    weight: 1.0,
    maxResults: 10,
    includeFields: 'id,name,description,website',
    namespace: 'brand'
  },
  {
    collection: 'articles',
    queryBy: 'title,content,excerpt',
    weight: 1.0,
    maxResults: 20,
    includeFields: 'id,title,excerpt,author,published_date',
    filterBy: 'status:published',
    sortBy: 'published_date:desc',
    namespace: 'article'
  }
];

<MultiCollectionProvider
  config={typesenseConfig}
  defaultCollections={universalSearchCollections}
  searchOptions={{
    searchOnMount: false,
    debounceMs: 300,
    normalizeScores: true,
    mergeStrategy: 'relevance', // or 'roundRobin' or 'collectionOrder'
    resultMode: 'interleaved', // or 'perCollection' or 'both'
    globalMaxResults: 100,
    enableHighlighting: true,
    highlightConfig: {
      startTag: '<mark>',
      endTag: '</mark>',
      affixNumTokens: 4
    }
  }}
>
  <UniversalSearchInterface />
</MultiCollectionProvider>
```

### Provider with Authentication

Implementing secure search with API key management:

```tsx
function AuthenticatedSearchProvider({ children }) {
  const { user, apiKey } = useAuth();
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    if (user && apiKey) {
      setConfig({
        nodes: [{
          host: 'api.example.com',
          port: 443,
          protocol: 'https'
        }],
        apiKey: apiKey, // User-specific search key
        connectionTimeoutSeconds: 10,
        additionalHeaders: {
          'X-User-ID': user.id,
          'X-User-Role': user.role
        }
      });
    }
  }, [user, apiKey]);
  
  if (!config) {
    return <div>Loading search...</div>;
  }
  
  return (
    <SearchProvider
      config={config}
      collection={`${user.organization}_products`}
      facets={facetConfig}
      initialSearchParams={{
        filter_by: `organization_id:${user.organizationId}`,
        hidden_hits: user.role === 'admin' ? '' : 'is_hidden:false'
      }}
    >
      {children}
    </SearchProvider>
  );
}
```

## Best Practices

1. **Cache Configuration**: Always configure caching for better performance
2. **Field Selection**: Use `includeFields` to reduce payload size
3. **Highlighting**: Configure highlighting for better UX
4. **Error Handling**: Implement error boundaries around providers
5. **Performance Mode**: Enable for large datasets or high-traffic applications
6. **Facet Accumulation**: Use for e-commerce style filtering
7. **Debouncing**: Configure appropriate debounce delays for search-as-you-type
8. **Score Normalization**: Enable when merging results from multiple collections

These examples demonstrate the flexibility and power of typesense-react's provider system, from simple setups to complex multi-collection configurations with advanced features.