# Basic Search Tutorial

Let's build a complete product search application from scratch, step by step. By the end of this tutorial, you'll have a fully functional search interface with instant results, highlighting, and great user experience.

## What We're Building

A product search interface that includes:
- Instant search as you type
- Search result highlighting
- Loading and error states
- Empty state handling
- Responsive design
- Search analytics

## Prerequisites

- React application set up
- Typesense server running
- Basic familiarity with React hooks

## Step 1: Project Setup

First, install the required dependencies:

```bash
npm install @jungle-commerce/typesense-react typesense
```

Create a configuration file for Typesense:

```typescript
// src/config/typesense.ts
import type { TypesenseConfig } from '@jungle-commerce/typesense-react';

export const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: process.env.REACT_APP_TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.REACT_APP_TYPESENSE_PORT || '8108'),
    protocol: process.env.REACT_APP_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.REACT_APP_TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 2,
  cacheSearchResultsForSeconds: 60 * 5 // Cache for 5 minutes
};
```

## Step 2: Define Your Data Model

Create TypeScript interfaces for your documents:

```typescript
// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory?: string;
  brand: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  imageUrl: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductHit {
  document: Product;
  highlights?: Array<{
    field: string;
    snippets: string[];
  }>;
  text_match?: number;
}
```

## Step 3: Create Search Context

Set up the search provider in your app:

```tsx
// src/App.tsx
import React from 'react';
import { SearchProvider } from '@jungle-commerce/typesense-react';
import { typesenseConfig } from './config/typesense';
import ProductSearch from './components/ProductSearch';

function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      searchOnMount={true}
      debounceMs={200}
      initialSearchParams={{
        query_by: 'name,description,brand,category,tags',
        query_by_weights: '4,2,2,1,1',
        highlight_fields: 'name,description',
        highlight_start_tag: '<mark>',
        highlight_end_tag: '</mark>',
        per_page: 12,
        sort_by: '_text_match:desc,rating:desc'
      }}
    >
      <ProductSearch />
    </SearchProvider>
  );
}

export default App;
```

## Step 4: Build the Search Component

Create the main search interface:

```tsx
// src/components/ProductSearch.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';
import type { Product } from '../types/product';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';
import SearchStats from './SearchStats';
import './ProductSearch.css';

function ProductSearch() {
  const { state, actions } = useSearch<Product>();

  return (
    <div className="product-search">
      <header className="search-header">
        <h1>Product Search</h1>
        <SearchInput />
        <SearchStats />
      </header>

      <main className="search-main">
        <SearchResults />
      </main>
    </div>
  );
}

export default ProductSearch;
```

## Step 5: Create the Search Input

Build a polished search input with clear button:

```tsx
// src/components/SearchInput.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

function SearchInput() {
  const { state, actions } = useSearch();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = () => {
    actions.setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="search-input-wrapper">
      <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20">
        <path d="M10 2a8 8 0 105.293 14.707l5 5a1 1 0 001.414-1.414l-5-5A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
      </svg>
      
      <input
        ref={inputRef}
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search for products..."
        className="search-input"
        autoFocus
        aria-label="Search products"
      />
      
      {state.query && (
        <button
          onClick={handleClear}
          className="clear-button"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      )}
      
      {state.loading && (
        <div className="search-spinner" aria-label="Searching">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}

export default SearchInput;
```

## Step 6: Display Search Statistics

Show search performance metrics:

```tsx
// src/components/SearchStats.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

function SearchStats() {
  const { state } = useSearch();

  if (!state.results || !state.query) return null;

  return (
    <div className="search-stats">
      <span className="results-count">
        {state.results.found.toLocaleString()} results
      </span>
      <span className="search-time">
        in {state.results.search_time_ms}ms
      </span>
    </div>
  );
}

export default SearchStats;
```

## Step 7: Build the Results Display

Create a comprehensive results component:

```tsx
// src/components/SearchResults.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';
import type { Product } from '../types/product';
import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingState from './LoadingState';

function SearchResults() {
  const { state } = useSearch<Product>();

  // Error state
  if (state.error) {
    return <ErrorState error={state.error} />;
  }

  // Initial loading state
  if (state.loading && !state.results) {
    return <LoadingState />;
  }

  // Empty search state
  if (!state.query && !state.loading) {
    return <EmptyState type="no-query" />;
  }

  // No results state
  if (state.results?.found === 0) {
    return <EmptyState type="no-results" query={state.query} />;
  }

  // Results grid
  return (
    <div className="search-results">
      <div className="results-grid">
        {state.results?.hits.map(hit => (
          <ProductCard key={hit.document.id} hit={hit} />
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
```

## Step 8: Create the Product Card

Display individual search results with highlighting:

```tsx
// src/components/ProductCard.tsx
import React from 'react';
import type { SearchHit } from '@jungle-commerce/typesense-react';
import type { Product } from '../types/product';

interface ProductCardProps {
  hit: SearchHit<Product>;
}

function ProductCard({ hit }: ProductCardProps) {
  const { document, highlights } = hit;

  // Helper to render highlighted text
  const renderHighlight = (field: keyof Product) => {
    const highlight = highlights?.find(h => h.field === field);
    if (highlight?.snippets?.[0]) {
      return (
        <span 
          dangerouslySetInnerHTML={{ __html: highlight.snippets[0] }}
        />
      );
    }
    return <span>{String(document[field])}</span>;
  };

  // Calculate discount percentage
  const discountPercent = document.originalPrice 
    ? Math.round((1 - document.price / document.originalPrice) * 100)
    : 0;

  return (
    <article className="product-card">
      <div className="product-image-wrapper">
        <img 
          src={document.imageUrl} 
          alt={document.name}
          loading="lazy"
          className="product-image"
        />
        {!document.inStock && (
          <div className="out-of-stock-overlay">Out of Stock</div>
        )}
        {discountPercent > 0 && (
          <span className="discount-badge">-{discountPercent}%</span>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">
          {renderHighlight('name')}
        </h3>
        
        <p className="product-description">
          {renderHighlight('description')}
        </p>

        <div className="product-meta">
          <span className="product-brand">{document.brand}</span>
          <span className="product-category">{document.category}</span>
        </div>

        <div className="product-rating">
          <div className="stars" aria-label={`${document.rating} stars`}>
            {[...Array(5)].map((_, i) => (
              <span 
                key={i} 
                className={`star ${i < Math.floor(document.rating) ? 'filled' : ''}`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="review-count">({document.reviewCount})</span>
        </div>

        <div className="product-price">
          <span className="current-price">${document.price.toFixed(2)}</span>
          {document.originalPrice && (
            <span className="original-price">
              ${document.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        <button 
          className="add-to-cart-btn"
          disabled={!document.inStock}
          onClick={() => console.log('Add to cart:', document.id)}
        >
          {document.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
```

## Step 9: Handle Empty States

Create engaging empty states:

```tsx
// src/components/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  type: 'no-query' | 'no-results';
  query?: string;
}

function EmptyState({ type, query }: EmptyStateProps) {
  if (type === 'no-query') {
    return (
      <div className="empty-state">
        <svg className="empty-icon" viewBox="0 0 24 24" width="64" height="64">
          <path d="M10 2a8 8 0 105.293 14.707l5 5a1 1 0 001.414-1.414l-5-5A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
        </svg>
        <h2>Start searching</h2>
        <p>Find products by name, brand, or category</p>
        <div className="search-suggestions">
          <p>Popular searches:</p>
          <div className="suggestion-chips">
            <button className="suggestion-chip">Laptops</button>
            <button className="suggestion-chip">Headphones</button>
            <button className="suggestion-chip">Smartphones</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <svg className="empty-icon" viewBox="0 0 24 24" width="64" height="64">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <h2>No results found</h2>
      <p>We couldn't find any products matching "{query}"</p>
      <div className="no-results-tips">
        <p>Try:</p>
        <ul>
          <li>Checking your spelling</li>
          <li>Using different keywords</li>
          <li>Searching for broader terms</li>
        </ul>
      </div>
    </div>
  );
}

export default EmptyState;
```

## Step 10: Add Error Handling

Handle errors gracefully:

```tsx
// src/components/ErrorState.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

interface ErrorStateProps {
  error: Error;
}

function ErrorState({ error }: ErrorStateProps) {
  const { actions } = useSearch();

  return (
    <div className="error-state">
      <svg className="error-icon" viewBox="0 0 24 24" width="64" height="64">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button 
        onClick={() => {
          actions.clearError();
          actions.search();
        }}
        className="retry-button"
      >
        Try Again
      </button>
    </div>
  );
}

export default ErrorState;
```

## Step 11: Add Styles

Create a polished design:

