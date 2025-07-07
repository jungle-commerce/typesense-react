# TypeScript Examples

This guide provides practical examples of using TypeScript with the typesense-react library, covering common patterns and best practices.

## Table of Contents

- [Basic Type Usage](#basic-type-usage)
- [Typing Search Results](#typing-search-results)
- [Custom Document Schemas](#custom-document-schemas)
- [Using Generic Types with Hooks](#using-generic-types-with-hooks)
- [Advanced TypeScript Patterns](#advanced-typescript-patterns)
- [Multi-Collection Types](#multi-collection-types)
- [Type Guards and Utilities](#type-guards-and-utilities)
- [Common Pitfalls](#common-pitfalls)

## Basic Type Usage

### Importing Types

```typescript
import {
  TypesenseConfig,
  SearchRequest,
  TypesenseSearchResponse,
  FacetConfig,
  SearchState,
  UseSearchReturn
} from '@jungle-commerce/typesense-react';
```

### Basic Configuration

```typescript
// Strongly typed configuration
const config: TypesenseConfig = {
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz123',
  connectionTimeoutSeconds: 10,
  cacheSearchResultsForSeconds: 60
};

// Type error examples:
// config.nodes[0].port = "8108"; // Error: Type 'string' is not assignable to type 'number'
// config.apiKey = 123; // Error: Type 'number' is not assignable to type 'string'
```

## Typing Search Results

### Basic Search Response

```typescript
import { TypesenseSearchResponse, SearchHit } from '@jungle-commerce/typesense-react';

// Using with default generic (Record<string, any>)
function handleSearchResults(response: TypesenseSearchResponse) {
  response.hits?.forEach((hit: SearchHit) => {
    console.log(hit.document); // Type: Record<string, any>
    console.log(hit.text_match); // Type: number | undefined
    console.log(hit.highlights); // Type: Array<{field: string; snippet?: string; value?: string;}> | undefined
  });
}
```

### Strongly Typed Search Results

```typescript
// Define your document interface
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  in_stock: boolean;
  rating?: number;
  tags?: string[];
  created_at: number;
}

// Use with generic type parameter
function handleTypedResults(response: TypesenseSearchResponse<Product>) {
  response.hits?.forEach((hit: SearchHit<Product>) => {
    // All properties are strongly typed
    const product = hit.document;
    console.log(product.name); // Type: string
    console.log(product.price); // Type: number
    console.log(product.rating); // Type: number | undefined
    
    // Type error example:
    // console.log(product.nonExistent); // Error: Property 'nonExistent' does not exist
  });
}
```

## Custom Document Schemas

### Defining Complex Document Types

```typescript
// E-commerce product with nested types
interface EcommerceProduct {
  id: string;
  name: string;
  slug: string;
  price: {
    amount: number;
    currency: string;
    discount_percentage?: number;
  };
  inventory: {
    quantity: number;
    warehouse_locations: string[];
  };
  attributes: Record<string, string | number | boolean>;
  images: Array<{
    url: string;
    alt: string;
    is_primary: boolean;
  }>;
  metadata: {
    created_at: number;
    updated_at: number;
    created_by: string;
  };
}

// Using the complex type
const searchResults: TypesenseSearchResponse<EcommerceProduct> = await client.search({
  collection: 'products',
  searchParameters: {
    q: 'laptop',
    query_by: 'name,description'
  }
});
```

### Union Types for Multiple Document Types

```typescript
// When searching across multiple collections with different schemas
type SearchDocument = Product | Category | Brand;

interface Product {
  _type: 'product';
  id: string;
  name: string;
  price: number;
}

interface Category {
  _type: 'category';
  id: string;
  name: string;
  parent_id?: string;
}

interface Brand {
  _type: 'brand';
  id: string;
  name: string;
  logo_url: string;
}

// Type guard functions
function isProduct(doc: SearchDocument): doc is Product {
  return doc._type === 'product';
}

function isCategory(doc: SearchDocument): doc is Category {
  return doc._type === 'category';
}

function isBrand(doc: SearchDocument): doc is Brand {
  return doc._type === 'brand';
}

// Usage
const results: TypesenseSearchResponse<SearchDocument> = await search();
results.hits?.forEach(hit => {
  const doc = hit.document;
  
  if (isProduct(doc)) {
    console.log(`Product: ${doc.name} - $${doc.price}`);
  } else if (isCategory(doc)) {
    console.log(`Category: ${doc.name}`);
  } else if (isBrand(doc)) {
    console.log(`Brand: ${doc.name}`);
  }
});
```

## Using Generic Types with Hooks

### useSearch Hook with Generics

```typescript
import { useSearch } from '@jungle-commerce/typesense-react';

function ProductSearch() {
  // The hook automatically infers types from the SearchProvider
  const { state, actions, loading, error } = useSearch<Product>();
  
  // state.results is typed as TypesenseSearchResponse<Product> | null
  const products = state.results?.hits?.map(hit => hit.document) || [];
  
  // All product properties are strongly typed
  products.forEach(product => {
    console.log(product.name); // Type: string
    console.log(product.price); // Type: number
  });
  
  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

### Custom Hook with Type Parameters

```typescript
// Create a custom hook with strong typing
function useProductSearch() {
  const { state, actions } = useSearch<Product>();
  
  // Add custom business logic with type safety
  const getProductsByCategory = (category: string): Product[] => {
    return state.results?.hits
      ?.filter(hit => hit.document.category === category)
      ?.map(hit => hit.document) || [];
  };
  
  const getTotalValue = (): number => {
    return state.results?.hits
      ?.reduce((sum, hit) => sum + hit.document.price, 0) || 0;
  };
  
  return {
    ...state,
    ...actions,
    getProductsByCategory,
    getTotalValue
  };
}
```

## Advanced TypeScript Patterns

### Facet Configuration with Type Safety

```typescript
import { FacetConfig } from '@jungle-commerce/typesense-react';

// Create a type-safe facet configuration factory
function createFacetConfig<T extends Record<string, any>>(
  field: keyof T & string,
  config: Omit<FacetConfig, 'field'>
): FacetConfig {
  return {
    field,
    ...config
  };
}

// Usage with Product type
const categoryFacet = createFacetConfig<Product>('category', {
  label: 'Category',
  type: 'checkbox',
  disjunctive: true,
  maxValues: 10
});

const priceFacet = createFacetConfig<Product>('price', {
  label: 'Price Range',
  type: 'numeric',
  numericDisplay: 'range',
  rangeStep: 10
});

// Type error example:
// const invalidFacet = createFacetConfig<Product>('nonExistent', {...});
// Error: Argument of type '"nonExistent"' is not assignable to parameter
```

### State Management with Discriminated Unions

```typescript
// Define a discriminated union for search state
type SearchStateStatus = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: TypesenseSearchResponse<Product> }
  | { status: 'error'; error: Error };

// Custom hook with discriminated union
function useTypedSearch() {
  const [searchState, setSearchState] = useState<SearchStateStatus>({ status: 'idle' });
  
  const search = async (query: string) => {
    setSearchState({ status: 'loading' });
    
    try {
      const results = await performSearch<Product>(query);
      setSearchState({ status: 'success', data: results });
    } catch (error) {
      setSearchState({ status: 'error', error: error as Error });
    }
  };
  
  return { searchState, search };
}

// Usage with exhaustive checking
function SearchResults() {
  const { searchState } = useTypedSearch();
  
  switch (searchState.status) {
    case 'idle':
      return <div>Enter a search term</div>;
    case 'loading':
      return <div>Loading...</div>;
    case 'success':
      return <div>{searchState.data.found} results found</div>;
    case 'error':
      return <div>Error: {searchState.error.message}</div>;
    // TypeScript ensures all cases are handled
  }
}
```

### Builder Pattern for Search Requests

```typescript
class TypedSearchBuilder<T extends Record<string, any>> {
  private request: Partial<SearchRequest> = {};
  
  query(q: string): this {
    this.request.q = q;
    return this;
  }
  
  queryBy(...fields: Array<keyof T & string>): this {
    this.request.query_by = fields.join(',');
    return this;
  }
  
  filterBy(field: keyof T & string, operator: string, value: any): this {
    const filter = `${field}:${operator}${value}`;
    this.request.filter_by = this.request.filter_by 
      ? `${this.request.filter_by} && ${filter}`
      : filter;
    return this;
  }
  
  sortBy(field: keyof T & string, order: 'asc' | 'desc' = 'asc'): this {
    this.request.sort_by = `${field}:${order}`;
    return this;
  }
  
  facetBy(...fields: Array<keyof T & string>): this {
    this.request.facet_by = fields.join(',');
    return this;
  }
  
  page(page: number): this {
    this.request.page = page;
    return this;
  }
  
  perPage(perPage: number): this {
    this.request.per_page = perPage;
    return this;
  }
  
  build(): SearchRequest {
    if (!this.request.q || !this.request.query_by) {
      throw new Error('Query and queryBy are required');
    }
    return this.request as SearchRequest;
  }
}

// Usage
const searchRequest = new TypedSearchBuilder<Product>()
  .query('laptop')
  .queryBy('name', 'description')
  .filterBy('in_stock', '=', true)
  .filterBy('price', '<=', 1000)
  .sortBy('price', 'asc')
  .facetBy('category', 'brand')
  .page(1)
  .perPage(20)
  .build();
```

## Multi-Collection Types

### Basic Multi-Collection Search

```typescript
import {
  CollectionSearchConfig,
  MultiCollectionSearchRequest,
  MultiCollectionSearchResponse,
  useMultiCollectionSearch
} from '@jungle-commerce/typesense-react';

// Define configurations for each collection
const productConfig: CollectionSearchConfig = {
  collection: 'products',
  namespace: 'product',
  queryBy: 'name,description',
  maxResults: 20,
  weight: 1.5,
  filterBy: 'in_stock:true'
};

const categoryConfig: CollectionSearchConfig = {
  collection: 'categories',
  namespace: 'category',
  queryBy: 'name,description',
  maxResults: 10,
  weight: 1.0
};

// Use the hook
function MultiSearch() {
  const { search, results, loading } = useMultiCollectionSearch();
  
  const performSearch = async (query: string) => {
    await search({
      query,
      collections: [productConfig, categoryConfig],
      mergeStrategy: 'relevance',
      normalizeScores: true
    });
  };
  
  // Access merged results
  results?.hits.forEach(hit => {
    console.log(hit._collection); // Which collection it came from
    console.log(hit._namespace); // Namespace identifier
    console.log(hit._mergedScore); // Final merged score
  });
}
```

### Type-Safe Multi-Collection Results

```typescript
// Define a base type for multi-collection documents
interface BaseDocument {
  id: string;
  name: string;
  _collection: string;
}

interface ProductDoc extends BaseDocument {
  _collection: 'products';
  price: number;
  category: string;
}

interface CategoryDoc extends BaseDocument {
  _collection: 'categories';
  parent_id?: string;
  product_count: number;
}

type MultiDoc = ProductDoc | CategoryDoc;

// Type guard for collection-specific logic
function isProductDoc(doc: MultiDoc): doc is ProductDoc {
  return doc._collection === 'products';
}

// Usage with multi-collection search
const { results } = useMultiCollectionSearch();

results?.hits.forEach(hit => {
  const doc = hit.document as MultiDoc;
  
  if (isProductDoc(doc)) {
    console.log(`Product: ${doc.name} - $${doc.price}`);
  } else {
    console.log(`Category: ${doc.name} (${doc.product_count} products)`);
  }
});
```

## Type Guards and Utilities

### Custom Type Guards

```typescript
import { SearchHit, MultiCollectionSearchHit, FacetConfig } from '@jungle-commerce/typesense-react';

// Check if a hit is from multi-collection search
function isMultiCollectionHit(hit: SearchHit | MultiCollectionSearchHit): hit is MultiCollectionSearchHit {
  return '_collection' in hit && '_mergedScore' in hit;
}

// Check if a facet is numeric
function isNumericFacet(facet: FacetConfig): boolean {
  return facet.type === 'numeric';
}

// Check if a facet is disjunctive
function isDisjunctiveFacet(facet: FacetConfig): facet is FacetConfig & { disjunctive: true } {
  return facet.disjunctive === true;
}

// Validate search response
function hasResults<T>(response: TypesenseSearchResponse<T> | null): response is TypesenseSearchResponse<T> & { hits: SearchHit<T>[] } {
  return response !== null && response.hits !== undefined && response.hits.length > 0;
}

// Usage
const { state } = useSearch<Product>();

if (hasResults(state.results)) {
  // TypeScript knows that state.results.hits exists and is non-empty
  state.results.hits.forEach(hit => {
    console.log(hit.document.name);
  });
}
```

### Utility Types

```typescript
// Extract document type from search response
type ExtractDocument<T> = T extends TypesenseSearchResponse<infer D> ? D : never;

// Extract facet fields from configuration
type FacetFields<T extends readonly FacetConfig[]> = T[number]['field'];

// Create a partial filter state type
type PartialFilterState<T extends Record<string, any>> = {
  [K in keyof T]?: T[K] extends number ? { min?: number; max?: number } : string[];
};

// Usage examples
type ProductDoc = ExtractDocument<TypesenseSearchResponse<Product>>; // Product

const facets = [
  { field: 'category', label: 'Category', type: 'checkbox' },
  { field: 'price', label: 'Price', type: 'numeric' }
] as const;

type AvailableFacets = FacetFields<typeof facets>; // 'category' | 'price'

type ProductFilters = PartialFilterState<{
  category: string;
  price: number;
  brand: string;
}>; // { category?: string[]; price?: { min?: number; max?: number }; brand?: string[] }
```

## Common Pitfalls

### 1. Forgetting to Type Generic Hooks

```typescript
// Bad - loses type information
const { state } = useSearch(); // state.results?.hits[0].document is any

// Good - maintains type safety
const { state } = useSearch<Product>(); // state.results?.hits[0].document is Product
```

### 2. Incorrect Filter Type Usage

```typescript
// Bad - mixing filter types
const filters = {
  category: ['electronics'], // Should use disjunctiveFacets
  price: { min: 100 }, // Should use numericFilters
  created_at: '2024-01-01' // Should use dateFilters
};

// Good - using correct filter states
const { actions } = useAdvancedFacets();

// Disjunctive (OR) filters
actions.toggleFacetValue('category', 'electronics');

// Numeric range filters
actions.setNumericFilter('price', 100, 1000);

// Date filters
actions.setDateFilter('created_at', new Date('2024-01-01'), new Date('2024-12-31'));
```

### 3. Not Handling Nullable Results

```typescript
// Bad - doesn't handle null case
const { state } = useSearch<Product>();
const firstProduct = state.results.hits[0].document; // Error if results is null

// Good - proper null checking
const firstProduct = state.results?.hits?.[0]?.document;

// Or with type guard
if (state.results && state.results.hits.length > 0) {
  const firstProduct = state.results.hits[0].document; // Safe access
}
```

### 4. Mixing Search Request Formats

```typescript
// Bad - mixing Typesense native format with library format
const searchParams = {
  q: 'laptop',
  queryBy: 'name,description', // Should use query_by
  filterBy: 'price:>100', // Should use filter_by
};

// Good - using correct property names
const searchParams: SearchRequest = {
  q: 'laptop',
  query_by: 'name,description',
  filter_by: 'price:>100',
  facet_by: 'category,brand'
};
```

### 5. Incorrect Type Assertions

```typescript
// Bad - unsafe type assertion
const results = {} as TypesenseSearchResponse<Product>;

// Good - proper typing with defaults
const results: TypesenseSearchResponse<Product> = {
  hits: [],
  found: 0,
  search_time_ms: 0,
  page: 1,
  request_params: {
    q: '',
    query_by: ''
  }
};
```

## Best Practices

1. **Always use generic types** with hooks and components for type safety
2. **Define document interfaces** that match your Typesense schema
3. **Use type guards** for runtime type checking
4. **Leverage discriminated unions** for state management
5. **Create reusable type utilities** for common patterns
6. **Validate external data** before type assertions
7. **Use const assertions** for literal types in configurations
8. **Export commonly used types** from a central location
9. **Document complex types** with JSDoc comments
10. **Test type definitions** with TypeScript's strict mode enabled