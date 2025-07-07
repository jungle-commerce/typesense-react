import React from 'react'
import { SearchProvider, useSearch } from 'typesense-react'
import { TypesenseConfig } from 'typesense-react'

// Typesense configuration
const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: 'xyz', // Replace with your search-only API key
  connectionTimeoutSeconds: 2
}

// Search component using the useSearch hook
function SearchBox() {
  const { state, actions, loading, error } = useSearch()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setQuery(e.target.value)
    actions.search(e.target.value)
  }

  return (
    <div className="container">
      <h1>Minimal Typesense Search</h1>
      
      <input
        type="text"
        className="search-box"
        placeholder="Search for books..."
        value={state.query}
        onChange={handleSearch}
      />

      {error && (
        <div className="error">
          Error: {error.message}
        </div>
      )}

      {loading && (
        <div className="loading">Searching...</div>
      )}

      {state.results && !loading && (
        <div className="results">
          {state.results.hits && state.results.hits.length > 0 ? (
            state.results.hits.map((hit) => (
              <div key={hit.document.id} className="result-item">
                <div className="result-title">
                  {hit.document.title}
                </div>
                <div className="result-description">
                  by {hit.document.author} • {hit.document.publication_year}
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              No results found for "{state.query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main App component
function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="books"
      initialSearchParams={{
        query_by: 'title,author',
        per_page: 10
      }}
    >
      <SearchBox />
    </SearchProvider>
  )
}

export default App