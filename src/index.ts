/**
 * @fileoverview Main entry point for the Typesense search handler package.
 * Exports all public APIs including providers, hooks, utilities, and types.
 */

// Core exports
export { TypesenseSearchClient } from './core/TypesenseClient';
export { searchReducer, initialSearchState, createInitialState } from './core/searchReducer';

// Provider exports
export { SearchProvider, SearchContext, useSearchContext } from './providers/SearchProvider';

// Hook exports
export { useSearch } from './hooks/useSearch';
export { useAdvancedFacets, parseFilters, hasActiveFilters, getActiveFilterValues } from './hooks/useAdvancedFacets';
export { useFacetState, useSingleFacetState } from './hooks/useFacetState';
export { useSchemaDiscovery, shouldBeDisjunctive, getDefaultSortField } from './hooks/useSchemaDiscovery';
export { useAccumulatedFacets, type MergedFacetResult } from './hooks/useAccumulatedFacets';
export { useNumericFacetRange, valuesToRange, isValueInRange, type UseNumericFacetRangeReturn } from './hooks/useNumericFacetRange';
export { useFacetMode, useSingleSelectValue, useSingleSelectFacet, type FacetModeResult } from './hooks/useFacetMode';
export { useAdditionalFilters, useAdditionalFiltersWithInitial, type UseAdditionalFiltersReturn } from './hooks/useAdditionalFilters';
export { useDateFilter, useDateFieldFilter, type UseDateFilterReturn } from './hooks/useDateFilter';
export { useSearchUrlSync, type UseSearchUrlSyncOptions, type UseSearchUrlSyncReturn } from './hooks/useSearchUrlSync';

// Utility exports
export {
  escapeFilterValue,
  buildDisjunctiveFilter,
  buildNumericFilter,
  buildDateFilter,
  buildSelectiveFilter,
  buildCustomFilter,
  combineFilters,
  buildFilterString,
  parseFilterString,
  isNumericField,
  isBooleanField,
} from './utils/filterBuilder';

export {
  type SortField,
  isSortableField,
  buildSingleSortString,
  buildMultiSortString,
  buildCombinedSortString,
  parseSingleSortString,
  parseSortString,
  normalizeSortInput,
  validateSortFields,
} from './utils/sortBuilder';

export {
  type FieldPattern,
  type SchemaPatternConfig,
  DEFAULT_TIMESTAMP_PATTERNS,
  DEFAULT_DISJUNCTIVE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_DATE_PATTERNS,
  DEFAULT_SELECT_PATTERNS,
  matchesPattern,
  matchesAnyPattern,
  getMatchingPattern,
} from './utils/schemaPatterns';

export {
  type FieldCapabilities,
  type ValidatedField,
  validateFieldCapabilities,
  findFieldsWithCapabilities,
  getFirstValidField,
  getValidFields,
  isValidSortField,
  isValidFacetField,
  isValidSearchField,
} from './utils/schemaValidation';

export {
  getLastNDaysFilter,
  getDateRangeFilter,
  getCurrentMonthFilter,
  getCurrentYearFilter,
  getLastNMonthsFilter,
  getMonthFilter,
  getAfterDateFilter,
  getBeforeDateFilter,
  parseDateRangeFromFilter,
  DateRangePresets,
} from './utils/dateFilterHelpers';

export {
  parseAdditionalFilters,
  combineAdditionalFilters,
  updateFilterInAdditionalFilters,
  removeFilterFromAdditionalFilters,
  hasFieldInAdditionalFilters,
  getFilterForField,
  mergeAdditionalFilters,
  validateAdditionalFilters,
} from './utils/additionalFiltersManager';

export {
  serializeSearchState,
  deserializeSearchParams,
  type UrlSerializerOptions,
  type UrlDeserializerOptions,
} from './utils/urlSerializer';

// Type exports
export type {
  // Configuration types
  TypesenseConfig,
  SearchRequest,
  SearchProviderProps,
  
  // Response types
  SearchHit,
  TypesenseSearchResponse,
  FacetResult,
  FacetValue,
  
  // State types
  SearchState,
  SearchAction,
  SearchContextValue,
  DisjunctiveFacetState,
  NumericFilterState,
  DateFilterState,
  SelectiveFilterState,
  CustomFilterState,
  AccumulatedFacetValues,
  NumericFacetRange,
  NumericFacetRangesState,
  
  // UI configuration types
  FacetConfig,
  ColumnConfig,
  SavedFilter,
  
  // Hook return types
  UseSearchReturn,
  UseAdvancedFacetsReturn,
} from './types';

// Re-export Typesense types that consumers might need
export type { CollectionSchema } from 'typesense/lib/Typesense/Collection';

// Multi-collection search exports (optional, non-polluting)
export * from './multiCollection';