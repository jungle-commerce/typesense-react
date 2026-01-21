/**
 * @fileoverview URL serialization utilities for SearchState
 * Converts SearchState to/from URL query parameters for bookmarking and sharing
 */

import type {
  SearchState,
  DisjunctiveFacetState,
  NumericFilterState,
  DateFilterState,
  SelectiveFilterState,
} from '../types';

/**
 * Options for serializing search state to URL params
 */
export interface UrlSerializerOptions {
  /** Prefix for all params (e.g., 'search_' produces 'search_q', 'search_page') */
  paramPrefix?: string;
  /** Default perPage value (omitted from URL when matches) */
  defaultPerPage?: number;
  /** Fields to exclude from serialization */
  excludeFields?: string[];
}

/**
 * Options for deserializing URL params to search state
 */
export interface UrlDeserializerOptions {
  /** Prefix for all params */
  paramPrefix?: string;
  /** Fields that should be treated as disjunctive facets */
  facetFields?: string[];
  /** Fields that should be treated as numeric filters */
  numericFields?: string[];
  /** Fields that should be treated as date filters */
  dateFields?: string[];
  /** Fields that should be treated as selective filters */
  selectiveFields?: string[];
}

const DEFAULT_PER_PAGE = 20;
const RANGE_SEPARATOR = '..';

/**
 * Formats a date value to YYYY-MM-DD string
 */
const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    // Already a string, extract just the date part if it's a full ISO string
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

/**
 * Serializes SearchState to URLSearchParams
 */
export const serializeSearchState = (
  state: Partial<SearchState>,
  options: UrlSerializerOptions = {}
): URLSearchParams => {
  const { paramPrefix = '', defaultPerPage = DEFAULT_PER_PAGE, excludeFields = [] } = options;
  const params = new URLSearchParams();

  const addParam = (key: string, value: string) => {
    if (!excludeFields.includes(key)) {
      params.set(`${paramPrefix}${key}`, value);
    }
  };

  // Query
  if (state.query) {
    addParam('q', state.query);
  }

  // Pagination
  if (state.page && state.page > 1) {
    addParam('page', String(state.page));
  }
  if (state.perPage && state.perPage !== defaultPerPage) {
    addParam('perPage', String(state.perPage));
  }

  // Sort - prefer multiSortBy over sortBy
  if (state.multiSortBy && state.multiSortBy.length > 0) {
    const sortString = state.multiSortBy
      .map((s) => `${s.field}:${s.order}`)
      .join(',');
    addParam('sort', sortString);
  } else if (state.sortBy) {
    addParam('sort', state.sortBy);
  }

  // Disjunctive facets
  if (state.disjunctiveFacets) {
    for (const [field, values] of Object.entries(state.disjunctiveFacets)) {
      if (values && values.length > 0) {
        addParam(field, values.join(','));
      }
    }
  }

  // Numeric filters
  if (state.numericFilters) {
    for (const [field, range] of Object.entries(state.numericFilters)) {
      if (range && (range.min !== undefined || range.max !== undefined)) {
        const minStr = range.min !== undefined ? String(range.min) : '';
        const maxStr = range.max !== undefined ? String(range.max) : '';
        addParam(field, `${minStr}${RANGE_SEPARATOR}${maxStr}`);
      }
    }
  }

  // Date filters
  if (state.dateFilters) {
    for (const [field, range] of Object.entries(state.dateFilters)) {
      if (range && (range.start || range.end)) {
        const startStr = range.start ? formatDate(range.start) : '';
        const endStr = range.end ? formatDate(range.end) : '';
        addParam(field, `${startStr}${RANGE_SEPARATOR}${endStr}`);
      }
    }
  }

  // Selective filters
  if (state.selectiveFilters) {
    for (const [field, value] of Object.entries(state.selectiveFilters)) {
      if (value) {
        addParam(field, value);
      }
    }
  }

  return params;
};

/**
 * Parses a numeric value, returning undefined for invalid input
 */
