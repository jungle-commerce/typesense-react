# Faceted Search Tutorial

Build a powerful e-commerce search with filters, sorting, and advanced faceting. This tutorial extends the basic search with production-ready filtering capabilities.

## What We're Building

An advanced product search with:
- Multiple filter types (checkboxes, ranges, toggles)
- Disjunctive (OR) and conjunctive (AND) filtering
- Dynamic facet loading
- Price range slider
- Multi-level sorting
- Filter state management
- URL synchronization
- Mobile-responsive filters

## Prerequisites

- Completed the Basic Search Tutorial
- Understanding of React hooks
- Typesense collection with facetable fields

## Step 1: Prepare Your Schema

Ensure your Typesense collection has facetable fields:

```typescript
// Schema for products collection
const productSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'price', type: 'float', facet: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'subcategory', type: 'string', facet: true },
    { name: 'brand', type: 'string', facet: true },
    { name: 'color', type: 'string[]', facet: true },
    { name: 'size', type: 'string[]', facet: true },
    { name: 'rating', type: 'float', facet: true },
    { name: 'inStock', type: 'bool', facet: true },
    { name: 'freeShipping', type: 'bool', facet: true },
    { name: 'isNew', type: 'bool', facet: true },
    { name: 'onSale', type: 'bool', facet: true },
    { name: 'material', type: 'string[]', facet: true },
    { name: 'tags', type: 'string[]', facet: true }
  ],
  default_sorting_field: 'rating'
};
```

## Step 2: Configure Facets

Set up your facet configurations:

```tsx
// src/config/facets.ts
import type { FacetConfig } from '@jungle-commerce/typesense-react';

export const facetConfigs: FacetConfig[] = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,
    expanded: true,
    sortBy: 'count',
    renderLabel: (value) => {
      // Capitalize category names
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
  },
  {
    field: 'brand',
    label: 'Brand',
    type: 'checkbox',
    disjunctive: true,
    searchable: true,
    maxValues: 10,
    sortBy: 'alpha'
  },
  {
    field: 'price',
    label: 'Price Range',
    type: 'numeric',
    numericDisplay: 'range',
    rangeStep: 10
  },
  {
    field: 'rating',
    label: 'Customer Rating',
    type: 'custom',
    renderLabel: (value) => `${value}+ stars`
  },
  {
    field: 'color',
    label: 'Color',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 20,
    renderLabel: (value) => {
      const colorEmojis: Record<string, string> = {
        red: '🔴',
        blue: '🔵',
        green: '🟢',
        yellow: '🟡',
        black: '⚫',
        white: '⚪',
        purple: '🟣',
        orange: '🟠'
      };
      return `${colorEmojis[value.toLowerCase()] || ''} ${value}`;
    }
  },
  {
    field: 'size',
    label: 'Size',
    type: 'checkbox',
    disjunctive: true,
    sortBy: 'value',
    renderLabel: (value) => value.toUpperCase()
  },
  {
    field: 'inStock',
    label: 'Availability',
    type: 'checkbox',
    renderLabel: (value) => value === 'true' ? 'In Stock' : 'Out of Stock'
  },
  {
    field: 'freeShipping',
    label: 'Free Shipping',
    type: 'checkbox',
    renderLabel: (value) => value === 'true' ? 'Free Shipping' : ''
  }
];
```

## Step 3: Create the Main Component

Build the search layout with filters:

```tsx
// src/components/FacetedSearch.tsx
import React from 'react';
import { SearchProvider } from '@jungle-commerce/typesense-react';
import { typesenseConfig } from '../config/typesense';
import { facetConfigs } from '../config/facets';
import SearchHeader from './SearchHeader';
import FilterSidebar from './FilterSidebar';
import SearchResults from './SearchResults';
import MobileFilterButton from './MobileFilterButton';
import './FacetedSearch.css';

function FacetedSearch() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      facets={facetConfigs}
      searchOnMount={true}
      debounceMs={300}
      initialSearchParams={{
        query_by: 'name,description,brand,category',
        facet_by: facetConfigs.map(f => f.field).join(','),
        max_facet_values: 100,
        per_page: 24
      }}
    >
      <div className="faceted-search">
        <SearchHeader />
        
        <div className="search-body">
          <FilterSidebar 
            isOpen={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
          />
          
          <main className="search-results-container">
            <SearchResults />
          </main>
        </div>
        
        <MobileFilterButton 
          onClick={() => setMobileFiltersOpen(true)}
        />
      </div>
    </SearchProvider>
  );
}

export default FacetedSearch;
```

