/**
 * @fileoverview MultiCollectionSearchClient for searching across multiple
 * Typesense collections in parallel and merging results.
 */

import { TypesenseSearchClient } from './TypesenseClient';
import type { 
  CollectionSearchConfig, 
  MultiCollectionSearchRequest, 
  MultiCollectionSearchResponse,
  MultiCollectionSearchHit,
  CollectionSearchResult
} from '../types/multiCollection';
import type { SearchRequest, TypesenseSearchResponse, SearchHit, TypesenseConfig } from '../types';
import type { Client } from 'typesense';
import { getDefaultSortField } from '../hooks/useSchemaDiscovery';
import { isValidSearchField } from '../utils/schemaValidation';

/**
 * Client for performing searches across multiple Typesense collections
 */
export class MultiCollectionSearchClient {
  private client: TypesenseSearchClient;
  private schemaCache: Map<string, any> = new Map();

  constructor(clientOrConfig: TypesenseSearchClient | TypesenseConfig | Client) {
    if (clientOrConfig instanceof TypesenseSearchClient) {
      this.client = clientOrConfig;
    } else {
      this.client = new TypesenseSearchClient(clientOrConfig);
    }
  }

  /**
   * Search multiple collections in parallel and merge results
   */
  async searchMultipleCollections(
    request: MultiCollectionSearchRequest
  ): Promise<MultiCollectionSearchResponse> {
    const startTime = Date.now();
    
    // Build search requests for each collection
    const searchPromises = request.collections.map(async (config) => 
      this.searchCollection(config, request)
    );

    // Execute all searches in parallel
    const results = await Promise.allSettled(searchPromises);
    
    // Process results
    const successfulResults: CollectionSearchResult[] = [];
    const errorsByCollection: Record<string, string> = {};
    
    results.forEach((result, index) => {
      const config = request.collections[index];
      if (result.status === 'fulfilled') {
        const searchResult = result.value;
        if (searchResult.error) {
          errorsByCollection[config.collection] = searchResult.error.message || 'Unknown error';
        } else {
          successfulResults.push(searchResult);
        }
      } else {
        errorsByCollection[config.collection] = result.reason?.message || 'Unknown error';
      }
    });

    // Determine result mode (default to 'interleaved')
    const resultMode = request.resultMode || 'interleaved';

    // Process all hits with metadata
    const allProcessedHits = this.processAllHits(
      successfulResults,
      request.normalizeScores !== false
    );

    // Prepare response based on result mode
    let mergedHits: MultiCollectionSearchHit[] = [];
    let hitsByCollection: Record<string, MultiCollectionSearchHit[]> | undefined;

    if (resultMode === 'interleaved' || resultMode === 'both') {
      // Merge results based on strategy
      mergedHits = this.mergeResults(
        allProcessedHits,
        request.mergeStrategy || 'relevance'
      );

      // Apply global max results limit to merged results
      if (request.globalMaxResults) {
        mergedHits = mergedHits.slice(0, request.globalMaxResults);
      }
    }

    if (resultMode === 'perCollection' || resultMode === 'both') {
      // Organize hits by collection
      hitsByCollection = {};
      allProcessedHits.forEach(hit => {
        const collection = hit._collection;
        if (!hitsByCollection![collection]) {
          hitsByCollection![collection] = [];
        }
        hitsByCollection![collection].push(hit);
      });

      // Apply per-collection limits
      successfulResults.forEach(({ config }) => {
        if (hitsByCollection![config.collection] && config.maxResults) {
          hitsByCollection![config.collection] = hitsByCollection![config.collection]
            .slice(0, config.maxResults);
        }
      });
    }

    // Calculate statistics
    const totalFoundByCollection: Record<string, number> = {};
    const includedByCollection: Record<string, number> = {};
    const searchTimeByCollection: Record<string, number> = {};
    const facetsByCollection: Record<string, any> = {};

    successfulResults.forEach(({ config, response, searchTimeMs }) => {
      totalFoundByCollection[config.collection] = response.found || 0;
      includedByCollection[config.collection] = 0;
      searchTimeByCollection[config.collection] = searchTimeMs;
      
      if (config.includeFacets && response.facet_counts) {
        facetsByCollection[config.collection] = response.facet_counts;
      }
    });

    // Count included hits per collection
    if (resultMode === 'interleaved') {
      mergedHits.forEach(hit => {
        includedByCollection[hit._collection] = (includedByCollection[hit._collection] || 0) + 1;
      });
    } else if (resultMode === 'perCollection') {
      Object.entries(hitsByCollection || {}).forEach(([collection, hits]) => {
        includedByCollection[collection] = hits.length;
      });
    } else { // 'both'
      // Count from per-collection results for accuracy
      Object.entries(hitsByCollection || {}).forEach(([collection, hits]) => {
        includedByCollection[collection] = hits.length;
      });
    }

    return {
      hits: mergedHits,
      found: resultMode === 'perCollection' ? allProcessedHits.length : mergedHits.length,
      totalFoundByCollection,
      includedByCollection,
      searchTimeMs: Date.now() - startTime,
      searchTimeByCollection,
      query: request.query,
      facetsByCollection: Object.keys(facetsByCollection).length > 0 ? facetsByCollection : undefined,
      errorsByCollection: Object.keys(errorsByCollection).length > 0 ? errorsByCollection : undefined,
      hitsByCollection,
      resultMode,
    };
  }

