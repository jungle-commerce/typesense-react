# Claude-Specific Examples for typesense-react

This document provides examples formatted specifically for Claude to help developers implement common search patterns.

## Example 1: E-commerce Product Search

**User Question**: "How do I build a product search with filters for an e-commerce site?"

```tsx
import { 
  SearchProvider, 
  useSearch, 
  useAdvancedFacets,
  useSchemaDiscovery 
} from '@jungle-commerce/typesense-react';

function EcommerceSearch() {
  // Auto-discover schema
  const { schema, facets } = useSchemaDiscovery({
    collection: 'products',
    enabled: true,
    facetConfig: {
      autoDetectDisjunctive: true,
      autoDetectNumeric: true,
      customTypeDetection: {
        select: (field) => field.name === 'availability' || field.name === 'condition'
      }
    }
  });

  if (!schema) return <div>Loading...</div>;

  const config = {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'xyz'
  };

  return (
    <SearchProvider
      config={config}
      collection="products"
      facets={[
        { field: 'category', label: 'Category', type: 'checkbox', disjunctive: true },
        { field: 'brand', label: 'Brand', type: 'checkbox', disjunctive: true },
        { field: 'price', label: 'Price', type: 'numeric', numericDisplay: 'range' },
        { field: 'rating', label: 'Rating', type: 'numeric', numericDisplay: 'checkbox' },
        { field: 'availability', label: 'Availability', type: 'select' }
      ]}
      initialState={{
        perPage: 24,
        sortBy: 'popularity:desc',
        additionalFilters: 'in_stock:true'
      }}
      searchOnMount={true}
      accumulateFacets={true}
    >
      <div className="search-layout">
        <Filters />
        <Results />
      </div>
    </SearchProvider>
  );
}

function Filters() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();

  return (
    <aside className="filters">
      <h3>Filters ({facets.activeFilterCount} active)</h3>
      
      {/* Category Filter */}
      <div className="filter-group">
        <h4>Category</h4>
        {state.results?.facet_counts?.find(f => f.field_name === 'category')?.counts.map(item => (
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

      {/* Price Range */}
      <div className="filter-group">
        <h4>Price Range</h4>
        <input
          type="range"
          min="0"
          max="1000"
          value={facets.numericFilters.price?.min || 0}
          onChange={(e) => facets.actions.setNumericFilter(
            'price',
            Number(e.target.value),
            facets.numericFilters.price?.max || 1000
          )}
        />
        <span>${facets.numericFilters.price?.min || 0} - ${facets.numericFilters.price?.max || 1000}</span>
      </div>

      {/* Clear All */}
      <button onClick={() => facets.actions.clearAllFilters()}>
        Clear All Filters
      </button>
    </aside>
  );
}

function Results() {
  const { state, actions } = useSearch();

  return (
    <main className="results">
      {/* Search Bar */}
      <input
        type="search"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
      />

      {/* Sort Options */}
      <select value={state.sortBy} onChange={(e) => actions.setSortBy(e.target.value)}>
        <option value="">Relevance</option>
        <option value="price:asc">Price: Low to High</option>
        <option value="price:desc">Price: High to Low</option>
        <option value="rating:desc">Highest Rated</option>
        <option value="created_at:desc">Newest First</option>
      </select>

      {/* Results Grid */}
      <div className="products-grid">
        {state.results?.hits.map(hit => (
          <ProductCard key={hit.document.id} product={hit.document} highlight={hit.highlight} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination />
    </main>
  );
}
```

## Example 2: Documentation Search with Highlighting

**User Question**: "How do I create a documentation search with highlighted results?"

