import React, { useState } from 'react';
import {
  MultiCollectionProvider,
  useMultiCollectionContext,
  type CollectionSearchConfig,
  type MultiCollectionSearchHit,
} from '@jungle-commerce/typesense-react';
import { typesenseConfig, defaultCollections } from './config';
import './styles.css';

// Component to display a search hit with collection-specific rendering
function SearchHit({ hit }: { hit: MultiCollectionSearchHit }) {
  const namespaceColors: Record<string, string> = {
    product: '#3b82f6',
    category: '#10b981',
    brand: '#8b5cf6',
    article: '#f59e0b',
  };

  const bgColor = namespaceColors[hit._namespace || ''] || '#6b7280';

  // Render based on namespace/collection type
  const renderContent = () => {
    switch (hit._namespace) {
      case 'product':
        return (
          <>
            <h3>{hit.document.name}</h3>
            <p className="description">{hit.document.description}</p>
            <div className="product-details">
              <span className="price">${hit.document.price?.toFixed(2)}</span>
              <span className="rating">★ {hit.document.rating?.toFixed(1)}</span>
              <span className="brand">{hit.document.brand}</span>
            </div>
          </>
        );
      
      case 'category':
        return (
          <>
            <h3>{hit.document.name}</h3>
            <p className="description">{hit.document.description}</p>
            <div className="category-meta">
              <span>{hit.document.product_count} products</span>
              {hit.document.parent_category && (
                <span>in {hit.document.parent_category}</span>
              )}
            </div>
          </>
        );
      
      case 'brand':
        return (
          <>
            <h3>{hit.document.name}</h3>
            <p className="description">{hit.document.description}</p>
            {hit.document.website && (
              <a href={hit.document.website} target="_blank" rel="noopener noreferrer">
                Visit website →
              </a>
            )}
          </>
        );
      
      case 'article':
        const publishedDate = hit.document.published_date 
          ? new Date(hit.document.published_date * 1000).toLocaleDateString()
          : 'Unknown date';
        return (
          <>
            <h3>{hit.document.title}</h3>
            <p className="description">{hit.document.excerpt}</p>
            <div className="article-meta">
              <span>By {hit.document.author}</span>
              <span>{publishedDate}</span>
            </div>
          </>
        );
      
      default:
        return (
          <>
            <h3>{hit.document.name || hit.document.title || 'Untitled'}</h3>
            <pre className="raw-data">{JSON.stringify(hit.document, null, 2)}</pre>
          </>
        );
    }
  };

  // Show highlights if available
  const highlights = hit.highlights || hit.document._highlights;
  
  return (
    <div className="search-hit">
      <div
        className="collection-badge"
        style={{ backgroundColor: bgColor }}
      >
        {hit._namespace || hit._collection}
      </div>
      
      <div className="hit-content">
        {renderContent()}
        
        {highlights && Object.keys(highlights).length > 0 && (
          <div className="highlights">
            <strong>Matched in:</strong>
            {Object.entries(highlights).map(([field, highlight]) => (
              <div key={field} className="highlight-field">
                <span className="field-name">{field}:</span>
                <span 
                  className="highlight-text" 
                  dangerouslySetInnerHTML={{ __html: highlight as string }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="hit-metadata">
        <span className="rank">#{hit._collectionRank} in collection</span>
        <span className="score" title={`Original: ${hit._originalScore.toFixed(3)}`}>
          Score: {hit._mergedScore.toFixed(3)}
        </span>
      </div>
    </div>
  );
}

// Main search interface component
function MultiSearchInterface() {
  const { state, search, updateCollections } = useMultiCollectionContext();
  const [query, setQueryInput] = useState('');
  const [collections, setCollections] = useState(defaultCollections);
  const [globalMaxResults, setGlobalMaxResults] = useState(50);
  const [mergeStrategy, setMergeStrategy] = useState<'relevance' | 'roundRobin' | 'collectionOrder'>('relevance');
  const [resultMode, setResultMode] = useState<'interleaved' | 'perCollection' | 'both'>('interleaved');
  const [enableHighlighting, setEnableHighlighting] = useState(true);

  const handleSearch = () => {
    search({
      query,
      collections: collections.filter(c => c.weight !== 0),
      globalMaxResults,
      mergeStrategy,
      resultMode,
      enableHighlighting,
      normalizeScores: true,
      highlightConfig: {
        startTag: '<mark>',
        endTag: '</mark>',
        affixNumTokens: 4
      }
    });
  };

  const handleCollectionToggle = (index: number) => {
    const newCollections = [...collections];
    const current = newCollections[index];
    
    // Toggle by adjusting weight (0 = disabled)
    newCollections[index] = {
      ...current,
      weight: current.weight === 0 ? 1.0 : 0,
    };
    
    setCollections(newCollections);
    updateCollections(newCollections.filter(c => c.weight !== 0));
  };

  const handleWeightChange = (index: number, weight: number) => {
    const newCollections = [...collections];
    newCollections[index] = {
      ...newCollections[index],
      weight,
    };
    setCollections(newCollections);
  };

  const handleFieldsChange = (index: number, includeFields: string) => {
    const newCollections = [...collections];
    newCollections[index] = {
      ...newCollections[index],
      includeFields: includeFields || undefined,
    };
    setCollections(newCollections);
  };

  const renderInterleavedResults = () => {
    if (!state.results?.hits || state.results.hits.length === 0) {
      return <div className="no-results">No results found</div>;
    }

    return (
      <div className="results-list">
        {state.results.hits.map((hit, index) => (
          <SearchHit key={`${hit._collection}-${index}`} hit={hit} />
        ))}
      </div>
    );
  };

  const renderPerCollectionResults = () => {
    if (!state.results?.hitsByCollection) {
      return <div className="no-results">No results found</div>;
    }

    return (
      <div className="per-collection-results">
        {Object.entries(state.results.hitsByCollection).map(([collection, hits]) => (
          <div key={collection} className="collection-section">
            <h3 className="collection-title">
              {collection} 
              <span className="collection-count">
                ({hits.length} results)
              </span>
            </h3>
            <div className="results-list">
              {hits.map((hit, index) => (
                <SearchHit key={`${collection}-${index}`} hit={hit} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="multi-search-interface">
      <header className="header">
        <h1>Multi-Collection Search Demo</h1>
        <p>Search across products, categories, brands, and articles simultaneously</p>
      </header>

      <div className="search-controls">
        <div className="search-bar">
          <input
            type="text"
            value={query}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search across all collections..."
            className="search-input"
          />
          <button
            onClick={handleSearch}
            disabled={state.loading}
            className="search-button"
          >
            {state.loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="search-options">
          <div className="option-group">
            <label>Result Mode:</label>
            <select
              value={resultMode}
              onChange={(e) => setResultMode(e.target.value as any)}
              className="option-select"
            >
              <option value="interleaved">Interleaved</option>
              <option value="perCollection">Per Collection</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="option-group">
            <label>Merge Strategy:</label>
            <select
              value={mergeStrategy}
              onChange={(e) => setMergeStrategy(e.target.value as any)}
              className="option-select"
              disabled={resultMode === 'perCollection'}
            >
              <option value="relevance">By Relevance</option>
              <option value="roundRobin">Round Robin</option>
              <option value="collectionOrder">Collection Order</option>
            </select>
          </div>

          <div className="option-group">
            <label>Max Results:</label>
            <input
              type="number"
              value={globalMaxResults}
              onChange={(e) => setGlobalMaxResults(parseInt(e.target.value) || 50)}
              min="1"
              max="200"
              className="option-input"
            />
          </div>

          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={enableHighlighting}
              onChange={(e) => setEnableHighlighting(e.target.checked)}
            />
            Enable highlighting
          </label>
        </div>

        {/* Collection configuration */}
        <div className="collections-config">
          <h3>Collections to Search:</h3>
          <div className="collections-list">
            {collections.map((col, index) => (
              <div key={col.collection} className="collection-config">
                <label className="collection-toggle">
                  <input
                    type="checkbox"
                    checked={col.weight !== 0}
                    onChange={() => handleCollectionToggle(index)}
                  />
                  <strong>{col.collection}</strong>
                </label>
                
                {col.weight !== 0 && (
                  <div className="collection-settings">
                    <div className="setting-row">
                      <label>Weight:</label>
                      <input
                        type="number"
                        value={col.weight}
                        onChange={(e) => handleWeightChange(index, parseFloat(e.target.value) || 1)}
                        min="0.1"
                        max="10"
                        step="0.1"
                        className="weight-input"
                      />
                      <span className="setting-info">
                        Max: {col.maxResults}, Query: {col.queryBy}
                      </span>
                    </div>
                    
                    <div className="setting-row">
                      <label>Include Fields:</label>
                      <input
                        type="text"
                        value={col.includeFields || ''}
                        onChange={(e) => handleFieldsChange(index, e.target.value)}
                        placeholder="All fields"
                        className="fields-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error display */}
      {state.error && (
        <div className="error-message">
          Error: {state.error.message}
        </div>
      )}

      {/* Results summary */}
      {state.results && (
        <div className="results-summary">
          <h2>
            Found {state.results.found} results
            {state.results.searchTimeMs && ` in ${state.results.searchTimeMs}ms`}
          </h2>
          
          {/* Per-collection stats */}
          <div className="collection-stats">
            {Object.entries(state.results.totalFoundByCollection).map(([collection, count]) => (
              <span key={collection} className="stat">
                <strong>{collection}:</strong> {state.results!.includedByCollection[collection] || 0}/{count}
              </span>
            ))}
          </div>

          {/* Collection errors */}
          {state.results.errorsByCollection && (
            <div className="collection-errors">
              {Object.entries(state.results.errorsByCollection).map(([collection, error]) => (
                <div key={collection} className="error-item">
                  {collection}: {error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search results */}
      {state.results && (
        <div className="results-container">
          {(resultMode === 'interleaved' || resultMode === 'both') && (
            <div className="results-section">
              {resultMode === 'both' && <h2>Interleaved Results</h2>}
              {renderInterleavedResults()}
            </div>
          )}
          
          {(resultMode === 'perCollection' || resultMode === 'both') && (
            <div className="results-section">
              {resultMode === 'both' && <h2>Results by Collection</h2>}
              {renderPerCollectionResults()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <MultiCollectionProvider
      config={typesenseConfig}
      defaultCollections={defaultCollections}
      searchOptions={{
        searchOnMount: false,
        debounceMs: 300,
      }}
    >
      <MultiSearchInterface />
    </MultiCollectionProvider>
  );
}

export default App;