# Multi-Collection Search Example

Advanced example demonstrating search across multiple Typesense collections with result merging and relevance scoring.

## Features

- **Multi-Collection Search**: Search across products, categories, and brands simultaneously
- **Result Merging**: Intelligent merging based on relevance scores
- **View Modes**: 
  - Interleaved: Mixed results sorted by relevance
  - By Collection: Results grouped by collection
- **Collection Toggle**: Enable/disable specific collections
- **Relevance Scoring**: Visual relevance indicators
- **Namespace Support**: Different result types with custom styling
- **Highlighting**: Search term highlighting across all collections
- **Performance**: Parallel searches with merged results

## Setup

1. Start Typesense:
   ```bash
   docker run -p 8108:8108 -v/tmp/typesense-data:/data typesense/typesense:26.0 \
     --data-dir /data \
     --api-key=xyz \
     --enable-cors
   ```

2. Create multiple collections:
   ```bash
   # Products collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "products",
       "fields": [
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "brand", "type": "string"},
         {"name": "price", "type": "float"},
         {"name": "rating", "type": "float"},
         {"name": "category", "type": "string"}
       ],
       "default_sorting_field": "rating"
     }'

   # Categories collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "categories",
       "fields": [
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "product_count", "type": "int32"},
         {"name": "parent_category", "type": "string", "optional": true}
       ]
     }'

   # Brands collection
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "brands",
       "fields": [
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "logo", "type": "string", "optional": true},
         {"name": "product_count", "type": "int32"},
         {"name": "popularity", "type": "int32"}
       ],
       "default_sorting_field": "popularity"
     }'
   ```

3. Import sample data:
   ```bash
   # Products
   cat > products.jsonl << 'EOF'
   {"id": "1", "name": "Wireless Headphones Pro", "description": "Premium noise-cancelling wireless headphones with superior sound quality", "brand": "AudioTech", "price": 299.99, "rating": 4.8, "category": "Electronics"}
   {"id": "2", "name": "Smart Watch Ultra", "description": "Advanced fitness tracking and health monitoring smartwatch", "brand": "TechGear", "price": 399.99, "rating": 4.6, "category": "Electronics"}
   {"id": "3", "name": "Organic Cotton T-Shirt", "description": "Sustainable and comfortable everyday wear", "brand": "EcoWear", "price": 29.99, "rating": 4.5, "category": "Clothing"}
   EOF

   curl -X POST "http://localhost:8108/collections/products/documents/import?action=create" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: text/plain" \
     --data-binary @products.jsonl

   # Categories
   cat > categories.jsonl << 'EOF'
   {"id": "1", "name": "Electronics", "description": "Latest gadgets and electronic devices", "product_count": 1250}
   {"id": "2", "name": "Clothing", "description": "Fashion and apparel for all occasions", "product_count": 3200}
   {"id": "3", "name": "Wireless Audio", "description": "Bluetooth speakers, headphones, and earbuds", "product_count": 450, "parent_category": "Electronics"}
   EOF

   curl -X POST "http://localhost:8108/collections/categories/documents/import?action=create" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: text/plain" \
     --data-binary @categories.jsonl

   # Brands
   cat > brands.jsonl << 'EOF'
   {"id": "1", "name": "AudioTech", "description": "Leading manufacturer of premium audio equipment", "product_count": 85, "popularity": 95}
   {"id": "2", "name": "TechGear", "description": "Innovative wearable technology and smart devices", "product_count": 120, "popularity": 88}
   {"id": "3", "name": "EcoWear", "description": "Sustainable fashion brand focused on organic materials", "product_count": 200, "popularity": 76}
   EOF

   curl -X POST "http://localhost:8108/collections/brands/documents/import?action=create" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: text/plain" \
     --data-binary @brands.jsonl
   ```

4. Install and run:
   ```bash
   npm install
   npm start
   ```

5. Open http://localhost:3003

## Code Structure

- `App.tsx` - MultiCollectionProvider setup
- `components/MultiCollectionSearch.tsx` - Complete multi-collection search UI
- Demonstrates:
  - `useMultiCollectionSearchWithProvider` hook
  - Collection configuration with weights
  - Result merging strategies
  - Namespace-based styling
  - Toggle collections dynamically

## Key Features Demonstrated

1. **Weighted Search**: Different relevance weights for each collection
2. **Merge Strategies**: Relevance-based result interleaving
3. **Score Normalization**: Comparable scores across collections
4. **View Modes**: Switch between merged and grouped views
5. **Dynamic Collections**: Enable/disable collections on the fly
6. **Visual Differentiation**: Color-coded results by collection
7. **Performance**: Parallel searches with efficient merging

## Configuration Options

- `weight`: Relevance multiplier for each collection
- `maxResults`: Limit results per collection
- `mergeStrategy`: How to combine results (relevance, roundRobin, collectionOrder)
- `normalizeScores`: Make scores comparable across collections
- `resultMode`: Return format (interleaved, perCollection, both)