const parseNumber = (value: string): number | undefined => {
  if (!value) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

/**
 * Parses a range string (e.g., "100..500") into min/max values
 */
const parseNumericRange = (value: string): { min?: number; max?: number } => {
  const [minStr, maxStr] = value.split(RANGE_SEPARATOR);
  return {
    min: parseNumber(minStr),
    max: parseNumber(maxStr),
  };
};

/**
 * Parses a date range string (e.g., "2024-01-01..2024-12-31")
 */
const parseDateRange = (value: string): { start?: string; end?: string } => {
  const [start, end] = value.split(RANGE_SEPARATOR);
  return {
    start: start || undefined,
    end: end || undefined,
  };
};

/**
 * Parses a sort string into multiSortBy array
 */
const parseSortString = (
  value: string
): { sortBy?: string; multiSortBy?: Array<{ field: string; order: 'asc' | 'desc' }> } => {
  if (!value) return {};

  // Check if it's multi-sort (contains comma)
  if (value.includes(',')) {
    const sorts = value.split(',').map((s) => {
      const [field, order] = s.split(':');
      return { field, order: (order || 'asc') as 'asc' | 'desc' };
    });
    return { multiSortBy: sorts };
  }

  // Single sort
  return { sortBy: value };
};

/**
 * Deserializes URLSearchParams to partial SearchState
 */
export const deserializeSearchParams = (
  params: URLSearchParams,
  options: UrlDeserializerOptions = {}
): Partial<SearchState> => {
  const {
    paramPrefix = '',
    facetFields = [],
    numericFields = [],
    dateFields = [],
    selectiveFields = [],
  } = options;

  const getParam = (key: string): string | null => params.get(`${paramPrefix}${key}`);

  const state: Partial<SearchState> = {};

  // Query
  const query = getParam('q');
  if (query) {
    state.query = query;
  }

  // Pagination
  const page = getParam('page');
  if (page) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      state.page = pageNum;
    }
  }

  const perPage = getParam('perPage');
  if (perPage) {
    const perPageNum = parseInt(perPage, 10);
    if (!isNaN(perPageNum) && perPageNum > 0) {
      state.perPage = perPageNum;
    }
  }

  // Sort
  const sort = getParam('sort');
  if (sort) {
    const sortResult = parseSortString(sort);
    if (sortResult.sortBy) state.sortBy = sortResult.sortBy;
    if (sortResult.multiSortBy) state.multiSortBy = sortResult.multiSortBy;
  }

  // Disjunctive facets
  if (facetFields.length > 0) {
    const disjunctiveFacets: DisjunctiveFacetState = {};
    for (const field of facetFields) {
      const value = getParam(field);
      if (value) {
        disjunctiveFacets[field] = value.split(',');
      }
    }
    if (Object.keys(disjunctiveFacets).length > 0) {
      state.disjunctiveFacets = disjunctiveFacets;
    }
  }

  // Numeric filters
  if (numericFields.length > 0) {
    const numericFilters: NumericFilterState = {};
    for (const field of numericFields) {
      const value = getParam(field);
      if (value && value.includes(RANGE_SEPARATOR)) {
        const range = parseNumericRange(value);
        if (range.min !== undefined || range.max !== undefined) {
          numericFilters[field] = range;
        }
      }
    }
    if (Object.keys(numericFilters).length > 0) {
      state.numericFilters = numericFilters;
    }
  }

  // Date filters
  if (dateFields.length > 0) {
    const dateFilters: DateFilterState = {};
    for (const field of dateFields) {
      const value = getParam(field);
      if (value && value.includes(RANGE_SEPARATOR)) {
        const range = parseDateRange(value);
        if (range.start || range.end) {
          dateFilters[field] = range;
        }
      }
    }
    if (Object.keys(dateFilters).length > 0) {
      state.dateFilters = dateFilters;
    }
  }

  // Selective filters
  if (selectiveFields.length > 0) {
    const selectiveFilters: SelectiveFilterState = {};
    for (const field of selectiveFields) {
      const value = getParam(field);
      if (value) {
        selectiveFilters[field] = value;
      }
    }
    if (Object.keys(selectiveFilters).length > 0) {
      state.selectiveFilters = selectiveFilters;
    }
  }

  return state;
};
