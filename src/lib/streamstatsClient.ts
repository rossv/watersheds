/**
 * Updated StreamStats client for watershed delineation.
 *
 * StreamStats deprecated the old `x`/`y` parameter endpoints after December 2024.
 * The new API expects `xlocation` and `ylocation` parameters and optionally
 * a two‑letter state or regional `rcode`.  To remain backwards compatible
 * with GitHub Pages deployments, this client automatically wraps requests
 * through a CORS proxy when running in production.  A native fetch is used
 * during development via the Vite proxy defined in `vite.config.ts`.
 *
 * See the USGS StreamStats documentation for details:
 * https://streamstats.usgs.gov/docs/streamstatsservices/#/ (Delineate Watershed).
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
 * Encode a URL so that it can be safely appended as a query to the CORS proxy.
 */
function encodeForProxy(url: string): string {
  return encodeURIComponent(url);
}

/**
 * Build the StreamStats watershed URL using the new `xlocation`/`ylocation`
 * parameters.  A state/region code (`rcode`) may be provided but is not
 * mandatory; when omitted StreamStats will attempt to infer the study area.
 */
function buildWatershedUrl(lat: number, lon: number, rcode?: string): string {
  const params = new URLSearchParams();
  if (rcode) {
    params.set('rcode', rcode);
  }
  params.set('xlocation', lon.toString());
  params.set('ylocation', lat.toString());
  params.set('crs', '4326');
  // GeoJSON response format; leaving off `includeparameters` yields only the
  // geometry and basic metadata.  Additional options can be toggled here.
  const base = 'https://streamstats.usgs.gov/streamstatsservices/watershed.geojson';
  return `${base}?${params.toString()}`;
}

/**
 * Fetch a watershed boundary as GeoJSON.  The call uses a CORS proxy in
 * production to around cross‑origin restrictions on GitHub Pages.  A
 * development build will rely on the Vite proxy (see vite.config.ts) and
 * therefore return native CORS headers.
 *
 * If StreamStats returns a non‑OK response or an invalid GeoJSON object, an
 * error is thrown containing the HTTP status and any available response text.
 */
export async function fetchWatershed(lat: number, lon: number, rcode?: string): Promise<WatershedGeoJSON> {
  const url = buildWatershedUrl(lat, lon, rcode);
  // When building for GitHub Pages import.meta.env.DEV is false, so wrap
  // through the proxy.  The proxy service `api.allorigins.win/raw` fetches
  // the remote resource and returns its body while setting permissive CORS
  // headers.  Note that the target URL must be percent‑encoded when
  // appended as a query parameter.
  const proxied = import.meta.env.DEV
    ? `/streamstats-api/streamstatsservices/watershed.geojson?${url.split('?')[1]}`
    : `https://api.allorigins.win/raw?url=${encodeForProxy(url)}`;
  console.log('Fetching watershed via:', proxied);
  try {
    const resp = await fetch(proxied, {
      headers: {
        Origin: window.location.origin
      }
    });
    console.log('Watershed fetch status:', resp.status);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: Failed to fetch watershed. Proxy responded with: ${text}`);
    }
    const text = await resp.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Response was not valid JSON. Preview: ${text.slice(0, 200)}`);
    }
    if (isGeoJsonFeatureCollection(data)) {
      return data;
    }
    throw new Error(`Response was not a valid GeoJSON FeatureCollection. Preview: ${text.slice(0, 200)}`);
  } catch (error: any) {
    console.error('Error during watershed fetch:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
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
 * Compute the spherical area (in square metres) of a GeoJSON feature
 * collection containing polygons or multipolygons.  Adapted from
 * OpenLayers/Turf.js to avoid pulling in heavy dependencies at runtime.
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
