# Filter Builder Guide

## Overview
The Filter Builder utilities in typesense-react provide a comprehensive set of functions for constructing Typesense filter strings programmatically. This guide shows practical examples and best practices for building complex filters.

## Table of Contents
1. [Basic Filter Construction](#basic-filter-construction)
2. [Disjunctive (OR) Filters](#disjunctive-or-filters)
3. [Numeric Range Filters](#numeric-range-filters)
4. [Date Range Filters](#date-range-filters)
5. [Geographic Filters](#geographic-filters)
6. [Combining Multiple Filters](#combining-multiple-filters)
7. [Schema-Aware Filtering](#schema-aware-filtering)
8. [Advanced Filter Building](#advanced-filter-building)
9. [Filter Parsing and Deserialization](#filter-parsing-and-deserialization)

## Basic Filter Construction

### Simple Field-Value Filters

```typescript
import { buildFilter } from '@jungle-commerce/typesense-react';

// Basic equality filter
const categoryFilter = buildFilter('category', 'electronics');
// Result: "category:=electronics"

// Exact match with backticks (for values with spaces)
const titleFilter = buildFilter('title', 'iPhone 13 Pro', true);
// Result: "title:=`iPhone 13 Pro`"

// Negation filter
const notInStockFilter = buildFilter('in_stock', 'false', false, true);
// Result: "in_stock:!=false"

// Array values (creates an IN filter)
const multiCategoryFilter = buildFilter('category', ['electronics', 'computers', 'phones']);
// Result: "category:=[electronics,computers,phones]"
```

### Selective Filters (Single Value)

```typescript
import { buildSelectiveFilter } from '@jungle-commerce/typesense-react';

// For dropdown/select filters where only one value is selected
const statusFilter = buildSelectiveFilter('status', 'active');
// Result: "status:=`active`"

// With schema (numeric values don't use backticks)
const priceFilter = buildSelectiveFilter('priority', '1', schema);
// Result: "priority:=1"
```

## Disjunctive (OR) Filters

### Building OR Conditions

```typescript
import { buildDisjunctiveFilter } from '@jungle-commerce/typesense-react';

// Basic OR filter for multiple values
const brandsFilter = buildDisjunctiveFilter('brand', ['Apple', 'Samsung', 'Google']);
// Result: "(brand:=`Apple` || brand:=`Samsung` || brand:=`Google`)"

// Single value (no parentheses needed)
const singleBrandFilter = buildDisjunctiveFilter('brand', ['Apple']);
// Result: "brand:=`Apple`"

// Numeric fields (no backticks)
const ratingFilter = buildDisjunctiveFilter('rating', ['4', '5'], schema);
// Result: "(rating:=4 || rating:=5)"
```

### Real-World E-commerce Example

```typescript
// Allow users to filter by multiple brands and categories
const filters = [];

// User selected multiple brands
const selectedBrands = ['Apple', 'Samsung', 'LG'];
filters.push(buildDisjunctiveFilter('brand', selectedBrands));

// User selected multiple categories
const selectedCategories = ['TVs', 'Monitors', 'Projectors'];
filters.push(buildDisjunctiveFilter('category', selectedCategories));

// Combine with AND logic
const combinedFilter = combineFilters(filters);
// Result: "(brand:=`Apple` || brand:=`Samsung` || brand:=`LG`) && (category:=`TVs` || category:=`Monitors` || category:=`Projectors`)"
```

## Numeric Range Filters

### Building Range Filters

```typescript
import { buildNumericFilter } from '@jungle-commerce/typesense-react';

// Range filter (both min and max)
const priceRangeFilter = buildNumericFilter('price', 100, 500);
// Result: "price:[100..500]"

// Minimum only
const minPriceFilter = buildNumericFilter('price', 100);
// Result: "price:>=100"

// Maximum only
const maxPriceFilter = buildNumericFilter('price', undefined, 500);
// Result: "price:<=500"

// Rating filter
const highRatingFilter = buildNumericFilter('rating', 4);
// Result: "rating:>=4"
```

### Price Filter Component Example

```typescript
function PriceFilterExample() {
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  
  const applyPriceFilter = () => {
    const priceFilter = buildNumericFilter('price', minPrice, maxPrice);
    // Apply this filter to your search
    updateSearchFilters(priceFilter);
  };
  
  return (
    <div>
      <input 
        type="number" 
        placeholder="Min Price"
        onChange={(e) => setMinPrice(Number(e.target.value))}
      />
      <input 
        type="number" 
        placeholder="Max Price"
        onChange={(e) => setMaxPrice(Number(e.target.value))}
      />
      <button onClick={applyPriceFilter}>Apply</button>
    </div>
  );
}
```

## Date Range Filters

### Building Date Filters

```typescript
import { buildDateFilter } from '@jungle-commerce/typesense-react';

// Date range filter
const dateRangeFilter = buildDateFilter(
  'created_at',
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
// Result: "created_at:[1704067200..1735689599]"

// After a specific date
const recentFilter = buildDateFilter('created_at', new Date('2024-06-01'));
// Result: "created_at:>=1717200000"

// Before a specific date
const oldFilter = buildDateFilter('created_at', undefined, new Date('2023-12-31'));
// Result: "created_at:<=1704067199"

// Using date strings
const stringDateFilter = buildDateFilter(
  'published_date',
  '2024-01-01',
  '2024-06-30'
);
```

### Date Picker Integration

```typescript
function DateFilterExample() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const applyDateFilter = () => {
    if (startDate || endDate) {
      const dateFilter = buildDateFilter('created_at', startDate, endDate);
      updateSearchFilters(dateFilter);
    }
  };
  
  return (
    <div>
      <DatePicker
        selected={startDate}
        onChange={setStartDate}
        placeholderText="Start Date"
      />
      <DatePicker
        selected={endDate}
        onChange={setEndDate}
        placeholderText="End Date"
      />
      <button onClick={applyDateFilter}>Apply Date Filter</button>
    </div>
  );
}
```

## Geographic Filters

### Building Location-Based Filters

```typescript
import { buildGeoFilter } from '@jungle-commerce/typesense-react';

// Search within 10km radius of New York City
const nycFilter = buildGeoFilter('location', 40.7128, -74.0060, 10);
// Result: "location:(40.7128,-74.0060,10 km)"

// Search within 5 miles of location
const milesFilter = buildGeoFilter('store_location', 37.7749, -122.4194, 5, 'mi');
// Result: "store_location:(37.7749,-122.4194,5 mi)"

// Error handling for invalid coordinates
try {
  const invalidFilter = buildGeoFilter('location', 200, -74, 10); // Invalid latitude
} catch (error) {
  console.error('Invalid coordinates:', error.message);
  // Error: "Latitude must be between -90 and 90"
}
```

### Store Locator Example

```typescript
function StoreLocatorExample() {
  const [userLocation, setUserLocation] = useState({ lat: 0, lng: 0 });
  const [searchRadius, setSearchRadius] = useState(10);
  
  useEffect(() => {
    // Get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }
    );
  }, []);
  
  const findNearbyStores = () => {
    try {
      const geoFilter = buildGeoFilter(
        'store_location',
        userLocation.lat,
        userLocation.lng,
        searchRadius,
        'km'
      );
      
      // Apply geo filter to search
      searchStores({ filter: geoFilter });
    } catch (error) {
      console.error('Invalid location data:', error);
    }
  };
  
  return (
    <div>
      <input
        type="range"
        min="1"
        max="50"
        value={searchRadius}
        onChange={(e) => setSearchRadius(Number(e.target.value))}
      />
      <span>{searchRadius} km</span>
      <button onClick={findNearbyStores}>Find Stores</button>
    </div>
  );
}
```

## Combining Multiple Filters

### Using combineFilters

```typescript
import { combineFilters } from '@jungle-commerce/typesense-react';

// Combine multiple filter conditions
const filters = [
  buildFilter('in_stock', 'true'),
  buildNumericFilter('price', 10, 100),
  buildDisjunctiveFilter('brand', ['Apple', 'Samsung']),
  buildDateFilter('created_at', new Date('2024-01-01'))
];

const combinedFilter = combineFilters(filters);
// Result: "in_stock:=true && price:[10..100] && (brand:=`Apple` || brand:=`Samsung`) && created_at:>=1704067200"

// Custom operator (OR instead of AND)
const orFilter = combineFilters(
  ['category:=electronics', 'category:=computers'],
  ' || '
);
// Result: "category:=electronics || category:=computers"
```

### Complex Filter Scenarios

```typescript
// E-commerce product filter with multiple criteria
function buildProductFilter(criteria: ProductFilterCriteria) {
  const filters: (string | null)[] = [];
  
  // Category filter (OR logic)
  if (criteria.categories?.length) {
    filters.push(buildDisjunctiveFilter('category', criteria.categories));
  }
  
  // Brand filter (OR logic)
  if (criteria.brands?.length) {
    filters.push(buildDisjunctiveFilter('brand', criteria.brands));
  }
  
  // Price range
  if (criteria.minPrice || criteria.maxPrice) {
    filters.push(buildNumericFilter('price', criteria.minPrice, criteria.maxPrice));
  }
  
  // Rating filter
  if (criteria.minRating) {
    filters.push(buildNumericFilter('rating', criteria.minRating));
  }
  
  // Availability
  if (criteria.inStockOnly) {
    filters.push(buildFilter('in_stock', 'true'));
  }
  
  // Date filter for new arrivals
  if (criteria.newArrivalsOnly) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filters.push(buildDateFilter('created_at', thirtyDaysAgo));
  }
  
  // Location filter for local inventory
  if (criteria.location && criteria.radius) {
    filters.push(buildGeoFilter(
      'store_location',
      criteria.location.lat,
      criteria.location.lng,
      criteria.radius
    ));
  }
  
  return combineFilters(filters);
}

// Usage
const productFilter = buildProductFilter({
  categories: ['Electronics', 'Computers'],
  brands: ['Apple', 'Dell', 'HP'],
  minPrice: 500,
  maxPrice: 2000,
  minRating: 4,
  inStockOnly: true,
  newArrivalsOnly: true,
  location: { lat: 40.7128, lng: -74.0060 },
  radius: 25
});
```

## Schema-Aware Filtering

### Using Schema for Type Detection

```typescript
import { buildFilterString, isNumericField, isBooleanField } from '@jungle-commerce/typesense-react';

// Schema-aware filter building
const schema = {
  fields: [
    { name: 'price', type: 'float' },
    { name: 'quantity', type: 'int32' },
    { name: 'in_stock', type: 'bool' },
    { name: 'category', type: 'string' }
  ]
};

// Build filters with proper type handling
const filters = buildFilterString({
  disjunctiveFacets: {
    price: ['100', '200', '300'], // Will be treated as numeric
    category: ['electronics', 'computers'] // Will use backticks
  },
  selectiveFilters: {
    in_stock: 'true' // Won't use backticks for boolean
  },
  schema
});

// Check field types before building filters
if (isNumericField('price', schema)) {
  // Build numeric filter
  const priceFilter = buildNumericFilter('price', 100, 500);
} else {
  // Build string filter
  const priceFilter = buildFilter('price', '100-500');
}
```

### Dynamic Filter Generation

```typescript
function buildDynamicFilter(fieldName: string, value: any, schema?: CollectionSchema) {
  // Determine field type from schema
  if (isNumericField(fieldName, schema)) {
    if (typeof value === 'object' && 'min' in value) {
      return buildNumericFilter(fieldName, value.min, value.max);
    }
    return buildFilter(fieldName, value.toString());
  }
  
  if (isBooleanField(fieldName, schema)) {
    return buildFilter(fieldName, value.toString());
  }
  
  // Default to string handling
  if (Array.isArray(value)) {
    return buildDisjunctiveFilter(fieldName, value);
  }
  
  return buildFilter(fieldName, value, true); // Use exact match for strings
}
```

## Advanced Filter Building

### Using buildFilterString for Complex Scenarios

```typescript
import { buildFilterString } from '@jungle-commerce/typesense-react';

// Complete filter configuration
const filterConfig = {
  // OR filters for multi-select facets
  disjunctiveFacets: {
    category: ['Electronics', 'Computers', 'Phones'],
    brand: ['Apple', 'Samsung', 'Google'],
    color: ['Black', 'White', 'Silver']
  },
  
  // Numeric range filters
  numericFilters: {
    price: { min: 100, max: 1000 },
    rating: { min: 4 },
    stock_quantity: { min: 1 }
  },
  
  // Date range filters
  dateFilters: {
    created_at: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    },
    last_updated: {
      start: new Date('2024-06-01')
    }
  },
  
  // Single-select filters
  selectiveFilters: {
    status: 'active',
    warehouse: 'US-WEST-1'
  },
  
  // Custom attribute filters
  customFilters: {
    tags: ['featured', 'bestseller', 'new-arrival'],
    certifications: ['energy-star', 'rohs']
  },
  
  // Additional raw filter string
  additionalFilters: 'is_prime_eligible:=true && free_shipping:=true',
  
  // Schema for type detection
  schema: collectionSchema
};

const completeFilter = buildFilterString(filterConfig);
// Generates a complex filter string combining all criteria
```

### Numeric Range Mode with Facets

```typescript
// Configure numeric facets to use range mode
const filterWithRanges = buildFilterString({
  disjunctiveFacets: {
    price: ['100', '200', '300', '400', '500'] // Selected price facets
  },
  numericFacetRanges: {
    price: {
      mode: 'range', // Convert selections to min-max range
      currentRange: { min: 100, max: 500 }
    }
  },
  useNumericRanges: true,
  schema
});
// Result: "price:[100..500]" instead of individual OR conditions
```

## Filter Parsing and Deserialization

### Parsing Filter Strings

```typescript
import { parseFilterString } from '@jungle-commerce/typesense-react';

// Parse a complex filter string back into components
const filterString = "category:=`Electronics` && (brand:=`Apple` || brand:=`Samsung`) && price:[100..500] && rating:>=4 && in_stock:=true";

const parsed = parseFilterString(filterString);
/*
Result:
{
  disjunctiveFacets: {
    brand: ['Apple', 'Samsung']
  },
  numericFilters: {
    price: { min: 100, max: 500 },
    rating: { min: 4 }
  },
  selectiveFilters: {
    category: 'Electronics',
    in_stock: 'true'
  },
  remainingFilters: ''
}
*/
```

### Saving and Restoring Filter State

```typescript
// Save filter state to URL or localStorage
function saveFilterState(filters: FilterState) {
  const filterString = buildFilterString({
    disjunctiveFacets: filters.facets,
    numericFilters: filters.ranges,
    selectiveFilters: filters.selects,
    additionalFilters: filters.custom
  });
  
  // Save to URL
  const params = new URLSearchParams(window.location.search);
  params.set('filters', filterString);
  window.history.pushState({}, '', `?${params.toString()}`);
  
  // Or save to localStorage
  localStorage.setItem('savedFilters', filterString);
}

// Restore filter state
function restoreFilterState(): FilterState {
  // From URL
  const params = new URLSearchParams(window.location.search);
  const filterString = params.get('filters');
  
  if (filterString) {
    const parsed = parseFilterString(filterString);
    return {
      facets: parsed.disjunctiveFacets,
      ranges: parsed.numericFilters,
      selects: parsed.selectiveFilters,
      custom: parsed.remainingFilters
    };
  }
  
  return getDefaultFilterState();
}
```

## Best Practices

### 1. Always Escape User Input

```typescript
// The utilities automatically escape special characters
const safeFilter = buildFilter('title', userInput, true);
// Backticks and backslashes are properly escaped
```

### 2. Use Schema for Type Safety

```typescript
// Always pass schema when available
const filter = buildDisjunctiveFilter('field', values, schema);
// Ensures proper handling of numeric and boolean fields
```

### 3. Handle Empty Values

```typescript
// Utilities return null/empty for invalid inputs
const emptyFilter = buildDisjunctiveFilter('field', []); // Returns null
const validFilters = combineFilters([emptyFilter, 'valid:=true']); // Filters out null
// Result: "valid:=true"
```

### 4. Validate Before Building

```typescript
// Validate geographic coordinates
function buildSafeGeoFilter(field: string, lat: any, lng: any, radius: any) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseFloat(radius);
  
  if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
    return null;
  }
  
  try {
    return buildGeoFilter(field, latNum, lngNum, radiusNum);
  } catch (error) {
    console.error('Invalid coordinates:', error);
    return null;
  }
}
```

### 5. Use Constants for Field Names

```typescript
// Define field constants to avoid typos
const FIELDS = {
  CATEGORY: 'category',
  PRICE: 'price',
  BRAND: 'brand',
  IN_STOCK: 'in_stock',
  CREATED_AT: 'created_at'
} as const;

// Use in filters
const categoryFilter = buildDisjunctiveFilter(FIELDS.CATEGORY, ['Electronics']);
const priceFilter = buildNumericFilter(FIELDS.PRICE, 100, 500);
```

## Error Handling

### Graceful Degradation

```typescript
function buildRobustFilter(criteria: any) {
  const filters: (string | null)[] = [];
  
  try {
    // Safely build each filter component
    if (criteria.categories?.length) {
      filters.push(buildDisjunctiveFilter('category', criteria.categories));
    }
  } catch (error) {
    console.warn('Failed to build category filter:', error);
  }
  
  try {
    if (criteria.location) {
      filters.push(buildGeoFilter(
        'location',
        criteria.location.lat,
        criteria.location.lng,
        criteria.radius || 10
      ));
    }
  } catch (error) {
    console.warn('Failed to build location filter:', error);
  }
  
  // Always return a valid filter string
  return combineFilters(filters) || '';
}
```

## Complete Example: Search Page with Filters

```typescript
function SearchPageWithFilters() {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    brands: [],
    priceRange: { min: undefined, max: undefined },
    inStockOnly: false,
    sortBy: 'relevance'
  });
  
  const buildSearchFilters = () => {
    return buildFilterString({
      disjunctiveFacets: {
        category: filters.categories,
        brand: filters.brands
      },
      numericFilters: {
        price: filters.priceRange
      },
      additionalFilters: filters.inStockOnly ? 'in_stock:=true' : undefined,
      schema: collectionSchema
    });
  };
  
  const { results, search } = useSearch({
    collection: 'products',
    query: searchQuery,
    filter_by: buildSearchFilters(),
    sort_by: filters.sortBy
  });
  
  return (
    <div>
      <FilterSidebar
        onFiltersChange={setFilters}
        currentFilters={filters}
      />
      <SearchResults results={results} />
    </div>
  );
}
```

This guide provides comprehensive examples of using the filter builder utilities to create complex, type-safe filters for Typesense searches. The utilities handle edge cases, escape special characters, and provide a clean API for building filters programmatically.