## Step 4: Build the Filter Sidebar

Create a comprehensive filter component:

```tsx
// src/components/FilterSidebar.tsx
import React from 'react';
import { useSearch, useFacets } from '@jungle-commerce/typesense-react';
import CategoryFilter from './filters/CategoryFilter';
import PriceRangeFilter from './filters/PriceRangeFilter';
import RatingFilter from './filters/RatingFilter';
import CheckboxFilter from './filters/CheckboxFilter';
import ActiveFilters from './ActiveFilters';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function FilterSidebar({ isOpen, onClose }: FilterSidebarProps) {
  const { state, actions } = useSearch();
  const { facetResults, loading } = useFacets();

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    
    // Count disjunctive facets
    Object.values(state.disjunctiveFacets).forEach(values => {
      count += values.length;
    });
    
    // Count numeric filters
    count += Object.keys(state.numericFilters).length;
    
    // Count other filter types
    count += Object.keys(state.customFilters).length;
    
    return count;
  }, [state.disjunctiveFacets, state.numericFilters, state.customFilters]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="filter-overlay"
          onClick={onClose}
        />
      )}
      
      <aside className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="filter-header">
          <h2>Filters</h2>
          {activeFilterCount > 0 && (
            <button
              onClick={() => actions.clearAllFilters()}
              className="clear-all-btn"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
          <button
            onClick={onClose}
            className="close-filters-btn mobile-only"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        {/* Active filters pills */}
        <ActiveFilters />

        {/* Category hierarchy filter */}
        <CategoryFilter 
          categories={facetResults.category}
          subcategories={facetResults.subcategory}
        />

        {/* Price range filter */}
        <PriceRangeFilter />

        {/* Rating filter */}
        <RatingFilter ratings={facetResults.rating} />

        {/* Brand filter with search */}
        <CheckboxFilter
          title="Brand"
          field="brand"
          facets={facetResults.brand}
          searchable={true}
          disjunctive={true}
        />

        {/* Color filter */}
        <CheckboxFilter
          title="Color"
          field="color"
          facets={facetResults.color}
          disjunctive={true}
        />

        {/* Size filter */}
        <CheckboxFilter
          title="Size"
          field="size"
          facets={facetResults.size}
          disjunctive={true}
        />

        {/* Boolean filters */}
        <div className="filter-section">
          <h3>Shipping & Availability</h3>
          <CheckboxFilter
            field="inStock"
            facets={facetResults.inStock}
            hideCount={true}
          />
          <CheckboxFilter
            field="freeShipping"
            facets={facetResults.freeShipping}
            hideCount={true}
          />
        </div>

        {/* Apply filters button (mobile) */}
        <div className="filter-actions mobile-only">
          <button
            onClick={onClose}
            className="apply-filters-btn"
          >
            Show {state.results?.found || 0} Results
          </button>
        </div>
      </aside>
    </>
  );
}

export default FilterSidebar;
```

## Step 5: Create Individual Filter Components

### Category Filter with Hierarchy

