/**
 * @fileoverview Configurable pattern matching utilities for schema field discovery
 */

/**
 * Pattern matching configuration for field discovery
 */
export interface FieldPattern {
  /** Pattern to match against field names */
  pattern: string;
  /** Whether to match exactly or contains */
  matchType: 'exact' | 'contains' | 'startsWith' | 'endsWith';
  /** Case sensitive matching */
  caseSensitive?: boolean;
}

/**
 * Configuration for schema discovery patterns
 */
export interface SchemaPatternConfig {
  /** Patterns for identifying timestamp fields */
  timestampPatterns?: FieldPattern[];
  /** Patterns for identifying disjunctive (OR) fields */
  disjunctivePatterns?: FieldPattern[];
  /** Patterns for identifying fields to exclude */
  excludePatterns?: FieldPattern[];
  /** Patterns for identifying date fields */
  datePatterns?: FieldPattern[];
  /** Patterns for identifying low-cardinality fields (for select UI) */
  selectFieldPatterns?: FieldPattern[];
}

/**
 * Default timestamp patterns
 */
export const DEFAULT_TIMESTAMP_PATTERNS: FieldPattern[] = [
  { pattern: 'created_at', matchType: 'exact' },
  { pattern: 'updated_at', matchType: 'exact' },
  { pattern: 'modified_at', matchType: 'exact' },
  { pattern: 'timestamp', matchType: 'exact' },
  { pattern: '_at', matchType: 'endsWith' },
  { pattern: 'At', matchType: 'endsWith' },
  { pattern: 'Date', matchType: 'contains' },
  { pattern: 'Time', matchType: 'contains' },
];

/**
 * Default disjunctive field patterns
 */
export const DEFAULT_DISJUNCTIVE_PATTERNS: FieldPattern[] = [
  { pattern: 'tags', matchType: 'exact' },
  { pattern: 'tag', matchType: 'contains' },
  { pattern: 'categories', matchType: 'exact' },
  { pattern: 'category', matchType: 'contains' },
  { pattern: 'type', matchType: 'contains' },
  { pattern: 'status', matchType: 'contains' },
  { pattern: 'region', matchType: 'contains' },
  { pattern: 'location', matchType: 'contains' },
  { pattern: 'labels', matchType: 'exact' },
  { pattern: 'label', matchType: 'contains' },
];

/**
 * Default exclude patterns
 */
export const DEFAULT_EXCLUDE_PATTERNS: FieldPattern[] = [
  { pattern: 'id', matchType: 'exact' },
  { pattern: '_id', matchType: 'exact' },
  { pattern: 'created_at', matchType: 'exact' },
  { pattern: 'updated_at', matchType: 'exact' },
  { pattern: 'timestamp', matchType: 'exact' },
  { pattern: 'searchText', matchType: 'exact' },
  { pattern: 'embeddings', matchType: 'exact' },
  { pattern: 'embedding', matchType: 'contains' },
  { pattern: 'vector', matchType: 'contains' },
  { pattern: 'password', matchType: 'contains', caseSensitive: false },
  { pattern: 'secret', matchType: 'contains', caseSensitive: false },
  { pattern: 'token', matchType: 'contains', caseSensitive: false },
];

/**
 * Default date field patterns
 */
export const DEFAULT_DATE_PATTERNS: FieldPattern[] = [
  { pattern: 'date', matchType: 'contains', caseSensitive: false },
  { pattern: '_at', matchType: 'endsWith' },
  { pattern: 'At', matchType: 'endsWith' },
  { pattern: 'time', matchType: 'contains', caseSensitive: false },
  { pattern: 'dob', matchType: 'exact', caseSensitive: false },
  { pattern: 'birthdate', matchType: 'contains', caseSensitive: false },
];

/**
 * Default select field patterns (low cardinality)
 */
export const DEFAULT_SELECT_PATTERNS: FieldPattern[] = [
  { pattern: 'status', matchType: 'exact' },
  { pattern: 'state', matchType: 'exact' },
  { pattern: 'type', matchType: 'exact' },
  { pattern: 'category', matchType: 'exact' },
  { pattern: 'priority', matchType: 'exact' },
  { pattern: 'severity', matchType: 'exact' },
  { pattern: 'level', matchType: 'exact' },
  { pattern: 'role', matchType: 'exact' },
  { pattern: 'gender', matchType: 'exact' },
  { pattern: 'country', matchType: 'exact' },
];

/**
 * Check if a field name matches a pattern
 */
export function matchesPattern(fieldName: string, pattern: FieldPattern): boolean {
  const name = pattern.caseSensitive === false ? fieldName.toLowerCase() : fieldName;
  const patternStr = pattern.caseSensitive === false ? pattern.pattern.toLowerCase() : pattern.pattern;

  switch (pattern.matchType) {
    case 'exact':
      return name === patternStr;
    case 'contains':
      return name.includes(patternStr);
    case 'startsWith':
      return name.startsWith(patternStr);
    case 'endsWith':
      return name.endsWith(patternStr);
    default:
      return false;
  }
}

/**
 * Check if a field name matches any pattern in a list
 */
export function matchesAnyPattern(fieldName: string, patterns: FieldPattern[]): boolean {
  return patterns.some(pattern => matchesPattern(fieldName, pattern));
}

/**
 * Get the first matching pattern for a field
 */
export function getMatchingPattern(fieldName: string, patterns: FieldPattern[]): FieldPattern | null {
  return patterns.find(pattern => matchesPattern(fieldName, pattern)) || null;
}