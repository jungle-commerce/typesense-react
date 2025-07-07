/**
 * @fileoverview Implementation tests for TypesenseSearchClient
 * Tests the actual functionality including cache, error handling, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SearchRequest } from '../../types';

// Skip global setup for this test file
vi.stubGlobal('window', undefined);

// We need to test the actual implementation, not the mock
vi.unmock('../TypesenseClient');

describe('TypesenseSearchClient Implementation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should test cache functionality', async () => {
    // Mock Typesense at module level
    const mockSearchResponse = {
      hits: [{ document: { id: '1', title: 'Test' } }],
      found: 1,
      search_time_ms: 5,
      page: 1,
      facet_counts: [],
      request_params: { q: 'test', query_by: 'title' },
    };

    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockResolvedValue(mockSearchResponse),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const Typesense = await import('typesense');
    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key',
    });

    // First search - should hit API
    const result1 = await client.search('test-collection', { q: 'test', query_by: 'title' });
    expect(result1).toEqual(mockSearchResponse);
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(1);

    // Second search with same params - should use cache
    const result2 = await client.search('test-collection', { q: 'test', query_by: 'title' });
    expect(result2).toEqual(mockSearchResponse);
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(1); // Still 1

    // Search without cache
    const result3 = await client.search('test-collection', { q: 'test', query_by: 'title' }, false);
    expect(result3).toEqual(mockSearchResponse);
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(2);

    // Test cache stats
    const stats = client.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.maxSize).toBe(100);
    expect(stats.timeout).toBe(5 * 60 * 1000);

    // Clear cache
    client.clearCache();
    expect(client.getCacheStats().size).toBe(0);

    vi.doUnmock('typesense');
  });

  it('should handle string port conversion', async () => {
    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => ({})),
      },
    }));

    const Typesense = await import('typesense');
    const { TypesenseSearchClient } = await import('../TypesenseClient');

    new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: '8108' as any, protocol: 'http' }],
      apiKey: 'test-key',
    });

    expect(Typesense.default.Client).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      })
    );

    vi.doUnmock('typesense');
  });

  it('should handle cache expiration', async () => {
    vi.useFakeTimers();

    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockResolvedValue({
            hits: [],
            found: 0,
            search_time_ms: 1,
            page: 1,
            facet_counts: [],
            request_params: { q: 'test', query_by: 'title' },
          }),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient(
      {
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'test-key',
      },
      1000 // 1 second cache timeout
    );

    // First search
    await client.search('test-collection', { q: 'test1', query_by: 'title' });
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(1);

    // Search same query before timeout - should use cache
    await client.search('test-collection', { q: 'test1', query_by: 'title' });
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(1);

    // Advance time past cache timeout
    vi.advanceTimersByTime(1500);

    // Search after timeout - should hit API again
    await client.search('test-collection', { q: 'test1', query_by: 'title' });
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
    vi.doUnmock('typesense');
  });

  it('should handle error enhancement', async () => {
    const originalError = new Error('Network error');
    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockRejectedValue(originalError),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key',
    });

    const searchParams = { q: 'test', query_by: 'title' };

    try {
      await client.search('test-collection', searchParams);
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Typesense search failed: Network error');
      expect(error.originalError).toBe(originalError);
      expect(error.collection).toBe('test-collection');
      expect(error.params).toEqual(searchParams);
    }

    vi.doUnmock('typesense');
  });

  it('should handle multiSearch', async () => {
    const mockResponse = {
      hits: [],
      found: 0,
      search_time_ms: 1,
      page: 1,
      facet_counts: [],
      request_params: { q: 'test', query_by: 'title' },
    };

    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockResolvedValue(mockResponse),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key',
    });

    const searches: SearchRequest[] = [
      { q: 'test1', query_by: 'title' },
      { q: 'test2', query_by: 'title' },
      { q: 'test3', query_by: 'title' },
    ];

    const results = await client.multiSearch('test-collection', searches);

    expect(results).toHaveLength(3);
    expect(results).toEqual([mockResponse, mockResponse, mockResponse]);
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(3);

    vi.doUnmock('typesense');
  });

  it('should handle getSchema', async () => {
    const mockSchema = {
      name: 'test-collection',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'price', type: 'float' },
      ],
    };

    const mockClient = {
      collections: vi.fn().mockReturnValue({
        retrieve: vi.fn().mockResolvedValue(mockSchema),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key',
    });

    const schema = await client.getSchema('test-collection');

    expect(schema).toEqual(mockSchema);
    expect(mockClient.collections).toHaveBeenCalledWith('test-collection');
    expect(mockClient.collections().retrieve).toHaveBeenCalled();

    vi.doUnmock('typesense');
  });

  it('should manage cache size', async () => {
    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockImplementation((params) => 
            Promise.resolve({
              hits: [],
              found: 0,
              search_time_ms: 1,
              page: 1,
              facet_counts: [],
              request_params: params,
            })
          ),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient(
      {
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'test-key',
      },
      5 * 60 * 1000,
      3 // Max 3 cache entries
    );

    // Fill cache
    for (let i = 1; i <= 3; i++) {
      await client.search('test-collection', { q: `test${i}`, query_by: 'title' });
    }
    expect(client.getCacheStats().size).toBe(3);

    // Add fourth entry - should evict oldest
    await client.search('test-collection', { q: 'test4', query_by: 'title' });
    expect(client.getCacheStats().size).toBe(3);

    // First query should no longer be cached
    await client.search('test-collection', { q: 'test1', query_by: 'title' });
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(5); // 4 initial + 1 re-fetch

    vi.doUnmock('typesense');
  });

  it('should use existing client instance', async () => {
    const existingClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockResolvedValue({
            hits: [],
            found: 0,
            search_time_ms: 1,
            page: 1,
            facet_counts: [],
            request_params: { q: 'test', query_by: 'title' },
          }),
        }),
        retrieve: vi.fn().mockResolvedValue({ name: 'test' }),
      }),
    };

    const MockedClient = vi.fn();

    vi.doMock('typesense', () => ({
      default: {
        Client: MockedClient,
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient(existingClient as any);

    expect(MockedClient).not.toHaveBeenCalled();
    expect(client.getClient()).toBe(existingClient);

    // Test that it can use the existing client
    await client.search('test-collection', { q: 'test', query_by: 'title' });
    expect(existingClient.collections).toHaveBeenCalled();

    vi.doUnmock('typesense');
  });

  it('should handle preset parameter correctly', async () => {
    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockResolvedValue({
            hits: [],
            found: 0,
            search_time_ms: 1,
            page: 1,
            facet_counts: [],
            request_params: { q: 'test', query_by: 'title' },
          }),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key',
    });

    // Test with preset
    await client.search('test-collection', { q: 'test', query_by: 'title', preset: 'custom' });
    expect(mockClient.collections().documents().search).toHaveBeenCalledWith({
      q: 'test',
      query_by: 'title',
      preset: 'custom',
    });

    // Test with undefined preset - should be removed
    await client.search('test-collection', { q: 'test', query_by: 'title', preset: undefined });
    expect(mockClient.collections().documents().search).toHaveBeenLastCalledWith({
      q: 'test',
      query_by: 'title',
    });

    vi.doUnmock('typesense');
  });

  it('should handle non-Error objects in getSchema', async () => {
    const mockClient = {
      collections: vi.fn().mockReturnValue({
        retrieve: vi.fn().mockRejectedValue('String error'), // Non-Error object
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient({
      nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
      apiKey: 'test-key',
    });

    try {
      await client.getSchema('test-collection');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Failed to retrieve schema: Unknown error');
      expect(error.originalError).toBe('String error');
      expect(error.collection).toBe('test-collection');
    }

    vi.doUnmock('typesense');
  });

  it('should handle multiple expired cache entries during cleanup', async () => {
    vi.useFakeTimers();

    const mockClient = {
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockImplementation((params) => 
            Promise.resolve({
              hits: [],
              found: 0,
              search_time_ms: 1,
              page: 1,
              facet_counts: [],
              request_params: params,
            })
          ),
        }),
      }),
    };

    vi.doMock('typesense', () => ({
      default: {
        Client: vi.fn().mockImplementation(() => mockClient),
      },
    }));

    const { TypesenseSearchClient } = await import('../TypesenseClient');

    const client = new TypesenseSearchClient(
      {
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'test-key',
      },
      1000 // 1 second cache timeout
    );

    // Add multiple entries at different times
    await client.search('test-collection', { q: 'test1', query_by: 'title' });
    vi.advanceTimersByTime(400);
    
    await client.search('test-collection', { q: 'test2', query_by: 'title' });
    vi.advanceTimersByTime(400);
    
    await client.search('test-collection', { q: 'test3', query_by: 'title' });
    
    // All entries should be cached
    expect(client.getCacheStats().size).toBe(3);
    
    // Advance time so first two entries are expired (> 1000ms)
    vi.advanceTimersByTime(300); // Total: 300ms for test3, 700ms for test2, 1100ms for test1
    
    // Trigger cleanup with a new search
    await client.search('test-collection', { q: 'test4', query_by: 'title' });
    
    // Test1 should be evicted, test2, test3 and test4 should remain
    let stats = client.getCacheStats();
    expect(stats.size).toBe(3);
    
    // Advance more time to expire test2
    vi.advanceTimersByTime(400); // Total: 700ms for test4, 700ms for test3, 1100ms for test2
    
    // Trigger another cleanup
    await client.search('test-collection', { q: 'test5', query_by: 'title' });
    
    // Now test2 should also be evicted
    stats = client.getCacheStats();
    expect(stats.size).toBe(3); // test3, test4, test5
    
    // Verify expired entries need to hit API again
    await client.search('test-collection', { q: 'test1', query_by: 'title' });
    await client.search('test-collection', { q: 'test2', query_by: 'title' });
    
    // Should have made 7 total API calls: 5 initial + 2 re-fetches
    expect(mockClient.collections().documents().search).toHaveBeenCalledTimes(7);

    vi.useRealTimers();
    vi.doUnmock('typesense');
  });
});