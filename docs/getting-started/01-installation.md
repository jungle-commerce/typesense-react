# Installation and Setup

Welcome to @jungle-commerce/typesense-react! This guide will walk you through installing and setting up the library for your React application.

## Prerequisites

Before you begin, make sure you have:

- Node.js 16+ installed
- A React application (version 19.1.0 or later)
- Access to a Typesense server (local or cloud)

## Installation

Install the package and its peer dependency using your preferred package manager:

### Using npm
```bash
npm install @jungle-commerce/typesense-react typesense
```

### Using yarn
```bash
yarn add @jungle-commerce/typesense-react typesense
```

### Using pnpm
```bash
pnpm add @jungle-commerce/typesense-react typesense
```

## Typesense Server Setup

### Option 1: Local Development with Docker

For local development, the easiest way to run Typesense is with Docker:

```bash
docker run -p 8108:8108 -v /tmp/typesense-data:/data \
  typesense/typesense:0.25.2 \
  --data-dir /data \
  --api-key=xyz
```

### Option 2: Typesense Cloud

Sign up for [Typesense Cloud](https://cloud.typesense.org) to get a managed instance.

### Option 3: Self-Hosted

Follow the [Typesense installation guide](https://typesense.org/docs/guide/install-typesense.html) for self-hosting options.

## Basic Configuration

Create a configuration object for your Typesense connection:

```typescript
// config/typesense.ts
import type { TypesenseConfig } from '@jungle-commerce/typesense-react';

export const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: 'localhost',        // Your Typesense host
    port: 8108,              // Your Typesense port
    protocol: 'http'         // 'http' or 'https'
  }],
  apiKey: 'xyz',             // Your API key
  connectionTimeoutSeconds: 2,
  cacheSearchResultsForSeconds: 60  // Optional: cache results
};
```

### Environment Variables

For production, use environment variables:

```typescript
// config/typesense.ts
export const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: process.env.REACT_APP_TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.REACT_APP_TYPESENSE_PORT || '8108'),
    protocol: process.env.REACT_APP_TYPESENSE_PROTOCOL || 'http'
  }],
  apiKey: process.env.REACT_APP_TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 2
};
```

Create a `.env` file in your project root:

```bash
REACT_APP_TYPESENSE_HOST=localhost
REACT_APP_TYPESENSE_PORT=8108
REACT_APP_TYPESENSE_PROTOCOL=http
REACT_APP_TYPESENSE_API_KEY=xyz
```

## Creating a Test Collection

Before using the library, you need at least one collection in Typesense. Here's how to create a simple products collection:

```typescript
// scripts/createCollection.ts
import { Client } from 'typesense';

const client = new Client({
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz',
  connectionTimeoutSeconds: 2
});

async function createProductsCollection() {
  const schema = {
    name: 'products',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string', facet: false },
      { name: 'description', type: 'string', facet: false },
      { name: 'price', type: 'float', facet: true },
      { name: 'category', type: 'string', facet: true },
      { name: 'brand', type: 'string', facet: true },
      { name: 'in_stock', type: 'bool', facet: true }
    ],
    default_sorting_field: 'price'
  };

  try {
    // Delete if exists
    await client.collections('products').delete().catch(() => {});
    
    // Create collection
    await client.collections().create(schema);
    console.log('Collection created successfully!');
    
    // Add sample data
    const sampleProducts = [
      {
        id: '1',
        name: 'Laptop Pro',
        description: 'High-performance laptop for professionals',
        price: 1299.99,
        category: 'Electronics',
        brand: 'TechCorp',
        in_stock: true
      },
      {
        id: '2',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        price: 39.99,
        category: 'Accessories',
        brand: 'PeripheralPlus',
        in_stock: true
      },
      {
        id: '3',
        name: 'USB-C Hub',
        description: 'Multi-port USB-C hub with HDMI output',
        price: 59.99,
        category: 'Accessories',
        brand: 'ConnectPro',
        in_stock: false
      }
    ];
    
    await client.collections('products').documents().import(sampleProducts);
    console.log('Sample data added!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createProductsCollection();
```

Run this script to create your collection:

```bash
npx ts-node scripts/createCollection.ts
```

## TypeScript Setup

The library is written in TypeScript and provides full type safety. No additional setup is required, but here are some useful types:

```typescript
import type { 
  TypesenseConfig,
  SearchState,
  SearchActions,
  FacetConfig,
  SearchHit
} from '@jungle-commerce/typesense-react';

// Define your document type
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  in_stock: boolean;
}

// Use with hooks
const { state, actions } = useSearch<Product>();
```

## Verify Your Setup

Create a simple component to test your connection:

```typescript
// TestConnection.tsx
import React, { useEffect, useState } from 'react';
import { TypesenseSearchClient } from '@jungle-commerce/typesense-react';
import { typesenseConfig } from './config/typesense';

export function TestConnection() {
  const [status, setStatus] = useState<string>('Checking...');
  
  useEffect(() => {
    async function checkConnection() {
      try {
        const client = new TypesenseSearchClient(typesenseConfig);
        const collections = await client.client.collections().retrieve();
        setStatus(`Connected! Found ${collections.length} collections`);
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      }
    }
    
    checkConnection();
  }, []);
  
  return <div>Typesense Status: {status}</div>;
}
```

## Next Steps

Congratulations! You've successfully installed and configured typesense-react. In the next guide, we'll create your first search interface.

### Common Issues

1. **Connection refused**: Make sure Typesense is running on the specified host and port
2. **Invalid API key**: Check that your API key matches the one configured in Typesense
3. **CORS errors**: For local development, you may need to configure CORS in your Typesense server

### Resources

- [Typesense Documentation](https://typesense.org/docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

[Next: Hello World →](./02-hello-world.md)