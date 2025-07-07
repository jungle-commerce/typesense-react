import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFacetState, useSingleFacetState } from '../useFacetState';

describe('useFacetState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useFacetState());
      
      const state = result.current.getFacetState('category');
      expect(state.searchQuery).toBe('');
      expect(state.isExpanded).toBe(true);
      expect(state.scrollTop).toBe(0);
    });

    it('maintains separate state for different facets', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.setFacetSearch('category', 'electronics');
        result.current.setFacetSearch('brand', 'apple');
      });
      
      expect(result.current.getFacetState('category').searchQuery).toBe('electronics');
      expect(result.current.getFacetState('brand').searchQuery).toBe('apple');
    });
  });

  describe('search functionality', () => {
    it('sets search query for a facet', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.setFacetSearch('category', 'test query');
      });
      
      expect(result.current.getFacetState('category').searchQuery).toBe('test query');
    });

    it('updates existing search query', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.setFacetSearch('category', 'first');
        result.current.setFacetSearch('category', 'second');
      });
      
      expect(result.current.getFacetState('category').searchQuery).toBe('second');
    });
  });

  describe('expansion functionality', () => {
    it('toggles facet expansion state', () => {
      const { result } = renderHook(() => useFacetState());
      
      // Initially expanded
      expect(result.current.getFacetState('category').isExpanded).toBe(true);
      
      // Toggle to collapsed
      act(() => {
        result.current.toggleFacetExpansion('category');
      });
      expect(result.current.getFacetState('category').isExpanded).toBe(false);
      
      // Toggle back to expanded
      act(() => {
        result.current.toggleFacetExpansion('category');
      });
      expect(result.current.getFacetState('category').isExpanded).toBe(true);
    });

    it('sets explicit expansion state', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.toggleFacetExpansion('category', false);
      });
      expect(result.current.getFacetState('category').isExpanded).toBe(false);
      
      act(() => {
        result.current.toggleFacetExpansion('category', false);
      });
      expect(result.current.getFacetState('category').isExpanded).toBe(false);
      
      act(() => {
        result.current.toggleFacetExpansion('category', true);
      });
      expect(result.current.getFacetState('category').isExpanded).toBe(true);
    });
  });

  describe('scroll functionality', () => {
    it('sets scroll position for a facet', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.setFacetScroll('category', 150);
      });
      
      expect(result.current.getFacetState('category').scrollTop).toBe(150);
    });

    it('updates scroll position', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.setFacetScroll('category', 100);
        result.current.setFacetScroll('category', 200);
      });
      
      expect(result.current.getFacetState('category').scrollTop).toBe(200);
    });
  });

  describe('reset functionality', () => {
    it('resets individual facet state', () => {
      const { result } = renderHook(() => useFacetState());
      
      // Set custom state
      act(() => {
        result.current.setFacetSearch('category', 'search');
        result.current.toggleFacetExpansion('category', false);
        result.current.setFacetScroll('category', 100);
      });
      
      // Reset
      act(() => {
        result.current.resetFacetState('category');
      });
      
      const state = result.current.getFacetState('category');
      expect(state.searchQuery).toBe('');
      expect(state.isExpanded).toBe(true);
      expect(state.scrollTop).toBe(0);
    });

    it('resets all facet states', () => {
      const { result } = renderHook(() => useFacetState());
      
      // Set state for multiple facets
      act(() => {
        result.current.setFacetSearch('category', 'search1');
        result.current.setFacetSearch('brand', 'search2');
        result.current.setFacetSearch('price', 'search3');
      });
      
      // Reset all
      act(() => {
        result.current.resetAllFacetStates();
      });
      
      // All facets should have default state
      expect(result.current.getFacetState('category').searchQuery).toBe('');
      expect(result.current.getFacetState('brand').searchQuery).toBe('');
      expect(result.current.getFacetState('price').searchQuery).toBe('');
    });
  });

  describe('state persistence', () => {
    it('maintains state across multiple calls', () => {
      const { result } = renderHook(() => useFacetState());
      
      act(() => {
        result.current.setFacetSearch('category', 'persistent');
      });
      
      // Multiple calls should return the same state
      const state1 = result.current.getFacetState('category');
      const state2 = result.current.getFacetState('category');
      
      expect(state1.searchQuery).toBe('persistent');
      expect(state2.searchQuery).toBe('persistent');
    });
  });
});

describe('useSingleFacetState', () => {
  it('provides state and actions for a specific facet', () => {
    const { result } = renderHook(() => useSingleFacetState('category'));
    
    expect(result.current.searchQuery).toBe('');
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.scrollTop).toBe(0);
  });

  it('updates search query', () => {
    const { result, rerender } = renderHook(() => useSingleFacetState('category'));
    
    act(() => {
      result.current.setSearch('test search');
    });
    
    // Force a re-render to get the updated state from the ref
    rerender();
    
    expect(result.current.searchQuery).toBe('test search');
  });

  it('toggles expansion', () => {
    const { result, rerender } = renderHook(() => useSingleFacetState('category'));
    
    act(() => {
      result.current.toggleExpansion();
    });
    
    // Force a re-render to get the updated state from the ref
    rerender();
    expect(result.current.isExpanded).toBe(false);
    
    act(() => {
      result.current.toggleExpansion(true);
    });
    
    rerender();
    expect(result.current.isExpanded).toBe(true);
  });

  it('updates scroll position', () => {
    const { result, rerender } = renderHook(() => useSingleFacetState('category'));
    
    act(() => {
      result.current.setScroll(250);
    });
    
    // Force a re-render to get the updated state from the ref
    rerender();
    expect(result.current.scrollTop).toBe(250);
  });

  it('resets state', () => {
    const { result, rerender } = renderHook(() => useSingleFacetState('category'));
    
    // Set custom state
    act(() => {
      result.current.setSearch('search');
      result.current.toggleExpansion(false);
      result.current.setScroll(100);
    });
    
    // Reset
    act(() => {
      result.current.reset();
    });
    
    // Force a re-render to get the updated state from the ref
    rerender();
    expect(result.current.searchQuery).toBe('');
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.scrollTop).toBe(0);
  });

  it('maintains separate state for different facets', () => {
    // Test using the base hook to ensure state separation works correctly
    const { result } = renderHook(() => useFacetState());
    
    act(() => {
      result.current.setFacetSearch('category', 'category search');
      result.current.setFacetSearch('brand', 'brand search');
    });
    
    // Verify that each facet maintains its own state
    expect(result.current.getFacetState('category').searchQuery).toBe('category search');
    expect(result.current.getFacetState('brand').searchQuery).toBe('brand search');
    
    // Update one facet and verify the other remains unchanged
    act(() => {
      result.current.setFacetSearch('category', 'updated category');
    });
    
    expect(result.current.getFacetState('category').searchQuery).toBe('updated category');
    expect(result.current.getFacetState('brand').searchQuery).toBe('brand search');
  });
});