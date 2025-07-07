# Performance Optimization Examples

This document provides comprehensive examples for optimizing search performance in typesense-react applications.

## Table of Contents

1. [Query Optimization](#query-optimization)
2. [Caching Strategies](#caching-strategies)
3. [Lazy Loading](#lazy-loading)
4. [Debouncing and Throttling](#debouncing-and-throttling)
5. [Pagination Strategies](#pagination-strategies)
6. [React Performance](#react-performance)
7. [Network Optimization](#network-optimization)
8. [Memory Management](#memory-management)
9. [Bundle Size Optimization](#bundle-size-optimization)
10. [Monitoring and Profiling](#monitoring-and-profiling)

## Query Optimization

### Selective Field Queries

```tsx
// Only query and return necessary fields
function OptimizedSearch() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      initialSearchParams={{
        query_by: 'name,brand', // Only search these fields
        include_fields: 'id,name,price,image_url', // Only return these fields
        exclude_fields: 'description,long_text,metadata' // Exclude heavy fields
      }}
    >
      <SearchResults />
    </SearchProvider>
  );
}
```

### Query Weights Optimization

```tsx
function WeightedSearch() {
  const { actions } = useSearch();

  const performWeightedSearch = (query: string) => {
    actions.updateSearchParams({
      query_by: 'name,description,tags',
      query_by_weights: '3,2,1', // Prioritize name matches
      typo_tokens_threshold: 2, // Reduce typo tolerance for performance
      drop_tokens_threshold: 2, // Drop tokens for better performance
      prefix: false // Disable prefix search if not needed
    });
    actions.setQuery(query);
  };

  return <SearchInput onSearch={performWeightedSearch} />;
}
```

### Facet Optimization

```tsx
function OptimizedFacets() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={[
        { 
          field: 'category', 
          type: 'checkbox',
          max_facet_values: 10 // Limit facet values
        },
        { 
          field: 'brand', 
          type: 'checkbox',
          max_facet_values: 20
        }
      ]}
      initialSearchParams={{
        facet_by: 'category,brand', // Only compute needed facets
        max_facet_values: 100 // Global limit
      }}
      performanceMode={true} // Disable expensive features
    >
      <FacetedSearch />
    </SearchProvider>
  );
}
```

## Caching Strategies

### Result Caching

```tsx
// Configure client-side caching
const cachedConfig = {
  ...typesenseConfig,
  cacheSearchResultsForSeconds: 300 // Cache for 5 minutes
};

function CachedSearch() {
  const { state, actions } = useSearch();
  const [cache] = useState(new Map());

  const cachedSetQuery = (query: string) => {
    // Check local cache first
    const cacheKey = `${query}-${state.sortBy}-${state.page}`;
    if (cache.has(cacheKey)) {
      const cachedResult = cache.get(cacheKey);
      // Use cached result
      actions.setResults(cachedResult);
      return;
    }

    // Perform search and cache result
    actions.setQuery(query, {
      onSuccess: (result) => {
        cache.set(cacheKey, result);
      }
    });
  };

  return <SearchInput onSearch={cachedSetQuery} />;
}
```

### Facet Value Caching

```tsx
import { useAccumulatedFacets } from '@jungle-commerce/typesense-react';

function CachedFacets() {
  const accumulated = useAccumulatedFacets();
  
  // Enable facet accumulation to cache values
  useEffect(() => {
    accumulated.setAccumulateFacets(true);
  }, []);

  return (
    <div>
      {/* Facet values are cached across searches */}
      <FacetList />
    </div>
  );
}
```

### Schema Caching

```tsx
const schemaCache = new Map();

function CachedSchemaDiscovery() {
  const [schema, setSchema] = useState(null);
  const collection = 'products';

  useEffect(() => {
    async function loadSchema() {
      // Check cache first
      if (schemaCache.has(collection)) {
        setSchema(schemaCache.get(collection));
        return;
      }

      // Load and cache schema
      const client = new TypesenseSearchClient(typesenseConfig);
      const schemaData = await client.retrieveSchema(collection);
      schemaCache.set(collection, schemaData);
      setSchema(schemaData);
    }

    loadSchema();
  }, [collection]);

  return schema ? <SchemaBasedSearch schema={schema} /> : <Loading />;
}
```

## Lazy Loading

### Infinite Scroll

```tsx
import { useInView } from 'react-intersection-observer';

function InfiniteScrollSearch() {
  const { state, actions, hasNextPage } = useSearch();
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (inView && hasNextPage && !state.loading) {
      actions.setPage(state.page + 1, { 
        append: true // Append results instead of replacing
      });
    }
  }, [inView, hasNextPage, state.loading]);

  return (
    <div>
      {state.results?.hits.map(hit => (
        <ResultCard key={hit.document.id} hit={hit} />
      ))}
      
      {hasNextPage && (
        <div ref={ref} className="load-more-trigger">
          {state.loading ? 'Loading...' : 'Scroll for more'}
        </div>
      )}
    </div>
  );
}
```

### Virtualized Lists

```tsx
import { FixedSizeList } from 'react-window';

function VirtualizedResults() {
  const { state } = useSearch();
  const results = state.results?.hits || [];

  const Row = ({ index, style }) => (
    <div style={style}>
      <ResultCard hit={results[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={results.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Progressive Image Loading

```tsx
function ProgressiveImageResult({ hit }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(hit.document.thumbnail_url);

  useEffect(() => {
    // Load high-res image in background
    const img = new Image();
    img.src = hit.document.image_url;
    img.onload = () => {
      setImageSrc(hit.document.image_url);
      setImageLoaded(true);
    };
  }, [hit.document.image_url]);

  return (
    <div className="result">
      <img 
        src={imageSrc} 
        className={imageLoaded ? 'loaded' : 'loading'}
        loading="lazy"
      />
      <h3>{hit.document.name}</h3>
    </div>
  );
}
```

## Debouncing and Throttling

### Optimized Search Input

```tsx
import { useDebouncedCallback } from 'use-debounce';

function OptimizedSearchInput() {
  const { actions } = useSearch();
  const [localQuery, setLocalQuery] = useState('');

  // Debounce search requests
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      actions.setQuery(value);
    },
    300, // 300ms delay
    { 
      leading: false,
      trailing: true,
      maxWait: 1000 // Force search after 1 second max
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    
    // Skip search for very short queries
    if (value.length >= 2) {
      debouncedSearch(value);
    }
  };

  return (
    <input
      value={localQuery}
      onChange={handleChange}
      placeholder="Search (min 2 characters)..."
    />
  );
}
```

### Throttled Facet Updates

```tsx
import { throttle } from 'lodash-es';

function ThrottledFacets() {
  const facets = useAdvancedFacets();
  
  // Throttle facet updates to prevent rapid re-renders
  const throttledToggle = useMemo(
    () => throttle((field: string, value: string) => {
      facets.actions.toggleFacetValue(field, value);
    }, 100),
    [facets.actions]
  );

  return (
    <div>
      {/* Use throttled function for facet clicks */}
      <FacetCheckbox onToggle={throttledToggle} />
    </div>
  );
}
```

## Pagination Strategies

### Smart Pagination

```tsx
function SmartPagination() {
  const { state, actions, totalPages } = useSearch();
  const [pageCache] = useState(new Map());

  const goToPage = (page: number) => {
    // Check cache for this page
    const cacheKey = `${state.query}-${page}`;
    if (pageCache.has(cacheKey)) {
      actions.setPageWithCache(page, pageCache.get(cacheKey));
      return;
    }

    // Load page and cache
    actions.setPage(page, {
      onSuccess: (results) => {
        pageCache.set(cacheKey, results);
      }
    });
  };

  // Prefetch adjacent pages
  useEffect(() => {
    const prefetchPages = [];
    if (state.page > 1) prefetchPages.push(state.page - 1);
    if (state.page < totalPages) prefetchPages.push(state.page + 1);

    prefetchPages.forEach(page => {
      const cacheKey = `${state.query}-${page}`;
      if (!pageCache.has(cacheKey)) {
        // Prefetch in background
        actions.prefetchPage(page).then(results => {
          pageCache.set(cacheKey, results);
        });
      }
    });
  }, [state.page, state.query]);

  return <PaginationControls onPageChange={goToPage} />;
}
```

### Cursor-Based Pagination

```tsx
function CursorPagination() {
  const { state, actions } = useSearch();
  const [cursors, setCursors] = useState({ next: null, prev: null });

  const loadNext = () => {
    if (cursors.next) {
      actions.searchWithCursor(cursors.next, {
        onSuccess: (results) => {
          setCursors({
            next: results.next_cursor,
            prev: results.prev_cursor
          });
        }
      });
    }
  };

  return (
    <div>
      <ResultsList />
      <button onClick={loadNext} disabled={!cursors.next}>
        Load More
      </button>
    </div>
  );
}
```

## React Performance

### Memoized Components

```tsx
import { memo, useMemo } from 'react';

// Memoize result components
const ResultCard = memo(({ hit }) => {
  return (
    <div className="result-card">
      <h3>{hit.document.name}</h3>
      <p>${hit.document.price}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.hit.document.id === nextProps.hit.document.id &&
         prevProps.hit.document.updated_at === nextProps.hit.document.updated_at;
});

// Memoize expensive calculations
function SearchStats() {
  const { state } = useSearch();
  
  const stats = useMemo(() => {
    if (!state.results) return null;
    
    return {
      avgPrice: state.results.hits.reduce((sum, hit) => 
        sum + hit.document.price, 0) / state.results.hits.length,
      maxPrice: Math.max(...state.results.hits.map(h => h.document.price)),
      minPrice: Math.min(...state.results.hits.map(h => h.document.price))
    };
  }, [state.results]);

  return <StatsDisplay stats={stats} />;
}
```

### Selective State Subscriptions

```tsx
// Only subscribe to specific state slices
function OptimizedSearchBar() {
  // Only re-render when query changes
  const query = useSearch(state => state.query);
  const setQuery = useSearch(state => state.actions.setQuery);
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}

function OptimizedResultCount() {
  // Only re-render when result count changes
  const found = useSearch(state => state.results?.found);
  
  return <div>Found {found || 0} results</div>;
}
```

### Batch Updates

```tsx
import { unstable_batchedUpdates } from 'react-dom';

function BatchedFacetUpdates() {
  const facets = useAdvancedFacets();

  const applyMultipleFilters = (filters: Array<[string, string]>) => {
    unstable_batchedUpdates(() => {
      filters.forEach(([field, value]) => {
        facets.actions.toggleFacetValue(field, value);
      });
    });
  };

  return (
    <button onClick={() => applyMultipleFilters([
      ['category', 'Electronics'],
      ['brand', 'Apple'],
      ['in_stock', 'true']
    ])}>
      Apply Preset Filters
    </button>
  );
}
```

## Network Optimization

### Request Batching

```tsx
function BatchedSearch() {
  const [pendingSearches, setPendingSearches] = useState([]);
  const batchTimeoutRef = useRef(null);

  const addSearchRequest = (params) => {
    setPendingSearches(prev => [...prev, params]);
    
    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Set new timeout for batch execution
    batchTimeoutRef.current = setTimeout(() => {
      executeBatch();
    }, 50); // 50ms batch window
  };

  const executeBatch = async () => {
    if (pendingSearches.length === 0) return;
    
    const client = new TypesenseSearchClient(typesenseConfig);
    const results = await client.multiSearch(pendingSearches);
    
    // Process results
    setPendingSearches([]);
  };

  return <SearchInterface onSearch={addSearchRequest} />;
}
```

### Connection Pooling

```tsx
// Configure connection pooling
const optimizedConfig = {
  nodes: [
    { host: 'node1.example.com', port: 443, protocol: 'https' },
    { host: 'node2.example.com', port: 443, protocol: 'https' },
    { host: 'node3.example.com', port: 443, protocol: 'https' }
  ],
  apiKey: 'xyz123',
  connectionTimeoutSeconds: 2,
  healthcheckIntervalSeconds: 30,
  nearestNode: {
    host: 'nearest.example.com',
    port: 443,
    protocol: 'https'
  },
  logLevel: 'error' // Reduce logging overhead
};
```

### Compression

```tsx
function CompressedSearch() {
  return (
    <SearchProvider
      config={{
        ...typesenseConfig,
        useServerSideSearchCache: true,
        compress: true // Enable gzip compression
      }}
      collection="products"
      initialSearchParams={{
        exhaustive_search: false, // Faster non-exhaustive search
        search_cutoff_ms: 100 // Limit search time
      }}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

## Memory Management

### Result Cleanup

```tsx
function MemoryEfficientSearch() {
  const { state, actions } = useSearch();
  const resultsRef = useRef([]);
  const maxStoredResults = 1000;

  useEffect(() => {
    if (state.results?.hits) {
      // Append new results
      resultsRef.current = [...resultsRef.current, ...state.results.hits];
      
      // Limit stored results
      if (resultsRef.current.length > maxStoredResults) {
        resultsRef.current = resultsRef.current.slice(-maxStoredResults);
      }
    }
  }, [state.results]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resultsRef.current = [];
    };
  }, []);

  return <ResultsList results={resultsRef.current} />;
}
```

### Large Dataset Handling

```tsx
function LargeDatasetSearch() {
  const { state, actions } = useSearch();
  const [displayedResults, setDisplayedResults] = useState([]);
  const CHUNK_SIZE = 50;

  useEffect(() => {
    if (state.results?.hits) {
      // Process results in chunks to avoid blocking UI
      const chunks = [];
      for (let i = 0; i < state.results.hits.length; i += CHUNK_SIZE) {
        chunks.push(state.results.hits.slice(i, i + CHUNK_SIZE));
      }

      let currentChunk = 0;
      const processChunk = () => {
        if (currentChunk < chunks.length) {
          setDisplayedResults(prev => [...prev, ...chunks[currentChunk]]);
          currentChunk++;
          requestAnimationFrame(processChunk);
        }
      };

      setDisplayedResults([]);
      processChunk();
    }
  }, [state.results]);

  return <ResultsList results={displayedResults} />;
}
```

## Bundle Size Optimization

### Code Splitting

```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const AdvancedFilters = lazy(() => import('./AdvancedFilters'));
const ResultsMap = lazy(() => import('./ResultsMap'));
const Analytics = lazy(() => import('./Analytics'));

function OptimizedApp() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      <SearchProvider config={typesenseConfig} collection="products">
        <BasicSearch />
        
        {showAdvanced && (
          <Suspense fallback={<div>Loading filters...</div>}>
            <AdvancedFilters />
          </Suspense>
        )}
      </SearchProvider>
    </div>
  );
}
```

### Tree Shaking

```tsx
// Import only what you need
import { useSearch } from '@jungle-commerce/typesense-react/hooks/useSearch';
import { useAdvancedFacets } from '@jungle-commerce/typesense-react/hooks/useAdvancedFacets';

// Instead of
// import { useSearch, useAdvancedFacets } from '@jungle-commerce/typesense-react';
```

## Monitoring and Profiling

### Performance Metrics

```tsx
function PerformanceMonitor() {
  const { state } = useSearch();
  const [metrics, setMetrics] = useState({
    searches: 0,
    avgSearchTime: 0,
    slowSearches: 0
  });

  useEffect(() => {
    if (state.results) {
      setMetrics(prev => {
        const newSearchTime = state.results.search_time_ms;
        const totalSearches = prev.searches + 1;
        const newAvg = (prev.avgSearchTime * prev.searches + newSearchTime) / totalSearches;
        
        return {
          searches: totalSearches,
          avgSearchTime: newAvg,
          slowSearches: newSearchTime > 100 ? prev.slowSearches + 1 : prev.slowSearches
        };
      });

      // Log slow searches
      if (state.results.search_time_ms > 100) {
        console.warn('Slow search detected:', {
          query: state.query,
          time: state.results.search_time_ms,
          results: state.results.found
        });
      }
    }
  }, [state.results]);

  return (
    <div className="metrics">
      <p>Total Searches: {metrics.searches}</p>
      <p>Avg Search Time: {metrics.avgSearchTime.toFixed(2)}ms</p>
      <p>Slow Searches: {metrics.slowSearches}</p>
    </div>
  );
}
```

### React DevTools Profiler

```tsx
import { Profiler } from 'react';

function ProfiledSearch() {
  const onRenderCallback = (
    id, // Component name
    phase, // "mount" or "update"
    actualDuration, // Time spent rendering
    baseDuration, // Estimated time without memoization
    startTime, // When React began rendering
    commitTime, // When React committed
    interactions // Set of interactions for this update
  ) => {
    console.log('Render performance:', {
      component: id,
      phase,
      duration: actualDuration,
      timestamp: commitTime
    });

    // Track slow renders
    if (actualDuration > 16) { // Slower than 60fps
      console.warn(`Slow render in ${id}: ${actualDuration}ms`);
    }
  };

  return (
    <Profiler id="SearchInterface" onRender={onRenderCallback}>
      <SearchProvider config={typesenseConfig} collection="products">
        <SearchInterface />
      </SearchProvider>
    </Profiler>
  );
}
```