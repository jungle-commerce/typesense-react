# Integration Patterns for typesense-react

This guide covers advanced integration patterns for typesense-react in various environments and frameworks.

## Table of Contents

1. [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
2. [Next.js Integration](#nextjs-integration)
3. [Performance Optimization](#performance-optimization)
4. [Error Handling Strategies](#error-handling-strategies)

## Server-Side Rendering (SSR)

### Basic SSR Setup

Server-side rendering with typesense-react requires careful handling of the Typesense client initialization and state hydration.

#### Server-Side Configuration

```typescript
// server/searchClient.ts
import { TypesenseSearchClient } from 'typesense-react';

export function createServerSearchClient() {
  return new TypesenseSearchClient({
    nodes: [{
      host: process.env.TYPESENSE_HOST!,
      port: parseInt(process.env.TYPESENSE_PORT!),
      protocol: process.env.TYPESENSE_PROTOCOL as 'http' | 'https'
    }],
    apiKey: process.env.TYPESENSE_API_KEY!,
    connectionTimeoutSeconds: 5
  });
}

// server/searchHelpers.ts
export async function performServerSearch(
  collection: string,
  searchParams: any
) {
  const client = createServerSearchClient();
  
  try {
    const results = await client.search(collection, searchParams);
    return {
      results,
      error: null
    };
  } catch (error) {
    console.error('Server search error:', error);
    return {
      results: null,
      error: error.message
    };
  }
}
```

#### Express.js Example

```typescript
// server/app.ts
import express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SearchProvider } from 'typesense-react';
import { performServerSearch } from './searchHelpers';
import App from '../client/App';

const app = express();

app.get('/search/:collection', async (req, res) => {
  const { collection } = req.params;
  const { q, page = 1, perPage = 20 } = req.query;
  
  // Perform server-side search
  const { results, error } = await performServerSearch(collection, {
    q: q as string,
    page: parseInt(page as string),
    per_page: parseInt(perPage as string),
    query_by: 'name,description'
  });
  
  // Initial state for hydration
  const initialState = {
    results,
    error,
    query: q as string,
    page: parseInt(page as string)
  };
  
  const html = renderToString(
    <SearchProvider
      config={{
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'client-key'
      }}
      collection={collection}
      initialState={initialState}
    >
      <App />
    </SearchProvider>
  );
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Search Results</title>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
        </script>
      </head>
      <body>
        <div id="root">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `);
});
```

#### Client-Side Hydration

```typescript
// client/index.tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { SearchProvider } from 'typesense-react';
import App from './App';

const initialState = window.__INITIAL_STATE__;

hydrateRoot(
  document.getElementById('root')!,
  <SearchProvider
    config={{
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'client-key'
    }}
    collection="products"
    initialState={initialState}
  >
    <App />
  </SearchProvider>
);
```

### Streaming SSR with React 18

```typescript
// server/streamingSSR.ts
import { renderToPipeableStream } from 'react-dom/server';
import { SearchProvider } from 'typesense-react';

export function streamSearchResults(req, res) {
  const { pipe } = renderToPipeableStream(
    <SearchProvider
      config={serverConfig}
      collection="products"
      suspense={true}
    >
      <React.Suspense fallback={<SearchSkeleton />}>
        <SearchResults />
      </React.Suspense>
    </SearchProvider>,
    {
      bootstrapScripts: ['/client.js'],
      onShellReady() {
        res.statusCode = 200;
        res.setHeader('Content-type', 'text/html');
        pipe(res);
      },
      onError(error) {
        console.error(error);
        res.statusCode = 500;
        res.send('Server Error');
      }
    }
  );
}
```

## Next.js Integration

### App Router (Next.js 13+)

#### Server Component Integration

```typescript
// app/search/page.tsx
import { TypesenseSearchClient } from 'typesense-react';
import SearchInterface from '@/components/SearchInterface';

async function getSearchResults(query: string) {
  const client = new TypesenseSearchClient({
    nodes: [{
      host: process.env.TYPESENSE_HOST!,
      port: parseInt(process.env.TYPESENSE_PORT!),
      protocol: process.env.TYPESENSE_PROTOCOL as 'http' | 'https'
    }],
    apiKey: process.env.TYPESENSE_SERVER_API_KEY!
  });
  
  const results = await client.search('products', {
    q: query,
    query_by: 'name,description',
    per_page: 20
  });
  
  return results;
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string }
}) {
  const initialResults = searchParams.q 
    ? await getSearchResults(searchParams.q)
    : null;
  
  return (
    <SearchInterface 
      initialQuery={searchParams.q}
      initialResults={initialResults}
    />
  );
}
```

#### Client Component with Search Provider

```typescript
// components/SearchInterface.tsx
'use client';

import { SearchProvider, useSearch } from 'typesense-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function SearchInterface({
  initialQuery,
  initialResults
}: {
  initialQuery?: string;
  initialResults?: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  return (
    <SearchProvider
      config={{
        nodes: [{ 
          host: process.env.NEXT_PUBLIC_TYPESENSE_HOST!,
          port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT!),
          protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as 'http' | 'https'
        }],
        apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY!
      }}
      collection="products"
      initialState={initialResults ? {
        results: initialResults,
        query: initialQuery || ''
      } : undefined}
    >
      <SearchContent />
    </SearchProvider>
  );
}

