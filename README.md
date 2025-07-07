# @jungle-commerce/typesense-react

A powerful, headless React library for building search experiences with Typesense. This package provides comprehensive search state management, advanced filtering, multi-collection search, and automatic schema discovery - all without UI dependencies.

## Features

- 🚀 **React Hooks** - Simple hooks like `useSearch` and `useAdvancedFacets` for instant search
- 🔧 **TypeScript First** - Full type safety and IntelliSense support
- ⚡ **Performance Optimized** - Request debouncing, caching, and smart re-rendering
- 🎨 **UI Agnostic** - Works with any React UI library (Material-UI, Ant Design, etc.)
- 🔍 **Advanced Search** - Filtering, faceting, sorting, and geo-search out of the box
- 📱 **Multi-Collection** - Search across multiple collections simultaneously
- 🤖 **AI Ready** - Claude MCP integration for AI-powered search assistance
- 🧠 **Schema Discovery** - Automatically configure search based on your data

## Documentation

📚 **[Full Documentation](./docs/README.md)** - Comprehensive guides, API reference, and examples

### Quick Links

- **Getting Started**
  - [Installation and Setup](./docs/getting-started/01-installation.md)
  - [Hello World](./docs/getting-started/02-hello-world.md)
  - [Basic Search](./docs/getting-started/03-basic-search.md)
  - [Adding Filters](./docs/getting-started/04-adding-filters.md)
  - [Pagination](./docs/getting-started/05-pagination.md)

- **API Reference**
  - [Core API Reference](./docs/api-reference/core-api-reference.md)
  - [Hooks API Reference](./docs/api-reference/hooks-api-reference.md)
  - [Providers Guide](./docs/api-reference/providers-guide.md)
  - [Context API](./docs/api-reference/context-api.md)
  - [TypeScript Reference](./docs/api-reference/typescript-reference.md)
  - [Migration Guide](./docs/api-reference/migration-guide.md)

- **Guides & Tutorials**
  - [Basic Search Tutorial](./docs/guides/basic-search-tutorial.md)
  - [Faceted Search Tutorial](./docs/guides/faceted-search-tutorial.md)
  - [Multi-Collection Search](./docs/guides/multi-collection-tutorial.md)
  - [Filter Builder Guide](./docs/guides/filter-builder-guide.md)
  - [Sort Builder Guide](./docs/guides/sort-builder-guide.md)
  - [Date Helpers Guide](./docs/guides/date-helpers-guide.md)
  - [Utilities Reference](./docs/guides/utilities-reference.md)
  - [Testing Guide](./docs/guides/testing-guide.md)
  - [Integration Patterns](./docs/guides/integration-patterns.md)
  - [Troubleshooting](./docs/guides/troubleshooting.md)

- **Examples**
  - [Minimal Search](./examples/01-minimal-search/) - Simplest possible search implementation
  - [Product Search](./examples/02-product-search/) - E-commerce product search with filters
  - [Documentation Search](./examples/03-documentation-search/) - Search through documentation
  - [Multi-Collection Search](./examples/04-multi-collection/) - Search across multiple collections
  - [Basic Search App](./examples/basic-search/) - Basic search with TypeScript
  - [Advanced Filtering](./examples/advanced-filtering/) - Complex filtering examples
  - [Multi-Collection Demo](./examples/multi-collection/) - Another multi-collection example

### Additional Documentation

- **Testing Documentation**
  - [Testing Guide](./docs/TESTING.md) - Comprehensive testing documentation
  - [Integration Testing](./docs/INTEGRATION_TESTING.md) - Integration test setup
  - [Test Infrastructure](./docs/TEST_INFRASTRUCTURE.md) - Test infrastructure details

- **Code Examples**
  - [Feature Examples](./docs/feature-examples.md) - Examples of all features
  - [Error Handling Examples](./docs/error-handling-examples.md) - Error handling patterns
  - [Date Filtering Examples](./docs/date-filtering-examples.md) - Date filter examples
  - [Performance Optimization Examples](./docs/performance-optimization-examples.md) - Performance tips

