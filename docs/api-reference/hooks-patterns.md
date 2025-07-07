# Typesense React Hooks Common Patterns

This document describes common patterns and best practices for using typesense-react hooks effectively.

## Table of Contents

1. [Search Patterns](#search-patterns)
2. [Faceting Patterns](#faceting-patterns)
3. [Performance Patterns](#performance-patterns)
4. [State Management Patterns](#state-management-patterns)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Advanced Integration Patterns](#advanced-integration-patterns)

---

## Search Patterns

### Pattern: Debounced Search with Loading States

**Problem**: Prevent excessive API calls while typing and provide visual feedback.

**Solution**:
```typescript
function DebouncedSearchPattern() {
  const { state, actions, loading } = useSearch({
    debounceMs: 500, // Wait 500ms after typing stops
    searchOnMount: false
  });

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={state.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Type to search..."
        />
        {loading && <span className="spinner">🔄</span>}
      </div>
      
      {/* Show skeleton while loading */}
      {loading ? (
        <SearchSkeleton />
      ) : (
        <SearchResults results={state.results} />
      )}
    </div>
  );
}
```

### Pattern: Search with URL Persistence

**Problem**: Maintain search state in URL for sharing and back/forward navigation.

**Solution**:
```typescript
function URLPersistedSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const { state, actions } = useSearch({
    searchOnMount: false
  });

  // Initialize from URL
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const sort = searchParams.get('sort') || '';
    
    actions.setQuery(query);
    actions.setPage(page);
    actions.setSortBy(sort);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (state.query) params.set('q', state.query);
    if (state.page > 1) params.set('page', state.page.toString());
    if (state.sortBy) params.set('sort', state.sortBy);
    
    // Serialize filters
    if (Object.keys(state.disjunctiveFacets).length > 0) {
      params.set('filters', JSON.stringify(state.disjunctiveFacets));
    }
    
    navigate(`?${params.toString()}`, { replace: true });
  }, [state.query, state.page, state.sortBy, state.disjunctiveFacets]);

  return <SearchInterface />;
}
```

### Pattern: Instant Search with Suggestions

**Problem**: Provide instant feedback with search suggestions as user types.

**Solution**:
```typescript
function InstantSearchPattern() {
  const mainSearch = useSearch({
    debounceMs: 300,
    searchOnMount: false
  });
  
  const suggestions = useSearch({
    debounceMs: 100, // Faster for suggestions
    searchOnMount: false
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleQueryChange = (query: string) => {
    mainSearch.actions.setQuery(query);
    
    if (query.length >= 2) {
      // Search in a lightweight suggestions collection
      suggestions.actions.setQuery(query);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="instant-search">
      <input
        type="text"
        value={mainSearch.state.query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      />
      
      {showSuggestions && suggestions.state.results && (
        <div className="suggestions">
          {suggestions.state.results.hits.slice(0, 5).map(hit => (
            <div
              key={hit.document.id}
              onClick={() => {
                mainSearch.actions.setQuery(hit.document.title);
                setShowSuggestions(false);
              }}
            >
              {hit.document.title}
            </div>
          ))}
        </div>
      )}
      
      <SearchResults results={mainSearch.state.results} />
    </div>
  );
}
```

---

## Faceting Patterns

### Pattern: Smart Facet Configuration

**Problem**: Automatically configure facets based on data characteristics.

**Solution**:
```typescript
function SmartFacetPattern() {
  const { schema, facetConfigs } = useSchemaDiscovery({
    maxFacets: 10,
    patterns: {
      // Exclude internal fields
      excludePatterns: [
        { pattern: '^_', matchType: 'prefix' },
        { pattern: '_id$', matchType: 'suffix' }
      ],
      // Identify date fields
      datePatterns: [
        { pattern: '_at$', matchType: 'suffix' },
        { pattern: '_date$', matchType: 'suffix' }
      ]
    },
    facetOverrides: {
      // Override specific facet configurations
      category: { type: 'checkbox', disjunctive: true },
      price: { type: 'range', rangeStep: 10 },
      brand: { type: 'checkbox', showSearch: true },
      created_at: { type: 'date' }
    }
  });

  const facets = useAdvancedFacets();

  return (
    <div className="smart-facets">
      {facetConfigs.map(config => {
        switch (config.type) {
          case 'checkbox':
            return <CheckboxFacet key={config.field} config={config} />;
          case 'range':
            return <RangeFacet key={config.field} config={config} />;
          case 'date':
            return <DateFacet key={config.field} config={config} />;
          default:
            return <SelectFacet key={config.field} config={config} />;
        }
      })}
    </div>
  );
}
```

### Pattern: Hierarchical Faceting

**Problem**: Display facets in a hierarchical structure (e.g., Category > Subcategory).

**Solution**:
```typescript
function HierarchicalFacetPattern({ field }: { field: string }) {
  const facets = useAdvancedFacets();
  const search = useSearch();
  
  // Parse hierarchical values (e.g., "Electronics > Phones > Smartphones")
  const buildHierarchy = (facetCounts: any[]) => {
    const tree: any = {};
    
    facetCounts.forEach(({ value, count }) => {
      const parts = value.split(' > ');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            count: 0,
            children: {},
            fullPath: parts.slice(0, index + 1).join(' > ')
          };
        }
        current[part].count += count;
        current = current[part].children;
      });
    });
    
    return tree;
  };

  const facetData = search.state.results?.facet_counts?.find(
    f => f.field_name === field
  );
  
  if (!facetData) return null;
  
  const hierarchy = buildHierarchy(facetData.counts);

  const renderTree = (tree: any, level = 0) => {
    return Object.entries(tree).map(([key, node]: [string, any]) => (
      <div key={key} style={{ marginLeft: `${level * 20}px` }}>
        <label>
          <input
            type="checkbox"
            checked={facets.disjunctiveFacets[field]?.includes(node.fullPath)}
            onChange={() => facets.actions.toggleFacetValue(field, node.fullPath)}
          />
          {key} ({node.count})
        </label>
        {Object.keys(node.children).length > 0 && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return <div>{renderTree(hierarchy)}</div>;
}
```

### Pattern: Dynamic Facet Loading

**Problem**: Load facet values on demand to improve initial performance.

**Solution**:
```typescript
function DynamicFacetPattern({ field, label }: { field: string; label: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [facetValues, setFacetValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const facets = useAdvancedFacets();
  const { client, collection } = useSearchContext();

  const loadFacetValues = async () => {
    if (facetValues.length > 0) {
      setIsExpanded(!isExpanded);
      return;
    }

    setLoading(true);
    try {
      // Query specifically for this facet's values
      const response = await client.search(collection, {
        q: '*',
        query_by: field,
        facet_by: field,
        max_facet_values: 100,
        per_page: 0 // Don't need actual results
      });

      const facetData = response.facet_counts?.[0];
      if (facetData) {
        setFacetValues(facetData.counts);
      }
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to load facet values:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dynamic-facet">
      <h3 onClick={loadFacetValues} style={{ cursor: 'pointer' }}>
        {label} {isExpanded ? '−' : '+'} {loading && '⌛'}
      </h3>
      
      {isExpanded && facetValues.length > 0 && (
        <div className="facet-values">
          {facetValues.map(({ value, count }) => (
            <label key={value}>
              <input
                type="checkbox"
                checked={facets.disjunctiveFacets[field]?.includes(value)}
                onChange={() => facets.actions.toggleFacetValue(field, value)}
              />
              {value} ({count})
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Performance Patterns

### Pattern: Virtualized Results List

**Problem**: Render large result sets efficiently.

**Solution**:
```typescript
import { FixedSizeList } from 'react-window';

function VirtualizedResultsPattern() {
  const { state } = useSearch();
  
  const ResultRow = ({ index, style }: { index: number; style: any }) => {
    const hit = state.results?.hits[index];
    if (!hit) return null;
    
    return (
      <div style={style} className="result-row">
        <h4>{hit.document.title}</h4>
        <p>{hit.document.description}</p>
      </div>
    );
  };

  if (!state.results) return null;

  return (
    <FixedSizeList
      height={600}
      itemCount={state.results.hits.length}
      itemSize={120}
      width="100%"
    >
      {ResultRow}
    </FixedSizeList>
  );
}
```

### Pattern: Optimistic UI Updates

**Problem**: Make UI feel more responsive by updating immediately.

**Solution**:
```typescript
function OptimisticFacetPattern() {
  const facets = useAdvancedFacets();
  const [optimisticState, setOptimisticState] = useState<Record<string, string[]>>({});
  
  const handleFacetToggle = (field: string, value: string) => {
    // Update optimistic state immediately
    setOptimisticState(prev => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
    
    // Perform actual update
    facets.actions.toggleFacetValue(field, value);
  };

  // Merge actual and optimistic state
  const getFacetState = (field: string) => {
    return optimisticState[field] || facets.disjunctiveFacets[field] || [];
  };

  // Clear optimistic state when search completes
  useEffect(() => {
    setOptimisticState({});
  }, [facets.disjunctiveFacets]);

  return (
    <div>
      {/* Use merged state for immediate feedback */}
      <label>
        <input
          type="checkbox"
          checked={getFacetState('category').includes('Electronics')}
          onChange={() => handleFacetToggle('category', 'Electronics')}
        />
        Electronics
      </label>
    </div>
  );
}
```

### Pattern: Lazy Loading Additional Results

**Problem**: Load more results without pagination controls.

**Solution**:
```typescript
function InfiniteScrollPattern() {
  const { state, actions } = useSearch();
  const [allResults, setAllResults] = useState<any[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Accumulate results
  useEffect(() => {
    if (state.results?.hits) {
      if (state.page === 1) {
        setAllResults(state.results.hits);
      } else {
        setAllResults(prev => [...prev, ...state.results!.hits]);
      }
    }
  }, [state.results, state.page]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !state.loading) {
          const hasMore = allResults.length < (state.results?.found || 0);
          if (hasMore) {
            actions.setPage(state.page + 1);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [state.page, state.loading, allResults.length, state.results?.found]);

  return (
    <div>
      {allResults.map((hit, index) => (
        <div key={`${hit.document.id}-${index}`}>
          {hit.document.title}
        </div>
      ))}
      
      {state.loading && <div>Loading more...</div>}
      
      <div ref={loadMoreRef} style={{ height: '20px' }} />
    </div>
  );
}
```

---

## State Management Patterns

### Pattern: Global Search State with Context

**Problem**: Share search state across multiple components.

**Solution**:
```typescript
// Create a custom context for app-wide search state
const AppSearchContext = createContext<{
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
}>({
  globalQuery: '',
  setGlobalQuery: () => {},
  recentSearches: [],
  addRecentSearch: () => {}
});

function AppSearchProvider({ children }: { children: ReactNode }) {
  const [globalQuery, setGlobalQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('recentSearches') || '[]');
  });

  const addRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  return (
    <AppSearchContext.Provider value={{
      globalQuery,
      setGlobalQuery,
      recentSearches,
      addRecentSearch
    }}>
      {children}
    </AppSearchContext.Provider>
  );
}

// Use in components
function SearchHeader() {
  const { globalQuery, setGlobalQuery, addRecentSearch } = useContext(AppSearchContext);
  const { actions } = useSearch();

  const handleSearch = (query: string) => {
    setGlobalQuery(query);
    actions.setQuery(query);
    if (query.trim()) {
      addRecentSearch(query);
    }
  };

  return (
    <input
      value={globalQuery}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search everywhere..."
    />
  );
}
```

### Pattern: Persistent Filter State

**Problem**: Remember user's filter preferences across sessions.

**Solution**:
```typescript
function PersistentFiltersPattern() {
  const facets = useAdvancedFacets();
  const [isRestoring, setIsRestoring] = useState(true);

  // Save filters to localStorage
  useEffect(() => {
    if (!isRestoring) {
      const filterState = {
        disjunctive: facets.disjunctiveFacets,
        numeric: facets.numericFilters,
        date: facets.dateFilters,
        selective: facets.selectiveFilters
      };
      localStorage.setItem('searchFilters', JSON.stringify(filterState));
    }
  }, [
    facets.disjunctiveFacets,
    facets.numericFilters,
    facets.dateFilters,
    facets.selectiveFilters,
    isRestoring
  ]);

  // Restore filters on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('searchFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        
        // Restore each filter type
        Object.entries(filters.disjunctive || {}).forEach(([field, values]) => {
          (values as string[]).forEach(value => {
            facets.actions.toggleFacetValue(field, value);
          });
        });
        
        Object.entries(filters.numeric || {}).forEach(([field, range]: [string, any]) => {
          facets.actions.setNumericFilter(field, range.min, range.max);
        });
        
        Object.entries(filters.date || {}).forEach(([field, range]: [string, any]) => {
          facets.actions.setDateFilter(field, range.start, range.end);
        });
        
        Object.entries(filters.selective || {}).forEach(([field, value]) => {
          facets.actions.setSelectiveFilter(field, value as string);
        });
      } catch (error) {
        console.error('Failed to restore filters:', error);
      }
    }
    setIsRestoring(false);
  }, []);

  return (
    <div>
      <button onClick={() => {
        facets.actions.clearAllFilters();
        localStorage.removeItem('searchFilters');
      }}>
        Clear All & Reset Preferences
      </button>
      
      {/* Filter UI */}
    </div>
  );
}
```

### Pattern: Undo/Redo for Search State

**Problem**: Allow users to undo/redo search and filter changes.

**Solution**:
```typescript
function UndoRedoSearchPattern() {
  const { state, actions } = useSearch();
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save state to history
  const saveToHistory = () => {
    const currentState = {
      query: state.query,
      page: state.page,
      sortBy: state.sortBy,
      filters: {
        disjunctive: state.disjunctiveFacets,
        numeric: state.numericFilters,
        date: state.dateFilters
      }
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Track state changes
  useEffect(() => {
    const timer = setTimeout(saveToHistory, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [state.query, state.disjunctiveFacets, state.numericFilters]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      restoreState(prevState);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      restoreState(nextState);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const restoreState = (savedState: any) => {
    actions.setQuery(savedState.query);
    actions.setPage(savedState.page);
    actions.setSortBy(savedState.sortBy);
    // Restore filters...
  };

  return (
    <div>
      <button onClick={undo} disabled={historyIndex <= 0}>
        ↶ Undo
      </button>
      <button onClick={redo} disabled={historyIndex >= history.length - 1}>
        ↷ Redo
      </button>
    </div>
  );
}
```

---

## Error Handling Patterns

### Pattern: Graceful Degradation

**Problem**: Provide fallback functionality when search is unavailable.

**Solution**:
```typescript
function GracefulDegradationPattern() {
  const { state, error, loading } = useSearch();
  const [fallbackMode, setFallbackMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (error && retryCount < 3) {
      // Auto-retry with exponential backoff
      const timeout = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        actions.search();
      }, Math.pow(2, retryCount) * 1000);
      
      return () => clearTimeout(timeout);
    } else if (error && retryCount >= 3) {
      setFallbackMode(true);
    }
  }, [error, retryCount]);

  if (fallbackMode) {
    return (
      <div className="fallback-search">
        <h3>Search is temporarily unavailable</h3>
        <p>Browse our categories instead:</p>
        <CategoryBrowser />
        <button onClick={() => {
          setFallbackMode(false);
          setRetryCount(0);
          actions.search();
        }}>
          Try Search Again
        </button>
      </div>
    );
  }

  return <SearchInterface />;
}
```

### Pattern: Error Recovery with Cache

**Problem**: Use cached results when search fails.

**Solution**:
```typescript
function CachedSearchPattern() {
  const { state, actions, error } = useSearch();
  const [cache, setCache] = useState<Map<string, any>>(new Map());

  // Cache successful results
  useEffect(() => {
    if (state.results && !error) {
      const cacheKey = JSON.stringify({
        query: state.query,
        filters: state.disjunctiveFacets,
        page: state.page
      });
      setCache(prev => new Map(prev).set(cacheKey, state.results));
    }
  }, [state.results, state.query, state.disjunctiveFacets, state.page]);

  // Retrieve from cache on error
  const getCachedResults = () => {
    const cacheKey = JSON.stringify({
      query: state.query,
      filters: state.disjunctiveFacets,
      page: state.page
    });
    return cache.get(cacheKey);
  };

  if (error) {
    const cachedResults = getCachedResults();
    if (cachedResults) {
      return (
        <div>
          <div className="warning">
            Showing cached results. 
            <button onClick={() => actions.search()}>Refresh</button>
          </div>
          <SearchResults results={cachedResults} />
        </div>
      );
    }
  }

  return <SearchInterface />;
}
```

---

## Advanced Integration Patterns

### Pattern: Analytics Integration

**Problem**: Track search behavior for analytics.

**Solution**:
```typescript
function AnalyticsSearchPattern() {
  const { state, actions } = useSearch({
    onSearchSuccess: (results) => {
      // Track successful searches
      analytics.track('Search Performed', {
        query: state.query,
        resultsCount: results.found,
        page: state.page,
        filters: Object.keys(state.disjunctiveFacets).length,
        responseTime: results.search_time_ms
      });
    },
    onSearchError: (error) => {
      // Track search errors
      analytics.track('Search Error', {
        query: state.query,
        error: error.message
      });
    }
  });

  // Track click-through rate
  const handleResultClick = (hit: any, position: number) => {
    analytics.track('Search Result Clicked', {
      query: state.query,
      resultId: hit.document.id,
      position,
      page: state.page
    });
  };

  // Track filter usage
  const facets = useAdvancedFacets((filterType, field, value) => {
    analytics.track('Filter Applied', {
      filterType,
      field,
      value,
      query: state.query
    });
  });

  return (
    <div>
      {state.results?.hits.map((hit, index) => (
        <div
          key={hit.document.id}
          onClick={() => handleResultClick(hit, index)}
        >
          {hit.document.title}
        </div>
      ))}
    </div>
  );
}
```

### Pattern: A/B Testing Search Features

**Problem**: Test different search configurations to optimize performance.

**Solution**:
```typescript
function ABTestSearchPattern() {
  const [variant] = useState(() => {
    // Determine variant based on user ID or random assignment
    return Math.random() > 0.5 ? 'A' : 'B';
  });

  const searchConfig = variant === 'A' 
    ? {
        debounceMs: 300,
        maxFacetValues: 100,
        enableDisjunctiveFacetQueries: true
      }
    : {
        debounceMs: 500,
        maxFacetValues: 50,
        enableDisjunctiveFacetQueries: false
      };

  return (
    <SearchProvider
      client={typesenseClient}
      collection="products"
      config={searchConfig}
    >
      <div data-variant={variant}>
        <SearchInterface />
      </div>
    </SearchProvider>
  );
}
```

### Pattern: Multi-Language Search

**Problem**: Support searching in multiple languages with proper configuration.

**Solution**:
```typescript
function MultiLanguageSearchPattern() {
  const { i18n } = useTranslation();
  const [searchCollection, setSearchCollection] = useState(`products_${i18n.language}`);

  // Language-specific search configuration
  const getSearchConfig = (language: string) => {
    const configs: Record<string, any> = {
      en: {
        queryBy: 'title_en,description_en',
        sortBy: 'popularity:desc'
      },
      es: {
        queryBy: 'title_es,description_es',
        sortBy: 'popularidad:desc'
      },
      fr: {
        queryBy: 'title_fr,description_fr',
        sortBy: 'popularite:desc'
      }
    };
    return configs[language] || configs.en;
  };

  // Update collection when language changes
  useEffect(() => {
    setSearchCollection(`products_${i18n.language}`);
  }, [i18n.language]);

  const config = getSearchConfig(i18n.language);

  return (
    <SearchProvider
      key={i18n.language} // Force re-mount on language change
      client={typesenseClient}
      collection={searchCollection}
      initialSearchParams={{
        query_by: config.queryBy,
        sort_by: config.sortBy
      }}
    >
      <SearchInterface />
    </SearchProvider>
  );
}
```

### Pattern: Federated Search

**Problem**: Search across multiple data sources beyond Typesense.

**Solution**:
```typescript
function FederatedSearchPattern() {
  const typesenseSearch = useMultiCollectionSearch(typesenseClient);
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [federatedResults, setFederatedResults] = useState<any[]>([]);

  // Search external sources
  const searchExternal = async (query: string) => {
    try {
      const [elasticResults, algoliaResults] = await Promise.all([
        searchElasticsearch(query),
        searchAlgolia(query)
      ]);
      
      setExternalResults([...elasticResults, ...algoliaResults]);
    } catch (error) {
      console.error('External search failed:', error);
    }
  };

  // Merge and rank results from all sources
  useEffect(() => {
    if (typesenseSearch.results && externalResults.length > 0) {
      const merged = [
        ...typesenseSearch.results.mergedHits.map(hit => ({
          ...hit,
          source: 'typesense'
        })),
        ...externalResults.map(result => ({
          ...result,
          source: result.source,
          score: normalizeScore(result.score, result.source)
        }))
      ];
      
      // Sort by normalized score
      merged.sort((a, b) => b.score - a.score);
      setFederatedResults(merged);
    }
  }, [typesenseSearch.results, externalResults]);

  return (
    <div>
      <input
        onChange={(e) => {
          typesenseSearch.setQuery(e.target.value);
          searchExternal(e.target.value);
        }}
        placeholder="Search all sources..."
      />
      
      {federatedResults.map((result, index) => (
        <div key={index} className={`result-${result.source}`}>
          <span className="source">{result.source}</span>
          <h3>{result.document?.title || result.title}</h3>
        </div>
      ))}
    </div>
  );
}
```

---

## Best Practices Summary

1. **Performance**
   - Use appropriate debounce values (300-500ms for search)
   - Enable facet accumulation for stable UI
   - Implement virtual scrolling for large result sets
   - Use lazy loading for facet values

2. **User Experience**
   - Provide loading indicators
   - Implement optimistic UI updates
   - Persist user preferences
   - Support URL state for sharing

3. **Error Handling**
   - Implement retry logic with backoff
   - Provide fallback UI
   - Cache results for offline support
   - Track errors for monitoring

4. **State Management**
   - Use context for global search state
   - Implement undo/redo functionality
   - Persist filters across sessions
   - Support multi-language configurations

5. **Integration**
   - Track analytics events
   - Support A/B testing
   - Enable federated search
   - Implement proper SEO support