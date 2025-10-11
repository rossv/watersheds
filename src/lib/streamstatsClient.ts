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
  // Construct the base query for StreamStats.  StreamStats expects
  // longitude (x) and latitude (y) values and returns a GeoJSON object.
  const baseUrl =
    `https://streamstats.usgs.gov/streamstatsservices/watershed.geojson` +
    `?x=${lon}&y=${lat}&inProj=4326&outProj=4326`;

  let url: string;
  if (import.meta.env.DEV) {
    // Development: proxy through Vite server.  See vite.config.ts for the
    // rewrite rule; we strip the prefix when forwarding the request.
    url = `/streamstats-api/streamstatsservices/watershed.geojson?x=${lon}&y=${lat}&inProj=4326&outProj=4326`;
  } else {
    // Production: wrap through AllOrigins to bypass CORS.
    url = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: Failed to fetch watershed`);
  }

  const bodyText = await resp.text();
  try {
    const data = JSON.parse(bodyText);
    return data as WatershedGeoJSON;
  } catch (err) {
    const preview = bodyText.trim().slice(0, 200);
    throw new Error(
      preview
        ? `StreamStats returned an unexpected response: ${preview}`
        : 'StreamStats returned an empty response.'
    );
  }
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
      // Exterior ring adds area; interior rings subtract area
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