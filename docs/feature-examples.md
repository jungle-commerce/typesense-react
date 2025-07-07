# Feature Examples

This document provides comprehensive code examples for all major features of the typesense-react library.

## Basic Search

### Simple Search Box

```tsx
import { SearchProvider, useSearch } from '@jungle-commerce/typesense-react';

function SimpleSearch() {
  return (
    <SearchProvider 
      config={typesenseConfig} 
      collection="products"
      searchOnMount={true}
    >
      <SearchBox />
    </SearchProvider>
  );
}

function SearchBox() {
  const { state, actions } = useSearch();

  return (
    <div>
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
      />
      
      {state.loading && <p>Loading...</p>}
      
      <div>
        {state.results?.hits.map(hit => (
          <div key={hit.document.id}>
            <h3>{hit.document.name}</h3>
            <p>{hit.document.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Search with Debouncing

```tsx
function DebouncedSearch() {
  const { state, actions } = useSearch({
    debounceMs: 300 // Wait 300ms after typing stops
  });

  return (
    <input
      type="text"
      value={state.query}
      onChange={(e) => actions.setQuery(e.target.value)}
      placeholder="Type to search..."
    />
  );
}
```

### Search with Initial Query

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  initialState={{
    query: 'laptop',
    perPage: 20
  }}
  searchOnMount={true}
>
  <SearchResults />
</SearchProvider>
```

## Faceted Search

### Checkbox Facets

```tsx
import { useAdvancedFacets } from '@jungle-commerce/typesense-react';

function CheckboxFacets() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();

  const categoryFacet = state.results?.facet_counts?.find(
    f => f.field_name === 'category'
  );

  return (
    <div>
      <h3>Categories</h3>
      {categoryFacet?.counts.map(item => (
        <label key={item.value}>
          <input
            type="checkbox"
            checked={facets.disjunctiveFacets.category?.includes(item.value)}
            onChange={() => facets.actions.toggleFacetValue('category', item.value)}
          />
          {item.value} ({item.count})
        </label>
      ))}
    </div>
  );
}
```

### Numeric Range Facets

```tsx
function PriceRangeFacet() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();
  
  const priceStats = state.results?.facet_counts?.find(
    f => f.field_name === 'price'
  )?.stats;

  if (!priceStats) return null;

  return (
    <div>
      <h3>Price Range</h3>
      <input
        type="range"
        min={priceStats.min}
        max={priceStats.max}
        value={facets.numericFilters.price?.min || priceStats.min}
        onChange={(e) => {
          facets.actions.setNumericFilter(
            'price',
            Number(e.target.value),
            facets.numericFilters.price?.max || priceStats.max
          );
        }}
      />
      <div>
        ${facets.numericFilters.price?.min || priceStats.min} - 
        ${facets.numericFilters.price?.max || priceStats.max}
      </div>
    </div>
  );
}
```

### Date Range Facets

```tsx
import { useDateFilter } from '@jungle-commerce/typesense-react';

function DateRangeFacet() {
  const dateFilter = useDateFilter();

  return (
    <div>
      <h3>Date Range</h3>
      <input
        type="date"
        value={dateFilter.dateFilters.created_at?.start || ''}
        onChange={(e) => 
          dateFilter.setDateFilter('created_at', {
            start: e.target.value,
            end: dateFilter.dateFilters.created_at?.end
          })
        }
      />
      <input
        type="date"
        value={dateFilter.dateFilters.created_at?.end || ''}
        onChange={(e) => 
          dateFilter.setDateFilter('created_at', {
            start: dateFilter.dateFilters.created_at?.start,
            end: e.target.value
          })
        }
      />
    </div>
  );
}
```

### Select/Dropdown Facets

```tsx
function SelectFacet() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();

  const brandFacet = state.results?.facet_counts?.find(
    f => f.field_name === 'brand'
  );

  return (
    <select
      value={facets.selectiveFilters.brand || ''}
      onChange={(e) => facets.actions.setSelectiveFilter('brand', e.target.value)}
    >
      <option value="">All Brands</option>
      {brandFacet?.counts.map(item => (
        <option key={item.value} value={item.value}>
          {item.value} ({item.count})
        </option>
      ))}
    </select>
  );
}
```

