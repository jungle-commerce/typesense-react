# Multi-Collection Search Tutorial

Learn how to search across multiple Typesense collections simultaneously, perfect for building unified search experiences across different content types.

## What We're Building

A unified search interface that searches across:
- Products (e-commerce items)
- Articles (blog/documentation)
- Users (customer profiles)
- FAQ (help content)

Features include:
- Simultaneous searching across collections
- Collection-specific result rendering
- Result interleaving strategies
- Collection filtering
- Weighted search relevance
- Unified pagination

## Prerequisites

- Understanding of basic Typesense search
- Multiple collections set up in Typesense
- Familiarity with TypeScript

## Step 1: Set Up Collections

First, ensure you have multiple collections with different schemas:

```typescript
// Collection schemas
const schemas = {
  products: {
    name: 'products',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'price', type: 'float' },
      { name: 'category', type: 'string', facet: true },
      { name: 'image_url', type: 'string' }
    ]
  },
  
  articles: {
    name: 'articles',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'author', type: 'string', facet: true },
      { name: 'tags', type: 'string[]', facet: true },
      { name: 'published_at', type: 'int64' }
    ]
  },
  
  users: {
    name: 'users',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'role', type: 'string', facet: true },
      { name: 'department', type: 'string', facet: true }
    ]
  },
  
  faqs: {
    name: 'faqs',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'question', type: 'string' },
      { name: 'answer', type: 'string' },
      { name: 'category', type: 'string', facet: true },
      { name: 'helpful_count', type: 'int32' }
    ]
  }
};
```

## Step 2: Define Type Interfaces

Create TypeScript interfaces for each collection:

```typescript
// src/types/collections.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  published_at: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  role: string;
  department: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

export type AnyDocument = Product | Article | User | FAQ;
```

## Step 3: Configure Multi-Collection Search

Set up the multi-collection search provider:

```tsx
// src/App.tsx
import React from 'react';
import { MultiCollectionProvider } from '@jungle-commerce/typesense-react';
import { typesenseConfig } from './config/typesense';
import UnifiedSearch from './components/UnifiedSearch';

const collectionConfigs = [
  {
    collection: 'products',
    namespace: 'product',
    weight: 1.5, // Products are more important
    queryBy: 'name,description,category',
    includeFields: 'id,name,description,price,category,image_url',
    maxResults: 10
  },
  {
    collection: 'articles',
    namespace: 'article',
    weight: 1.0,
    queryBy: 'title,content,tags',
    includeFields: 'id,title,content,author,tags,published_at',
    maxResults: 5
  },
  {
    collection: 'users',
    namespace: 'user',
    weight: 0.8,
    queryBy: 'name,email,bio',
    includeFields: 'id,name,email,role,department',
    maxResults: 3
  },
  {
    collection: 'faqs',
    namespace: 'faq',
    weight: 1.2,
    queryBy: 'question,answer',
    includeFields: 'id,question,answer,category',
    maxResults: 5
  }
];

function App() {
  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      collections={collectionConfigs}
      searchOnMount={false}
      debounceMs={300}
      mergeStrategy="relevance"
      resultMode="both"
      normalizeScores={true}
      globalMaxResults={50}
    >
      <UnifiedSearch />
    </MultiCollectionProvider>
  );
}

export default App;
```

## Step 4: Build the Unified Search Component

Create the main search interface:

```tsx
// src/components/UnifiedSearch.tsx
import React from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';
import SearchInput from './SearchInput';
import CollectionTabs from './CollectionTabs';
import UnifiedResults from './UnifiedResults';
import SearchFilters from './SearchFilters';
import './UnifiedSearch.css';

function UnifiedSearch() {
  const {
    state,
    actions,
    collectionStates,
    activeCollection
  } = useMultiCollectionSearch();

  return (
    <div className="unified-search">
      <header className="search-header">
        <h1>Search Everything</h1>
        <SearchInput />
        
        {state.query && (
          <div className="search-stats">
            <span className="total-results">
              {state.totalFound} total results
            </span>
            <span className="search-time">
              in {state.searchTimeMs}ms
            </span>
          </div>
        )}
      </header>

      <div className="search-body">
        <aside className="search-sidebar">
          <SearchFilters />
        </aside>

        <main className="search-main">
          <CollectionTabs />
          <UnifiedResults />
        </main>
      </div>
    </div>
  );
}

export default UnifiedSearch;
```

