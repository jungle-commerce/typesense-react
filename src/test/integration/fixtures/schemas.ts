/**
 * Schema definitions for integration tests
 * Includes e-commerce, blog, real estate, and movies schemas
 */

import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

/**
 * E-commerce schema for product catalog
 */
export const ecommerceSchema: CollectionCreateSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'category', type: 'string', facet: true },
    { name: 'subcategory', type: 'string', facet: true },
    { name: 'brand', type: 'string', facet: true },
    { name: 'price', type: 'float', facet: true },
    { name: 'original_price', type: 'float', facet: false, optional: true },
    { name: 'discount_percentage', type: 'int32', facet: true, optional: true },
    { name: 'currency', type: 'string', facet: true },
    { name: 'in_stock', type: 'bool', facet: true },
    { name: 'inventory_count', type: 'int32', facet: false },
    { name: 'rating', type: 'float', facet: true },
    { name: 'reviews_count', type: 'int32', facet: false },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'colors', type: 'string[]', facet: true, optional: true },
    { name: 'sizes', type: 'string[]', facet: true, optional: true },
    { name: 'image_url', type: 'string', facet: false },
    { name: 'created_at', type: 'int64', facet: false },
    { name: 'updated_at', type: 'int64', facet: false },
    { name: 'popularity_score', type: 'int32', facet: false },
  ],
  default_sorting_field: 'popularity_score',
};

/**
 * Blog schema for posts and content
 */
export const blogSchema: CollectionCreateSchema = {
  name: 'posts',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string', facet: false },
    { name: 'slug', type: 'string', facet: false },
    { name: 'content', type: 'string', facet: false },
    { name: 'excerpt', type: 'string', facet: false },
    { name: 'author_id', type: 'string', facet: true },
    { name: 'author_name', type: 'string', facet: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'status', type: 'string', facet: true }, // draft, published, archived
    { name: 'featured', type: 'bool', facet: true },
    { name: 'views_count', type: 'int32', facet: false },
    { name: 'likes_count', type: 'int32', facet: false },
    { name: 'comments_count', type: 'int32', facet: false },
    { name: 'reading_time_minutes', type: 'int32', facet: true },
    { name: 'published_at', type: 'int64', facet: false },
    { name: 'updated_at', type: 'int64', facet: false },
    { name: 'meta_description', type: 'string', facet: false, optional: true },
    { name: 'featured_image_url', type: 'string', facet: false, optional: true },
  ],
  default_sorting_field: 'published_at',
};

/**
 * Blog authors schema
 */
export const blogAuthorsSchema: CollectionCreateSchema = {
  name: 'authors',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string', facet: false },
    { name: 'email', type: 'string', facet: false },
    { name: 'bio', type: 'string', facet: false },
    { name: 'avatar_url', type: 'string', facet: false, optional: true },
    { name: 'expertise', type: 'string[]', facet: true },
    { name: 'posts_count', type: 'int32', facet: false },
    { name: 'joined_at', type: 'int64', facet: false },
  ],
};

/**
 * Blog comments schema
 */
export const blogCommentsSchema: CollectionCreateSchema = {
  name: 'comments',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'post_id', type: 'string', facet: true },
    { name: 'author_name', type: 'string', facet: false },
    { name: 'author_email', type: 'string', facet: false },
    { name: 'content', type: 'string', facet: false },
    { name: 'status', type: 'string', facet: true }, // pending, approved, spam
    { name: 'created_at', type: 'int64', facet: false },
    { name: 'parent_id', type: 'string', facet: false, optional: true },
  ],
  default_sorting_field: 'created_at',
};

/**
 * Real estate properties schema
 */
export const realEstateSchema: CollectionCreateSchema = {
  name: 'properties',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'property_type', type: 'string', facet: true }, // house, apartment, condo, townhouse
    { name: 'listing_type', type: 'string', facet: true }, // sale, rent
    { name: 'status', type: 'string', facet: true }, // active, pending, sold, rented
    { name: 'price', type: 'float', facet: true },
    { name: 'price_per_sqft', type: 'float', facet: false, optional: true },
    { name: 'currency', type: 'string', facet: true },
    { name: 'bedrooms', type: 'int32', facet: true },
    { name: 'bathrooms', type: 'float', facet: true },
    { name: 'half_bathrooms', type: 'int32', facet: true, optional: true },
    { name: 'square_feet', type: 'int32', facet: true },
    { name: 'lot_size', type: 'int32', facet: true, optional: true },
    { name: 'year_built', type: 'int32', facet: true },
    { name: 'address', type: 'string', facet: false },
    { name: 'city', type: 'string', facet: true },
    { name: 'state', type: 'string', facet: true },
    { name: 'zip_code', type: 'string', facet: true },
    { name: 'country', type: 'string', facet: true },
    { name: 'latitude', type: 'float', facet: false },
    { name: 'longitude', type: 'float', facet: false },
    { name: 'neighborhood', type: 'string', facet: true, optional: true },
    { name: 'amenities', type: 'string[]', facet: true },
    { name: 'features', type: 'string[]', facet: true },
    { name: 'parking_spaces', type: 'int32', facet: true, optional: true },
    { name: 'garage_spaces', type: 'int32', facet: true, optional: true },
    { name: 'hoa_fee', type: 'float', facet: true, optional: true },
    { name: 'tax_amount', type: 'float', facet: false, optional: true },
    { name: 'virtual_tour_url', type: 'string', facet: false, optional: true },
    { name: 'images', type: 'string[]', facet: false },
    { name: 'listed_at', type: 'int64', facet: false },
    { name: 'updated_at', type: 'int64', facet: false },
    { name: 'views_count', type: 'int32', facet: false },
    { name: 'saves_count', type: 'int32', facet: false },
    { name: 'agent_id', type: 'string', facet: true },
    { name: 'agent_name', type: 'string', facet: true },
    { name: 'agency_name', type: 'string', facet: true },
  ],
  default_sorting_field: 'listed_at',
};

