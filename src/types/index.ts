/**
 * @fileoverview Core TypeScript type definitions for the Typesense search handler.
 * These types define the complete structure of search requests, responses, and state management.
 */

import type { SearchResponse, SearchResponseHit, DocumentSchema, SearchResponseFacetCountSchema } from 'typesense/lib/Typesense/Documents';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';

/**
 * Configuration for initializing the Typesense client
 */
export interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number;
    protocol: string;
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
  cacheSearchResultsForSeconds?: number;
}

/**
 * Extended search request parameters for Typesense
 */
export interface SearchRequest {
  q: string;
  query_by: string;
  filter_by?: string;
  facet_by?: string;
  sort_by?: string;
  max_facet_values?: number;
  facet_query?: string;
  page?: number;
  per_page?: number;
  group_by?: string;
  group_limit?: number;
  include_fields?: string;
  exclude_fields?: string;
  highlight_fields?: string;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  snippet_threshold?: number;
  num_typos?: number;
  min_len_1typo?: number;
  min_len_2typo?: number;
  typo_tokens_threshold?: number;
  drop_tokens_threshold?: number;
  prefix?: boolean | string;
  infix?: 'off' | 'always' | 'fallback';
  pre_segmented_query?: boolean;
  query_by_weights?: string;
  limit_hits?: number;
  search_cutoff_ms?: number;
  use_cache?: boolean;
  cache_ttl?: number;
  prioritize_exact_match?: boolean;
  exhaustive_search?: boolean;
  pinned_hits?: string;
  hidden_hits?: string;
  preset?: string;
}

/**
 * Individual search hit with document data
 */
export interface SearchHit<T extends DocumentSchema = Record<string, any>> extends Omit<SearchResponseHit<T>, 'text_match'> {
  document: T;
  text_match?: number;
}

/**
 * Complete search response from Typesense
 */
export interface TypesenseSearchResponse<T extends DocumentSchema = Record<string, any>> extends Omit<SearchResponse<T>, 'request_params' | 'hits'> {
  facet_counts?: SearchResponseFacetCountSchema<T>[];
  hits?: SearchHit<T>[];
  found: number;
  search_time_ms: number;
  page: number;
  request_params: SearchRequest;
  search_cutoff?: boolean;
}

/**
 * Facet configuration for UI rendering
 */
export interface FacetConfig {
  /** Field name in the document */
  field: string;
  /** Display label for the facet */
  label: string;
  /** Type of facet rendering */
  type: 'checkbox' | 'select' | 'numeric' | 'date' | 'custom';
  /** Whether this facet uses disjunctive (OR) logic */
  disjunctive?: boolean;
  /** Maximum number of values to display */
  maxValues?: number;
  /** Whether to show search box for values */
  searchable?: boolean;
  /** Whether facet is initially expanded */
  expanded?: boolean;
  /** Sort order for facet values */
  sortBy?: 'count' | 'value' | 'alpha';
  /** For numeric facets, the step size */
  step?: number;
  /** For date facets, the date format */
  dateFormat?: string;
  /** Custom render function */
  renderLabel?: (value: string) => string;
  /** For numeric facets, how to display them */
  numericDisplay?: 'checkbox' | 'range' | 'both';
  /** For range sliders, the step granularity */
  rangeStep?: number;
}

/**
 * Facet result from Typesense API
 */
export interface FacetResult {
  field_name: string;
  counts: FacetValue[];
  stats?: {
    avg?: number;
    max?: number;
    min?: number;
    sum?: number;
  };
}

/**
 * Individual facet value with count
 */
export interface FacetValue {
  value: string;
  count: number;
  highlighted?: string;
}

/**
 * State for disjunctive (OR) facets
 */
export interface DisjunctiveFacetState {
  [field: string]: string[];
}

/**
 * State for numeric range filters
 */
export interface NumericFilterState {
  [field: string]: {
    min?: number;
    max?: number;
  };
}

/**
 * State for date range filters
 */
export interface DateFilterState {
  [field: string]: {
    start?: Date | string;
    end?: Date | string;
  };
}

/**
 * State for selective (single-value) filters
 */
export interface SelectiveFilterState {
  [field: string]: string;
}

/**
 * State for custom attribute filters
 */
export interface CustomFilterState {
  [field: string]: string[];
}

/**
 * Column configuration for table displays
 */
export interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

/**
 * Saved filter configuration
 */
export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: {
    query?: string;
    disjunctiveFacets?: DisjunctiveFacetState;
    numericFilters?: NumericFilterState;
    dateFilters?: DateFilterState;
    selectiveFilters?: SelectiveFilterState;
    customFilters?: CustomFilterState;
  };
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Numeric facet range configuration
 */
