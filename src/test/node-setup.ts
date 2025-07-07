/**
 * @fileoverview Test setup for Node environment tests
 */

import { expect, afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});