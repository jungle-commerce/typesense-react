# Basic Search

Now that you have a simple search working, let's explore more search features and enhance the user experience.

## What We'll Learn

- Search highlighting
- Controlling which fields to search
- Customizing result display
- Search suggestions (autocomplete)
- Handling empty states

## Enhanced Search Component

Let's build a more feature-rich search experience:

```tsx
import React from 'react';
import { SearchProvider, useSearch } from '@jungle-commerce/typesense-react';
import type { SearchHit } from '@jungle-commerce/typesense-react';

// Define your document type
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  in_stock: boolean;
}

// Enhanced search component
function EnhancedSearch() {
  const { state, actions } = useSearch<Product>();

  // Helper to render highlighted text
  const renderHighlight = (hit: SearchHit<Product>, field: keyof Product) => {
    const highlight = hit.highlights?.find(h => h.field === field);
    if (highlight?.snippets?.[0]) {
      return <span dangerouslySetInnerHTML={{ __html: highlight.snippets[0] }} />;
    }
    return <span>{hit.document[field]}</span>;
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h1>Product Search</h1>
        
        <input
          type="text"
          value={state.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Search for products..."
          className="search-input"
          autoFocus
        />
        
        {/* Search stats */}
        {state.results && state.query && (
          <div className="search-stats">
            Found {state.results.found} results in {state.results.search_time_ms}ms
          </div>
        )}
      </div>

      {/* Loading state */}
      {state.loading && (
        <div className="loading">
          <span className="spinner">⟳</span> Searching...
        </div>
      )}

      {/* Error state */}
      {state.error && (
        <div className="error-message">
          <strong>Error:</strong> {state.error.message}
          <button onClick={() => actions.clearError()}>Dismiss</button>
        </div>
      )}

      {/* Empty state - no query */}
      {!state.query && !state.loading && (
        <div className="empty-state">
          <h3>Start searching!</h3>
          <p>Try searching for "laptop", "mouse", or "USB"</p>
        </div>
      )}

      {/* No results */}
      {state.results?.found === 0 && (
        <div className="no-results">
          <h3>No results found for "{state.query}"</h3>
          <p>Try different keywords or check your spelling</p>
        </div>
      )}

      {/* Search results */}
      {state.results && state.results.found > 0 && (
        <div className="search-results">
          {state.results.hits.map(hit => (
            <div key={hit.document.id} className="result-card">
              <h3>{renderHighlight(hit, 'name')}</h3>
              <p className="description">
                {renderHighlight(hit, 'description')}
              </p>
              
              <div className="result-details">
                <span className="price">${hit.document.price.toFixed(2)}</span>
                <span className="category">{hit.document.category}</span>
                <span className="brand">{hit.document.brand}</span>
                <span className={`stock ${hit.document.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                  {hit.document.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                </span>
              </div>
              
              {/* Relevance score (for debugging) */}
              {process.env.NODE_ENV === 'development' && (
                <small className="debug-info">
                  Score: {hit.text_match}
                </small>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// App component with search configuration
function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      searchOnMount={false}
      debounceMs={200}
      initialSearchParams={{
        query_by: 'name,description,category,brand',
        per_page: 12,
        highlight_fields: 'name,description',
        highlight_start_tag: '<mark>',
        highlight_end_tag: '</mark>',
        highlight_affix_num_tokens: 10
      }}
    >
      <EnhancedSearch />
    </SearchProvider>
  );
}

export default App;
```

## Key Features Explained

### 1. Search Highlighting

Typesense provides search highlighting to show which parts of the document matched:

```tsx
// Configure highlighting in SearchProvider
initialSearchParams={{
  highlight_fields: 'name,description',    // Fields to highlight
  highlight_start_tag: '<mark>',           // HTML tag for highlight start
  highlight_end_tag: '</mark>',            // HTML tag for highlight end
  highlight_affix_num_tokens: 10          // Context around matches
}}
```

The highlights are available in each hit:

```tsx
hit.highlights?.find(h => h.field === 'name')?.snippets?.[0]
```

### 2. Controlling Search Fields

Use `query_by` to specify which fields to search:

```tsx
initialSearchParams={{
  query_by: 'name,description,category,brand'  // Search these fields
}}
```

You can also weight fields differently:

```tsx
initialSearchParams={{
  query_by: 'name,description,category',
  query_by_weights: '3,2,1'  // name is 3x more important than category
}}
```

### 3. Search Options

Fine-tune search behavior:

```tsx
initialSearchParams={{
  // Typo tolerance
  num_typos: 2,                    // Allow up to 2 typos
  min_len_1typo: 4,               // Min length for 1 typo
  min_len_2typo: 7,               // Min length for 2 typos
  
  // Prefix search
  prefix: true,                    // Enable prefix matching
  
  // Performance
  search_cutoff_ms: 100,          // Stop search after 100ms
  exhaustive_search: false        // Use optimized search
}}
```

## Adding CSS Styles

Here's the CSS for the enhanced search:

```css
/* styles.css */
.search-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.search-header {
  margin-bottom: 30px;
}

.search-input {
  width: 100%;
  padding: 16px 20px;
  font-size: 18px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.search-stats {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  background-color: #fee;
  border: 1px solid #fcc;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state,
.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.search-results {
  display: grid;
  gap: 20px;
}

.result-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s;
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.result-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.result-card .description {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.5;
}

.result-details {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  font-size: 14px;
}

.price {
  font-weight: bold;
  color: #007bff;
  font-size: 18px;
}

.category,
.brand {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.stock {
  font-weight: 500;
}

.stock.in-stock {
  color: #28a745;
}

.stock.out-of-stock {
  color: #dc3545;
}

/* Highlight styling */
mark {
  background-color: #ffeb3b;
  padding: 0 2px;
  border-radius: 2px;
}

.debug-info {
  display: block;
  margin-top: 10px;
  color: #999;
}
```

## Advanced Search Features

### 1. Search Suggestions

Implement basic autocomplete using facets:

```tsx
function SearchWithSuggestions() {
  const { state, actions } = useSearch<Product>();
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Get unique categories from results
  const suggestions = React.useMemo(() => {
    if (!state.results?.facet_counts) return [];
    
    const categoryFacet = state.results.facet_counts.find(
      f => f.field_name === 'category'
    );
    
    return categoryFacet?.counts.slice(0, 5) || [];
  }, [state.results]);

  return (
    <div className="search-with-suggestions">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={state.query}
          onChange={(e) => {
            actions.setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search products..."
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map(suggestion => (
              <div
                key={suggestion.value}
                className="suggestion-item"
                onClick={() => {
                  actions.setQuery(suggestion.value);
                  setShowSuggestions(false);
                }}
              >
                {suggestion.value}
                <span className="suggestion-count">({suggestion.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Instant Search Toggle

Let users control when searches happen:

```tsx
function SearchWithToggle() {
  const { state, actions } = useSearch<Product>();
  const [instantSearch, setInstantSearch] = React.useState(true);
  const [pendingQuery, setPendingQuery] = React.useState('');

  const handleInputChange = (value: string) => {
    if (instantSearch) {
      actions.setQuery(value);
    } else {
      setPendingQuery(value);
    }
  };

  const handleSearch = () => {
    if (!instantSearch) {
      actions.setQuery(pendingQuery);
    }
  };

  return (
    <div>
      <div className="search-controls">
        <input
          type="text"
          value={instantSearch ? state.query : pendingQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        
        {!instantSearch && (
          <button onClick={handleSearch}>Search</button>
        )}
        
        <label>
          <input
            type="checkbox"
            checked={instantSearch}
            onChange={(e) => setInstantSearch(e.target.checked)}
          />
          Instant search
        </label>
      </div>
    </div>
  );
}
```

## Performance Tips

### 1. Limit Fields Returned

Only fetch fields you need:

```tsx
initialSearchParams={{
  include_fields: 'id,name,price,category',  // Only these fields
  // OR
  exclude_fields: 'long_description,metadata' // Exclude heavy fields
}}
```

### 2. Optimize Highlighting

Limit highlighting to essential fields:

```tsx
initialSearchParams={{
  highlight_fields: 'name',              // Only highlight name
  highlight_affix_num_tokens: 5,        // Less context = faster
  snippet_threshold: 30                  // Limit snippet length
}}
```

### 3. Use Search Cutoffs

For large datasets, limit search time:

```tsx
initialSearchParams={{
  search_cutoff_ms: 50,     // Stop after 50ms
  limit_hits: 100           // Max results to process
}}
```

## Common Patterns

### Empty Query Handling

Show featured products when there's no query:

```tsx
{!state.query && !state.loading && (
  <div className="featured-products">
    <h3>Featured Products</h3>
    {/* Show static featured products */}
  </div>
)}
```

### Search Analytics

Track what users search for:

```tsx
const { state, actions } = useSearch({
  onSearchSuccess: (results) => {
    // Track successful searches
    analytics.track('search', {
      query: state.query,
      results: results.found,
      time: results.search_time_ms
    });
  },
  onSearchError: (error) => {
    // Track search errors
    analytics.track('search_error', {
      query: state.query,
      error: error.message
    });
  }
});
```

## Next Steps

You now have a fully-featured search interface! In the next guide, we'll add filters to help users narrow down results.

### Key Takeaways

1. Use highlighting to show matched terms
2. Control which fields to search with `query_by`
3. Handle all UI states: loading, error, empty, no results
4. Optimize performance by limiting fields and using cutoffs
5. Consider adding search suggestions for better UX

---

[← Hello World](./02-hello-world.md) | [Next: Adding Filters →](./04-adding-filters.md)