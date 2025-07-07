import type { TypesenseConfig, CollectionSearchConfig } from '@jungle-commerce/typesense-react';

export const typesenseConfig: TypesenseConfig = {
  nodes: [{
    host: import.meta.env.VITE_TYPESENSE_HOST || 'localhost',
    port: parseInt(import.meta.env.VITE_TYPESENSE_PORT || '8108'),
    protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL || 'http',
  }],
  apiKey: import.meta.env.VITE_TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 2,
};

// Define collections to search across
export const defaultCollections: CollectionSearchConfig[] = [
  {
    collection: 'products',
    namespace: 'product',
    queryBy: 'name,description,brand',
    sortBy: '_text_match:desc,rating:desc',
    maxResults: 20,
    weight: 1.5,  // Products are more important
    includeFacets: true,
    facetBy: 'category,brand,price',
    includeFields: 'id,name,description,price,rating,image_url,category,brand'
  },
  {
    collection: 'categories',
    namespace: 'category',
    queryBy: 'name,description',
    sortBy: '_text_match:desc',
    maxResults: 10,
    weight: 1.0,
    includeFields: 'id,name,description,parent_category,product_count'
  },
  {
    collection: 'brands',
    namespace: 'brand',
    queryBy: 'name,description',
    sortBy: '_text_match:desc,popularity:desc',
    maxResults: 5,
    weight: 0.8,
    includeFields: 'id,name,description,logo_url,website'
  },
  {
    collection: 'articles',
    namespace: 'article',
    queryBy: 'title,content,excerpt',
    sortBy: '_text_match:desc,published_date:desc',
    maxResults: 15,
    weight: 0.6,
    includeFields: 'id,title,excerpt,author,published_date,category'
  }
];

// Example schemas for reference
export const schemas = {
  products: {
    name: 'products',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'brand', type: 'string', facet: true },
      { name: 'category', type: 'string', facet: true },
      { name: 'price', type: 'float', facet: true },
      { name: 'rating', type: 'float' },
      { name: 'image_url', type: 'string' }
    ]
  },
  categories: {
    name: 'categories',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'parent_category', type: 'string' },
      { name: 'product_count', type: 'int32' }
    ]
  },
  brands: {
    name: 'brands',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'logo_url', type: 'string' },
      { name: 'website', type: 'string' },
      { name: 'popularity', type: 'int32' }
    ]
  },
  articles: {
    name: 'articles',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'excerpt', type: 'string' },
      { name: 'author', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'published_date', type: 'int64' }
    ]
  }
};