```tsx
function DocumentationSearch() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="docs"
      initialSearchParams={{
        query_by: 'title,content,tags',
        highlight_fields: 'title,content',
        highlight_affix_num_tokens: 10,
        highlight_start_tag: '<mark>',
        highlight_end_tag: '</mark>',
        snippet_threshold: 30
      }}
      facets={[
        { field: 'category', label: 'Category', type: 'checkbox', disjunctive: true },
        { field: 'version', label: 'Version', type: 'select' },
        { field: 'tags', label: 'Tags', type: 'checkbox', disjunctive: true }
      ]}
    >
      <DocsSearchInterface />
    </SearchProvider>
  );
}

function DocsSearchInterface() {
  const { state, actions } = useSearch();
  const [searchMode, setSearchMode] = useState<'instant' | 'manual'>('instant');

  // Instant search with debouncing
  const handleSearch = (query: string) => {
    if (searchMode === 'instant') {
      actions.setQuery(query);
    }
  };

  return (
    <div className="docs-search">
      {/* Search Input */}
      <div className="search-bar">
        <input
          value={state.query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search documentation..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && searchMode === 'manual') {
              actions.search(state.query);
            }
          }}
        />
        <button onClick={() => setSearchMode(searchMode === 'instant' ? 'manual' : 'instant')}>
          {searchMode === 'instant' ? 'Instant' : 'Manual'} Search
        </button>
      </div>

      {/* Results with Highlighting */}
      <div className="search-results">
        {state.loading && <div>Searching...</div>}
        
        {state.results?.hits.map(hit => (
          <article key={hit.document.id} className="doc-result">
            <h3 dangerouslySetInnerHTML={{ 
              __html: hit.highlight?.title?.snippet || hit.document.title 
            }} />
            
            <div className="doc-meta">
              <span className="category">{hit.document.category}</span>
              <span className="version">v{hit.document.version}</span>
            </div>
            
            <p dangerouslySetInnerHTML={{ 
              __html: hit.highlight?.content?.snippet || hit.document.content.substring(0, 200) + '...'
            }} />
            
            <div className="tags">
              {hit.document.tags?.map((tag: string) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </article>
        ))}
        
        {state.results && state.results.found === 0 && (
          <div className="no-results">
            No results found for "{state.query}". 
            Try different keywords or browse the documentation.
          </div>
        )}
      </div>
    </div>
  );
}
```

## Example 3: Multi-Collection Global Search

**User Question**: "How do I search across products, blog posts, and FAQ items?"

```tsx
import { MultiCollectionProvider, useMultiCollectionContext } from '@jungle-commerce/typesense-react';

function GlobalSearch() {
  const collections = [
    {
      collection: 'products',
      queryBy: 'name,description,brand',
      weight: 2.0,
      maxResults: 10,
      namespace: 'product',
      includeFields: 'id,name,price,image_url,category'
    },
    {
      collection: 'blog_posts',
      queryBy: 'title,content,author',
      weight: 1.5,
      maxResults: 5,
      namespace: 'blog',
      includeFields: 'id,title,excerpt,author,published_date'
    },
    {
      collection: 'faqs',
      queryBy: 'question,answer',
      weight: 1.0,
      maxResults: 5,
      namespace: 'faq',
      includeFields: 'id,question,answer,category'
    }
  ];

  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={collections}
      searchOptions={{
        debounceMs: 200,
        minQueryLength: 2
      }}
    >
      <GlobalSearchInterface />
    </MultiCollectionProvider>
  );
}

function GlobalSearchInterface() {
  const { state, search, setQuery, clearResults } = useMultiCollectionContext();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (query: string) => {
    setQuery(query);
    if (query.length >= 2) {
      search({
        query,
        mergeStrategy: 'relevance',
        normalizeScores: true,
        resultMode: 'perCollection',
        enableHighlighting: true
      });
      setShowDropdown(true);
    } else {
      clearResults();
      setShowDropdown(false);
    }
  };

  return (
    <div className="global-search">
      <div className="search-container">
        <input
          value={state.query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search everything..."
          onFocus={() => state.results && setShowDropdown(true)}
        />
        
        {showDropdown && state.results && (
          <div className="search-dropdown">
            {Object.entries(state.results.hitsByCollection).map(([collection, hits]) => (
              <div key={collection} className="collection-section">
                <h4>{getCollectionLabel(collection)}</h4>
                
                {hits.length === 0 ? (
                  <p className="no-results">No results</p>
                ) : (
                  hits.map(hit => (
                    <SearchResult
                      key={`${collection}-${hit.document.id}`}
                      hit={hit}
                      collection={collection}
                      onClick={() => {
                        handleResultClick(hit, collection);
                        setShowDropdown(false);
                      }}
                    />
                  ))
                )}
                
                {hits.length === state.collections.find(c => c.collection === collection)?.maxResults && (
                  <a href={`/search?q=${state.query}&collection=${collection}`}>
                    View all {collection} results →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResult({ hit, collection, onClick }: any) {
  switch (collection) {
    case 'products':
      return (
        <div className="result product-result" onClick={onClick}>
          <img src={hit.document.image_url} alt={hit.document.name} />
          <div>
            <h5 dangerouslySetInnerHTML={{ 
              __html: hit.highlight?.name?.snippet || hit.document.name 
            }} />
            <p className="price">${hit.document.price}</p>
          </div>
        </div>
      );
      
    case 'blog_posts':
      return (
        <div className="result blog-result" onClick={onClick}>
          <h5 dangerouslySetInnerHTML={{ 
            __html: hit.highlight?.title?.snippet || hit.document.title 
          }} />
          <p className="meta">By {hit.document.author} • {formatDate(hit.document.published_date)}</p>
        </div>
      );
      
    case 'faqs':
      return (
        <div className="result faq-result" onClick={onClick}>
          <h5 dangerouslySetInnerHTML={{ 
            __html: hit.highlight?.question?.snippet || hit.document.question 
          }} />
          <p dangerouslySetInnerHTML={{ 
            __html: hit.highlight?.answer?.snippet || hit.document.answer.substring(0, 100) + '...'
          }} />
        </div>
      );
      
    default:
      return null;
  }
}
```

