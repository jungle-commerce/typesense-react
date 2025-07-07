import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    include: ['src/test/integration/**/*.test.{ts,tsx}'],
    environment: 'jsdom', // Integration tests need DOM for React hooks
    globals: true,
    setupFiles: ['./src/test/integration/setup.ts'],
    pool: 'forks', // Use separate processes for better isolation
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    bail: 0, // Don't stop on first failure
    retry: 1, // Retry failed tests once
    maxConcurrency: 1, // Run tests sequentially to avoid conflicts
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'node_modules/',
        'src/test/',
        'src/types/',
        'src/index.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    },
    reporters: [
      'default',
      ['junit', { outputFile: './test-results/integration/junit.xml' }],
      ['json', { outputFile: './test-results/integration/results.json' }],
      ['html', { outputFile: './test-results/integration/report.html' }]
    ],
    outputFile: {
      junit: './test-results/integration/junit.xml',
      json: './test-results/integration/results.json',
      html: './test-results/integration/report.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});