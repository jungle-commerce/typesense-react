import React, { useEffect } from 'react'
import { SearchProvider } from 'typesense-react'
import { TypesenseConfig, FacetConfig } from 'typesense-react'
import DocumentationSearch from './components/DocumentationSearch'

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

// Facet configuration for documentation
const facetConfig: FacetConfig[] = [
  {
    field: 'section',
    label: 'Documentation Section',
    type: 'checkbox',
    disjunctive: true,
    sortBy: 'value'
  },
  {
    field: 'type',
    label: 'Content Type',
    type: 'checkbox',
    disjunctive: true,
    sortBy: 'count'
  },
  {
    field: 'tags',
    label: 'Tags',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 20,
    searchable: true
  },
  {
    field: 'version',
    label: 'Version',
    type: 'select',
    sortBy: 'value'
  }
]

function App() {
  // Add keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('.search-box') as HTMLInputElement
        searchInput?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <SearchProvider
      config={typesenseConfig}
      collection="documentation"
      initialSearchParams={{
        query_by: 'title,content,tags',
        per_page: 20,
        facet_by: 'section,type,tags,version',
        max_facet_values: 50,
        highlight_fields: 'title,content',
        highlight_full_fields: 'title,content',
        highlight_affix_num_tokens: 8,
        snippet_threshold: 30
      }}
      facets={facetConfig}
    >
      <DocumentationSearch />
    </SearchProvider>
  )
}

export default App