## Example 4: Autocomplete with Debouncing

**User Question**: "How do I implement autocomplete with product suggestions?"

```tsx
function ProductAutocomplete() {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      searchOnMount={false}
      initialSearchParams={{
        query_by: 'name,brand,category',
        prefix: true,
        num_typos: 1,
        per_page: 5,
        include_fields: 'id,name,brand,price,image_thumbnail'
      }}
    >
      <AutocompleteInput
        value={inputValue}
        onChange={setInputValue}
        suggestions={suggestions}
        onSuggestionsChange={setSuggestions}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
      />
    </SearchProvider>
  );
}

function AutocompleteInput({ 
  value, 
  onChange, 
  suggestions, 
  onSuggestionsChange,
  selectedIndex,
  onSelectedIndexChange 
}: any) {
  const { state, actions } = useSearch({
    debounceMs: 150, // Fast debounce for autocomplete
    onSearchSuccess: (results) => {
      const newSuggestions = results.hits.map(hit => ({
        id: hit.document.id,
        name: hit.document.name,
        brand: hit.document.brand,
        price: hit.document.price,
        image: hit.document.image_thumbnail,
        highlight: hit.highlight?.name?.snippet
      }));
      onSuggestionsChange(newSuggestions);
    }
  });

  // Handle search
  useEffect(() => {
    if (value.length >= 2) {
      actions.setQuery(value);
    } else {
      onSuggestionsChange([]);
    }
  }, [value]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onSelectedIndexChange(Math.min(selectedIndex + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        onSelectedIndexChange(Math.max(selectedIndex - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        onSuggestionsChange([]);
        onSelectedIndexChange(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: any) => {
    onChange(suggestion.name);
    onSuggestionsChange([]);
    onSelectedIndexChange(-1);
    // Navigate to product
    window.location.href = `/products/${suggestion.id}`;
  };

  return (
    <div className="autocomplete-container">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search for products..."
        aria-label="Product search"
        aria-autocomplete="list"
        aria-controls="autocomplete-results"
      />
      
      {state.loading && (
        <div className="loading-spinner" />
      )}
      
      {suggestions.length > 0 && (
        <ul 
          id="autocomplete-results" 
          className="autocomplete-dropdown"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={index === selectedIndex ? 'selected' : ''}
              onMouseEnter={() => onSelectedIndexChange(index)}
              onClick={() => selectSuggestion(suggestion)}
            >
              <img src={suggestion.image} alt="" />
              <div>
                <div 
                  className="suggestion-name"
                  dangerouslySetInnerHTML={{ 
                    __html: suggestion.highlight || suggestion.name 
                  }} 
                />
                <div className="suggestion-meta">
                  {suggestion.brand} • ${suggestion.price}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Example 5: Advanced Date Filtering

**User Question**: "How do I filter search results by date ranges?"

```tsx
import { useDateFilter, DateRangePresets } from '@jungle-commerce/typesense-react';

function EventSearch() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="events"
      facets={[
        { field: 'event_date', label: 'Date', type: 'date' },
        { field: 'category', label: 'Category', type: 'checkbox', disjunctive: true },
        { field: 'location', label: 'Location', type: 'select' }
      ]}
      initialSearchParams={{
        query_by: 'title,description,location'
      }}
    >
      <EventSearchInterface />
    </SearchProvider>
  );
}

