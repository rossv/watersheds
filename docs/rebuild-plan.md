# Watersheds Delineation Rebuild Plan

## Goals
- Replace StreamStats-based delineation with an open, reproducible stack that avoids proprietary APIs and reduces proxy dependencies.
- Deliver reliable basin delineation, area calculations, rainfall inputs, and export workflows for downstream modeling (e.g., SWMM) using stable public services.

## Proposed Service Stack
- **Basin delineation:**
  - USGS NLDI `/nwissite` + `/navigate/UT` + `/catchment` (linked-data flowline snap and contributing basin). Primary source for catchments.
  - HydroShare-hosted NHDPlus HR catchments for larger basin retrieval when NLDI coverage is limited.
- **Hydrography context:**
  - NHDPlus HR flowlines/catchments via public tiles (e.g., 3DEP-derived) for map context and QA.
- **Elevation-derived hydrology:**
  - OpenTopography or Mapbox Terrain DEM tiles for local flow direction/accumulation when catchment gaps exist or for higher-resolution snap-to-stream.
- **Rainfall data:**
  - NOAA Atlas 14 point rainfall (retain current logic).
  - Backup: PRISM or CoCoRaHS gridded precipitation climatologies for redundancy when Atlas 14 is unavailable.
- **Export targets:** GeoJSON for basins/flowlines; SWMM input fragments (subcatchments, outfalls, links) derived locally.

## Client Architecture
- **Map stack:**
  - Prefer Maplibre GL for vector tiles (NHDPlus HR, terrain hillshade) with Leaflet fallback for raster baselayers if needed.
  - Layer groups: basemap, hydrography (NHDPlus flowlines/catchments), delineated basin overlay, snapped pour point marker, reference DEM hillshade.
- **Watershed lookup flow:**
  1. User drops a point on the map.
  2. Snap point to nearest NHDPlus flowline using NLDI `/navigation/flowlines?distance=...` or a local flow accumulation grid derived from DEM.
  3. Request basin polygon:
     - Primary: NLDI `/catchment` for snapped flowline feature ID.
     - Secondary: HydroShare NHDPlus HR catchment lookup by COMID.
     - Tertiary: Local DEM delineation via `elevation.ts` helper if service coverage fails.
  4. Compute area locally from polygon geometry (turf.js) and display area/length metrics.
- **Rainfall inputs:**
  - Atlas 14 query remains default; if unavailable, try cached prior results, then PRISM gridded value at pour point.
  - Cache recent rainfall responses keyed by lat/lon to minimize repeat network calls.
- **Exports:**
  - GeoJSON download of basin, snapped point, flowline subset.
  - SWMM export builder assembles subcatchment polygon with outlet node at pour point and optional conduit linking to downstream node.

## Modules and Helpers
- `src/lib/services/nldi.ts`
  - Functions: `snapToFlowline(point)`, `getCatchment(comid)`, `getUpstreamFlowlines(comid, distanceKm)`.
  - Error handling: classify HTTP/network vs. coverage errors; surface actionable messages; retries with backoff for transient failures.
- `src/lib/services/hydroshare.ts`
  - Fetch NHDPlus HR catchments by COMID; include tile/feature service endpoints and parsing helpers.
- `src/lib/services/elevation.ts`
  - Fetch DEM tiles (OpenTopography/Mapbox Terrain); run web-worker based D8/D-infinity flow direction and flow accumulation; expose `delineateFromDEM(point, bounds)`.
- `src/lib/services/rainfall.ts`
  - Existing Atlas 14 client plus fallback to PRISM/CoCoRaHS; local LRU cache and offline store.
- `src/lib/utils/geometry.ts`
  - Turf wrappers for area, length, buffering, point snapping, GeoJSON export helpers.
- `src/lib/utils/cache.ts`
  - Thin wrapper over `localforage`/`IndexedDB` for offline caching of recent responses and DEM tiles.
- `src/lib/workers/delineation.worker.ts`
  - Web Worker for DEM-based delineation to keep UI responsive.

## Data Transformations
- Normalize all service responses to internal GeoJSON schema: `{ type: 'Feature', geometry, properties: { source, comid, areaSqKm, ... } }`.
- Map NLDI flowline attributes to UI-friendly fields (name, reach code, length).
- Convert HydroShare catchment polygons from MultiPolygon to Polygon where applicable; dissolve multipart geometries for area calculations.
- SWMM export: derive `SUBCATCHMENTS`, `JUNCTIONS`, and `CONDUITS` sections from GeoJSON with consistent unit conversions.

## Error Handling and Fallbacks
- Prefer explicit status handling: 4xx (invalid point/coverage), 5xx (service outage), network timeouts.
- Fallback order: NLDI ➜ HydroShare NHDPlus ➜ DEM delineation.
- Provide UI-state flags: `loading`, `partial`, `staleCache`, `offlineResult`.
- Implement per-service timeouts (e.g., 8–10s) and cancellation via AbortController.

## Implementation Checklist
- [ ] Add service clients (`nldi.ts`, `hydroshare.ts`, `elevation.ts`, `rainfall.ts`) with typed responses and timeouts.
- [ ] Add geometry utilities and caching helper.
- [ ] Build delineation worker for DEM-based fallback; wire to UI.
- [ ] Update map stack to Maplibre with hydrography and terrain layers; maintain Leaflet fallback if necessary.
- [ ] Implement watershed lookup flow with snap ➜ catchment ➜ fallback logic and local area calculation.
- [ ] Wire rainfall inputs with caching and fallback to PRISM/CoCoRaHS.
- [ ] Implement GeoJSON and SWMM exports with consistent schema.
- [ ] Add offline caching strategy for recent delineations and DEM tiles.
- [ ] Add loading/error UI states and telemetry for latency/failure tracking.

## Success Criteria
- Basin delineation succeeds within 6–10 seconds for typical requests; DEM fallback completes within 15–20 seconds in worker without blocking UI.
- 99% of requests avoid proprietary StreamStats; zero proxy-only endpoints required.
- Offline caching allows reloading last successful delineation and rainfall query without network.
- Clear user feedback for coverage gaps, timeouts, and fallback activation.
- Exported GeoJSON and SWMM fragments validate against existing tooling and preserve area within ±2% of service-provided values.