export interface NumericFacetRange {
  /** Whether this facet is in range mode or individual selection mode */
  mode: 'individual' | 'range';
  /** Available bounds from all values */
  bounds: { min: number; max: number };
  /** Currently selected range (when in range mode) */
  currentRange?: { min: number; max: number };
}

/**
 * Numeric facet ranges state
 */
export interface NumericFacetRangesState {
  [field: string]: NumericFacetRange;
}

/**
 * Accumulated facet values across searches
 */
export interface AccumulatedFacetValues {
  [field: string]: {
    values: Set<string>;
    /** Array to maintain insertion order */
    orderedValues: string[];
    /** Numeric bounds for numeric fields */
    numericBounds?: { min: number; max: number };
    lastUpdated: number;
  };
}

/**
 * Complete search state managed by the provider
 */
export interface SearchState {
  /** Current search query */
  query: string;
  /** Search results from Typesense */
  results: TypesenseSearchResponse | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Available facets configuration */
  facets: FacetConfig[];
  /** Disjunctive facet selections */
  disjunctiveFacets: DisjunctiveFacetState;
  /** Numeric range filters */
  numericFilters: NumericFilterState;
  /** Date range filters */
  dateFilters: DateFilterState;
  /** Selective (single-value) filters */
  selectiveFilters: SelectiveFilterState;
  /** Custom attribute filters */
  customFilters: CustomFilterState;
  /** Current page number (1-indexed) */
  page: number;
  /** Results per page */
  perPage: number;
  /** Sort field and order */
  sortBy: string;
  /** Multiple sort fields with order (e.g., [{field: 'price', order: 'desc'}, {field: 'name', order: 'asc'}]) */
  multiSortBy?: Array<{ field: string; order: 'asc' | 'desc' }>;
  /** Additional raw filter string that will be AND-ed with other filters */
  additionalFilters?: string;
  /** Collection schema */
  schema: CollectionSchema | null;
  /** Whether search has been performed */
  searchPerformed: boolean;
  /** Last search timestamp */
  lastSearchAt?: number;
  /** Accumulated facet values across all searches */
  accumulatedFacetValues: AccumulatedFacetValues;
  /** Whether to accumulate facet values */
  accumulateFacets: boolean;
  /** Whether to move selected facet values to the top */
  moveSelectedToTop: boolean;
  /** Whether to reorder facet values by count (vs keeping insertion order) */
  reorderByCount: boolean;
  /** Whether to use numeric ranges for numeric facets */
  useNumericRanges: boolean;
  /** Numeric facet range configurations */
  numericFacetRanges: NumericFacetRangesState;
  /** Limit for facet options - facets exceeding this become single-select */
  facetOptionLimit: number;
  /** Whether to hide zero-count options for single-select facets */
  hideZeroCountsForSingleSelect: boolean;
  /** Whether to allow numeric facets to use range behavior when over the limit */
  allowNumericRangeForSingleSelect: boolean;
}

/**
 * Actions for updating search state
 */
export type SearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_RESULTS'; payload: TypesenseSearchResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_FACETS'; payload: FacetConfig[] }
  | { type: 'SET_DISJUNCTIVE_FACETS'; payload: DisjunctiveFacetState }
  | { type: 'TOGGLE_DISJUNCTIVE_FACET'; payload: { field: string; value: string } }
  | { type: 'SET_NUMERIC_FILTER'; payload: { field: string; min?: number; max?: number } }
  | { type: 'SET_DATE_FILTER'; payload: { field: string; start?: Date | string; end?: Date | string } }
  | { type: 'SET_SELECTIVE_FILTER'; payload: { field: string; value: string } }
  | { type: 'SET_CUSTOM_FILTER'; payload: { field: string; values: string[] } }
  | { type: 'CLEAR_FILTER'; payload: { field: string; filterType: 'disjunctive' | 'numeric' | 'date' | 'selective' | 'custom' } }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PER_PAGE'; payload: number }
  | { type: 'SET_SORT_BY'; payload: string }
  | { type: 'SET_SCHEMA'; payload: CollectionSchema }
  | { type: 'RESET_SEARCH' }
  | { type: 'BATCH_UPDATE'; payload: Partial<SearchState> }
  | { type: 'SET_ACCUMULATE_FACETS'; payload: boolean }
  | { type: 'UPDATE_ACCUMULATED_FACETS'; payload: { field: string; values: string[] } }
  | { type: 'CLEAR_ACCUMULATED_FACETS'; payload?: string }
  | { type: 'SET_MOVE_SELECTED_TO_TOP'; payload: boolean }
  | { type: 'SET_REORDER_BY_COUNT'; payload: boolean }
  | { type: 'SET_USE_NUMERIC_RANGES'; payload: boolean }
  | { type: 'SET_NUMERIC_FACET_MODE'; payload: { field: string; mode: 'individual' | 'range' } }
  | { type: 'SET_NUMERIC_FACET_RANGE'; payload: { field: string; min: number; max: number } }
  | { type: 'UPDATE_NUMERIC_FACET_BOUNDS'; payload: { field: string; min: number; max: number } }
  | { type: 'CLEAR_NUMERIC_FACET_RANGE'; payload: string }
  | { type: 'SET_FACET_OPTION_LIMIT'; payload: number }
  | { type: 'SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT'; payload: boolean }
  | { type: 'SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT'; payload: boolean }
  | { type: 'SET_ADDITIONAL_FILTERS'; payload: string }
  | { type: 'SET_MULTI_SORT_BY'; payload: Array<{ field: string; order: 'asc' | 'desc' }> }
  | { type: 'ADD_SORT_FIELD'; payload: { field: string; order: 'asc' | 'desc' } }
  | { type: 'REMOVE_SORT_FIELD'; payload: string }
  | { type: 'CLEAR_MULTI_SORT' };

