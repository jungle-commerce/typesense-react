/**
 * Test data generators for integration tests
 * Provides random data generation, consistent test datasets, and edge case data
 */

import { faker } from '@faker-js/faker';

// Set seed for consistent test data
faker.seed(12345);

/**
 * Base data generator utilities
 */
export class DataGenerator {
  private idCounter = 0;

  /**
   * Generate a unique ID
   */
  generateId(prefix: string = 'id'): string {
    return `${prefix}_${++this.idCounter}`;
  }

  /**
   * Generate random number in range
   */
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in range
   */
  randomFloat(min: number, max: number, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Pick random items from array
   */
  pickRandom<T>(array: T[], count: number = 1): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Generate date timestamp
   */
  dateTimestamp(daysAgo: number = 0): number {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return Math.floor(date.getTime() / 1000);
  }
}

/**
 * E-commerce data generator
 */
export class EcommerceDataGenerator extends DataGenerator {
  private categories = [
    'Electronics', 'Clothing', 'Home & Kitchen', 'Books', 
    'Sports & Outdoors', 'Toys & Games', 'Beauty', 'Health'
  ];

  private brands = [
    'TechPro', 'StyleCo', 'HomeEssentials', 'BookWorld',
    'SportMax', 'FunToys', 'BeautyPlus', 'HealthFirst',
    'EliteGear', 'ModernLiving', 'SmartChoice', 'PremiumBrand'
  ];

  private colors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Gray', 'Yellow', 'Purple'];
  private sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  /**
   * Generate a product
   */
  generateProduct(overrides: Partial<any> = {}): any {
    const category = faker.helpers.arrayElement(this.categories);
    const brand = faker.helpers.arrayElement(this.brands);
    const price = this.randomFloat(9.99, 999.99);
    const hasDiscount = Math.random() > 0.7;
    const inStock = Math.random() > 0.1;
    
    return {
      id: this.generateId('prod'),
      name: `${brand} ${faker.commerce.productName()}`,
      description: faker.commerce.productDescription(),
      category,
      subcategory: faker.commerce.department(),
      brand,
      price,
      original_price: hasDiscount ? this.randomFloat(price * 1.1, price * 1.5) : price,
      discount_percentage: hasDiscount ? this.randomInt(10, 50) : null,
      currency: 'USD',
      in_stock: inStock,
      inventory_count: inStock ? this.randomInt(0, 100) : 0,
      rating: this.randomFloat(1, 5, 1),
      reviews_count: this.randomInt(0, 500),
      tags: this.pickRandom([
        'new-arrival', 'best-seller', 'featured', 'sale', 
        'limited-edition', 'eco-friendly', 'premium'
      ], this.randomInt(1, 3)),
      colors: this.pickRandom(this.colors, this.randomInt(1, 4)),
      sizes: category === 'Clothing' ? this.pickRandom(this.sizes, this.randomInt(2, 4)) : null,
      image_url: faker.image.url(),
      created_at: this.dateTimestamp(this.randomInt(0, 365)),
      updated_at: this.dateTimestamp(this.randomInt(0, 30)),
      popularity_score: this.randomInt(0, 1000),
      ...overrides
    };
  }

  /**
   * Generate multiple products
   */
  generateProducts(count: number): any[] {
    return Array.from({ length: count }, () => this.generateProduct());
  }

  /**
   * Generate products with specific criteria
   */
  generateProductsWithCriteria(criteria: {
    count: number;
    category?: string;
    brand?: string;
    priceRange?: { min: number; max: number };
    inStock?: boolean;
  }): any[] {
    const products = [];
    for (let i = 0; i < criteria.count; i++) {
      const price = criteria.priceRange 
        ? this.randomFloat(criteria.priceRange.min, criteria.priceRange.max)
        : undefined;
      
      products.push(this.generateProduct({
        ...(criteria.category && { category: criteria.category }),
        ...(criteria.brand && { brand: criteria.brand }),
        ...(price && { price }),
        ...(criteria.inStock !== undefined && { in_stock: criteria.inStock }),
      }));
    }
    return products;
  }
}

/**
 * Blog data generator
 */
export class BlogDataGenerator extends DataGenerator {
  private categories = [
    'Technology', 'Lifestyle', 'Travel', 'Food', 
    'Fashion', 'Business', 'Health', 'Entertainment'
  ];