/**
 * Movies schema
 */
export const moviesSchema: CollectionCreateSchema = {
  name: 'movies',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string', facet: false },
    { name: 'original_title', type: 'string', facet: false, optional: true },
    { name: 'tagline', type: 'string', facet: false, optional: true },
    { name: 'overview', type: 'string', facet: false },
    { name: 'release_date', type: 'int64', facet: false },
    { name: 'release_year', type: 'int32', facet: true },
    { name: 'runtime_minutes', type: 'int32', facet: true },
    { name: 'genres', type: 'string[]', facet: true },
    { name: 'director', type: 'string', facet: true },
    { name: 'writers', type: 'string[]', facet: true, optional: true },
    { name: 'cast', type: 'string[]', facet: true },
    { name: 'production_companies', type: 'string[]', facet: true },
    { name: 'production_countries', type: 'string[]', facet: true },
    { name: 'languages', type: 'string[]', facet: true },
    { name: 'budget', type: 'int64', facet: false, optional: true },
    { name: 'revenue', type: 'int64', facet: false, optional: true },
    { name: 'rating', type: 'float', facet: true },
    { name: 'votes_count', type: 'int32', facet: false },
    { name: 'popularity', type: 'float', facet: false },
    { name: 'mpaa_rating', type: 'string', facet: true }, // G, PG, PG-13, R, NC-17
    { name: 'keywords', type: 'string[]', facet: true, optional: true },
    { name: 'poster_url', type: 'string', facet: false, optional: true },
    { name: 'backdrop_url', type: 'string', facet: false, optional: true },
    { name: 'trailer_url', type: 'string', facet: false, optional: true },
    { name: 'imdb_id', type: 'string', facet: false, optional: true },
    { name: 'tmdb_id', type: 'string', facet: false, optional: true },
    { name: 'awards', type: 'string[]', facet: true, optional: true },
    { name: 'nominations', type: 'string[]', facet: true, optional: true },
  ],
  default_sorting_field: 'popularity',
};

/**
 * Movie actors schema
 */
export const actorsSchema: CollectionCreateSchema = {
  name: 'actors',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string', facet: false },
    { name: 'birth_date', type: 'int64', facet: false, optional: true },
    { name: 'birth_place', type: 'string', facet: false, optional: true },
    { name: 'biography', type: 'string', facet: false, optional: true },
    { name: 'nationality', type: 'string', facet: true, optional: true },
    { name: 'gender', type: 'string', facet: true, optional: true },
    { name: 'known_for', type: 'string[]', facet: false },
    { name: 'movies_count', type: 'int32', facet: false },
    { name: 'awards_count', type: 'int32', facet: false },
    { name: 'profile_image_url', type: 'string', facet: false, optional: true },
  ],
};

/**
 * Movie genres schema
 */
export const genresSchema: CollectionCreateSchema = {
  name: 'genres',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false },
    { name: 'movies_count', type: 'int32', facet: false },
  ],
};

/**
 * Get all schemas grouped by domain
 */
export const allSchemas = {
  ecommerce: {
    products: ecommerceSchema,
  },
  blog: {
    posts: blogSchema,
    authors: blogAuthorsSchema,
    comments: blogCommentsSchema,
  },
  realEstate: {
    properties: realEstateSchema,
  },
  movies: {
    movies: moviesSchema,
    actors: actorsSchema,
    genres: genresSchema,
  },
};

/**
 * Get schema by name
 */
export function getSchema(name: string): CollectionCreateSchema | undefined {
  for (const domain of Object.values(allSchemas)) {
    for (const [key, schema] of Object.entries(domain)) {
      if (schema.name === name || key === name) {
        return schema;
      }
    }
  }
  return undefined;
}

/**
 * Get all schema names
 */
export function getAllSchemaNames(): string[] {
  const names: string[] = [];
  for (const domain of Object.values(allSchemas)) {
    for (const schema of Object.values(domain)) {
      names.push(schema.name);
    }
  }
  return names;
}