## Step 5: Create Collection Tabs

Allow users to filter by collection:

```tsx
// src/components/CollectionTabs.tsx
import React from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

function CollectionTabs() {
  const { state, actions, collectionStates } = useMultiCollectionSearch();

  const tabs = [
    { id: 'all', label: 'All', count: state.totalFound },
    { id: 'product', label: 'Products', count: collectionStates.product?.found || 0 },
    { id: 'article', label: 'Articles', count: collectionStates.article?.found || 0 },
    { id: 'user', label: 'People', count: collectionStates.user?.found || 0 },
    { id: 'faq', label: 'Help', count: collectionStates.faq?.found || 0 }
  ];

  return (
    <div className="collection-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => actions.setActiveCollection(tab.id === 'all' ? null : tab.id)}
          className={`tab ${state.activeCollection === (tab.id === 'all' ? null : tab.id) ? 'active' : ''}`}
          disabled={tab.count === 0 && tab.id !== 'all'}
        >
          <span className="tab-label">{tab.label}</span>
          {state.query && (
            <span className="tab-count">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default CollectionTabs;
```

## Step 6: Display Unified Results

Show results from all collections:

```tsx
// src/components/UnifiedResults.tsx
import React from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';
import ProductResult from './results/ProductResult';
import ArticleResult from './results/ArticleResult';
import UserResult from './results/UserResult';
import FAQResult from './results/FAQResult';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

function UnifiedResults() {
  const { state } = useMultiCollectionSearch();

  if (state.loading && !state.results) {
    return <LoadingState />;
  }

  if (!state.query) {
    return <EmptyState type="no-query" />;
  }

  if (state.totalFound === 0) {
    return <EmptyState type="no-results" query={state.query} />;
  }

  // Component map for rendering different result types
  const resultComponents = {
    product: ProductResult,
    article: ArticleResult,
    user: UserResult,
    faq: FAQResult
  };

  // Render based on active view
  if (state.activeCollection) {
    // Show only results from active collection
    const collectionResults = state.results?.perCollection?.[state.activeCollection];
    const ResultComponent = resultComponents[state.activeCollection];

    return (
      <div className="collection-results">
        {collectionResults?.hits.map((hit, index) => (
          <ResultComponent 
            key={`${state.activeCollection}-${hit.document.id}`}
            hit={hit}
            index={index}
          />
        ))}
      </div>
    );
  }

  // Show interleaved results from all collections
  return (
    <div className="unified-results">
      {state.results?.interleaved?.map((item, index) => {
        const ResultComponent = resultComponents[item.collection];
        
        return (
          <div key={`${item.collection}-${item.hit.document.id}-${index}`} className="result-wrapper">
            <div className="result-collection-badge">
              {item.collection}
            </div>
            <ResultComponent 
              hit={item.hit}
              index={index}
            />
          </div>
        );
      })}
    </div>
  );
}

export default UnifiedResults;
```

## Step 7: Create Result Components

Build collection-specific result displays:

```tsx
// src/components/results/ProductResult.tsx
import React from 'react';
import type { SearchHit } from '@jungle-commerce/typesense-react';
import type { Product } from '../../types/collections';

interface ProductResultProps {
  hit: SearchHit<Product>;
  index: number;
}

function ProductResult({ hit, index }: ProductResultProps) {
  const { document, highlights } = hit;

  const renderHighlight = (field: keyof Product) => {
    const highlight = highlights?.find(h => h.field === field);
    if (highlight?.snippets?.[0]) {
      return <span dangerouslySetInnerHTML={{ __html: highlight.snippets[0] }} />;
    }
    return <span>{String(document[field])}</span>;
  };

  return (
    <article className="product-result">
      <div className="product-image">
        <img src={document.image_url} alt={document.name} loading="lazy" />
      </div>
      
      <div className="product-content">
        <h3>{renderHighlight('name')}</h3>
        <p className="product-description">
          {renderHighlight('description')}
        </p>
        
        <div className="product-meta">
          <span className="product-price">${document.price}</span>
          <span className="product-category">{document.category}</span>
        </div>
        
        <button className="view-product-btn">
          View Product →
        </button>
      </div>
    </article>
  );
}

export default ProductResult;
```

```tsx
// src/components/results/ArticleResult.tsx
import React from 'react';
import type { SearchHit } from '@jungle-commerce/typesense-react';
import type { Article } from '../../types/collections';

interface ArticleResultProps {
  hit: SearchHit<Article>;
  index: number;
}

function ArticleResult({ hit, index }: ArticleResultProps) {
  const { document, highlights } = hit;
  
  const publishedDate = new Date(document.published_at * 1000).toLocaleDateString();

  const renderHighlight = (field: keyof Article) => {
    const highlight = highlights?.find(h => h.field === field);
    if (highlight?.snippets?.[0]) {
      return <span dangerouslySetInnerHTML={{ __html: highlight.snippets[0] }} />;
    }
    return <span>{String(document[field])}</span>;
  };

  return (
    <article className="article-result">
      <h3>{renderHighlight('title')}</h3>
      
      <div className="article-meta">
        <span className="article-author">By {document.author}</span>
        <span className="article-date">{publishedDate}</span>
      </div>
      
      <p className="article-excerpt">
        {renderHighlight('content')}
      </p>
      
      <div className="article-tags">
        {document.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      
      <a href={`/articles/${document.id}`} className="read-more">
        Read More →
      </a>
    </article>
  );
}

export default ArticleResult;
```

```tsx
// src/components/results/UserResult.tsx
import React from 'react';
import type { SearchHit } from '@jungle-commerce/typesense-react';
import type { User } from '../../types/collections';

interface UserResultProps {
  hit: SearchHit<User>;
  index: number;
}

function UserResult({ hit, index }: UserResultProps) {
  const { document, highlights } = hit;

  const renderHighlight = (field: keyof User) => {
    const highlight = highlights?.find(h => h.field === field);
    if (highlight?.snippets?.[0]) {
      return <span dangerouslySetInnerHTML={{ __html: highlight.snippets[0] }} />;
    }
    return <span>{String(document[field])}</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <article className="user-result">
      <div className="user-avatar">
        {getInitials(document.name)}
      </div>
      
      <div className="user-content">
        <h3>{renderHighlight('name')}</h3>
        <p className="user-role">
          {document.role} • {document.department}
        </p>
        <p className="user-bio">
          {renderHighlight('bio')}
        </p>
        <a href={`mailto:${document.email}`} className="user-email">
          {document.email}
        </a>
      </div>
    </article>
  );
}

export default UserResult;
```

```tsx
// src/components/results/FAQResult.tsx
import React from 'react';
import type { SearchHit } from '@jungle-commerce/typesense-react';
import type { FAQ } from '../../types/collections';

interface FAQResultProps {
  hit: SearchHit<FAQ>;
  index: number;
}

function FAQResult({ hit, index }: FAQResultProps) {
  const { document, highlights } = hit;
  const [expanded, setExpanded] = React.useState(false);

  const renderHighlight = (field: keyof FAQ) => {
    const highlight = highlights?.find(h => h.field === field);
    if (highlight?.snippets?.[0]) {
      return <span dangerouslySetInnerHTML={{ __html: highlight.snippets[0] }} />;
    }
    return <span>{String(document[field])}</span>;
  };

  return (
    <article className="faq-result">
      <button
        onClick={() => setExpanded(!expanded)}
        className="faq-question"
        aria-expanded={expanded}
      >
        <span className="faq-icon">{expanded ? '−' : '+'}</span>
        <h3>{renderHighlight('question')}</h3>
      </button>
      
      {expanded && (
        <div className="faq-answer">
          <p>{renderHighlight('answer')}</p>
          
          <div className="faq-meta">
            <span className="faq-category">{document.category}</span>
            <button className="faq-helpful">
              👍 Helpful ({document.helpful_count})
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default FAQResult;
```

