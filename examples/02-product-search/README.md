# E-commerce Product Search Example

A full-featured product search interface demonstrating advanced Typesense React capabilities.

## Features

- **Faceted Search**: Filter by brand, category, price range, rating, and availability
- **Price Range Filtering**: Numeric range inputs for price filtering
- **Sorting Options**: Sort by relevance, price, rating, or newest
- **Pagination**: Navigate through large result sets
- **Responsive Grid Layout**: Product cards with images and details
- **Active Filter Display**: See and clear active filters
- **Real-time Updates**: Results update as you type and filter

## Setup

1. Start Typesense:
   ```bash
   docker run -p 8108:8108 -v/tmp/typesense-data:/data typesense/typesense:26.0 \
     --data-dir /data \
     --api-key=xyz \
     --enable-cors
   ```

2. Create products collection:
   ```bash
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "products",
       "fields": [
         {"name": "name", "type": "string"},
         {"name": "description", "type": "string"},
         {"name": "brand", "type": "string", "facet": true},
         {"name": "category", "type": "string", "facet": true},
         {"name": "price", "type": "float", "facet": true},
         {"name": "rating", "type": "float", "facet": true},
         {"name": "review_count", "type": "int32"},
         {"name": "in_stock", "type": "bool", "facet": true},
         {"name": "image", "type": "string", "optional": true},
         {"name": "created_at", "type": "int64"}
       ],
       "default_sorting_field": "created_at"
     }'
   ```

3. Import sample data:
   ```bash
   # Create a file named products.jsonl with sample data
   cat > products.jsonl << 'EOF'
   {"id": "1", "name": "Wireless Bluetooth Headphones", "description": "Premium noise-cancelling wireless headphones", "brand": "AudioTech", "category": "Electronics", "price": 199.99, "rating": 4.5, "review_count": 234, "in_stock": true, "created_at": 1704067200}
   {"id": "2", "name": "Stainless Steel Water Bottle", "description": "Insulated 32oz water bottle", "brand": "HydroFlow", "category": "Sports & Outdoors", "price": 29.99, "rating": 4.8, "review_count": 567, "in_stock": true, "created_at": 1704153600}
   {"id": "3", "name": "Organic Cotton T-Shirt", "description": "Comfortable everyday t-shirt", "brand": "EcoWear", "category": "Clothing", "price": 24.99, "rating": 4.2, "review_count": 89, "in_stock": true, "created_at": 1704240000}
   {"id": "4", "name": "4K Webcam", "description": "Professional streaming webcam", "brand": "StreamPro", "category": "Electronics", "price": 149.99, "rating": 4.6, "review_count": 456, "in_stock": false, "created_at": 1704326400}
   {"id": "5", "name": "Yoga Mat", "description": "Non-slip exercise mat", "brand": "FitGear", "category": "Sports & Outdoors", "price": 39.99, "rating": 4.4, "review_count": 123, "in_stock": true, "created_at": 1704412800}
   EOF

   # Import the data
   curl -X POST "http://localhost:8108/collections/products/documents/import?action=create" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: text/plain" \
     --data-binary @products.jsonl
   ```

4. Install and run:
   ```bash
   npm install
   npm start
   ```

5. Open http://localhost:3001

## Code Structure

- `App.tsx` - Main app with SearchProvider configuration
- `components/ProductSearch.tsx` - Complete search interface
- Uses advanced hooks:
  - `useSearch` - Core search functionality
  - `useAdvancedFacets` - Facet management
  - `useNumericFacetRange` - Price range filtering

## Key Features Demonstrated

1. **Faceted Navigation**: Multiple filter types (checkbox, range, boolean)
2. **Disjunctive Facets**: OR logic for brand/category filters
3. **Price Range**: Min/max numeric filtering
4. **Dynamic Sorting**: Multiple sort options
5. **Pagination**: Navigate large result sets
6. **Filter Management**: Clear individual or all filters
7. **Responsive Design**: Works on mobile and desktop