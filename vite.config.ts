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
const repositoryBasePath = '/watersheds/';

export default defineConfig(({ command }) => ({
  plugins: [svelte({ preprocess: preprocess() })],
  // Use the repository name as the base path for production builds so assets
  // resolve correctly on GitHub Pages. Keep the root path during local dev.
  base: command === 'build' ? repositoryBasePath : '/',
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
      },
      '/mrlc-api': {
        target: 'https://www.mrlc.gov',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mrlc-api/, '')
      },
      '/geocoding-api': {
        target: 'https://api.bigdatacloud.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/geocoding-api/, '')
      }
    }
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/lib/**/*.{ts,js}']
    }
  }
}));
