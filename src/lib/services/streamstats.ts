/**
 * StreamStats client wrapper to support future reliability middleware.
 */
export type WatershedGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

export type FetchOpts = {
  lat: number;
  lon: number;
  rcode?: string;
  includeParameters?: boolean;
  includeFeatures?: boolean;
  simplify?: boolean;
};

const STREAMSTATS_BASE =
  "https://streamstats.usgs.gov/streamstatsservices/watershed.geojson";

function isDev() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(import.meta as any)?.env?.DEV;
  } catch {
    return false;
  }
}

function buildWatershedUrl({
  lat,
  lon,
  rcode,
  includeParameters = true,
  includeFeatures = true,
  simplify = true
}: FetchOpts): string {
  const params = new URLSearchParams();
  if (rcode) params.set("rcode", rcode);
  params.set("xlocation", String(lon));
  params.set("ylocation", String(lat));
  params.set("crs", "4326");
  params.set("includeparameters", includeParameters ? "true" : "false");
  params.set("includefeatures", includeFeatures ? "true" : "false");
  params.set("simplify", simplify ? "true" : "false");
  return `${STREAMSTATS_BASE}?${params.toString()}`;
}

/**
 * Fetch a watershed GeoJSON for a lat/lon.
 * Throws an Error with a friendly message if the server returns non-200.
 */
export async function fetchWatershed(opts: FetchOpts): Promise<WatershedGeoJSON> {
  const directUrl = buildWatershedUrl(opts);
  let fetchUrl: string;

  if (isDev()) {
    // In development, use the local Vite proxy.
    const params = new URL(directUrl).search;
    fetchUrl = `/streamstats-api/streamstatsservices/watershed.geojson${params}`;
  } else {
    // In production, use the api.allorigins.win proxy with the URL as a query parameter.
    fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
  }

  const res = await fetch(fetchUrl, {
    method: "GET",
    headers: {
      // These headers are critical and match the working implementation in rainfall.ts
      Accept: "application/json, application/geo+json;q=0.9, */*;q=0.8",
      Origin: typeof window !== "undefined" ? window.location.origin : "https://example.org",
      "X-Requested-With": "fetch"
    }
  });

  if (!res.ok) {
    const preview = await safePreview(res);
    throw new Error(`StreamStats request failed (${res.status}) — ${preview}`);
  }

  const textResponse = await res.text();
  if (!textResponse) {
    throw new Error(
      "Failed to fetch watershed data: The CORS proxy returned an empty response. The StreamStats API may be temporarily unavailable or blocking the proxy."
    );
  }

  try {
    const data = JSON.parse(textResponse);
    return data as WatershedGeoJSON;
  } catch (e) {
    throw new Error(
      `Failed to parse JSON response. The server may be down or the CORS proxy may have failed. Preview: ${truncate(textResponse.replace(/\s+/g, " "), 280)}`
    );
  }
}

async function safePreview(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    return truncate(txt.replace(/\s+/g, " "), 280);
  } catch {
    return "<no body>";
  }
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

/* ===========================
   Area helper (m²)
   =========================== */

export function computeAreaSqMeters(fc: WatershedGeoJSON): number {
  let total = 0;
  for (const feat of fc.features ?? []) {
    if (!feat || !feat.geometry) continue;
    if (feat.geometry.type === "Polygon") {
      total += polygonAreaMeters(feat.geometry.coordinates as GeoJSON.Position[][]);
    } else if (feat.geometry.type === "MultiPolygon") {
      for (const poly of feat.geometry.coordinates as GeoJSON.Position[][][]) {
        total += polygonAreaMeters(poly);
      }
    }
  }
  return Math.max(0, total);
}

function polygonAreaMeters(rings: GeoJSON.Position[][]): number {
  if (!rings || rings.length === 0) return 0;
  let area = ringAreaMeters(rings[0]);
  for (let i = 1; i < rings.length; i++) {
    area -= ringAreaMeters(rings[i]);
  }
  return Math.abs(area);
}

function ringAreaMeters(coords: GeoJSON.Position[]): number {
  const pts = coords.map(([lon, lat]) => lonLatToWebMercator(lon, lat));
  let sum = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [x1, y1] = pts[j];
    const [x2, y2] = pts[i];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) * 0.5;
}

function lonLatToWebMercator(lon: number, lat: number): [number, number] {
  const R = 6378137;
  const λ = (lon * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const x = R * λ;
  const y = R * Math.log(Math.tan(Math.PI / 4 + φ / 2));
  return [x, y];
}
