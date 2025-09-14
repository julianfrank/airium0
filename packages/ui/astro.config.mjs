import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  base:"/",
  integrations: [
    react({
      experimentalReactChildren: true
    }),
    tailwind({
      applyBaseStyles: false
    })
  ],
  output: 'static',
  build: {
    format: 'directory',
  },
  server: { port: 8080 },
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  },
  site: 'https://devposthackathon.tojf.link'
});