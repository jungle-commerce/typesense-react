# Hello World - Your First Search

Let's create the simplest possible search interface to understand the basics of typesense-react.

## What We'll Build

A minimal search interface that:
- Connects to Typesense
- Provides a search input
- Displays results as you type

## Complete Code

Create a new file `App.tsx`:

```tsx
import React from 'react';
import { SearchProvider, useSearch } from '@jungle-commerce/typesense-react';

// Configuration (from previous guide)
const typesenseConfig = {
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz',
  connectionTimeoutSeconds: 2
};

// Search component
function SearchBox() {
  const { state, actions } = useSearch();

  return (
    <div>
      <h1>Product Search</h1>
      
      {/* Search Input */}
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
        style={{ padding: '10px', width: '300px', fontSize: '16px' }}
      />
      
      {/* Loading State */}
      {state.loading && <p>Searching...</p>}
      
      {/* Results */}
      {state.results && (
        <div>
          <p>Found {state.results.found} results</p>
          
          {state.results.hits.map(hit => (
            <div key={hit.document.id} style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '10px 0' 
            }}>
              <h3>{hit.document.name}</h3>
              <p>{hit.document.description}</p>
              <p>${hit.document.price}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* No Results */}
      {state.results?.found === 0 && (
        <p>No results found for "{state.query}"</p>
      )}
    </div>
  );
}

// Main App component
function App() {
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

export default App;
```

## How It Works

### 1. SearchProvider

The `SearchProvider` component wraps your search interface and provides:
- Connection to Typesense
- Search state management
- Automatic query handling

```tsx
<SearchProvider
  config={typesenseConfig}    // Your Typesense configuration
  collection="products"        // Collection to search
  searchOnMount={true}        // Search immediately when component loads
>
```

### 2. useSearch Hook

The `useSearch` hook gives you access to:
- `state`: Current search state (query, results, loading, etc.)
- `actions`: Functions to update the search

```tsx
const { state, actions } = useSearch();
```

### 3. Search State

The state object contains:
- `query`: Current search query
- `results`: Search results from Typesense
- `loading`: Whether a search is in progress
- `error`: Any error that occurred

### 4. Search Actions

The actions object provides:
- `setQuery(query: string)`: Update the search query
- `setPage(page: number)`: Change pagination
- `setSortBy(sort: string)`: Change sorting
- And many more...

## Adding TypeScript Types

For better type safety, define your document type:

```tsx
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  in_stock: boolean;
}

function SearchBox() {
  const { state, actions } = useSearch<Product>();
  
  // Now TypeScript knows the shape of your documents
  return (
    <div>
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>
          <h3>{hit.document.name}</h3>
          <p>Price: ${hit.document.price.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

## Customizing Search Behavior

### Search as You Type

By default, searches happen automatically as you type (with debouncing). You can customize this:

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  searchOnMount={false}       // Don't search on mount
  debounceMs={300}           // Wait 300ms after typing stops
>
```

### Initial Search Parameters

Set default search parameters:

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  initialSearchParams={{
    query_by: 'name,description',  // Fields to search
    per_page: 10,                  // Results per page
    sort_by: 'price:asc'          // Default sort
  }}
>
```

## Styling Your Results

Here's a slightly styled version:

```tsx
function SearchBox() {
  const { state, actions } = useSearch<Product>();

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    },
    searchInput: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    resultCard: {
      border: '1px solid #eee',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: '#f9f9f9'
    },
    price: {
      color: '#007bff',
      fontWeight: 'bold',
      fontSize: '18px'
    }
  };

  return (
    <div style={styles.container}>
      <h1>Product Search</h1>
      
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Try searching for 'laptop' or 'mouse'..."
        style={styles.searchInput}
      />
      
      {state.loading && <p>Searching...</p>}
      
      {state.results?.hits.map(hit => (
        <div key={hit.document.id} style={styles.resultCard}>
          <h3>{hit.document.name}</h3>
          <p>{hit.document.description}</p>
          <p style={styles.price}>${hit.document.price.toFixed(2)}</p>
          <small>
            {hit.document.category} • {hit.document.brand}
          </small>
        </div>
      ))}
    </div>
  );
}
```

## Try It Out!

1. Start your Typesense server
2. Run your React app
3. Try searching for:
   - "laptop" - Should find the Laptop Pro
   - "wireless" - Should find the Wireless Mouse
   - "usb" - Should find the USB-C Hub

## Common Patterns

### Empty State

Show a message when there's no search query:

```tsx
{!state.query && !state.loading && (
  <p>Start typing to search products...</p>
)}
```

### Error Handling

Display errors gracefully:

```tsx
{state.error && (
  <div style={{ color: 'red', padding: '10px' }}>
    Error: {state.error.message}
  </div>
)}
```

### Search Time

Show how fast the search was:

```tsx
{state.results && (
  <p>
    Found {state.results.found} results 
    in {state.results.search_time_ms}ms
  </p>
)}
```

## What's Next?

You now have a working search interface! In the next guide, we'll enhance it with:
- Search highlighting
- Better result display
- Search suggestions

### Key Takeaways

1. `SearchProvider` manages the connection and state
2. `useSearch` hook provides access to search functionality
3. Search happens automatically as you type
4. Results are available in `state.results.hits`

---

[← Installation](./01-installation.md) | [Next: Basic Search →](./03-basic-search.md)