### Disjunctive Facets (OR Logic)

```tsx
const facetConfig = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true // Enable OR logic
  },
  {
    field: 'brand',
    label: 'Brand',
    type: 'checkbox',
    disjunctive: true
  }
];

<SearchProvider
  config={typesenseConfig}
  collection="products"
  facets={facetConfig}
  enableDisjunctiveFacetQueries={true} // Required for OR logic
>
  <FacetedSearch />
</SearchProvider>
```

## Multi-Collection Search

### Basic Multi-Collection Setup

```tsx
import { MultiCollectionProvider, useMultiCollectionContext } from '@jungle-commerce/typesense-react';

function MultiSearch() {
  const collections = [
    {
      collection: 'products',
      queryBy: 'name,description',
      weight: 2.0, // Products are more important
      maxResults: 20
    },
    {
      collection: 'categories',
      queryBy: 'name,description',
      weight: 1.0,
      maxResults: 5
    }
  ];

  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={collections}
    >
      <MultiSearchInterface />
    </MultiCollectionProvider>
  );
}

function MultiSearchInterface() {
  const { state, search, setQuery } = useMultiCollectionContext();

  const handleSearch = (query: string) => {
    setQuery(query);
    search({
      query,
      mergeStrategy: 'relevance',
      normalizeScores: true
    });
  };

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search all collections..."
      />
      
      {state.results?.hits.map(hit => (
        <div key={`${hit._collection}-${hit.document.id}`}>
          <span className="badge">{hit._collection}</span>
          <h3>{hit.document.name || hit.document.title}</h3>
        </div>
      ))}
    </div>
  );
}
```

### Collection-Specific Filters

```tsx
function MultiSearchWithFilters() {
  const { state, search } = useMultiCollectionContext();

  const searchWithFilters = () => {
    search({
      query: state.query,
      collectionOverrides: {
        products: {
          filter_by: 'in_stock:true && price:<100'
        },
        categories: {
          filter_by: 'parent_id:0' // Only top-level categories
        }
      }
    });
  };

  return (
    <button onClick={searchWithFilters}>
      Search with Filters
    </button>
  );
}
```

## Error Handling

### Basic Error Handling

```tsx
function SearchWithErrorHandling() {
  const { state, error } = useSearch();

  if (error) {
    return (
      <div className="error">
        <h3>Search Error</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return <SearchResults />;
}
```

### Custom Error Handlers

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  onError={(error) => {
    console.error('Search error:', error);
    
    // Handle specific error types
    if (error.httpStatus === 503) {
      alert('Search service is temporarily unavailable');
    } else if (error.httpStatus === 400) {
      alert('Invalid search query');
    }
  }}
>
  <App />
</SearchProvider>
```

### Retry Logic

```tsx
function SearchWithRetry() {
  const { state, actions, error } = useSearch();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        actions.retrySearch();
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  return (
    <div>
      {error && retryCount >= 3 && (
        <div>Failed after 3 retries. Please try again later.</div>
      )}
    </div>
  );
}
```

## Performance Optimization

### Lazy Loading Results

```tsx
import { useInView } from 'react-intersection-observer';

function InfiniteScrollResults() {
  const { state, actions, hasNextPage } = useSearch();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !state.loading) {
      actions.loadMore();
    }
  }, [inView, hasNextPage, state.loading]);

  return (
    <div>
      {state.results?.hits.map(hit => (
        <ResultCard key={hit.document.id} hit={hit} />
      ))}
      
      {hasNextPage && (
        <div ref={ref} className="loading-trigger">
          Loading more...
        </div>
      )}
    </div>
  );
}
```

### Caching Results

```tsx
// Enable caching in config
const typesenseConfig = {
  // ... other config
  cacheSearchResultsForSeconds: 300 // Cache for 5 minutes
};

// Results will be cached automatically
<SearchProvider config={typesenseConfig} collection="products">
  <App />
</SearchProvider>
```

### Optimizing Re-renders

```tsx
import { memo } from 'react';