  private tags = [
    'tutorial', 'how-to', 'tips', 'news', 'review',
    'opinion', 'guide', 'trends', 'analysis', 'interview'
  ];

  private statuses = ['draft', 'published', 'archived'];

  /**
   * Generate an author
   */
  generateAuthor(overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('author'),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      bio: faker.lorem.paragraph(),
      avatar_url: faker.image.avatar(),
      expertise: this.pickRandom(this.categories, this.randomInt(1, 3)),
      posts_count: this.randomInt(0, 100),
      joined_at: this.dateTimestamp(this.randomInt(365, 1095)),
      ...overrides
    };
  }

  /**
   * Generate a blog post
   */
  generatePost(authors: any[], overrides: Partial<any> = {}): any {
    const author = faker.helpers.arrayElement(authors);
    const wordCount = this.randomInt(300, 2000);
    const readingTime = Math.ceil(wordCount / 200);
    
    return {
      id: this.generateId('post'),
      title: faker.lorem.sentence(),
      slug: faker.helpers.slugify(faker.lorem.sentence()).toLowerCase(),
      content: faker.lorem.paragraphs(this.randomInt(5, 15)),
      excerpt: faker.lorem.paragraph(),
      author_id: author.id,
      author_name: author.name,
      category: faker.helpers.arrayElement(this.categories),
      tags: this.pickRandom(this.tags, this.randomInt(2, 5)),
      status: faker.helpers.arrayElement(this.statuses),
      featured: Math.random() > 0.8,
      views_count: this.randomInt(0, 10000),
      likes_count: this.randomInt(0, 500),
      comments_count: this.randomInt(0, 100),
      reading_time_minutes: readingTime,
      published_at: this.dateTimestamp(this.randomInt(0, 365)),
      updated_at: this.dateTimestamp(this.randomInt(0, 30)),
      meta_description: faker.lorem.sentence(),
      featured_image_url: faker.image.url(),
      ...overrides
    };
  }

  /**
   * Generate a comment
   */
  generateComment(postId: string, overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('comment'),
      post_id: postId,
      author_name: faker.person.fullName(),
      author_email: faker.internet.email(),
      content: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['pending', 'approved', 'spam']),
      created_at: this.dateTimestamp(this.randomInt(0, 30)),
      parent_id: Math.random() > 0.7 ? this.generateId('comment') : null,
      ...overrides
    };
  }

  /**
   * Generate blog data set
   */
  generateBlogData(authorCount: number, postCount: number): {
    authors: any[];
    posts: any[];
    comments: any[];
  } {
    const authors = Array.from({ length: authorCount }, () => this.generateAuthor());
    const posts = Array.from({ length: postCount }, () => this.generatePost(authors));
    const comments = posts.flatMap(post => 
      Array.from({ length: this.randomInt(0, 10) }, () => this.generateComment(post.id))
    );
    
    return { authors, posts, comments };
  }
}

/**
 * Real estate data generator
 */
export class RealEstateDataGenerator extends DataGenerator {
  private propertyTypes = ['house', 'apartment', 'condo', 'townhouse'];
  private listingTypes = ['sale', 'rent'];
  private statuses = ['active', 'pending', 'sold', 'rented'];
  
  private amenities = [
    'Pool', 'Gym', 'Parking', 'Security', 'Elevator',
    'Balcony', 'Garden', 'Storage', 'Concierge', 'Pet-friendly'
  ];

  private features = [
    'Hardwood floors', 'Granite countertops', 'Stainless steel appliances',
    'Walk-in closet', 'Central AC', 'Fireplace', 'High ceilings',
    'Natural light', 'Updated kitchen', 'Smart home'
  ];

