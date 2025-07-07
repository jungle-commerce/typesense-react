/**
 * @fileoverview Test data seeding utilities for integration tests
 * Provides functions to seed Typesense collections with consistent test data
 */

import type { Client } from 'typesense';
import { generators, testDatasets } from './fixtures/testData';
import { 
  productsSchema, 
  categoriesSchema, 
  usersSchema,
  blogsSchema,
  authorsSchema,
  commentsSchema,
  moviesSchema,
  actorsSchema,
  genresSchema,
  propertiesSchema
} from './fixtures/schemas';

/**
 * Collection seeding configuration
 */
export interface SeedConfig {
  size?: 'small' | 'medium' | 'large';
  includeEdgeCases?: boolean;
  collections?: string[];
}

/**
 * Seed result information
 */
export interface SeedResult {
  collection: string;
  documentsCreated: number;
  timeMs: number;
  errors?: any[];
}

/**
 * Base seeder class
 */
export class CollectionSeeder {
  constructor(private client: Client) {}

  /**
   * Create collection if it doesn't exist
   */
  async ensureCollection(schema: any): Promise<void> {
    try {
      await this.client.collections(schema.name).retrieve();
      console.log(`Collection ${schema.name} already exists`);
    } catch (error: any) {
      if (error.httpStatus === 404) {
        console.log(`Creating collection ${schema.name}...`);
        await this.client.collections().create(schema);
      } else {
        throw error;
      }
    }
  }

  /**
   * Seed documents in batches
   */
  async seedDocuments(
    collectionName: string, 
    documents: any[], 
    batchSize: number = 100
  ): Promise<{ created: number; errors: any[] }> {
    const errors: any[] = [];
    let created = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      try {
        const result = await this.client
          .collections(collectionName)
          .documents()
          .import(batch, { action: 'create' });
        
        created += result.filter(r => r.success).length;
        errors.push(...result.filter(r => !r.success));
      } catch (error) {
        console.error(`Error seeding batch ${i / batchSize + 1}:`, error);
        errors.push({ batch: i / batchSize + 1, error });
      }
    }

    return { created, errors };
  }

  /**
   * Clear collection data
   */
  async clearCollection(collectionName: string): Promise<void> {
    try {
      await this.client.collections(collectionName).documents().delete({
        filter_by: 'id:!=null'
      });
    } catch (error) {
      console.error(`Error clearing collection ${collectionName}:`, error);
    }
  }
}

/**
 * E-commerce data seeder
 */
export class EcommerceSeeder extends CollectionSeeder {
  async seed(size: 'small' | 'medium' | 'large' = 'small'): Promise<SeedResult[]> {
    const results: SeedResult[] = [];
    const startTime = Date.now();

    // Seed products
    await this.ensureCollection(productsSchema);
    const products = testDatasets[size].ecommerce();
    const productResult = await this.seedDocuments('products', products);
    results.push({
      collection: 'products',
      documentsCreated: productResult.created,
      timeMs: Date.now() - startTime,
      errors: productResult.errors
    });

    // Seed categories (always small dataset)
    const categoriesStartTime = Date.now();
    await this.ensureCollection(categoriesSchema);
    const categories = this.generateCategories();
    const categoryResult = await this.seedDocuments('categories', categories);
    results.push({
      collection: 'categories',
      documentsCreated: categoryResult.created,
      timeMs: Date.now() - categoriesStartTime,
      errors: categoryResult.errors
    });

    // Seed users
    const usersStartTime = Date.now();
    await this.ensureCollection(usersSchema);
    const userCount = size === 'small' ? 10 : size === 'medium' ? 50 : 200;
    const users = this.generateUsers(userCount);
    const userResult = await this.seedDocuments('users', users);
    results.push({
      collection: 'users',
      documentsCreated: userResult.created,
      timeMs: Date.now() - usersStartTime,
      errors: userResult.errors
    });

    return results;
  }