```tsx
// src/components/filters/CategoryFilter.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';
import type { FacetResult } from '@jungle-commerce/typesense-react';

interface CategoryFilterProps {
  categories?: FacetResult;
  subcategories?: FacetResult;
}

function CategoryFilter({ categories, subcategories }: CategoryFilterProps) {
  const { state, actions } = useSearch();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Get subcategories for a category
  const getSubcategoriesForCategory = (category: string) => {
    // In real app, you'd filter based on parent-child relationship
    return subcategories?.counts || [];
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpanded(newExpanded);
  };

  if (!categories?.counts.length) return null;

  return (
    <div className="filter-section">
      <h3>Category</h3>
      <div className="category-tree">
        {categories.counts.map(category => {
          const isSelected = state.disjunctiveFacets.category?.includes(category.value);
          const isExpanded = expanded.has(category.value);
          const subcats = getSubcategoriesForCategory(category.value);

          return (
            <div key={category.value} className="category-item">
              <div className="category-main">
                <label className="filter-option">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        actions.addDisjunctiveFacet('category', category.value);
                      } else {
                        actions.removeDisjunctiveFacet('category', category.value);
                      }
                    }}
                  />
                  <span className="filter-label">
                    {category.value}
                  </span>
                  <span className="filter-count">
                    ({category.count})
                  </span>
                </label>
                
                {subcats.length > 0 && (
                  <button
                    onClick={() => toggleCategory(category.value)}
                    className="expand-btn"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.value}`}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                )}
              </div>

              {isExpanded && subcats.length > 0 && (
                <div className="subcategory-list">
                  {subcats.map(subcat => (
                    <label key={subcat.value} className="filter-option subcategory">
                      <input
                        type="checkbox"
                        checked={state.disjunctiveFacets.subcategory?.includes(subcat.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            actions.addDisjunctiveFacet('subcategory', subcat.value);
                          } else {
                            actions.removeDisjunctiveFacet('subcategory', subcat.value);
                          }
                        }}
                      />
                      <span className="filter-label">{subcat.value}</span>
                      <span className="filter-count">({subcat.count})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryFilter;
```

### Price Range Filter

```tsx
// src/components/filters/PriceRangeFilter.tsx
import React from 'react';
import { useSearch, useNumericFacetRange } from '@jungle-commerce/typesense-react';

function PriceRangeFilter() {
  const { state } = useSearch();
  const priceRange = useNumericFacetRange('price');
  const [localMin, setLocalMin] = React.useState(priceRange.currentMin);
  const [localMax, setLocalMax] = React.useState(priceRange.currentMax);

  React.useEffect(() => {
    setLocalMin(priceRange.currentMin);
    setLocalMax(priceRange.currentMax);
  }, [priceRange.currentMin, priceRange.currentMax]);

  if (priceRange.min === undefined || priceRange.max === undefined) {
    return null;
  }

  const handleSliderChange = (values: number[]) => {
    setLocalMin(values[0]);
    setLocalMax(values[1]);
  };

  const handleSliderComplete = () => {
    priceRange.setRange(localMin, localMax);
    priceRange.applyRange();
  };

  const handleInputChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (type === 'min') {
      setLocalMin(Math.max(priceRange.min, Math.min(numValue, localMax)));
    } else {
      setLocalMax(Math.min(priceRange.max, Math.max(numValue, localMin)));
    }
  };

  const handleInputBlur = () => {
    priceRange.setRange(localMin, localMax);
    priceRange.applyRange();
  };

  return (
    <div className="filter-section">
      <h3>Price Range</h3>
      
      <div className="price-inputs">
        <div className="price-input-group">
          <span className="currency">$</span>
          <input
            type="number"
            value={localMin}
            onChange={(e) => handleInputChange('min', e.target.value)}
            onBlur={handleInputBlur}
            min={priceRange.min}
            max={localMax}
            className="price-input"
          />
        </div>
        
        <span className="price-separator">to</span>
        
        <div className="price-input-group">
          <span className="currency">$</span>
          <input
            type="number"
            value={localMax}
            onChange={(e) => handleInputChange('max', e.target.value)}
            onBlur={handleInputBlur}
            min={localMin}
            max={priceRange.max}
            className="price-input"
          />
        </div>
      </div>

      <div className="price-slider">
        <input
          type="range"
          min={priceRange.min}
          max={priceRange.max}
          value={localMin}
          onChange={(e) => handleSliderChange([parseFloat(e.target.value), localMax])}
          onMouseUp={handleSliderComplete}
          onTouchEnd={handleSliderComplete}
          className="slider slider-min"
        />
        <input
          type="range"
          min={priceRange.min}
          max={priceRange.max}
          value={localMax}
          onChange={(e) => handleSliderChange([localMin, parseFloat(e.target.value)])}
          onMouseUp={handleSliderComplete}
          onTouchEnd={handleSliderComplete}
          className="slider slider-max"
        />
        
        <div className="slider-track">
          <div 
            className="slider-range"
            style={{
              left: `${((localMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
              right: `${((priceRange.max - localMax) / (priceRange.max - priceRange.min)) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="price-range-labels">
        <span>${priceRange.min}</span>
        <span>${priceRange.max}</span>
      </div>
    </div>
  );
}

export default PriceRangeFilter;
```

### Rating Filter

```tsx
// src/components/filters/RatingFilter.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';
import type { FacetResult } from '@jungle-commerce/typesense-react';

interface RatingFilterProps {
  ratings?: FacetResult;
}

function RatingFilter({ ratings }: RatingFilterProps) {
  const { state, actions } = useSearch();

  if (!ratings?.counts.length) return null;

  // Sort ratings in descending order
  const sortedRatings = [...ratings.counts].sort((a, b) => 
    parseFloat(b.value) - parseFloat(a.value)
  );

  const handleRatingClick = (rating: string) => {
    // Clear existing rating filter
    actions.clearNumericFilter('rating');
    
    // Set minimum rating filter
    const minRating = parseFloat(rating);
    actions.setNumericFilter('rating', minRating, 5);
  };

  const currentMinRating = state.numericFilters.rating?.min;

  return (
    <div className="filter-section">
      <h3>Customer Rating</h3>
      <div className="rating-filters">
        {sortedRatings.map(rating => {
          const ratingValue = parseFloat(rating.value);
          const isSelected = currentMinRating === ratingValue;

          return (
            <button
              key={rating.value}
              onClick={() => handleRatingClick(rating.value)}
              className={`rating-filter ${isSelected ? 'selected' : ''}`}
            >
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <span 
                    key={i}
                    className={`star ${i < Math.floor(ratingValue) ? 'filled' : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="rating-text">& up</span>
              <span className="rating-count">({rating.count})</span>
            </button>
          );
        })}
        
        {currentMinRating && (
          <button
            onClick={() => actions.clearNumericFilter('rating')}
            className="clear-rating"
          >
            Clear rating filter
          </button>
        )}
      </div>
    </div>
  );
}

export default RatingFilter;
```

### Generic Checkbox Filter

```tsx
// src/components/filters/CheckboxFilter.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';
import type { FacetResult } from '@jungle-commerce/typesense-react';

interface CheckboxFilterProps {
  title?: string;
  field: string;
  facets?: FacetResult;
  searchable?: boolean;
  disjunctive?: boolean;
  hideCount?: boolean;
  maxVisible?: number;
}

function CheckboxFilter({
  title,
  field,
  facets,
  searchable = false,
  disjunctive = false,
  hideCount = false,
  maxVisible = 10
}: CheckboxFilterProps) {
  const { state, actions } = useSearch();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);

  if (!facets?.counts.length) return null;

  // Filter facets based on search
  const filteredFacets = searchTerm
    ? facets.counts.filter(f => 
        f.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : facets.counts;

  // Limit visible facets
  const visibleFacets = showAll 
    ? filteredFacets 
    : filteredFacets.slice(0, maxVisible);

  const handleChange = (value: string, checked: boolean) => {
    if (disjunctive) {
      if (checked) {
        actions.addDisjunctiveFacet(field, value);
      } else {
        actions.removeDisjunctiveFacet(field, value);
      }
    } else {
      // For conjunctive filters
      if (checked) {
        actions.addSelectiveFacet(field, value);
      } else {
        actions.removeSelectiveFacet(field, value);
      }
    }
  };

  const isChecked = (value: string) => {
    if (disjunctive) {
      return state.disjunctiveFacets[field]?.includes(value) || false;
    }
    return state.selectiveFilters[field]?.includes(value) || false;
  };

  return (
    <div className="filter-section">
      {title && <h3>{title}</h3>}
      
      {searchable && filteredFacets.length > 5 && (
        <div className="filter-search">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${title?.toLowerCase() || field}...`}
            className="filter-search-input"
          />
        </div>
      )}

      <div className="filter-options">
        {visibleFacets.map(facet => (
          <label key={facet.value} className="filter-option">
            <input
              type="checkbox"
              checked={isChecked(facet.value)}
              onChange={(e) => handleChange(facet.value, e.target.checked)}
            />
            <span className="filter-label">
              {facet.highlighted || facet.value}
            </span>
            {!hideCount && (
              <span className="filter-count">
                ({facet.count})
              </span>
            )}
          </label>
        ))}
      </div>

      {filteredFacets.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="show-more-btn"
        >
          {showAll ? 'Show less' : `Show all (${filteredFacets.length})`}
        </button>
      )}

      {searchTerm && filteredFacets.length === 0 && (
        <p className="no-filter-results">
          No options match "{searchTerm}"
        </p>
      )}
    </div>
  );
}

export default CheckboxFilter;
```

## Step 6: Display Active Filters

Show users their selected filters:

```tsx
// src/components/ActiveFilters.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

function ActiveFilters() {
  const { state, actions } = useSearch();

  const filters = React.useMemo(() => {
    const allFilters: Array<{
      type: string;
      field: string;
      value: string;
      label: string;
    }> = [];

    // Disjunctive facets
    Object.entries(state.disjunctiveFacets).forEach(([field, values]) => {
      values.forEach(value => {
        allFilters.push({
          type: 'disjunctive',
          field,
          value,
          label: `${field}: ${value}`
        });
      });
    });

    // Numeric filters
    Object.entries(state.numericFilters).forEach(([field, range]) => {
      if (field === 'price') {
        allFilters.push({
          type: 'numeric',
          field,
          value: `${range.min}-${range.max}`,
          label: `$${range.min} - $${range.max}`
        });
      } else if (field === 'rating') {
        allFilters.push({
          type: 'numeric',
          field,
          value: range.min.toString(),
          label: `${range.min}+ stars`
        });
      }
    });

    return allFilters;
  }, [state.disjunctiveFacets, state.numericFilters]);

  if (filters.length === 0) return null;

  const removeFilter = (filter: typeof filters[0]) => {
    switch (filter.type) {
      case 'disjunctive':
        actions.removeDisjunctiveFacet(filter.field, filter.value);
        break;
      case 'numeric':
        actions.clearNumericFilter(filter.field);
        break;
    }
  };

  return (
    <div className="active-filters">
      <div className="active-filter-pills">
        {filters.map((filter, index) => (
          <span key={`${filter.field}-${filter.value}-${index}`} className="filter-pill">
            {filter.label}
            <button
              onClick={() => removeFilter(filter)}
              className="remove-pill"
              aria-label={`Remove ${filter.label} filter`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default ActiveFilters;
```

## Step 7: Add Sorting Controls

Let users sort results:

```tsx
// src/components/SortingControls.tsx
import React from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

function SortingControls() {
  const { state, actions } = useSearch();

  const sortOptions = [
    { value: '', label: 'Relevance' },
    { value: 'price:asc', label: 'Price: Low to High' },
    { value: 'price:desc', label: 'Price: High to Low' },
    { value: 'rating:desc', label: 'Highest Rated' },
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'name:asc', label: 'Name: A to Z' },
    { value: 'name:desc', label: 'Name: Z to A' }
  ];

  // Multi-level sorting
  const handleSortChange = (value: string) => {
    if (value.includes(',')) {
      // Multi-sort
      const sorts = value.split(',').map(s => {
        const [field, order] = s.split(':');
        return { field, order: order as 'asc' | 'desc' };
      });
      actions.setMultiSortBy(sorts);
    } else {
      // Single sort
      actions.setSortBy(value);
    }
  };

  return (
    <div className="sorting-controls">
      <label htmlFor="sort-select" className="sort-label">
        Sort by:
      </label>
      <select
        id="sort-select"
        value={state.sortBy || ''}
        onChange={(e) => handleSortChange(e.target.value)}
        className="sort-select"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Advanced sorting for power users */}
      <details className="advanced-sort">
        <summary>Advanced Sorting</summary>
        <div className="multi-sort">
          <p>Sort by multiple fields:</p>
          <select
            onChange={(e) => handleSortChange(e.target.value)}
            className="multi-sort-select"
          >
            <option value="">Choose preset...</option>
            <option value="category:asc,price:asc">
              Category then Price
            </option>
            <option value="brand:asc,rating:desc">
              Brand then Rating
            </option>
            <option value="inStock:desc,price:asc">
              In Stock first, then Price
            </option>
          </select>
        </div>
      </details>
    </div>
  );
}

export default SortingControls;
```

## Step 8: Style Everything

Create comprehensive styles:

```css
/* src/components/FacetedSearch.css */

/* Layout */
.faceted-search {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Filter Sidebar */
.filter-sidebar {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.filter-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.clear-all-btn {
  font-size: 0.875rem;
  color: #dc3545;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

/* Filter Sections */
.filter-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.filter-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.filter-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

/* Filter Options */
.filter-option {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.filter-option input[type="checkbox"] {
  margin-right: 0.5rem;
  cursor: pointer;
}

.filter-label {
  flex: 1;
  color: #555;
}

.filter-count {
  color: #999;
  font-size: 0.8rem;
}

/* Filter Search */
.filter-search {
  margin-bottom: 1rem;
}

.filter-search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Category Tree */
.category-tree {
  margin-left: 0;
}

.category-item {
  margin-bottom: 0.5rem;
}

.category-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.expand-btn {
  background: none;
  border: 1px solid #ddd;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: #666;
}

.subcategory-list {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
}

.filter-option.subcategory {
  font-size: 0.8rem;
}

/* Price Range Filter */
.price-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.price-input-group {
  display: flex;
  align-items: center;
  flex: 1;
}

.currency {
  color: #666;
  margin-right: 0.25rem;
}

.price-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}

.price-separator {
  color: #999;
  font-size: 0.875rem;
}

.price-slider {
  position: relative;
  height: 40px;
  margin-bottom: 1rem;
}

.slider {
  position: absolute;
  width: 100%;
  height: 4px;
  background: transparent;
  pointer-events: none;
  -webkit-appearance: none;
  z-index: 2;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: all;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider-track {
  position: absolute;
  top: 18px;
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.slider-range {
  position: absolute;
  height: 100%;
  background: #007bff;
  border-radius: 2px;
}

.price-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
}

/* Rating Filter */
.rating-filters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rating-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.rating-filter:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.rating-filter.selected {
  background: #e3f2fd;
  border-color: #007bff;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #ddd;
  font-size: 1rem;
}

.star.filled {
  color: #ffa500;
}

.rating-text {
  font-size: 0.875rem;
  color: #666;
}

.rating-count {
  margin-left: auto;
  font-size: 0.75rem;
  color: #999;
}

.clear-rating {
  font-size: 0.875rem;
  color: #dc3545;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  padding: 0.5rem;
}

/* Active Filters */
.active-filters {
  margin-bottom: 1.5rem;
}

.active-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 20px;
  font-size: 0.875rem;
}

.remove-pill {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

/* Show More Button */
.show-more-btn {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #007bff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.show-more-btn:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

/* Mobile Styles */
.mobile-only {
  display: none;
}

.close-filters-btn {
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1;
}

.filter-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.filter-actions {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.apply-filters-btn {
  width: 100%;
  padding: 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

/* Mobile Filter Button */
.mobile-filter-btn {
  display: none;
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 1024px) {
  .search-body {
    grid-template-columns: 240px 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .search-body {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  
  .filter-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 300px;
    max-width: 85vw;
    transform: translateX(-100%);
    transition: transform 0.3s;
    z-index: 1000;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .filter-sidebar.open {
    transform: translateX(0);
  }
  
  .filter-overlay {
    display: block;
  }
  
  .mobile-only {
    display: block;
  }
  
  .mobile-filter-btn {
    display: block;
  }
}

/* No results */
.no-filter-results {
  color: #666;
  font-size: 0.875rem;
  font-style: italic;
  margin: 0.5rem 0;
}

/* Sorting Controls */
.sorting-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.sort-label {
  font-size: 0.875rem;
  color: #666;
}

.sort-select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.advanced-sort {
  font-size: 0.875rem;
}

.advanced-sort summary {
  cursor: pointer;
  color: #007bff;
}

.multi-sort {
  margin-top: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.multi-sort p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #666;
}

.multi-sort-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}
```

## Step 9: Add URL Synchronization

Keep filter state in the URL for sharing:

```tsx
// src/hooks/useUrlSync.ts
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '@jungle-commerce/typesense-react';

export function useUrlSync() {
  const { state, actions } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();

    // Add query
    if (state.query) {
      params.set('q', state.query);
    }

    // Add filters
    Object.entries(state.disjunctiveFacets).forEach(([field, values]) => {
      if (values.length > 0) {
        params.set(`f_${field}`, values.join(','));
      }
    });

    // Add numeric filters
    Object.entries(state.numericFilters).forEach(([field, range]) => {
      params.set(`r_${field}`, `${range.min}-${range.max}`);
    });

    // Add sort
    if (state.sortBy) {
      params.set('sort', state.sortBy);
    }

    // Add page
    if (state.page > 1) {
      params.set('page', state.page.toString());
    }

    setSearchParams(params);
  }, [state, setSearchParams]);

  // Restore state from URL
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      actions.setQuery(query);
    }

    // Restore filters
    searchParams.forEach((value, key) => {
      if (key.startsWith('f_')) {
        const field = key.substring(2);
        const values = value.split(',');
        values.forEach(v => actions.addDisjunctiveFacet(field, v));
      } else if (key.startsWith('r_')) {
        const field = key.substring(2);
        const [min, max] = value.split('-').map(Number);
        actions.setNumericFilter(field, min, max);
      }
    });

    // Restore sort
    const sort = searchParams.get('sort');
    if (sort) {
      actions.setSortBy(sort);
    }

    // Restore page
    const page = searchParams.get('page');
    if (page) {
      actions.setPage(parseInt(page));
    }
  }, []); // Run only on mount
}
```

## Step 10: Performance Optimization

Optimize for large facet counts:

```tsx
// src/hooks/useLazyFacets.ts
import { useState, useEffect } from 'react';
import { useSearch } from '@jungle-commerce/typesense-react';

export function useLazyFacets(field: string, initialLoad = false) {
  const { client, collection } = useSearch();
  const [facets, setFacets] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadFacets = async () => {
    if (loading || facets) return;

    setLoading(true);
    try {
      const response = await client.search(collection, {
        q: '*',
        query_by: 'name',
        facet_by: field,
        max_facet_values: 1000,
        per_page: 0 // Don't fetch documents
      });

      setFacets(response.facet_counts?.[0]);
    } catch (error) {
      console.error(`Error loading facets for ${field}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoad) {
      loadFacets();
    }
  }, [initialLoad]);

  return { facets, loading, loadFacets };
}
```

## Summary

You've built a production-ready faceted search with:
- Multiple filter types and UI patterns
- Price range sliders with dual handles
- Rating filters with visual stars
- Hierarchical category navigation
- Active filter management
- Mobile-responsive design
- URL state synchronization
- Performance optimizations

Key concepts covered:
- Using `disjunctive` facets for OR logic
- Managing numeric filters for ranges
- Creating reusable filter components
- Handling mobile UI/UX
- Optimizing for performance

Next, try the multi-collection search tutorial to search across different data types!

---

[← Basic Search Tutorial](./basic-search-tutorial.md) | [Next: Multi-Collection Tutorial →](./multi-collection-tutorial.md)