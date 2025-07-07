# Typesense React Utilities Reference

## Overview
This document provides a comprehensive reference for all utility functions in the typesense-react library. These utilities help build filters, sorts, validate inputs, and manage schema patterns.

## Table of Contents
1. [Filter Builder Utilities](#filter-builder-utilities)
2. [Sort Builder Utilities](#sort-builder-utilities)
3. [Date Filter Helpers](#date-filter-helpers)
4. [Additional Filters Manager](#additional-filters-manager)
5. [Validation Utilities](#validation-utilities)
6. [Schema Pattern Utilities](#schema-pattern-utilities)
7. [Schema Validation Utilities](#schema-validation-utilities)

---

## Filter Builder Utilities
**Location:** `src/utils/filterBuilder.ts`

### Core Functions

#### `buildDisjunctiveFilter(field, values, schema?)`
Builds a filter string for disjunctive (OR) facets.

```typescript
buildDisjunctiveFilter('category', ['electronics', 'computers'])
// Returns: "(category:=`electronics` || category:=`computers`)"

// Numeric fields don't use backticks
buildDisjunctiveFilter('price', ['100', '200'], schema)
// Returns: "(price:=100 || price:=200)"
```

#### `buildFilter(field, value, exactMatch?, negate?)`
Builds a simple filter string for a field-value pair.

```typescript
buildFilter('category', 'electronics')
// Returns: "category:=electronics"

buildFilter('title', 'exact match', true)
// Returns: "title:=`exact match`"

buildFilter('category', ['electronics', 'computers'])
// Returns: "category:=[electronics,computers]"

buildFilter('category', 'electronics', false, true)
// Returns: "category:!=electronics"
```

#### `buildNumericFilter(field, min?, max?)`
Builds a filter string for numeric range filters.

```typescript
buildNumericFilter('price', 10, 100)
// Returns: "price:[10..100]"

buildNumericFilter('price', 10)
// Returns: "price:>=10"

buildNumericFilter('price', undefined, 100)
// Returns: "price:<=100"
```

#### `buildDateFilter(field, start?, end?)`
Builds a filter string for date range filters.

```typescript
buildDateFilter('created_at', new Date('2024-01-01'), new Date('2024-12-31'))
// Returns: "created_at:[1704067200..1735689599]"
```

#### `buildGeoFilter(field, lat, lng, radius, unit?)`
Builds a geographic radius filter.

```typescript
buildGeoFilter('location', 40.7128, -74.0060, 10)
// Returns: "location:(40.7128,-74.0060,10 km)"

buildGeoFilter('location', 40.7128, -74.0060, 5, 'mi')
// Returns: "location:(40.7128,-74.0060,5 mi)"
```

#### `combineFilters(filters, operator?)`
Combines multiple filter strings with AND logic (default).

```typescript
combineFilters(['category:=electronics', 'price:[10..100]'])
// Returns: "category:=electronics && price:[10..100]"

combineFilters(['category:=electronics', 'category:=computers'], ' || ')
// Returns: "category:=electronics || category:=computers"
```

#### `buildFilterString(params)`
Builds a complete filter string from all filter types.

```typescript
buildFilterString({
  disjunctiveFacets: { category: ['electronics', 'computers'] },
  numericFilters: { price: { min: 10, max: 100 } },
  dateFilters: { created_at: { start: new Date('2024-01-01') } },
  additionalFilters: 'in_stock:=true'
})
// Returns combined filter string
```

### Helper Functions

#### `isNumericField(fieldName, schema?)`
Checks if a field is numeric based on schema.

#### `isBooleanField(fieldName, schema?)`
Checks if a field is boolean based on schema.

#### `escapeFilterValue(value)`
Escapes special characters in filter values.

#### `parseFilterString(filterString)`
Parses a filter string to extract different filter types.

---

## Sort Builder Utilities
**Location:** `src/utils/sortBuilder.ts`

### Core Functions

#### `buildSingleSortString(field, order?)`
Builds a sort string from a single field and order.

```typescript
buildSingleSortString('price', 'desc')
// Returns: "price:desc"

buildSingleSortString('name')
// Returns: "name:desc" (default)
```

#### `buildMultiSortString(sorts)`
Builds a sort string from multiple sort fields.

```typescript
buildMultiSortString([
  { field: 'relevance', order: 'desc' },
  { field: 'price', order: 'asc' }
])
// Returns: "relevance:desc,price:asc"
```

#### `parseSortString(sortString)`
Parses a Typesense sort string into an array of sort fields.

```typescript
parseSortString('price:desc,name:asc')
// Returns: [
//   { field: 'price', order: 'desc' },
//   { field: 'name', order: 'asc' }
// ]
```

#### `toggleSortDirection(sortString)`
Toggles the sort direction in a sort string.

```typescript
toggleSortDirection('price:asc')
// Returns: "price:desc"

toggleSortDirection('price')
// Returns: "price:desc"
```

### Helper Functions

#### `isSortableField(fieldName, schema?)`
Checks if a field is sortable based on schema.

#### `validateSortFields(sorts, schema?)`
Validates sort fields against schema.

#### `getSortDirection(sortString)`
Gets the sort direction from a sort string.

#### `isSortActive(field, sortString)`
Checks if a field is active in a sort string.

---

## Date Filter Helpers
**Location:** `src/utils/dateFilterHelpers.ts`

### Core Functions

#### `getLastNDaysFilter(field, days)`
Creates a filter for the last N days.

```typescript
getLastNDaysFilter('created_at', 7)
// Returns: "created_at:[1234567890..1234654290]"
```

#### `getDateRangeFilter(field, start, end)`
Creates a filter for a specific date range.

```typescript
getDateRangeFilter('created_at', 
  new Date('2024-01-01'), 
  new Date('2024-12-31')
)
// Returns: "created_at:[1704067200..1735689599]"
```

#### `getCurrentMonthFilter(field)`
Creates a filter for the current month.

```typescript
getCurrentMonthFilter('created_at')
// Returns filter for current month
```

#### `getCurrentYearFilter(field)`
Creates a filter for the current year.

```typescript
getCurrentYearFilter('created_at')
// Returns filter for current year
```

### Date Presets

#### `applyDatePreset(field, preset)`
Applies a date preset to get a filter string.

```typescript
applyDatePreset('created_at', 'LAST_7_DAYS')
applyDatePreset('created_at', 'THIS_MONTH')
applyDatePreset('created_at', 'YESTERDAY')
```

Available presets:
- `TODAY`
- `YESTERDAY`
- `LAST_7_DAYS`
- `LAST_30_DAYS`
- `THIS_MONTH`
- `LAST_MONTH`
- `THIS_YEAR`
- `LAST_YEAR`

### Parsing Functions

#### `parseDateRangeFilter(filterString)`
Parses a date range filter string.

```typescript
parseDateRangeFilter('created_at:[1704067200..1735689599]')
// Returns: {
//   field: 'created_at',
//   startDate: Date,
//   endDate: Date
// }
```

---

## Additional Filters Manager
**Location:** `src/utils/additionalFiltersManager.ts`

### Core Functions

#### `parseAdditionalFilters(filters)`
Parses an additional filters string into a Map.

```typescript
parseAdditionalFilters('category:=electronics && price:[10..100]')
// Returns: Map { 'category' => 'category:=electronics', 'price' => 'price:[10..100]' }
```

#### `combineAdditionalFilters(filters)`
Combines a Map of filters back into a filter string.

```typescript
const filterMap = new Map([
  ['category', 'category:=electronics'],
  ['price', 'price:[10..100]']
])
combineAdditionalFilters(filterMap)
// Returns: "category:=electronics && price:[10..100]"
```

#### `updateFilterInAdditionalFilters(currentFilters, field, newFilter)`
Updates or adds a filter for a specific field.

```typescript
updateFilterInAdditionalFilters(
  'category:=electronics && price:[10..100]',
  'price',
  'price:[20..200]'
)
// Returns: "category:=electronics && price:[20..200]"
```

#### `mergeAdditionalFilters(filters1, filters2)`
Merges two filter strings, with the second taking precedence.

```typescript
mergeAdditionalFilters(
  'category:=electronics && price:[10..100]',
  'price:[20..200] && in_stock:=true'
)
// Returns: "category:=electronics && price:[20..200] && in_stock:=true"
```

### Helper Functions

#### `hasFieldInAdditionalFilters(filters, field)`
Checks if a filter exists for a specific field.

#### `getFilterForField(filters, field)`
Gets the filter expression for a specific field.

#### `extractFieldFromFilter(filter)`
Extracts the field name from a filter expression.

#### `validateAdditionalFilters(filterString)`
Validates a filter string syntax.

---

## Validation Utilities
**Location:** `src/utils/validationUtils.ts`

### Search Validation

#### `validateSearchRequest(request)`
Validates a complete search request.

```typescript
validateSearchRequest({
  query_by: 'title,description',
  page: 1,
  per_page: 20,
  filter_by: 'category:=electronics'
})
// Returns: { isValid: true, errors: [] }
```

#### `validateSearchQuery(query, options?)`
Validates a search query string.

```typescript
validateSearchQuery('search term', { maxLength: 100 })
// Returns: { isValid: true, errors: [] }
```

### Filter and Sort Validation

#### `validateFilterString(filterString)`
Validates a filter string syntax.

```typescript
validateFilterString('category:=electronics && price:[10..100]')
// Returns: { isValid: true, errors: [] }
```

#### `validateSortString(sortString)`
Validates a sort string syntax.

```typescript
validateSortString('price:desc,name:asc')
// Returns: { isValid: true, errors: [] }
```

### Range Validation

#### `validateNumericRange(min?, max?, options?)`
Validates a numeric range.

```typescript
validateNumericRange(10, 100, { allowNegative: false })
// Returns: { isValid: true, errors: [] }

validateNumericRange(100, 10)
// Returns: { isValid: false, errors: ['Min value must be less than or equal to max value'] }
```

#### `validateDateRange(start?, end?, options?)`
Validates a date range.

```typescript
validateDateRange(
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  { allowFuture: false, maxDays: 365 }
)
// Returns: { isValid: true, errors: [] }
```

### Field Validation

#### `validateCollectionName(name)`
Validates a collection name.

```typescript
validateCollectionName('my_collection')
// Returns: { isValid: true, errors: [] }

validateCollectionName('my collection')
// Returns: { isValid: false, errors: ['Collection name can only contain letters, numbers, underscores, and hyphens'] }
```

#### `validateFieldName(name)`
Validates a field name.

```typescript
validateFieldName('created_at')
// Returns: { isValid: true, errors: [] }
```

### Input Sanitization

#### `sanitizeInput(input)`
Sanitizes input to prevent XSS.

```typescript
sanitizeInput('<script>alert("xss")</script>')
// Returns: "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
```

### Format Validators

#### `isValidEmail(email)`
Validates an email address.

```typescript
isValidEmail('user@example.com')
// Returns: true
```

#### `isValidUrl(url)`
Validates a URL.

```typescript
isValidUrl('https://example.com')
// Returns: true
```

#### `isValidPhone(phone)`
Validates a phone number.

```typescript
isValidPhone('+1-555-123-4567')
// Returns: true
```

---

## Schema Pattern Utilities
**Location:** `src/utils/schemaPatterns.ts`

### Pattern Matching

#### `matchesPattern(fieldName, pattern)`
Check if a field name matches a pattern.

```typescript
matchesPattern('created_at', { 
  pattern: '_at', 
  matchType: 'endsWith' 
})
// Returns: true
```

#### `matchesAnyPattern(fieldName, patterns)`
Check if a field name matches any pattern in a list.

```typescript
matchesAnyPattern('created_at', DEFAULT_TIMESTAMP_PATTERNS)
// Returns: true
```

### Default Patterns

#### `DEFAULT_TIMESTAMP_PATTERNS`
Patterns for identifying timestamp fields:
- `created_at`, `updated_at` (exact match)
- Fields ending with `_at` or `At`
- Fields containing `Date` or `Time`

#### `DEFAULT_DISJUNCTIVE_PATTERNS`
Patterns for identifying disjunctive (OR) fields:
- `tags`, `categories` (exact match)
- Fields containing `tag`, `category`, `type`, `status`

#### `DEFAULT_EXCLUDE_PATTERNS`
Patterns for fields to exclude:
- `id`, `_id` (exact match)
- Timestamp fields
- Sensitive fields (password, secret, token)
- Vector/embedding fields

#### `DEFAULT_SELECT_PATTERNS`
Patterns for low-cardinality select fields:
- `status`, `state`, `type`, `priority`
- `gender`, `country`, `role`

---

## Schema Validation Utilities
**Location:** `src/utils/schemaValidation.ts`

### Field Validation

#### `validateFieldCapabilities(field, capabilities)`
Check if a field has required capabilities.

```typescript
validateFieldCapabilities(field, {
  facetable: true,
  sortable: true,
  types: ['string', 'int32']
})
// Returns: { field, isValid: boolean, errors: string[] }
```

#### `isValidSortField(field)`
Validate if a field can be used for sorting.

```typescript
isValidSortField({
  name: 'price',
  type: 'int32',
  sort: true,
  optional: false
})
// Returns: true
```

#### `isValidFacetField(field)`
Validate if a field can be used for faceting.

```typescript
isValidFacetField({
  name: 'category',
  type: 'string',
  facet: true
})
// Returns: true
```

#### `isValidSearchField(field)`
Validate if a field can be searched.

```typescript
isValidSearchField({
  name: 'title',
  type: 'string',
  index: true
})
// Returns: true
```

### Field Discovery

#### `findFieldsWithCapabilities(schema, patterns, capabilities)`
Find fields matching patterns with capability validation.

```typescript
findFieldsWithCapabilities(schema, DEFAULT_TIMESTAMP_PATTERNS, {
  sortable: true,
  types: ['int64']
})
// Returns: ValidatedField[]
```

#### `getFirstValidField(schema, patterns, options)`
Get first valid field matching patterns with required capabilities.

```typescript
getFirstValidField(schema, DEFAULT_TIMESTAMP_PATTERNS, {
  sortable: true,
  indexed: true
})
// Returns: field or null
```

#### `getValidFields(schema, patterns, capabilities)`
Get all valid fields matching patterns with required capabilities.

```typescript
getValidFields(schema, DEFAULT_DISJUNCTIVE_PATTERNS, {
  facetable: true
})
// Returns: field[]
```

---

## Usage Examples

### Building Complex Filters

```typescript
import { 
  buildFilterString, 
  buildDisjunctiveFilter,
  buildNumericFilter,
  combineFilters 
} from '@jungle-commerce/typesense-reactfilterBuilder';

// Example 1: E-commerce product filter
const productFilter = buildFilterString({
  disjunctiveFacets: {
    category: ['electronics', 'computers'],
    brand: ['apple', 'samsung', 'dell']
  },
  numericFilters: {
    price: { min: 100, max: 1000 },
    rating: { min: 4 }
  },
  additionalFilters: 'in_stock:=true'
});

// Example 2: Manual filter construction
const filters = [
  buildDisjunctiveFilter('category', ['books', 'magazines']),
  buildNumericFilter('price', 10, 50),
  'published_year:>=2020'
];
const combinedFilter = combineFilters(filters);
```

### Working with Dates

```typescript
import { 
  applyDatePreset, 
  getDateRangeFilter,
  getLastNDaysFilter 
} from '@jungle-commerce/typesense-reactdateFilterHelpers';

// Use presets
const last7Days = applyDatePreset('created_at', 'LAST_7_DAYS');
const thisMonth = applyDatePreset('published_at', 'THIS_MONTH');

// Custom date ranges
const customRange = getDateRangeFilter(
  'event_date',
  new Date('2024-06-01'),
  new Date('2024-06-30')
);

// Relative dates
const recentPosts = getLastNDaysFilter('created_at', 30);
```

### Schema-Aware Operations

```typescript
import { 
  getValidFields,
  matchesAnyPattern,
  DEFAULT_DISJUNCTIVE_PATTERNS 
} from '@jungle-commerce/typesense-reactschemaPatterns';
import { isValidFacetField } from '@jungle-commerce/typesense-reactschemaValidation';

// Find all facetable fields that match disjunctive patterns
const disjunctiveFields = getValidFields(
  schema,
  DEFAULT_DISJUNCTIVE_PATTERNS,
  { facetable: true }
);

// Check if a field should be treated as disjunctive
const isDisjunctive = matchesAnyPattern(
  'product_tags',
  DEFAULT_DISJUNCTIVE_PATTERNS
);
```

## Best Practices

1. **Always validate user input** - Use validation utilities before building filters
2. **Use schema when available** - Pass schema to filter builders for proper type handling
3. **Escape special characters** - Filter values are automatically escaped
4. **Combine filters properly** - Use `combineFilters` instead of manual string concatenation
5. **Handle edge cases** - Check for empty values, null/undefined
6. **Use type-safe patterns** - Leverage TypeScript interfaces for sort fields and filter states

## Error Handling

Most utilities handle errors gracefully:
- Empty/null values return empty strings or empty arrays
- Invalid values in validation return detailed error messages
- Geo filters throw errors for invalid coordinates
- Schema validation provides detailed capability errors