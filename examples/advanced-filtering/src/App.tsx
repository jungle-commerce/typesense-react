import React, { useState } from 'react';
import { 
  SearchProvider, 
  useSearch, 
  useAdvancedFacets,
  useAccumulatedFacets,
  useNumericFacetRange,
  useFacetMode,
  type SearchHit,
  type FacetConfig
} from '@jungle-commerce/typesense-react';
import { typesenseConfig, collectionName, facetConfig } from './config';
import './styles.css';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  status: string;
  language: string;
  content_type: string;
  word_count: number;
  read_time_minutes: number;
  likes_count: number;
  published_date: number;
  updated_date: number;
  featured: boolean;
  premium: boolean;
}

// Component for numeric range facets
function NumericRangeFacet({ 
  field, 
  label 
}: { 
  field: string; 
  label: string;
}) {
  const facets = useAdvancedFacets();
  const rangeData = useNumericFacetRange(field);
  const { state } = useSearch();
  
  const facetResult = state.results?.facet_counts?.find(f => f.field_name === field);
  const mode = useFacetMode(field, facetResult?.counts || []);
  
  if (!rangeData.bounds) return null;
  
  const handleRangeChange = (min: number, max: number) => {
    facets.actions.setNumericFilter(field, min, max);
  };
  
  const handleClear = () => {
    facets.actions.clearFilter(field, 'numeric');
    rangeData.clearRange();
  };
  
  return (
    <div className="facet numeric-facet">
      <div className="facet-header">
        <h3>{label}</h3>
        {(rangeData.currentRange || facets.numericFilters[field]) && (
          <button onClick={handleClear} className="clear-facet">Clear</button>
        )}
      </div>
      
      {rangeData.mode === 'range' || mode.useRangeForSingleSelect ? (
        <div className="range-controls">
          <div className="range-inputs">
            <input
              type="number"
              value={rangeData.currentRange?.min || rangeData.bounds.min}
              onChange={(e) => handleRangeChange(
                Number(e.target.value),
                rangeData.currentRange?.max || rangeData.bounds.max
              )}
              min={rangeData.bounds.min}
              max={rangeData.bounds.max}
              className="range-input"
            />
            <span>to</span>
            <input
              type="number"
              value={rangeData.currentRange?.max || rangeData.bounds.max}
              onChange={(e) => handleRangeChange(
                rangeData.currentRange?.min || rangeData.bounds.min,
                Number(e.target.value)
              )}
              min={rangeData.bounds.min}
              max={rangeData.bounds.max}
              className="range-input"
            />
          </div>
          <div className="range-info">
            Range: {rangeData.bounds.min} - {rangeData.bounds.max}
          </div>
        </div>
      ) : (
        <div className="facet-values">
          {mode.filteredValues.slice(0, 10).map(value => (
            <label key={value.value} className="facet-value">
              <input
                type="checkbox"
                checked={rangeData.selectedValues.includes(value.value)}
                onChange={() => facets.actions.toggleFacetValue(field, value.value)}
              />
              <span>{value.value}</span>
              <span className="count">({value.count})</span>
            </label>
          ))}
        </div>
      )}
      
      {/* Toggle between modes if configured */}
      {facetResult && (
        <label className="mode-toggle">
          <input
            type="checkbox"
            checked={rangeData.mode === 'range'}
            onChange={(e) => rangeData.setMode(e.target.checked ? 'range' : 'individual')}
          />
          Use range selection
        </label>
      )}
    </div>
  );
}

