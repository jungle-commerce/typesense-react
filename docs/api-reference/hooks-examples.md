# Typesense React Hooks Examples

This document provides practical examples of using the typesense-react hooks, extracted from real test cases and common use scenarios.

## Table of Contents

1. [Basic Search Examples](#basic-search-examples)
2. [Advanced Faceting Examples](#advanced-faceting-examples)
3. [Schema Discovery Examples](#schema-discovery-examples)
4. [Multi-Collection Search Examples](#multi-collection-search-examples)
5. [Date Filtering Examples](#date-filtering-examples)
6. [Numeric Range Examples](#numeric-range-examples)
7. [State Management Examples](#state-management-examples)
8. [Error Handling Examples](#error-handling-examples)

---

## Basic Search Examples

### Simple Search with Debouncing

```typescript
import { useSearch } from 'typesense-react';

function SearchBox() {
  const { state, actions, loading } = useSearch({
    queryBy: 'title,description',
    debounceMs: 500,
    searchOnMount: false
  });

  return (
    <div>
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
      />
      
      {loading && <span>Searching...</span>}
      
      <div>
        {state.results?.hits?.map((hit) => (
          <div key={hit.document.id}>
            <h3>{hit.document.title}</h3>
            <p>{hit.document.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Search with Pagination

```typescript
function PaginatedSearch() {
  const { state, actions } = useSearch({
    queryBy: 'name,description',
    searchOnMount: true
  });

  const totalPages = Math.ceil((state.results?.found || 0) / state.perPage);

  return (
    <div>
      {/* Search input */}
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
      />

      {/* Results per page selector */}
      <select
        value={state.perPage}
        onChange={(e) => actions.setPerPage(Number(e.target.value))}
      >
        <option value="10">10 per page</option>
        <option value="20">20 per page</option>
        <option value="50">50 per page</option>
      </select>

      {/* Results */}
      <div>
        {state.results?.hits?.map((hit) => (
          <div key={hit.document.id}>{hit.document.name}</div>
        ))}
      </div>

      {/* Pagination controls */}
      <div>
        <button
          onClick={() => actions.setPage(state.page - 1)}
          disabled={state.page === 1}
        >
          Previous
        </button>
        
        <span>Page {state.page} of {totalPages}</span>
        
        <button
          onClick={() => actions.setPage(state.page + 1)}
          disabled={state.page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Search with Sorting

```typescript
function SortableSearch() {
  const { state, actions } = useSearch();

  return (
    <div>
      {/* Sort controls */}
      <select
        value={state.sortBy}
        onChange={(e) => actions.setSortBy(e.target.value)}
      >
        <option value="">Relevance</option>
        <option value="price:asc">Price: Low to High</option>
        <option value="price:desc">Price: High to Low</option>
        <option value="created_at:desc">Newest First</option>
        <option value="rating:desc">Highest Rated</option>
      </select>

      {/* Multi-field sorting */}
      <button
        onClick={() => {
          actions.setMultiSortBy([
            { field: 'featured', order: 'desc' },
            { field: 'price', order: 'asc' }
          ]);
        }}
      >
        Sort by Featured, then Price
      </button>

      {/* Results display */}
      {state.results?.hits?.map((hit) => (
        <div key={hit.document.id}>
          {hit.document.name} - ${hit.document.price}
        </div>
      ))}
    </div>
  );
}
```

---

## Advanced Faceting Examples

### Disjunctive Facets (Checkboxes)

```typescript
import { useSearch, useAdvancedFacets } from 'typesense-react';

function FacetedSearch() {
  const search = useSearch();
  const facets = useAdvancedFacets();

  // Get facet values from search results
  const categoryFacet = search.state.results?.facet_counts?.find(
    f => f.field_name === 'category'
  );

  return (
    <div>
      <aside>
        <h3>Categories</h3>
        {categoryFacet?.counts.map((item) => (
          <label key={item.value}>
            <input
              type="checkbox"
              checked={facets.disjunctiveFacets.category?.includes(item.value)}
              onChange={() => facets.actions.toggleFacetValue('category', item.value)}
            />
            {item.value} ({item.count})
          </label>
        ))}
      </aside>

      <main>
        {/* Search results */}
        {search.state.results?.hits?.map((hit) => (
          <div key={hit.document.id}>
            {hit.document.name}
          </div>
        ))}
      </main>
    </div>
  );
}
```

### Numeric Range Facets

```typescript
function PriceRangeFilter() {
  const facets = useAdvancedFacets();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const applyPriceFilter = () => {
    facets.actions.setNumericFilter(
      'price',
      minPrice ? Number(minPrice) : undefined,
      maxPrice ? Number(maxPrice) : undefined
    );
  };

  return (
    <div>
      <h3>Price Range</h3>
      <input
        type="number"
        placeholder="Min price"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
      />
      <input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
      />
      <button onClick={applyPriceFilter}>Apply</button>
      
      {facets.numericFilters.price && (
        <button onClick={() => facets.actions.clearFilter('price', 'numeric')}>
          Clear price filter
        </button>
      )}
    </div>
  );
}
```

### Selective Filters (Radio Buttons)

```typescript
function SelectiveFilterExample() {
  const facets = useAdvancedFacets();
  const search = useSearch();

  const statusFacet = search.state.results?.facet_counts?.find(
    f => f.field_name === 'status'
  );

  return (
    <div>
      <h3>Status</h3>
      <label>
        <input
          type="radio"
          name="status"
          checked={!facets.selectiveFilters.status}
          onChange={() => facets.actions.clearFilter('status', 'selective')}
        />
        All
      </label>
      
      {statusFacet?.counts.map((item) => (
        <label key={item.value}>
          <input
            type="radio"
            name="status"
            checked={facets.selectiveFilters.status === item.value}
            onChange={() => facets.actions.setSelectiveFilter('status', item.value)}
          />
          {item.value} ({item.count})
        </label>
      ))}
    </div>
  );
}
```

### Custom Filters

```typescript
function CustomFilterExample() {
  const facets = useAdvancedFacets();

  // Apply complex custom filter
  const applyCustomFilter = () => {
    // Filter for products with multiple tags
    facets.actions.setCustomFilter('tags', ['sale', 'featured', 'new']);
  };

  return (
    <div>
      <button onClick={applyCustomFilter}>
        Show Sale + Featured + New Items
      </button>
      
      <button 
        onClick={() => facets.actions.clearFilter('tags', 'custom')}
      >
        Clear Custom Filter
      </button>
    </div>
  );
}
```

---

## Schema Discovery Examples

### Auto-Configure Facets from Schema

```typescript
import { useSchemaDiscovery, useSearch } from 'typesense-react';

function AutoConfiguredSearch() {
  const { schema, facetConfigs, searchableFields, sortableFields, isLoading } = useSchemaDiscovery({
    maxFacets: 10,
    includeNumericFacets: true,
    includeDateFacets: true,
    patterns: {
      excludePatterns: [
        { pattern: '_id$', matchType: 'suffix' },
        { pattern: 'internal_', matchType: 'prefix' }
      ],
      datePatterns: [
        { pattern: '_at$', matchType: 'suffix' },
        { pattern: '_date$', matchType: 'suffix' }
      ]
    },
    facetOverrides: {
      category: { type: 'checkbox', expanded: true },
      price: { type: 'range', rangeStep: 10 },
      created_at: { type: 'date' }
    }
  });

  const search = useSearch({
    queryBy: searchableFields.join(',')
  });

  if (isLoading) return <div>Loading schema...</div>;

  return (
    <div>
      {/* Auto-generated facets */}
      <aside>
        {facetConfigs.map(config => (
          <FacetComponent key={config.field} config={config} />
        ))}
      </aside>

      {/* Sort options from schema */}
      <select onChange={(e) => search.actions.setSortBy(e.target.value)}>
        <option value="">Relevance</option>
        {sortableFields.map(field => (
          <option key={field.field} value={`${field.field}:desc`}>
            {field.label}
          </option>
        ))}
      </select>

      {/* Search results */}
      <main>
        {search.state.results?.hits?.map((hit) => (
          <div key={hit.document.id}>{hit.document.name}</div>
        ))}
      </main>
    </div>
  );
}
```

### Schema Pattern Detection

```typescript
function SchemaPatternExample() {
  const discovery = useSchemaDiscovery({
    patterns: {
      // Exclude internal fields
      excludePatterns: [
        { pattern: '^_', matchType: 'prefix' },      // Fields starting with _
        { pattern: '_internal$', matchType: 'suffix' }, // Fields ending with _internal
        { pattern: 'debug', matchType: 'contains' }   // Fields containing debug
      ],
      // Identify date fields
      datePatterns: [
        { pattern: '_at$', matchType: 'suffix' },     // created_at, updated_at
        { pattern: '^date_', matchType: 'prefix' },   // date_published
        { pattern: '_timestamp$', matchType: 'suffix' } // last_timestamp
      ],
      // Numeric patterns for special handling
      numericPatterns: [
        { pattern: '_count$', matchType: 'suffix' },  // view_count, like_count
        { pattern: '^num_', matchType: 'prefix' }     // num_items
      ]
    }
  });

  return (
    <div>
      <h3>Discovered Fields</h3>
      <ul>
        {discovery.facetConfigs.map(config => (
          <li key={config.field}>
            {config.label} ({config.type})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Multi-Collection Search Examples

### Basic Multi-Collection Search

```typescript
import { useMultiCollectionSearch } from 'typesense-react';

function MultiCollectionSearchExample() {
  const multiSearch = useMultiCollectionSearch(typesenseClient, {
    defaultCollections: [
      {
        name: 'products',
        query_by: 'name,description,category',
        weight: 2
      },
      {
        name: 'articles',
        query_by: 'title,content,tags',
        weight: 1
      },
      {
        name: 'documents',
        query_by: 'title,content',
        weight: 1
      }
    ],
    defaultMergeStrategy: 'relevance',
    debounceMs: 300
  });

  return (
    <div>
      <input
        type="text"
        value={multiSearch.query}
        onChange={(e) => multiSearch.setQuery(e.target.value)}
        placeholder="Search everything..."
      />

      {multiSearch.loading && <div>Searching multiple collections...</div>}

      {/* Display merged results */}
      {multiSearch.results?.mergedHits.map((hit, index) => (
        <div key={index} className={`result-${hit.collection}`}>
          <span className="collection-badge">{hit.collection}</span>
          <h3>{hit.document.title || hit.document.name}</h3>
          <p>Score: {hit.score.toFixed(2)}</p>
        </div>
      ))}

      {/* Collection statistics */}
      <div>
        {Object.entries(multiSearch.getCollectionStats()).map(([collection, stats]) => (
          <div key={collection}>
            {collection}: {stats.included} results in {stats.searchTime}ms
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Dynamic Collection Selection

```typescript
function DynamicMultiSearch() {
  const [selectedCollections, setSelectedCollections] = useState(['products', 'articles']);
  
  const multiSearch = useMultiCollectionSearch(typesenseClient, {
    searchOnMount: false
  });

  const handleSearch = () => {
    const collections = selectedCollections.map(name => ({
      name,
      query_by: name === 'products' ? 'name,description' : 'title,content',
      weight: name === 'products' ? 2 : 1
    }));

    multiSearch.updateCollections(collections);
    multiSearch.search(multiSearch.query);
  };

  return (
    <div>
      {/* Collection selector */}
      <div>
        {['products', 'articles', 'documents', 'users'].map(collection => (
          <label key={collection}>
            <input
              type="checkbox"
              checked={selectedCollections.includes(collection)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedCollections([...selectedCollections, collection]);
                } else {
                  setSelectedCollections(selectedCollections.filter(c => c !== collection));
                }
              }}
            />
            {collection}
          </label>
        ))}
      </div>

      <input
        type="text"
        value={multiSearch.query}
        onChange={(e) => multiSearch.setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      
      <button onClick={handleSearch}>Search Selected Collections</button>

      {/* Results grouped by collection */}
      {multiSearch.results?.collectionResults.map(result => (
        <div key={result.collection}>
          <h3>{result.collection} ({result.found} results)</h3>
          {result.hits.map(hit => (
            <div key={hit.document.id}>
              {hit.document.title || hit.document.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Date Filtering Examples

### Date Range Picker

```typescript
import { useDateFilter } from 'typesense-react';

function DateRangeFilter() {
  const dateFilter = useDateFilter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div>
      <h3>Date Range</h3>
      
      {/* Preset buttons */}
      <div>
        <button onClick={() => dateFilter.applyPreset('created_at', 'today')}>
          Today
        </button>
        <button onClick={() => dateFilter.applyPreset('created_at', 'last7Days')}>
          Last 7 Days
        </button>
        <button onClick={() => dateFilter.applyPreset('created_at', 'thisMonth')}>
          This Month
        </button>
        <button onClick={() => dateFilter.applyPreset('created_at', 'lastMonth')}>
          Last Month
        </button>
        <button onClick={() => dateFilter.applyPreset('created_at', 'thisYear')}>
          This Year
        </button>
      </div>

      {/* Custom date range */}
      <div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button
          onClick={() => {
            if (startDate && endDate) {
              dateFilter.setDateRange('created_at', new Date(startDate), new Date(endDate));
            }
          }}
        >
          Apply Custom Range
        </button>
      </div>

      {/* Relative date filters */}
      <div>
        <button onClick={() => dateFilter.setLastNDays('created_at', 30)}>
          Last 30 Days
        </button>
        <button onClick={() => dateFilter.setLastNMonths('created_at', 3)}>
          Last 3 Months
        </button>
      </div>

      {/* Clear filter */}
      {dateFilter.hasDateFilter('created_at') && (
        <button onClick={() => dateFilter.clearDateFilter('created_at')}>
          Clear Date Filter
        </button>
      )}
    </div>
  );
}
```

### Multiple Date Field Filters

```typescript
function MultipleDateFilters() {
  const createdFilter = useDateFieldFilter('created_at');
  const modifiedFilter = useDateFieldFilter('modified_at');
  const publishedFilter = useDateFieldFilter('published_at');

  return (
    <div>
      {/* Created date filter */}
      <div>
        <h4>Created Date</h4>
        <button onClick={() => createdFilter.applyPreset('last7Days')}>
          Last 7 Days
        </button>
        <button onClick={() => createdFilter.clear()}>
          Clear
        </button>
      </div>

      {/* Modified date filter */}
      <div>
        <h4>Modified Date</h4>
        <button onClick={() => modifiedFilter.setCurrentMonth()}>
          This Month
        </button>
        <button onClick={() => modifiedFilter.clear()}>
          Clear
        </button>
      </div>

      {/* Published date filter */}
      <div>
        <h4>Published Date</h4>
        <button onClick={() => publishedFilter.setAfterDate(new Date('2024-01-01'))}>
          After Jan 1, 2024
        </button>
        <button onClick={() => publishedFilter.clear()}>
          Clear
        </button>
      </div>
    </div>
  );
}
```

---

## Numeric Range Examples

### Price Range Slider

```typescript
import { useNumericFacetRange } from 'typesense-react';

function PriceRangeSlider() {
  const priceRange = useNumericFacetRange('price');

  if (!priceRange.bounds) {
    return <div>Loading price range...</div>;
  }

  return (
    <div>
      <h3>Price Range</h3>
      <div>
        ${priceRange.min || priceRange.bounds.min} - ${priceRange.max || priceRange.bounds.max}
      </div>
      
      <input
        type="range"
        min={priceRange.bounds.min}
        max={priceRange.bounds.max}
        value={priceRange.min || priceRange.bounds.min}
        onChange={(e) => priceRange.setRange(Number(e.target.value), priceRange.max)}
      />
      
      <input
        type="range"
        min={priceRange.bounds.min}
        max={priceRange.bounds.max}
        value={priceRange.max || priceRange.bounds.max}
        onChange={(e) => priceRange.setRange(priceRange.min, Number(e.target.value))}
      />
      
      {priceRange.hasRange && (
        <button onClick={() => priceRange.clearRange()}>
          Reset to full range
        </button>
      )}
    </div>
  );
}
```

### Multiple Numeric Ranges

```typescript
function MultipleNumericRanges() {
  const priceRange = useNumericFacetRange('price');
  const ratingRange = useNumericFacetRange('rating');
  const stockRange = useNumericFacetRange('stock_quantity');

  return (
    <div>
      {/* Price filter */}
      <div>
        <h4>Price</h4>
        <input
          type="number"
          placeholder="Min"
          value={priceRange.min || ''}
          onChange={(e) => priceRange.setRange(Number(e.target.value), priceRange.max)}
        />
        <input
          type="number"
          placeholder="Max"
          value={priceRange.max || ''}
          onChange={(e) => priceRange.setRange(priceRange.min, Number(e.target.value))}
        />
      </div>

      {/* Rating filter */}
      <div>
        <h4>Minimum Rating</h4>
        <select
          value={ratingRange.min || ''}
          onChange={(e) => ratingRange.setRange(Number(e.target.value), undefined)}
        >
          <option value="">Any</option>
          <option value="1">1+ Stars</option>
          <option value="2">2+ Stars</option>
          <option value="3">3+ Stars</option>
          <option value="4">4+ Stars</option>
          <option value="5">5 Stars</option>
        </select>
      </div>

      {/* Stock filter */}
      <div>
        <h4>In Stock</h4>
        <button
          onClick={() => stockRange.setRange(1, undefined)}
          className={stockRange.min === 1 ? 'active' : ''}
        >
          In Stock Only
        </button>
        <button onClick={() => stockRange.clearRange()}>
          Show All
        </button>
      </div>
    </div>
  );
}
```

---

## State Management Examples

### Facet UI State Management

```typescript
import { useFacetState } from 'typesense-react';

function ExpandableFacet({ field, label, values }) {
  const facetState = useFacetState();
  const state = facetState.getFacetState(field);

  // Filter values based on search
  const filteredValues = values.filter(v =>
    v.value.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  return (
    <div>
      <h3
        onClick={() => facetState.toggleFacetExpansion(field)}
        style={{ cursor: 'pointer' }}
      >
        {label} {state.isExpanded ? '−' : '+'}
      </h3>
      
      {state.isExpanded && (
        <>
          {/* Search within facet */}
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => facetState.setFacetSearch(field, e.target.value)}
            placeholder={`Search ${label}...`}
          />
          
          {/* Scrollable value list */}
          <div
            style={{ maxHeight: '200px', overflowY: 'auto' }}
            onScroll={(e) => facetState.setFacetScroll(field, e.target.scrollTop)}
          >
            {filteredValues.map(({ value, count }) => (
              <label key={value}>
                <input type="checkbox" />
                {value} ({count})
              </label>
            ))}
          </div>
          
          <button onClick={() => facetState.resetFacetState(field)}>
            Reset
          </button>
        </>
      )}
    </div>
  );
}
```

### Accumulated Facets

```typescript
import { useAccumulatedFacets } from 'typesense-react';

function AccumulatedFacetList({ field, activeValues = [] }) {
  const accumulated = useAccumulatedFacets();

  // Configure accumulation behavior
  useEffect(() => {
    accumulated.setAccumulateFacets(true);
    accumulated.setMoveSelectedToTop(true);
    accumulated.setReorderByCount(true);
    accumulated.setFacetOptionLimit(100);
  }, []);

  const mergedValues = accumulated.getMergedFacetValues(field, activeValues);

  return (
    <div>
      <h3>{field}</h3>
      
      {/* Show active filters first */}
      {mergedValues
        .filter(v => activeValues.includes(v.value))
        .map(({ value, count }) => (
          <label key={value} style={{ fontWeight: 'bold' }}>
            <input type="checkbox" checked={true} />
            {value} ({count})
          </label>
        ))}
      
      {/* Show other options */}
      {mergedValues
        .filter(v => !activeValues.includes(v.value))
        .map(({ value, count }) => (
          <label key={value}>
            <input type="checkbox" checked={false} />
            {value} ({count})
          </label>
        ))}
      
      <div>
        Total options: {mergedValues.length}
        {accumulated.isAccumulatingFacets && ' (accumulated)'}
      </div>
    </div>
  );
}
```

### Additional Filters

```typescript
import { useAdditionalFilters } from 'typesense-react';

function AdditionalFilterPanel() {
  const filters = useAdditionalFilters();
  const [filterInput, setFilterInput] = useState('');

  const addFilter = () => {
    const validation = filters.validateFilter(filterInput);
    if (validation.isValid) {
      // Parse and add the filter
      const [field, ...rest] = filterInput.split(':');
      filters.setFilter(field, rest.join(':'));
      setFilterInput('');
    } else {
      alert(`Invalid filter: ${validation.error}`);
    }
  };

  return (
    <div>
      <h3>Additional Filters</h3>
      
      {/* Quick filters */}
      <div>
        <button onClick={() => filters.setFilter('in_stock', 'true')}>
          In Stock Only
        </button>
        <button onClick={() => filters.setFilter('featured', 'true')}>
          Featured Only
        </button>
        <button onClick={() => filters.setFilter('discount', '>0')}>
          On Sale
        </button>
      </div>

      {/* Custom filter input */}
      <div>
        <input
          type="text"
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          placeholder="field:value"
        />
        <button onClick={addFilter}>Add Filter</button>
      </div>

      {/* Active filters */}
      <div>
        {Array.from(filters.filters.entries()).map(([field, filter]) => (
          <div key={field}>
            {field}: {filter}
            <button onClick={() => filters.removeFilter(field)}>×</button>
          </div>
        ))}
      </div>

      {/* Combined filter string */}
      {filters.filterString && (
        <div>
          <code>{filters.filterString}</code>
          <button onClick={() => filters.clearFilters()}>Clear All</button>
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling Examples

### Global Error Handling

```typescript
function SearchWithErrorBoundary() {
  const { state, actions, error } = useSearch({
    onSearchError: (error) => {
      // Log to error tracking
      console.error('Search error:', error);
      
      // Track in analytics
      trackEvent('search_error', {
        error: error.message,
        query: state.query
      });
    }
  });

  if (error) {
    return (
      <div className="error-state">
        <h3>Search Error</h3>
        <p>{error.message}</p>
        <button onClick={() => actions.search()}>
          Retry Search
        </button>
        <button onClick={() => actions.reset()}>
          Reset Search
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Normal search UI */}
    </div>
  );
}
```

### Specific Error Handling

```typescript
function RobustSearch() {
  const [networkError, setNetworkError] = useState(false);
  const [authError, setAuthError] = useState(false);

  const { state, actions } = useSearch({
    onSearchError: (error) => {
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        setNetworkError(true);
      } else if (error.message.includes('401') || error.message.includes('403')) {
        setAuthError(true);
      }
    },
    onSearchSuccess: () => {
      setNetworkError(false);
      setAuthError(false);
    }
  });

  if (networkError) {
    return (
      <div className="error-network">
        <p>Unable to connect to search service</p>
        <button onClick={() => {
          setNetworkError(false);
          actions.search();
        }}>
          Try Again
        </button>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="error-auth">
        <p>Authentication required</p>
        <button onClick={() => window.location.href = '/login'}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Normal search UI */}
    </div>
  );
}
```

### Fallback UI

```typescript
function SearchWithFallback() {
  const { state, actions, loading, error } = useSearch();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Show fallback after 5 seconds of loading
    if (loading) {
      const timer = setTimeout(() => setShowFallback(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
    }
  }, [loading]);

  if (error || showFallback) {
    return (
      <div className="search-fallback">
        <h3>Search Unavailable</h3>
        <p>Browse our categories instead:</p>
        <ul>
          <li><a href="/category/electronics">Electronics</a></li>
          <li><a href="/category/clothing">Clothing</a></li>
          <li><a href="/category/books">Books</a></li>
        </ul>
      </div>
    );
  }

  return (
    <div>
      {loading && <div>Searching...</div>}
      {/* Normal search results */}
    </div>
  );
}
```

---

## Complete Example: E-commerce Search

```typescript
import {
  SearchProvider,
  useSearch,
  useAdvancedFacets,
  useSchemaDiscovery,
  useAccumulatedFacets,
  useDateFilter,
  useAdditionalFilters
} from 'typesense-react';

function EcommerceSearch() {
  return (
    <SearchProvider
      client={typesenseClient}
      collection="products"
      config={{
        enableDisjunctiveFacetQueries: true,
        facets: [
          { field: 'category', type: 'checkbox', disjunctive: true },
          { field: 'brand', type: 'checkbox', disjunctive: true },
          { field: 'price', type: 'range' },
          { field: 'rating', type: 'range' },
          { field: 'created_at', type: 'date' }
        ]
      }}
    >
      <SearchInterface />
    </SearchProvider>
  );
}

function SearchInterface() {
  const search = useSearch({ debounceMs: 300 });
  const facets = useAdvancedFacets();
  const accumulated = useAccumulatedFacets();
  const dateFilter = useDateFilter();
  const additionalFilters = useAdditionalFilters();

  // Enable accumulation
  useEffect(() => {
    accumulated.setAccumulateFacets(true);
    accumulated.setMoveSelectedToTop(true);
  }, []);

  return (
    <div className="search-page">
      {/* Search Header */}
      <header>
        <input
          type="text"
          value={search.state.query}
          onChange={(e) => search.actions.setQuery(e.target.value)}
          placeholder="Search products..."
        />
        
        <select
          value={search.state.sortBy}
          onChange={(e) => search.actions.setSortBy(e.target.value)}
        >
          <option value="">Relevance</option>
          <option value="price:asc">Price: Low to High</option>
          <option value="price:desc">Price: High to Low</option>
          <option value="rating:desc">Highest Rated</option>
          <option value="created_at:desc">Newest</option>
        </select>
      </header>

      <div className="search-body">
        {/* Filters Sidebar */}
        <aside className="filters">
          {/* Category Filter */}
          <div className="filter-group">
            <h3>Category</h3>
            {search.state.results?.facet_counts
              ?.find(f => f.field_name === 'category')
              ?.counts.map(({ value, count }) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={facets.disjunctiveFacets.category?.includes(value)}
                    onChange={() => facets.actions.toggleFacetValue('category', value)}
                  />
                  {value} ({count})
                </label>
              ))}
          </div>

          {/* Price Range */}
          <div className="filter-group">
            <h3>Price</h3>
            <input
              type="number"
              placeholder="Min"
              onChange={(e) => 
                facets.actions.setNumericFilter('price', Number(e.target.value), undefined)
              }
            />
            <input
              type="number"
              placeholder="Max"
              onChange={(e) => 
                facets.actions.setNumericFilter('price', undefined, Number(e.target.value))
              }
            />
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <h3>Added</h3>
            <button onClick={() => dateFilter.applyPreset('created_at', 'last7Days')}>
              Last Week
            </button>
            <button onClick={() => dateFilter.applyPreset('created_at', 'last30Days')}>
              Last Month
            </button>
          </div>

          {/* Additional Filters */}
          <div className="filter-group">
            <h3>More Filters</h3>
            <label>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    additionalFilters.setFilter('in_stock', 'true');
                  } else {
                    additionalFilters.removeFilter('in_stock');
                  }
                }}
              />
              In Stock Only
            </label>
          </div>

          {/* Clear All */}
          <button 
            onClick={() => {
              search.actions.clearAllFilters();
              facets.actions.clearAllFilters();
              additionalFilters.clearFilters();
            }}
          >
            Clear All Filters ({facets.activeFilterCount})
          </button>
        </aside>

        {/* Results */}
        <main className="results">
          {search.loading && <div>Loading...</div>}
          
          <div className="results-info">
            Showing {search.state.results?.hits?.length || 0} of {search.state.results?.found || 0} results
          </div>

          <div className="product-grid">
            {search.state.results?.hits?.map((hit) => (
              <div key={hit.document.id} className="product-card">
                <img src={hit.document.image} alt={hit.document.name} />
                <h3>{hit.document.name}</h3>
                <p className="price">${hit.document.price}</p>
                <p className="rating">★ {hit.document.rating}</p>
                <button>Add to Cart</button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => search.actions.setPage(search.state.page - 1)}
              disabled={search.state.page === 1}
            >
              Previous
            </button>
            
            <span>Page {search.state.page}</span>
            
            <button
              onClick={() => search.actions.setPage(search.state.page + 1)}
              disabled={!search.state.results || 
                search.state.page * search.state.perPage >= search.state.results.found}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
```