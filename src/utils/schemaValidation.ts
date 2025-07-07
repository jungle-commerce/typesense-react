/**
 * @fileoverview Schema field validation utilities
 */

import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';
import { type FieldPattern, matchesPattern } from './schemaPatterns';

/**
 * Field capabilities that can be validated
 */
export interface FieldCapabilities {
  /** Field must be facetable */
  facetable?: boolean;
  /** Field must be sortable */
  sortable?: boolean;
  /** Field must be indexed (searchable) */
  indexed?: boolean;
  /** Field must be one of these types */
  types?: string[];
}

/**
 * Validated field result
 */
export interface ValidatedField {
  /** Field definition from schema */
  field: any;
  /** Whether field passed all validations */
  isValid: boolean;
  /** Validation errors if any */
  errors: string[];
}

/**
 * Check if a field has the required capabilities
 */
export function validateFieldCapabilities(
  field: any,
  capabilities: FieldCapabilities
): ValidatedField {
  const errors: string[] = [];

  // Check facetable
  if (capabilities.facetable === true && field.facet === false) {
    errors.push(`Field "${field.name}" is not facetable`);
  }

  // Check sortable
  if (capabilities.sortable === true && field.sort === false) {
    errors.push(`Field "${field.name}" is not sortable`);
  }

  // Check indexed
  if (capabilities.indexed === true && field.index === false) {
    errors.push(`Field "${field.name}" is not indexed`);
  }

  // Check types
  if (capabilities.types && !capabilities.types.includes(field.type)) {
    errors.push(`Field "${field.name}" type "${field.type}" is not one of: ${capabilities.types.join(', ')}`);
  }

  return {
    field,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Find fields matching patterns with capability validation
 */
export function findFieldsWithCapabilities(
  schema: CollectionSchema | null,
  patterns: FieldPattern[],
  capabilities: FieldCapabilities = {}
): ValidatedField[] {
  if (!schema?.fields) return [];

  const results: ValidatedField[] = [];

  for (const field of schema.fields) {
    // Check if field matches any pattern
    const matchedPattern = patterns.find(pattern => matchesPattern(field.name, pattern));
    if (!matchedPattern) continue;

    // Validate capabilities
    const validation = validateFieldCapabilities(field, capabilities);
    results.push(validation);
  }

  return results;
}

/**
 * Get first valid field matching patterns with required capabilities
 */
export function getFirstValidField(
  schema: CollectionSchema | null,
  patterns: FieldPattern[],
  options: { sortable?: boolean; indexed?: boolean; types?: string[] } = {}
): any | null {
  // Map options to capabilities format
  const capabilities: FieldCapabilities = {
    sortable: options.sortable,
    indexed: options.indexed,
    types: options.types
  };
  
  const validatedFields = findFieldsWithCapabilities(schema, patterns, capabilities);
  const firstValid = validatedFields.find(vf => vf.isValid);
  return firstValid?.field || null;
}

/**
 * Get all valid fields matching patterns with required capabilities
 */
export function getValidFields(
  schema: CollectionSchema | null,
  patterns: FieldPattern[],
  capabilities: FieldCapabilities = {}
): any[] {
  const validatedFields = findFieldsWithCapabilities(schema, patterns, capabilities);
  return validatedFields
    .filter(vf => vf.isValid)
    .map(vf => vf.field);
}

/**
 * Validate if a field can be used for sorting
 */
export function isValidSortField(field: any): boolean {
  // Explicitly check if sort is disabled
  if (field.sort === false) {
    return false;
  }
  
  // Non-indexed fields cannot be sorted
  if (field.index === false) {
    return false;
  }
  
  // Optional fields cannot be used for sorting
  if (field.optional === true) {
    return false;
  }
  
  // Array fields cannot be used for sorting
  if (field.type?.includes('[]')) {
    return false;
  }
  
  // Object fields cannot be used for sorting
  if (field.type === 'object' || field.type === 'object[]') {
    return false;
  }
  
  // Auto fields cannot be used for sorting
  if (field.type === 'auto') {
    return false;
  }
  
  // Check if the field type supports sorting
  const sortableTypes = ['int32', 'int64', 'float', 'string', 'bool'];
  return sortableTypes.includes(field.type);
}

/**
 * Validate if a field can be used for faceting
 */
export function isValidFacetField(field: any): boolean {
  // Field must have facet enabled
  if (field.facet !== true) {
    return false;
  }
  
  // Auto fields cannot be faceted
  if (field.type === 'auto') {
    return false;
  }
  
  // Object fields cannot be faceted
  if (field.type === 'object' || field.type === 'object[]') {
    return false;
  }
  
  return true;
}

/**
 * Validate if a field can be searched
 */
export function isValidSearchField(field: any): boolean {
  // Fields must be indexed to be searchable
  if (field.index === false) {
    return false;
  }
  
  // Valid searchable types
  const searchableTypes = [
    'string', 'string[]',
    'int32', 'int32[]',
    'int64', 'int64[]',
    'float', 'float[]',
    'bool', 'bool[]',
    'auto'
  ];
  
  return searchableTypes.includes(field.type);
}