import type { TypesenseConfig, FacetConfig } from '@jungle-commerce/typesense-react';

export const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: import.meta.env.VITE_TYPESENSE_HOST || 'localhost',
    port: parseInt(import.meta.env.VITE_TYPESENSE_PORT || '8108'),
    protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL || 'http',
  }],
  apiKey: import.meta.env.VITE_TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 2,
};

export const collectionName = import.meta.env.VITE_TYPESENSE_COLLECTION || 'products';

// Example facet configuration
export const facetConfig: FacetConfig[] = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,
    sortBy: 'count'
  },
  {
    field: 'brand',
    label: 'Brand',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 10
  },
  {
    field: 'price',
    label: 'Price',
    type: 'numeric',
    numericDisplay: 'checkbox'
  },
  {
    field: 'rating',
    label: 'Rating',
    type: 'numeric',
    numericDisplay: 'checkbox'
  },
  {
    field: 'in_stock',
    label: 'Availability',
    type: 'select'
  }
];

// Example product schema
export const productSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'category', type: 'string', facet: true },
    { name: 'brand', type: 'string', facet: true },
    { name: 'price', type: 'float', facet: true },
    { name: 'rating', type: 'float', facet: true },
    { name: 'reviews_count', type: 'int32', facet: false },
    { name: 'in_stock', type: 'bool', facet: true },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'created_at', type: 'int64' }
  ],
  default_sorting_field: 'created_at'
};