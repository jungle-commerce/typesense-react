/**
 * @fileoverview Mock data for tests
 */

import type { TypesenseConfig, CollectionSchema, TypesenseSearchResponse, FacetConfig } from '../types';

export const mockTypesenseConfig: TypesenseConfig = {
  nodes: [
    {
      host: 'localhost',
      port: 8108,
      protocol: 'http',
    },
  ],
  apiKey: 'test-api-key',
  connectionTimeoutSeconds: 2,
};

export const mockSchema: CollectionSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string', facet: false },
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'category', type: 'string', facet: true },
    { name: 'brand', type: 'string', facet: true },
    { name: 'price', type: 'float', facet: true },
    { name: 'rating', type: 'int32', facet: true },
    { name: 'in_stock', type: 'bool', facet: true },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'created_at', type: 'int64', facet: true },
    { name: 'updated_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

export const mockSearchResponse: TypesenseSearchResponse = {
  facet_counts: [
    {
      field_name: 'category',
      counts: [
        { value: 'Electronics', count: 45 },
        { value: 'Books', count: 32 },
        { value: 'Clothing', count: 28 },
      ],
    },
    {
      field_name: 'brand',
      counts: [
        { value: 'Apple', count: 12 },
        { value: 'Samsung', count: 8 },
        { value: 'Sony', count: 5 },
      ],
    },
  ],
  found: 100,
  hits: [
    {
      document: {
        id: '1',
        name: 'iPhone 13',
        description: 'Latest iPhone model',
        category: 'Electronics',
        brand: 'Apple',
        price: 799.99,
        rating: 5,
        in_stock: true,
        tags: ['smartphone', 'ios'],
        created_at: 1640995200,
        updated_at: 1640995200,
      },
      highlight: {
        name: { snippet: '<mark>iPhone</mark> 13' },
      },
      text_match: 123456,
    },
    {
      document: {
        id: '2',
        name: 'Samsung Galaxy S21',
        description: 'Android smartphone',
        category: 'Electronics',
        brand: 'Samsung',
        price: 699.99,
        rating: 4,
        in_stock: true,
        tags: ['smartphone', 'android'],
        created_at: 1640908800,
        updated_at: 1640908800,
      },
      highlight: {
        name: { snippet: 'Samsung Galaxy S21' },
      },
      text_match: 123455,
    },
  ],
  out_of: 1000,
  page: 1,
  request_params: {
    collection_name: 'products',
    per_page: 10,
    q: '*',
  },
  search_cutoff: false,
  search_time_ms: 5,
};

export const mockFacetConfig: FacetConfig[] = [
  {
    field: 'category',
    label: 'Category',
    type: 'checkbox',
    disjunctive: true,
  },
  {
    field: 'price',
    label: 'Price',
    type: 'numeric',
    numericDisplay: 'range',
  },
  {
    field: 'brand',
    label: 'Brand',
    type: 'select',
  },
  {
    field: 'created_at',
    label: 'Date Added',
    type: 'date',
  },
];

export const mockMultiCollectionSearchResponse = {
  hits: [
    {
      document: { id: '1', name: 'Product 1' },
      highlight: {},
      text_match: 100,
      _collection: 'products',
      _collectionRank: 1,
      _originalScore: 100,
      _normalizedScore: 1.0,
      _mergedScore: 1.0,
      _collectionWeight: 1.0,
    },
    {
      document: { id: '1', name: 'Category 1' },
      highlight: {},
      text_match: 90,
      _collection: 'categories',
      _collectionRank: 1,
      _originalScore: 90,
      _normalizedScore: 0.9,
      _mergedScore: 0.9,
      _collectionWeight: 1.0,
    },
  ],
  found: 75,
  totalFoundByCollection: {
    products: 50,
    categories: 25,
  },
  includedByCollection: {
    products: 1,
    categories: 1,
  },
  searchTimeMs: 5,
  searchTimeByCollection: {
    products: 3,
    categories: 2,
  },
  query: 'test',
  resultMode: 'interleaved' as const,
};