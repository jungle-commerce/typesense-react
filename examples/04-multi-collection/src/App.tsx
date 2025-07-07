import React from 'react'
import { MultiCollectionProvider } from 'typesense-react'
import { TypesenseConfig } from 'typesense-react'
import MultiCollectionSearch from './components/MultiCollectionSearch'

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

function App() {
  return (
    <MultiCollectionProvider config={typesenseConfig}>
      <MultiCollectionSearch />
    </MultiCollectionProvider>
  )
}

export default App