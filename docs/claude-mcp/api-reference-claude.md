# typesense-react API Reference for Claude

This comprehensive API reference is designed to help Claude understand and assist developers using the @jungle-commerce/typesense-react library. All code examples include proper TypeScript types and error handling.

## Table of Contents

1. [Core Hooks](#core-hooks)
2. [Advanced Hooks](#advanced-hooks)
3. [Utility Functions](#utility-functions)
4. [Providers](#providers)
5. [Types and Interfaces](#types-and-interfaces)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting Guide](#troubleshooting-guide)

## Core Hooks

### useSearch()

The primary hook for search operations. Provides search state and actions.

```tsx
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

**Example Usage:**

```tsx
function SearchComponent() {
  const { state, actions, loading, error } = useSearch();

  // Handle search with debouncing (automatic)
  const handleSearch = (query: string) => {
    actions.setQuery(query); // Triggers search automatically
  };

  // Manual search trigger
  const handleManualSearch = async () => {
    await actions.search(state.query);
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    actions.setPage(newPage);
  };

  // Sorting
  const handleSort = (field: string) => {
    actions.setSortBy(`${field}:desc`);
  };

  // Multi-field sorting
  const handleMultiSort = () => {
    actions.setMultiSortBy([
      { field: 'price', order: 'asc' },
      { field: 'rating', order: 'desc' },
      { field: 'name', order: 'asc' }
    ]);
  };

  // Error handling
  if (error) {
    return <div>Search error: {error.message}</div>;
  }

  return (
    <div>
      <input value={state.query} onChange={(e) => handleSearch(e.target.value)} />
      {loading && <div>Searching...</div>}
      {state.results?.hits.map(hit => (
        <div key={hit.document.id}>{hit.document.name}</div>
      ))}
    </div>
  );
}
```

### useAdvancedFacets()

Manages all faceting and filtering operations with support for multiple filter types.

```tsx
interface UseAdvancedFacetsReturn {
  disjunctiveFacets: DisjunctiveFacetState;
  numericFilters: NumericFilterState;
  dateFilters: DateFilterState;
  selectiveFilters: SelectiveFilterState;
  customFilters: CustomFilterState;
  activeFilterCount: number;
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

**Example Usage:**

```tsx
function AdvancedFilters() {
  const facets = useAdvancedFacets();
  const { state } = useSearch();

  // Checkbox filter (disjunctive/OR logic)
  const handleCategoryToggle = (category: string) => {
    facets.actions.toggleFacetValue('category', category);
  };

  // Numeric range filter
  const handlePriceRange = (min: number, max: number) => {
    facets.actions.setNumericFilter('price', min, max);
  };

  // Date range filter
  const handleDateRange = (start: Date, end: Date) => {
    facets.actions.setDateFilter('created_at', start, end);
  };

  // Single select filter
  const handleStatusSelect = (status: string) => {
    facets.actions.setSelectiveFilter('status', status);
  };

  // Custom multi-value filter
  const handleTagsFilter = (tags: string[]) => {
    facets.actions.setCustomFilter('tags', tags);
  };

  // Clear specific filter
  const clearPriceFilter = () => {
    facets.actions.clearFilter('price', 'numeric');
  };

  return (
    <div>
      <p>Active filters: {facets.activeFilterCount}</p>
      
      {/* Render category checkboxes */}
      {state.results?.facet_counts?.find(f => f.field_name === 'category')?.counts.map(item => (
        <label key={item.value}>
          <input
            type="checkbox"
            checked={facets.disjunctiveFacets.category?.includes(item.value)}
            onChange={() => handleCategoryToggle(item.value)}
          />
          {item.value} ({item.count})
        </label>
      ))}
      
      <button onClick={facets.actions.clearAllFilters}>Clear All</button>
    </div>
  );
}
```

### useSchemaDiscovery()

Automatically discovers collection schema and generates optimal configuration.

```tsx
interface UseSchemaDiscoveryOptions {
  collection: string;
  enabled?: boolean;
  includePatterns?: FieldPattern[];
  excludePatterns?: FieldPattern[];
  facetConfig?: {
    autoDetectDisjunctive?: boolean;
    autoDetectNumeric?: boolean;
    autoDetectDate?: boolean;
    autoDetectSelect?: boolean;
    customTypeDetection?: {
      checkbox?: (field: CollectionField) => boolean;
      numeric?: (field: CollectionField) => boolean;
      date?: (field: CollectionField) => boolean;
      select?: (field: CollectionField) => boolean;
    };
  };
}

interface UseSchemaDiscoveryReturn {
  schema: CollectionSchema | null;
  loading: boolean;
  error: Error | null;
  facets: FacetConfig[];
  searchableFields: string[];
  sortableFields: string[];
  defaultSortField: string | null;
}
```

**Example Usage:**

```tsx
function AutoConfiguredSearch() {
  const discovery = useSchemaDiscovery({
    collection: 'products',
    enabled: true,
    includePatterns: [
      { pattern: 'name', matchType: 'contains' },
      { pattern: '_at$', matchType: 'regex' }
    ],
    excludePatterns: [
      { pattern: '_internal', matchType: 'contains' }
    ],
    facetConfig: {
      autoDetectDisjunctive: true,
      autoDetectNumeric: true,
      customTypeDetection: {
        select: (field) => field.name === 'status' || field.name === 'condition',
        date: (field) => field.name.endsWith('_date') || field.name.endsWith('_at')
      }
    }
  });

  if (discovery.loading) return <div>Discovering schema...</div>;
  if (discovery.error) return <div>Error: {discovery.error.message}</div>;
  if (!discovery.schema) return <div>No schema found</div>;

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={discovery.facets}
      initialSearchParams={{
        query_by: discovery.searchableFields.join(','),
        sort_by: discovery.defaultSortField || undefined
      }}
    >
      <YourSearchUI />
    </SearchProvider>
  );
}
```

## Advanced Hooks

### useFacetState()

Manages UI state for individual facets with search and expansion.

```tsx
interface UseFacetStateOptions {
  searchable?: boolean;
  expandedByDefault?: boolean;
  onSearchChange?: (search: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

interface UseFacetStateReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  filteredValues: FacetValue[];
  hasActiveFilters: boolean;
  reset: () => void;
}
```

**Example Usage:**

```tsx
function FacetComponent({ config, values }: { config: FacetConfig; values: FacetValue[] }) {
  const facetState = useFacetState({
    searchable: config.searchable,
    expandedByDefault: config.expanded ?? true
  });

  return (
    <div className="facet">
      <h4 onClick={facetState.toggleExpanded}>
        {config.label} {facetState.hasActiveFilters && '•'}
      </h4>
      
      {facetState.isExpanded && (
        <>
          {config.searchable && (
            <input
              value={facetState.searchQuery}
              onChange={(e) => facetState.setSearchQuery(e.target.value)}
              placeholder={`Search ${config.label}...`}
            />
          )}
          
          {facetState.filteredValues.map(value => (
            <FacetValue key={value.value} value={value} />
          ))}
        </>
      )}
    </div>
  );
}
```

### useNumericFacetRange()

Manages numeric facets with range slider support.

```tsx
interface UseNumericFacetRangeReturn {
  mode: 'individual' | 'range';
  bounds: { min: number; max: number };
  currentRange: { min: number; max: number };
  individualValues: Set<string>;
  actions: {
    setMode: (mode: 'individual' | 'range') => void;
    setRange: (min: number, max: number) => void;
    toggleValue: (value: string) => void;
    clearRange: () => void;
    clearValues: () => void;
    reset: () => void;
  };
  hasActiveFilter: boolean;
}
```

**Example Usage:**

```tsx
function PriceRangeFilter({ facetValues }: { facetValues: FacetValue[] }) {
  const rangeFilter = useNumericFacetRange('price', facetValues);
  const facets = useAdvancedFacets();

  const handleRangeChange = (min: number, max: number) => {
    rangeFilter.actions.setRange(min, max);
    facets.actions.setNumericFilter('price', min, max);
  };

  return (
    <div className="price-filter">
      <div className="mode-toggle">
        <button 
          className={rangeFilter.mode === 'range' ? 'active' : ''}
          onClick={() => rangeFilter.actions.setMode('range')}
        >
          Range
        </button>
        <button 
          className={rangeFilter.mode === 'individual' ? 'active' : ''}
          onClick={() => rangeFilter.actions.setMode('individual')}
        >
          Individual
        </button>
      </div>

      {rangeFilter.mode === 'range' ? (
        <div className="range-slider">
          <input
            type="range"
            min={rangeFilter.bounds.min}
            max={rangeFilter.bounds.max}
            value={rangeFilter.currentRange.min}
            onChange={(e) => handleRangeChange(Number(e.target.value), rangeFilter.currentRange.max)}
          />
          <span>${rangeFilter.currentRange.min} - ${rangeFilter.currentRange.max}</span>
        </div>
      ) : (
        <div className="individual-values">
          {facetValues.map(value => (
            <label key={value.value}>
              <input
                type="checkbox"
                checked={rangeFilter.individualValues.has(value.value)}
                onChange={() => rangeFilter.actions.toggleValue(value.value)}
              />
              ${value.value} ({value.count})
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
```

### useDateFilter()

Specialized hook for date filtering with presets.

```tsx
interface UseDateFilterReturn {
  field: string;
  startDate: string | null;
  endDate: string | null;
  hasFilter: boolean;
  setDateRange: (start: string | Date | null, end: string | Date | null) => void;
  setToday: () => void;
  setYesterday: () => void;
  setThisWeek: () => void;
  setLastWeek: () => void;
  setThisMonth: () => void;
  setLastMonth: () => void;
  setThisYear: () => void;
  setLastNDays: (days: number) => void;
  setNextNDays: (days: number) => void;
  clear: () => void;
}
```

**Example Usage:**

```tsx
function DateFilterComponent() {
  const dateFilter = useDateFilter('event_date');

  return (
    <div className="date-filter">
      <h4>Event Date</h4>
      
      {/* Preset buttons */}
      <div className="presets">
        <button onClick={dateFilter.setToday}>Today</button>
        <button onClick={dateFilter.setThisWeek}>This Week</button>
        <button onClick={dateFilter.setThisMonth}>This Month</button>
        <button onClick={() => dateFilter.setLastNDays(30)}>Last 30 Days</button>
        <button onClick={() => dateFilter.setNextNDays(30)}>Next 30 Days</button>
      </div>
      
      {/* Custom date range */}
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
        <button onClick={dateFilter.clear}>Clear Date Filter</button>
      )}
    </div>
  );
}
```

### useAccumulatedFacets()

Maintains facet values across searches for better UX.

```tsx
interface MergedFacetResult {
  field_name: string;
  counts: Array<{
    value: string;
    count: number;
    highlighted?: string;
    isAccumulated?: boolean;
  }>;
  stats?: {
    avg?: number;
    max?: number;
    min?: number;
    sum?: number;
  };
}

interface UseAccumulatedFacetsReturn {
  mergedFacets: MergedFacetResult[];
  accumulatedValues: AccumulatedFacetValues;
  clearAccumulated: (field?: string) => void;
}
```

**Example Usage:**

```tsx
function AccumulatedFacetSearch() {
  const { state } = useSearch();
  const { mergedFacets } = useAccumulatedFacets();

  return (
    <div>
      {mergedFacets.map(facet => (
        <div key={facet.field_name}>
          <h4>{facet.field_name}</h4>
          {facet.counts.map(value => (
            <label 
              key={value.value}
              className={value.isAccumulated ? 'accumulated' : ''}
            >
              <input type="checkbox" />
              {value.value} ({value.count || 0})
              {value.isAccumulated && ' (from previous search)'}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### useMultiCollectionSearch()

Search across multiple collections simultaneously.

```tsx
interface UseMultiCollectionSearchOptions {
  collections: CollectionSearchConfig[];
  searchOptions?: {
    debounceMs?: number;
    minQueryLength?: number;
    onSearchStart?: () => void;
    onSearchComplete?: (results: MultiCollectionSearchResponse) => void;
    onError?: (error: Error) => void;
  };
}

interface UseMultiCollectionSearchReturn {
  state: MultiCollectionSearchState;
  search: (query: string, options?: MultiCollectionSearchRequest) => Promise<void>;
  setQuery: (query: string) => void;
  clearResults: () => void;
  loading: boolean;
  error: Error | null;
}
```

**Example Usage:**

```tsx
function GlobalSearch() {
  const multiSearch = useMultiCollectionSearch({
    collections: [
      {
        collection: 'products',
        queryBy: 'name,description',
        weight: 2.0,
        maxResults: 10
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
    ],
    searchOptions: {
      debounceMs: 200,
      minQueryLength: 2
    }
  });

  return (
    <div>
      <input
        value={multiSearch.state.query}
        onChange={(e) => multiSearch.setQuery(e.target.value)}
        placeholder="Search everything..."
      />
      
      {multiSearch.loading && <div>Searching...</div>}
      
      {multiSearch.state.results && (
        <div>
          {Object.entries(multiSearch.state.results.hitsByCollection).map(([collection, hits]) => (
            <div key={collection}>
              <h3>{collection}</h3>
              {hits.map(hit => (
                <div key={hit.document.id}>
                  {hit.document.name}
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

## Utility Functions

### Filter Builders

Build Typesense filter strings programmatically.

```tsx
// Escape special characters in filter values
escapeFilterValue(value: string): string

// Build disjunctive (OR) filter for multiple values
buildDisjunctiveFilter(field: string, values: string[]): string
// Example: buildDisjunctiveFilter('category', ['Electronics', 'Books']) 
// Returns: 'category:=[Electronics,Books]'

// Build numeric range filter
buildNumericFilter(field: string, min?: number, max?: number): string
// Example: buildNumericFilter('price', 10, 100)
// Returns: 'price:[10..100]'

// Build date range filter
buildDateFilter(field: string, start?: Date | string, end?: Date | string): string
// Example: buildDateFilter('created_at', '2024-01-01', '2024-12-31')
// Returns: 'created_at:[2024-01-01..2024-12-31]'

// Build single value filter
buildSelectiveFilter(field: string, value: string): string
// Example: buildSelectiveFilter('status', 'active')
// Returns: 'status:=active'

// Combine multiple filters with AND/OR logic
combineFilters(filters: string[], operator: 'AND' | 'OR' = 'AND'): string
// Example: combineFilters(['category:=Electronics', 'price:<100'], 'AND')
// Returns: 'category:=Electronics && price:<100'
```

**Example Usage:**

```tsx
function buildComplexFilter() {
  const filters = [
    buildDisjunctiveFilter('category', ['Electronics', 'Computers']),
    buildNumericFilter('price', 100, 500),
    buildDateFilter('created_at', '2024-01-01', '2024-12-31'),
    'in_stock:true'  // Raw filter string
  ];
  
  const combinedFilter = combineFilters(filters, 'AND');
  // Result: 'category:=[Electronics,Computers] && price:[100..500] && created_at:[2024-01-01..2024-12-31] && in_stock:true'
  
  actions.setAdditionalFilters(combinedFilter);
}
```

### Sort Builders

Build sort strings for single and multi-field sorting.

```tsx
// Build single field sort
buildSingleSortString(field: string, order: 'asc' | 'desc' = 'desc'): string
// Example: buildSingleSortString('price', 'asc')
// Returns: 'price:asc'

// Build multi-field sort
buildMultiSortString(sorts: Array<{ field: string; order: 'asc' | 'desc' }>): string
// Example: buildMultiSortString([
//   { field: 'price', order: 'asc' },
//   { field: 'rating', order: 'desc' }
// ])
// Returns: 'price:asc,rating:desc'

// Parse sort string back to structured format
parseSortString(sortString: string): Array<{ field: string; order: 'asc' | 'desc' }>
// Example: parseSortString('price:asc,rating:desc')
// Returns: [{ field: 'price', order: 'asc' }, { field: 'rating', order: 'desc' }]
```

### Schema Utilities

Pattern matching and validation for schema fields.

```tsx
// Match field against pattern
matchesPattern(fieldName: string, pattern: FieldPattern): boolean

// Check if field matches any pattern in array
matchesAnyPattern(fieldName: string, patterns: FieldPattern[]): boolean

// Get the first matching pattern
getMatchingPattern(fieldName: string, patterns: FieldPattern[]): FieldPattern | null

// Validate field capabilities
validateFieldCapabilities(field: CollectionField): FieldCapabilities

// Find fields with specific capabilities
findFieldsWithCapabilities(
  schema: CollectionSchema,
  capabilities: Partial<FieldCapabilities>
): ValidatedField[]
```

**Example Usage:**

```tsx
// Define patterns for field detection
const datePatterns: FieldPattern[] = [
  { pattern: '_at$', matchType: 'regex' },
  { pattern: '_date', matchType: 'contains' },
  { pattern: 'date', matchType: 'exact' }
];

// Check if field is a date field
const isDateField = (fieldName: string) => 
  matchesAnyPattern(fieldName, datePatterns);

// Find all sortable fields in schema
const sortableFields = findFieldsWithCapabilities(schema, {
  sort: true,
  index: true
});
```

### Date Filter Helpers

Pre-built date range filters.

```tsx
// Get filter for last N days
getLastNDaysFilter(field: string, days: number): string

// Get filter for date range
getDateRangeFilter(field: string, start: Date | string, end: Date | string): string

// Get current month filter
getCurrentMonthFilter(field: string): string

// Get current year filter
getCurrentYearFilter(field: string): string

// Parse date range from filter string
parseDateRangeFromFilter(filterString: string, field: string): {
  start: string | null;
  end: string | null;
} | null

// Date range preset functions
DateRangePresets.today(field: string): string
DateRangePresets.yesterday(field: string): string
DateRangePresets.thisWeek(field: string): string
DateRangePresets.lastWeek(field: string): string
DateRangePresets.thisMonth(field: string): string
DateRangePresets.lastMonth(field: string): string
DateRangePresets.thisYear(field: string): string
```

## Providers

### SearchProvider

The main provider that wraps your search interface.

```tsx
interface SearchProviderProps {
  config: TypesenseConfig;
  collection: string;
  initialSearchParams?: Partial<SearchRequest>;
  initialState?: Partial<SearchState>;
  facets?: FacetConfig[];
  searchOnMount?: boolean;
  onStateChange?: (state: SearchState) => void;
  children: React.ReactNode;
  performanceMode?: boolean;
  enableDisjunctiveFacetQueries?: boolean;
  accumulateFacets?: boolean;
}
```

**Example Usage:**

```tsx
function App() {
  const handleStateChange = (state: SearchState) => {
    console.log('Search state changed:', state);
    // Sync with external state management, analytics, etc.
  };

  return (
    <SearchProvider
      config={{
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'xyz',
        cacheSearchResultsForSeconds: 60
      }}
      collection="products"
      facets={[
        { field: 'category', label: 'Category', type: 'checkbox', disjunctive: true },
        { field: 'brand', label: 'Brand', type: 'checkbox', disjunctive: true },
        { field: 'price', label: 'Price', type: 'numeric', numericDisplay: 'range' },
        { field: 'rating', label: 'Rating', type: 'numeric', numericDisplay: 'checkbox' },
        { field: 'status', label: 'Status', type: 'select' },
        { field: 'created_at', label: 'Date Added', type: 'date' }
      ]}
      initialSearchParams={{
        query_by: 'name,description,tags',
        sort_by: 'popularity:desc',
        per_page: 24
      }}
      initialState={{
        additionalFilters: 'in_stock:true'
      }}
      searchOnMount={true}
      accumulateFacets={true}
      performanceMode={false}
      enableDisjunctiveFacetQueries={true}
      onStateChange={handleStateChange}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### MultiCollectionProvider

Provider for searching across multiple collections.

```tsx
interface MultiCollectionProviderProps {
  config: TypesenseConfig;
  defaultCollections: CollectionSearchConfig[];
  children: React.ReactNode;
  searchOptions?: {
    debounceMs?: number;
    minQueryLength?: number;
  };
}
```

**Example Usage:**

```tsx
function MultiCollectionApp() {
  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={[
        {
          collection: 'products',
          queryBy: 'name,description,brand',
          weight: 2.0,
          maxResults: 10,
          namespace: 'product',
          includeFields: 'id,name,price,image_url'
        },
        {
          collection: 'categories',
          queryBy: 'name,description',
          weight: 1.0,
          maxResults: 5,
          namespace: 'category'
        }
      ]}
      searchOptions={{
        debounceMs: 200,
        minQueryLength: 2
      }}
    >
      <GlobalSearchInterface />
    </MultiCollectionProvider>
  );
}
```

## Types and Interfaces

### Core Types

```tsx
// Typesense configuration
interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number;
    protocol: string;
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  cacheSearchResultsForSeconds?: number;
}

// Search state
interface SearchState {
  query: string;
  results: TypesenseSearchResponse | null;
  loading: boolean;
  error: Error | null;
  facets: FacetConfig[];
  disjunctiveFacets: DisjunctiveFacetState;
  numericFilters: NumericFilterState;
  dateFilters: DateFilterState;
  selectiveFilters: SelectiveFilterState;
  page: number;
  perPage: number;
  sortBy: string;
  additionalFilters?: string;
  // ... more fields
}

// Facet configuration
interface FacetConfig {
  field: string;
  label: string;
  type: 'checkbox' | 'select' | 'numeric' | 'date' | 'custom';
  disjunctive?: boolean;
  maxValues?: number;
  searchable?: boolean;
  expanded?: boolean;
  sortBy?: 'count' | 'value' | 'alpha';
  numericDisplay?: 'checkbox' | 'range' | 'both';
}
```

## Common Patterns

### Pattern 1: Search with URL Persistence

```tsx
function URLPersistedSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, actions } = useSearch();

  // Initialize from URL
  useEffect(() => {
    const query = searchParams.get('q');
    const page = searchParams.get('page');
    const sort = searchParams.get('sort');
    
    if (query) actions.setQuery(query);
    if (page) actions.setPage(parseInt(page));
    if (sort) actions.setSortBy(sort);
  }, []);

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.page > 1) params.set('page', state.page.toString());
    if (state.sortBy) params.set('sort', state.sortBy);
    
    setSearchParams(params);
  }, [state.query, state.page, state.sortBy]);

  return <SearchInterface />;
}
```

### Pattern 2: Infinite Scroll

```tsx
function InfiniteScrollSearch() {
  const { state, actions } = useSearch();
  const [allResults, setAllResults] = useState<SearchHit[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Accumulate results
  useEffect(() => {
    if (state.results?.hits) {
      if (state.page === 1) {
        setAllResults(state.results.hits);
      } else {
        setAllResults(prev => [...prev, ...state.results.hits]);
      }
    }
  }, [state.results, state.page]);

  // Intersection observer for auto-load
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !state.loading) {
          const hasMore = allResults.length < (state.results?.found || 0);
          if (hasMore) {
            actions.setPage(state.page + 1);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [state.page, state.loading, allResults.length]);

  return (
    <div>
      {allResults.map((hit, index) => (
        <ResultCard key={`${hit.document.id}-${index}`} hit={hit} />
      ))}
      <div ref={loadMoreRef} />
    </div>
  );
}
```

### Pattern 3: Advanced Filter UI

```tsx
function AdvancedFilterUI() {
  const { state } = useSearch();
  const facets = useAdvancedFacets();
  const [filterMode, setFilterMode] = useState<'basic' | 'advanced'>('basic');

  const renderFacet = (config: FacetConfig) => {
    switch (config.type) {
      case 'checkbox':
        return <CheckboxFacet config={config} />;
      case 'numeric':
        return config.numericDisplay === 'range' 
          ? <RangeFacet config={config} />
          : <NumericCheckboxFacet config={config} />;
      case 'date':
        return <DateFacet config={config} />;
      case 'select':
        return <SelectFacet config={config} />;
      default:
        return null;
    }
  };

  return (
    <div className="filters">
      <div className="filter-header">
        <h3>Filters ({facets.activeFilterCount})</h3>
        <button onClick={() => setFilterMode(filterMode === 'basic' ? 'advanced' : 'basic')}>
          {filterMode === 'basic' ? 'Advanced' : 'Basic'} Mode
        </button>
      </div>

      {filterMode === 'basic' ? (
        <div className="basic-filters">
          {state.facets.filter(f => f.type !== 'custom').map(facet => (
            <div key={facet.field} className="facet-wrapper">
              {renderFacet(facet)}
            </div>
          ))}
        </div>
      ) : (
        <div className="advanced-filters">
          <textarea
            value={state.additionalFilters || ''}
            onChange={(e) => actions.setAdditionalFilters(e.target.value)}
            placeholder="Enter Typesense filter expression..."
            rows={4}
          />
          <p className="help-text">
            Example: category:=Electronics && price:[100..500] && in_stock:true
          </p>
        </div>
      )}

      <button onClick={facets.actions.clearAllFilters}>
        Clear All Filters
      </button>
    </div>
  );
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Search not triggering automatically

**Issue:** Setting query doesn't trigger search
**Solution:** Ensure SearchProvider doesn't have `performanceMode={true}` which disables auto-search

```tsx
// ❌ Wrong
<SearchProvider performanceMode={true}>

// ✅ Correct
<SearchProvider performanceMode={false}>
```

#### 2. Facet values disappearing

**Issue:** Facet values disappear when no results match
**Solution:** Enable facet accumulation

```tsx
<SearchProvider accumulateFacets={true}>
```

#### 3. Numeric filters not working

**Issue:** Numeric filters return no results
**Solution:** Ensure the field is indexed and facetable in Typesense schema

```tsx
// Check field capabilities
const capabilities = validateFieldCapabilities(field);
if (!capabilities.facet || !capabilities.filter) {
  console.error('Field not facetable/filterable');
}
```

#### 4. Date filters format issues

**Issue:** Date filters not applying correctly
**Solution:** Use ISO format (YYYY-MM-DD) for date strings

```tsx
// ❌ Wrong
facets.actions.setDateFilter('created_at', '01/15/2024', '12/31/2024');

// ✅ Correct
facets.actions.setDateFilter('created_at', '2024-01-15', '2024-12-31');
```

#### 5. Multi-collection search performance

**Issue:** Slow multi-collection searches
**Solution:** Limit collections and use weights appropriately

```tsx
const collections = [
  { collection: 'primary', weight: 2.0, maxResults: 10 },
  { collection: 'secondary', weight: 1.0, maxResults: 5 }
];
```

#### 6. Memory leaks with accumulatedFacets

**Issue:** Memory usage grows over time
**Solution:** Clear accumulated facets periodically

```tsx
const { clearAccumulated } = useAccumulatedFacets();

// Clear after certain conditions
useEffect(() => {
  if (someCondition) {
    clearAccumulated();
  }
}, [someCondition]);
```

### Performance Optimization Tips

1. **Use performance mode for large datasets**
   ```tsx
   <SearchProvider performanceMode={true}>
   ```

2. **Disable disjunctive facet queries if not needed**
   ```tsx
   <SearchProvider enableDisjunctiveFacetQueries={false}>
   ```

3. **Limit facet values**
   ```tsx
   const facetConfig = {
     field: 'tags',
     maxValues: 50,
     type: 'checkbox'
   };
   ```

4. **Use field includes/excludes**
   ```tsx
   initialSearchParams={{
     include_fields: 'id,name,price,image_url',
     exclude_fields: 'description,long_content'
   }}
   ```

5. **Enable search result caching**
   ```tsx
   config={{
     cacheSearchResultsForSeconds: 300 // 5 minutes
   }}
   ```

### Error Handling Best Practices

```tsx
function RobustSearch() {
  const { state, actions } = useSearch();
  const [retryCount, setRetryCount] = useState(0);

  // Handle errors with retry logic
  useEffect(() => {
    if (state.error && retryCount < 3) {
      const timer = setTimeout(() => {
        actions.search(state.query);
        setRetryCount(prev => prev + 1);
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [state.error, retryCount]);

  // Custom error display
  if (state.error) {
    return (
      <ErrorBoundary
        error={state.error}
        retry={() => {
          setRetryCount(0);
          actions.search(state.query);
        }}
      />
    );
  }

  return <SearchInterface />;
}
```

## Tips for Claude

When helping developers with typesense-react:

1. **Always suggest TypeScript** - The library has excellent type definitions
2. **Check for schema issues first** - Many problems stem from schema misconfigurations
3. **Recommend schema discovery** for new implementations
4. **Emphasize the headless nature** - No UI components are provided
5. **Suggest appropriate filter types** based on the data:
   - Categories/Tags → checkbox with disjunctive
   - Status/State → select (single value)
   - Price/Quantity → numeric with range
   - Dates → date with presets
6. **Point out performance implications** of different configurations
7. **Recommend error boundaries** for production use
8. **Suggest using accumulateFacets** for better UX
9. **Mention caching options** for frequently searched data
10. **Highlight the importance of proper indexing** in Typesense

Remember: This is a **headless** library - developers bring their own UI components!