/**
 * @fileoverview Hook for discovering and analyzing Typesense collection schemas
 * to automatically configure facets and search fields.
 */

import { useEffect, useState, useMemo } from 'react';
import { useSearchContext } from '../providers/SearchProvider';
import type { FacetConfig } from '../types';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';
import {
  type SchemaPatternConfig,
  type FieldPattern,
  DEFAULT_TIMESTAMP_PATTERNS,
  DEFAULT_DISJUNCTIVE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_DATE_PATTERNS,
  DEFAULT_SELECT_PATTERNS,
  matchesAnyPattern,
} from '../utils/schemaPatterns';
import {
  getFirstValidField,
  isValidSortField,
  isValidFacetField,
  isValidSearchField,
} from '../utils/schemaValidation';

/**
 * Options for schema discovery
 */
interface SchemaDiscoveryOptions {
  /** Pattern configuration for field discovery */
  patterns?: SchemaPatternConfig;
  /** Fields to exclude from faceting (deprecated - use patterns.excludePatterns) */
  excludeFields?: string[];
  /** Maximum number of facets to create */
  maxFacets?: number;
  /** Whether to include numeric fields as facets */
  includeNumericFacets?: boolean;
  /** Whether to include date fields as facets */
  includeDateFacets?: boolean;
  /** Custom facet configuration overrides */
  facetOverrides?: Record<string, Partial<FacetConfig>>;
  /** Callback when schema is loaded */
  onSchemaLoad?: (schema: CollectionSchema) => void;
}

/**
 * Hook for discovering collection schema and auto-configuring facets
 * @param options - Schema discovery options
 * @returns Schema and auto-generated facet configurations
 */
