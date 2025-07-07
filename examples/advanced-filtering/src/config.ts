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

export const collectionName = import.meta.env.VITE_TYPESENSE_COLLECTION || 'articles';

// Comprehensive facet configuration showing all types
export const facetConfig: FacetConfig[] = [
  // Disjunctive (OR) facets
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,
    sortBy: 'count',
    maxValues: 20
  },
  {
    field: 'tags',
    label: 'Tags',
    type: 'checkbox',
    disjunctive: true,
    searchable: true,
    expanded: true
  },
  {
    field: 'author',
    label: 'Author',
    type: 'checkbox',
    disjunctive: true,
    maxValues: 15
  },
  
  // Numeric facets
  {
    field: 'word_count',
    label: 'Article Length',
    type: 'numeric',
    numericDisplay: 'both', // Shows both checkboxes and range option
    rangeStep: 100
  },
  {
    field: 'read_time_minutes',
    label: 'Read Time (minutes)',
    type: 'numeric',
    numericDisplay: 'range',
    rangeStep: 1
  },
  {
    field: 'likes_count',
    label: 'Popularity',
    type: 'numeric',
    numericDisplay: 'checkbox'
  },
  
  // Date facets
  {
    field: 'published_date',
    label: 'Published Date',
    type: 'date',
    dateFormat: 'YYYY-MM-DD'
  },
  {
    field: 'updated_date',
    label: 'Last Updated',
    type: 'date',
    dateFormat: 'YYYY-MM-DD'
  },
  
  // Single-select facets
  {
    field: 'status',
    label: 'Status',
    type: 'select'
  },
  {
    field: 'language',
    label: 'Language',
    type: 'select'
  },
  {
    field: 'content_type',
    label: 'Content Type',
    type: 'select'
  }
];

// Example article schema
export const articleSchema = {
  name: 'articles',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string', facet: false },
    { name: 'content', type: 'string', facet: false },
    { name: 'excerpt', type: 'string', facet: false },
    { name: 'category', type: 'string', facet: true },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'author', type: 'string', facet: true },
    { name: 'author_id', type: 'string', facet: false },
    { name: 'status', type: 'string', facet: true },
    { name: 'language', type: 'string', facet: true },
    { name: 'content_type', type: 'string', facet: true },
    { name: 'word_count', type: 'int32', facet: true },
    { name: 'read_time_minutes', type: 'int32', facet: true },
    { name: 'likes_count', type: 'int32', facet: true },
    { name: 'comments_count', type: 'int32', facet: true },
    { name: 'published_date', type: 'int64', facet: true },
    { name: 'updated_date', type: 'int64', facet: true },
    { name: 'featured', type: 'bool', facet: true },
    { name: 'premium', type: 'bool', facet: true }
  ],
  default_sorting_field: 'published_date'
};