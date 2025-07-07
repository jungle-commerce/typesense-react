# Adding Filters

Filters help users narrow down search results. Let's add faceted filtering to our search interface.

## What We'll Build

- Category filters (checkboxes)
- Price range filter (slider)
- Brand filter (dropdown)
- Stock availability toggle
- Clear all filters

## Complete Filtering Example

```tsx
import React from 'react';
import { 
  SearchProvider, 
  useSearch, 
  useFacets,
  useNumericFacetRange 
} from '@jungle-commerce/typesense-react';
import type { FacetConfig } from '@jungle-commerce/typesense-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  in_stock: boolean;
}

// Facet configuration
const facetConfigs: FacetConfig[] = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,  // Allow multiple selections (OR logic)
    expanded: true
  },
  {
    field: 'brand',
    label: 'Brand',
    type: 'select',
    searchable: true,   // Add search box for brands
    sortBy: 'alpha'     // Sort alphabetically
  },
  {
    field: 'price',
    label: 'Price Range',
    type: 'numeric',
    numericDisplay: 'range'
  },
  {
    field: 'in_stock',
    label: 'Availability',
    type: 'checkbox',
    renderLabel: (value) => value === 'true' ? 'In Stock' : 'Out of Stock'
  }
];

// Filter sidebar component
function FilterSidebar() {
  const { state, actions } = useSearch<Product>();
  const { facetResults, loading: facetsLoading } = useFacets();
  
  // Price range hook
  const priceRange = useNumericFacetRange('price');

  // Get active filter count
  const activeFilterCount = Object.keys(state.disjunctiveFacets).reduce(
    (count, field) => count + state.disjunctiveFacets[field].length, 
    0
  );

  return (
    <aside className="filter-sidebar">
      <div className="filter-header">
        <h3>Filters</h3>
        {activeFilterCount > 0 && (
          <button 
            onClick={() => actions.clearAllFilters()}
            className="clear-filters-btn"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {facetsLoading && <div className="loading">Loading filters...</div>}

      {/* Category Filter */}
      <div className="filter-section">
        <h4>Category</h4>
        {facetResults.category?.counts.map(facet => (
          <label key={facet.value} className="filter-option">
            <input
              type="checkbox"
              checked={state.disjunctiveFacets.category?.includes(facet.value) || false}
              onChange={(e) => {
                if (e.target.checked) {
                  actions.addDisjunctiveFacet('category', facet.value);
                } else {
                  actions.removeDisjunctiveFacet('category', facet.value);
                }
              }}
            />
            <span className="filter-label">{facet.value}</span>
            <span className="filter-count">({facet.count})</span>
          </label>
        ))}
      </div>

      {/* Price Range Filter */}
      <div className="filter-section">
        <h4>Price Range</h4>
        {priceRange.min !== undefined && priceRange.max !== undefined && (
          <div className="price-range-filter">
            <div className="price-inputs">
              <input
                type="number"
                value={priceRange.currentMin}
                onChange={(e) => priceRange.setMin(Number(e.target.value))}
                onBlur={() => priceRange.applyRange()}
                placeholder="Min"
                className="price-input"
              />
              <span>-</span>
              <input
                type="number"
                value={priceRange.currentMax}
                onChange={(e) => priceRange.setMax(Number(e.target.value))}
                onBlur={() => priceRange.applyRange()}
                placeholder="Max"
                className="price-input"
              />
            </div>
            
            <input
              type="range"
              min={priceRange.min}
              max={priceRange.max}
              value={priceRange.currentMax}
              onChange={(e) => {
                priceRange.setMax(Number(e.target.value));
                priceRange.applyRange();
              }}
              className="price-slider"
            />
            
            <div className="price-range-display">
              ${priceRange.currentMin} - ${priceRange.currentMax}
            </div>
          </div>
        )}
      </div>

      {/* Brand Filter (Dropdown) */}
      <div className="filter-section">
        <h4>Brand</h4>
        <select 
          value={state.disjunctiveFacets.brand?.[0] || ''}
          onChange={(e) => {
            actions.clearFacet('brand');
            if (e.target.value) {
              actions.addDisjunctiveFacet('brand', e.target.value);
            }
          }}
          className="brand-select"
        >
          <option value="">All Brands</option>
          {facetResults.brand?.counts.map(facet => (
            <option key={facet.value} value={facet.value}>
              {facet.value} ({facet.count})
            </option>
          ))}
        </select>
      </div>

      {/* Stock Filter */}
      <div className="filter-section">
        <h4>Availability</h4>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={state.disjunctiveFacets.in_stock?.includes('true') || false}
            onChange={(e) => {
              if (e.target.checked) {
                actions.addDisjunctiveFacet('in_stock', 'true');
              } else {
                actions.removeDisjunctiveFacet('in_stock', 'true');
              }
            }}
          />
          <span className="filter-label">In Stock Only</span>
        </label>
      </div>
    </aside>
  );
}

// Main search component with filters
function SearchWithFilters() {
  const { state, actions } = useSearch<Product>();

  return (
    <div className="search-layout">
      <FilterSidebar />
      
      <main className="search-main">
        <div className="search-header">
          <input
            type="text"
            value={state.query}
            onChange={(e) => actions.setQuery(e.target.value)}
            placeholder="Search products..."
            className="search-input"
          />
          
          {/* Active filters display */}
          {Object.entries(state.disjunctiveFacets).map(([field, values]) => 
            values.map(value => (
              <span key={`${field}-${value}`} className="active-filter">
                {field}: {value}
                <button 
                  onClick={() => actions.removeDisjunctiveFacet(field, value)}
                  className="remove-filter"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {/* Results */}
        {state.loading && <div>Loading...</div>}
        
        {state.results && (
          <>
            <div className="results-header">
              <span>{state.results.found} results</span>
              
              {/* Sort dropdown */}
              <select 
                value={state.sortBy || ''}
                onChange={(e) => actions.setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="">Relevance</option>
                <option value="price:asc">Price: Low to High</option>
                <option value="price:desc">Price: High to Low</option>
                <option value="name:asc">Name: A to Z</option>
              </select>
            </div>
            
            <div className="results-grid">
              {state.results.hits.map(hit => (
                <div key={hit.document.id} className="product-card">
                  <h3>{hit.document.name}</h3>
                  <p>{hit.document.description}</p>
                  <div className="product-meta">
                    <span className="price">${hit.document.price}</span>
                    <span className="brand">{hit.document.brand}</span>
                    <span className={`stock ${hit.document.in_stock ? 'in' : 'out'}`}>
                      {hit.document.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// App with facet configuration
function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
      initialSearchParams={{
        query_by: 'name,description',
        facet_by: 'category,brand,price,in_stock',
        max_facet_values: 100
      }}
    >
      <SearchWithFilters />
    </SearchProvider>
  );
}

export default App;
```

