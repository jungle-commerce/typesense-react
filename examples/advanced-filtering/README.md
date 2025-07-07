# Advanced Filtering Example

This example demonstrates all the advanced filtering capabilities of the `@jungle-commerce/typesense-react` package, including multiple filter types, facet modes, and configuration options.

## Features Demonstrated

### Filter Types
- ✅ **Checkbox Facets** - Multi-select with OR logic
- ✅ **Numeric Range Facets** - Both individual selection and range sliders
- ✅ **Date Range Facets** - Date pickers for temporal filtering
- ✅ **Single-Select Facets** - Dropdown menus for exclusive selection

### Advanced Features
- ✅ **Facet Accumulation** - Maintain filter options across searches
- ✅ **Dynamic UI Modes** - Automatic switching based on option count
- ✅ **Range/Checkbox Toggle** - Switch between UI modes for numeric facets
- ✅ **Facet Limits** - Convert to single-select when options exceed threshold
- ✅ **Zero-Count Handling** - Hide or show options with no results
- ✅ **Sort Options** - Multiple sorting strategies

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Typesense**:
   ```bash
   cp .env.example .env
   ```

3. **Create the articles collection**:
   ```bash
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "articles",
       "fields": [
         {"name": "id", "type": "string"},
         {"name": "title", "type": "string"},
         {"name": "content", "type": "string"},
         {"name": "excerpt", "type": "string"},
         {"name": "category", "type": "string", "facet": true},
         {"name": "tags", "type": "string[]", "facet": true},
         {"name": "author", "type": "string", "facet": true},
         {"name": "status", "type": "string", "facet": true},
         {"name": "language", "type": "string", "facet": true},
         {"name": "content_type", "type": "string", "facet": true},
         {"name": "word_count", "type": "int32", "facet": true},
         {"name": "read_time_minutes", "type": "int32", "facet": true},
         {"name": "likes_count", "type": "int32", "facet": true},
         {"name": "published_date", "type": "int64", "facet": true},
         {"name": "updated_date", "type": "int64", "facet": true},
         {"name": "featured", "type": "bool", "facet": true},
         {"name": "premium", "type": "bool", "facet": true}
       ],
       "default_sorting_field": "published_date"
     }'
   ```

4. **Run the example**:
   ```bash
   npm run dev
   ```

## Configuration Options

### Facet Configuration

Each facet can be configured with:

```typescript
{
  field: 'category',
  label: 'Category',
  type: 'checkbox',         // checkbox, numeric, date, select
  disjunctive: true,        // Use OR logic
  sortBy: 'count',          // Sort by count or value
  maxValues: 20,            // Max values to display
  searchable: true,         // Show search box
  numericDisplay: 'both',   // For numeric: checkbox, range, or both
  rangeStep: 100            // Step size for range sliders
}
```

### Global Settings

Control facet behavior globally:

- **Accumulate Facets** - Keep all encountered options
- **Move Selected to Top** - Show active filters first
- **Reorder by Count** - Sort by result count
- **Facet Option Limit** - Threshold for single-select conversion
- **Hide Zero Counts** - For single-select facets
- **Allow Numeric Range** - Enable range UI for high-cardinality numeric facets

## Code Highlights

### Numeric Range Facet Component

Shows how to implement range selection with mode toggling:

```tsx
function NumericRangeFacet({ field, label }) {
  const rangeData = useNumericFacetRange(field);
  
  // Toggle between individual checkboxes and range slider
  rangeData.setMode(rangeData.mode === 'range' ? 'individual' : 'range');
  
  // Apply range filter
  facets.actions.setNumericFilter(field, min, max);
}
```

### Dynamic Facet Modes

Automatically switch UI based on option count:

```tsx
const mode = useFacetMode(field, facetValues);

if (mode.isSingleSelect) {
  return <SelectDropdown />; // High cardinality
} else {
  return <CheckboxList />;   // Low cardinality
}
```

### Date Range Filtering

Simple date range implementation:

```tsx
facets.actions.setDateFilter(
  'published_date',
  '2024-01-01',  // Start date
  '2024-12-31'   // End date
);
```

## Sample Data

Example article document:

```json
{
  "id": "article-1",
  "title": "Getting Started with TypeScript",
  "excerpt": "Learn the basics of TypeScript...",
  "category": "Programming",
  "tags": ["typescript", "javascript", "tutorial"],
  "author": "Jane Doe",
  "status": "published",
  "language": "en",
  "content_type": "tutorial",
  "word_count": 2500,
  "read_time_minutes": 10,
  "likes_count": 145,
  "published_date": 1704067200,
  "featured": true,
  "premium": false
}
```

## Customization

1. **Add New Filter Types**: Update `facetConfig` in `config.ts`
2. **Change UI Behavior**: Modify mode detection in components
3. **Custom Rendering**: Override facet value display
4. **Filter Logic**: Implement custom filter builders

## Next Steps

- Explore [Multi-Collection Search](../multi-collection) for cross-collection filtering
- See [E-commerce Example](../ecommerce) for production-ready implementation
- Check [Real-time Search](../realtime-search) for instant search features