  /**
   * Generate a property
   */
  generateProperty(overrides: Partial<any> = {}): any {
    const propertyType = faker.helpers.arrayElement(this.propertyTypes);
    const listingType = faker.helpers.arrayElement(this.listingTypes);
    const bedrooms = this.randomInt(0, 6);
    const bathrooms = this.randomFloat(1, 4, 1);
    const squareFeet = this.randomInt(500, 5000);
    const price = listingType === 'sale' 
      ? this.randomInt(100000, 2000000)
      : this.randomInt(1000, 10000);
    
    return {
      id: this.generateId('prop'),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      property_type: propertyType,
      listing_type: listingType,
      status: faker.helpers.arrayElement(this.statuses),
      price,
      price_per_sqft: listingType === 'sale' ? price / squareFeet : null,
      currency: 'USD',
      bedrooms,
      bathrooms,
      half_bathrooms: Math.random() > 0.7 ? this.randomInt(0, 2) : null,
      square_feet: squareFeet,
      lot_size: propertyType === 'house' ? this.randomInt(2000, 20000) : null,
      year_built: this.randomInt(1950, 2023),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      country: 'USA',
      latitude: parseFloat(faker.location.latitude()),
      longitude: parseFloat(faker.location.longitude()),
      neighborhood: faker.location.county(),
      amenities: this.pickRandom(this.amenities, this.randomInt(3, 7)),
      features: this.pickRandom(this.features, this.randomInt(3, 7)),
      parking_spaces: this.randomInt(0, 3),
      garage_spaces: propertyType === 'house' ? this.randomInt(0, 3) : null,
      hoa_fee: ['condo', 'townhouse'].includes(propertyType) ? this.randomInt(100, 500) : null,
      tax_amount: this.randomInt(1000, 10000),
      virtual_tour_url: Math.random() > 0.5 ? faker.internet.url() : null,
      images: Array.from({ length: this.randomInt(5, 15) }, () => faker.image.url()),
      listed_at: this.dateTimestamp(this.randomInt(0, 180)),
      updated_at: this.dateTimestamp(this.randomInt(0, 30)),
      views_count: this.randomInt(0, 1000),
      saves_count: this.randomInt(0, 100),
      agent_id: this.generateId('agent'),
      agent_name: faker.person.fullName(),
      agency_name: faker.company.name(),
      ...overrides
    };
  }

  /**
   * Generate properties with criteria
   */
  generatePropertiesWithCriteria(criteria: {
    count: number;
    propertyType?: string;
    listingType?: string;
    priceRange?: { min: number; max: number };
    bedrooms?: { min: number; max: number };
    city?: string;
  }): any[] {
    const properties = [];
    for (let i = 0; i < criteria.count; i++) {
      const price = criteria.priceRange 
        ? this.randomInt(criteria.priceRange.min, criteria.priceRange.max)
        : undefined;
      const bedrooms = criteria.bedrooms
        ? this.randomInt(criteria.bedrooms.min, criteria.bedrooms.max)
        : undefined;
      
      properties.push(this.generateProperty({
        ...(criteria.propertyType && { property_type: criteria.propertyType }),
        ...(criteria.listingType && { listing_type: criteria.listingType }),
        ...(price && { price }),
        ...(bedrooms && { bedrooms }),
        ...(criteria.city && { city: criteria.city }),
      }));
    }
    return properties;
  }
}

/**
 * Movies data generator
 */