// Memoize result components
const ResultCard = memo(({ hit }) => {
  return (
    <div>
      <h3>{hit.document.name}</h3>
      <p>{hit.document.price}</p>
    </div>
  );
});

// Use selective subscriptions
function OptimizedSearch() {
  // Only subscribe to what you need
  const query = useSearch(state => state.query);
  const setQuery = useSearch(state => state.actions.setQuery);
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

### Parallel Queries

```tsx
function ParallelSearch() {
  const [results, setResults] = useState({});
  const client = new TypesenseSearchClient(typesenseConfig);

  const searchAll = async (query) => {
    const searches = [
      client.search('products', { q: query, query_by: 'name' }),
      client.search('categories', { q: query, query_by: 'name' }),
      client.search('brands', { q: query, query_by: 'name' })
    ];

    const [products, categories, brands] = await Promise.all(searches);
    
    setResults({ products, categories, brands });
  };

  return (
    <div>
      <input onChange={(e) => searchAll(e.target.value)} />
      {/* Render results */}
    </div>
  );
}
```

## Advanced Features

### Custom Highlighting

```tsx
function CustomHighlighting() {
  const { state } = useSearch();

  const renderHighlight = (hit) => {
    const highlighted = hit.highlight?.name?.snippet || hit.document.name;
    
    return (
      <h3 
        dangerouslySetInnerHTML={{ 
          __html: highlighted
            .replace(/<mark>/g, '<span class="highlight">')
            .replace(/<\/mark>/g, '</span>')
        }} 
      />
    );
  };

  return (
    <div>
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>
          {renderHighlight(hit)}
        </div>
      ))}
    </div>
  );
}
```

### Geosearch

```tsx
function GeoSearch() {
  const { actions } = useSearch();
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    });
  }, []);

  const searchNearby = () => {
    if (userLocation) {
      actions.setGeoFilter({
        field: 'location',
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius: 10 // 10km radius
      });
    }
  };

  return (
    <button onClick={searchNearby}>
      Search Nearby
    </button>
  );
}
```

### Synonyms and Query Suggestions

```tsx
function SearchWithSuggestions() {
  const { state, actions } = useSearch();
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (state.results?.found === 0 && state.query) {
      // Generate suggestions for no results
      const possibleSuggestions = [
        state.query.slice(0, -1), // Remove last character
        state.query.replace(/[aeiou]/g, '*'), // Wildcard vowels
        state.query.split(' ').reverse().join(' ') // Reverse words
      ];
      setSuggestions(possibleSuggestions);
    }
  }, [state.results, state.query]);

  return (
    <div>
      {state.results?.found === 0 && suggestions.length > 0 && (
        <div>
          <p>No results found. Did you mean:</p>
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => actions.setQuery(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Custom Ranking

```tsx
function CustomRankedSearch() {
  const { actions } = useSearch();

  const searchWithCustomRanking = () => {
    actions.setSearchParams({
      query_by: 'name,description',
      query_by_weights: '2,1', // Name is twice as important
      sort_by: '_text_match:desc,popularity:desc,price:asc',
      pinned_hits: '1,2,3', // Pin specific IDs to top
      hidden_hits: '10,11,12' // Hide specific IDs
    });
  };

  return (
    <button onClick={searchWithCustomRanking}>
      Search with Custom Ranking
    </button>
  );
}
```

### Analytics Integration

```tsx
function SearchWithAnalytics() {
  const { state, actions } = useSearch({
    onSearchSuccess: (results) => {
      // Track successful searches
      analytics.track('Search Performed', {
        query: state.query,
        resultsCount: results.found,
        searchTime: results.search_time_ms
      });
    },
    onSearchError: (error) => {
      // Track search errors
      analytics.track('Search Error', {
        query: state.query,
        error: error.message
      });
    }
  });

  const trackClick = (hit) => {
    analytics.track('Search Result Clicked', {
      query: state.query,
      resultId: hit.document.id,
      position: hit.position
    });
  };

  return (
    <div>
      {state.results?.hits.map((hit, index) => (
        <div
          key={hit.document.id}
          onClick={() => trackClick({ ...hit, position: index + 1 })}
        >
          {hit.document.name}
        </div>
      ))}
    </div>
  );
}
```