// Component for date range facets
function DateRangeFacet({ field, label }: { field: string; label: string }) {
  const facets = useAdvancedFacets();
  const dateFilter = facets.dateFilters[field];
  
  const handleDateChange = (start?: string, end?: string) => {
    facets.actions.setDateFilter(field, start, end);
  };
  
  return (
    <div className="facet date-facet">
      <div className="facet-header">
        <h3>{label}</h3>
        {dateFilter && (
          <button onClick={() => facets.actions.clearFilter(field, 'date')} className="clear-facet">
            Clear
          </button>
        )}
      </div>
      <div className="date-inputs">
        <input
          type="date"
          value={dateFilter?.start || ''}
          onChange={(e) => handleDateChange(e.target.value, dateFilter?.end as string)}
          placeholder="Start date"
        />
        <input
          type="date"
          value={dateFilter?.end || ''}
          onChange={(e) => handleDateChange(dateFilter?.start as string, e.target.value)}
          placeholder="End date"
        />
      </div>
    </div>
  );
}

// Component for single-select facets
function SelectFacet({ field, label }: { field: string; label: string }) {
  const { state } = useSearch();
  const facets = useAdvancedFacets();
  const accumulated = useAccumulatedFacets();
  
  const facetResult = state.results?.facet_counts?.find(f => f.field_name === field);
  const values = accumulated.getMergedFacetValues(field);
  const currentValue = facets.selectiveFilters[field];
  
  if (!facetResult) return null;
  
  return (
    <div className="facet select-facet">
      <h3>{label}</h3>
      <select
        value={currentValue || ''}
        onChange={(e) => facets.actions.setSelectiveFilter(field, e.target.value)}
        className="facet-select"
      >
        <option value="">All {label}</option>
        {values.map(value => (
          <option key={value.value} value={value.value}>
            {value.value} ({value.count})
          </option>
        ))}
      </select>
    </div>
  );
}