function SearchContent() {
  const { state, actions } = useSearch();
  const router = useRouter();
  
  // Sync URL with search state
  useEffect(() => {
    if (state.query) {
      router.push(`/search?q=${encodeURIComponent(state.query)}`, {
        scroll: false
      });
    }
  }, [state.query, router]);
  
  return (
    <div>
      <input
        type="search"
        value={state.query}
        onChange={(e) => actions.setQuery(e.target.value)}
        placeholder="Search products..."
      />
      {/* Search results UI */}
    </div>
  );
}
```

### Pages Router (Legacy)

#### getServerSideProps Integration

```typescript
// pages/search.tsx
import { GetServerSideProps } from 'next';
import { SearchProvider } from 'typesense-react';
import { performServerSearch } from '@/lib/searchHelpers';
import SearchInterface from '@/components/SearchInterface';

interface SearchPageProps {
  initialResults: any;
  initialQuery: string;
  error?: string;
}

export const getServerSideProps: GetServerSideProps<SearchPageProps> = async (context) => {
  const { q = '' } = context.query;
  const query = Array.isArray(q) ? q[0] : q;
  
  const { results, error } = await performServerSearch('products', {
    q: query,
    query_by: 'name,description',
    per_page: 20
  });
  
  return {
    props: {
      initialResults: results,
      initialQuery: query,
      error: error || null
    }
  };
};

export default function SearchPage({ 
  initialResults, 
  initialQuery,
  error 
}: SearchPageProps) {
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <SearchProvider
      config={{
        nodes: [{ 
          host: process.env.NEXT_PUBLIC_TYPESENSE_HOST!,
          port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT!),
          protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as 'http' | 'https'
        }],
        apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY!
      }}
      collection="products"
      initialState={{
        results: initialResults,
        query: initialQuery
      }}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

#### API Routes for Search

```typescript
// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSearchClient } from '@/lib/searchClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { collection, q, page = 1, filters } = req.query;
  
  if (!collection || !q) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  try {
    const client = createServerSearchClient();
    const results = await client.search(collection as string, {
      q: q as string,
      query_by: 'name,description',
      page: parseInt(page as string),
      filter_by: filters as string || undefined
    });
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}
```

### Next.js Middleware for Search

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add search-specific headers
  const response = NextResponse.next();
  
  // Cache search results
  if (request.nextUrl.pathname.startsWith('/api/search')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    );
  }
  
  // Add CORS headers for search API
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  return response;
}

export const config = {
  matcher: '/api/search/:path*'
};
```

## Performance Optimization

### Lazy Loading and Code Splitting

```typescript
// components/LazySearchInterface.tsx
import dynamic from 'next/dynamic';
import { Suspense, lazy } from 'react';

// Next.js dynamic import
const SearchInterface = dynamic(
  () => import('./SearchInterface'),
  {
    loading: () => <SearchSkeleton />,
    ssr: false // Disable SSR for client-only features
  }
);

// React lazy loading
const HeavySearchComponent = lazy(() => import('./HeavySearchComponent'));

export default function LazySearchInterface() {
  return (
    <div>
      <SearchInterface />
      <Suspense fallback={<div>Loading advanced search...</div>}>
        <HeavySearchComponent />
      </Suspense>
    </div>
  );
}
```

### Request Optimization

```typescript
// hooks/useOptimizedSearch.ts
import { useSearch } from 'typesense-react';
import { useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

export function useOptimizedSearch() {
  const { state, actions } = useSearch();
  
  // Memoize expensive computations
  const processedResults = useMemo(() => {
    if (!state.results?.hits) return [];
    
    return state.results.hits.map(hit => ({
      ...hit.document,
      relevanceScore: hit.text_match || 0,
      highlights: hit.highlight
    }));
  }, [state.results]);
  
  // Debounce search input
  const debouncedSetQuery = useCallback(
    debounce((query: string) => {
      actions.setQuery(query);
    }, 300),
    [actions]
  );
  
  // Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (state.page < Math.ceil(state.results?.found / state.perPage)) {
      // Prefetch logic here
      const nextPage = state.page + 1;
      // Cache the request
    }
  }, [state.page, state.results, state.perPage]);
  
  return {
    ...state,
    processedResults,
    debouncedSetQuery,
    prefetchNextPage
  };
}
```

### Caching Strategies

```typescript
// utils/searchCache.ts
interface CacheEntry {
  data: any;
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  
  private getCacheKey(collection: string, params: any): string {
    return `${collection}:${JSON.stringify(params)}`;
  }
  
