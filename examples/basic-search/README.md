# Basic Search Example

This example demonstrates the core functionality of the `@jungle-commerce/typesense-react` package with a simple product search interface.

## Features Demonstrated

- ✅ Basic text search with debouncing
- ✅ Faceted filtering (checkbox facets)
- ✅ Sorting options
- ✅ Pagination
- ✅ Facet accumulation toggle
- ✅ Loading and error states
- ✅ Zero-result handling

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Typesense**:
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Update with your Typesense credentials:
   ```
   VITE_TYPESENSE_HOST=localhost
   VITE_TYPESENSE_PORT=8108
   VITE_TYPESENSE_API_KEY=your-api-key
   VITE_TYPESENSE_COLLECTION=products
   ```

3. **Create the collection** (if needed):
   
   ```bash
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "products",
       "fields": [
         {"name": "id", "type": "string"},
         {"name": "name", "type": "string", "facet": false},
         {"name": "description", "type": "string", "facet": false},
         {"name": "category", "type": "string", "facet": true},
         {"name": "brand", "type": "string", "facet": true},
         {"name": "price", "type": "float", "facet": true},
         {"name": "rating", "type": "float", "facet": true},
         {"name": "in_stock", "type": "bool", "facet": true}
       ],
       "default_sorting_field": "rating"
     }'
   ```

4. **Run the example**:
   ```bash
   npm run dev
   ```

## Code Structure

```
src/
├── index.tsx    # React entry point
├── App.tsx      # Main application with search interface
├── config.ts    # Typesense configuration
└── styles.css   # Basic styling
```

## Key Concepts

### Search Provider

The app is wrapped with `SearchProvider` which provides search context:

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  facets={facetConfig}
  searchOnMount={true}
>
```

### Using Hooks

The example uses three main hooks:

1. **`useSearch`** - Core search functionality
2. **`useAdvancedFacets`** - Facet filter management
3. **`useAccumulatedFacets`** - Facet value accumulation

### Facet Configuration

Facets are configured with type and behavior:

```tsx
{
  field: 'category',
  label: 'Category',
  type: 'checkbox',
  disjunctive: true  // OR logic
}
```

## Customization

- Modify `facetConfig` in `config.ts` to add/remove facets
- Update the `renderResult` function to change result display
- Adjust styles in `styles.css` for different appearance

## Sample Data

You can import sample product data:

```json
{
  "id": "1",
  "name": "Laptop Computer",
  "description": "High-performance laptop for work and gaming",
  "category": "Electronics",
  "brand": "TechBrand",
  "price": 999.99,
  "rating": 4.5,
  "in_stock": true
}
```

## Next Steps

- Try the [Advanced Filtering](../advanced-filtering) example for more filter types
- See [Multi-Collection](../multi-collection) for searching multiple collections
- Check [E-commerce](../ecommerce) for a complete shopping experience