export class MoviesDataGenerator extends DataGenerator {
  private genres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror',
    'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War'
  ];

  private mpaaRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
  
  private productionCompanies = [
    'Universal Pictures', 'Warner Bros', 'Columbia Pictures',
    'Walt Disney Pictures', 'Paramount Pictures', '20th Century Fox',
    'Sony Pictures', 'MGM', 'Lionsgate', 'Netflix'
  ];

  private languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean'];
  private countries = ['USA', 'UK', 'France', 'Germany', 'Japan', 'Korea'];

  /**
   * Generate an actor
   */
  generateActor(overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('actor'),
      name: faker.person.fullName(),
      birth_date: this.dateTimestamp(this.randomInt(7300, 25550)), // 20-70 years ago
      birth_place: faker.location.city() + ', ' + faker.location.country(),
      biography: faker.lorem.paragraphs(2),
      nationality: faker.location.country(),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
      known_for: Array.from({ length: this.randomInt(3, 5) }, () => faker.lorem.words(3)),
      movies_count: this.randomInt(5, 100),
      awards_count: this.randomInt(0, 20),
      profile_image_url: faker.image.avatar(),
      ...overrides
    };
  }

  /**
   * Generate a movie
   */
  generateMovie(actors: any[], overrides: Partial<any> = {}): any {
    const releaseYear = this.randomInt(1970, 2024);
    const budget = this.randomInt(1000000, 200000000);
    const revenue = this.randomInt(budget * 0.5, budget * 5);
    
    return {
      id: this.generateId('movie'),
      title: faker.lorem.words(this.randomInt(1, 4)),
      original_title: Math.random() > 0.8 ? faker.lorem.words(this.randomInt(1, 4)) : null,
      tagline: faker.lorem.sentence(),
      overview: faker.lorem.paragraphs(1),
      release_date: this.dateTimestamp(this.randomInt(0, 365 * 50)),
      release_year: releaseYear,
      runtime_minutes: this.randomInt(80, 180),
      genres: this.pickRandom(this.genres, this.randomInt(1, 3)),
      director: faker.person.fullName(),
      writers: Array.from({ length: this.randomInt(1, 3) }, () => faker.person.fullName()),
      cast: this.pickRandom(actors.map(a => a.name), this.randomInt(3, 10)),
      production_companies: this.pickRandom(this.productionCompanies, this.randomInt(1, 3)),
      production_countries: this.pickRandom(this.countries, this.randomInt(1, 2)),
      languages: this.pickRandom(this.languages, this.randomInt(1, 3)),
      budget,
      revenue,
      rating: this.randomFloat(1, 10, 1),
      votes_count: this.randomInt(100, 100000),
      popularity: this.randomFloat(0, 100, 2),
      mpaa_rating: faker.helpers.arrayElement(this.mpaaRatings),
      keywords: Array.from({ length: this.randomInt(5, 10) }, () => faker.lorem.word()),
      poster_url: faker.image.url(),
      backdrop_url: faker.image.url(),
      trailer_url: faker.internet.url(),
      imdb_id: `tt${this.randomInt(1000000, 9999999)}`,
      tmdb_id: this.randomInt(1000, 999999).toString(),
      awards: Math.random() > 0.7 ? Array.from({ length: this.randomInt(1, 5) }, () => faker.lorem.words(3)) : null,
      nominations: Math.random() > 0.5 ? Array.from({ length: this.randomInt(1, 10) }, () => faker.lorem.words(3)) : null,
      ...overrides
    };
  }

  /**
   * Generate a genre
   */
  generateGenre(name: string, overrides: Partial<any> = {}): any {
    return {
      id: this.generateId('genre'),
      name,
      description: faker.lorem.paragraph(),
      movies_count: this.randomInt(10, 500),
      ...overrides
    };
  }

  /**
   * Generate movies data set
   */
  generateMoviesData(actorCount: number, movieCount: number): {
    actors: any[];
    movies: any[];
    genres: any[];
  } {
    const actors = Array.from({ length: actorCount }, () => this.generateActor());
    const movies = Array.from({ length: movieCount }, () => this.generateMovie(actors));
    const genres = this.genres.map(name => this.generateGenre(name));
    
    return { actors, movies, genres };
  }
}

/**
 * Edge case data generators
 */
