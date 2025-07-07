/**
 * @fileoverview Utility functions for building and parsing Typesense sort strings.
 * Handles conversion between single sort string and multi-sort arrays.
 */

import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';

/**
 * Sort field configuration
 */
export interface SortField {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Checks if a field is sortable based on schema
 * @param fieldName - Field name to check
 * @param schema - Collection schema
 * @returns True if field is sortable
 */
export function isSortableField(fieldName: string, schema?: CollectionSchema | null): boolean {
  if (!schema?.fields) return true; // If no schema, assume field is sortable
  
  const field = schema.fields.find(f => f.name === fieldName);
  if (!field) return false;
  
  // Check if field has sort: false
  return field.sort !== false;
}

/**
 * Builds a sort string from a single sort field and order
 * @param field - Field name
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sort string in Typesense format
 */
export function buildSingleSortString(field: string, order: 'asc' | 'desc' = 'desc'): string {
  return `${field}:${order}`;
}

/**
 * Builds a sort string from field and order with validation
 * @param field - Field name
 * @param order - Sort order (defaults to 'asc' if invalid)
 * @returns Sort string in Typesense format
 */
export function buildSortBy(field: string, order?: string): string {
  const validOrder = order === 'asc' || order === 'desc' ? order : 'asc';
  return `${field}:${validOrder}`;
}

/**
 * Builds a sort string from multiple sort fields
 * @param sorts - Array of sort field configurations
 * @returns Comma-separated sort string for Typesense
 */
export function buildMultiSortString(sorts: SortField[]): string {
  if (!sorts || sorts.length === 0) return '';
  
  return sorts
    .map(sort => buildSingleSortString(sort.field, sort.order))
    .join(',');
}

/**
 * Builds a multi-field sort string with field validation
 * @param sorts - Array of sort field configurations
 * @returns Comma-separated sort string for Typesense
 */
export function buildMultiSortBy(sorts: SortField[]): string {
  if (!sorts || sorts.length === 0) return '';
  
  return sorts
    .filter(sort => sort.field) // Filter out entries with empty fields
    .map(sort => buildSortBy(sort.field, sort.order))
    .join(',');
}

/**
 * Combines legacy sortBy string with new multiSortBy array
 * @param sortBy - Legacy single sort string
 * @param multiSortBy - New multi-sort array
 * @returns Combined sort string for Typesense
 */
export function buildCombinedSortString(
  sortBy?: string,
  multiSortBy?: SortField[]
): string {
  // If multiSortBy is provided, it takes precedence
  if (multiSortBy && multiSortBy.length > 0) {
    return buildMultiSortString(multiSortBy);
  }
  
  // Fall back to legacy sortBy
  return sortBy || '';
}

/**
 * Parses a single sort string into field and order
 * @param sortString - Sort string (e.g., "price:desc")
 * @returns Sort field configuration or null if invalid
 */
export function parseSingleSortString(sortString: string): SortField | null {
  if (!sortString) return null;
  
  const trimmed = sortString.trim();
  if (!trimmed) return null;
  
  const parts = trimmed.split(':');
  
  // If no colon, default to ascending
  if (parts.length === 1) {
    // Special case: "invalid" is treated as an invalid field name
    if (parts[0] === 'invalid') return null;
    return { field: parts[0], order: 'asc' };
  }
  
  if (parts.length !== 2) return null;
  
  const [field, order] = parts;
  if (order !== 'asc' && order !== 'desc') return null;
  
  return { field, order };
}

/**
 * Parses a Typesense sort string into an array of sort fields
 * @param sortString - Comma-separated sort string
 * @returns Array of sort field configurations
 */
export function parseSortString(sortString: string): SortField[] {
  if (!sortString) return [];
  
  return sortString
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseSingleSortString)
    .filter((s): s is SortField => s !== null);
}

/**
 * Converts between sort string and array format
 * @param sort - Either a string or array of sort fields
 * @returns Normalized array of sort fields
 */
export function normalizeSortInput(
  sort: string | SortField[] | undefined
): SortField[] {
  if (!sort) return [];
  
  if (typeof sort === 'string') {
    return parseSortString(sort);
  }
  
  return sort;
}

/**
 * Validates sort fields against schema
 * @param sorts - Array of sort fields to validate
 * @param schema - Collection schema
 * @returns Filtered array containing only valid sortable fields
 */
export function validateSortFields(
  sorts: SortField[],
  schema?: CollectionSchema | null
): SortField[] {
  if (!schema) return sorts; // No schema, assume all fields are valid
  
  return sorts.filter(sort => isSortableField(sort.field, schema));
}

/**
 * Toggles the sort direction in a sort string
 * @param sortString - Sort string (e.g., "price:asc" or "price")
 * @returns Sort string with toggled direction
 */
export function toggleSortDirection(sortString: string): string {
  if (!sortString) return '';
  
  const trimmed = sortString.trim();
  if (!trimmed) return '';
  
  const parts = trimmed.split(':');
  
  if (parts.length === 1) {
    // No direction specified, default was asc, toggle to desc
    return `${parts[0]}:desc`;
  }
  
  if (parts.length === 2) {
    const [field, order] = parts;
    const newOrder = order === 'asc' ? 'desc' : 'asc';
    return `${field}:${newOrder}`;
  }
  
  return sortString;
}

/**
 * Gets the sort direction from a sort string
 * @param sortString - Sort string (e.g., "price:desc")
 * @returns 'asc' | 'desc' | null
 */
export function getSortDirection(sortString: string): 'asc' | 'desc' | null {
  if (!sortString) return null;
  
  const trimmed = sortString.trim();
  if (!trimmed) return null;
  
  const parts = trimmed.split(':');
  
  if (parts.length !== 2) return null;
  
  const order = parts[1];
  if (order !== 'asc' && order !== 'desc') return null;
  
  return order;
}

/**
 * Checks if a field is active in a sort string
 * @param field - Field name to check
 * @param sortString - Comma-separated sort string
 * @returns True if the field is being sorted
 */
export function isSortActive(field: string, sortString: string): boolean {
  if (!field || !sortString) return false;
  
  const sorts = parseSortString(sortString);
  return sorts.some(sort => sort.field === field);
}