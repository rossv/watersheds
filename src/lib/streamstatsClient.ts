/**
 * Functions for interacting with the USGS StreamStats service.  The goal of
 * this module is to provide a simple way to request a watershed delineation
 * based on a latitude/longitude pair.  When running in development the
 * requests are routed through a local Vite proxy (see vite.config.ts) to
 * avoid CORS issues.  In production the client wraps the request through
 * https://api.allorigins.win/raw to work around CORS restrictions on
 * GitHub Pages.
 */

export interface WatershedGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
    properties: Record<string, any>;
  }>;
}

/**
 * Request a watershed boundary from the StreamStats API.  If the call
 * succeeds the returned object is a GeoJSON feature collection.  On
 * failure an error is thrown.
 *
 * @param lat  Latitude of the pour point in decimal degrees.
 * @param lon  Longitude of the pour point in decimal degrees.
 */
export async function fetchWatershed(
  lat: number,
  lon: number
): Promise<WatershedGeoJSON> {
  const baseParams = new URLSearchParams({
    x: lon.toString(),
    y: lat.toString(),
    inProj: '4326',
    outProj: '4326'
  });

  const candidateRequests: Array<{ path: string; params: URLSearchParams }> = [
    // Newer deployments of the StreamStats service expect an explicit format
    // parameter.  Try this first so we get a true GeoJSON payload when
    // supported.
    { path: 'watershed', params: new URLSearchParams({ ...Object.fromEntries(baseParams), format: 'geojson' }) },
    // Fall back to the legacy .geojson endpoint which older deployments still
    // support.  This mirrors the original behaviour of the client.
    { path: 'watershed.geojson', params: new URLSearchParams(baseParams) }
  ];

  let lastError: string | null = null;

  for (const { path, params } of candidateRequests) {
    const query = params.toString();
    const baseUrl = `https://streamstats.usgs.gov/streamstatsservices/${path}?${query}`;

    const url = import.meta.env.DEV
      ? `/streamstats-api/streamstatsservices/${path}?${query}`
      : `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;

    // The explicit 'Accept' header was causing the "media type unsupported" error.
    // Removing it allows the request to succeed.
    const resp = await fetch(url);

    if (!resp.ok) {
      lastError = `HTTP ${resp.status}: Failed to fetch watershed`;
      continue;
    }

    const bodyText = await resp.text();

    try {
      const data = JSON.parse(bodyText);
      if (isGeoJsonFeatureCollection(data)) {
        return data;
      }

      const preview = JSON.stringify(data);
      if (preview.toLowerCase().includes('media type is unsupported')) {
        lastError = preview.slice(0, 200);
        continue;
      }

      lastError = preview.slice(0, 200);
    } catch {
      const preview = bodyText.trim().slice(0, 200);
      lastError = preview || null;

      if (preview.toLowerCase().includes('media type is unsupported')) {
        continue;
      }
    }
  }

  if (lastError) {
    throw new Error(
      `StreamStats returned an unexpected response: ${lastError}`
    );
  }

  throw new Error('StreamStats returned an empty response.');
}

function isGeoJsonFeatureCollection(value: unknown): value is WatershedGeoJSON {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.type !== 'FeatureCollection') return false;
  if (!Array.isArray(record.features)) return false;
  return record.features.every((feat) => {
    if (!feat || typeof feat !== 'object') return false;
    const f = feat as Record<string, unknown>;
    if (f.type !== 'Feature') return false;
    const geom = f.geometry as Record<string, unknown> | undefined;
    if (!geom || typeof geom !== 'object') return false;
    const geomType = geom.type;
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') return false;
    return Array.isArray(geom.coordinates);
  });
}

/**
 * Compute the area of a GeoJSON feature collection (square meters).  This
 * uses a spherical approximation for geographic coordinates.  The
 * implementation is adapted from OpenLayers and Turf.js; it sums the
 * area of all polygons.  Negative (hole) rings subtract area.
 */
export function computeAreaSqMeters(geojson: WatershedGeoJSON): number {
  const R = 6378137; // WGS84 equatorial radius in metres
  function ringArea(coords: number[][]): number {
    let area = 0;
    if (coords.length > 2) {
      let [lon1, lat1] = coords[0];
      lon1 = (lon1 * Math.PI) / 180;
      lat1 = (lat1 * Math.PI) / 180;
      for (let i = 1; i < coords.length; i++) {
        let [lon2, lat2] = coords[i];
        lon2 = (lon2 * Math.PI) / 180;
        lat2 = (lat2 * Math.PI) / 180;
        area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        lon1 = lon2;
        lat1 = lat2;
      }
      area = (area * R * R) / 2;
    }
    return area;
  }
  let total = 0;
  for (const feat of geojson.features) {
    const { type, coordinates } = feat.geometry;
    if (type === 'Polygon') {
      const rings = coordinates as number[][][];
      if (rings.length > 0) total += Math.abs(ringArea(rings[0]));
      for (let i = 1; i < rings.length; i++) total -= Math.abs(ringArea(rings[i]));
    } else if (type === 'MultiPolygon') {
      const polys = coordinates as number[][][][];
      for (const poly of polys) {
        if (poly.length > 0) total += Math.abs(ringArea(poly[0]));
        for (let i = 1; i < poly.length; i++) total -= Math.abs(ringArea(poly[i]));
      }
    }
  }
  return total;
}