  /**
   * Search a single collection with configuration
   */
  private async searchCollection(
    config: CollectionSearchConfig,
    request: MultiCollectionSearchRequest
  ): Promise<CollectionSearchResult> {
    const startTime = Date.now();
    
    try {
      // Get schema for auto-configuration
      const schema = await this.getCollectionSchema(config.collection);
      
      // Build search parameters
      const searchParams = await this.buildSearchParams(config, request, schema);
      
      // Execute search
      const response = await this.client.search(
        config.collection,
        searchParams,
        true // use cache
      );

      return {
        config,
        response,
        searchTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        config,
        response: { 
          hits: [], 
          found: 0,
          search_time_ms: 0,
          page: 1,
          request_params: {
            q: '',
            query_by: ''
          },
          out_of: 0
        } as unknown as TypesenseSearchResponse,
        searchTimeMs: Date.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Build search parameters for a collection
   */
  private async buildSearchParams(
    config: CollectionSearchConfig,
    request: MultiCollectionSearchRequest,
    schema: any
  ): Promise<SearchRequest> {
    // Start with base parameters
    const params: SearchRequest = {
      q: request.query,
      query_by: config.queryBy || this.inferQueryFields(schema),
      per_page: config.maxResults || 20,
      page: 1,
    };

    // Add sorting
    if (config.sortBy) {
      params.sort_by = config.sortBy;
    } else {
      // Use schema's default sort if available
      const defaultSort = getDefaultSortField(schema);
      if (defaultSort) {
        params.sort_by = defaultSort;
      }
    }

    // Add filtering
    if (config.filterBy) {
      params.filter_by = config.filterBy;
    }

    // Add faceting
    if (config.includeFacets && config.facetBy) {
      params.facet_by = config.facetBy;
      params.max_facet_values = 100;
    }

    // Add field selection
    if (config.includeFields) {
      params.include_fields = config.includeFields;
    } else if (config.excludeFields) {
      params.exclude_fields = config.excludeFields;
    }

    // Add highlighting
    if (request.enableHighlighting) {
      params.highlight_fields = params.query_by;
      params.highlight_full_fields = params.query_by;
      
      if (request.highlightConfig) {
        params.highlight_start_tag = request.highlightConfig.startTag || '<mark>';
        params.highlight_end_tag = request.highlightConfig.endTag || '</mark>';
        params.highlight_affix_num_tokens = request.highlightConfig.affixNumTokens || 4;
      }
    }

    return params;
  }

  /**
   * Process all hits from results and add metadata
   */
  private processAllHits(
    results: CollectionSearchResult[],
    normalizeScores: boolean
  ): MultiCollectionSearchHit[] {
    const allHits: MultiCollectionSearchHit[] = [];

    // Process each collection's results
    results.forEach(({ config, response }) => {
      const hits = response.hits || [];
      const maxScore = this.getMaxScore(hits);
      const minScore = this.getMinScore(hits);
      const scoreRange = maxScore - minScore || 1;

      hits.forEach((hit, index) => {
        const originalScore = this.extractScore(hit);
        const normalizedScore = normalizeScores && scoreRange > 0
          ? (originalScore - minScore) / scoreRange
          : originalScore;

        const weight = config.weight || 1.0;
        const mergedScore = normalizedScore * weight;

        // Preserve highlight information from the original hit
        const multiHit: MultiCollectionSearchHit = {
          ...hit,
          _collection: config.collection,
          _namespace: config.namespace,
          _collectionRank: index + 1,
          _originalScore: originalScore,
          _normalizedScore: normalizedScore,
          _mergedScore: mergedScore,
          _collectionWeight: weight,
        };

        allHits.push(multiHit);
      });
    });

    return allHits;
  }

  /**
   * Merge results from multiple collections
   */
  private mergeResults(
    allHits: MultiCollectionSearchHit[],
    strategy: 'relevance' | 'roundRobin' | 'collectionOrder'
  ): MultiCollectionSearchHit[] {
    // Sort based on strategy
    switch (strategy) {
      case 'relevance':
        return [...allHits].sort((a, b) => b._mergedScore - a._mergedScore);
      
      case 'roundRobin':
        return this.roundRobinMerge(allHits);
      
      case 'collectionOrder':
        // Already in collection order from processing
        return allHits;
      
      default:
        return allHits;
    }
  }

  /**
   * Round-robin merge strategy
   */
  private roundRobinMerge(
    allHits: MultiCollectionSearchHit[]
  ): MultiCollectionSearchHit[] {
    const hitsByCollection = new Map<string, MultiCollectionSearchHit[]>();
    const collectionOrder: string[] = [];
    
    // Group hits by collection and track order
    allHits.forEach(hit => {
      const collection = hit._collection;
      if (!hitsByCollection.has(collection)) {
        hitsByCollection.set(collection, []);
        collectionOrder.push(collection);
      }
      hitsByCollection.get(collection)!.push(hit);
    });

    // Round-robin merge
    const merged: MultiCollectionSearchHit[] = [];
    let hasMore = true;
    let index = 0;

    while (hasMore) {
      hasMore = false;
      
      collectionOrder.forEach((collection) => {
        const hits = hitsByCollection.get(collection) || [];
        if (index < hits.length) {
          merged.push(hits[index]);
          hasMore = true;
        }
      });
      
      index++;
    }

    return merged;
  }

  /**
   * Get collection schema with caching
   */
  private async getCollectionSchema(collection: string): Promise<any> {
    if (this.schemaCache.has(collection)) {
      return this.schemaCache.get(collection);
    }

    const schema = await this.client.getSchema(collection);
    this.schemaCache.set(collection, schema);
    return schema;
  }

  /**
   * Infer query fields from schema
   */
  private inferQueryFields(schema: any): string {
    if (!schema?.fields) return '*';

    const searchableFields = schema.fields
      .filter((field: any) => isValidSearchField(field))
      .map((field: any) => field.name);

    return searchableFields.length > 0 ? searchableFields.join(',') : '*';
  }

  /**
   * Extract relevance score from hit
   */
  private extractScore(hit: SearchHit): number {
    // Typesense includes various scoring fields
    return (hit as any).text_match || 
           (hit as any).geo_distance_meters || 
           (hit as any).vector_distance ||
           1;
  }

  /**
   * Get maximum score from hits
   */
  private getMaxScore(hits: SearchHit[]): number {
    if (hits.length === 0) return 1;
    return Math.max(...hits.map(hit => this.extractScore(hit)));
  }

  /**
   * Get minimum score from hits
   */
  private getMinScore(hits: SearchHit[]): number {
    if (hits.length === 0) return 0;
    return Math.min(...hits.map(hit => this.extractScore(hit)));
  }

  /**
   * Clear schema cache
   */
  clearSchemaCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Simplified search method for compatibility with tests
   * @param searches Array of collection search configurations
   * @returns Array of search results with collection metadata
   */
  async search(searches: Array<{ collection: string; params: SearchRequest }>): Promise<Array<{ collection: string } & TypesenseSearchResponse>> {
    const results = await Promise.all(
      searches.map(async ({ collection, params }) => {
        try {
          const response = await this.client.search(collection, params);
          return { collection, ...response };
        } catch (error) {
          throw error;
        }
      })
    );
    return results;
  }

  /**
   * Search a single collection (for error handling tests)
   * @param collection Collection name
   * @param params Search parameters
   * @returns Search response
   */
  async searchSingle(collection: string, params: SearchRequest): Promise<TypesenseSearchResponse> {
    return this.client.search(collection, params);
  }
}

// Export with shorter alias for tests
export { MultiCollectionSearchClient as MultiCollectionClient };