- **API Pattern Documentation**
  - [Core Patterns](./docs/api-reference/core-patterns.md) - Core API patterns
  - [Hooks Patterns](./docs/api-reference/hooks-patterns.md) - Hook usage patterns
  - [Core Examples](./docs/api-reference/core-examples.md) - Core API examples
  - [Hooks Examples](./docs/api-reference/hooks-examples.md) - Hook examples
  - [Provider Examples](./docs/api-reference/provider-examples.md) - Provider examples
  - [Type Examples](./docs/api-reference/type-examples.md) - TypeScript type examples

## Installation

```bash
npm install @jungle-commerce/typesense-react typesense
```

## Quick Start Examples

### Connecting to Typesense

```tsx
import { TypesenseConfig } from '@jungle-commerce/typesense-react';

const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'your-search-api-key',
  connectionTimeoutSeconds: 2,
  cacheSearchResultsForSeconds: 60 // 1 minute cache
};
```

### Retrieving a Schema

```tsx
import { TypesenseSearchClient } from '@jungle-commerce/typesense-react';

const client = new TypesenseSearchClient(typesenseConfig);
const schema = await client.retrieveSchema('products');
console.log(schema);
```

## Static/Fixed Configuration Examples

### Simple Query

```tsx
import React from 'react';
import { SearchProvider, useSearch } from '@jungle-commerce/typesense-react';

function App() {
  return (
    <SearchProvider 
      config={typesenseConfig} 
      collection="products"
      searchOnMount={true}
    >
      <SearchInterface />
    </SearchProvider>
  );
}

function SearchInterface() {
  const { state, actions } = useSearch();

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
      />
      
      {state.loading && <p>Searching...</p>}
      
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>
          <h3>{hit.document.name}</h3>
          <p>{hit.document.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Filtered Query

```tsx
import { SearchProvider, useSearch, useAdvancedFacets } from '@jungle-commerce/typesense-react';

function App() {
  const facetConfig = [
    {
      field: 'category',
      label: 'Category',
      type: 'checkbox',
      disjunctive: true // Allow multiple selections with OR logic
    },
    {
      field: 'price',
      label: 'Price Range',
      type: 'numeric',
      numericDisplay: 'range'
    }
  ];

  return (
    <SearchProvider 
      config={typesenseConfig} 
      collection="products"
      facets={facetConfig}
      searchOnMount={true}
    >
      <FilteredSearch />
    </SearchProvider>
  );
}

