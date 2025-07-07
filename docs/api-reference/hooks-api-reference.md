# Typesense React Hooks API Reference

This document provides comprehensive API documentation for all hooks available in the typesense-react library.

## Table of Contents

1. [useSearch](#usesearch)
2. [useAdvancedFacets](#useadvancedfacets)
3. [useSchemaDiscovery](#useschemadiscovery)
4. [useMultiCollectionSearch](#usemulticollectionsearch)
5. [useFacetState](#usefacetstate)
6. [useAccumulatedFacets](#useaccumulatedfacets)
7. [useAdditionalFilters](#useadditionalfilters)
8. [useDateFilter](#usedatefilter)
9. [useFacetMode](#usefacetmode)
10. [useNumericFacetRange](#usenumericfacetrange)

---

## useSearch

Main hook for performing searches and managing search state. Handles query debouncing, filter building, and automatic search triggers.

### Usage

```typescript
import { useSearch } from 'typesense-react';

const searchHook = useSearch(options);
```

### Parameters

#### options: `UseSearchOptions` (optional)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `queryBy` | `string` | `undefined` | Fields to search in (comma-separated) |
| `debounceMs` | `number` | `300` | Debounce delay for search queries in milliseconds |
| `searchOnMount` | `boolean` | `true` | Whether to search on mount |
| `maxFacetValues` | `number` | `10000` | Maximum number of facet values to return |
| `onSearchSuccess` | `(results: any) => void` | `undefined` | Callback when search succeeds |
| `onSearchError` | `(error: Error) => void` | `undefined` | Callback when search fails |

### Return Value: `UseSearchReturn`

```typescript
interface UseSearchReturn {
  state: SearchState;
  actions: {
    search: (query?: string) => Promise<void>;
    setQuery: (query: string) => void;
    setPage: (page: number) => void;
    setPerPage: (perPage: number) => void;
    setSortBy: (sortBy: string) => void;
    clearAllFilters: () => void;
    reset: () => void;
    setAdditionalFilters: (filters: string) => void;
    setMultiSortBy: (sorts: Array<{ field: string; order: 'asc' | 'desc' }>) => void;
    addSortField: (field: string, order?: 'asc' | 'desc') => void;
    removeSortField: (field: string) => void;
    clearMultiSort: () => void;
  };
  loading: boolean;
  error: Error | null;
}
```

### Example

```typescript
function SearchComponent() {
  const { state, actions, loading, error } = useSearch({
    queryBy: 'title,description',
    debounceMs: 500,
    searchOnMount: false,
    onSearchSuccess: (results) => console.log('Search completed', results),
    onSearchError: (error) => console.error('Search failed', error)
  });

  return (
    <div>
      <input
        type="text"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search..."
      />
      
      {loading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}
      
      {state.results?.hits?.map((hit) => (
        <div key={hit.document.id}>
          {hit.document.title}
        </div>
      ))}
    </div>
  );
}
```

### Helper Functions

- `isDisjunctiveFacet(facetConfig)`: Check if a facet is disjunctive
- `getTotalResults(state)`: Get total results count
- `getTotalPages(state)`: Get total pages
- `hasNextPage(state)`: Check if there's a next page
- `hasPreviousPage(state)`: Check if there's a previous page
- `getResultsRange(state)`: Get current results range string

---

## useAdvancedFacets

Hook for managing advanced faceting functionality including disjunctive, numeric, date, selective, and custom filters.

### Usage

```typescript
import { useAdvancedFacets } from 'typesense-react';

const facets = useAdvancedFacets(onFacetChange);
```

### Parameters

#### onFacetChange: `(filterType: string, field: string, value: any) => void` (optional)

Callback function triggered when facets change.

### Return Value: `UseAdvancedFacetsReturn`

```typescript
interface UseAdvancedFacetsReturn {
  // Filter states
  disjunctiveFacets: DisjunctiveFacetState;
  numericFilters: NumericFilterState;
  dateFilters: DateFilterState;
  selectiveFilters: SelectiveFilterState;
  customFilters: CustomFilterState;
  activeFilterCount: number;

  // Actions
  actions: {
    toggleFacetValue: (field: string, value: string) => void;
    setNumericFilter: (field: string, min?: number, max?: number) => void;
    setDateFilter: (field: string, start?: Date | string, end?: Date | string) => void;
    setSelectiveFilter: (field: string, value: string) => void;
    setCustomFilter: (field: string, values: string[]) => void;
    clearFilter: (field: string, filterType: 'disjunctive' | 'numeric' | 'date' | 'selective' | 'custom') => void;
    clearAllFilters: () => void;
  };
}
```

### Example

```typescript
function FacetFilters() {
  const facets = useAdvancedFacets((filterType, field, value) => {
    console.log(`Filter changed: ${filterType} ${field}`, value);
  });

  return (
    <div>
      {/* Disjunctive facets (checkboxes) */}
      <label>
        <input
          type="checkbox"
          checked={facets.disjunctiveFacets.category?.includes('Electronics')}
          onChange={() => facets.actions.toggleFacetValue('category', 'Electronics')}
        />
        Electronics
      </label>

      {/* Numeric range filter */}
      <div>
        <input
          type="number"
          placeholder="Min price"
          onChange={(e) => facets.actions.setNumericFilter('price', Number(e.target.value))}
        />
        <input
          type="number"
          placeholder="Max price"
          onChange={(e) => facets.actions.setNumericFilter('price', undefined, Number(e.target.value))}
        />
      </div>

      {/* Date range filter */}
      <input
        type="date"
        onChange={(e) => facets.actions.setDateFilter('created_at', e.target.value)}
      />

      <button onClick={() => facets.actions.clearAllFilters()}>
        Clear All ({facets.activeFilterCount} active)
      </button>
    </div>
  );
}
```

### Helper Functions

- `parseFilters(filterString)`: Parse filters from URL or saved state
- `hasActiveFilters(field, filters)`: Check if a field has active filters
- `getActiveFilterValues(field, filters)`: Get active filter values for a field

---

## useSchemaDiscovery

Hook for discovering and analyzing Typesense collection schemas to automatically configure facets and search fields.

### Usage

```typescript
import { useSchemaDiscovery } from 'typesense-react';

const discovery = useSchemaDiscovery(options);
```

### Parameters

#### options: `SchemaDiscoveryOptions` (optional)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `patterns` | `SchemaPatternConfig` | `{}` | Pattern configuration for field discovery |
| `excludeFields` | `string[]` | `[]` | Fields to exclude from faceting (deprecated) |
| `maxFacets` | `number` | `20` | Maximum number of facets to create |
| `includeNumericFacets` | `boolean` | `true` | Whether to include numeric fields as facets |
| `includeDateFacets` | `boolean` | `true` | Whether to include date fields as facets |
| `facetOverrides` | `Record<string, Partial<FacetConfig>>` | `{}` | Custom facet configuration overrides |
| `onSchemaLoad` | `(schema: CollectionSchema) => void` | `undefined` | Callback when schema is loaded |

### Return Value

```typescript
interface SchemaDiscoveryReturn {
  schema: CollectionSchema | null;
  facetConfigs: FacetConfig[];
  searchableFields: string[];
  sortableFields: Array<{
    field: string;
    label: string;
    type: string;
  }>;
  isLoading: boolean;
  error: Error | null;
}
```

### Example

```typescript
function AutoConfiguredSearch() {
  const { schema, facetConfigs, searchableFields, sortableFields, isLoading, error } = useSchemaDiscovery({
    maxFacets: 10,
    includeNumericFacets: true,
    includeDateFacets: false,
    patterns: {
      excludePatterns: [
        { pattern: 'internal_', matchType: 'prefix' },
        { pattern: '_id$', matchType: 'suffix' }
      ],
      datePatterns: [
        { pattern: '_date$', matchType: 'suffix' },
        { pattern: '_at$', matchType: 'suffix' }
      ]
    },
    facetOverrides: {
      category: { type: 'select', expanded: false },
      price: { type: 'range', rangeStep: 10 }
    },
    onSchemaLoad: (schema) => console.log('Schema loaded', schema)
  });

  if (isLoading) return <div>Loading schema...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Auto-discovered Facets</h3>
      {facetConfigs.map(config => (
        <div key={config.field}>
          {config.label} ({config.type})
        </div>
      ))}

      <h3>Searchable Fields</h3>
      <p>{searchableFields.join(', ')}</p>

      <h3>Sortable Fields</h3>
      <select>
        {sortableFields.map(field => (
          <option key={field.field} value={field.field}>
            {field.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Helper Functions

- `shouldBeDisjunctive(field, patterns?)`: Determine if a field should be a disjunctive facet
- `getDefaultSortField(schema, timestampPatterns?)`: Get the default sort field from schema

---

## useMultiCollectionSearch

Hook for performing searches across multiple Typesense collections with result merging and relevance scoring.

### Usage

```typescript
import { useMultiCollectionSearch } from 'typesense-react';

const multiSearch = useMultiCollectionSearch(client, options);
```

### Parameters

#### client: `MultiCollectionSearchClient | TypesenseSearchClient`

The Typesense client instance.

#### options: `UseMultiCollectionSearchOptions` (optional)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `defaultCollections` | `CollectionSearchConfig[]` | `[]` | Default collections to search |
| `defaultMergeStrategy` | `'relevance' | 'timestamp' | 'custom'` | `'relevance'` | How to merge results |
| `searchOnMount` | `boolean` | `false` | Whether to search on mount |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds |
| `onSearchComplete` | `(results: MultiCollectionSearchResponse) => void` | `undefined` | Callback on search completion |
| `onSearchError` | `(error: Error) => void` | `undefined` | Callback on search error |

### Return Value: `UseMultiCollectionSearchReturn`

```typescript
interface UseMultiCollectionSearchReturn {
  // State
  state: MultiCollectionSearchState;
  query: string;
  results: MultiCollectionSearchResponse | null;
  loading: boolean;
  error: Error | null;
  
  // Methods
  search: (requestOrQuery: MultiCollectionSearchRequest | string, collections?: CollectionSearchConfig[]) => Promise<void>;
  setQuery: (query: string) => void;
  clearResults: () => void;
  updateCollections: (collections: CollectionSearchConfig[]) => void;
  getResultsByCollection: (collection: string) => CollectionSearchResult | undefined;
  getCollectionStats: () => Record<string, { found: number; included: number; searchTime: number }>;
}
```

### Example

```typescript
function MultiCollectionSearchComponent() {
  const multiSearch = useMultiCollectionSearch(typesenseClient, {
    defaultCollections: [
      {
        name: 'products',
        query_by: 'name,description',
        weight: 2,
        filter_by: 'in_stock:true'
      },
      {
        name: 'articles',
        query_by: 'title,content',
        weight: 1
      }
    ],
    defaultMergeStrategy: 'relevance',
    debounceMs: 500,
    onSearchComplete: (results) => {
      console.log(`Found ${results.totalFound} results across collections`);
    }
  });

  const stats = multiSearch.getCollectionStats();

  return (
    <div>
      <input
        type="text"
        value={multiSearch.query}
        onChange={(e) => multiSearch.setQuery(e.target.value)}
        placeholder="Search across collections..."
      />

      {multiSearch.loading && <div>Searching...</div>}

      {multiSearch.results?.mergedHits.map((hit, index) => (
        <div key={index}>
          <h4>{hit.document.title || hit.document.name}</h4>
          <p>From: {hit.collection}</p>
          <p>Score: {hit.score}</p>
        </div>
      ))}

      <div>
        <h3>Collection Stats</h3>
        {Object.entries(stats).map(([collection, stat]) => (
          <div key={collection}>
            {collection}: {stat.included}/{stat.found} results ({stat.searchTime}ms)
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## useFacetState

Hook for managing UI state of facets (search, expansion, scroll position) that needs to persist across re-renders but not in the main search state.

### Usage

```typescript
import { useFacetState } from 'typesense-react';

const facetState = useFacetState();
```

### Return Value

```typescript
interface UseFacetStateReturn {
  getFacetState: (field: string) => FacetUIState;
  setFacetSearch: (field: string, query: string) => void;
  toggleFacetExpansion: (field: string, expanded?: boolean) => void;
  setFacetScroll: (field: string, scrollTop: number) => void;
  resetFacetState: (field: string) => void;
  resetAllFacetStates: () => void;
}

interface FacetUIState {
  searchQuery: string;
  isExpanded: boolean;
  scrollTop: number;
}
```

### Example

```typescript
function FacetComponent({ field, label }) {
  const facetState = useFacetState();
  const state = facetState.getFacetState(field);

  return (
    <div>
      <h3 onClick={() => facetState.toggleFacetExpansion(field)}>
        {label} {state.isExpanded ? '▼' : '▶'}
      </h3>
      
      {state.isExpanded && (
        <>
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => facetState.setFacetSearch(field, e.target.value)}
            placeholder="Search values..."
          />
          
          <div
            onScroll={(e) => facetState.setFacetScroll(field, e.target.scrollTop)}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          >
            {/* Facet values */}
          </div>
        </>
      )}
    </div>
  );
}
```

### Alternative: useSingleFacetState

For managing a single facet's UI state:

```typescript
import { useSingleFacetState } from 'typesense-react';

function FacetComponent({ field }) {
  const {
    searchQuery,
    isExpanded,
    scrollTop,
    setSearch,
    toggleExpansion,
    setScroll,
    reset
  } = useSingleFacetState(field);

  // Use the state and actions directly
}
```

---

## useAccumulatedFacets

Hook for accessing facet values with accumulation support. Merges current search results with accumulated values to provide stable facet options.

### Usage

```typescript
import { useAccumulatedFacets } from 'typesense-react';

const accumulatedFacets = useAccumulatedFacets();
```

### Return Value

```typescript
interface UseAccumulatedFacetsReturn {
  getMergedFacetValues: (fieldName: string, activeValues?: string[]) => FacetValue[];
  mergedFacetResults: MergedFacetResult[];
  clearAccumulatedFacets: (field?: string) => void;
  setAccumulateFacets: (enabled: boolean) => void;
  setMoveSelectedToTop: (enabled: boolean) => void;
  setReorderByCount: (enabled: boolean) => void;
  setUseNumericRanges: (enabled: boolean) => void;
  setFacetOptionLimit: (limit: number) => void;
  setHideZeroCountsForSingleSelect: (hide: boolean) => void;
  setAllowNumericRangeForSingleSelect: (allow: boolean) => void;
  isAccumulatingFacets: boolean;
  isMoveSelectedToTop: boolean;
  isReorderByCount: boolean;
  isUseNumericRanges: boolean;
  facetOptionLimit: number;
  hideZeroCountsForSingleSelect: boolean;
  allowNumericRangeForSingleSelect: boolean;
  accumulatedFacetValues: AccumulatedFacetState;
}
```

### Example

```typescript
function AccumulatedFacetComponent({ field, activeValues }) {
  const accumulatedFacets = useAccumulatedFacets();
  
  // Enable accumulation
  useEffect(() => {
    accumulatedFacets.setAccumulateFacets(true);
    accumulatedFacets.setMoveSelectedToTop(true);
    accumulatedFacets.setReorderByCount(true);
  }, []);

  const facetValues = accumulatedFacets.getMergedFacetValues(field, activeValues);

  return (
    <div>
      <h3>{field} (Accumulated)</h3>
      {facetValues.map(({ value, count }) => (
        <label key={value}>
          <input
            type="checkbox"
            checked={activeValues.includes(value)}
            onChange={() => toggleValue(value)}
          />
          {value} ({count})
        </label>
      ))}
      
      <button onClick={() => accumulatedFacets.clearAccumulatedFacets(field)}>
        Clear Accumulated
      </button>
    </div>
  );
}
```

---

## useAdditionalFilters

Hook for managing additional filters in a more convenient way. Provides an abstraction over the raw filter string manipulation.

### Usage

```typescript
import { useAdditionalFilters } from 'typesense-react';

const additionalFilters = useAdditionalFilters();
```

### Return Value: `UseAdditionalFiltersReturn`

```typescript
interface UseAdditionalFiltersReturn {
  filters: Map<string, string>;
  filterString: string;
  setFilter: (field: string, filter: string) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  hasFilter: (field: string) => boolean;
  getFilter: (field: string) => string | null;
  setFilterString: (filters: string) => void;
  mergeFilters: (newFilters: string) => void;
  validateFilter: (filterString: string) => { isValid: boolean; error?: string };
}
```

### Example

```typescript
function AdditionalFiltersComponent() {
  const additionalFilters = useAdditionalFilters();

  // Add filters
  const addStockFilter = () => {
    additionalFilters.setFilter('in_stock', 'true');
  };

  const addPriceFilter = () => {
    additionalFilters.setFilter('price', '[10..100]');
  };

  const addComplexFilter = () => {
    additionalFilters.setFilter('status', '=[`active`, `featured`]');
  };

  // Merge multiple filters
  const applyPreset = () => {
    additionalFilters.mergeFilters('featured:true && discount:>0');
  };

  return (
    <div>
      <h3>Additional Filters</h3>
      <p>Current: {additionalFilters.filterString}</p>
      
      <button onClick={addStockFilter}>
        Add Stock Filter {additionalFilters.hasFilter('in_stock') && '✓'}
      </button>
      
      <button onClick={addPriceFilter}>
        Add Price Filter
      </button>
      
      <button onClick={addComplexFilter}>
        Add Complex Filter
      </button>
      
      <button onClick={applyPreset}>
        Apply Preset
      </button>
      
      <button onClick={() => additionalFilters.clearFilters()}>
        Clear All
      </button>

      <div>
        <h4>Active Filters:</h4>
        {Array.from(additionalFilters.filters.entries()).map(([field, filter]) => (
          <div key={field}>
            {field}: {filter}
            <button onClick={() => additionalFilters.removeFilter(field)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Alternative: useAdditionalFiltersWithInitial

For initializing with default filters:

```typescript
const additionalFilters = useAdditionalFiltersWithInitial('featured:true && in_stock:true');
```

---

## useDateFilter

Hook for managing date filters specifically. Provides convenient methods for date range filtering.

### Usage

```typescript
import { useDateFilter } from 'typesense-react';

const dateFilter = useDateFilter();
```

### Return Value: `UseDateFilterReturn`

```typescript
interface UseDateFilterReturn {
  setDateRange: (field: string, start: Date, end: Date) => void;
  setLastNDays: (field: string, days: number) => void;
  setLastNMonths: (field: string, months: number) => void;
  setCurrentMonth: (field: string) => void;
  setCurrentYear: (field: string) => void;
  setMonth: (field: string, year: number, month: number) => void;
  setAfterDate: (field: string, date: Date) => void;
  setBeforeDate: (field: string, date: Date) => void;
  applyPreset: (field: string, preset: DateRangePreset) => void;
  clearDateFilter: (field: string) => void;
  getDateRange: (field: string) => { start: Date; end: Date } | null;
  hasDateFilter: (field: string) => boolean;
}
```

### Date Range Presets

Available presets: `'today'`, `'yesterday'`, `'thisWeek'`, `'lastWeek'`, `'thisMonth'`, `'lastMonth'`, `'thisYear'`, `'lastYear'`, `'last7Days'`, `'last30Days'`, `'last90Days'`, `'last365Days'`

### Example

```typescript
function DateFilterComponent() {
  const dateFilter = useDateFilter();

  return (
    <div>
      <h3>Date Filters</h3>
      
      {/* Preset buttons */}
      <button onClick={() => dateFilter.applyPreset('created_at', 'last7Days')}>
        Last 7 Days
      </button>
      
      <button onClick={() => dateFilter.applyPreset('created_at', 'thisMonth')}>
        This Month
      </button>
      
      <button onClick={() => dateFilter.setCurrentYear('created_at')}>
        This Year
      </button>

      {/* Custom date range */}
      <input
        type="date"
        onChange={(e) => {
          const date = new Date(e.target.value);
          dateFilter.setAfterDate('created_at', date);
        }}
      />

      {/* Show current range */}
      {dateFilter.hasDateFilter('created_at') && (
        <div>
          Current range: {JSON.stringify(dateFilter.getDateRange('created_at'))}
          <button onClick={() => dateFilter.clearDateFilter('created_at')}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
```

### Alternative: useDateFieldFilter

For managing a specific date field:

```typescript
const createdAtFilter = useDateFieldFilter('created_at');

// All methods are bound to the field
createdAtFilter.setLastNDays(30);
createdAtFilter.applyPreset('thisMonth');
createdAtFilter.clear();
```

---

## useFacetMode

Hook for managing facet display modes and settings.

### Usage

```typescript
import { useFacetMode } from 'typesense-react';

const facetMode = useFacetMode();
```

### Return Value

```typescript
interface UseFacetModeReturn {
  facetMode: 'disjunctive' | 'conjunctive';
  setFacetMode: (mode: 'disjunctive' | 'conjunctive') => void;
  toggleFacetMode: () => void;
  isDisjunctive: boolean;
  isConjunctive: boolean;
}
```

### Example

```typescript
function FacetModeToggle() {
  const { facetMode, toggleFacetMode, isDisjunctive } = useFacetMode();

  return (
    <div>
      <button onClick={toggleFacetMode}>
        Mode: {facetMode} {isDisjunctive ? '(OR)' : '(AND)'}
      </button>
    </div>
  );
}
```

---

## useNumericFacetRange

Hook for managing numeric facet ranges with bounds tracking.

### Usage

```typescript
import { useNumericFacetRange } from 'typesense-react';

const numericRange = useNumericFacetRange(field);
```

### Parameters

#### field: `string`

The numeric field name.

### Return Value

```typescript
interface UseNumericFacetRangeReturn {
  min: number | undefined;
  max: number | undefined;
  bounds: { min: number; max: number } | undefined;
  setRange: (min?: number, max?: number) => void;
  clearRange: () => void;
  hasRange: boolean;
}
```

### Example

```typescript
function PriceRangeFilter() {
  const priceRange = useNumericFacetRange('price');

  if (!priceRange.bounds) return null;

  return (
    <div>
      <h4>Price Range</h4>
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
      <p>
        ${priceRange.min || priceRange.bounds.min} - ${priceRange.max || priceRange.bounds.max}
      </p>
      {priceRange.hasRange && (
        <button onClick={() => priceRange.clearRange()}>Clear</button>
      )}
    </div>
  );
}
```

---

## Common Patterns

### Combining Multiple Hooks

```typescript
function AdvancedSearchComponent() {
  const search = useSearch({ debounceMs: 300 });
  const facets = useAdvancedFacets();
  const schema = useSchemaDiscovery();
  const accumulatedFacets = useAccumulatedFacets();
  const dateFilter = useDateFilter();

  // Use schema to auto-configure facets
  useEffect(() => {
    if (schema.facetConfigs) {
      // Configure facets based on schema
    }
  }, [schema.facetConfigs]);

  // Enable facet accumulation for better UX
  useEffect(() => {
    accumulatedFacets.setAccumulateFacets(true);
    accumulatedFacets.setMoveSelectedToTop(true);
  }, []);

  // ... rest of component
}
```

### Custom Hook Composition

```typescript
function useProductSearch() {
  const search = useSearch({ queryBy: 'name,description,category' });
  const facets = useAdvancedFacets();
  const dateFilter = useDateFilter();

  // Add product-specific methods
  const setInStockOnly = useCallback((inStock: boolean) => {
    if (inStock) {
      search.actions.setAdditionalFilters('in_stock:true');
    } else {
      search.actions.setAdditionalFilters('');
    }
  }, [search.actions]);

  const setPriceRange = useCallback((min: number, max: number) => {
    facets.actions.setNumericFilter('price', min, max);
  }, [facets.actions]);

  const setDateAdded = useCallback((preset: DateRangePreset) => {
    dateFilter.applyPreset('date_added', preset);
  }, [dateFilter]);

  return {
    ...search,
    facets,
    setInStockOnly,
    setPriceRange,
    setDateAdded,
  };
}
```

---

## Type Definitions

### Core Types

```typescript
// Search state interface
interface SearchState {
  query: string;
  page: number;
  perPage: number;
  sortBy: string;
  multiSortBy: Array<{ field: string; order: 'asc' | 'desc' }>;
  results: SearchResponse | null;
  loading: boolean;
  error: Error | null;
  searchPerformed: boolean;
  facets: FacetConfig[];
  disjunctiveFacets: DisjunctiveFacetState;
  numericFilters: NumericFilterState;
  dateFilters: DateFilterState;
  selectiveFilters: SelectiveFilterState;
  customFilters: CustomFilterState;
  additionalFilters: string;
  schema: CollectionSchema | null;
  accumulateFacets: boolean;
  accumulatedFacetValues: AccumulatedFacetState;
  useNumericRanges: boolean;
  numericFacetRanges: NumericFacetRangeState;
  numericFacetBounds: NumericFacetBoundsState;
}

// Facet configuration
interface FacetConfig {
  field: string;
  label?: string;
  type?: 'checkbox' | 'select' | 'range' | 'date';
  disjunctive?: boolean;
  expanded?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  rangeMin?: number;
  rangeMax?: number;
  rangeStep?: number;
}

// Collection schema
interface CollectionSchema {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    facet?: boolean;
    index?: boolean;
    optional?: boolean;
  }>;
  default_sorting_field?: string;
}

// Search request
interface SearchRequest {
  q: string;
  query_by: string;
  filter_by?: string;
  facet_by?: string;
  sort_by?: string;
  page?: number;
  per_page?: number;
  max_facet_values?: number;
}

// Multi-collection search
interface CollectionSearchConfig {
  name: string;
  query_by: string;
  weight?: number;
  filter_by?: string;
  facet_by?: string;
  sort_by?: string;
}
```

### Filter State Types

```typescript
// Disjunctive facets (OR logic)
type DisjunctiveFacetState = Record<string, string[]>;

// Numeric filters
type NumericFilterState = Record<string, { min?: number; max?: number }>;

// Date filters
type DateFilterState = Record<string, { start?: string; end?: string }>;

// Selective filters (single value)
type SelectiveFilterState = Record<string, string>;

// Custom filters (advanced)
type CustomFilterState = Record<string, string[]>;

// Accumulated facet values
interface AccumulatedFacetState {
  [field: string]: {
    values: Set<string>;
    counts: Map<string, number>;
    numericBounds?: { min: number; max: number };
  };
}

// Numeric facet ranges
type NumericFacetRangeState = Record<string, { min?: number; max?: number }>;

// Numeric facet bounds
type NumericFacetBoundsState = Record<string, { min: number; max: number }>;
```

### Error Handling

All hooks handle errors gracefully and expose them through the returned state. Common error scenarios:

1. **Network Errors**: Connection failures, timeouts
2. **Authentication Errors**: Invalid API key, unauthorized access
3. **Validation Errors**: Invalid search parameters, malformed filters
4. **Server Errors**: Typesense server issues, collection not found

Example error handling:

```typescript
function SearchWithErrorHandling() {
  const { state, actions, error } = useSearch({
    onSearchError: (error) => {
      // Log to error tracking service
      console.error('Search failed:', error);
      
      // Show user-friendly message
      if (error.message.includes('Network')) {
        showToast('Connection error. Please check your internet.');
      } else if (error.message.includes('401')) {
        showToast('Authentication failed. Please login again.');
      } else {
        showToast('Search failed. Please try again.');
      }
    }
  });

  if (error) {
    return <ErrorBoundary error={error} retry={actions.search} />;
  }

  // ... rest of component
}
```

---

## Performance Considerations

1. **Debouncing**: All search hooks include configurable debouncing to prevent excessive API calls
2. **Memoization**: Hook returns are memoized to prevent unnecessary re-renders
3. **Parallel Queries**: Disjunctive faceting uses parallel queries for better performance
4. **Facet Accumulation**: Reduces flickering and improves UX for faceted search
5. **Schema Caching**: Schema discovery results are cached to avoid repeated API calls

### Best Practices

1. Use appropriate debounce values (300-500ms for search, 0 for filters)
2. Enable facet accumulation for better UX
3. Use schema discovery for automatic configuration
4. Implement proper error boundaries
5. Optimize facet counts with `maxFacetValues`
6. Use multi-collection search sparingly (performance impact)

---

## Migration Guide

### From v1.x to v2.x

The v2 release includes several breaking changes:

1. **Hook API Changes**:
   ```typescript
   // v1.x
   const { search, results, loading } = useTypesenseSearch();
   
   // v2.x
   const { state, actions, loading, error } = useSearch();
   const { results } = state;
   const { search } = actions;
   ```

2. **Provider Changes**:
   ```typescript
   // v1.x
   <TypesenseProvider client={client}>
   
   // v2.x
   <SearchProvider 
     client={client}
     collection="products"
     config={{ enableDisjunctiveFacetQueries: true }}
   >
   ```

3. **Facet Management**:
   ```typescript
   // v1.x - Manual facet management
   const [facets, setFacets] = useState({});
   
   // v2.x - Built-in facet hooks
   const facets = useAdvancedFacets();
   ```

4. **Multi-Collection Search**:
   ```typescript
   // v1.x - Not supported
   
   // v2.x - Native support
   const multiSearch = useMultiCollectionSearch(client);
   ```

See the [migration guide](../migration-guide.md) for complete details.