```css
/* src/components/ProductSearch.css */

/* Layout */
.product-search {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-header {
  background-color: white;
  padding: 2rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-header h1 {
  text-align: center;
  margin: 0 0 1.5rem 0;
  font-size: 2rem;
  color: #333;
}

.search-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* Search Input */
.search-input-wrapper {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  fill: #666;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 1rem 3rem;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 50px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.clear-button {
  position: absolute;
  right: 3.5rem;
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  fill: #666;
  transition: fill 0.2s;
}

.clear-button:hover {
  fill: #333;
}

.search-spinner {
  position: absolute;
  right: 1rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Search Stats */
.search-stats {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.search-stats span {
  margin: 0 0.5rem;
}

/* Results Grid */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

/* Product Card */
.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-image-wrapper {
  position: relative;
  padding-top: 75%; /* 4:3 aspect ratio */
  background: #f5f5f5;
  overflow: hidden;
}

.product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.out-of-stock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.discount-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff4444;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: bold;
}

.product-info {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.product-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
}

.product-brand,
.product-category {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  color: #666;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stars {
  display: flex;
}

.star {
  color: #ddd;
  font-size: 1rem;
}

.star.filled {
  color: #ffa500;
}

.review-count {
  font-size: 0.875rem;
  color: #666;
}

.product-price {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  margin-top: auto;
}

.current-price {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.original-price {
  font-size: 1rem;
  color: #999;
  text-decoration: line-through;
}

.add-to-cart-btn {
  width: 100%;
  padding: 0.75rem;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.add-to-cart-btn:hover:not(:disabled) {
  background: #3367d6;
}

.add-to-cart-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Highlights */
mark {
  background: #fff3cd;
  padding: 0 2px;
  border-radius: 2px;
}

/* Empty States */
.empty-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon,
.error-icon {
  fill: #ccc;
  margin-bottom: 1.5rem;
}

.error-icon {
  fill: #f44336;
}

.empty-state h2,
.error-state h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #333;
}

.empty-state p,
.error-state p {
  color: #666;
  margin-bottom: 1.5rem;
}

.search-suggestions {
  margin-top: 2rem;
}

.suggestion-chips {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.suggestion-chip {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:hover {
  background: #e0e0e0;
  border-color: #999;
}

.no-results-tips {
  text-align: left;
  max-width: 300px;
  margin: 0 auto;
}

.no-results-tips ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  color: #666;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.retry-button:hover {
  background: #3367d6;
}

/* Loading State */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 4rem;
}

/* Responsive */
@media (max-width: 768px) {
  .search-header h1 {
    font-size: 1.5rem;
  }
  
  .results-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .product-card {
    font-size: 0.875rem;
  }
  
  .current-price {
    font-size: 1.25rem;
  }
}
```

## Step 12: Add Search Analytics

Track user search behavior:

```tsx
// src/hooks/useSearchAnalytics.ts
import { useEffect } from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

export function useSearchAnalytics() {
  const { state } = useSearch();

  useEffect(() => {
    if (state.results && state.query) {
      // Track successful searches
      const eventData = {
        query: state.query,
        resultsCount: state.results.found,
        searchTime: state.results.search_time_ms,
        hasResults: state.results.found > 0,
      };

      // Send to your analytics service
      console.log('Search performed:', eventData);
      
      // Example: Google Analytics
      // gtag('event', 'search', eventData);
      
      // Example: Custom analytics
      // analytics.track('search_performed', eventData);
    }
  }, [state.results, state.query]);

  // Track clicked results
  const trackResultClick = (productId: string, position: number) => {
    const eventData = {
      query: state.query,
      productId,
      position,
      timestamp: new Date().toISOString(),
    };

    console.log('Result clicked:', eventData);
    // Send to analytics
  };

  return { trackResultClick };
}
```

## Step 13: Testing Your Search

Create a test to ensure everything works:

```tsx
// src/components/__tests__/ProductSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchProvider } from '@jungle-commerce/typesense-react';
import ProductSearch from '../ProductSearch';

const mockConfig = {
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'test-key',
};

describe('ProductSearch', () => {
  it('performs search on input change', async () => {
    render(
      <SearchProvider config={mockConfig} collection="products">
        <ProductSearch />
      </SearchProvider>
    );

    const input = screen.getByPlaceholderText('Search for products...');
    
    fireEvent.change(input, { target: { value: 'laptop' } });

    await waitFor(() => {
      expect(screen.getByText(/results/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no query', () => {
    render(
      <SearchProvider config={mockConfig} collection="products" searchOnMount={false}>
        <ProductSearch />
      </SearchProvider>
    );

    expect(screen.getByText('Start searching')).toBeInTheDocument();
  });
});
```

## Next Steps

Congratulations! You've built a complete search interface. Here are some enhancements you can add:

1. **Add Filters**: Implement faceted search for categories, brands, and price ranges
2. **Add Pagination**: Handle large result sets with pagination or infinite scroll
3. **Add Sorting**: Let users sort by price, rating, or date
4. **Add Autocomplete**: Show search suggestions as users type
5. **Add Voice Search**: Implement voice input for accessibility
6. **Add Search History**: Remember recent searches

## Summary

You've learned how to:
- Set up typesense-react with proper configuration
- Create a responsive search interface
- Handle all UI states (loading, error, empty)
- Implement search highlighting
- Add search analytics
- Create a polished user experience

The complete code for this tutorial is available in the examples directory.

---

[← Getting Started](../getting-started/05-pagination.md) | [Next: Faceted Search Tutorial →](./faceted-search-tutorial.md)