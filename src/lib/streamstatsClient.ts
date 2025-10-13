/**
 * StreamStats client — fixed CORS proxy + new API params + area helper.
 * - Uses xlocation/ylocation (new API)
 * - Wraps production requests via https://cors.bridged.cc/
 * - Sends Accept + Origin headers so the proxy is happy
 * - Exports computeAreaSqMeters(geojson) for watershed area in m²
 */

export type WatershedGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

type FetchOpts = {
  lat: number;     // +N
  lon: number;     // +E (negative for W)
  rcode?: string;  // optional 2–3 char state/region code, e.g. "PA"
  includeParameters?: boolean;   // default true
  includeFeatures?: boolean;     // default true
  simplify?: boolean;            // default true
};

const STREAMSTATS_BASE =
  "https://streamstats.usgs.gov/streamstatsservices/watershed.geojson";

function isDev() {
  try {
    // Vite defines this; if you're not on Vite, set VITE_DEV=true in .env.local
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(import.meta as any)?.env?.DEV;
  } catch {
    return false;
  }
}

function proxify(url: string): string {
  if (isDev()) return url;
  // Use the same proxy as designstorms-main for consistency
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
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
  if (rcode) params.set("rcode", rcode); // optional; API can infer if omitted
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
  const direct = buildWatershedUrl(opts);
  const url = proxify(direct);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, application/geo+json;q=0.9, */*;q=0.8",
      Origin: typeof window !== "undefined" ? window.location.origin : "https://example.org",
      "X-Requested-With": "fetch"
    }
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const preview = await safePreview(res);
    throw new Error(`StreamStats request failed (${res.status}) — ${preview}`);
  }

  if (!/json/i.test(contentType)) {
    try {
      return (await res.json()) as WatershedGeoJSON;
    } catch {
      const preview = await safePreview(res);
      throw new Error(
        `Expected JSON/GeoJSON but got "${contentType || "unknown"}". Preview: ${preview}`
      );
    }
  }

  return (await res.json()) as WatershedGeoJSON;
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
   Area helper (m²) — no deps
   =========================== */

/**
 * Compute total area (m²) of Polygon/MultiPolygon features in a GeoJSON FeatureCollection.
 * Uses Web Mercator projection (sufficient accuracy for watershed sizing & UI).
 */
export function computeAreaSqMeters(fc: WatershedGeoJSON): number {
  let total = 0;

  for (const feat of fc.features ?? []) {
    if (!feat || !feat.geometry) continue;

    if (feat.geometry.type === "Polygon") {
      total += polygonAreaMeters(feat.geometry.coordinates as GeoJSON.Position[][]);
    } else if (feat.geometry.type === "MultiPolygon") {
      const polys = feat.geometry.coordinates as GeoJSON.Position[][][];
      for (const poly of polys) {
        total += polygonAreaMeters(poly);
      }
    }
  }
  return Math.max(0, total);
}

function polygonAreaMeters(rings: GeoJSON.Position[][]): number {
  if (!rings || rings.length === 0) return 0;

  // Outer ring area minus holes
  let area = ringAreaMeters(rings[0]);
  for (let i = 1; i < rings.length; i++) {
    area -= ringAreaMeters(rings[i]); // subtract holes
  }
  return Math.abs(area);
}

function ringAreaMeters(coords: GeoJSON.Position[]): number {
  // Project lon/lat -> Web Mercator meters, then shoelace
  const pts = coords.map(([lon, lat]) => lonLatToWebMercator(lon, lat));
  let sum = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [x1, y1] = pts[j];
    const [x2, y2] = pts[i];
    sum += (x1 * y2) - (x2 * y1);
  }
  return Math.abs(sum) * 0.5;
}

function lonLatToWebMercator(lon: number, lat: number): [number, number] {
  // EPSG:3857
  const R = 6378137; // meters
  const λ = (lon * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const x = R * λ;
  const y = R * Math.log(Math.tan(Math.PI / 4 + φ / 2));
  return [x, y];
}
