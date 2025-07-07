# Pagination

Handle large result sets efficiently with pagination. Let's implement different pagination patterns for your search interface.

## What We'll Build

- Classic pagination with page numbers
- Load more button
- Infinite scroll
- Results per page selector
- Pagination info display

## Basic Pagination

```tsx
import React from 'react';
import { SearchProvider, useSearch } from '@jungle-commerce/typesense-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

function BasicPagination() {
  const { state, actions } = useSearch<Product>();
  
  // Calculate pagination info
  const totalPages = Math.ceil((state.results?.found || 0) / state.perPage);
  const currentPage = state.page;
  
  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page with surrounding pages
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      if (start > 1) pages.push(1, '...');
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) pages.push('...', totalPages);
    }
    
    return pages;
  };
  
  return (
    <div className="search-container">
      {/* Search input */}
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />
      
      {/* Results */}
      {state.results && (
        <>
          <div className="results-info">
            Showing {((currentPage - 1) * state.perPage) + 1} - {
              Math.min(currentPage * state.perPage, state.results.found)
            } of {state.results.found} results
          </div>
          
          <div className="results-list">
            {state.results.hits.map(hit => (
              <div key={hit.document.id} className="result-item">
                <h3>{hit.document.name}</h3>
                <p>{hit.document.description}</p>
                <span className="price">${hit.document.price}</span>
              </div>
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => actions.setPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              {getPageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      onClick={() => actions.setPage(page as number)}
                      className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
              
              <button
                onClick={() => actions.setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## Load More Pattern

```tsx
function LoadMorePagination() {
  const { state, actions } = useSearch<Product>();
  const [allResults, setAllResults] = React.useState<typeof state.results.hits>([]);
  
  // Accumulate results when page changes
  React.useEffect(() => {
    if (state.results?.hits) {
      if (state.page === 1) {
        // Reset on new search
        setAllResults(state.results.hits);
      } else {
        // Append new results
        setAllResults(prev => [...prev, ...state.results.hits]);
      }
    }
  }, [state.results, state.page]);
  
  // Reset when query changes
  React.useEffect(() => {
    setAllResults([]);
    actions.setPage(1);
  }, [state.query]);
  
  const hasMore = allResults.length < (state.results?.found || 0);
  
  return (
    <div className="search-container">
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />
      
      {/* Display accumulated results */}
      <div className="results-list">
        {allResults.map((hit, index) => (
          <div key={`${hit.document.id}-${index}`} className="result-item">
            <h3>{hit.document.name}</h3>
            <p>{hit.document.description}</p>
            <span className="price">${hit.document.price}</span>
          </div>
        ))}
      </div>
      
      {/* Load more button */}
      {hasMore && !state.loading && (
        <div className="load-more-container">
          <button
            onClick={() => actions.setPage(state.page + 1)}
            className="load-more-btn"
          >
            Load More ({allResults.length} of {state.results?.found})
          </button>
        </div>
      )}
      
      {state.loading && state.page > 1 && (
        <div className="loading-more">Loading more results...</div>
      )}
    </div>
  );
}
```

## Infinite Scroll

```tsx
function InfiniteScrollPagination() {
  const { state, actions } = useSearch<Product>();
  const [allResults, setAllResults] = React.useState<typeof state.results.hits>([]);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  
  // Accumulate results
  React.useEffect(() => {
    if (state.results?.hits) {
      if (state.page === 1) {
        setAllResults(state.results.hits);
      } else {
        setAllResults(prev => [...prev, ...state.results.hits]);
      }
    }
  }, [state.results, state.page]);
  
  // Reset on query change
  React.useEffect(() => {
    setAllResults([]);
    actions.setPage(1);
  }, [state.query]);
  
  // Set up intersection observer
  React.useEffect(() => {
    const hasMore = allResults.length < (state.results?.found || 0);
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    if (hasMore && !state.loading && loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            actions.setPage(state.page + 1);
          }
        },
        { threshold: 0.1 }
      );
      
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [allResults, state.results, state.loading, state.page]);
  
  return (
    <div className="search-container">
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />
      
      <div className="results-info">
        Showing {allResults.length} of {state.results?.found || 0} results
      </div>
      
      <div className="results-list">
        {allResults.map((hit, index) => (
          <div key={`${hit.document.id}-${index}`} className="result-item">
            <h3>{hit.document.name}</h3>
            <p>{hit.document.description}</p>
            <span className="price">${hit.document.price}</span>
          </div>
        ))}
      </div>
      
      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="infinite-scroll-trigger">
        {state.loading && <div className="loading">Loading more...</div>}
      </div>
    </div>
  );
}
```

## Advanced Pagination Features

### 1. Results Per Page Selector

```tsx
function ResultsPerPageSelector() {
  const { state, actions } = useSearch();
  const perPageOptions = [10, 20, 50, 100];
  
  return (
    <div className="results-per-page">
      <label>
        Show:
        <select
          value={state.perPage}
          onChange={(e) => {
            actions.setPerPage(Number(e.target.value));
            actions.setPage(1); // Reset to first page
          }}
          className="per-page-select"
        >
          {perPageOptions.map(option => (
            <option key={option} value={option}>
              {option} results
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

### 2. Jump to Page

```tsx
function JumpToPage() {
  const { state, actions } = useSearch();
  const [inputValue, setInputValue] = React.useState('');
  const totalPages = Math.ceil((state.results?.found || 0) / state.perPage);
  
  const handleJump = () => {
    const page = parseInt(inputValue);
    if (page >= 1 && page <= totalPages) {
      actions.setPage(page);
      setInputValue('');
    }
  };
  
  return (
    <div className="jump-to-page">
      <input
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleJump()}
        placeholder="Page #"
        min="1"
        max={totalPages}
        className="page-input"
      />
      <button onClick={handleJump} className="jump-btn">
        Go
      </button>
    </div>
  );
}
```

### 3. Pagination with Filters

Keep filters when paginating:

```tsx
function PaginationWithFilters() {
  const { state, actions } = useSearch();
  
  // Pagination preserves all filters automatically
  const handlePageChange = (page: number) => {
    actions.setPage(page);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div>
      {/* Your filters UI */}
      
      {/* Results with pagination */}
      <Pagination
        currentPage={state.page}
        totalPages={Math.ceil((state.results?.found || 0) / state.perPage)}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
```

## Complete Pagination Component

```tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisible?: number;
}

function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  showFirstLast = true,
  maxVisible = 5 
}: PaginationProps) {
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisible / 2);
      let start = Math.max(1, currentPage - halfVisible);
      let end = Math.min(totalPages, currentPage + halfVisible);
      
      // Adjust if we're near the beginning or end
      if (currentPage <= halfVisible) {
        end = maxVisible;
      } else if (currentPage + halfVisible >= totalPages) {
        start = totalPages - maxVisible + 1;
      }
      
      // Add first page and ellipsis
      if (start > 1) {
        if (showFirstLast) pages.push(1);
        if (start > 2) pages.push('...');
      }
      
      // Add page numbers
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        if (showFirstLast) pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-btn pagination-prev"
        aria-label="Previous page"
      >
        ← Previous
      </button>
      
      <div className="pagination-numbers">
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="pagination-ellipsis">…</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`pagination-btn pagination-number ${
                  page === currentPage ? 'active' : ''
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-btn pagination-next"
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}
```

## CSS for Pagination

```css
/* Basic pagination styles */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 40px 0;
  flex-wrap: wrap;
}

.pagination-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 40px;
}

.pagination-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #999;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.pagination-numbers {
  display: flex;
  gap: 4px;
}

.pagination-ellipsis {
  padding: 0 8px;
  color: #666;
}

/* Results info */
.results-info {
  text-align: center;
  color: #666;
  margin: 20px 0;
  font-size: 14px;
}

/* Load more button */
.load-more-container {
  text-align: center;
  margin: 40px 0;
}

.load-more-btn {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-more-btn:hover {
  background: #0056b3;
}

.loading-more {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* Infinite scroll */
.infinite-scroll-trigger {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Per page selector */
.results-per-page {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.per-page-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* Jump to page */
.jump-to-page {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input {
  width: 60px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.jump-btn {
  padding: 6px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .pagination {
    font-size: 12px;
  }
  
  .pagination-btn {
    padding: 6px 8px;
    min-width: 32px;
  }
  
  .pagination-prev,
  .pagination-next {
    flex: 1;
  }
  
  .pagination-numbers {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: 10px;
  }
}
```

## Performance Considerations

### 1. Prefetch Next Page

```tsx
function usePrefetchNextPage() {
  const { state, client, collection } = useSearch();
  
  React.useEffect(() => {
    const hasNextPage = state.page < Math.ceil((state.results?.found || 0) / state.perPage);
    
    if (hasNextPage && state.results) {
      // Prefetch next page in background
      const prefetchParams = {
        ...state.lastSearchParams,
        page: state.page + 1
      };
      
      client.search(collection, prefetchParams, true); // Use cache
    }
  }, [state.page, state.results]);
}
```

### 2. Virtual Scrolling

For very large result sets:

```tsx
import { VariableSizeList } from 'react-window';

function VirtualizedResults() {
  const { state } = useSearch();
  const listRef = React.useRef<VariableSizeList>(null);
  
  const getItemSize = (index: number) => {
    // Calculate height based on content
    return 120; // Fixed height for simplicity
  };
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const hit = state.results?.hits[index];
    if (!hit) return null;
    
    return (
      <div style={style} className="result-item">
        <h3>{hit.document.name}</h3>
        <p>{hit.document.description}</p>
      </div>
    );
  };
  
  return (
    <VariableSizeList
      ref={listRef}
      height={600}
      itemCount={state.results?.hits.length || 0}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

### 3. URL State Sync

Keep pagination in URL for sharing:

```tsx
function usePaginationUrl() {
  const { state, actions } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Update URL when page changes
  React.useEffect(() => {
    if (state.page > 1) {
      searchParams.set('page', state.page.toString());
    } else {
      searchParams.delete('page');
    }
    setSearchParams(searchParams);
  }, [state.page]);
  
  // Restore page from URL on mount
  React.useEffect(() => {
    const page = searchParams.get('page');
    if (page) {
      actions.setPage(parseInt(page));
    }
  }, []);
}
```

## Best Practices

1. **Clear Communication**: Always show current position and total results
2. **Smooth Transitions**: Add loading states between page changes
3. **Keyboard Navigation**: Support keyboard shortcuts for pagination
4. **Mobile Friendly**: Ensure pagination works well on touch devices
5. **Performance**: Consider infinite scroll for mobile, pagination for desktop

## Summary

You've learned how to implement various pagination patterns:
- Classic numbered pagination
- Load more functionality
- Infinite scroll
- Results per page control
- URL state synchronization

Choose the pattern that best fits your use case and user experience goals.

---

[← Adding Filters](./04-adding-filters.md) | [Next: Tutorials →](../tutorials/basic-search-tutorial.md)