  get(collection: string, params: any): any | null {
    const key = this.getCacheKey(collection, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(collection: string, params: any, data: any): void {
    const key = this.getCacheKey(collection, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const searchCache = new SearchCache();

// Enhanced search client with caching
export class CachedTypesenseClient extends TypesenseSearchClient {
  async search(collection: string, searchParams: any) {
    // Check cache first
    const cached = searchCache.get(collection, searchParams);
    if (cached) {
      return cached;
    }
    
    // Perform search
    const results = await super.search(collection, searchParams);
    
    // Cache results
    searchCache.set(collection, searchParams, results);
    
    return results;
  }
}
```

### Bundle Size Optimization

```typescript
// components/OptimizedSearchProvider.tsx
import { SearchProvider } from 'typesense-react';
import type { SearchProviderProps } from 'typesense-react';

// Only import what you need
export { useSearch, useFacetState } from 'typesense-react/hooks';

// Tree-shakeable utilities
export { filterBuilder, sortBuilder } from 'typesense-react/utils';

// Lazy load heavy features
const AdvancedFeatures = lazy(() => 
  import('typesense-react/advanced').then(module => ({
    default: module.AdvancedFeatures
  }))
);
```

### Virtual Scrolling for Large Result Sets

```typescript
// components/VirtualizedResults.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSearch } from 'typesense-react';
import { useRef } from 'react';

export function VirtualizedResults() {
  const { state } = useSearch();
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: state.results?.hits.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated item height
    overscan: 5
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const hit = state.results?.hits[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <SearchResult hit={hit} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Error Handling Strategies

### Comprehensive Error Handling

```typescript
// hooks/useErrorHandling.ts
import { useSearch } from 'typesense-react';
import { useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';

interface ErrorHandlerOptions {
  onError?: (error: Error) => void;
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export function useErrorHandling(options: ErrorHandlerOptions = {}) {
  const { error, loading, actions } = useSearch();
  const { 
    onError, 
    retry = true, 
    retryDelay = 1000,
    maxRetries = 3 
  } = options;
  
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    if (error && !loading) {
      // Categorize error
      const errorType = categorizeError(error);
      
      switch (errorType) {
        case 'network':
          if (retry && retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              actions.search();
            }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
          } else {
            toast.error('Network error. Please check your connection.');
          }
          break;
          
        case 'authentication':
          toast.error('Authentication failed. Please check your API key.');
          break;
          
        case 'validation':
          toast.warning('Invalid search parameters.');
          break;
          
        default:
          toast.error('An unexpected error occurred.');
      }
      
      // Call custom error handler
      onError?.(error);
    }
  }, [error, loading, retry, retryCount, maxRetries]);
  
  const resetError = useCallback(() => {
    setRetryCount(0);
    // Clear error state if possible
  }, []);
  
  return {
    error,
    errorType: error ? categorizeError(error) : null,
    retryCount,
    resetError
  };
}

function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  }
  if (message.includes('401') || message.includes('unauthorized')) {
    return 'authentication';
  }
  if (message.includes('400') || message.includes('invalid')) {
    return 'validation';
  }
  
  return 'unknown';
}
```

### Error Boundary Integration

```typescript
// components/SearchErrorBoundary.tsx
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function SearchErrorFallback({ 
  error, 
  resetErrorBoundary 
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Search Error</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export function SearchErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={SearchErrorFallback}
      onReset={() => {
        // Clear any error state
        window.location.reload();
      }}
      onError={(error, errorInfo) => {
        // Log to error reporting service
        console.error('Search error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Graceful Degradation

```typescript
// components/GracefulSearch.tsx
import { useSearch } from 'typesense-react';
import { useState, useEffect } from 'react';

export function GracefulSearch() {
  const { state, error, loading } = useSearch();
  const [fallbackResults, setFallbackResults] = useState(null);
  
  useEffect(() => {
    if (error) {
      // Try fallback search method
      performFallbackSearch(state.query)
        .then(setFallbackResults)
        .catch(console.error);
    }
  }, [error, state.query]);
  
  if (error && fallbackResults) {
    return (
      <div>
        <div className="warning">
          Using simplified search due to technical issues
        </div>
        <FallbackResults results={fallbackResults} />
      </div>
    );
  }
  
  return <RegularSearchResults />;
}

async function performFallbackSearch(query: string) {
  // Implement simple client-side search or use cached data
  const cachedData = localStorage.getItem('searchCache');
  if (cachedData) {
    const data = JSON.parse(cachedData);
    return data.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  return [];
}
```

### Error Monitoring and Reporting

```typescript
// utils/errorReporting.ts
import * as Sentry from '@sentry/nextjs';

export function setupErrorMonitoring() {
  // Initialize Sentry or other error monitoring service
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    beforeSend(event, hint) {
      // Filter out non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        if (error?.message?.includes('AbortError')) {
          return null; // Don't report cancelled requests
        }
      }
      return event;
    }
  });
}

// Custom error reporter for search-specific errors
export function reportSearchError(error: Error, context: any) {
  Sentry.withScope(scope => {
    scope.setTag('feature', 'search');
    scope.setContext('search', context);
    Sentry.captureException(error);
  });
}

// Hook for error reporting
export function useErrorReporting() {
  const { error, state } = useSearch();
  
  useEffect(() => {
    if (error) {
      reportSearchError(error, {
        query: state.query,
        filters: state.filters,
        page: state.page
      });
    }
  }, [error, state]);
}
```

This guide provides comprehensive patterns for integrating typesense-react in various environments with a focus on performance and reliability.