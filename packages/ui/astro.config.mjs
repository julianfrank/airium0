import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  build: {
    format: 'directory'
  },
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        '@airium/shared': new URL('../../shared/src', import.meta.url).pathname,
        '@airium/core': new URL('../core/src', import.meta.url).pathname
      }
    }
  }
});