  private generateCategories(): any[] {
    const categories = [
      { id: 'cat_1', name: 'Electronics', slug: 'electronics', parent_id: null, level: 0 },
      { id: 'cat_2', name: 'Clothing', slug: 'clothing', parent_id: null, level: 0 },
      { id: 'cat_3', name: 'Home & Kitchen', slug: 'home-kitchen', parent_id: null, level: 0 },
      { id: 'cat_4', name: 'Books', slug: 'books', parent_id: null, level: 0 },
      { id: 'cat_5', name: 'Sports & Outdoors', slug: 'sports-outdoors', parent_id: null, level: 0 },
      { id: 'cat_6', name: 'Laptops', slug: 'laptops', parent_id: 'cat_1', level: 1 },
      { id: 'cat_7', name: 'Smartphones', slug: 'smartphones', parent_id: 'cat_1', level: 1 },
      { id: 'cat_8', name: "Men's Clothing", slug: 'mens-clothing', parent_id: 'cat_2', level: 1 },
      { id: 'cat_9', name: "Women's Clothing", slug: 'womens-clothing', parent_id: 'cat_2', level: 1 },
      { id: 'cat_10', name: 'Kitchen Appliances', slug: 'kitchen-appliances', parent_id: 'cat_3', level: 1 }
    ];
    
    return categories.map(cat => ({
      ...cat,
      description: `Browse our selection of ${cat.name}`,
      product_count: generators.ecommerce.randomInt(10, 500),
      featured: Math.random() > 0.7,
      image_url: 'https://via.placeholder.com/300x200',
      created_at: generators.ecommerce.dateTimestamp(365),
      updated_at: generators.ecommerce.dateTimestamp(30)
    }));
  }

  private generateUsers(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `user_${i + 1}`,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      full_name: `Test User ${i + 1}`,
      role: i === 0 ? 'admin' : Math.random() > 0.9 ? 'premium' : 'standard',
      verified: Math.random() > 0.2,
      active: Math.random() > 0.1,
      preferences: {
        newsletter: Math.random() > 0.5,
        notifications: Math.random() > 0.5,
        language: generators.ecommerce.pickRandom(['en', 'es', 'fr', 'de'], 1)[0]
      },
      orders_count: generators.ecommerce.randomInt(0, 50),
      total_spent: generators.ecommerce.randomFloat(0, 5000),
      last_login: generators.ecommerce.dateTimestamp(generators.ecommerce.randomInt(0, 30)),
      created_at: generators.ecommerce.dateTimestamp(generators.ecommerce.randomInt(30, 730)),
      tags: generators.ecommerce.pickRandom(['loyal', 'new', 'vip', 'inactive'], generators.ecommerce.randomInt(0, 2))
    }));
  }
}

/**
 * Blog data seeder
 */
export class BlogSeeder extends CollectionSeeder {
  async seed(size: 'small' | 'medium' | 'large' = 'small'): Promise<SeedResult[]> {
    const results: SeedResult[] = [];
    const blogData = testDatasets[size].blog();

    // Seed authors
    const authorsStartTime = Date.now();
    await this.ensureCollection(authorsSchema);
    const authorResult = await this.seedDocuments('authors', blogData.authors);
    results.push({
      collection: 'authors',
      documentsCreated: authorResult.created,
      timeMs: Date.now() - authorsStartTime,
      errors: authorResult.errors
    });

    // Seed blog posts
    const blogsStartTime = Date.now();
    await this.ensureCollection(blogsSchema);
    const blogResult = await this.seedDocuments('blogs', blogData.posts);
    results.push({
      collection: 'blogs',
      documentsCreated: blogResult.created,
      timeMs: Date.now() - blogsStartTime,
      errors: blogResult.errors
    });

    // Seed comments
    const commentsStartTime = Date.now();
    await this.ensureCollection(commentsSchema);
    const commentResult = await this.seedDocuments('comments', blogData.comments);
    results.push({
      collection: 'comments',
      documentsCreated: commentResult.created,
      timeMs: Date.now() - commentsStartTime,
      errors: commentResult.errors
    });

    return results;
  }
}

/**
 * Movies data seeder
 */
