import React from 'react';
import { 
  SearchProvider, 
  useSearch, 
  useAdvancedFacets,
  useAccumulatedFacets,
  type SearchHit
} from '@jungle-commerce/typesense-react';
import { typesenseConfig, collectionName, facetConfig } from './config';
import './styles.css';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  reviews_count: number;
  in_stock: boolean;
  tags?: string[];
}

function SearchInterface() {
  const { state, actions, loading, error } = useSearch<Product>();
  const facets = useAdvancedFacets();
  const accumulated = useAccumulatedFacets();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setQuery(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    actions.setSortBy(e.target.value);
  };

  const renderFacet = (facetName: string) => {
    const facetData = state.results?.facet_counts?.find(f => f.field_name === facetName);
    const facetConfigItem = facetConfig.find(f => f.field === facetName);
    
    if (!facetData || !facetConfigItem) return null;

    const values = accumulated.getMergedFacetValues(facetName);
    const activeValues = facets.disjunctiveFacets[facetName] || [];

    return (
      <div key={facetName} className="facet">
        <h3>{facetConfigItem.label}</h3>
        <div className="facet-values">
          {values.slice(0, 10).map(value => (
            <label key={value.value} className="facet-value">
              <input
                type="checkbox"
                checked={activeValues.includes(value.value)}
                onChange={() => facets.actions.toggleFacetValue(facetName, value.value)}
              />
              <span className={value.count === 0 ? 'zero-count' : ''}>
                {value.value}
              </span>
              <span className="count">({value.count})</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderResult = (hit: SearchHit<Product>) => {
    const product = hit.document;
    return (
      <div key={product.id} className="result">
        <h3>{product.name}</h3>
        <p className="description">{product.description}</p>
        <div className="result-meta">
          <span className="price">${product.price.toFixed(2)}</span>
          <span className="rating">★ {product.rating.toFixed(1)}</span>
          <span className="category">{product.category}</span>
          <span className={`stock ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
            {product.in_stock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="search-interface">
      <header className="header">
        <h1>Basic Search Example</h1>
        <p>Search products with faceted filtering</p>
      </header>

      <div className="search-controls">
        <input
          type="text"
          placeholder="Search products..."
          value={state.query}
          onChange={handleSearchChange}
          className="search-input"
        />
        
        <select value={state.sortBy} onChange={handleSortChange} className="sort-select">
          <option value="_text_match:desc">Relevance</option>
          <option value="price:asc">Price: Low to High</option>
          <option value="price:desc">Price: High to Low</option>
          <option value="rating:desc">Rating: High to Low</option>
          <option value="created_at:desc">Newest First</option>
        </select>
      </div>

      <div className="facet-options">
        <label>
          <input
            type="checkbox"
            checked={accumulated.isAccumulatingFacets}
            onChange={(e) => accumulated.setAccumulateFacets(e.target.checked)}
          />
          Keep all filter options
        </label>
        <label>
          <input
            type="checkbox"
            checked={accumulated.isMoveSelectedToTop}
            onChange={(e) => accumulated.setMoveSelectedToTop(e.target.checked)}
          />
          Show selected first
        </label>
      </div>

      <div className="main-content">
        <aside className="sidebar">
          <div className="filters-header">
            <h2>Filters</h2>
            {facets.activeFilterCount > 0 && (
              <button onClick={facets.actions.clearAllFilters} className="clear-filters">
                Clear all ({facets.activeFilterCount})
              </button>
            )}
          </div>
          
          {facetConfig.map(config => renderFacet(config.field))}
        </aside>

        <main className="results-section">
          {loading && <div className="loading">Searching...</div>}
          
          {error && (
            <div className="error">
              Error: {error.message}
            </div>
          )}
          
          {state.results && (
            <>
              <div className="results-header">
                <p className="results-count">
                  Found {state.results.found} results 
                  {state.results.search_time_ms && ` in ${state.results.search_time_ms}ms`}
                </p>
              </div>
              
              <div className="results">
                {state.results.hits?.map(renderResult)}
              </div>
              
              {state.results.found > state.perPage && (
                <div className="pagination">
                  <button 
                    onClick={() => actions.setPage(state.page - 1)}
                    disabled={state.page === 1}
                  >
                    Previous
                  </button>
                  <span>Page {state.page} of {Math.ceil(state.results.found / state.perPage)}</span>
                  <button 
                    onClick={() => actions.setPage(state.page + 1)}
                    disabled={state.page >= Math.ceil(state.results.found / state.perPage)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
          
          {!loading && !error && state.results?.found === 0 && (
            <div className="no-results">
              <p>No results found for "{state.query}"</p>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection={collectionName}
      facets={facetConfig}
      searchOnMount={true}
      accumulateFacets={false}
    >
      <SearchInterface />
    </SearchProvider>
  );
}

export default App;