## Filter Types Explained

### 1. Checkbox Filters (Disjunctive)

For multiple selections with OR logic:

```tsx
const categoryConfig: FacetConfig = {
  field: 'category',
  label: 'Category',
  type: 'checkbox',
  disjunctive: true  // Allows: Electronics OR Accessories
};

// Usage
actions.addDisjunctiveFacet('category', 'Electronics');
actions.addDisjunctiveFacet('category', 'Accessories');
```

### 2. Single Select Filters

For exclusive selections:

```tsx
// Clear previous selection before adding new one
actions.clearFacet('brand');
actions.addDisjunctiveFacet('brand', 'Apple');
```

### 3. Numeric Range Filters

For price ranges or numeric values:

```tsx
// Using the numeric range hook
const priceRange = useNumericFacetRange('price');

// Set range programmatically
priceRange.setRange(0, 1000);
priceRange.applyRange();

// Or use numeric filters directly
actions.setNumericFilter('price', 100, 500);
```

### 4. Boolean Filters

For true/false values:

```tsx
// Check if in stock
actions.addDisjunctiveFacet('in_stock', 'true');
```

## Advanced Filtering

### 1. Custom Filter Logic

Combine multiple filter conditions:

```tsx
// Custom filter for "Premium" products
const setPremiumFilter = () => {
  actions.setCustomFilter('premium', 'price:>500 && brand:=[Apple,Samsung]');
};
```

### 2. Date Filters

Filter by date ranges:

```tsx
import { useDateFilter } from '@jungle-commerce/typesense-react';

function DateRangeFilter() {
  const dateFilter = useDateFilter('created_at');
  
  return (
    <div>
      <input
        type="date"
        value={dateFilter.startDate}
        onChange={(e) => dateFilter.setStartDate(e.target.value)}
      />
      <input
        type="date"
        value={dateFilter.endDate}
        onChange={(e) => dateFilter.setEndDate(e.target.value)}
      />
      <button onClick={() => dateFilter.applyDateRange()}>
        Apply Date Range
      </button>
    </div>
  );
}
```

### 3. Hierarchical Filters

For nested categories:

```tsx
// Category > Subcategory structure
const hierarchicalFilter = (category: string, subcategory?: string) => {
  if (subcategory) {
    actions.setCustomFilter('hierarchy', 
      `category:=${category} && subcategory:=${subcategory}`
    );
  } else {
    actions.addDisjunctiveFacet('category', category);
  }
};
```

## Filter UI Patterns

### 1. Collapsible Sections

```tsx
function CollapsibleFilter({ title, children }: Props) {
  const [isOpen, setIsOpen] = React.useState(true);
  
  return (
    <div className="filter-section">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="filter-toggle"
      >
        {title} {isOpen ? '−' : '+'}
      </button>
      {isOpen && <div className="filter-content">{children}</div>}
    </div>
  );
}
```