/**
 * Search provider configuration options
 */
export interface SearchProviderProps {
  /** Typesense configuration */
  config: TypesenseConfig;
  /** Collection name to search */
  collection: string;
  /** Initial search parameters */
  initialSearchParams?: Partial<SearchRequest>;
  /** Initial state values */
  initialState?: Partial<SearchState>;
  /** Facet configurations */
  facets?: FacetConfig[];
  /** Whether to search on mount */
  searchOnMount?: boolean;
  /** Callback when state changes */
  onStateChange?: (state: SearchState) => void;
  /** Children components */
  children: React.ReactNode;
  /** Performance mode - disables some features for better performance */
  performanceMode?: boolean;
  /** Enable disjunctive facet queries */
  enableDisjunctiveFacetQueries?: boolean;
  /** Enable accumulation of facet values across searches */
  accumulateFacets?: boolean;
}

/**
 * Context value provided by SearchProvider
 */
export interface SearchContextValue {
  /** Current search state */
  state: SearchState;
  /** Dispatch function for state updates */
  dispatch: React.Dispatch<SearchAction>;
  /** Typesense client instance */
  client: any; // Will be TypesenseSearchClient
  /** Collection name */
  collection: string;
  /** Initial search parameters */
  initialSearchParams?: Partial<SearchRequest>;
  /** Search configuration */
  config: {
    searchOnMount: boolean;
    performanceMode: boolean;
    enableDisjunctiveFacetQueries: boolean;
  };
}

/**
 * Hook return types
 */
export interface UseSearchReturn {
  /** Current search state */
  state: SearchState;
  /** Search actions */
  actions: {
    search: (query?: string) => Promise<void>;
    setQuery: (query: string) => void;
    setPage: (page: number) => void;
    setPerPage: (perPage: number) => void;
    setSortBy: (sortBy: string) => void;
    clearAllFilters: () => void;
    reset: () => void;
    setAdditionalFilters: (filters: string) => void;
    setMultiSortBy: (sorts: Array<{ field: string; order: 'asc' | 'desc' }>) => void;
    addSortField: (field: string, order?: 'asc' | 'desc') => void;
    removeSortField: (field: string) => void;
    clearMultiSort: () => void;
  };
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
}

export interface UseAdvancedFacetsReturn {
  /** Active disjunctive facets */
  disjunctiveFacets: DisjunctiveFacetState;
  /** Active numeric filters */
  numericFilters: NumericFilterState;
  /** Active date filters */
  dateFilters: DateFilterState;
  /** Active selective filters */
  selectiveFilters: SelectiveFilterState;
  /** Active custom filters */
  customFilters: CustomFilterState;
  /** Total active filter count */
  activeFilterCount: number;
  /** Actions for managing facets */
  actions: {
    toggleFacetValue: (field: string, value: string) => void;
    setNumericFilter: (field: string, min?: number, max?: number) => void;
    setDateFilter: (field: string, start?: Date | string, end?: Date | string) => void;
    setSelectiveFilter: (field: string, value: string) => void;
    setCustomFilter: (field: string, values: string[]) => void;
    clearFilter: (field: string, filterType: 'disjunctive' | 'numeric' | 'date' | 'selective' | 'custom') => void;
    clearAllFilters: () => void;
  };
}