## Step 8: Add Collection-Specific Filters

Create filters that adapt to selected collection:

```tsx
// src/components/SearchFilters.tsx
import React from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

function SearchFilters() {
  const { state, actions, facetResults } = useMultiCollectionSearch();

  // Get relevant filters based on active collection
  const getActiveFilters = () => {
    if (!state.activeCollection) {
      // Show common filters for all collections
      return (
        <>
          <FilterSection
            title="Type"
            options={[
              { value: 'product', label: 'Products' },
              { value: 'article', label: 'Articles' },
              { value: 'user', label: 'People' },
              { value: 'faq', label: 'Help & FAQ' }
            ]}
            field="collection_type"
          />
        </>
      );
    }

    // Show collection-specific filters
    switch (state.activeCollection) {
      case 'product':
        return (
          <>
            <FilterSection
              title="Category"
              facets={facetResults.product?.category}
              field="category"
            />
            <PriceFilter />
          </>
        );
        
      case 'article':
        return (
          <>
            <FilterSection
              title="Author"
              facets={facetResults.article?.author}
              field="author"
            />
            <FilterSection
              title="Tags"
              facets={facetResults.article?.tags}
              field="tags"
            />
            <DateFilter field="published_at" />
          </>
        );
        
      case 'user':
        return (
          <>
            <FilterSection
              title="Department"
              facets={facetResults.user?.department}
              field="department"
            />
            <FilterSection
              title="Role"
              facets={facetResults.user?.role}
              field="role"
            />
          </>
        );
        
      case 'faq':
        return (
          <>
            <FilterSection
              title="Category"
              facets={facetResults.faq?.category}
              field="category"
            />
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="search-filters">
      <div className="filters-header">
        <h2>Filters</h2>
        {Object.keys(state.activeFilters).length > 0 && (
          <button
            onClick={() => actions.clearAllFilters()}
            className="clear-filters"
          >
            Clear all
          </button>
        )}
      </div>
      
      {getActiveFilters()}
    </div>
  );
}

// Generic filter section component
function FilterSection({ title, facets, field, options }) {
  const { actions, state } = useMultiCollectionSearch();
  
  const items = facets?.counts || options || [];
  
  return (
    <div className="filter-section">
      <h3>{title}</h3>
      {items.map(item => (
        <label key={item.value} className="filter-option">
          <input
            type="checkbox"
            checked={state.activeFilters[field]?.includes(item.value)}
            onChange={(e) => {
              if (e.target.checked) {
                actions.addFilter(field, item.value);
              } else {
                actions.removeFilter(field, item.value);
              }
            }}
          />
          <span>{item.label || item.value}</span>
          {item.count !== undefined && (
            <span className="count">({item.count})</span>
          )}
        </label>
      ))}
    </div>
  );
}

export default SearchFilters;
```

## Step 9: Implement Advanced Features

### Merge Strategies

