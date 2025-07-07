# TypeScript Migration Guide

This guide helps you migrate your JavaScript typesense-react code to TypeScript, including handling breaking changes and adopting best practices.

## Table of Contents

- [Quick Start Migration](#quick-start-migration)
- [Breaking Changes](#breaking-changes)
- [Step-by-Step Migration](#step-by-step-migration)
- [Common Migration Patterns](#common-migration-patterns)
- [Before and After Examples](#before-and-after-examples)
- [Migration Strategies](#migration-strategies)
- [Troubleshooting](#troubleshooting)

## Quick Start Migration

### 1. Install TypeScript Dependencies

```bash
npm install --save-dev typescript @types/react @types/react-dom
```

### 2. Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### 3. Rename Files

Change your `.js` and `.jsx` files to `.ts` and `.tsx`:

```bash
# Rename all JavaScript files
find src -name "*.js" -exec sh -c 'mv "$0" "${0%.js}.ts"' {} \;
find src -name "*.jsx" -exec sh -c 'mv "$0" "${0%.jsx}.tsx"' {} \;
```

## Breaking Changes

### From Untyped to Typed Usage

The main breaking change when migrating to TypeScript is the requirement to properly type your document schemas and hook usages.

#### Document Schema Types

**Before (JavaScript):**
```javascript
const { state } = useSearch();
// No type information - document properties are 'any'
const product = state.results?.hits?.[0]?.document;
console.log(product.name); // No type checking
```

**After (TypeScript):**
```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

const { state } = useSearch<Product>();
// Full type information
const product = state.results?.hits?.[0]?.document;
console.log(product.name); // Type-checked as string
```

### API Changes for Type Safety

#### Filter State Management

**Before (JavaScript):**
```javascript
// Mixing different filter types in one object
const filters = {
  category: ['electronics', 'books'],
  price: { min: 10, max: 100 },
  brand: 'apple'
};
```

**After (TypeScript):**
```typescript
// Properly separated filter states
const disjunctiveFilters: DisjunctiveFacetState = {
  category: ['electronics', 'books']
};

const numericFilters: NumericFilterState = {
  price: { min: 10, max: 100 }
};

const selectiveFilters: SelectiveFilterState = {
  brand: 'apple'
};
```

## Step-by-Step Migration

### Step 1: Define Your Document Types

Create a `types` folder and define your document schemas:

```typescript
// src/types/documents.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  in_stock: boolean;
  rating: number;
  created_at: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  product_count: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
}
```

### Step 2: Update Provider Components

**Before (JavaScript):**
```jsx
// src/App.js
import { SearchProvider } from '@jungle-commerce/typesense-react';

function App() {
  const config = {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'xyz'
  };

  return (
    <SearchProvider
      config={config}
      collection="products"
      searchOnMount={true}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

**After (TypeScript):**
```tsx
// src/App.tsx
import { SearchProvider, TypesenseConfig } from '@jungle-commerce/typesense-react';
import { Product } from './types/documents';

function App() {
  const config: TypesenseConfig = {
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'xyz'
  };

  return (
    <SearchProvider
      config={config}
      collection="products"
      searchOnMount={true}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### Step 3: Update Search Components

**Before (JavaScript):**
```jsx
// src/components/SearchBox.js
import { useSearch } from '@jungle-commerce/typesense-react';

function SearchBox() {
  const { state, actions } = useSearch();

  return (
    <input
      type="text"
      value={state.query}
      onChange={(e) => actions.setQuery(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          actions.search();
        }
      }}
    />
  );
}
```

**After (TypeScript):**
```tsx
// src/components/SearchBox.tsx
import { useSearch } from '@jungle-commerce/typesense-react';
import { Product } from '../types/documents';

function SearchBox() {
  const { state, actions } = useSearch<Product>();

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      actions.search();
    }
  };

  return (
    <input
      type="text"
      value={state.query}
      onChange={(e) => actions.setQuery(e.target.value)}
      onKeyPress={handleKeyPress}
    />
  );
}
```

### Step 4: Update Result Components

**Before (JavaScript):**
```jsx
// src/components/SearchResults.js
import { useSearch } from '@jungle-commerce/typesense-react';

function SearchResults() {
  const { state } = useSearch();

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  if (!state.results) return null;

  return (
    <div>
      <p>{state.results.found} results found</p>
      {state.results.hits?.map((hit) => (
        <div key={hit.document.id}>
          <h3>{hit.document.name}</h3>
          <p>${hit.document.price}</p>
        </div>
      ))}
    </div>
  );
}
```

**After (TypeScript):**
```tsx
// src/components/SearchResults.tsx
import { useSearch, SearchHit } from '@jungle-commerce/typesense-react';
import { Product } from '../types/documents';

function SearchResults() {
  const { state } = useSearch<Product>();

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  if (!state.results) return null;

  const renderHit = (hit: SearchHit<Product>) => (
    <div key={hit.document.id}>
      <h3>{hit.document.name}</h3>
      <p>${hit.document.price.toFixed(2)}</p>
      {hit.highlights?.map((highlight, idx) => (
        <p key={idx} dangerouslySetInnerHTML={{ __html: highlight.snippet || '' }} />
      ))}
    </div>
  );

  return (
    <div>
      <p>{state.results.found} results found</p>
      {state.results.hits?.map(renderHit)}
    </div>
  );
}
```

## Common Migration Patterns

### Pattern 1: Facet Configuration

**Before (JavaScript):**
```javascript
const facets = [
  { field: 'category', label: 'Category', type: 'checkbox' },
  { field: 'price', label: 'Price', type: 'numeric' },
  { field: 'brand', label: 'Brand', type: 'checkbox', disjunctive: true }
];
```

**After (TypeScript):**
```typescript
import { FacetConfig } from '@jungle-commerce/typesense-react';
import { Product } from './types/documents';

// Type-safe facet configuration
const facets: FacetConfig[] = [
  { field: 'category', label: 'Category', type: 'checkbox' },
  { field: 'price', label: 'Price', type: 'numeric', numericDisplay: 'range' },
  { field: 'brand', label: 'Brand', type: 'checkbox', disjunctive: true }
];

// Or with a factory function for better type safety
function createFacetConfig<T>(
  field: keyof T & string,
  config: Omit<FacetConfig, 'field'>
): FacetConfig {
  return { field, ...config };
}

const typedFacets = [
  createFacetConfig<Product>('category', { label: 'Category', type: 'checkbox' }),
  createFacetConfig<Product>('price', { label: 'Price', type: 'numeric' }),
  createFacetConfig<Product>('brand', { label: 'Brand', type: 'checkbox', disjunctive: true })
];
```

### Pattern 2: Filter Management

**Before (JavaScript):**
```javascript
function Filters() {
  const { state, actions } = useAdvancedFacets();

  const handlePriceChange = (min, max) => {
    actions.setNumericFilter('price', min, max);
  };

  const handleCategoryToggle = (category) => {
    actions.toggleFacetValue('category', category);
  };

  return (
    <div>
      {/* Filter UI */}
    </div>
  );
}
```

**After (TypeScript):**
```typescript
import { useAdvancedFacets } from '@jungle-commerce/typesense-react';

interface PriceRangeProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

function Filters() {
  const { state, actions } = useAdvancedFacets();

  const handlePriceChange = (min: number, max: number) => {
    actions.setNumericFilter('price', min, max);
  };

  const handleCategoryToggle = (category: string) => {
    actions.toggleFacetValue('category', category);
  };

  return (
    <div>
      <PriceRange 
        min={0} 
        max={1000} 
        onChange={handlePriceChange}
      />
      <CategoryFilter 
        categories={['Electronics', 'Books', 'Clothing']}
        selected={state.disjunctiveFacets.category || []}
        onToggle={handleCategoryToggle}
      />
    </div>
  );
}
```

### Pattern 3: Custom Hooks

**Before (JavaScript):**
```javascript
function useProductSearch() {
  const { state, actions } = useSearch();
  
  const searchByCategory = (category) => {
    actions.setQuery('');
    actions.clearAllFilters();
    actions.toggleFacetValue('category', category);
    actions.search();
  };

  return {
    products: state.results?.hits?.map(h => h.document) || [],
    loading: state.loading,
    searchByCategory
  };
}
```

**After (TypeScript):**
```typescript
import { useSearch } from '@jungle-commerce/typesense-react';
import { Product } from '../types/documents';

interface UseProductSearchReturn {
  products: Product[];
  loading: boolean;
  error: Error | null;
  searchByCategory: (category: string) => Promise<void>;
  searchByPriceRange: (min: number, max: number) => Promise<void>;
}

function useProductSearch(): UseProductSearchReturn {
  const { state, actions } = useSearch<Product>();
  
  const searchByCategory = async (category: string) => {
    actions.setQuery('');
    actions.clearAllFilters();
    actions.toggleFacetValue('category', category);
    await actions.search();
  };

  const searchByPriceRange = async (min: number, max: number) => {
    actions.setNumericFilter('price', min, max);
    await actions.search();
  };

  return {
    products: state.results?.hits?.map(h => h.document) || [],
    loading: state.loading,
    error: state.error,
    searchByCategory,
    searchByPriceRange
  };
}
```

## Before and After Examples

### Example 1: Search Interface Component

**Before (JavaScript):**
```jsx
// SearchInterface.js
import React from 'react';
import { useSearch, useAdvancedFacets } from '@jungle-commerce/typesense-react';

export function SearchInterface() {
  const { state, actions } = useSearch();
  const { disjunctiveFacets, actions: facetActions } = useAdvancedFacets();

  const handleSearch = (e) => {
    e.preventDefault();
    actions.search();
  };

  const handleFacetToggle = (field, value) => {
    facetActions.toggleFacetValue(field, value);
  };

  return (
    <div className="search-interface">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={state.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Search products..."
        />
        <button type="submit">Search</button>
      </form>

      <div className="facets">
        {state.results?.facet_counts?.map((facet) => (
          <div key={facet.field_name} className="facet-group">
            <h3>{facet.field_name}</h3>
            {facet.counts.map((count) => (
              <label key={count.value}>
                <input
                  type="checkbox"
                  checked={disjunctiveFacets[facet.field_name]?.includes(count.value)}
                  onChange={() => handleFacetToggle(facet.field_name, count.value)}
                />
                {count.value} ({count.count})
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="results">
        {state.loading && <p>Loading...</p>}
        {state.error && <p>Error: {state.error.message}</p>}
        {state.results?.hits?.map((hit) => (
          <div key={hit.document.id} className="result-item">
            <h4>{hit.document.name}</h4>
            <p>{hit.document.description}</p>
            <p>${hit.document.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**After (TypeScript):**
```tsx
// SearchInterface.tsx
import React, { FormEvent } from 'react';
import { 
  useSearch, 
  useAdvancedFacets, 
  SearchHit,
  FacetResult 
} from '@jungle-commerce/typesense-react';
import { Product } from '../types/documents';

export function SearchInterface() {
  const { state, actions } = useSearch<Product>();
  const { disjunctiveFacets, actions: facetActions } = useAdvancedFacets();

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    actions.search();
  };

  const handleFacetToggle = (field: string, value: string) => {
    facetActions.toggleFacetValue(field, value);
  };

  const renderFacet = (facet: FacetResult) => (
    <div key={facet.field_name} className="facet-group">
      <h3>{facet.field_name}</h3>
      {facet.counts.map((count) => {
        const isChecked = disjunctiveFacets[facet.field_name]?.includes(count.value) ?? false;
        
        return (
          <label key={count.value} className="facet-option">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleFacetToggle(facet.field_name, count.value)}
            />
            <span>{count.value}</span>
            <span className="count">({count.count})</span>
          </label>
        );
      })}
    </div>
  );

  const renderHit = (hit: SearchHit<Product>) => (
    <div key={hit.document.id} className="result-item">
      <h4>{hit.document.name}</h4>
      <p>{hit.document.description}</p>
      <p className="price">${hit.document.price.toFixed(2)}</p>
      {hit.highlights?.map((highlight, idx) => (
        <p 
          key={idx} 
          className="highlight"
          dangerouslySetInnerHTML={{ __html: highlight.snippet || '' }}
        />
      ))}
    </div>
  );

  return (
    <div className="search-interface">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={state.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Search products..."
          className="search-input"
        />
        <button type="submit" disabled={state.loading}>
          {state.loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="facets">
        {state.results?.facet_counts?.map(renderFacet)}
      </div>

      <div className="results">
        {state.loading && <div className="loading">Loading...</div>}
        {state.error && <div className="error">Error: {state.error.message}</div>}
        {state.results && (
          <>
            <p className="result-count">{state.results.found} results found</p>
            {state.results.hits?.map(renderHit)}
          </>
        )}
      </div>
    </div>
  );
}
```

### Example 2: Multi-Collection Search

**Before (JavaScript):**
```jsx
// MultiSearch.js
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

export function MultiSearch() {
  const { search, results, loading } = useMultiCollectionSearch();

  const handleSearch = async (query) => {
    await search(query, [
      {
        collection: 'products',
        queryBy: 'name,description',
        maxResults: 20
      },
      {
        collection: 'categories',
        queryBy: 'name',
        maxResults: 5
      }
    ]);
  };

  return (
    <div>
      <input
        type="text"
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search everything..."
      />
      
      {loading && <p>Searching...</p>}
      
      {results?.hits.map((hit) => (
        <div key={hit.document.id}>
          <span>{hit._collection}: </span>
          <span>{hit.document.name}</span>
        </div>
      ))}
    </div>
  );
}
```

**After (TypeScript):**
```tsx
// MultiSearch.tsx
import { 
  useMultiCollectionSearch, 
  CollectionSearchConfig,
  MultiCollectionSearchHit 
} from '@jungle-commerce/typesense-react';
import { Product, Category } from '../types/documents';

type SearchDocument = (Product | Category) & { _collection: string };

export function MultiSearch() {
  const { search, results, loading, error } = useMultiCollectionSearch();

  const collections: CollectionSearchConfig[] = [
    {
      collection: 'products',
      namespace: 'product',
      queryBy: 'name,description',
      maxResults: 20,
      weight: 1.5
    },
    {
      collection: 'categories',
      namespace: 'category',
      queryBy: 'name',
      maxResults: 5,
      weight: 1.0
    }
  ];

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      await search(query, collections);
    }
  };

  const renderHit = (hit: MultiCollectionSearchHit) => {
    const doc = hit.document as SearchDocument;
    
    return (
      <div key={doc.id} className={`search-hit ${hit._namespace}`}>
        <div className="hit-meta">
          <span className="collection">{hit._collection}</span>
          <span className="score">{hit._mergedScore.toFixed(2)}</span>
        </div>
        <div className="hit-content">
          <h4>{doc.name}</h4>
          {hit._collection === 'products' && (
            <p>${(doc as Product).price.toFixed(2)}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="multi-search">
      <input
        type="text"
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search everything..."
        className="search-input"
      />
      
      {loading && <div className="loading">Searching...</div>}
      {error && <div className="error">Error: {error.message}</div>}
      
      {results && (
        <div className="results">
          <div className="result-stats">
            <p>Found {results.found} results across collections</p>
            {Object.entries(results.includedByCollection).map(([collection, count]) => (
              <span key={collection}>{collection}: {count} </span>
            ))}
          </div>
          
          <div className="result-list">
            {results.hits.map(renderHit)}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Migration Strategies

### Strategy 1: Incremental Migration

Migrate one component at a time, starting with leaf components:

1. **Start with utility functions and types**
   ```typescript
   // types/index.ts
   export * from './documents';
   export * from './search';
   export * from './filters';
   ```

2. **Migrate leaf components** (no children)
   ```typescript
   // Components like buttons, inputs, display components
   ```

3. **Migrate container components**
   ```typescript
   // Components that use hooks and manage state
   ```

4. **Migrate providers and context**
   ```typescript
   // Top-level providers and app configuration
   ```

### Strategy 2: Parallel Development

Keep JavaScript and TypeScript versions side-by-side:

```
src/
  components/
    SearchBox.js          # Old version
    SearchBox.tsx         # New version
    SearchBox.types.ts    # Shared types
```

### Strategy 3: Type-First Migration

1. **Create type definitions first**
   ```typescript
   // types/legacy.d.ts
   declare module './legacy-component' {
     export function LegacyComponent(props: any): JSX.Element;
   }
   ```

2. **Add types gradually**
   ```typescript
   // Add JSDoc comments to JavaScript files
   /**
    * @param {import('./types').Product} product
    * @returns {number}
    */
   function calculatePrice(product) {
     return product.price * 1.1;
   }
   ```

3. **Convert to TypeScript**
   ```typescript
   import { Product } from './types';
   
   function calculatePrice(product: Product): number {
     return product.price * 1.1;
   }
   ```

## Troubleshooting

### Common TypeScript Errors

#### Error: Property does not exist on type

```typescript
// Error
const name = hit.document.name; // Property 'name' does not exist on type 'Record<string, any>'

// Solution: Use generic type
const { state } = useSearch<Product>();
const name = state.results?.hits?.[0]?.document.name; // OK
```

#### Error: Type 'string[]' is not assignable to type 'string'

```typescript
// Error
const filters = {
  category: ['electronics'], // This should be in disjunctiveFacets
};

// Solution: Use correct filter type
const { actions } = useAdvancedFacets();
actions.toggleFacetValue('category', 'electronics');
```

#### Error: Object is possibly 'null' or 'undefined'

```typescript
// Error
const firstHit = state.results.hits[0]; // Object is possibly 'null'

// Solution: Add null checks
const firstHit = state.results?.hits?.[0];
// or
if (state.results && state.results.hits.length > 0) {
  const firstHit = state.results.hits[0];
}
```

### Build Configuration Issues

#### tsconfig.json Settings

```json
{
  "compilerOptions": {
    // Required for React
    "jsx": "react-jsx",
    
    // For better type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    
    // For module resolution
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // For development
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

#### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
```

### IDE Configuration

#### VS Code Settings

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Best Practices for Migration

1. **Start with strict mode disabled**, then enable gradually:
   ```json
   {
     "compilerOptions": {
       "strict": false,
       // Enable one by one
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true
     }
   }
   ```

2. **Use type assertions sparingly**:
   ```typescript
   // Avoid
   const product = hit.document as Product;
   
   // Prefer
   const { state } = useSearch<Product>();
   ```

3. **Create type predicates for runtime checks**:
   ```typescript
   function isProduct(doc: unknown): doc is Product {
     return (
       typeof doc === 'object' &&
       doc !== null &&
       'id' in doc &&
       'name' in doc &&
       'price' in doc
     );
   }
   ```

4. **Use const assertions for configuration**:
   ```typescript
   const facetConfig = {
     field: 'category',
     type: 'checkbox',
     disjunctive: true
   } as const;
   ```

5. **Export types alongside components**:
   ```typescript
   // SearchBox.tsx
   export interface SearchBoxProps {
     placeholder?: string;
     onSearch?: (query: string) => void;
   }
   
   export function SearchBox({ placeholder = "Search...", onSearch }: SearchBoxProps) {
     // ...
   }
   ```

## Summary

Migrating to TypeScript with typesense-react provides:

- **Type safety** for document schemas and search operations
- **Better IDE support** with autocomplete and error detection
- **Clearer API contracts** for components and hooks
- **Reduced runtime errors** through compile-time checking
- **Improved maintainability** with self-documenting code

Follow this guide step-by-step, and don't hesitate to migrate incrementally. The type safety benefits will become apparent immediately, making your search implementation more robust and maintainable.