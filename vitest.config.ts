import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/amplify_outputs.json'
      ]
    }
  },
  resolve: {
    alias: {
      '@airium/shared': new URL('./shared/src', import.meta.url).pathname,
      '@airium/core': new URL('./packages/core/src', import.meta.url).pathname,
      '@airium/ui': new URL('./packages/ui/src', import.meta.url).pathname
    }
  }
});