```tsx
// src/hooks/useMergeStrategy.ts
import { useMemo } from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

export function useMergeStrategy() {
  const { state, actions } = useMultiCollectionSearch();

  const strategies = {
    relevance: {
      label: 'By Relevance',
      description: 'Mix results based on search score'
    },
    roundRobin: {
      label: 'Round Robin',
      description: 'Alternate between collections'
    },
    collectionOrder: {
      label: 'By Collection',
      description: 'Show all from one collection before next'
    },
    custom: {
      label: 'Custom',
      description: 'Define your own merge logic'
    }
  };

  const customMerge = useMemo(() => {
    return (results) => {
      // Example: Prioritize FAQ for question queries
      if (state.query?.includes('?')) {
        return [
          ...results.faq || [],
          ...results.products || [],
          ...results.articles || [],
          ...results.users || []
        ].flat();
      }
      
      // Default relevance-based merge
      return null;
    };
  }, [state.query]);

  return {
    strategies,
    currentStrategy: state.mergeStrategy,
    setStrategy: actions.setMergeStrategy,
    customMerge
  };
}
```

### Search Analytics

```tsx
// src/hooks/useMultiCollectionAnalytics.ts
import { useEffect } from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

export function useMultiCollectionAnalytics() {
  const { state, collectionStates } = useMultiCollectionSearch();

  useEffect(() => {
    if (state.query && state.results) {
      const analytics = {
        query: state.query,
        timestamp: new Date().toISOString(),
        totalResults: state.totalFound,
        searchTime: state.searchTimeMs,
        resultsBreakdown: Object.entries(collectionStates).reduce((acc, [collection, data]) => {
          acc[collection] = {
            found: data.found,
            shown: data.hits?.length || 0
          };
          return acc;
        }, {}),
        activeCollection: state.activeCollection,
        filters: state.activeFilters
      };

      // Send to analytics service
      console.log('Multi-collection search:', analytics);
    }
  }, [state.query, state.results]);

  const trackResultClick = (collection: string, documentId: string, position: number) => {
    const event = {
      query: state.query,
      collection,
      documentId,
      position,
      timestamp: new Date().toISOString()
    };

    console.log('Result clicked:', event);
  };

  return { trackResultClick };
}
```

## Step 10: Add Styles

Create a unified design:

```css
/* src/components/UnifiedSearch.css */

/* Layout */
.unified-search {
  min-height: 100vh;
  background: #f8f9fa;
}

.search-header {
  background: white;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-body {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Collection Tabs */
.collection-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 0;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #6c757d;
  transition: all 0.2s;
  position: relative;
  top: 2px;
}

.tab:hover:not(:disabled) {
  color: #495057;
}

.tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-count {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  color: #6c757d;
}

/* Results */
.unified-results,
.collection-results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-wrapper {
  position: relative;
}

.result-collection-badge {
  position: absolute;
  top: -0.5rem;
  right: 1rem;
  background: #007bff;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  z-index: 1;
}

/* Product Results */
.product-result {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 1.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.product-result:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.product-image img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
}

.product-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #212529;
}

.product-description {
  color: #6c757d;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.product-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.product-price {
  font-size: 1.5rem;
  font-weight: bold;
  color: #28a745;
}

.product-category {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #495057;
}

.view-product-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.view-product-btn:hover {
  background: #0056b3;
}

/* Article Results */
.article-result {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.article-result h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #212529;
}

.article-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.article-excerpt {
  color: #495057;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.article-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
}

.read-more {
  color: #007bff;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.read-more:hover {
  text-decoration: underline;
}

/* User Results */
.user-result {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 1rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.user-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: bold;
}

.user-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
}

.user-role {
  color: #6c757d;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.user-bio {
  color: #495057;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.user-email {
  color: #007bff;
  text-decoration: none;
  font-size: 0.875rem;
}

/* FAQ Results */
.faq-result {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.faq-question {
  width: 100%;
  padding: 1.5rem;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.faq-question:hover {
  background: #f8f9fa;
}

.faq-icon {
  font-size: 1.5rem;
  color: #007bff;
  flex-shrink: 0;
}

.faq-question h3 {
  margin: 0;
  font-size: 1.125rem;
  color: #212529;
  font-weight: normal;
}

.faq-answer {
  padding: 0 1.5rem 1.5rem 3.5rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.faq-answer p {
  color: #495057;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.faq-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faq-category {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #495057;
}

.faq-helpful {
  background: none;
  border: 1px solid #dee2e6;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.faq-helpful:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

/* Filters */
.search-filters {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.filters-header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.clear-filters {
  font-size: 0.875rem;
  color: #dc3545;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.filter-section {
  margin-bottom: 1.5rem;
}

.filter-section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
}

.filter-option {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.filter-option input {
  margin-right: 0.5rem;
}

.filter-option .count {
  margin-left: auto;
  color: #6c757d;
  font-size: 0.75rem;
}

/* Search stats */
.search-stats {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.search-stats span {
  margin: 0 0.5rem;
}

/* Highlights */
mark {
  background: #fff3cd;
  padding: 0 2px;
  border-radius: 2px;
}

/* Empty states */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6c757d;
}

.empty-state h2 {
  color: #495057;
  margin-bottom: 0.5rem;
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 4rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .search-body {
    grid-template-columns: 200px 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .search-body {
    grid-template-columns: 1fr;
  }
  
  .search-filters {
    display: none;
  }
  
  .collection-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .product-result {
    grid-template-columns: 100px 1fr;
    gap: 1rem;
    padding: 1rem;
  }
  
  .product-image img {
    height: 100px;
  }
  
  .user-result {
    grid-template-columns: 60px 1fr;
  }
  
  .user-avatar {
    width: 60px;
    height: 60px;
    font-size: 1.25rem;
  }
}
```

