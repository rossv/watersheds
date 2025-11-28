// vite.config.ts
import { defineConfig } from "file:///C:/Users/rossv/GitRepos/watersheds/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///C:/Users/rossv/GitRepos/watersheds/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import preprocess from "file:///C:/Users/rossv/GitRepos/watersheds/node_modules/svelte-preprocess/dist/index.js";
var repositoryBasePath = "/watersheds/";
var vite_config_default = defineConfig(({ command }) => ({
  plugins: [svelte({ preprocess: preprocess() })],
  // Use the repository name as the base path for production builds so assets
  // resolve correctly on GitHub Pages. Keep the root path during local dev.
  base: command === "build" ? repositoryBasePath : "/",
  server: {
    proxy: {
      "/streamstats-api": {
        target: "https://streamstats.usgs.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/streamstats-api/, "")
      },
      "/noaa-api": {
        target: "https://hdsc.nws.noaa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/noaa-api/, "/cgi-bin/new")
      }
    }
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["src/lib/**/*.{ts,js}"]
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyb3NzdlxcXFxHaXRSZXBvc1xcXFx3YXRlcnNoZWRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyb3NzdlxcXFxHaXRSZXBvc1xcXFx3YXRlcnNoZWRzXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9yb3Nzdi9HaXRSZXBvcy93YXRlcnNoZWRzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gJ0BzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUnO1xyXG5pbXBvcnQgcHJlcHJvY2VzcyBmcm9tICdzdmVsdGUtcHJlcHJvY2Vzcyc7XHJcblxyXG4vKipcclxuICogVml0ZSBjb25maWd1cmF0aW9uIHdpdGggcHJveGllcyBmb3IgZXh0ZXJuYWwgQVBJcy5cclxuICpcclxuICogRHVyaW5nIGRldmVsb3BtZW50IHRoZSBgL3N0cmVhbXN0YXRzLWFwaWAgYW5kIGAvbm9hYS1hcGlgIHBhdGhzIGFyZVxyXG4gKiBwcm94aWVkIHRvIHRoZWlyIHJlc3BlY3RpdmUgc2VydmljZXMgdG8gYXZvaWQgQ09SUyBpc3N1ZXMuIEluXHJcbiAqIHByb2R1Y3Rpb24gdGhlIGFwcCB1c2VzIGEgQ09SUyBwcm94eSAoaHR0cHM6Ly9hcGkuYWxsb3JpZ2lucy53aW4vcmF3KVxyXG4gKiBpbnNpZGUgdGhlIGNsaWVudCBjb2RlIHRvIGZldGNoIHRoZSBzYW1lIGRhdGEuXHJcbiAqL1xyXG5jb25zdCByZXBvc2l0b3J5QmFzZVBhdGggPSAnL3dhdGVyc2hlZHMvJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+ICh7XHJcbiAgcGx1Z2luczogW3N2ZWx0ZSh7IHByZXByb2Nlc3M6IHByZXByb2Nlc3MoKSB9KV0sXHJcbiAgLy8gVXNlIHRoZSByZXBvc2l0b3J5IG5hbWUgYXMgdGhlIGJhc2UgcGF0aCBmb3IgcHJvZHVjdGlvbiBidWlsZHMgc28gYXNzZXRzXHJcbiAgLy8gcmVzb2x2ZSBjb3JyZWN0bHkgb24gR2l0SHViIFBhZ2VzLiBLZWVwIHRoZSByb290IHBhdGggZHVyaW5nIGxvY2FsIGRldi5cclxuICBiYXNlOiBjb21tYW5kID09PSAnYnVpbGQnID8gcmVwb3NpdG9yeUJhc2VQYXRoIDogJy8nLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9zdHJlYW1zdGF0cy1hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9zdHJlYW1zdGF0cy51c2dzLmdvdicsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoOiBzdHJpbmcpID0+IHBhdGgucmVwbGFjZSgvXlxcL3N0cmVhbXN0YXRzLWFwaS8sICcnKVxyXG4gICAgICB9LFxyXG4gICAgICAnL25vYWEtYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vaGRzYy5ud3Mubm9hYS5nb3YnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aDogc3RyaW5nKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9ub2FhLWFwaS8sICcvY2dpLWJpbi9uZXcnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICB0ZXN0OiB7XHJcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxyXG4gICAgY292ZXJhZ2U6IHtcclxuICAgICAgcHJvdmlkZXI6ICd2OCcsXHJcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbi1zdW1tYXJ5JywgJ2h0bWwnXSxcclxuICAgICAgcmVwb3J0c0RpcmVjdG9yeTogJ2NvdmVyYWdlJyxcclxuICAgICAgaW5jbHVkZTogWydzcmMvbGliLyoqLyoue3RzLGpzfSddXHJcbiAgICB9XHJcbiAgfVxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1MsU0FBUyxvQkFBb0I7QUFDL1QsU0FBUyxjQUFjO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBVXZCLElBQU0scUJBQXFCO0FBRTNCLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsUUFBUSxPQUFPO0FBQUEsRUFDNUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxZQUFZLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFBQTtBQUFBO0FBQUEsRUFHOUMsTUFBTSxZQUFZLFVBQVUscUJBQXFCO0FBQUEsRUFDakQsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsb0JBQW9CO0FBQUEsUUFDbEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQWlCLEtBQUssUUFBUSxzQkFBc0IsRUFBRTtBQUFBLE1BQ2xFO0FBQUEsTUFDQSxhQUFhO0FBQUEsUUFDWCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBaUIsS0FBSyxRQUFRLGVBQWUsY0FBYztBQUFBLE1BQ3ZFO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLGdCQUFnQixNQUFNO0FBQUEsTUFDekMsa0JBQWtCO0FBQUEsTUFDbEIsU0FBUyxDQUFDLHNCQUFzQjtBQUFBLElBQ2xDO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
