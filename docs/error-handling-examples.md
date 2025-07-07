# Error Handling Examples

This document provides comprehensive examples of error handling patterns in typesense-react.

## Table of Contents

1. [Basic Error Handling](#basic-error-handling)
2. [Network Errors](#network-errors)
3. [Query Errors](#query-errors)
4. [Schema Errors](#schema-errors)
5. [Rate Limiting](#rate-limiting)
6. [Timeout Handling](#timeout-handling)
7. [Retry Strategies](#retry-strategies)
8. [Error Recovery](#error-recovery)
9. [Custom Error Boundaries](#custom-error-boundaries)
10. [Logging and Monitoring](#logging-and-monitoring)

## Basic Error Handling

### Using the Error State

```tsx
function SearchWithError() {
  const { state, error, loading } = useSearch();

  if (error) {
    return (
      <div className="error-container">
        <h3>Search Error</h3>
        <p>{error.message}</p>
        <details>
          <summary>Error Details</summary>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </details>
      </div>
    );
  }

  if (loading) return <div>Searching...</div>;

  return <SearchResults results={state.results} />;
}
```

### Error Callbacks

```tsx
<SearchProvider
  config={typesenseConfig}
  collection="products"
  onError={(error) => {
    console.error('Search failed:', error);
    // Send to error tracking service
    Sentry.captureException(error);
  }}
  onSearchError={(error, searchParams) => {
    console.error('Search error with params:', searchParams);
  }}
>
  <App />
</SearchProvider>
```

## Network Errors

### Connection Error Handling

```tsx
function NetworkErrorHandler() {
  const { error, actions } = useSearch();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="offline-notice">
        <p>You're offline. Search results may be limited.</p>
      </div>
    );
  }

  if (error?.code === 'ECONNREFUSED') {
    return (
      <div className="connection-error">
        <p>Cannot connect to search service</p>
        <button onClick={() => actions.retrySearch()}>
          Try Again
        </button>
      </div>
    );
  }

  return null;
}
```

### Timeout Configuration

```tsx
const typesenseConfig = {
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz123',
  connectionTimeoutSeconds: 5,
  retryIntervalSeconds: 0.1,
  numRetries: 3
};

// Handle timeout errors
function TimeoutHandler() {
  const { error } = useSearch();

  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
    return (
      <div className="timeout-error">
        <p>Search is taking longer than expected...</p>
        <p>Please try again in a moment.</p>
      </div>
    );
  }

  return null;
}
```

## Query Errors

### Invalid Query Syntax

```tsx
function QueryErrorHandler() {
  const { error, state } = useSearch();

  if (error?.httpStatus === 400) {
    const syntaxError = error.message.includes('syntax');
    
    if (syntaxError) {
      return (
        <div className="query-error">
          <p>Invalid search syntax in: "{state.query}"</p>
          <p>Tip: Check for unmatched quotes or special characters</p>
          <ul>
            <li>Use quotes for exact phrases: "exact phrase"</li>
            <li>Use - for exclusion: laptop -mac</li>
            <li>Escape special characters: \( \) \[ \]</li>
          </ul>
        </div>
      );
    }
  }

  return null;
}
```

### Query Validation

```tsx
function ValidatedSearch() {
  const { actions } = useSearch();
  const [queryError, setQueryError] = useState('');

  const validateAndSearch = (query: string) => {
    // Reset error
    setQueryError('');

    // Validate query
    if (query.length > 100) {
      setQueryError('Query too long (max 100 characters)');
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>]/g;
    if (invalidChars.test(query)) {
      setQueryError('Query contains invalid characters');
      return;
    }

    // Check for balanced quotes
    const quoteCount = (query.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      setQueryError('Unmatched quotes in query');
      return;
    }

    // Valid query, perform search
    actions.setQuery(query);
  };

  return (
    <div>
      <input
        onChange={(e) => validateAndSearch(e.target.value)}
        className={queryError ? 'error' : ''}
      />
      {queryError && <p className="error-message">{queryError}</p>}
    </div>
  );
}
```

## Schema Errors

### Field Mismatch Handling

```tsx
function SchemaErrorHandler() {
  const { error } = useSearch();

  if (error?.message.includes('field') && error?.message.includes('not found')) {
    const fieldMatch = error.message.match(/field `(\w+)` not found/);
    const missingField = fieldMatch?.[1];

    return (
      <div className="schema-error">
        <h3>Configuration Error</h3>
        <p>The field "{missingField}" doesn't exist in this collection.</p>
        <p>Please check your search configuration.</p>
      </div>
    );
  }

  return null;
}
```

### Dynamic Schema Validation

```tsx
import { useSchemaDiscovery } from '@jungle-commerce/typesense-react';

function SchemaAwareSearch() {
  const { schema, loading: schemaLoading, error: schemaError } = useSchemaDiscovery({
    collection: 'products',
    enabled: true
  });
  
  const { actions } = useSearch();

  const safeSetFacetFilter = (field: string, value: any) => {
    // Check if field exists and is facetable
    const fieldSchema = schema?.fields.find(f => f.name === field);
    
    if (!fieldSchema) {
      console.error(`Field ${field} not found in schema`);
      return;
    }

    if (!fieldSchema.facet) {
      console.error(`Field ${field} is not facetable`);
      return;
    }

    // Safe to set filter
    actions.setFacetFilter(field, value);
  };

  if (schemaError) {
    return <div>Failed to load schema: {schemaError.message}</div>;
  }

  return <YourSearchInterface />;
}
```

## Rate Limiting

### Rate Limit Detection

```tsx
function RateLimitHandler() {
  const { error } = useSearch();
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  useEffect(() => {
    if (error?.httpStatus === 429) {
      // Extract rate limit info from headers if available
      const retryAfter = error.headers?.['retry-after'];
      const limitRemaining = error.headers?.['x-ratelimit-remaining'];
      
      setRateLimitInfo({
        retryAfter: retryAfter ? parseInt(retryAfter) : 60,
        remaining: limitRemaining ? parseInt(limitRemaining) : 0
      });
    }
  }, [error]);

  if (rateLimitInfo) {
    return (
      <div className="rate-limit-error">
        <h3>Search Limit Reached</h3>
        <p>Too many search requests. Please wait {rateLimitInfo.retryAfter} seconds.</p>
        <CountdownTimer seconds={rateLimitInfo.retryAfter} />
      </div>
    );
  }

  return null;
}
```

### Request Throttling

```tsx
import { useThrottle } from '@jungle-commerce/typesense-react/utils';

function ThrottledSearch() {
  const { actions } = useSearch();
  const throttledSearch = useThrottle(actions.setQuery, 1000); // Max 1 request per second

  return (
    <input
      onChange={(e) => throttledSearch(e.target.value)}
      placeholder="Throttled search..."
    />
  );
}
```

## Timeout Handling

### Custom Timeout with Abort

```tsx
function SearchWithAbort() {
  const { state, actions } = useSearch();
  const [timeoutId, setTimeoutId] = useState(null);
  const abortControllerRef = useRef(null);

  const searchWithTimeout = (query: string, timeout = 5000) => {
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Set timeout
    const id = setTimeout(() => {
      abortControllerRef.current?.abort();
      console.error('Search timeout after', timeout, 'ms');
    }, timeout);
    
    setTimeoutId(id);

    // Perform search with abort signal
    actions.setQuery(query, {
      signal: abortControllerRef.current.signal
    });
  };

  return (
    <input
      onChange={(e) => searchWithTimeout(e.target.value)}
      placeholder="Search with timeout..."
    />
  );
}
```

## Retry Strategies

### Exponential Backoff

```tsx
function SearchWithRetry() {
  const { error, actions } = useSearch();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  useEffect(() => {
    if (error && retryCount < maxRetries && !isRetrying) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      
      setIsRetrying(true);
      console.log(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsRetrying(false);
        actions.retrySearch();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [error, retryCount, isRetrying]);

  if (error && retryCount >= maxRetries) {
    return (
      <div className="error-final">
        <p>Search failed after {maxRetries} attempts</p>
        <button onClick={() => {
          setRetryCount(0);
          actions.retrySearch();
        }}>
          Try Again
        </button>
      </div>
    );
  }

  if (isRetrying) {
    return <div>Retrying... (Attempt {retryCount + 1}/{maxRetries})</div>;
  }

  return null;
}
```

### Smart Retry Logic

```tsx
function SmartRetry() {
  const { error, actions } = useSearch();

  const shouldRetry = (error: any): boolean => {
    // Retry on network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on 5xx server errors
    if (error.httpStatus >= 500 && error.httpStatus < 600) {
      return true;
    }

    // Don't retry on client errors (4xx)
    if (error.httpStatus >= 400 && error.httpStatus < 500) {
      return false;
    }

    return false;
  };

  useEffect(() => {
    if (error && shouldRetry(error)) {
      const timer = setTimeout(() => {
        actions.retrySearch();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  return null;
}
```

## Error Recovery

### Fallback Search

```tsx
function SearchWithFallback() {
  const { state, error, actions } = useSearch();
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (error && !useFallback) {
      // Switch to fallback search
      setUseFallback(true);
      
      // Try simpler search params
      actions.updateSearchParams({
        query_by: 'name', // Only search in name field
        max_facet_values: 10, // Reduce facet load
        per_page: 10 // Reduce result count
      });
    }
  }, [error, useFallback]);

  if (useFallback) {
    return (
      <div className="fallback-mode">
        <p>Using simplified search due to performance issues</p>
        <SearchResults results={state.results} />
      </div>
    );
  }

  return <SearchResults results={state.results} />;
}
```

### Graceful Degradation

```tsx
function GracefulSearch() {
  const { state, error } = useSearch();
  const [degradedMode, setDegradedMode] = useState(false);

  // Features to disable in degraded mode
  const features = {
    facets: !degradedMode,
    highlighting: !degradedMode,
    sorting: !degradedMode,
    pagination: !degradedMode
  };

  useEffect(() => {
    if (error?.message.includes('timeout') || error?.httpStatus === 503) {
      setDegradedMode(true);
    }
  }, [error]);

  return (
    <div>
      {degradedMode && (
        <div className="degraded-notice">
          Some features are temporarily disabled for better performance
        </div>
      )}
      
      <SearchInterface features={features} />
    </div>
  );
}
```

## Custom Error Boundaries

### Search Error Boundary

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class SearchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Search error caught:', error, errorInfo);
    
    // Log to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { errorInfo }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Search Error</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<SearchErrorBoundary fallback={<SearchFallbackUI />}>
  <SearchProvider config={config} collection="products">
    <App />
  </SearchProvider>
</SearchErrorBoundary>
```

## Logging and Monitoring

### Error Tracking Integration

```tsx
function SearchWithErrorTracking() {
  const { error } = useSearch();

  useEffect(() => {
    if (error) {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('Search Error');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('Details:', error);
        console.groupEnd();
      }

      // Track in analytics
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          error_type: 'search_error'
        });
      }

      // Log to error tracking service
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            component: 'search',
            error_type: error.code || 'unknown'
          },
          extra: {
            httpStatus: error.httpStatus,
            query: error.query
          }
        });
      }
    }
  }, [error]);

  return null;
}
```

### Performance Monitoring

```tsx
function SearchPerformanceMonitor() {
  const { state } = useSearch();

  useEffect(() => {
    if (state.results) {
      const searchTime = state.results.search_time_ms;
      
      // Log slow searches
      if (searchTime > 1000) {
        console.warn('Slow search detected:', {
          time: searchTime,
          query: state.query,
          found: state.results.found
        });

        // Track in analytics
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: 'search',
            value: searchTime,
            event_category: 'search_performance'
          });
        }
      }
    }
  }, [state.results]);

  return null;
}
```