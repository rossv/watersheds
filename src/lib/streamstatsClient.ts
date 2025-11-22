/**
 * StreamStats client — final attempt to align with the successful proxy strategy
 * used in rainfall.ts, using api.allorigins.win with required headers.
 */

import { fetchWithProxy } from './http';

export type WatershedGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

type FetchOpts = {
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
  const devProxyUrl = `/streamstats-api/streamstatsservices/watershed.geojson${params}`;

  const res = await fetchWithProxy(directUrl, {
    devProxyUrl,
    init: {
      method: "GET",
      headers: {
        Accept: "application/json, application/geo+json;q=0.9, */*;q=0.8"
      }
    }
  });

  const watershedJson = await parseWatershedResponse(res);

  if (!isFeatureCollection(watershedJson)) {
    throw new Error(
      "Unexpected watershed response shape: expected a GeoJSON FeatureCollection with a features array."
    );
  }

  return watershedJson;
}

async function parseWatershedResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";

  if (/json|geo\+json/.test(contentType)) {
    const parsed = await res.json();
    if (isAllOriginsEnvelope(parsed)) {
      return parseAllOriginsContents(parsed.contents);
    }
    return parsed;
  }

  const text = await res.text();

  try {
    const parsed = JSON.parse(text);
    if (isAllOriginsEnvelope(parsed)) {
      return parseAllOriginsContents(parsed.contents);
    }
    return parsed;
  } catch {
    return parseAllOriginsContents(text);
  }
}

function parseAllOriginsContents(contents: string): unknown {
  if (!contents) {
    throw new Error("Failed to fetch watershed data: Proxy returned an empty response.");
  }

  try {
    return JSON.parse(contents);
  } catch (e) {
    const preview = contents.replace(/\s+/g, " ");
    throw new Error(
      `Failed to parse AllOrigins-wrapped response as JSON. Preview: ${truncate(preview, 280)}`
    );
  }
}

function isAllOriginsEnvelope(value: unknown): value is { contents: string } {
  return Boolean(value && typeof value === "object" && "contents" in value);
}

function isFeatureCollection(value: unknown): value is WatershedGeoJSON {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as GeoJSON.FeatureCollection<GeoJSON.Geometry>).type === "FeatureCollection" &&
      Array.isArray((value as GeoJSON.FeatureCollection<GeoJSON.Geometry>).features)
  );
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
    sum += (x1 * y2) - (x2 * y1);
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