### 2. Search Within Facets

For long lists of options:

```tsx
function SearchableFacet({ field, facets }: Props) {
  const [search, setSearch] = React.useState('');
  const { actions } = useSearch();
  
  const filteredFacets = facets.filter(f => 
    f.value.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="facet-search"
      />
      {filteredFacets.map(facet => (
        <label key={facet.value}>
          <input
            type="checkbox"
            onChange={(e) => {
              if (e.target.checked) {
                actions.addDisjunctiveFacet(field, facet.value);
              } else {
                actions.removeDisjunctiveFacet(field, facet.value);
              }
            }}
          />
          {facet.value} ({facet.count})
        </label>
      ))}
    </div>
  );
}
```

### 3. Filter Pills

Show active filters as removable pills:

```tsx
function ActiveFilters() {
  const { state, actions } = useSearch();
  
  const allFilters = [
    ...Object.entries(state.disjunctiveFacets).flatMap(([field, values]) =>
      values.map(value => ({ field, value, type: 'facet' }))
    ),
    ...Object.entries(state.numericFilters).map(([field, range]) => ({
      field,
      value: `${range.min} - ${range.max}`,
      type: 'numeric'
    }))
  ];
  
  return (
    <div className="active-filters">
      {allFilters.map(filter => (
        <span key={`${filter.field}-${filter.value}`} className="filter-pill">
          {filter.field}: {filter.value}
          <button
            onClick={() => {
              if (filter.type === 'facet') {
                actions.removeDisjunctiveFacet(filter.field, filter.value);
              } else {
                actions.clearNumericFilter(filter.field);
              }
            }}
          >
            ×
          </button>
        </span>
      ))}
      {allFilters.length > 0 && (
        <button onClick={() => actions.clearAllFilters()}>
          Clear all
        </button>
      )}
    </div>
  );
}
```

## CSS for Filters

```css
/* Filter layout */
.search-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Filter sidebar */
.filter-sidebar {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  height: fit-content;
  position: sticky;
  top: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.clear-filters-btn {
  font-size: 14px;
  color: #007bff;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

/* Filter sections */
.filter-section {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.filter-section:last-child {
  border-bottom: none;
}

.filter-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

/* Filter options */
.filter-option {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  cursor: pointer;
}

.filter-option input[type="checkbox"] {
  margin-right: 8px;
}

.filter-label {
  flex: 1;
  font-size: 14px;
}

.filter-count {
  color: #666;
  font-size: 12px;
}

/* Price range */
.price-range-filter {
  margin-top: 10px;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.price-input {
  width: 80px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.price-slider {
  width: 100%;
  margin: 10px 0;
}

.price-range-display {
  text-align: center;
  font-size: 14px;
  color: #666;
}

/* Brand select */
.brand-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* Active filters */
.active-filter {
  display: inline-flex;
  align-items: center;
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 14px;
  margin: 0 5px 5px 0;
}

.remove-filter {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 18px;
  margin-left: 5px;
  cursor: pointer;
  line-height: 1;
}

/* Results header */
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.sort-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .search-layout {
    grid-template-columns: 1fr;
  }
  
  .filter-sidebar {
    position: static;
    margin-bottom: 20px;
  }
}
```

## Performance Optimization

### 1. Debounce Filter Changes

Prevent too many searches:

```tsx
const debouncedApplyFilters = React.useMemo(
  () => debounce(() => {
    actions.search();
  }, 300),
  [actions]
);
```

### 2. Lazy Load Facets

Load facets only when needed:

```tsx
const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
  new Set(['category']) // Only category expanded by default
);

// Load facets when section expands
const handleExpand = (field: string) => {
  if (!expandedSections.has(field)) {
    actions.loadFacetsForField(field);
  }
  setExpandedSections(prev => new Set([...prev, field]));
};
```

### 3. Cache Filter State

Remember user's filter preferences:

```tsx
// Save to localStorage
React.useEffect(() => {
  const filters = {
    disjunctive: state.disjunctiveFacets,
    numeric: state.numericFilters
  };
  localStorage.setItem('searchFilters', JSON.stringify(filters));
}, [state.disjunctiveFacets, state.numericFilters]);

// Restore on mount
React.useEffect(() => {
  const saved = localStorage.getItem('searchFilters');
  if (saved) {
    const filters = JSON.parse(saved);
    actions.restoreFilters(filters);
  }
}, []);
```

## Next Steps

Great! You now have a full-featured filtering system. In the next guide, we'll add pagination to handle large result sets.

### Key Takeaways

1. Configure facets with `FacetConfig` array
2. Use `disjunctive` for OR logic (multiple selections)
3. Different UI patterns for different filter types
4. Show active filters and provide clear options
5. Consider performance with debouncing and lazy loading

---

[← Basic Search](./03-basic-search.md) | [Next: Pagination →](./05-pagination.md)