export class MoviesSeeder extends CollectionSeeder {
  async seed(size: 'small' | 'medium' | 'large' = 'small'): Promise<SeedResult[]> {
    const results: SeedResult[] = [];
    const moviesData = testDatasets[size].movies();

    // Seed actors
    const actorsStartTime = Date.now();
    await this.ensureCollection(actorsSchema);
    const actorResult = await this.seedDocuments('actors', moviesData.actors);
    results.push({
      collection: 'actors',
      documentsCreated: actorResult.created,
      timeMs: Date.now() - actorsStartTime,
      errors: actorResult.errors
    });

    // Seed genres
    const genresStartTime = Date.now();
    await this.ensureCollection(genresSchema);
    const genreResult = await this.seedDocuments('genres', moviesData.genres);
    results.push({
      collection: 'genres',
      documentsCreated: genreResult.created,
      timeMs: Date.now() - genresStartTime,
      errors: genreResult.errors
    });

    // Seed movies
    const moviesStartTime = Date.now();
    await this.ensureCollection(moviesSchema);
    const movieResult = await this.seedDocuments('movies', moviesData.movies);
    results.push({
      collection: 'movies',
      documentsCreated: movieResult.created,
      timeMs: Date.now() - moviesStartTime,
      errors: movieResult.errors
    });

    return results;
  }
}

/**
 * Real estate data seeder
 */
export class RealEstateSeeder extends CollectionSeeder {
  async seed(size: 'small' | 'medium' | 'large' = 'small'): Promise<SeedResult[]> {
    const results: SeedResult[] = [];
    const startTime = Date.now();

    await this.ensureCollection(propertiesSchema);
    const properties = testDatasets[size].realEstate();
    const result = await this.seedDocuments('properties', properties);
    
    results.push({
      collection: 'properties',
      documentsCreated: result.created,
      timeMs: Date.now() - startTime,
      errors: result.errors
    });

    return results;
  }
}

/**
 * Edge case data seeder
 */
export class EdgeCaseSeeder extends CollectionSeeder {
  async seedEdgeCases(collectionName: string): Promise<SeedResult> {
    const startTime = Date.now();
    const edgeCases = this.generateEdgeCaseDocuments(collectionName);
    const result = await this.seedDocuments(collectionName, edgeCases);
    
    return {
      collection: `${collectionName}_edge_cases`,
      documentsCreated: result.created,
      timeMs: Date.now() - startTime,
      errors: result.errors
    };
  }

  private generateEdgeCaseDocuments(collectionName: string): any[] {
    const docs: any[] = [];
    
    // Documents with empty/null values
    if (collectionName === 'products') {
      docs.push(
        generators.edgeCase.generateWithEmptyValues(
          () => generators.ecommerce.generateProduct(),
          ['description', 'tags', 'colors']
        ),
        generators.edgeCase.generateWithNullValues(
          () => generators.ecommerce.generateProduct(),
          ['subcategory', 'discount_percentage', 'sizes']
        )
      );
    }

    // Documents with extreme values
    docs.push(
      generators.edgeCase.generateWithExtremeValues(
        () => this.getBaseGenerator(collectionName),
        {
          numberFields: [
            { field: 'price', value: 0.01 },
            { field: 'price', value: 999999.99 },
            { field: 'inventory_count', value: 0 },
            { field: 'inventory_count', value: 10000 }
          ],
          stringFields: [
            { field: 'name', length: 1 },
            { field: 'name', length: 500 },
            { field: 'description', length: 5000 }
          ],
          arrayFields: [
            { field: 'tags', count: 0 },
            { field: 'tags', count: 50 }
          ]
        }
      )
    );

    // Documents with special characters
    docs.push(
      generators.edgeCase.generateWithSpecialCharacters(
        () => this.getBaseGenerator(collectionName),
        ['name', 'description', 'brand']
      )
    );

    return docs;
  }

  private getBaseGenerator(collectionName: string): any {
    switch (collectionName) {
      case 'products':
        return generators.ecommerce.generateProduct();
      case 'blogs':
        return generators.blog.generatePost([{ id: 'author_1', name: 'Test Author' }]);
      case 'movies':
        return generators.movies.generateMovie([{ name: 'Test Actor' }]);
      case 'properties':
        return generators.realEstate.generateProperty();
      default:
        return {};
    }
  }
}

