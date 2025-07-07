import React, { useState, useEffect } from 'react'
import { useSearch, useAdvancedFacets } from 'typesense-react'

function DocumentationSearch() {
  const { state, actions, loading, error } = useSearch()
  const { 
    disjunctiveFacets,
    selectiveFilters,
    activeFilterCount,
    actions: facetActions 
  } = useAdvancedFacets()
  
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      actions.setQuery(searchQuery)
      actions.search(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const formatBreadcrumb = (section: string, subsection?: string) => {
    if (subsection) {
      return (
        <>
          {section} <span>›</span> {subsection}
        </>
      )
    }
    return section
  }

  const highlightText = (text: string, highlight?: string) => {
    if (!highlight) return text
    
    // Parse the highlight HTML and convert to React elements
    const parser = new DOMParser()
    const doc = parser.parseFromString(highlight, 'text/html')
    const content = doc.body.innerHTML
    
    return <span dangerouslySetInnerHTML={{ __html: content }} />
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">Documentation</div>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-box"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <span className="keyboard-shortcut">⌘K</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="error">
          Error: {error.message}
        </div>
      )}

      <div className="main-content">
        <aside className="sidebar">
          {activeFilterCount > 0 && (
            <button 
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '20px',
                background: '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => {
                facetActions.clearAllFilters()
                actions.search()
              }}
            >
              Clear Filters ({activeFilterCount})
            </button>
          )}

          {state.results?.facet_counts?.map((facet) => (
            <div key={facet.field_name} className="filter-section">
              <h3 className="filter-title">
                {state.facets.find(f => f.field === facet.field_name)?.label || facet.field_name}
              </h3>
              {facet.counts.slice(0, 10).map((count) => {
                const isSelect = state.facets.find(f => f.field === facet.field_name)?.type === 'select'
                const isChecked = isSelect 
                  ? selectiveFilters[facet.field_name] === count.value
                  : disjunctiveFacets[facet.field_name]?.includes(count.value)

                return (
                  <div key={count.value} className="filter-item">
                    <input
                      type={isSelect ? 'radio' : 'checkbox'}
                      id={`${facet.field_name}-${count.value}`}
                      name={isSelect ? facet.field_name : undefined}
                      checked={isChecked || false}
                      onChange={() => {
                        if (isSelect) {
                          facetActions.setSelectiveFilter(facet.field_name, count.value)
                        } else {
                          facetActions.toggleFacetValue(facet.field_name, count.value)
                        }
                        actions.search()
                      }}
                    />
                    <label htmlFor={`${facet.field_name}-${count.value}`}>
                      {count.value}
                      <span className="filter-count">({count.count})</span>
                    </label>
                  </div>
                )
              })}
            </div>
          ))}
        </aside>

        <section className="content-area">
          {state.results && (
            <div className="search-stats">
              Found {state.results.found} results
              {state.query && ` for "${state.query}"`}
              {state.results.search_time_ms && ` in ${state.results.search_time_ms}ms`}
            </div>
          )}

          {loading && <div className="loading">Searching documentation...</div>}

          {!loading && state.results && (
            <div className="results-list">
              {state.results.hits && state.results.hits.length > 0 ? (
                state.results.hits.map((hit) => {
                  const doc = hit.document
                  const highlights = hit.highlights || []
                  
                  return (
                    <div key={doc.id} className="result-card">
                      <div className="result-header">
                        <h3 className="result-title">
                          {highlights.find(h => h.field === 'title')
                            ? highlightText(doc.title, highlights.find(h => h.field === 'title')?.snippet)
                            : doc.title}
                        </h3>
                        <span className="result-type">{doc.type}</span>
                      </div>
                      
                      {doc.section && (
                        <div className="result-breadcrumb">
                          {formatBreadcrumb(doc.section, doc.subsection)}
                        </div>
                      )}
                      
                      <div className="result-content">
                        {highlights.find(h => h.field === 'content')
                          ? highlightText(doc.content, highlights.find(h => h.field === 'content')?.snippet)
                          : doc.content.substring(0, 200) + '...'}
                      </div>
                      
                      <div className="result-meta">
                        {doc.version && <span>Version: {doc.version}</span>}
                        {doc.tags && doc.tags.length > 0 && (
                          <span>Tags: {doc.tags.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="no-results">
                  <h3>No results found</h3>
                  <p>Try different keywords or adjust your filters</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default DocumentationSearch