# Documentation Search Example

A sophisticated documentation search interface with faceted navigation and highlighting.

## Features

- **Instant Search**: Debounced search with real-time results
- **Syntax Highlighting**: Highlights matching terms in results
- **Faceted Navigation**: Filter by section, content type, tags, and version
- **Keyboard Shortcut**: Press `Cmd/Ctrl + K` to focus search
- **Breadcrumb Navigation**: Shows document hierarchy
- **Search Statistics**: Display result count and search time
- **Responsive Design**: Works on desktop and mobile

## Setup

1. Start Typesense:
   ```bash
   docker run -p 8108:8108 -v/tmp/typesense-data:/data typesense/typesense:26.0 \
     --data-dir /data \
     --api-key=xyz \
     --enable-cors
   ```

2. Create documentation collection:
   ```bash
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "documentation",
       "fields": [
         {"name": "title", "type": "string"},
         {"name": "content", "type": "string"},
         {"name": "section", "type": "string", "facet": true},
         {"name": "subsection", "type": "string", "optional": true},
         {"name": "type", "type": "string", "facet": true},
         {"name": "tags", "type": "string[]", "facet": true},
         {"name": "version", "type": "string", "facet": true},
         {"name": "url", "type": "string"},
         {"name": "last_updated", "type": "int64"}
       ],
       "default_sorting_field": "last_updated"
     }'
   ```

3. Import sample documentation:
   ```bash
   cat > docs.jsonl << 'EOF'
   {"id": "1", "title": "Getting Started with Typesense", "content": "Typesense is a modern, open source search engine built from the ground up with cutting-edge search algorithms, that take advantage of the latest advances in hardware capabilities.", "section": "Introduction", "type": "guide", "tags": ["getting-started", "basics"], "version": "1.0", "url": "/docs/intro", "last_updated": 1704067200}
   {"id": "2", "title": "Installation Guide", "content": "Install Typesense using Docker: docker pull typesense/typesense:26.0. You can also install using binary packages for various operating systems.", "section": "Installation", "type": "guide", "tags": ["installation", "docker", "setup"], "version": "1.0", "url": "/docs/install", "last_updated": 1704153600}
   {"id": "3", "title": "Search API Reference", "content": "The search endpoint allows you to query your collections. Use query_by to specify which fields to search, and filter_by for filtering results.", "section": "API Reference", "subsection": "Search", "type": "api", "tags": ["api", "search", "reference"], "version": "1.0", "url": "/docs/api/search", "last_updated": 1704240000}
   {"id": "4", "title": "Collections", "content": "A collection in Typesense is a group of related documents. Think of it as a table in a relational database. Define a schema for your collection with fields and their types.", "section": "Core Concepts", "type": "concept", "tags": ["collections", "schema", "basics"], "version": "1.0", "url": "/docs/concepts/collections", "last_updated": 1704326400}
   {"id": "5", "title": "Faceted Search", "content": "Facets allow your users to drill down into search results by filtering on specific field values. Enable faceting on fields by setting facet: true in the schema.", "section": "Features", "type": "feature", "tags": ["facets", "filtering", "search"], "version": "1.0", "url": "/docs/features/facets", "last_updated": 1704412800}
   EOF

   curl -X POST "http://localhost:8108/collections/documentation/documents/import?action=create" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: text/plain" \
     --data-binary @docs.jsonl
   ```

4. Install and run:
   ```bash
   npm install
   npm start
   ```

5. Open http://localhost:3002

## Code Structure

- `App.tsx` - Main app with SearchProvider and keyboard shortcuts
- `components/DocumentationSearch.tsx` - Complete documentation search UI
- Demonstrates:
  - Debounced search for performance
  - HTML highlighting from Typesense
  - Mixed facet types (checkbox and radio)
  - Breadcrumb navigation
  - Search statistics

## Key Features Demonstrated

1. **Highlighting**: Shows matched terms in context
2. **Debounced Search**: Prevents excessive API calls
3. **Keyboard Shortcuts**: Cmd/Ctrl+K to focus search
4. **Mixed Facet Types**: Checkboxes for multi-select, radio for single-select
5. **Search Metadata**: Shows result count and search time
6. **Responsive Layout**: Adapts to mobile screens
7. **Structured Content**: Sections, subsections, and tags