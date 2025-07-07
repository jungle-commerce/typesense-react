# Troubleshooting Guide for typesense-react

This guide helps you diagnose and resolve common issues when using typesense-react.

## Table of Contents

1. [Common Issues and Solutions](#common-issues-and-solutions)
2. [Debug Strategies](#debug-strategies)
3. [Performance Issues](#performance-issues)
4. [Configuration Problems](#configuration-problems)

## Common Issues and Solutions

### Connection Issues

#### Issue: "Failed to connect to Typesense server"

**Symptoms:**
- Error message: "Request failed with status code 0"
- Network errors in console
- Search results not loading

**Solutions:**

1. **Check server configuration:**
```typescript
// Verify your configuration
const config = {
  nodes: [{
    host: 'localhost',     // Check hostname
    port: 8108,           // Verify port number
    protocol: 'http'      // Ensure correct protocol (http/https)
  }],
  apiKey: 'your-api-key', // Verify API key
  connectionTimeoutSeconds: 5
};
```

2. **Test connection manually:**
```bash
# Test Typesense server is reachable
curl http://localhost:8108/health

# Test with API key
curl -H "X-TYPESENSE-API-KEY: your-api-key" \
     http://localhost:8108/collections
```

3. **Check CORS settings:**
```typescript
// For development, ensure Typesense allows CORS
// In typesense server config:
{
  "cors": {
    "enabled": true,
    "allowed_origins": ["http://localhost:3000", "http://localhost:5173"]
  }
}
```

4. **Use environment variables:**
```typescript
// .env.local
NEXT_PUBLIC_TYPESENSE_HOST=localhost
NEXT_PUBLIC_TYPESENSE_PORT=8108
NEXT_PUBLIC_TYPESENSE_PROTOCOL=http
NEXT_PUBLIC_TYPESENSE_API_KEY=your-search-only-key

// In your app
const config = {
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST!,
    port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT!),
    protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as 'http' | 'https'
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY!
};
```

#### Issue: "401 Unauthorized" errors

**Solutions:**

1. **Verify API key permissions:**
```typescript
// Use a search-only API key for client-side
// Never expose admin API keys in client code
const clientConfig = {
  apiKey: 'search-only-key-here'
};
```

2. **Check API key scopes:**
```bash
# List API keys and their scopes
curl -H "X-TYPESENSE-API-KEY: admin-key" \
     http://localhost:8108/keys
```

### Search Not Working

#### Issue: "No results found" when results should exist

**Solutions:**

1. **Verify query_by fields:**
```typescript
// Ensure query_by includes searchable fields
const searchParams = {
  q: 'search term',
  query_by: 'name,description,tags' // Must match schema fields
};
```

2. **Check field types in schema:**
```typescript
// Fields must be string type to be searchable
const schema = {
  fields: [
    { name: 'name', type: 'string' },        // Searchable
    { name: 'price', type: 'float' },       // Not searchable by default
    { name: 'tags', type: 'string[]' }      // Searchable array
  ]
};
```

3. **Debug search parameters:**
```typescript
// Add debug logging
const { state, actions } = useSearch();

useEffect(() => {
  console.log('Search params:', {
    query: state.query,
    filters: state.filters,
    queryBy: state.searchParams?.query_by
  });
}, [state]);
```

#### Issue: "Search is too slow"

**Solutions:**

1. **Optimize query_by fields:**
```typescript
// Limit query_by to necessary fields
const searchParams = {
  query_by: 'name,title', // Don't include large text fields
  num_typos: 1,          // Reduce typo tolerance
  typo_tokens_threshold: 1 // Minimum tokens for typo tolerance
};
```

2. **Use pagination properly:**
```typescript
// Don't fetch too many results at once
const searchParams = {
  per_page: 20,  // Reasonable page size
  page: 1
};
```

### State Management Issues

#### Issue: "State not updating after search"

**Solutions:**

1. **Check provider setup:**
```typescript
// Ensure SearchProvider wraps your components
function App() {
  return (
    <SearchProvider config={config} collection="products">
      <YourSearchComponent />
    </SearchProvider>
  );
}
```

2. **Use hooks correctly:**
```typescript
// Must be used within SearchProvider
function SearchComponent() {
  const { state, actions } = useSearch(); // ✓ Inside provider
  
  return <div>{/* ... */}</div>;
}

// Won't work
const { state } = useSearch(); // ✗ Outside provider
function SearchComponent() {
  return <div>{/* ... */}</div>;
}
```

3. **Handle async updates:**
```typescript
function SearchComponent() {
  const { state, actions, loading } = useSearch();
  
  const handleSearch = async (query: string) => {
    actions.setQuery(query);
    // State updates are async, use loading state
    if (loading) {
      console.log('Searching...');
    }
  };
  
  // Use useEffect for side effects
  useEffect(() => {
    if (state.results) {
      console.log('Results updated:', state.results);
    }
  }, [state.results]);
}
```

### Facet Issues

#### Issue: "Facets not showing up"

**Solutions:**

1. **Ensure fields are marked as facets in schema:**
```typescript
const schema = {
  fields: [
    { name: 'category', type: 'string', facet: true },  // ✓ Facetable
    { name: 'brand', type: 'string', facet: false }     // ✗ Not facetable
  ]
};
```

2. **Request facets in search parameters:**
```typescript
const searchParams = {
  facet_by: 'category,brand,price', // Explicitly request facets
  max_facet_values: 10
};
```

3. **Check facet data structure:**
```typescript
// Debug facet response
useEffect(() => {
  if (state.results?.facet_counts) {
    console.log('Facets:', state.results.facet_counts);
  }
}, [state.results]);
```

#### Issue: "Disjunctive facet counts not updating with other filters"

**Symptoms:**
- Facet counts remain the same when applying additional filters (like date filters)
- Facet counts only update when selecting facet values themselves
- Inconsistent facet counts when combining filters

**Note:** This issue was fixed in version 2.0.3. The fix uses a ref-based approach to ensure the latest state is always used in disjunctive queries, avoiding React closure issues.

**Solutions:**

1. **Upgrade to version 2.0.3 or later:**
```bash
npm install @jungle-commerce/typesense-react@latest
```

2. **If you cannot upgrade, workaround by manually triggering search:**
```typescript
// Force a new search when filters change
const { state, actions } = useSearch();
const facets = useAdvancedFacets();

// When adding additional filters
const handleDateFilterChange = (dateFilter: string) => {
  actions.setAdditionalFilters(dateFilter);
  // Force search to update facet counts
  actions.search(state.query);
};
```

3. **Verify disjunctive faceting is enabled:**
```typescript
<SearchProvider
  config={config}
  collection="products"
  facets={facetConfig}
  enableDisjunctiveFacetQueries={true} // Must be true
>
```

## Debug Strategies

### Enable Debug Mode

```typescript
// Create a debug wrapper component
function DebugSearchProvider({ children, ...props }) {
  const [debugMode] = useState(() => 
    process.env.NODE_ENV === 'development'
  );
  
  return (
    <SearchProvider {...props} debug={debugMode}>
      {debugMode && <SearchDebugPanel />}
      {children}
    </SearchProvider>
  );
}

// Debug panel component
function SearchDebugPanel() {
  const { state, error } = useSearch();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      background: 'black',
      color: 'white',
      padding: '10px',
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto',
      fontSize: '12px'
    }}>
      <h4>Search Debug</h4>
      <pre>{JSON.stringify({
        query: state.query,
        loading: state.loading,
        error: error?.message,
        resultsCount: state.results?.found,
        page: state.page
      }, null, 2)}</pre>
    </div>
  );
}
```

### Network Request Debugging

```typescript
// Intercept and log all Typesense requests
class DebugTypesenseClient extends TypesenseSearchClient {
  async search(collection: string, searchParams: any) {
    console.group(`🔍 Typesense Search: ${collection}`);
    console.log('Parameters:', searchParams);
    console.time('Search Duration');
    
    try {
      const results = await super.search(collection, searchParams);
      console.log('Results:', results);
      console.timeEnd('Search Duration');
      console.groupEnd();
      return results;
    } catch (error) {
      console.error('Search Error:', error);
      console.timeEnd('Search Duration');
      console.groupEnd();
      throw error;
    }
  }
}

// Use in development
const client = process.env.NODE_ENV === 'development' 
  ? new DebugTypesenseClient(config)
  : new TypesenseSearchClient(config);
```

### Browser DevTools Integration

```typescript
// Add search state to window for debugging
function useSearchDebug() {
  const searchContext = useSearch();
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.__TYPESENSE_REACT_DEBUG__ = {
        state: searchContext.state,
        actions: searchContext.actions,
        error: searchContext.error,
        // Add helper methods
        search: (query: string) => searchContext.actions.setQuery(query),
        setFilter: (filter: string) => searchContext.actions.setAdditionalFilters(filter),
        clearFilters: () => searchContext.actions.clearFilters()
      };
    }
  }, [searchContext]);
}

// In console:
// __TYPESENSE_REACT_DEBUG__.search('test')
// __TYPESENSE_REACT_DEBUG__.state
```

### Performance Profiling

```typescript
// Hook for measuring search performance
function useSearchPerformance() {
  const { state } = useSearch();
  const [metrics, setMetrics] = useState({
    searchTime: 0,
    renderTime: 0,
    totalTime: 0
  });
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        searchTime: state.results?.search_time_ms || 0,
        renderTime,
        totalTime: renderTime + (state.results?.search_time_ms || 0)
      }));
    };
  }, [state.results]);
  
  return metrics;
}
```

## Performance Issues

### Slow Initial Load

**Problem:** Search interface takes too long to load initially

**Solutions:**

1. **Implement lazy loading:**
```typescript
// Lazy load search components
const SearchInterface = lazy(() => import('./SearchInterface'));

function App() {
  const [showSearch, setShowSearch] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowSearch(true)}>
        Show Search
      </button>
      
      {showSearch && (
        <Suspense fallback={<div>Loading search...</div>}>
          <SearchInterface />
        </Suspense>
      )}
    </div>
  );
}
```

2. **Preload search data:**
```typescript
// Preload common searches
function usePreloadSearch() {
  const { actions } = useSearch();
  
  useEffect(() => {
    // Preload popular categories
    const preloadQueries = ['electronics', 'books', 'clothing'];
    
    preloadQueries.forEach(query => {
      // Trigger search but don't update UI
      fetch(`/api/search?q=${query}`)
        .then(res => res.json())
        .then(data => {
          // Cache results
          sessionStorage.setItem(`search-${query}`, JSON.stringify(data));
        });
    });
  }, []);
}
```

### Memory Leaks

**Problem:** Memory usage increases over time

**Solutions:**

1. **Clean up subscriptions:**
```typescript
function useSearchSubscription() {
  const { state, actions } = useSearch();
  
  useEffect(() => {
    const abortController = new AbortController();
    
    // Subscription or interval
    const interval = setInterval(() => {
      // Periodic task
    }, 5000);
    
    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, []);
}
```

2. **Limit result storage:**
```typescript
// Clear old results when navigating
function useResultCleanup() {
  const { actions } = useSearch();
  
  useEffect(() => {
    return () => {
      // Clear results on unmount
      actions.clearResults();
    };
  }, []);
}
```

### Rendering Performance

**Problem:** UI stutters when displaying many results

**Solutions:**

1. **Implement virtualization:**
```typescript
import { FixedSizeList } from 'react-window';

function VirtualizedResults({ results }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ResultItem item={results[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={results.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

2. **Optimize re-renders:**
```typescript
// Memoize expensive components
const ResultItem = memo(({ item }) => {
  return (
    <div>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.item.id === nextProps.item.id;
});
```

## Configuration Problems

### Schema Mismatch

**Problem:** "Field not found" errors

**Solutions:**

1. **Validate schema before searching:**
```typescript
async function validateSchema(client: TypesenseSearchClient, collection: string) {
  try {
    const schema = await client.getSchema(collection);
    console.log('Collection schema:', schema);
    
    // Validate required fields exist
    const requiredFields = ['name', 'description'];
    const fieldNames = schema.fields.map(f => f.name);
    
    const missingFields = requiredFields.filter(
      field => !fieldNames.includes(field)
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    console.error('Schema validation failed:', error);
    return false;
  }
}
```

2. **Dynamic field detection:**
```typescript
function useDynamicSearch() {
  const [schema, setSchema] = useState(null);
  const { actions } = useSearch();
  
  useEffect(() => {
    // Fetch schema and configure search
    fetchSchema().then(schema => {
      setSchema(schema);
      
      // Configure search based on schema
      const searchableFields = schema.fields
        .filter(f => f.type === 'string' || f.type === 'string[]')
        .map(f => f.name);
        
      actions.setSearchParams({
        query_by: searchableFields.join(',')
      });
    });
  }, []);
}
```

### Multi-tenant Configuration

**Problem:** Isolating search data between users

**Solutions:**

1. **Use scoped collections:**
```typescript
function useTenantSearch(tenantId: string) {
  const collectionName = `products_${tenantId}`;
  
  return (
    <SearchProvider
      config={config}
      collection={collectionName}
      key={tenantId} // Force re-initialization on tenant change
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

2. **Filter by tenant:**
```typescript
function useTenantFilteredSearch(tenantId: string) {
  const { state, actions } = useSearch();
  
  useEffect(() => {
    // Always filter by tenant
    actions.setAdditionalFilters(`tenant_id:=${tenantId}`);
  }, [tenantId]);
  
  // Prevent removing tenant filter
  const setFilters = useCallback((filters: string) => {
    const tenantFilter = `tenant_id:=${tenantId}`;
    const newFilters = filters 
      ? `${filters} && ${tenantFilter}`
      : tenantFilter;
    actions.setAdditionalFilters(newFilters);
  }, [tenantId, actions]);
  
  return { ...state, setFilters };
}
```

### Environment-specific Issues

**Problem:** Different behavior in development vs production

**Solutions:**

1. **Environment-aware configuration:**
```typescript
// config/typesense.ts
export function getTypesenseConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    nodes: isDevelopment
      ? [{ host: 'localhost', port: 8108, protocol: 'http' }]
      : [{
          host: process.env.TYPESENSE_HOST!,
          port: 443,
          protocol: 'https'
        }],
    apiKey: process.env.TYPESENSE_API_KEY!,
    connectionTimeoutSeconds: isDevelopment ? 10 : 5,
    retryIntervalSeconds: isDevelopment ? 2 : 1,
    healthcheckIntervalSeconds: isDevelopment ? 60 : 15
  };
}
```

2. **Feature flags for debugging:**
```typescript
// Debug features only in development
const DEBUG_FEATURES = {
  logRequests: process.env.NODE_ENV === 'development',
  showDebugPanel: process.env.NEXT_PUBLIC_DEBUG === 'true',
  mockResponses: process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
};

function useDebugFeatures() {
  if (DEBUG_FEATURES.logRequests) {
    // Log all search requests
  }
  
  if (DEBUG_FEATURES.mockResponses) {
    // Use mock data instead of real API
  }
  
  return DEBUG_FEATURES;
}
```

### SSL/TLS Issues

**Problem:** "SSL certificate verification failed"

**Solutions:**

1. **Configure SSL properly:**
```typescript
const config = {
  nodes: [{
    host: 'typesense.example.com',
    port: 443,
    protocol: 'https'
  }],
  apiKey: 'your-key',
  // For self-signed certificates (development only!)
  connectionTimeoutSeconds: 5,
  // Additional axios config
  additionalHeaders: {
    'X-Custom-Header': 'value'
  }
};
```

2. **Proxy configuration for development:**
```javascript
// next.config.js or vite.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/typesense/:path*',
        destination: 'https://typesense.example.com/:path*'
      }
    ];
  }
};
```

This troubleshooting guide should help you resolve most common issues with typesense-react. For additional support, check the GitHub issues or community forums.