/**
 * @fileoverview Utility functions for building Typesense filter strings from various filter types.
 * Handles the complex logic of combining disjunctive, numeric, date, selective, and custom filters.
 */

import type {
  DisjunctiveFacetState,
  NumericFilterState,
  DateFilterState,
  SelectiveFilterState,
  CustomFilterState,
} from '../types';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';

/**
 * Checks if a field is numeric based on schema
 * @param fieldName - Field name to check
 * @param schema - Collection schema
 * @returns True if field is numeric
 */
export function isNumericField(fieldName: string, schema?: CollectionSchema | null): boolean {
  if (!schema?.fields) return false;
  
  const field = schema.fields.find(f => f.name === fieldName);
  if (!field) return false;
  
  return field.type === 'int32' || field.type === 'int64' || field.type === 'float';
}

/**
 * Checks if a field is boolean based on schema
 * @param fieldName - Field name to check
 * @param schema - Collection schema
 * @returns True if field is boolean
 */
export function isBooleanField(fieldName: string, schema?: CollectionSchema | null): boolean {
  if (!schema?.fields) return false;
  
  const field = schema.fields.find(f => f.name === fieldName);
  if (!field) return false;
  
  return field.type === 'bool';
}

/**
 * Escapes special characters in filter values to prevent syntax errors
 * @param value - Value to escape
 * @returns Escaped value safe for use in filters
 */
