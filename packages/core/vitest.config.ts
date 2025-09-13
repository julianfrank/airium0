import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/amplify_outputs.json',
        'lib/lambda-functions/**',
        'amplify/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    include: ['src/test/**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      'amplify/',
      'lib/'
    ]
  },
  resolve: {
    alias: {
      '@airium/shared': path.resolve(__dirname, '../../shared/src'),
    }
  }
});