/**
 * Main seeding orchestrator
 */
export class TestDataSeeder {
  private ecommerceSeeder: EcommerceSeeder;
  private blogSeeder: BlogSeeder;
  private moviesSeeder: MoviesSeeder;
  private realEstateSeeder: RealEstateSeeder;
  private edgeCaseSeeder: EdgeCaseSeeder;

  constructor(private client: Client) {
    this.ecommerceSeeder = new EcommerceSeeder(client);
    this.blogSeeder = new BlogSeeder(client);
    this.moviesSeeder = new MoviesSeeder(client);
    this.realEstateSeeder = new RealEstateSeeder(client);
    this.edgeCaseSeeder = new EdgeCaseSeeder(client);
  }

  /**
   * Seed all collections with test data
   */
  async seedAll(config: SeedConfig = {}): Promise<SeedResult[]> {
    const { 
      size = 'small', 
      includeEdgeCases = false,
      collections = ['ecommerce', 'blog', 'movies', 'realestate']
    } = config;

    console.log(`\nSeeding test data (size: ${size})...\n`);
    const results: SeedResult[] = [];

    if (collections.includes('ecommerce')) {
      console.log('Seeding e-commerce data...');
      results.push(...await this.ecommerceSeeder.seed(size));
    }

    if (collections.includes('blog')) {
      console.log('Seeding blog data...');
      results.push(...await this.blogSeeder.seed(size));
    }

    if (collections.includes('movies')) {
      console.log('Seeding movies data...');
      results.push(...await this.moviesSeeder.seed(size));
    }

    if (collections.includes('realestate')) {
      console.log('Seeding real estate data...');
      results.push(...await this.realEstateSeeder.seed(size));
    }

    if (includeEdgeCases) {
      console.log('Seeding edge case data...');
      for (const collection of ['products', 'blogs', 'movies', 'properties']) {
        if (collections.some(c => collection.includes(c))) {
          results.push(await this.edgeCaseSeeder.seedEdgeCases(collection));
        }
      }
    }

    // Print summary
    console.log('\n--- Seeding Summary ---');
    let totalDocs = 0;
    let totalTime = 0;
    let totalErrors = 0;

    for (const result of results) {
      totalDocs += result.documentsCreated;
      totalTime += result.timeMs;
      totalErrors += result.errors?.length || 0;
      
      console.log(
        `${result.collection}: ${result.documentsCreated} documents ` +
        `(${result.timeMs}ms)${result.errors?.length ? ` - ${result.errors.length} errors` : ''}`
      );
    }

    console.log(`\nTotal: ${totalDocs} documents in ${totalTime}ms`);
    if (totalErrors > 0) {
      console.log(`Errors: ${totalErrors}`);
    }
    console.log('---\n');

    return results;
  }

  /**
   * Clear all test collections
   */
  async clearAll(): Promise<void> {
    console.log('\nClearing all test collections...\n');
    
    const collections = [
      'products', 'categories', 'users',
      'authors', 'blogs', 'comments',
      'actors', 'genres', 'movies',
      'properties'
    ];

    for (const collection of collections) {
      try {
        await this.client.collections(collection).delete();
        console.log(`Deleted collection: ${collection}`);
      } catch (error: any) {
        if (error.httpStatus !== 404) {
          console.error(`Error deleting ${collection}:`, error.message);
        }
      }
    }
  }

  /**
   * Reset and seed collections
   */
  async resetAndSeed(config: SeedConfig = {}): Promise<SeedResult[]> {
    await this.clearAll();
    return this.seedAll(config);
  }
}

/**
 * Convenience function to create and seed test data
 */
export async function seedTestData(
  client: Client,
  config: SeedConfig = {}
): Promise<SeedResult[]> {
  const seeder = new TestDataSeeder(client);
  return seeder.seedAll(config);
}

/**
 * Convenience function to reset and seed test data
 */
export async function resetAndSeedTestData(
  client: Client,
  config: SeedConfig = {}
): Promise<SeedResult[]> {
  const seeder = new TestDataSeeder(client);
  return seeder.resetAndSeed(config);
}