export function useSchemaDiscovery(options: SchemaDiscoveryOptions = {}) {
  const { state, client, collection } = useSearchContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    patterns = {},
    excludeFields,
    maxFacets = 20,
    includeNumericFacets = true,
    includeDateFacets = true,
    facetOverrides = {},
    onSchemaLoad,
  } = options;

  // Merge default patterns with custom patterns
  const excludePatterns = patterns.excludePatterns || DEFAULT_EXCLUDE_PATTERNS;
  const datePatterns = patterns.datePatterns || DEFAULT_DATE_PATTERNS;
  const selectPatterns = patterns.selectFieldPatterns || DEFAULT_SELECT_PATTERNS;
  const disjunctivePatterns = patterns.disjunctivePatterns || DEFAULT_DISJUNCTIVE_PATTERNS;

  // Support legacy excludeFields option
  const legacyExcludePatterns: FieldPattern[] = excludeFields
    ? excludeFields.map(field => ({ pattern: field, matchType: 'exact' as const }))
    : [];

  // Load schema if not already loaded
  useEffect(() => {
    if (!state.schema && !isLoading) {
      setIsLoading(true);
      client.retrieveSchema(collection)
        .then((schema: CollectionSchema) => {
          onSchemaLoad?.(schema);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err : new Error('Failed to load schema'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [state.schema, client, collection, isLoading, onSchemaLoad]);

  // Generate facet configurations from schema
  const facetConfigs = useMemo(() => {
    if (!state.schema?.fields) return [];

    const configs: FacetConfig[] = [];
    const fields = state.schema.fields;

    for (const field of fields) {
      // Skip excluded fields (check patterns and legacy list)
      if (matchesAnyPattern(field.name, [...excludePatterns, ...legacyExcludePatterns])) continue;

      // Skip fields that are not facetable
      if (!isValidFacetField(field)) continue;

      // Determine facet type based on field type
      let facetType: FacetConfig['type'] = 'checkbox';
      
      if (field.type === 'int32' || field.type === 'int64' || field.type === 'float') {
        if (!includeNumericFacets) continue;
        facetType = 'numeric';
      } else if (field.type === 'bool') {
        facetType = 'select';
      } else if (matchesAnyPattern(field.name, datePatterns)) {
        if (!includeDateFacets) continue;
        facetType = 'date';
      } else if (field.type === 'string[]') {
        facetType = 'checkbox';
      } else if (field.type === 'string') {
        // Use select for fields that match select patterns
        if (matchesAnyPattern(field.name, selectPatterns)) {
          facetType = 'select';
        } else {
          facetType = 'checkbox';
        }
      }

      // Create facet configuration
      const config: FacetConfig = {
        field: field.name,
        label: formatFieldLabel(field.name),
        type: facetType,
        disjunctive: facetType === 'checkbox' || shouldBeDisjunctive(field, disjunctivePatterns),
        searchable: facetType === 'checkbox',
        expanded: true,
        maxValues: 10,
        ...facetOverrides[field.name], // Apply overrides
      };

      configs.push(config);

      // Stop if we've reached the maximum
      if (configs.length >= maxFacets) break;
    }

    return configs;
  }, [state.schema, excludePatterns, legacyExcludePatterns, datePatterns, selectPatterns, disjunctivePatterns, maxFacets, includeNumericFacets, includeDateFacets, facetOverrides]);

  // Generate search fields from schema
  const searchableFields = useMemo(() => {
    if (!state.schema?.fields) return [];

    return state.schema.fields
      .filter((field: any) => 
        isValidSearchField(field) &&
        !matchesAnyPattern(field.name, [...excludePatterns, ...legacyExcludePatterns])
      )
      .map((field: any) => field.name);
  }, [state.schema, excludePatterns, legacyExcludePatterns]);

  // Generate sortable fields from schema
  const sortableFields = useMemo(() => {
    if (!state.schema?.fields) return [];

    return state.schema.fields
      .filter((field: any) => isValidSortField(field))
      .map((field: any) => ({
        field: field.name,
        label: formatFieldLabel(field.name),
        type: field.type,
      }));
  }, [state.schema]);

  return {
    schema: state.schema,
    facetConfigs,
    searchableFields,
    sortableFields,
    isLoading,
    error,
  };
}

/**
 * Formats a field name into a human-readable label
 * @param fieldName - Field name to format
 * @returns Formatted label
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Insert space before capital letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter of each word
    .replace(/\b\w/g, char => char.toUpperCase())
    // Special cases
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bApi\b/g, 'API');
}

/**
 * Helper to determine if a field should be a disjunctive facet
 * @param field - Field configuration from schema
 * @param patterns - Custom disjunctive patterns (optional)
 * @returns True if field should use disjunctive (OR) logic
 */
export function shouldBeDisjunctive(field: any, patterns?: FieldPattern[]): boolean {
  // Array fields are typically disjunctive
  if (field.type?.includes('[]')) return true;
  
  // Use provided patterns or defaults
  const disjunctivePatterns = patterns || DEFAULT_DISJUNCTIVE_PATTERNS;
  return matchesAnyPattern(field.name, disjunctivePatterns);
}

/**
 * Helper to get the default sort field from schema
 * @param schema - Collection schema
 * @param timestampPatterns - Custom timestamp patterns (optional)
 * @returns Default sort field or empty string
 */
export function getDefaultSortField(
  schema: CollectionSchema | null, 
  timestampPatterns?: FieldPattern[]
): string {
  if (!schema) return '';

  // Use provided patterns or defaults
  const patterns = timestampPatterns || DEFAULT_TIMESTAMP_PATTERNS;

  // First, check if Typesense has a default_sorting_field defined
  if ((schema as any).default_sorting_field) {
    const defaultSort = (schema as any).default_sorting_field;
    // Ensure it has a sort direction
    if (!defaultSort.includes(':')) {
      // Try to determine if it's a timestamp field
      const field = schema.fields?.find((f: any) => f.name === defaultSort);
      if (field) {
        // Timestamp/date fields typically sort descending, others ascending
        const isTimestampField = 
          matchesAnyPattern(field.name, patterns) ||
          field.type === 'int32' || 
          field.type === 'int64' || 
          field.type === 'float';
        return `${defaultSort}:${isTimestampField ? 'desc' : 'asc'}`;
      }
      // Default to desc if we can't find the field
      return `${defaultSort}:desc`;
    }
    return defaultSort;
  }

  if (!schema.fields) return '';

  // Look for timestamp fields that are valid for sorting
  const timestampField = getFirstValidField(
    schema,
    patterns,
    {
      sortable: true,
      indexed: true,
      types: ['int32', 'int64', 'float', 'string']
    }
  );

  if (timestampField) {
    // Timestamp fields typically sort descending
    return `${timestampField.name}:desc`;
  }

  // Fall back to first sortable numeric field
  const numericField = schema.fields.find((f: any) => 
    (f.type === 'int32' || f.type === 'int64' || f.type === 'float') &&
    isValidSortField(f)
  );

  if (numericField) {
    return `${numericField.name}:desc`;
  }

  // Finally, try first sortable string field
  const stringField = schema.fields.find((f: any) => 
    f.type === 'string' &&
    isValidSortField(f)
  );

  if (stringField) {
    return `${stringField.name}:asc`;
  }

  return '';
}