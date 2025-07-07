import React from 'react'
import { SearchProvider } from 'typesense-react'
import { TypesenseConfig, FacetConfig } from 'typesense-react'
import ProductSearch from './components/ProductSearch'

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

// Facet configuration for e-commerce
const facetConfig: FacetConfig[] = [
  {
    field: 'brand',
    label: 'Brand',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 10,
    sortBy: 'count'
  },
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 10,
    sortBy: 'count'
  },
  {
    field: 'price',
    label: 'Price',
    type: 'numeric',
    numericDisplay: 'range'
  },
  {
    field: 'rating',
    label: 'Customer Rating',
    type: 'checkbox',
    disjunctive: true,
    renderLabel: (value) => `${value} stars & up`
  },
  {
    field: 'in_stock',
    label: 'Availability',
    type: 'checkbox',
    renderLabel: (value) => value === 'true' ? 'In Stock' : 'Out of Stock'
  }
]

function App() {
  return (
    <SearchProvider
      config={typesenseConfig}
      collection="products"
      initialSearchParams={{
        query_by: 'name,description,brand,category',
        per_page: 12,
        facet_by: 'brand,category,price,rating,in_stock',
        max_facet_values: 20,
        sort_by: '_text_match:desc,rating:desc'
      }}
      facets={facetConfig}
      searchOnMount={true}
    >
      <ProductSearch />
    </SearchProvider>
  )
}

export default App