export class EdgeCaseDataGenerator extends DataGenerator {
  /**
   * Generate data with empty values
   */
  generateWithEmptyValues(baseGenerator: () => any, fields: string[]): any {
    const data = baseGenerator();
    fields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        data[field] = Array.isArray(data[field]) ? [] : '';
      }
    });
    return data;
  }

  /**
   * Generate data with null values
   */
  generateWithNullValues(baseGenerator: () => any, fields: string[]): any {
    const data = baseGenerator();
    fields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        data[field] = null;
      }
    });
    return data;
  }

  /**
   * Generate data with extreme values
   */
  generateWithExtremeValues(baseGenerator: () => any, config: {
    numberFields?: { field: string; value: number }[];
    stringFields?: { field: string; length: number }[];
    arrayFields?: { field: string; count: number }[];
  }): any {
    const data = baseGenerator();
    
    config.numberFields?.forEach(({ field, value }) => {
      if (data.hasOwnProperty(field)) {
        data[field] = value;
      }
    });
    
    config.stringFields?.forEach(({ field, length }) => {
      if (data.hasOwnProperty(field)) {
        data[field] = 'x'.repeat(length);
      }
    });
    
    config.arrayFields?.forEach(({ field, count }) => {
      if (data.hasOwnProperty(field)) {
        data[field] = Array.from({ length: count }, (_, i) => `item_${i}`);
      }
    });
    
    return data;
  }

  /**
   * Generate data with special characters
   */
  generateWithSpecialCharacters(baseGenerator: () => any, fields: string[]): any {
    const specialStrings = [
      'Test & Co.',
      'Price: $100',
      '50% off!',
      'Email: test@example.com',
      'Path/to/file',
      'Line1\\nLine2',
      'Quote: "Hello"',
      'Unicode: 日本語',
      'Emoji: 😀🎉',
      '<script>alert("test")</script>',
    ];
    
    const data = baseGenerator();
    fields.forEach((field, index) => {
      if (data.hasOwnProperty(field) && typeof data[field] === 'string') {
        data[field] = specialStrings[index % specialStrings.length];
      }
    });
    return data;
  }
}

/**
 * Export generator instances
 */
export const generators = {
  ecommerce: new EcommerceDataGenerator(),
  blog: new BlogDataGenerator(),
  realEstate: new RealEstateDataGenerator(),
  movies: new MoviesDataGenerator(),
  edgeCase: new EdgeCaseDataGenerator(),
};

/**
 * Generate consistent test datasets
 */
export const testDatasets = {
  /**
   * Small dataset for quick tests
   */
  small: {
    ecommerce: () => generators.ecommerce.generateProducts(10),
    blog: () => generators.blog.generateBlogData(3, 10),
    realEstate: () => generators.realEstate.generatePropertiesWithCriteria({ count: 10 }),
    movies: () => generators.movies.generateMoviesData(20, 10),
  },

  /**
   * Medium dataset for comprehensive tests
   */
  medium: {
    ecommerce: () => generators.ecommerce.generateProducts(100),
    blog: () => generators.blog.generateBlogData(10, 50),
    realEstate: () => generators.realEstate.generatePropertiesWithCriteria({ count: 75 }),
    movies: () => generators.movies.generateMoviesData(50, 100),
  },

  /**
   * Large dataset for performance tests
   */
  large: {
    ecommerce: () => generators.ecommerce.generateProducts(1000),
    blog: () => generators.blog.generateBlogData(50, 500),
    realEstate: () => generators.realEstate.generatePropertiesWithCriteria({ count: 1000 }),
    movies: () => generators.movies.generateMoviesData(200, 1000),
  },

  /**
   * Edge case datasets
   */
  edgeCases: {
    emptyValues: (generator: () => any, fields: string[]) => 
      generators.edgeCase.generateWithEmptyValues(generator, fields),
    nullValues: (generator: () => any, fields: string[]) => 
      generators.edgeCase.generateWithNullValues(generator, fields),
    extremeValues: (generator: () => any, config: any) => 
      generators.edgeCase.generateWithExtremeValues(generator, config),
    specialCharacters: (generator: () => any, fields: string[]) => 
      generators.edgeCase.generateWithSpecialCharacters(generator, fields),
  },
};