// Main search interface
function SearchInterface() {
  const { state, actions, loading, error } = useSearch<Article>();
  const facets = useAdvancedFacets();
  const accumulated = useAccumulatedFacets();
  const [showFilters, setShowFilters] = useState(true);
  
  const renderCheckboxFacet = (config: FacetConfig) => {
    const facetResult = state.results?.facet_counts?.find(f => f.field_name === config.field);
    if (!facetResult) return null;
    
    const values = accumulated.getMergedFacetValues(config.field);
    const activeValues = facets.disjunctiveFacets[config.field] || [];
    const mode = useFacetMode(config.field, facetResult.counts);
    
    // Use single-select dropdown if over limit
    if (mode.isSingleSelect && !mode.useRangeForSingleSelect) {
      return <SelectFacet key={config.field} field={config.field} label={config.label} />;
    }
    
    return (
      <div key={config.field} className="facet checkbox-facet">
        <div className="facet-header">
          <h3>{config.label}</h3>
          {activeValues.length > 0 && (
            <button 
              onClick={() => facets.actions.clearFilter(config.field, 'disjunctive')} 
              className="clear-facet"
            >
              Clear ({activeValues.length})
            </button>
          )}
        </div>
        <div className="facet-values">
          {mode.rawValues.slice(0, config.maxValues || 10).map(value => (
            <label key={value.value} className="facet-value">
              <input
                type="checkbox"
                checked={activeValues.includes(value.value)}
                onChange={() => facets.actions.toggleFacetValue(config.field, value.value)}
              />
              <span className={value.count === 0 ? 'zero-count' : ''}>
                {value.value}
              </span>
              <span className="count">({value.count})</span>
            </label>
          ))}
        </div>
        {mode.optionCount > (config.maxValues || 10) && (
          <div className="facet-info">
            Showing {config.maxValues || 10} of {mode.optionCount} options
          </div>
        )}
      </div>
    );
  };
  
  const renderResult = (hit: SearchHit<Article>) => {
    const article = hit.document;
    const publishedDate = new Date(article.published_date * 1000).toLocaleDateString();
    
    return (
      <article key={article.id} className="result">
        <div className="result-header">
          <h3>{article.title}</h3>
          {article.featured && <span className="badge featured">Featured</span>}
          {article.premium && <span className="badge premium">Premium</span>}
        </div>
        
        <p className="excerpt">{article.excerpt}</p>
        
        <div className="result-meta">
          <span className="author">By {article.author}</span>
          <span className="date">{publishedDate}</span>
          <span className="category">{article.category}</span>
          <span className="read-time">{article.read_time_minutes} min read</span>
        </div>
        
        <div className="result-stats">
          <span>👍 {article.likes_count}</span>
          <span>📝 {article.word_count} words</span>
          <span className={`status ${article.status}`}>{article.status}</span>
        </div>
        
        {article.tags && article.tags.length > 0 && (
          <div className="tags">
            {article.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </article>
    );
  };
  
  return (
    <div className="search-interface">
      <header className="header">
        <h1>Advanced Filtering Example</h1>
        <p>Demonstrating all filter types: checkbox, numeric, date, and single-select</p>
      </header>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search articles..."
          value={state.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          className="search-input"
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="toggle-filters"
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>
      
      <div className="filter-options">
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
        <label>
          <input
            type="checkbox"
            checked={accumulated.isReorderByCount}
            onChange={(e) => accumulated.setReorderByCount(e.target.checked)}
          />
          Sort by count
        </label>
        <label>
          Facet limit:
          <input
            type="number"
            value={accumulated.facetOptionLimit}
            onChange={(e) => accumulated.setFacetOptionLimit(Number(e.target.value))}
            min="0"
            max="100"
            style={{ width: '60px', marginLeft: '5px' }}
          />
        </label>
      </div>
      
      <div className="main-content">
        {showFilters && (
          <aside className="sidebar">
            <div className="filters-header">
              <h2>Filters</h2>
              {facets.activeFilterCount > 0 && (
                <button onClick={facets.actions.clearAllFilters} className="clear-all">
                  Clear all ({facets.activeFilterCount})
                </button>
              )}
            </div>
            
            {/* Checkbox facets */}
            {facetConfig
              .filter(config => config.type === 'checkbox')
              .map(config => renderCheckboxFacet(config))}
            
            {/* Numeric facets */}
            {facetConfig
              .filter(config => config.type === 'numeric')
              .map(config => (
                <NumericRangeFacet 
                  key={config.field}
                  field={config.field} 
                  label={config.label} 
                />
              ))}
            
            {/* Date facets */}
            {facetConfig
              .filter(config => config.type === 'date')
              .map(config => (
                <DateRangeFacet 
                  key={config.field}
                  field={config.field} 
                  label={config.label} 
                />
              ))}
            
            {/* Select facets */}
            {facetConfig
              .filter(config => config.type === 'select')
              .map(config => (
                <SelectFacet 
                  key={config.field}
                  field={config.field} 
                  label={config.label} 
                />
              ))}
          </aside>
        )}
        
        <main className={`results-section ${!showFilters ? 'full-width' : ''}`}>
          {loading && <div className="loading">Searching...</div>}
          
          {error && <div className="error">Error: {error.message}</div>}
          
          {state.results && (
            <>
              <div className="results-header">
                <p className="results-count">
                  {state.results.found} results found
                  {state.results.search_time_ms && ` in ${state.results.search_time_ms}ms`}
                </p>
                <select 
                  value={state.sortBy} 
                  onChange={(e) => actions.setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="_text_match:desc">Relevance</option>
                  <option value="published_date:desc">Newest First</option>
                  <option value="published_date:asc">Oldest First</option>
                  <option value="likes_count:desc">Most Popular</option>
                  <option value="read_time_minutes:asc">Quick Reads</option>
                  <option value="word_count:desc">Longest First</option>
                </select>
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
                  <span>
                    Page {state.page} of {Math.ceil(state.results.found / state.perPage)}
                  </span>
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
      accumulateFacets={true}
      initialState={{
        perPage: 10,
        facetOptionLimit: 20,
        hideZeroCountsForSingleSelect: true,
        allowNumericRangeForSingleSelect: true
      }}
    >
      <SearchInterface />
    </SearchProvider>
  );
}

export default App;