/**
 * @fileoverview Search state reducer for managing all search-related state updates.
 * Uses Redux-style actions for predictable state management.
 */

import type { SearchState, SearchAction } from '../types';

/**
 * Initial state for the search reducer
 */
export const initialSearchState: SearchState = {
  query: '',
  results: null,
  loading: false,
  error: null,
  facets: [],
  disjunctiveFacets: {},
  numericFilters: {},
  dateFilters: {},
  selectiveFilters: {},
  customFilters: {},
  page: 1,
  perPage: 20,
  sortBy: '',
  multiSortBy: undefined,
  additionalFilters: undefined,
  schema: null,
  searchPerformed: false,
  lastSearchAt: undefined,
  accumulatedFacetValues: {},
  accumulateFacets: false,
  moveSelectedToTop: false,
  reorderByCount: true,
  useNumericRanges: false,
  numericFacetRanges: {},
  facetOptionLimit: 0, // 0 means no limit
  hideZeroCountsForSingleSelect: true,
  allowNumericRangeForSingleSelect: true,
};

/**
 * Search state reducer function
 * @param state - Current search state
 * @param action - Action to perform
 * @returns Updated search state
 */
export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return {
        ...state,
        query: action.payload,
        page: 1, // Reset page when query changes
      };

    case 'SET_RESULTS':
      return {
        ...state,
        results: action.payload,
        loading: false,
        error: null,
        searchPerformed: true,
        lastSearchAt: Date.now(),
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error, // Clear error when starting new search
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'SET_FACETS':
      return {
        ...state,
        facets: action.payload,
      };

    case 'SET_DISJUNCTIVE_FACETS':
      return {
        ...state,
        disjunctiveFacets: action.payload,
        page: 1, // Reset page when filters change
      };

    case 'TOGGLE_DISJUNCTIVE_FACET': {
      const { field, value } = action.payload;
      const currentValues = state.disjunctiveFacets[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      const updatedFacets = { ...state.disjunctiveFacets };
      if (newValues.length > 0) {
        updatedFacets[field] = newValues;
      } else {
        delete updatedFacets[field];
      }

      return {
        ...state,
        disjunctiveFacets: updatedFacets,
        page: 1, // Reset page when filters change
      };
    }

    case 'SET_NUMERIC_FILTER': {
      const { field, min, max } = action.payload;
      
      // Remove filter if both min and max are undefined
      if (min === undefined && max === undefined) {
        const { [field]: _, ...rest } = state.numericFilters;
        return {
          ...state,
          numericFilters: rest,
          page: 1,
        };
      }

      return {
        ...state,
        numericFilters: {
          ...state.numericFilters,
          [field]: { min, max },
        },
        page: 1, // Reset page when filters change
      };
    }

    case 'SET_DATE_FILTER': {
      const { field, start, end } = action.payload;
      
      // Remove filter if both start and end are undefined
      if (!start && !end) {
        const { [field]: _, ...rest } = state.dateFilters;
        return {
          ...state,
          dateFilters: rest,
          page: 1,
        };
      }

      return {
        ...state,
        dateFilters: {
          ...state.dateFilters,
          [field]: { start, end },
        },
        page: 1, // Reset page when filters change
      };
    }

    case 'SET_SELECTIVE_FILTER': {
      const { field, value } = action.payload;
      
      // Remove filter if value is empty
      if (!value) {
        const { [field]: _, ...rest } = state.selectiveFilters;
        return {
          ...state,
          selectiveFilters: rest,
          page: 1,
        };
      }

      return {
        ...state,
        selectiveFilters: {
          ...state.selectiveFilters,
          [field]: value,
        },
        page: 1, // Reset page when filters change
      };
    }

    case 'SET_CUSTOM_FILTER': {
      const { field, values } = action.payload;
      
      // Remove filter if values array is empty
      if (!values || values.length === 0) {
        const { [field]: _, ...rest } = state.customFilters;
        return {
          ...state,
          customFilters: rest,
          page: 1,
        };
      }

      return {
        ...state,
        customFilters: {
          ...state.customFilters,
          [field]: values,
        },
        page: 1, // Reset page when filters change
      };
    }

    case 'CLEAR_FILTER': {
      const { field, filterType } = action.payload;

      switch (filterType) {
        case 'disjunctive': {
          const { [field]: _, ...rest } = state.disjunctiveFacets;
          return {
            ...state,
            disjunctiveFacets: rest,
            page: 1,
          };
        }
        case 'numeric': {
          const { [field]: _, ...rest } = state.numericFilters;
          return {
            ...state,
            numericFilters: rest,
            page: 1,
          };
        }
        case 'date': {
          const { [field]: _, ...rest } = state.dateFilters;
          return {
            ...state,
            dateFilters: rest,
            page: 1,
          };
        }
        case 'selective': {
          const { [field]: _, ...rest } = state.selectiveFilters;
          return {
            ...state,
            selectiveFilters: rest,
            page: 1,
          };
        }
        case 'custom': {
          const { [field]: _, ...rest } = state.customFilters;
          return {
            ...state,
            customFilters: rest,
            page: 1,
          };
        }
        default:
          return state;
      }
    }

    case 'CLEAR_ALL_FILTERS':
      return {
        ...state,
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
        customFilters: {},
        page: 1, // Reset page when clearing filters
      };

    case 'SET_PAGE':
      return {
        ...state,
        page: action.payload,
      };

    case 'SET_PER_PAGE':
      return {
        ...state,
        perPage: action.payload,
        page: 1, // Reset to first page when changing page size
      };

    case 'SET_SORT_BY':
      return {
        ...state,
        sortBy: action.payload,
        page: 1, // Reset page when changing sort
      };

    case 'SET_SCHEMA':
      return {
        ...state,
        schema: action.payload,
      };

    case 'RESET_SEARCH':
      return {
        ...initialSearchState,
        // Preserve facets and schema as they're configuration
        facets: state.facets,
        schema: state.schema,
        accumulateFacets: state.accumulateFacets,
        accumulatedFacetValues: state.accumulatedFacetValues,
        moveSelectedToTop: state.moveSelectedToTop,
        reorderByCount: state.reorderByCount,
        useNumericRanges: state.useNumericRanges,
        numericFacetRanges: state.numericFacetRanges,
        facetOptionLimit: state.facetOptionLimit,
        hideZeroCountsForSingleSelect: state.hideZeroCountsForSingleSelect,
        allowNumericRangeForSingleSelect: state.allowNumericRangeForSingleSelect,
      };

    case 'BATCH_UPDATE':
      return {
        ...state,
        ...action.payload,
        // Ensure we reset page if filters are updated
        page: (
          action.payload.disjunctiveFacets !== undefined ||
          action.payload.numericFilters !== undefined ||
          action.payload.dateFilters !== undefined ||
          action.payload.selectiveFilters !== undefined ||
          action.payload.customFilters !== undefined ||
          action.payload.query !== undefined ||
          action.payload.sortBy !== undefined ||
          action.payload.perPage !== undefined
        ) ? 1 : (action.payload.page || state.page),
      };

    case 'SET_ACCUMULATE_FACETS':
      return {
        ...state,
        accumulateFacets: action.payload,
      };

    case 'UPDATE_ACCUMULATED_FACETS': {
      const { field, values } = action.payload;
      const currentFieldData = state.accumulatedFacetValues[field] || {
        values: new Set<string>(),
        orderedValues: [],
        lastUpdated: Date.now(),
      };

      // Add new values to the set and maintain order
      const updatedValues = new Set(currentFieldData.values);
      const orderedValues = [...currentFieldData.orderedValues];
      
      // Track numeric bounds if this is a numeric field
      let numericBounds = currentFieldData.numericBounds;
      const isNumeric = state.schema?.fields?.find(f => f.name === field)?.type &&
        ['int32', 'int64', 'float'].includes(state.schema.fields.find(f => f.name === field)!.type);
      
      values.forEach(value => {
        if (!updatedValues.has(value)) {
          updatedValues.add(value);
          orderedValues.push(value);
          
          // Update numeric bounds
          if (isNumeric) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              if (!numericBounds) {
                numericBounds = { min: numValue, max: numValue };
              } else {
                numericBounds = {
                  min: Math.min(numericBounds.min, numValue),
                  max: Math.max(numericBounds.max, numValue),
                };
              }
            }
          }
        }
      });

      return {
        ...state,
        accumulatedFacetValues: {
          ...state.accumulatedFacetValues,
          [field]: {
            values: updatedValues,
            orderedValues,
            numericBounds,
            lastUpdated: Date.now(),
          },
        },
      };
    }

    case 'CLEAR_ACCUMULATED_FACETS': {
      if (action.payload) {
        // Clear specific field
        const { [action.payload]: _, ...rest } = state.accumulatedFacetValues;
        return {
          ...state,
          accumulatedFacetValues: rest,
        };
      }
      // Clear all
      return {
        ...state,
        accumulatedFacetValues: {},
      };
    }

    case 'SET_MOVE_SELECTED_TO_TOP':
      return {
        ...state,
        moveSelectedToTop: action.payload,
      };

    case 'SET_REORDER_BY_COUNT':
      return {
        ...state,
        reorderByCount: action.payload,
      };

    case 'SET_USE_NUMERIC_RANGES':
      return {
        ...state,
        useNumericRanges: action.payload,
      };

    case 'SET_NUMERIC_FACET_MODE': {
      const { field, mode } = action.payload;
      return {
        ...state,
        numericFacetRanges: {
          ...state.numericFacetRanges,
          [field]: {
            ...state.numericFacetRanges[field],
            mode,
          },
        },
      };
    }

    case 'SET_NUMERIC_FACET_RANGE': {
      const { field, min, max } = action.payload;
      return {
        ...state,
        numericFacetRanges: {
          ...state.numericFacetRanges,
          [field]: {
            ...state.numericFacetRanges[field],
            currentRange: { min, max },
          },
        },
        numericFilters: {
          ...state.numericFilters,
          [field]: { min, max },
        },
        page: 1, // Reset page when filter changes
      };
    }

    case 'UPDATE_NUMERIC_FACET_BOUNDS': {
      const { field, min, max } = action.payload;
      return {
        ...state,
        numericFacetRanges: {
          ...state.numericFacetRanges,
          [field]: {
            ...state.numericFacetRanges[field],
            bounds: { min, max },
          },
        },
      };
    }

    case 'CLEAR_NUMERIC_FACET_RANGE': {
      const field = action.payload;
      const { [field]: _, ...restNumericFilters } = state.numericFilters;
      const updatedRanges = { ...state.numericFacetRanges };
      if (updatedRanges[field]) {
        delete updatedRanges[field].currentRange;
      }
      return {
        ...state,
        numericFacetRanges: updatedRanges,
        numericFilters: restNumericFilters,
        page: 1,
      };
    }

    case 'SET_FACET_OPTION_LIMIT':
      return {
        ...state,
        facetOptionLimit: action.payload,
      };

    case 'SET_HIDE_ZERO_COUNTS_FOR_SINGLE_SELECT':
      return {
        ...state,
        hideZeroCountsForSingleSelect: action.payload,
      };

    case 'SET_ALLOW_NUMERIC_RANGE_FOR_SINGLE_SELECT':
      return {
        ...state,
        allowNumericRangeForSingleSelect: action.payload,
      };

    case 'SET_ADDITIONAL_FILTERS':
      return {
        ...state,
        additionalFilters: action.payload,
        page: 1, // Reset page when filters change
      };

    case 'SET_MULTI_SORT_BY':
      return {
        ...state,
        multiSortBy: action.payload,
        page: 1, // Reset page when sort changes
      };

    case 'ADD_SORT_FIELD': {
      const currentSorts = state.multiSortBy || [];
      // Check if field already exists
      const existingIndex = currentSorts.findIndex(s => s.field === action.payload.field);
      let newSorts;
      if (existingIndex >= 0) {
        // Update existing sort
        newSorts = [...currentSorts];
        newSorts[existingIndex] = action.payload;
      } else {
        // Add new sort
        newSorts = [...currentSorts, action.payload];
      }
      return {
        ...state,
        multiSortBy: newSorts,
        page: 1, // Reset page when sort changes
      };
    }

    case 'REMOVE_SORT_FIELD': {
      const currentSorts = state.multiSortBy || [];
      const newSorts = currentSorts.filter(s => s.field !== action.payload);
      return {
        ...state,
        multiSortBy: newSorts.length > 0 ? newSorts : undefined,
        page: 1, // Reset page when sort changes
      };
    }

    case 'CLEAR_MULTI_SORT':
      return {
        ...state,
        multiSortBy: undefined,
        page: 1, // Reset page when sort changes
      };

    default:
      return state;
  }
}

/**
 * Helper function to create the initial state with defaults
 * @param overrides - Partial state to override defaults
 * @returns Complete initial state
 */
export function createInitialState(overrides?: Partial<SearchState>): SearchState {
  return {
    ...initialSearchState,
    ...overrides,
    // Ensure arrays are properly initialized if provided
    multiSortBy: overrides?.multiSortBy || initialSearchState.multiSortBy,
  };
}