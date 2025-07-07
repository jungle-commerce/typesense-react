# Multi-Collection Search Example

This example demonstrates the powerful multi-collection search capabilities of the `@jungle-commerce/typesense-react` package, allowing you to search across multiple Typesense collections simultaneously with intelligent result merging.

## Features Demonstrated

- ✅ **Parallel Search Execution** - Search multiple collections at once
- ✅ **Result Merging Strategies** - Relevance, round-robin, or collection order
- ✅ **Score Normalization** - Fair comparison across collections
- ✅ **Weight-Based Ranking** - Prioritize certain collections
- ✅ **Per-Collection Configuration** - Custom queryBy, sortBy, maxResults
- ✅ **Field Selection** - Choose which fields to return per collection
- ✅ **Result Modes** - Interleaved, per-collection, or both
- ✅ **Highlighting Support** - With preserved formatting
- ✅ **Error Handling** - Per-collection error reporting

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Typesense**:
   ```bash
   cp .env.example .env
   # Update with your Typesense credentials
   ```

3. **Create the collections**:

   ```bash
   # Products collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: your-api-key" \
     -d '{
       "name": "products",
       "fields": [
         {"name": "id", "type": "string"},
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "brand", "type": "string", "facet": true},
         {"name": "category", "type": "string", "facet": true},
         {"name": "price", "type": "float", "facet": true},
         {"name": "rating", "type": "float"},
         {"name": "image_url", "type": "string"}
       ]
     }'

   # Categories collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: your-api-key" \
     -d '{
       "name": "categories",
       "fields": [
         {"name": "id", "type": "string"},
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "parent_category", "type": "string"},
         {"name": "product_count", "type": "int32"}
       ]
     }'

   # Brands collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: your-api-key" \
     -d '{
       "name": "brands",
       "fields": [
         {"name": "id", "type": "string"},
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "logo_url", "type": "string"},
         {"name": "website", "type": "string"},
         {"name": "popularity", "type": "int32"}
       ],
       "default_sorting_field": "popularity"
     }'

   # Articles collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: your-api-key" \
     -d '{
       "name": "articles",
       "fields": [
         {"name": "id", "type": "string"},
         {"name": "title", "type": "string"},
         {"name": "content", "type": "string"},
         {"name": "excerpt", "type": "string"},
         {"name": "author", "type": "string"},
         {"name": "category", "type": "string"},
         {"name": "published_date", "type": "int64"}
       ],
       "default_sorting_field": "published_date"
     }'
   ```

4. **Run the example**:
   ```bash
   npm run dev
   ```

## Configuration

### Collection Search Config

Each collection can be configured independently:

```typescript
{
  collection: 'products',
  namespace: 'product',        // Tag for results
  queryBy: 'name,description', // Fields to search
  sortBy: '_text_match:desc',  // Sort order
  maxResults: 20,              // Max from this collection
  weight: 1.5,                 // Importance multiplier
  includeFields: 'id,name,price' // Fields to return
}
```

### Result Modes

1. **Interleaved** - Merge all results by relevance
2. **Per Collection** - Group results by collection
3. **Both** - Show both views simultaneously

### Merge Strategies

1. **Relevance** - Sort by weighted scores
2. **Round Robin** - Alternate between collections
3. **Collection Order** - Maintain collection sequence

## Usage Examples

### Basic Multi-Collection Search

```typescript
const { search } = useMultiCollectionContext();

search({
  query: 'laptop',
  collections: [
    { collection: 'products', queryBy: 'name,description' },
    { collection: 'categories', queryBy: 'name' },
    { collection: 'brands', queryBy: 'name' }
  ],
  globalMaxResults: 50,
  mergeStrategy: 'relevance'
});
```

### Weighted Search

Give more importance to certain collections:

```typescript
collections: [
  { collection: 'products', weight: 2.0 },    // 2x importance
  { collection: 'categories', weight: 1.0 },  // Normal
  { collection: 'brands', weight: 0.5 }       // Half importance
]
```

### Field Selection

Optimize response size by selecting specific fields:

```typescript
{
  collection: 'products',
  includeFields: 'id,name,price,image_url',  // Only these fields
  // OR
  excludeFields: 'description,metadata'       // All except these
}
```

### Highlighting Configuration

Enable search term highlighting:

```typescript
search({
  query: 'laptop',
  enableHighlighting: true,
  highlightConfig: {
    startTag: '<mark>',
    endTag: '</mark>',
    cssClass: 'highlight',
    affixNumTokens: 4
  }
});
```

## Result Structure

Each hit includes collection metadata:

```typescript
{
  document: { /* original document */ },
  _collection: 'products',      // Source collection
  _namespace: 'product',        // Custom namespace
  _collectionRank: 1,          // Rank within collection
  _originalScore: 0.85,        // Raw Typesense score
  _normalizedScore: 0.95,      // Normalized (0-1)
  _mergedScore: 1.425,         // With weight applied
  _collectionWeight: 1.5       // Weight used
}
```

## Performance Considerations

- Collections are searched in parallel
- Use `maxResults` per collection to limit data
- Enable field selection to reduce payload size
- Consider caching for repeated searches
- Monitor `searchTimeMs` for optimization

## Error Handling

Errors are isolated per collection:

```typescript
if (results.errorsByCollection) {
  Object.entries(results.errorsByCollection).forEach(([collection, error]) => {
    console.error(`${collection} failed: ${error}`);
  });
}
```

## Sample Data

### Product
```json
{
  "id": "prod-1",
  "name": "Gaming Laptop",
  "description": "High-performance laptop for gaming",
  "brand": "TechBrand",
  "category": "Electronics",
  "price": 1299.99,
  "rating": 4.5
}
```

### Category
```json
{
  "id": "cat-1",
  "name": "Electronics",
  "description": "Electronic devices and accessories",
  "parent_category": null,
  "product_count": 1250
}
```

### Brand
```json
{
  "id": "brand-1",
  "name": "TechBrand",
  "description": "Leading technology manufacturer",
  "website": "https://techbrand.com",
  "popularity": 95
}
```

## Next Steps

- Try different merge strategies for various use cases
- Implement faceted filtering across collections
- Add real-time updates with WebSocket integration
- Explore vector search capabilities across collections