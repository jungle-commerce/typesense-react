/**
 * @fileoverview Test server utilities for integration tests
 */

import Typesense from 'typesense';
import type { CollectionSchema, TypesenseConfig } from '../../types';

export const TEST_SERVER_CONFIG: TypesenseConfig = {
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 5,
};

export const PRODUCTS_SCHEMA: CollectionSchema = {
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
  ],
  default_sorting_field: 'created_at',
};

export const CATEGORIES_SCHEMA: CollectionSchema = {
  name: 'categories',
  fields: [
    { name: 'id', type: 'string', facet: false },
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'parent_id', type: 'string', facet: true },
    { name: 'path', type: 'string[]', facet: true },
    { name: 'level', type: 'int32', facet: true },
    { name: 'created_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

export const USERS_SCHEMA: CollectionSchema = {
  name: 'users',
  fields: [
    { name: 'id', type: 'string', facet: false },
    { name: 'name', type: 'string', facet: false },
    { name: 'email', type: 'string', facet: false },
    { name: 'role', type: 'string', facet: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'created_at', type: 'int64', facet: false },
  ],
  default_sorting_field: 'created_at',
};

/**
 * Create test client
 */
export function createTestClient() {
  return new Typesense.Client(TEST_SERVER_CONFIG);
}

/**
 * Setup test collections
 */
export async function setupTestCollections(client: Typesense.Client) {
  // Delete existing collections
  const collections = [PRODUCTS_SCHEMA.name, CATEGORIES_SCHEMA.name, USERS_SCHEMA.name];
  
  for (const collectionName of collections) {
    try {
      await client.collections(collectionName).delete();
    } catch (error) {
      // Collection might not exist
    }
  }
  
  // Create collections
  await client.collections().create(PRODUCTS_SCHEMA);
  await client.collections().create(CATEGORIES_SCHEMA);
  await client.collections().create(USERS_SCHEMA);
}

/**
 * Generate test products
 */
export function generateTestProducts(count: number) {
  const categories = ['Electronics', 'Books', 'Clothing', 'Home & Garden', 'Sports'];
  const brands = ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'Generic'];
  const tags = ['new', 'sale', 'popular', 'featured', 'limited', 'exclusive'];
  
  const products = [];
  for (let i = 1; i <= count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const price = Math.round(Math.random() * 1000 * 100) / 100;
    const rating = Math.floor(Math.random() * 5) + 1;
    
    products.push({
      id: `prod-${i}`,
      name: `${brand} Product ${i}`,
      description: `This is a great ${category.toLowerCase()} product from ${brand}`,
      category,
      brand,
      price,
      rating,
      in_stock: Math.random() > 0.2,
      tags: tags.filter(() => Math.random() > 0.7),
      created_at: Math.floor(Date.now() / 1000) - (count - i) * 3600,
    });
  }
  
  return products;
}

/**
 * Generate test categories
 */
export function generateTestCategories() {
  return [
    { id: 'cat-1', name: 'Electronics', description: 'Electronic devices and gadgets', parent_id: '', path: ['Electronics'], level: 0, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-2', name: 'Smartphones', description: 'Mobile phones and accessories', parent_id: 'cat-1', path: ['Electronics', 'Smartphones'], level: 1, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-3', name: 'Laptops', description: 'Portable computers', parent_id: 'cat-1', path: ['Electronics', 'Laptops'], level: 1, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-4', name: 'Books', description: 'Physical and digital books', parent_id: '', path: ['Books'], level: 0, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-5', name: 'Fiction', description: 'Fiction books', parent_id: 'cat-4', path: ['Books', 'Fiction'], level: 1, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-6', name: 'Non-Fiction', description: 'Non-fiction books', parent_id: 'cat-4', path: ['Books', 'Non-Fiction'], level: 1, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-7', name: 'Clothing', description: 'Apparel and accessories', parent_id: '', path: ['Clothing'], level: 0, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-8', name: 'Men', description: 'Men\'s clothing', parent_id: 'cat-7', path: ['Clothing', 'Men'], level: 1, created_at: Math.floor(Date.now() / 1000) },
    { id: 'cat-9', name: 'Women', description: 'Women\'s clothing', parent_id: 'cat-7', path: ['Clothing', 'Women'], level: 1, created_at: Math.floor(Date.now() / 1000) },
  ];
}

/**
 * Generate test users
 */
export function generateTestUsers(count: number) {
  const roles = ['admin', 'user', 'moderator', 'guest'];
  const statuses = ['active', 'inactive', 'pending', 'suspended'];
  
  const users = [];
  for (let i = 1; i <= count; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    users.push({
      id: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role,
      status,
      created_at: Math.floor(Date.now() / 1000) - (count - i) * 3600,
    });
  }
  
  return users;
}

/**
 * Seed test data
 */
export async function seedTestData(client: Typesense.Client, options: { productCount?: number; userCount?: number } = {}) {
  const { productCount = 100, userCount = 50 } = options;
  
  // Import products
  const products = generateTestProducts(productCount);
  await client.collections('products').documents().import(products);
  
  // Import categories
  const categories = generateTestCategories();
  await client.collections('categories').documents().import(categories);
  
  // Import users
  const users = generateTestUsers(userCount);
  await client.collections('users').documents().import(users);
  
  return { products, categories, users };
}

/**
 * Clean up test collections
 */
export async function cleanupTestCollections(client: Typesense.Client) {
  const collections = [PRODUCTS_SCHEMA.name, CATEGORIES_SCHEMA.name, USERS_SCHEMA.name];
  
  for (const collectionName of collections) {
    try {
      await client.collections(collectionName).delete();
    } catch (error) {
      // Collection might not exist
    }
  }
}

/**
 * Wait for indexing to complete
 */
export async function waitForIndexing(ms: number = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}