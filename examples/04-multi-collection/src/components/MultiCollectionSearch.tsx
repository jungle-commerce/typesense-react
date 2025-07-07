import React, { useState, useEffect } from 'react'
import { useMultiCollectionSearchWithProvider } from 'typesense-react'
import { CollectionSearchConfig } from 'typesense-react'

type ViewMode = 'interleaved' | 'perCollection'

function MultiCollectionSearch() {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('interleaved')
  const [enabledCollections, setEnabledCollections] = useState({
    products: true,
    categories: true,
    brands: true
  })

  // Define collections to search
  const collections: CollectionSearchConfig[] = [
    enabledCollections.products && {
      collection: 'products',
      namespace: 'product',
      queryBy: 'name,description,brand',
      sortBy: '_text_match:desc,rating:desc',
      maxResults: 10,
      weight: 1.2,
      includeFields: 'name,description,price,brand,rating'
    },
    enabledCollections.categories && {
      collection: 'categories',
      namespace: 'category',
      queryBy: 'name,description',
      sortBy: '_text_match:desc',
      maxResults: 5,
      weight: 1.0,
      includeFields: 'name,description,product_count'
    },
    enabledCollections.brands && {
      collection: 'brands',
      namespace: 'brand',
      queryBy: 'name,description',
      sortBy: '_text_match:desc,popularity:desc',
      maxResults: 5,
      weight: 0.8,
      includeFields: 'name,description,logo,product_count'
    }
  ].filter(Boolean) as CollectionSearchConfig[]

  const { search, results, loading, error } = useMultiCollectionSearchWithProvider({
    collections,
    request: {
      query,
      globalMaxResults: 20,
      enableHighlighting: true,
      mergeStrategy: 'relevance',
      normalizeScores: true,
      resultMode: viewMode === 'interleaved' ? 'both' : 'perCollection'
    }
  })

  // Debounced search
  useEffect(() => {
    if (query.length === 0) return
    
    const timer = setTimeout(() => {
      search()
    }, 300)

    return () => clearTimeout(timer)
  }, [query, enabledCollections, search])

  const handleCollectionToggle = (collection: string) => {
    setEnabledCollections(prev => ({
      ...prev,
      [collection]: !prev[collection]
    }))
  }

  const getCollectionColor = (namespace?: string) => {
    switch (namespace) {
      case 'product': return 'products-color'
      case 'category': return 'categories-color'
      case 'brand': return 'brands-color'
      default: return ''
    }
  }

  const renderRelevanceScore = (score: number) => {
    const percentage = Math.round(score * 100)
    return (
      <div className="relevance-score">
        <span>Relevance:</span>
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${percentage}%` }} />
        </div>
        <span>{percentage}%</span>
      </div>
    )
  }

  const highlightText = (text: string, highlights?: any[]) => {
    if (!highlights || highlights.length === 0) return text
    
    const highlight = highlights.find(h => h.snippet)
    if (!highlight) return text
    
    return <span dangerouslySetInnerHTML={{ __html: highlight.snippet }} />
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">Multi-Collection Search</h1>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search across products, categories, and brands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="collections-selector">
              {Object.entries(enabledCollections).map(([collection, enabled]) => (
                <div key={collection} className="collection-toggle">
                  <input
                    type="checkbox"
                    id={collection}
                    checked={enabled}
                    onChange={() => handleCollectionToggle(collection)}
                  />
                  <label htmlFor={collection}>
                    {collection.charAt(0).toUpperCase() + collection.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error">
            Error: {error.message}
          </div>
        )}

        {query && (
          <div className="search-options">
            <div className="result-stats">
              {results && (
                <span>
                  Found {results.totalFound} results across {results.searchedCollections} collections
                  {results.searchTimeMs && ` in ${results.searchTimeMs}ms`}
                </span>
              )}
            </div>
            <div className="view-modes">
              <button
                className={`view-mode-btn ${viewMode === 'interleaved' ? 'active' : ''}`}
                onClick={() => setViewMode('interleaved')}
              >
                Interleaved
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'perCollection' ? 'active' : ''}`}
                onClick={() => setViewMode('perCollection')}
              >
                By Collection
              </button>
            </div>
          </div>
        )}

        <div className="results-container">
          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Searching across collections...</p>
            </div>
          )}

          {!loading && query && results && (
            <>
              {viewMode === 'interleaved' && results.interleavedResults && (
                <div className="interleaved-results">
                  {results.interleavedResults.length > 0 ? (
                    results.interleavedResults.map((hit, index) => (
                      <div 
                        key={`${hit._collection}-${hit.document.id}`} 
                        className={`result-card ${getCollectionColor(hit._namespace)}`}
                      >
                        <div className="result-header">
                          <h3 className="result-title">
                            {highlightText(
                              hit.document.name || hit.document.title,
                              hit.highlights
                            )}
                          </h3>
                          <span className="collection-badge">
                            {hit._namespace || hit._collection}
                          </span>
                        </div>
                        
                        <div className="result-content">
                          {highlightText(
                            hit.document.description || '',
                            hit.highlights
                          )}
                        </div>
                        
                        <div className="result-meta">
                          {hit.document.price && (
                            <span>Price: ${hit.document.price}</span>
                          )}
                          {hit.document.product_count && (
                            <span>{hit.document.product_count} products</span>
                          )}
                          {hit.document.rating && (
                            <span>Rating: {hit.document.rating}/5</span>
                          )}
                        </div>
                        
                        {renderRelevanceScore(hit._normalizedScore || hit.text_match || 0)}
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <h3>No results found</h3>
                      <p>Try different keywords or enable more collections</p>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'perCollection' && results.perCollectionResults && (
                <div className="per-collection-results">
                  {Object.entries(results.perCollectionResults).map(([collection, collectionResult]) => (
                    <div key={collection} className="collection-section">
                      <div className="collection-header">
                        <h2 className={`collection-title ${getCollectionColor(collectionResult.namespace)}`}>
                          {collectionResult.namespace || collection}
                        </h2>
                        <span className="collection-count">
                          {collectionResult.found} results
                        </span>
                      </div>
                      
                      <div className="collection-results">
                        {collectionResult.hits.map((hit) => (
                          <div 
                            key={hit.document.id} 
                            className={`collection-result-item ${getCollectionColor(collectionResult.namespace)}`}
                          >
                            <h4 style={{ margin: '0 0 8px 0' }}>
                              {highlightText(
                                hit.document.name || hit.document.title,
                                hit.highlights
                              )}
                            </h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                              {highlightText(
                                hit.document.description || '',
                                hit.highlights
                              )}
                            </p>
                            <div className="result-meta">
                              {hit.document.price && (
                                <span>Price: ${hit.document.price}</span>
                              )}
                              {hit.document.product_count && (
                                <span>{hit.document.product_count} products</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default MultiCollectionSearch