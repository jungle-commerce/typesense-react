# Minimal Typesense Search Example

This example demonstrates the bare minimum implementation of a search interface using typesense-react.

## Features

- Basic search input
- Real-time search results
- Loading and error states
- Clean, minimal UI

## Setup

1. Make sure you have Typesense running locally:
   ```bash
   docker run -p 8108:8108 -v/tmp/typesense-data:/data typesense/typesense:26.0 \
     --data-dir /data \
     --api-key=xyz \
     --enable-cors
   ```

2. Create a books collection and add sample data:
   ```bash
   curl -X POST "http://localhost:8108/collections" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "books",
       "fields": [
         {"name": "title", "type": "string"},
         {"name": "author", "type": "string"},
         {"name": "publication_year", "type": "int32"}
       ]
     }'

   # Add sample books
   curl -X POST "http://localhost:8108/collections/books/documents/import?action=create" \
     -H "X-TYPESENSE-API-KEY: xyz" \
     -H "Content-Type: text/plain" \
     -d '{"title":"The Great Gatsby","author":"F. Scott Fitzgerald","publication_year":1925,"id":"1"}
   {"title":"To Kill a Mockingbird","author":"Harper Lee","publication_year":1960,"id":"2"}
   {"title":"1984","author":"George Orwell","publication_year":1949,"id":"3"}
   {"title":"Pride and Prejudice","author":"Jane Austen","publication_year":1813,"id":"4"}
   {"title":"The Catcher in the Rye","author":"J.D. Salinger","publication_year":1951,"id":"5"}'
   ```

3. Install dependencies and run:
   ```bash
   npm install
   npm start
   ```

4. Open http://localhost:3000 and start searching!

## Code Structure

- `App.tsx` - Main component with SearchProvider and SearchBox
- `index.css` - Minimal styling
- Uses React 18 and TypeScript
- Vite for fast development

## Key Concepts

1. **SearchProvider** - Wraps your app and provides search context
2. **useSearch** - Hook that provides search state and actions
3. **Real-time search** - Updates as you type
4. **Error handling** - Displays connection errors gracefully