export function escapeFilterValue(value: string): string {
  // Escape backticks and backslashes
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

/**
 * Builds a filter string for disjunctive (OR) facets
 * @param field - Field name
 * @param values - Array of values to OR together
 * @param schema - Optional collection schema for type checking
 * @returns Filter string or null if no values
 */
export function buildDisjunctiveFilter(field: string, values: string[], schema?: CollectionSchema | null): string | null {
  if (!values || values.length === 0) return null;

  const isNumeric = isNumericField(field, schema);
  const isBoolean = isBooleanField(field, schema);

  if (values.length === 1) {
    // For numeric and boolean fields, don't wrap in backticks
    if (isNumeric || isBoolean) {
      return `${field}:=${values[0]}`;
    }
    return `${field}:=\`${escapeFilterValue(values[0])}\``;
  }

  // Multiple values use OR syntax
  const conditions = values.map(value => {
    // For numeric and boolean fields, don't wrap in backticks
    if (isNumeric || isBoolean) {
      return `${field}:=${value}`;
    }
    return `${field}:=\`${escapeFilterValue(value)}\``;
  });
  return `(${conditions.join(' || ')})`;
}

/**
 * Builds a simple filter string for a field-value pair
 * @param field - Field name
 * @param value - Value or array of values to filter by
 * @param exactMatch - Whether to use exact match with backticks
 * @param negate - Whether to negate the filter (use != instead of =)
 * @returns Filter string or empty string if no value
 */
export function buildFilter(
  field: string, 
  value: string | string[] | null | undefined, 
  exactMatch: boolean = false,
  negate: boolean = false
): string {
  if (!value || (Array.isArray(value) && value.length === 0)) return '';
  
  const operator = negate ? '!=' : '=';
  
  if (Array.isArray(value)) {
    return `${field}:${operator}[${value.join(',')}]`;
  }
  
  if (exactMatch) {
    return `${field}:${operator}\`${value}\``;
  }
  
  return `${field}:${operator}${value}`;
}

/**
 * Builds a filter string for numeric range filters
 * @param field - Field name
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Filter string or empty string if no range
 */
export function buildNumericFilter(field: string, min?: number, max?: number): string {
  if (min === undefined && max === undefined) return '';

  // Both min and max: use range syntax
  if (min !== undefined && max !== undefined) {
    return `${field}:[${min}..${max}]`;
  }

  // Only min: use >= syntax
  if (min !== undefined) {
    return `${field}:>=${min}`;
  }

  // Only max: use <= syntax
  if (max !== undefined) {
    return `${field}:<=${max}`;
  }

  return '';
}

/**
 * Builds a filter string for date range filters
 * @param field - Field name
 * @param start - Start date (inclusive)
 * @param end - End date (inclusive)
 * @returns Filter string or empty string if no range
 */
export function buildDateFilter(
  field: string, 
  start?: Date | string, 
  end?: Date | string
): string {
  if (!start && !end) return '';

  // Convert dates to Unix timestamps
  const startTimestamp = start ? (
    start instanceof Date ? Math.floor(start.getTime() / 1000) : Math.floor(new Date(start).getTime() / 1000)
  ) : undefined;
  
  const endTimestamp = end ? (
    end instanceof Date ? Math.floor(end.getTime() / 1000) : Math.floor(new Date(end).getTime() / 1000)
  ) : undefined;

  // Use numeric filter logic for timestamps
  return buildNumericFilter(field, startTimestamp, endTimestamp);
}

/**
 * Builds a geographic radius filter
 * @param field - Field name containing lat,lng coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @param radius - Radius for the search
 * @param unit - Unit for radius (default: 'km')
 * @returns Filter string
 * @throws Error if coordinates or radius are invalid
 */
export function buildGeoFilter(
  field: string,
  lat: number,
  lng: number,
  radius: number,
  unit: string = 'km'
): string {
  // Validate latitude (-90 to 90)
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  
  // Validate longitude (-180 to 180)
  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  
  // Validate radius (must be positive)
  if (radius <= 0) {
    throw new Error('Radius must be greater than 0');
  }
  
  // Format coordinates to maintain precision as shown in tests
  const formattedLat = lat.toFixed(4);
  const formattedLng = lng.toFixed(4);
  
  return `${field}:(${formattedLat},${formattedLng},${radius} ${unit})`;
}

/**
 * Builds a facet filter from facet selections
 * @param selections - Object mapping field names to arrays of selected values
 * @returns Combined filter string
 */
export function buildFacetFilter(selections: Record<string, string[]>): string {
  const filters: string[] = [];
  
  Object.entries(selections).forEach(([field, values]) => {
    if (values && values.length > 0) {
      if (values.length === 1) {
        filters.push(`${field}:=${values[0]}`);
      } else {
        filters.push(`${field}:=[${values.join(',')}]`);
      }
    }
  });
  
  return combineFilters(filters);
}

/**
 * Builds a filter string for selective (single-value) filters
 * @param field - Field name
 * @param value - Selected value
 * @param schema - Optional collection schema for type checking
 * @returns Filter string or null if no value
 */
export function buildSelectiveFilter(field: string, value: string, schema?: CollectionSchema | null): string | null {
  if (!value) return null;
  
  const isNumeric = isNumericField(field, schema);
  const isBoolean = isBooleanField(field, schema);
  
  if (isNumeric || isBoolean) {
    return `${field}:=${value}`;
  }
  return `${field}:=\`${escapeFilterValue(value)}\``;
}

/**
 * Builds a filter string for custom attribute filters
 * Custom filters use OR logic for multiple values
 * @param field - Field name
 * @param values - Array of values
 * @param schema - Optional collection schema for type checking
 * @returns Filter string or null if no values
 */
export function buildCustomFilter(field: string, values: string[], schema?: CollectionSchema | null): string | null {
  if (!values || values.length === 0) return null;
  
  // Use disjunctive logic for custom filters
  return buildDisjunctiveFilter(field, values, schema);
}

/**
 * Combines multiple filter strings with AND logic
 * @param filters - Array of filter strings
 * @param operator - Operator to use for combining filters (default: ' && ')
 * @returns Combined filter string
 */
export function combineFilters(filters: (string | null)[], operator: string = ' && '): string {
  const validFilters = filters.filter((f): f is string => f !== null && f.length > 0);
  return validFilters.join(operator);
}

/**
 * Builds a complete filter string from all filter types
 * @param params - Object containing all filter states
 * @returns Complete filter string for Typesense
 */
export function buildFilterString(params: {
  disjunctiveFacets?: DisjunctiveFacetState;
  numericFilters?: NumericFilterState;
  dateFilters?: DateFilterState;
  selectiveFilters?: SelectiveFilterState;
  customFilters?: CustomFilterState;
  additionalFilters?: string;
  schema?: CollectionSchema | null;
  useNumericRanges?: boolean;
  numericFacetRanges?: Record<string, { mode: 'individual' | 'range'; currentRange?: { min: number; max: number } }>;
}): string {
  const filters: (string | null)[] = [];

  // Add disjunctive facet filters
  if (params.disjunctiveFacets) {
    Object.entries(params.disjunctiveFacets).forEach(([field, values]) => {
      if (values && values.length > 0) {
        // Check if this numeric field should use range mode
        const isNumeric = isNumericField(field, params.schema);
        const rangeConfig = params.numericFacetRanges?.[field];
        const shouldUseRange = params.useNumericRanges && isNumeric && 
          rangeConfig?.mode === 'range' && values.length > 1;
        
        if (shouldUseRange) {
          // Convert selected values to a range
          const numericValues = values
            .map(v => parseFloat(v))
            .filter(n => !isNaN(n));
          
          if (numericValues.length > 0) {
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            filters.push(buildNumericFilter(field, min, max));
          }
        } else {
          // Use regular disjunctive filter
          filters.push(buildDisjunctiveFilter(field, values, params.schema));
        }
      }
    });
  }

  // Add numeric range filters
  if (params.numericFilters) {
    Object.entries(params.numericFilters).forEach(([field, range]) => {
      if (range) {
        filters.push(buildNumericFilter(field, range.min, range.max));
      }
    });
  }

  // Add date range filters
  if (params.dateFilters) {
    Object.entries(params.dateFilters).forEach(([field, range]) => {
      if (range) {
        filters.push(buildDateFilter(field, range.start, range.end));
      }
    });
  }

  // Add selective filters
  if (params.selectiveFilters) {
    Object.entries(params.selectiveFilters).forEach(([field, value]) => {
      if (value) {
        filters.push(buildSelectiveFilter(field, value, params.schema));
      }
    });
  }

  // Add custom filters
  if (params.customFilters) {
    Object.entries(params.customFilters).forEach(([field, values]) => {
      if (values && values.length > 0) {
        filters.push(buildCustomFilter(field, values, params.schema));
      }
    });
  }

  // Add any additional filters
  if (params.additionalFilters) {
    filters.push(params.additionalFilters);
  }

  return combineFilters(filters);
}

/**
 * Parses a filter string to extract different filter types
 * Used for deserializing saved filters
 * @param filterString - Filter string to parse
 * @returns Object with parsed filter states
 */
export function parseFilterString(filterString: string): {
  disjunctiveFacets: DisjunctiveFacetState;
  numericFilters: NumericFilterState;
  selectiveFilters: SelectiveFilterState;
  remainingFilters: string;
} {
  const disjunctiveFacets: DisjunctiveFacetState = {};
  const numericFilters: NumericFilterState = {};
  const selectiveFilters: SelectiveFilterState = {};
  const unprocessedFilters: string[] = [];

  // Split by && to get individual filter conditions
  const filterParts = filterString.split(' && ').map(s => s.trim()).filter(Boolean);

  filterParts.forEach(part => {
    // Check for disjunctive filters (contains || )
    if (part.includes(' || ')) {
      const match = part.match(/^\((.+)\)$/);
      if (match) {
        const conditions = match[1].split(' || ');
        const fieldValuePairs = conditions.map(cond => {
          // Try with backticks first
          let condMatch = cond.match(/^(\w+):=`(.+)`$/);
          if (condMatch) {
            return { field: condMatch[1], value: condMatch[2] };
          }
          // Try without backticks (for numeric/boolean)
          condMatch = cond.match(/^(\w+):=(.+)$/);
          return condMatch ? { field: condMatch[1], value: condMatch[2] } : null;
        }).filter(Boolean);

        if (fieldValuePairs.length > 0 && fieldValuePairs[0]) {
          const field = fieldValuePairs[0].field;
          const values = fieldValuePairs.map(pair => pair!.value);
          disjunctiveFacets[field] = values;
        }
      }
    }
    // Check for numeric range filters
    else if (part.includes(':[') && part.includes('..]')) {
      const match = part.match(/^(\w+):\[(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)\]$/);
      if (match) {
        numericFilters[match[1]] = {
          min: parseFloat(match[2]),
          max: parseFloat(match[3])
        };
      }
    }
    // Check for numeric comparison filters
    else if (part.includes(':>=') || part.includes(':<=')) {
      const geMatch = part.match(/^(\w+):>=(-?\d+(?:\.\d+)?)$/);
      const leMatch = part.match(/^(\w+):<=(-?\d+(?:\.\d+)?)$/);
      
      if (geMatch) {
        numericFilters[geMatch[1]] = { 
          ...numericFilters[geMatch[1]], 
          min: parseFloat(geMatch[2]) 
        };
      } else if (leMatch) {
        numericFilters[leMatch[1]] = { 
          ...numericFilters[leMatch[1]], 
          max: parseFloat(leMatch[2]) 
        };
      }
    }
    // Check for exact match filters
    else if (part.includes(':=')) {
      // Try with backticks first
      let match = part.match(/^(\w+):=`(.+)`$/);
      if (match) {
        selectiveFilters[match[1]] = match[2];
      } else {
        // Try without backticks (for numeric/boolean)
        match = part.match(/^(\w+):=(.+)$/);
        if (match) {
          selectiveFilters[match[1]] = match[2];
        }
      }
    }
    // Unprocessed filter
    else {
      unprocessedFilters.push(part);
    }
  });

  return {
    disjunctiveFacets,
    numericFilters,
    selectiveFilters,
    remainingFilters: unprocessedFilters.join(' && ')
  };
}