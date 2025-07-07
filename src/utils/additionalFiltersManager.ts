/**
 * @fileoverview Utilities for managing additional filters in Typesense.
 * Provides functions to parse, combine, and manipulate filter strings.
 */

/**
 * Parses an additional filters string into a Map of field -> filter
 * @param filters - The filter string to parse
 * @returns A Map with field names as keys and filter expressions as values
 */
export function parseAdditionalFilters(filters: string): Map<string, string> {
  const filterMap = new Map<string, string>();
  
  if (!filters || filters.trim() === '') {
    return filterMap;
  }
  
  // Split by && but handle nested conditions
  const parts = splitFilterString(filters);
  
  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    // Handle grouped conditions (e.g., "(category:electronics || category:computers)")
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      // Store the entire grouped condition as a single filter
      filterMap.set(trimmed, trimmed);
    } else {
      // Extract field name from the filter
      const field = extractFieldFromFilter(trimmed);
      if (field) {
        filterMap.set(field, trimmed);
      }
    }
  });
  
  return filterMap;
}

/**
 * Splits a filter string by && while respecting parentheses
 * @param filterString - The filter string to split
 * @returns Array of filter parts
 */
function splitFilterString(filterString: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < filterString.length; i++) {
    const char = filterString[i];
    
    if (char === '(') depth++;
    else if (char === ')') depth--;
    
    if (depth === 0 && filterString.substring(i, i + 4) === ' && ') {
      parts.push(current);
      current = '';
      i += 3; // Skip past ' && '
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current);
  }
  
  return parts;
}

/**
 * Combines a Map of filters back into a filter string
 * @param filters - Map of field -> filter expression
 * @returns Combined filter string
 */
export function combineAdditionalFilters(filters: Map<string, string>): string {
  if (filters.size === 0) {
    return '';
  }
  
  // Convert to array while maintaining insertion order
  const filterArray: string[] = [];
  filters.forEach((value) => {
    if (value) {
      filterArray.push(value);
    }
  });
  
  return filterArray.join(' && ');
}

/**
 * Updates or adds a filter for a specific field
 * @param currentFilters - Current filter string
 * @param field - Field name to update
 * @param newFilter - New filter expression (or empty to remove)
 * @returns Updated filter string
 */
export function updateFilterInAdditionalFilters(
  currentFilters: string, 
  field: string, 
  newFilter: string
): string {
  const filterMap = parseAdditionalFilters(currentFilters);
  
  if (newFilter) {
    filterMap.set(field, newFilter);
  } else {
    filterMap.delete(field);
  }
  
  return combineAdditionalFilters(filterMap);
}

/**
 * Removes a filter for a specific field
 * @param currentFilters - Current filter string
 * @param field - Field name to remove
 * @returns Updated filter string
 */
export function removeFilterFromAdditionalFilters(
  currentFilters: string, 
  field: string
): string {
  return updateFilterInAdditionalFilters(currentFilters, field, '');
}

/**
 * Checks if a filter exists for a specific field
 * @param filters - Filter string to check
 * @param field - Field name to look for
 * @returns True if a filter exists for the field
 */
export function hasFieldInAdditionalFilters(filters: string, field: string): boolean {
  const filterMap = parseAdditionalFilters(filters);
  return filterMap.has(field);
}

/**
 * Gets the filter expression for a specific field
 * @param filters - Filter string
 * @param field - Field name
 * @returns The filter expression or null if not found
 */
export function getFilterForField(filters: string, field: string): string | null {
  const filterMap = parseAdditionalFilters(filters);
  return filterMap.get(field) || null;
}

/**
 * Merges two filter strings, with the second taking precedence
 * @param filters1 - First filter string
 * @param filters2 - Second filter string (takes precedence)
 * @returns Merged filter string
 */
export function mergeAdditionalFilters(filters1: string, filters2: string): string {
  const map1 = parseAdditionalFilters(filters1);
  const map2 = parseAdditionalFilters(filters2);
  
  // Merge maps with map2 taking precedence
  const merged = new Map([...map1, ...map2]);
  
  return combineAdditionalFilters(merged);
}

/**
 * Extracts the field name from a filter expression
 * @param filter - The filter expression
 * @returns The field name or null if not found
 */
export function extractFieldFromFilter(filter: string): string | null {
  if (!filter || filter.trim() === '') {
    return null;
  }
  
  // Match field names that can contain letters, numbers, and underscores
  // Supports various operators: :, :=, :>, :<, :>=, :<=, :[, :(
  const match = filter.match(/^([a-zA-Z_][a-zA-Z0-9_]*):(?:=|>|<|>=|<=|\[|\(|(?![=><\[\(]))/);
  
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * Validates a filter string syntax
 * @param filterString - Filter string to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateAdditionalFilters(filterString: string): { 
  isValid: boolean; 
  error?: string 
} {
  if (!filterString || filterString.trim() === '') {
    return { isValid: true };
  }
  
  // Check for balanced parentheses
  let depth = 0;
  for (const char of filterString) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (depth < 0) {
      return { isValid: false, error: 'Unmatched closing parenthesis' };
    }
  }
  
  if (depth !== 0) {
    return { isValid: false, error: 'Unmatched opening parenthesis' };
  }
  
  // Check for multiple consecutive operators
  if (filterString.includes(' && &&') || filterString.includes('&& && ')) {
    return { isValid: false, error: 'Invalid filter format: multiple consecutive operators' };
  }
  
  // Check for valid filter format
  const parts = splitFilterString(filterString);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Invalid filter format: empty filter part' };
    }
    
    // Skip grouped conditions for now
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      // Validate nested content recursively
      const inner = trimmed.substring(1, trimmed.length - 1);
      if (inner.trim() === '') {
        return { isValid: false, error: 'Invalid filter format: empty parentheses' };
      }
      continue;
    }
    
    // Check if the filter has a valid format (field:value)
    const field = extractFieldFromFilter(trimmed);
    if (!field) {
      return { isValid: false, error: `Invalid filter format: ${trimmed}` };
    }
  }
  
  return { isValid: true };
}