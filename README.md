# Watershed Web App (TypeScript + Svelte)

This project is a lightweight, client‑side application for delineating
watersheds, retrieving rainfall frequencies, calculating runoff volumes/peaks,
and exporting model‑ready files. It mirrors the structure and build quality of
the [designstorms](https://github.com/rossv/designstorms) project while
targeting hydrologic watershed analysis instead of storm hyetograph
generation.

## Features

- **Pour‑point selection** – click on the map or enter coordinates to choose
  the watershed outlet.
- **Watershed delineation** – calls USGS StreamStats (via a CORS proxy) to
  fetch a watershed boundary as GeoJSON. The area is computed client‑side.
- **Rainfall frequency** – fetches NOAA Atlas 14 depth tables (via a proxy)
  and lets you pick a duration and recurrence interval.
- **Runoff estimation** – computes runoff depth, volume and peak discharge
  using the NRCS curve number and rational methods.
- **Export** – generates GeoJSON for GIS and a minimal SWMM `.inp` file for
  use in hydraulic models.
- **GitHub Pages friendly** – built with Vite and Svelte, the app runs
  entirely in the browser with zero backend.

## Stack

- Svelte + Vite + TypeScript
- Leaflet for mapping
- Plotly.js (optional) for charts
- Pure client‑side; no server

## Development

```bash
npm i
npm run dev
# Open http://localhost:5173
```

## Build & Deploy (GitHub Pages)

1. Set the `base` option in `vite.config.ts` to match your repository name (for
   example, `"/watershed-web/"`).
2. Commit and push to the `main` branch.
3. Enable GitHub Pages on the repository and point it at the `gh-pages`
   branch. A GitHub Actions workflow can automate this for you.
4. Visit your Pages URL to try the app.

This project is released under the MIT License.