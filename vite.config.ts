import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

/**
 * Vite configuration with proxies for external APIs.
 *
 * During development the `/streamstats-api` and `/noaa-api` paths are
 * proxied to their respective services to avoid CORS issues. In
 * production the app uses a CORS proxy (https://api.allorigins.win/raw)
 * inside the client code to fetch the same data.
 */
export default defineConfig({
  plugins: [svelte({ preprocess: preprocess() })],
  // Set this base path to your repository name when deploying to GitHub Pages.
  base: '/watershed-web/',
  server: {
    proxy: {
      '/streamstats-api': {
        target: 'https://streamstats.usgs.gov',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/streamstats-api/, '')
      },
      '/noaa-api': {
        target: 'https://hdsc.nws.noaa.gov',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/noaa-api/, '/cgi-bin/new')
      }
    }
  }
});