function FilteredSearch() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();

  return (
    <div>
      {/* Category Filter */}
      <div>
        <h4>Categories</h4>
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

      {/* Price Range Filter */}
      <div>
        <h4>Price Range</h4>
        <input
          type="range"
          min="0"
          max="1000"
          value={facets.numericFilters.price?.min || 0}
          onChange={(e) => facets.actions.setNumericFilter('price', 
            Number(e.target.value), 
            facets.numericFilters.price?.max || 1000
          )}
        />
      </div>

      {/* Results */}
      <div>
        {state.results?.hits.map(hit => (
          <div key={hit.document.id}>
            <h3>{hit.document.name}</h3>
            <p>Category: {hit.document.category}</p>
            <p>Price: ${hit.document.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Query with Sorting

```tsx
function SortedSearch() {
  const { state, actions } = useSearch();

  return (
    <div>
      <select 
        value={state.sortBy} 
        onChange={(e) => actions.setSortBy(e.target.value)}
      >
        <option value="">Relevance</option>
        <option value="price:asc">Price: Low to High</option>
        <option value="price:desc">Price: High to Low</option>
        <option value="created_at:desc">Newest First</option>
      </select>

      {/* Results sorted according to selection */}
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>{hit.document.name}</div>
      ))}
    </div>
  );
}
```

### Query with Faceting

```tsx
function FacetedSearch() {
  const facetConfig = [
    { field: 'brand', label: 'Brand', type: 'checkbox', disjunctive: true },
    { field: 'color', label: 'Color', type: 'select' },
    { field: 'in_stock', label: 'Availability', type: 'checkbox' }
  ];

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfig}
      searchOnMount={true}
      enableDisjunctiveFacetQueries={true} // Enable OR logic for disjunctive facets
    >
      <FacetInterface />
    </SearchProvider>
  );
}

function FacetInterface() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();

  return (
    <div>
      {state.facets.map(facetConfig => {
        const facetResults = state.results?.facet_counts?.find(
          f => f.field_name === facetConfig.field
        );

        if (facetConfig.type === 'select') {
          return (
            <select
              key={facetConfig.field}
              value={facets.selectiveFilters[facetConfig.field] || ''}
              onChange={(e) => facets.actions.setSelectiveFilter(
                facetConfig.field, 
                e.target.value
              )}
            >
              <option value="">All {facetConfig.label}</option>
              {facetResults?.counts.map(item => (
                <option key={item.value} value={item.value}>
                  {item.value} ({item.count})
                </option>
              ))}
            </select>
          );
        }

        return (
          <div key={facetConfig.field}>
            <h4>{facetConfig.label}</h4>
            {facetResults?.counts.map(item => (
              <label key={item.value}>
                <input
                  type="checkbox"
                  checked={facets.disjunctiveFacets[facetConfig.field]?.includes(item.value)}
                  onChange={() => facets.actions.toggleFacetValue(facetConfig.field, item.value)}
                />
                {item.value} ({item.count})
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

### Query Utilizing All Functionality

```tsx
function AdvancedSearch() {
  const facetConfig = [
    { field: 'category', label: 'Category', type: 'checkbox', disjunctive: true },
    { field: 'price', label: 'Price', type: 'numeric', numericDisplay: 'range' },
    { field: 'rating', label: 'Rating', type: 'numeric', numericDisplay: 'checkbox' },
    { field: 'release_date', label: 'Release Date', type: 'date' },
    { field: 'status', label: 'Status', type: 'select' }
  ];

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfig}
      searchOnMount={true}
      accumulateFacets={true} // Remember facet values across searches
      initialState={{
        perPage: 24,
        sortBy: 'popularity:desc',
        additionalFilters: 'in_stock:true', // Native Typesense filter
        multiSortBy: [ // Multi-field sorting
          { field: 'popularity', order: 'desc' },
          { field: 'price', order: 'asc' }
        ]
      }}
    >
      <FullFeaturedSearch />
    </SearchProvider>
  );
}

function FullFeaturedSearch() {
  const { state, actions } = useSearch();
  const facets = useAdvancedFacets();
  
  // Calculate derived values
  const totalResults = state.results?.found || 0;
  const totalPages = Math.ceil(totalResults / state.perPage);
  const hasNextPage = state.page < totalPages;
  const hasPreviousPage = state.page > 1;

  return (
    <div>
      {/* Search Input */}
      <input
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search..."
      />

      {/* Additional Filters */}
      <button onClick={() => actions.setAdditionalFilters('featured:true && discount:>0')}>
        Show Featured & Discounted
      </button>

      {/* Multi-field Sort */}
      <button onClick={() => actions.setMultiSortBy([
        { field: 'rating', order: 'desc' },
        { field: 'price', order: 'asc' },
        { field: 'name', order: 'asc' }
      ])}>
        Sort by Rating, then Price, then Name
      </button>

      {/* All Facets */}
      <div>
        <h3>Filters ({facets.activeFilterCount} active)</h3>
        
        {/* Render all configured facets */}
        {/* ... facet rendering code ... */}
        
        <button onClick={() => facets.actions.clearAllFilters()}>
          Clear All Filters
        </button>
      </div>

      {/* Results */}
      <div>
        <p>Found {totalResults} results (Page {state.page} of {totalPages})</p>
        
        {state.results?.hits.map(hit => (
          <div key={hit.document.id}>
            {/* Highlighted fields */}
            <h3 dangerouslySetInnerHTML={{ 
              __html: hit.highlight?.name?.snippet || hit.document.name 
            }} />
          </div>
        ))}

        {/* Pagination */}
        <button 
          onClick={() => actions.setPage(state.page - 1)}
          disabled={!hasPreviousPage}
        >
          Previous
        </button>
        <button 
          onClick={() => actions.setPage(state.page + 1)}
          disabled={!hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Schema Discovery Examples

### Discovery with Specific Field Names

```tsx
import { useSchemaDiscovery, SearchProvider } from '@jungle-commerce/typesense-react';

function SchemaBasedSearch() {
  const { schema, facetConfigs, searchableFields, sortableFields } = useSchemaDiscovery({
    // Exclude certain fields from faceting
    excludeFields: ['internal_id', 'created_by'],
    maxFacets: 10,
    includeNumericFacets: true,
    includeDateFacets: true,
    onSchemaLoad: (schema) => {
      console.log('Schema loaded:', schema);
    }
  });

  if (!schema) return <div>Loading schema...</div>;

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs} // Auto-generated facet config
      initialSearchParams={{
        query_by: searchableFields.join(','), // Auto-detected searchable fields
        sort_by: sortableFields[0]?.field // First sortable field
      }}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### Discovery with Pattern Matching

```tsx
function PatternBasedDiscovery() {
  const { schema, facetConfigs } = useSchemaDiscovery({
    // Exclude fields by pattern
    patterns: {
      excludePatterns: [
        { pattern: 'internal', matchType: 'contains' },
        { pattern: '_id', matchType: 'endsWith' }
      ]
    },
    // Other configuration
    maxFacets: 8,
    includeNumericFacets: true,
    // Override specific field types
    facetOverrides: {
      price: { type: 'numeric', numericDisplay: 'range' },
      status: { type: 'select' },
      created_at: { type: 'date' }
    }
  });

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

## Dynamic Queries with Unknown Fields

### Simple Dynamic Query

```tsx
function DynamicSearch() {
  const { schema, facetConfigs, searchableFields } = useSchemaDiscovery();

  if (!schema) return <div>Discovering schema...</div>;

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
      initialSearchParams={{
        query_by: searchableFields.join(',') || '*'
      }}
      searchOnMount={true}
    >
      <GenericSearchInterface />
    </SearchProvider>
  );
}

function GenericSearchInterface() {
  const { state, actions } = useSearch();

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder={`Search in ${state.schema?.fields.length} fields...`}
      />
      
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>
          {/* Dynamically render all fields */}
          {Object.entries(hit.document).map(([key, value]) => (
            <p key={key}><strong>{key}:</strong> {JSON.stringify(value)}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Dynamic Filtered Query

```tsx
function DynamicFilteredSearch() {
  const { schema, facetConfigs } = useSchemaDiscovery({
    // Auto-detect facetable fields
    maxFacets: 15,
    includeNumericFacets: true,
    includeDateFacets: true
  });

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
    >
      <DynamicFilters />
    </SearchProvider>
  );
}

function DynamicFilters() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();

  return (
    <div>
      {state.facets.map(facetConfig => {
        const facetResult = state.results?.facet_counts?.find(
          f => f.field_name === facetConfig.field
        );

        // Render appropriate UI based on facet type
        switch (facetConfig.type) {
          case 'numeric':
            return <NumericFacet key={facetConfig.field} config={facetConfig} />;
          case 'date':
            return <DateFacet key={facetConfig.field} config={facetConfig} />;
          case 'select':
            return <SelectFacet key={facetConfig.field} config={facetConfig} />;
          default:
            return <CheckboxFacet key={facetConfig.field} config={facetConfig} />;
        }
      })}
    </div>
  );
}
```

### Dynamic Sorting

```tsx
function DynamicSortedSearch() {
  const { schema, sortableFields } = useSchemaDiscovery({
    collection: 'products',
    enabled: true
  });

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      initialState={{
        sortBy: sortableFields[0]?.field ? `${sortableFields[0].field}:desc` : ''
      }}
    >
      <DynamicSortInterface sortableFields={sortableFields} />
    </SearchProvider>
  );
}

function DynamicSortInterface({ sortableFields }) {
  const { state, actions } = useSearch();

  return (
    <div>
      <select value={state.sortBy} onChange={(e) => actions.setSortBy(e.target.value)}>
        <option value="">Relevance</option>
        {sortableFields.map(field => (
          <>
            <option key={`${field.field}-asc`} value={`${field.field}:asc`}>
              {field.label} (Low to High)
            </option>
            <option key={`${field.field}-desc`} value={`${field.field}:desc`}>
              {field.label} (High to Low)
            </option>
          </>
        ))}
      </select>
    </div>
  );
}
```

### Dynamic Faceting

```tsx
function DynamicFacetedSearch() {
  const { schema, facetConfigs } = useSchemaDiscovery({
    // Maximum facets to generate
    maxFacets: 10,
    includeNumericFacets: true,
    includeDateFacets: true,
    // Custom type overrides
    facetOverrides: {
      status: { type: 'select' },
      type: { type: 'select' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' }
    }
  });

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
      accumulateFacets={true}
    >
      <AutoFacetInterface />
    </SearchProvider>
  );
}
```

### Dynamic Query with All Features

```tsx
function FullDynamicSearch() {
  const { schema, facetConfigs, searchableFields, sortableFields } = useSchemaDiscovery({
    maxFacets: 20,
    includeNumericFacets: true,
    includeDateFacets: true
  });

  // Derive field groups from schema
  const fieldGroups = React.useMemo(() => {
    if (!schema?.fields) return { numericFields: [], booleanFields: [] };
    
    return {
      numericFields: schema.fields
        .filter(f => ['int32', 'int64', 'float'].includes(f.type))
        .map(f => f.name),
      booleanFields: schema.fields
        .filter(f => f.type === 'bool')
        .map(f => f.name)
    };
  }, [schema]);

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
      searchOnMount={true}
      accumulateFacets={true}
      initialSearchParams={{
        query_by: searchableFields.join(','),
        sort_by: sortableFields[0]?.field
      }}
      initialState={{
        // Dynamic multi-sort based on field types
        multiSortBy: [
          // First by any boolean "featured" field
          ...fieldGroups.booleanFields
            .filter(f => f.includes('featured'))
            .map(f => ({ field: f, order: 'desc' as const })),
          // Then by any numeric "score" or "rating" field
          ...fieldGroups.numericFields
            .filter(f => f.includes('score') || f.includes('rating'))
            .map(f => ({ field: f, order: 'desc' as const })),
          // Finally by name
          { field: 'name', order: 'asc' as const }
        ]
      }}
    >
      <DynamicSearchInterface />
    </SearchProvider>
  );
}
```

## Autocomplete Implementation

### Simple Autocomplete

```tsx
function Autocomplete() {
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      searchOnMount={false}
    >
      <AutocompleteInput 
        value={query}
        onChange={setQuery}
        suggestions={suggestions}
        onSuggestionsChange={setSuggestions}
      />
    </SearchProvider>
  );
}

function AutocompleteInput({ value, onChange, suggestions, onSuggestionsChange }) {
  const { state, actions } = useSearch();

  React.useEffect(() => {
    if (state.results && !state.loading) {
      // Extract suggestions from results
      const newSuggestions = state.results.hits.slice(0, 5).map(hit => ({
        id: hit.document.id,
        text: hit.document.name,
        highlight: hit.highlight?.name?.snippet
      }));
      onSuggestionsChange(newSuggestions);
    }
  }, [state.results, state.loading, onSuggestionsChange]);

  React.useEffect(() => {
    if (value.length >= 2) {
      actions.setQuery(value);
    } else {
      onSuggestionsChange([]);
    }
  }, [value, actions, onSuggestionsChange]);

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing..."
      />
      
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(suggestion => (
            <div 
              key={suggestion.id}
              onClick={() => onChange(suggestion.text)}
              dangerouslySetInnerHTML={{ 
                __html: suggestion.highlight || suggestion.text 
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Search-as-you-type Implementation

```tsx
function SearchAsYouType() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      searchOnMount={false}
      initialSearchParams={{
        query_by: 'name,description',
        prefix: true, // Enable prefix search
        num_typos: 2, // Allow typos
        min_len_1typo: 4, // Minimum length for 1 typo
        min_len_2typo: 7  // Minimum length for 2 typos
      }}
    >
      <InstantSearch />
    </SearchProvider>
  );
}

function InstantSearch() {
  const { state, actions } = useSearch();

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search instantly..."
        autoFocus
      />
      
      {state.query && (
        <div className="instant-results">
          {state.loading && <div className="typing-indicator">Searching...</div>}
          
          {!state.loading && state.results?.found === 0 && (
            <div>No results for "{state.query}"</div>
          )}
          
          {state.results?.hits.map(hit => (
            <div key={hit.document.id} className="instant-result">
              <strong dangerouslySetInnerHTML={{ 
                __html: hit.highlight?.name?.snippet || hit.document.name 
              }} />
              <small dangerouslySetInnerHTML={{ 
                __html: hit.highlight?.description?.snippet || hit.document.description 
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Multi-Collection Search

### Basic Multi-Collection Search

```tsx
import { MultiCollectionProvider, useMultiCollectionContext } from '@jungle-commerce/typesense-react';

function MultiSearch() {
  const collections = [
    {
      collection: 'products',
      queryBy: 'name,description,brand',
      weight: 2.0, // Products are twice as important
      maxResults: 20
    },
    {
      collection: 'categories',
      queryBy: 'name,description',
      weight: 1.0,
      maxResults: 5
    },
    {
      collection: 'brands',
      queryBy: 'name',
      weight: 1.0,
      maxResults: 5
    }
  ];

  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={collections}
    >
      <UnifiedSearch />
    </MultiCollectionProvider>
  );
}

function UnifiedSearch() {
  const { state, search, setQuery } = useMultiCollectionContext();

  const handleSearch = (query: string) => {
    setQuery(query);
    search({
      query,
      mergeStrategy: 'relevance', // Merge by relevance score
      normalizeScores: true,      // Normalize scores across collections
      resultMode: 'interleaved'   // Mix results together
    });
  };

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search everything..."
      />
      
      {state.results?.hits.map(hit => (
        <div key={`${hit._collection}-${hit.document.id}`}>
          <span className="collection-badge">{hit._collection}</span>
          <h3>{hit.document.name || hit.document.title}</h3>
          <p>Score: {hit._normalizedScore.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

### Multi-Collection with Schema Discovery

```tsx
function DynamicMultiSearch() {
  const [collections, setCollections] = useState([]);

  // Discover collections dynamically
  useEffect(() => {
    async function discoverCollections() {
      const client = new TypesenseSearchClient(typesenseConfig);
      const allCollections = await client.collections().retrieve();
      
      // Configure each collection based on its schema
      const configured = await Promise.all(
        allCollections.map(async (col) => {
          const schema = await client.collections(col.name).retrieve();
          const searchableFields = schema.fields
            .filter(f => f.type === 'string' || f.type === 'string[]')
            .map(f => f.name);
            
          return {
            collection: col.name,
            queryBy: searchableFields.join(','),
            weight: col.name === 'products' ? 2.0 : 1.0,
            maxResults: 10
          };
        })
      );
      
      setCollections(configured);
    }
    
    discoverCollections();
  }, []);

  if (collections.length === 0) return <div>Loading collections...</div>;

  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={collections}
    >
      <DynamicUnifiedSearch />
    </MultiCollectionProvider>
  );
}
```

### Multi-Collection Autocomplete

```tsx
function MultiCollectionAutocomplete() {
  const collections = [
    {
      collection: 'products',
      queryBy: 'name,sku',
      maxResults: 3,
      namespace: 'product'
    },
    {
      collection: 'categories', 
      queryBy: 'name,path',
      maxResults: 2,
      namespace: 'category'
    },
    {
      collection: 'brands',
      queryBy: 'name',
      maxResults: 2,
      namespace: 'brand'
    }
  ];

  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={collections}
      searchOptions={{
        debounceMs: 150,
        searchOnMount: false
      }}
    >
      <MultiAutocomplete />
    </MultiCollectionProvider>
  );
}

function MultiAutocomplete() {
  const { state, search, setQuery } = useMultiCollectionContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      search({
        query: value,
        resultMode: 'perCollection', // Group by collection
        perCollectionLimit: 5
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="multi-autocomplete">
      <input
        value={state.query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Search products, categories, brands..."
      />
      
      {isOpen && state.results?.hitsByCollection && (
        <div className="suggestions-panel">
          {Object.entries(state.results.hitsByCollection).map(([collection, hits]) => (
            <div key={collection} className="collection-group">
              <h4>{collection}</h4>
              {hits.map(hit => (
                <div 
                  key={hit.document.id}
                  className="suggestion"
                  onClick={() => {
                    // Handle selection based on namespace
                    console.log(`Selected ${hit._namespace}: ${hit.document.name}`);
                    setIsOpen(false);
                  }}
                >
                  {hit.highlight?.name?.snippet || hit.document.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Multi-Collection Search-as-you-type

```tsx
function MultiCollectionInstantSearch() {
  const collections = [
    {
      collection: 'products',
      queryBy: 'name,description',
      weight: 2.0,
      includeFields: 'id,name,price,image',
      maxResults: 10
    },
    {
      collection: 'help_articles',
      queryBy: 'title,content',
      weight: 1.0,
      includeFields: 'id,title,excerpt',
      maxResults: 5
    }
  ];

  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={collections}
      searchOptions={{
        debounceMs: 100,
        minQueryLength: 2
      }}
    >
      <InstantMultiSearch />
    </MultiCollectionProvider>
  );
}

function InstantMultiSearch() {
  const { state, search, setQuery, clearResults } = useMultiCollectionContext();

  useEffect(() => {
    if (state.query.length >= 2) {
      search({
        query: state.query,
        enableHighlighting: true,
        highlightConfig: {
          startTag: '<mark>',
          endTag: '</mark>'
        },
        // Use round-robin to ensure variety
        mergeStrategy: 'roundRobin',
        globalMaxResults: 20
      });
    } else {
      clearResults();
    }
  }, [state.query]);

  return (
    <div className="instant-multi-search">
      <input
        value={state.query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Start typing to search..."
        className="search-input"
      />
      
      <div className="results-container">
        {state.loading && <div className="loading">Searching...</div>}
        
        {state.results?.hits.map(hit => (
          <div 
            key={`${hit._collection}-${hit.document.id}`}
            className={`result-item ${hit._collection}`}
          >
            <div className="result-header">
              <span className="collection-label">{hit._collection}</span>
              <span className="relevance-score">
                {(hit._normalizedScore * 100).toFixed(0)}% match
              </span>
            </div>
            
            {hit._collection === 'products' ? (
              <ProductResult hit={hit} />
            ) : (
              <ArticleResult hit={hit} />
            )}
          </div>
        ))}
        
        {state.results && state.results.totalFound === 0 && (
          <div className="no-results">
            No results found for "{state.query}"
          </div>
        )}
      </div>
    </div>
  );
}

function ProductResult({ hit }) {
  return (
    <div className="product-result">
      {hit.document.image && (
        <img src={hit.document.image} alt={hit.document.name} />
      )}
      <div>
        <h3 dangerouslySetInnerHTML={{ 
          __html: hit.highlight?.name?.snippet || hit.document.name 
        }} />
        <p className="price">${hit.document.price}</p>
      </div>
    </div>
  );
}

function ArticleResult({ hit }) {
  return (
    <div className="article-result">
      <h3 dangerouslySetInnerHTML={{ 
        __html: hit.highlight?.title?.snippet || hit.document.title 
      }} />
      <p dangerouslySetInnerHTML={{ 
        __html: hit.highlight?.excerpt?.snippet || hit.document.excerpt 
      }} />
    </div>
  );
}
```

---

## Previous Documentation

The following sections contain additional advanced features and implementation details:

### Advanced Features

- [Advanced Faceting](#advanced-faceting) - Multiple filter types with disjunctive support
- [UI State Management](#ui-state-management) - Built-in facet UI state handling  
- [Advanced Filtering](#advanced-filtering) - Raw Typesense filter support
- [Schema Intelligence](#schema-intelligence) - Auto-configuration from schema
- [Performance Optimization](#performance-optimization) - Caching and query optimization
- [URL State Management](#url-state-management) - Shareable search URLs

### Advanced Faceting

Configure different facet types based on your data:

```tsx
const facetConfig = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',      // Multi-select checkboxes
    disjunctive: true,     // OR logic between selections
    maxValues: 10,         // Maximum values to show
    searchable: true,      // Enable search within facet
    sortBy: 'count'        // Sort by count or value
  },
  {
    field: 'price',
    label: 'Price',
    type: 'numeric',       // Numeric range filter
    numericDisplay: 'range', // 'checkbox' | 'range' | 'both'
    rangeStep: 10          // Step size for range slider
  },
  {
    field: 'created_at',
    label: 'Date Added',
    type: 'date',          // Date range picker
    dateFormat: 'YYYY-MM-DD'
  },
  {
    field: 'status',
    label: 'Status',
    type: 'select'         // Single-select dropdown
  },
  {
    field: 'tags',
    label: 'Tags',
    type: 'custom',        // Custom filter type
    renderLabel: (value) => value.toUpperCase()
  }
];
```

### UI State Management

The `useFacetState` hook manages UI state for facets:

```tsx
// Global facet UI state
const facetUI = useFacetState();

// Search within facet values
facetUI.setFacetSearch('category', 'elec');
const filteredValues = values.filter(v => 
  v.value.toLowerCase().includes(facetUI.getFacetSearch('category'))
);

// Manage facet expansion
facetUI.toggleFacetExpanded('category');
const isExpanded = facetUI.isFacetExpanded('category');

// Track scroll position
facetUI.setFacetScrollTop('category', 100);
const scrollTop = facetUI.getFacetScrollTop('category');
```

### Advanced Filtering and Sorting

The package now supports native Typesense filter_by strings and multi-field sorting:

```tsx
// Add raw Typesense filters
actions.setAdditionalFilters('in_stock:true && (category:electronics || category:computers)');

// Multi-field sorting
actions.setMultiSortBy([
  { field: 'price', order: 'desc' },
  { field: 'rating', order: 'desc' },
  { field: 'name', order: 'asc' }
]);

// Or use in initial state
<SearchProvider
  initialState={{
    additionalFilters: 'featured:true && discount:>0',
    multiSortBy: [
      { field: 'popularity', order: 'desc' },
      { field: 'price', order: 'asc' }
    ]
  }}
>
```

### Performance Optimization

```tsx
<SearchProvider
  config={config}
  collection="products"
  performanceMode={true}                    // Disable expensive features
  enableDisjunctiveFacetQueries={false}     // Disable parallel facet queries
  accumulateFacets={false}                  // Disable facet accumulation
>
```

### Utility Functions

Build complex filter strings programmatically:

```tsx
import { 
  buildDisjunctiveFilter,
  buildNumericFilter,
  buildDateFilter,
  combineFilters,
  buildMultiSortString,
  parseSortString
} from '@jungle-commerce/typesense-react';

// Build filters
const categoryFilter = buildDisjunctiveFilter('category', ['Electronics', 'Books']);
const priceFilter = buildNumericFilter('price', 10, 100);
const combined = combineFilters([categoryFilter, priceFilter]);

// Build sort strings
const sortString = buildMultiSortString([
  { field: 'price', order: 'desc' },
  { field: 'name', order: 'asc' }
]); // Returns: "price:desc,name:asc"
```

## API Reference

For detailed API documentation, see the [API Reference](#api-reference) section in the original documentation above.

## Testing

### Quick Start

```bash
# Run unit tests
pnpm test

# Run integration tests (requires Docker)
pnpm test:integration

# Run all tests with coverage
pnpm test:all:coverage
```

### Test Setup

1. **Install dependencies**: `pnpm install`
2. **For integration tests**: Ensure Docker is installed and running
3. **Run tests**: Use the commands above

For detailed testing documentation, see our [Testing Guide](docs/TESTING.md).

### Testing Your Implementation

When using typesense-react in your application:

```tsx
import { SearchProvider } from '@jungle-commerce/typesense-react';
import { render } from '@testing-library/react';

const renderWithSearch = (ui: React.ReactElement) => {
  return render(
    <SearchProvider config={mockConfig} collection="test">
      {ui}
    </SearchProvider>
  );
};

// Test your components
it('should search when typing', async () => {
  renderWithSearch(<YourSearchComponent />);
  // ... test implementation
});
```

## Claude Integration

This package includes comprehensive Claude MCP (Model Context Protocol) integration documentation:
- [Claude Integration Guide](./docs/claude-mcp/claude-integration.md)
- [Claude API Reference](./docs/claude-mcp/api-reference-claude.md)
- [Claude Examples](./docs/claude-mcp/claude-examples.md)

## Testing

```bash
# Run unit tests
pnpm test

# Run integration tests (requires Docker)
pnpm test:integration

# Run all tests with coverage
pnpm test:all:coverage
```

For detailed testing documentation, see our [Testing Guide](./docs/guides/testing-guide.md).

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md).

## Support

- [GitHub Issues](https://github.com/jungle-commerce/typesense-react/issues)
- [NPM Package](https://www.npmjs.com/package/@jungle-commerce/typesense-react)
- [Documentation](./docs)

## License

MIT © Jungle Commerce