## Step 11: Add Performance Optimizations

```tsx
// src/hooks/useOptimizedMultiSearch.ts
import { useMemo, useCallback } from 'react';
import { useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

export function useOptimizedMultiSearch() {
  const { state, actions } = useMultiCollectionSearch();

  // Memoize expensive computations
  const searchMetrics = useMemo(() => {
    if (!state.results) return null;

    return {
      totalTime: state.searchTimeMs,
      averageScore: state.results.interleaved?.reduce(
        (sum, item) => sum + (item.hit.text_match || 0), 
        0
      ) / (state.results.interleaved?.length || 1),
      collectionDistribution: Object.entries(state.collectionStates).reduce(
        (acc, [collection, data]) => {
          acc[collection] = (data.found / state.totalFound) * 100;
          return acc;
        }, 
        {}
      )
    };
  }, [state.results, state.collectionStates, state.totalFound]);

  // Optimize search with selective collection querying
  const smartSearch = useCallback((query: string) => {
    // Skip collections based on query patterns
    const collectionsToSearch = getRelevantCollections(query);
    
    actions.setQuery(query, {
      collections: collectionsToSearch,
      enableCache: true
    });
  }, [actions]);

  return {
    searchMetrics,
    smartSearch
  };
}

function getRelevantCollections(query: string): string[] {
  // Example logic: search specific collections based on query patterns
  if (query.includes('@')) {
    // Email detected, prioritize users
    return ['users', 'articles'];
  }
  
  if (query.match(/\$[\d,.]+/) || query.match(/price|cheap|expensive/i)) {
    // Price query, prioritize products
    return ['products'];
  }
  
  if (query.includes('?') || query.match(/how|what|when|where|why/i)) {
    // Question detected, prioritize FAQ
    return ['faqs', 'articles'];
  }
  
  // Default: search all
  return ['products', 'articles', 'users', 'faqs'];
}
```

## Summary

You've built a sophisticated multi-collection search that:
- Searches across different content types simultaneously
- Provides collection-specific result rendering
- Supports multiple merge strategies
- Includes collection filtering and tabs
- Adapts filters based on selected collection
- Optimizes performance with smart querying

Key concepts learned:
- Using `MultiCollectionProvider` for unified search
- Implementing different merge strategies
- Building adaptive UI components
- Handling heterogeneous data types
- Optimizing multi-collection performance

This completes the tutorial series! You now have the knowledge to build powerful search experiences with typesense-react.

---

[← Faceted Search Tutorial](./faceted-search-tutorial.md) | [Back to Getting Started →](../getting-started/01-installation.md)