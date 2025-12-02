import { fetchWithProxy } from "../http";

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
  const params = new URL(directUrl).search;

  const response = await fetchWithProxy({
    url: directUrl,
    devProxyUrl: `/streamstats-api/streamstatsservices/watershed.geojson${params}`,
    init: {
      method: "GET",
      headers: {
        // Simplified headers to avoid 415 Unsupported Media Type from IIS
        Accept: "application/json, */*",
        Origin: typeof window !== "undefined" ? window.location.origin : "https://example.org"
      }
    }
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!body) {
    throw new Error(
      "Failed to fetch watershed data: The proxy returned an empty response. The StreamStats API may be temporarily unavailable or blocking the proxy."
    );
  }

  let parsed: unknown;

  if (/application\/geo\+json/i.test(contentType)) {
    parsed = parseJson(body, "Failed to parse GeoJSON response");
  } else if (/json/i.test(contentType)) {
    // Try to parse as JSON directly first (in case of direct fetch)
    try {
      parsed = parseJson(body, "Failed to parse JSON response");
    } catch {
      // Fallback to proxy wrapped logic
      const wrapped = parseJson(body, "Failed to parse proxy response");
      const contents = (wrapped as { contents?: unknown })?.contents;
      if (typeof contents !== "string") {
        throw new Error("StreamStats proxy response was missing the expected contents string.");
      }
      parsed = parseJson(contents, "Failed to parse StreamStats response from proxy");
    }
  } else {
    const wrapped = parseJson(body, "Failed to parse proxy response");
    const contents = (wrapped as { contents?: unknown })?.contents;
    if (typeof contents !== "string") {
      throw new Error("StreamStats proxy response was missing the expected contents string.");
    }
    parsed = parseJson(contents, "Failed to parse StreamStats response from proxy");
  }

  // Handle StreamStats wrapped structure: { featurecollection: [ { name: "globalwatershed", feature: ... } ] }
  const anyParsed = parsed as any;
  if (anyParsed.featurecollection && Array.isArray(anyParsed.featurecollection)) {
    const watershedItem = anyParsed.featurecollection.find((f: any) => f.name === "globalwatershed");
    if (watershedItem && watershedItem.feature) {
      parsed = watershedItem.feature;
    } else {
      // Fallback: try to find any feature collection if globalwatershed is missing
      const anyFc = anyParsed.featurecollection.find((f: any) => f.feature && f.feature.type === 'FeatureCollection');
      if (anyFc) {
        parsed = anyFc.feature;
      }
    }
  }

  validateFeatureCollection(parsed);

  return parsed as WatershedGeoJSON;
}

function parseJson(input: string, label: string) {
  try {
    return JSON.parse(input);
  } catch (e) {
    const preview = truncate(input.replace(/\s+/g, " "), 280);
    throw new Error(`${label}. Preview: ${preview}`);
  }
}

function validateFeatureCollection(data: unknown): asserts data is WatershedGeoJSON {
  const features = (data as { features?: unknown })?.features;
  if (!Array.isArray(features)) {
    throw new Error(
      "StreamStats response did not include a features array. The upstream service may have returned HTML instead of GeoJSON."
    );
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

/**
 * Fetch the state code (rcode) for a given lat/lon.
 * Uses BigDataCloud's free reverse geocoding API.
 */
export async function fetchState(lat: number, lon: number): Promise<string | undefined> {
  try {
    const directUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const params = new URL(directUrl).search;
    const response = await fetchWithProxy({
      url: directUrl,
      devProxyUrl: `/geocoding-api/data/reverse-geocode-client${params}`,
      init: {
        headers: {
          "User-Agent": "WatershedResponseExplorer/1.0"
        }
      }
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    // principalSubdivisionCode is usually "US-PA", "US-NY", etc.
    const code = data.principalSubdivisionCode as string;
    if (code && code.startsWith("US-")) {
      return code.split("-")[1];
    }
    return undefined;
  } catch (e) {
    console.warn("Failed to fetch state code:", e);
    return undefined;
  }
}
