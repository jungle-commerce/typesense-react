# Sort Builder Guide

## Overview
The Sort Builder utilities in typesense-react provide functions for building and managing Typesense sort strings. This guide covers single-field sorting, multi-field sorting, dynamic sort management, and best practices.

## Table of Contents
1. [Basic Sort Construction](#basic-sort-construction)
2. [Multi-Field Sorting](#multi-field-sorting)
3. [Sort String Parsing](#sort-string-parsing)
4. [Dynamic Sort Management](#dynamic-sort-management)
5. [Schema-Aware Sorting](#schema-aware-sorting)
6. [UI Integration Examples](#ui-integration-examples)
7. [Advanced Sorting Patterns](#advanced-sorting-patterns)
8. [Best Practices](#best-practices)

## Basic Sort Construction

### Single Field Sorting

```typescript
import { buildSingleSortString, buildSortBy } from '@jungle-commerce/typesense-react';

// Basic descending sort
const priceDescSort = buildSingleSortString('price', 'desc');
// Result: "price:desc"

// Ascending sort
const nameAscSort = buildSingleSortString('name', 'asc');
// Result: "name:asc"

// Default order (desc)
const defaultSort = buildSingleSortString('created_at');
// Result: "created_at:desc"

// Using buildSortBy with validation
const validatedSort = buildSortBy('price', 'invalid'); // Invalid order
// Result: "price:asc" (defaults to asc for invalid order)
```

### Sort Direction Management

```typescript
import { toggleSortDirection, getSortDirection } from '@jungle-commerce/typesense-react';

// Toggle sort direction
let currentSort = 'price:asc';
currentSort = toggleSortDirection(currentSort);
// Result: "price:desc"

// Toggle again
currentSort = toggleSortDirection(currentSort);
// Result: "price:asc"

// Handle fields without explicit direction
const implicitSort = toggleSortDirection('created_at');
// Result: "created_at:desc" (assumes asc, toggles to desc)

// Get current direction
const direction = getSortDirection('price:desc');
// Result: "desc"

const noDirection = getSortDirection('price');
// Result: null
```

## Multi-Field Sorting

### Building Multi-Sort Strings

```typescript
import { buildMultiSortString, SortField } from '@jungle-commerce/typesense-react';

// Define multiple sort fields
const multiSort: SortField[] = [
  { field: 'relevance', order: 'desc' },
  { field: 'price', order: 'asc' },
  { field: 'created_at', order: 'desc' }
];

const sortString = buildMultiSortString(multiSort);
// Result: "relevance:desc,price:asc,created_at:desc"

// Empty array handling
const emptySort = buildMultiSortString([]);
// Result: ""

// With validation
const validatedMultiSort = buildMultiSortBy([
  { field: 'price', order: 'asc' },
  { field: '', order: 'desc' }, // Empty field filtered out
  { field: 'name', order: 'desc' }
]);
// Result: "price:asc,name:desc"
```

### E-commerce Sort Example

```typescript
// Common e-commerce sort configurations
const SORT_OPTIONS = {
  RELEVANCE: [{ field: '_text_match', order: 'desc' }],
  PRICE_LOW_HIGH: [{ field: 'price', order: 'asc' }],
  PRICE_HIGH_LOW: [{ field: 'price', order: 'desc' }],
  NEWEST: [{ field: 'created_at', order: 'desc' }],
  TOP_RATED: [
    { field: 'rating', order: 'desc' },
    { field: 'review_count', order: 'desc' }
  ],
  BEST_SELLING: [
    { field: 'sales_count', order: 'desc' },
    { field: 'rating', order: 'desc' }
  ]
} as const;

function ProductSort({ onSortChange }: { onSortChange: (sort: string) => void }) {
  const [selectedSort, setSelectedSort] = useState('RELEVANCE');
  
  const handleSortChange = (sortKey: keyof typeof SORT_OPTIONS) => {
    const sortFields = SORT_OPTIONS[sortKey];
    const sortString = buildMultiSortString(sortFields);
    setSelectedSort(sortKey);
    onSortChange(sortString);
  };
  
  return (
    <select 
      value={selectedSort} 
      onChange={(e) => handleSortChange(e.target.value as keyof typeof SORT_OPTIONS)}
    >
      <option value="RELEVANCE">Best Match</option>
      <option value="PRICE_LOW_HIGH">Price: Low to High</option>
      <option value="PRICE_HIGH_LOW">Price: High to Low</option>
      <option value="NEWEST">Newest First</option>
      <option value="TOP_RATED">Top Rated</option>
      <option value="BEST_SELLING">Best Selling</option>
    </select>
  );
}
```

## Sort String Parsing

### Parsing Single Sort Strings

```typescript
import { parseSingleSortString } from '@jungle-commerce/typesense-react';

// Parse complete sort string
const parsed1 = parseSingleSortString('price:desc');
// Result: { field: 'price', order: 'desc' }

// Parse without explicit order
const parsed2 = parseSingleSortString('created_at');
// Result: { field: 'created_at', order: 'asc' } (default)

// Invalid formats
const invalid1 = parseSingleSortString('');
// Result: null

const invalid2 = parseSingleSortString('price:invalid');
// Result: null

const invalid3 = parseSingleSortString('invalid');
// Result: null (special case for 'invalid' field name)
```

### Parsing Multi-Sort Strings

```typescript
import { parseSortString } from '@jungle-commerce/typesense-react';

// Parse comma-separated sort string
const multiParsed = parseSortString('price:desc,name:asc,created_at:desc');
// Result: [
//   { field: 'price', order: 'desc' },
//   { field: 'name', order: 'asc' },
//   { field: 'created_at', order: 'desc' }
// ]

// Handle whitespace
const withSpaces = parseSortString('price:desc, name:asc , created_at:desc');
// Same result (whitespace is trimmed)

// Filter out invalid entries
const mixedValid = parseSortString('price:desc,invalid:xyz,name:asc');
// Result: [
//   { field: 'price', order: 'desc' },
//   { field: 'name', order: 'asc' }
// ]
```

### Normalizing Sort Input

```typescript
import { normalizeSortInput } from '@jungle-commerce/typesense-react';

// String input
const fromString = normalizeSortInput('price:desc,name:asc');
// Result: [
//   { field: 'price', order: 'desc' },
//   { field: 'name', order: 'asc' }
// ]

// Array input (pass-through)
const fromArray = normalizeSortInput([
  { field: 'price', order: 'desc' },
  { field: 'name', order: 'asc' }
]);
// Same array returned

// Undefined/empty handling
const empty = normalizeSortInput(undefined);
// Result: []
```

## Dynamic Sort Management

### Sort State Management

```typescript
import { useState } from 'react';
import { 
  buildMultiSortString, 
  parseSortString, 
  isSortActive,
  toggleSortDirection 
} from '@jungle-commerce/typesense-react';

function useDynamicSort() {
  const [sortFields, setSortFields] = useState<SortField[]>([]);
  
  const addSort = (field: string, order: 'asc' | 'desc' = 'desc') => {
    setSortFields(prev => {
      // Remove if already exists
      const filtered = prev.filter(s => s.field !== field);
      // Add new sort at the beginning (highest priority)
      return [{ field, order }, ...filtered];
    });
  };
  
  const removeSort = (field: string) => {
    setSortFields(prev => prev.filter(s => s.field !== field));
  };
  
  const toggleSort = (field: string) => {
    setSortFields(prev => {
      const existing = prev.find(s => s.field === field);
      if (existing) {
        // Toggle direction
        return prev.map(s => 
          s.field === field 
            ? { ...s, order: s.order === 'asc' ? 'desc' : 'asc' }
            : s
        );
      } else {
        // Add new sort
        return [...prev, { field, order: 'desc' }];
      }
    });
  };
  
  const getSortString = () => buildMultiSortString(sortFields);
  
  const isFieldSorted = (field: string) => 
    sortFields.some(s => s.field === field);
  
  const getFieldDirection = (field: string) => 
    sortFields.find(s => s.field === field)?.order || null;
  
  return {
    sortFields,
    addSort,
    removeSort,
    toggleSort,
    getSortString,
    isFieldSorted,
    getFieldDirection
  };
}
```

### Interactive Sort Headers

```typescript
function SortableTableHeader() {
  const { toggleSort, isFieldSorted, getFieldDirection } = useDynamicSort();
  
  const SortIcon = ({ field }: { field: string }) => {
    const direction = getFieldDirection(field);
    if (!direction) return <span>↕️</span>;
    return direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };
  
  return (
    <thead>
      <tr>
        <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
          Name <SortIcon field="name" />
        </th>
        <th onClick={() => toggleSort('price')} style={{ cursor: 'pointer' }}>
          Price <SortIcon field="price" />
        </th>
        <th onClick={() => toggleSort('rating')} style={{ cursor: 'pointer' }}>
          Rating <SortIcon field="rating" />
        </th>
        <th onClick={() => toggleSort('created_at')} style={{ cursor: 'pointer' }}>
          Date <SortIcon field="created_at" />
        </th>
      </tr>
    </thead>
  );
}
```

## Schema-Aware Sorting

### Validating Sortable Fields

```typescript
import { isSortableField, validateSortFields } from '@jungle-commerce/typesense-react';

const schema = {
  fields: [
    { name: 'title', type: 'string', sort: true },
    { name: 'description', type: 'string', sort: false }, // Not sortable
    { name: 'price', type: 'float', sort: true },
    { name: 'embedding', type: 'float[]', sort: false }, // Vector field
    { name: 'created_at', type: 'int64', sort: true }
  ]
};

// Check individual fields
const canSortTitle = isSortableField('title', schema); // true
const canSortDesc = isSortableField('description', schema); // false
const canSortUnknown = isSortableField('unknown_field', schema); // false

// Validate multiple sort fields
const requestedSorts: SortField[] = [
  { field: 'title', order: 'asc' },
  { field: 'description', order: 'desc' }, // Will be filtered out
  { field: 'price', order: 'desc' }
];

const validSorts = validateSortFields(requestedSorts, schema);
// Result: [
//   { field: 'title', order: 'asc' },
//   { field: 'price', order: 'desc' }
// ]
```

### Dynamic Sort Options Based on Schema

```typescript
function SchemaDrivenSortOptions({ schema }: { schema: CollectionSchema }) {
  // Get all sortable fields from schema
  const sortableFields = schema.fields
    .filter(field => field.sort !== false)
    .map(field => ({
      name: field.name,
      type: field.type,
      label: field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  
  const [selectedSorts, setSelectedSorts] = useState<SortField[]>([]);
  
  const addSortField = (fieldName: string) => {
    if (!selectedSorts.find(s => s.field === fieldName)) {
      setSelectedSorts([...selectedSorts, { field: fieldName, order: 'desc' }]);
    }
  };
  
  const updateSortOrder = (fieldName: string, order: 'asc' | 'desc') => {
    setSelectedSorts(
      selectedSorts.map(s => 
        s.field === fieldName ? { ...s, order } : s
      )
    );
  };
  
  const removeSortField = (fieldName: string) => {
    setSelectedSorts(selectedSorts.filter(s => s.field !== fieldName));
  };
  
  return (
    <div>
      <h3>Add Sort Field:</h3>
      <select onChange={(e) => addSortField(e.target.value)} value="">
        <option value="">Select a field...</option>
        {sortableFields.map(field => (
          <option key={field.name} value={field.name}>
            {field.label} ({field.type})
          </option>
        ))}
      </select>
      
      <h3>Active Sorts:</h3>
      {selectedSorts.map((sort, index) => (
        <div key={sort.field}>
          <span>{index + 1}. {sort.field}</span>
          <select 
            value={sort.order} 
            onChange={(e) => updateSortOrder(sort.field, e.target.value as 'asc' | 'desc')}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button onClick={() => removeSortField(sort.field)}>Remove</button>
        </div>
      ))}
      
      <p>Sort string: {buildMultiSortString(selectedSorts)}</p>
    </div>
  );
}
```

## UI Integration Examples

### Sort Dropdown Component

```typescript
interface SortOption {
  label: string;
  value: string;
  sorts: SortField[];
}

function SortDropdown({ 
  options,
  defaultValue,
  onChange 
}: {
  options: SortOption[];
  defaultValue?: string;
  onChange: (sortString: string) => void;
}) {
  const [selected, setSelected] = useState(defaultValue || options[0]?.value);
  
  const handleChange = (value: string) => {
    setSelected(value);
    const option = options.find(o => o.value === value);
    if (option) {
      const sortString = buildMultiSortString(option.sorts);
      onChange(sortString);
    }
  };
  
  return (
    <div className="sort-dropdown">
      <label>Sort by:</label>
      <select value={selected} onChange={(e) => handleChange(e.target.value)}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Usage
const sortOptions: SortOption[] = [
  {
    label: 'Relevance',
    value: 'relevance',
    sorts: [{ field: '_text_match', order: 'desc' }]
  },
  {
    label: 'Price: Low to High',
    value: 'price_asc',
    sorts: [{ field: 'price', order: 'asc' }]
  },
  {
    label: 'Customer Rating',
    value: 'rating',
    sorts: [
      { field: 'rating', order: 'desc' },
      { field: 'review_count', order: 'desc' }
    ]
  }
];
```

### Sort Pills Component

```typescript
function SortPills() {
  const [activeSorts, setActiveSorts] = useState<Set<string>>(new Set());
  
  const sortOptions = [
    { field: 'price', label: 'Price' },
    { field: 'rating', label: 'Rating' },
    { field: 'created_at', label: 'Date' },
    { field: 'popularity', label: 'Popularity' }
  ];
  
  const toggleSortPill = (field: string) => {
    const newSorts = new Set(activeSorts);
    if (newSorts.has(field)) {
      newSorts.delete(field);
    } else {
      newSorts.add(field);
    }
    setActiveSorts(newSorts);
    
    // Build sort string from active sorts
    const sortFields: SortField[] = Array.from(newSorts).map(field => ({
      field,
      order: 'desc' // Default to descending
    }));
    
    const sortString = buildMultiSortString(sortFields);
    console.log('New sort:', sortString);
  };
  
  return (
    <div className="sort-pills">
      {sortOptions.map(option => (
        <button
          key={option.field}
          className={`pill ${activeSorts.has(option.field) ? 'active' : ''}`}
          onClick={() => toggleSortPill(option.field)}
        >
          {option.label}
          {activeSorts.has(option.field) && ' ↓'}
        </button>
      ))}
    </div>
  );
}
```

## Advanced Sorting Patterns

### Combined Sort Strategies

```typescript
import { buildCombinedSortString } from '@jungle-commerce/typesense-react';

// Legacy single sort with new multi-sort
const legacySortBy = 'price:desc';
const multiSortBy: SortField[] = [
  { field: 'rating', order: 'desc' },
  { field: 'created_at', order: 'desc' }
];

// multiSortBy takes precedence if provided
const combined1 = buildCombinedSortString(legacySortBy, multiSortBy);
// Result: "rating:desc,created_at:desc"

// Falls back to legacy if no multi-sort
const combined2 = buildCombinedSortString(legacySortBy, []);
// Result: "price:desc"
```

### Conditional Sorting

```typescript
function buildConditionalSort(searchQuery: string, userPreference?: string) {
  const sorts: SortField[] = [];
  
  // If there's a search query, prioritize text relevance
  if (searchQuery) {
    sorts.push({ field: '_text_match', order: 'desc' });
  }
  
  // Add user preference
  if (userPreference) {
    const parsed = parseSortString(userPreference);
    sorts.push(...parsed);
  }
  
  // Default fallback
  if (sorts.length === 0) {
    sorts.push({ field: 'created_at', order: 'desc' });
  }
  
  return buildMultiSortString(sorts);
}

// Examples
const searchSort = buildConditionalSort('laptop', 'price:asc');
// Result: "_text_match:desc,price:asc"

const browseSort = buildConditionalSort('', 'price:asc');
// Result: "price:asc"

const defaultSort = buildConditionalSort('', '');
// Result: "created_at:desc"
```

### Sort Presets with Overrides

```typescript
class SortPresetManager {
  private presets: Map<string, SortField[]> = new Map();
  
  constructor() {
    // Define default presets
    this.presets.set('newest', [{ field: 'created_at', order: 'desc' }]);
    this.presets.set('popular', [
      { field: 'view_count', order: 'desc' },
      { field: 'rating', order: 'desc' }
    ]);
    this.presets.set('price_value', [
      { field: 'value_score', order: 'desc' },
      { field: 'price', order: 'asc' }
    ]);
  }
  
  getPreset(name: string, overrides?: Partial<SortField>[]): string {
    const preset = this.presets.get(name) || [];
    
    // Apply overrides
    const finalSorts = preset.map(sort => {
      const override = overrides?.find(o => o.field === sort.field);
      return override ? { ...sort, ...override } : sort;
    });
    
    return buildMultiSortString(finalSorts);
  }
  
  combinePresets(...presetNames: string[]): string {
    const allSorts: SortField[] = [];
    const seenFields = new Set<string>();
    
    for (const name of presetNames) {
      const preset = this.presets.get(name) || [];
      for (const sort of preset) {
        if (!seenFields.has(sort.field)) {
          allSorts.push(sort);
          seenFields.add(sort.field);
        }
      }
    }
    
    return buildMultiSortString(allSorts);
  }
}

// Usage
const sortManager = new SortPresetManager();

// Get preset
const popularSort = sortManager.getPreset('popular');
// Result: "view_count:desc,rating:desc"

// Override direction
const popularAsc = sortManager.getPreset('popular', [
  { field: 'view_count', order: 'asc' }
]);
// Result: "view_count:asc,rating:desc"

// Combine presets
const combined = sortManager.combinePresets('newest', 'popular');
// Result: "created_at:desc,view_count:desc,rating:desc"
```

## Best Practices

### 1. Validate Sort Fields

```typescript
// Always validate against schema when available
function safeBuildSort(field: string, order: 'asc' | 'desc', schema?: CollectionSchema) {
  if (schema && !isSortableField(field, schema)) {
    console.warn(`Field "${field}" is not sortable`);
    return '';
  }
  return buildSingleSortString(field, order);
}
```

### 2. Handle Sort Priorities

```typescript
// Higher priority sorts should come first
const prioritizedSort: SortField[] = [
  { field: 'is_featured', order: 'desc' }, // Featured items first
  { field: 'relevance', order: 'desc' },   // Then by relevance
  { field: 'created_at', order: 'desc' }   // Finally by date
];
```

### 3. Provide Meaningful Defaults

```typescript
function getDefaultSort(context: 'search' | 'browse' | 'category'): string {
  switch (context) {
    case 'search':
      return '_text_match:desc'; // Relevance for search
    case 'browse':
      return 'popularity:desc';   // Popular items for browsing
    case 'category':
      return 'position:asc';      // Manual ordering for categories
    default:
      return 'created_at:desc';   // Newest as fallback
  }
}
```

### 4. Cache Sort Strings

```typescript
// Memoize sort string generation for performance
const useMemoizedSort = (sortFields: SortField[]) => {
  return useMemo(
    () => buildMultiSortString(sortFields),
    [JSON.stringify(sortFields)] // Deep comparison
  );
};
```

### 5. User Preference Persistence

```typescript
// Save user's sort preference
function SavedSortPreference() {
  const STORAGE_KEY = 'user_sort_preference';
  
  const getSavedSort = (): string => {
    return localStorage.getItem(STORAGE_KEY) || 'relevance:desc';
  };
  
  const setSavedSort = (sortString: string) => {
    localStorage.setItem(STORAGE_KEY, sortString);
  };
  
  const [currentSort, setCurrentSort] = useState(getSavedSort());
  
  const updateSort = (newSort: string) => {
    setCurrentSort(newSort);
    setSavedSort(newSort);
  };
  
  return { currentSort, updateSort };
}
```

## Complete Example: Advanced Sort UI

```typescript
function AdvancedSortUI() {
  const [primarySort, setPrimarySort] = useState<SortField | null>(null);
  const [secondarySort, setSecondarySort] = useState<SortField | null>(null);
  const [customSorts, setCustomSorts] = useState<SortField[]>([]);
  
  const allSortFields = [
    'relevance', 'price', 'rating', 'created_at', 
    'popularity', 'discount_percentage'
  ];
  
  const buildFinalSort = (): string => {
    const sorts: SortField[] = [];
    
    if (primarySort) sorts.push(primarySort);
    if (secondarySort) sorts.push(secondarySort);
    sorts.push(...customSorts);
    
    return buildMultiSortString(sorts);
  };
  
  const addCustomSort = (field: string) => {
    if (!customSorts.find(s => s.field === field)) {
      setCustomSorts([...customSorts, { field, order: 'desc' }]);
    }
  };
  
  const removeCustomSort = (index: number) => {
    setCustomSorts(customSorts.filter((_, i) => i !== index));
  };
  
  const reorderCustomSort = (fromIndex: number, toIndex: number) => {
    const newSorts = [...customSorts];
    const [moved] = newSorts.splice(fromIndex, 1);
    newSorts.splice(toIndex, 0, moved);
    setCustomSorts(newSorts);
  };
  
  return (
    <div className="advanced-sort">
      <div>
        <h3>Primary Sort:</h3>
        <select 
          value={primarySort?.field || ''} 
          onChange={(e) => setPrimarySort(
            e.target.value ? { field: e.target.value, order: 'desc' } : null
          )}
        >
          <option value="">None</option>
          {allSortFields.map(field => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
        {primarySort && (
          <button onClick={() => setPrimarySort({
            ...primarySort,
            order: primarySort.order === 'asc' ? 'desc' : 'asc'
          })}>
            {primarySort.order === 'asc' ? '↑' : '↓'}
          </button>
        )}
      </div>
      
      <div>
        <h3>Secondary Sort:</h3>
        <select 
          value={secondarySort?.field || ''} 
          onChange={(e) => setSecondarySort(
            e.target.value ? { field: e.target.value, order: 'desc' } : null
          )}
        >
          <option value="">None</option>
          {allSortFields
            .filter(f => f !== primarySort?.field)
            .map(field => (
              <option key={field} value={field}>{field}</option>
            ))
          }
        </select>
      </div>
      
      <div>
        <h3>Additional Sorts:</h3>
        {customSorts.map((sort, index) => (
          <div key={index}>
            {sort.field}: {sort.order}
            <button onClick={() => removeCustomSort(index)}>Remove</button>
            {index > 0 && (
              <button onClick={() => reorderCustomSort(index, index - 1)}>↑</button>
            )}
            {index < customSorts.length - 1 && (
              <button onClick={() => reorderCustomSort(index, index + 1)}>↓</button>
            )}
          </div>
        ))}
        
        <select onChange={(e) => {
          if (e.target.value) {
            addCustomSort(e.target.value);
            e.target.value = '';
          }
        }}>
          <option value="">Add sort field...</option>
          {allSortFields
            .filter(f => 
              f !== primarySort?.field && 
              f !== secondarySort?.field &&
              !customSorts.find(s => s.field === f)
            )
            .map(field => (
              <option key={field} value={field}>{field}</option>
            ))
          }
        </select>
      </div>
      
      <div>
        <h3>Final Sort String:</h3>
        <code>{buildFinalSort()}</code>
      </div>
    </div>
  );
}
```

This guide provides comprehensive examples of using the sort builder utilities to create flexible, user-friendly sorting functionality in your Typesense-powered applications.