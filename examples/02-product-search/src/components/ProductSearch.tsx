import React from 'react'
import { useSearch, useAdvancedFacets, useNumericFacetRange } from 'typesense-react'

function ProductSearch() {
  const { state, actions, loading, error } = useSearch()
  const { 
    disjunctiveFacets, 
    numericFilters,
    activeFilterCount,
    actions: facetActions 
  } = useAdvancedFacets()
  
  const priceRange = useNumericFacetRange('price')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setQuery(e.target.value)
    actions.search(e.target.value)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    actions.setSortBy(e.target.value)
    actions.search()
  }

  const handlePriceRangeChange = () => {
    const minInput = document.getElementById('price-min') as HTMLInputElement
    const maxInput = document.getElementById('price-max') as HTMLInputElement
    
    const min = minInput.value ? parseFloat(minInput.value) : undefined
    const max = maxInput.value ? parseFloat(maxInput.value) : undefined
    
    facetActions.setNumericFilter('price', min, max)
    actions.search()
  }

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating))
  }

  return (
    <div>
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Product Search</h1>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for products..."
              value={state.query}
              onChange={handleSearch}
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="error">
          Error: {error.message}
        </div>
      )}

      <div className="main-content">
        <aside className="filters-sidebar">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Filters</h2>
          
          {activeFilterCount > 0 && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                facetActions.clearAllFilters()
                actions.search()
              }}
            >
              Clear All Filters ({activeFilterCount})
            </button>
          )}

          {/* Price Range Filter */}
          {priceRange.bounds && (
            <div className="filter-section">
              <h3 className="filter-title">Price Range</h3>
              <div className="price-range">
                <input
                  id="price-min"
                  type="number"
                  className="price-input"
                  placeholder={`Min $${priceRange.bounds.min}`}
                  defaultValue={numericFilters.price?.min}
                  onBlur={handlePriceRangeChange}
                />
                <span>-</span>
                <input
                  id="price-max"
                  type="number"
                  className="price-input"
                  placeholder={`Max $${priceRange.bounds.max}`}
                  defaultValue={numericFilters.price?.max}
                  onBlur={handlePriceRangeChange}
                />
              </div>
            </div>
          )}

          {/* Dynamic Facets */}
          {state.results?.facet_counts?.map((facet) => {
            if (facet.field_name === 'price') return null // Already handled above
            
            return (
              <div key={facet.field_name} className="filter-section">
                <h3 className="filter-title">
                  {state.facets.find(f => f.field === facet.field_name)?.label || facet.field_name}
                </h3>
                {facet.counts.map((count) => (
                  <div key={count.value} className="filter-option">
                    <input
                      type="checkbox"
                      id={`${facet.field_name}-${count.value}`}
                      checked={disjunctiveFacets[facet.field_name]?.includes(count.value) || false}
                      onChange={() => {
                        facetActions.toggleFacetValue(facet.field_name, count.value)
                        actions.search()
                      }}
                    />
                    <label htmlFor={`${facet.field_name}-${count.value}`}>
                      {state.facets.find(f => f.field === facet.field_name)?.renderLabel?.(count.value) || count.value}
                      <span className="filter-count">({count.count})</span>
                    </label>
                  </div>
                ))}
              </div>
            )
          })}
        </aside>

        <section className="results-section">
          <div className="results-header">
            <div className="results-count">
              {state.results && (
                <span>
                  {state.results.found} products found
                  {state.query && ` for "${state.query}"`}
                </span>
              )}
            </div>
            <select 
              className="sort-select"
              value={state.sortBy}
              onChange={handleSortChange}
            >
              <option value="_text_match:desc,rating:desc">Relevance</option>
              <option value="price:asc">Price: Low to High</option>
              <option value="price:desc">Price: High to Low</option>
              <option value="rating:desc">Highest Rated</option>
              <option value="created_at:desc">Newest First</option>
            </select>
          </div>

          {loading && <div className="loading">Loading products...</div>}

          {!loading && state.results && (
            <>
              {state.results.hits && state.results.hits.length > 0 ? (
                <>
                  <div className="products-grid">
                    {state.results.hits.map((hit) => (
                      <div key={hit.document.id} className="product-card">
                        <img 
                          src={hit.document.image || 'https://via.placeholder.com/250x200?text=No+Image'} 
                          alt={hit.document.name}
                          className="product-image"
                        />
                        <div className="product-info">
                          <h3 className="product-name">{hit.document.name}</h3>
                          <p className="product-brand">{hit.document.brand}</p>
                          <p className="product-price">${hit.document.price}</p>
                          {hit.document.rating && (
                            <div className="product-rating">
                              <span className="stars">{renderStars(hit.document.rating)}</span>
                              <span className="rating-count">({hit.document.review_count || 0})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {state.results.found > state.perPage && (
                    <div className="pagination">
                      <button
                        disabled={state.page === 1}
                        onClick={() => {
                          actions.setPage(state.page - 1)
                          actions.search()
                        }}
                      >
                        Previous
                      </button>
                      <span className="current-page">
                        Page {state.page} of {Math.ceil(state.results.found / state.perPage)}
                      </span>
                      <button
                        disabled={state.page >= Math.ceil(state.results.found / state.perPage)}
                        onClick={() => {
                          actions.setPage(state.page + 1)
                          actions.search()
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-results">
                  <h3>No products found</h3>
                  <p>Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default ProductSearch