function EventSearchInterface() {
  const { state, actions } = useSearch();
  const dateFilter = useDateFilter('event_date');
  const facets = useAdvancedFacets();

  return (
    <div className="event-search">
      {/* Search Input */}
      <input
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search events..."
      />

      {/* Date Filter Presets */}
      <div className="date-filter">
        <h4>When</h4>
        <button onClick={() => dateFilter.setToday()}>Today</button>
        <button onClick={() => dateFilter.setThisWeek()}>This Week</button>
        <button onClick={() => dateFilter.setThisMonth()}>This Month</button>
        <button onClick={() => dateFilter.setLastNDays(30)}>Next 30 Days</button>
        
        {/* Custom Date Range */}
        <div className="custom-range">
          <input
            type="date"
            value={dateFilter.startDate || ''}
            onChange={(e) => dateFilter.setDateRange(e.target.value, dateFilter.endDate)}
          />
          <span>to</span>
          <input
            type="date"
            value={dateFilter.endDate || ''}
            onChange={(e) => dateFilter.setDateRange(dateFilter.startDate, e.target.value)}
          />
        </div>
        
        {dateFilter.hasFilter && (
          <button onClick={() => dateFilter.clear()}>Clear Date Filter</button>
        )}
      </div>

      {/* Results */}
      <div className="event-results">
        {state.results?.hits.map(hit => (
          <EventCard key={hit.document.id} event={hit.document} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: any) {
  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <p className="date">{formatDate(event.event_date)}</p>
      <p className="location">{event.location}</p>
      <p className="description">{event.description}</p>
    </div>
  );
}
```

## Example 6: Search with URL State Sync

**User Question**: "How do I make search results shareable with URLs?"

```tsx
import { useSearchParams } from 'react-router-dom';

function ShareableSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse initial state from URL
  const initialState = {
    query: searchParams.get('q') || '',
    page: parseInt(searchParams.get('page') || '1'),
    sortBy: searchParams.get('sort') || '',
    additionalFilters: searchParams.get('filters') || undefined
  };

  // Parse facets from URL
  const initialFacets = {
    category: searchParams.get('category')?.split(',') || [],
    brand: searchParams.get('brand')?.split(',') || [],
    priceMin: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined,
    priceMax: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined
  };

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      initialState={initialState}
      searchOnMount={true}
    >
      <URLSyncedSearch 
        searchParams={searchParams} 
        setSearchParams={setSearchParams}
        initialFacets={initialFacets}
      />
    </SearchProvider>
  );
}

function URLSyncedSearch({ searchParams, setSearchParams, initialFacets }: any) {
  const { state, actions } = useSearch();
  const facets = useAdvancedFacets();

  // Initialize facets from URL
  useEffect(() => {
    if (initialFacets.category.length > 0) {
      initialFacets.category.forEach((cat: string) => {
        facets.actions.toggleFacetValue('category', cat);
      });
    }
    if (initialFacets.priceMin !== undefined || initialFacets.priceMax !== undefined) {
      facets.actions.setNumericFilter('price', initialFacets.priceMin, initialFacets.priceMax);
    }
  }, []);

  // Sync state to URL
  useEffect(() => {
    const params: any = {};
    
    if (state.query) params.q = state.query;
    if (state.page > 1) params.page = state.page.toString();
    if (state.sortBy) params.sort = state.sortBy;
    if (state.additionalFilters) params.filters = state.additionalFilters;
    
    // Add facets to URL
    if (facets.disjunctiveFacets.category?.length > 0) {
      params.category = facets.disjunctiveFacets.category.join(',');
    }
    if (facets.numericFilters.price) {
      if (facets.numericFilters.price.min !== undefined) {
        params.price_min = facets.numericFilters.price.min.toString();
      }
      if (facets.numericFilters.price.max !== undefined) {
        params.price_max = facets.numericFilters.price.max.toString();
      }
    }
    
    setSearchParams(params);
  }, [state, facets.disjunctiveFacets, facets.numericFilters]);

  return (
    <div>
      {/* Copy shareable link */}
      <button onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        alert('Search URL copied to clipboard!');
      }}>
        Share Search Results
      </button>
      
      {/* Rest of search interface */}
      <SearchInterface />
    </div>
  );
}
```

## Tips for Claude When Helping with These Examples

1. **Always check for TypeScript types** - The library is fully typed
2. **Suggest performance optimizations** when dealing with large datasets
3. **Recommend schema discovery** for new implementations
4. **Point out the headless nature** - no UI components provided
5. **Emphasize proper error handling** in production implementations
6. **Suggest using accumulateFacets** for better UX
7. **Mention caching options** for frequently searched data
8. **Highlight the importance of debouncing** for autocomplete

## Common Customizations

### Custom Facet Rendering

```tsx
const customFacetConfig: FacetConfig = {
  field: 'tags',
  label: 'Tags',
  type: 'custom',
  renderLabel: (value) => {
    // Custom label formatting
    return value.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
};
```

### Custom Filter Logic

```tsx
// Combine multiple filters with AND/OR logic
const customFilter = combineFilters([
  buildDisjunctiveFilter('category', ['Electronics', 'Computers']),
  'price:[100..500]',
  buildDateFilter('created_at', '2024-01-01', '2024-12-31')
], 'AND');

actions.setAdditionalFilters(customFilter);
```

### Performance Optimization

```tsx
<SearchProvider
  config={{
    ...typesenseConfig,
    cacheSearchResultsForSeconds: 300, // 5 minute cache
  }}
  performanceMode={true} // Disable expensive features
  enableDisjunctiveFacetQueries={false} // Reduce API calls
>
```