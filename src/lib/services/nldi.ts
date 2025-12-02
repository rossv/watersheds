import type { Feature, FeatureCollection, LineString, MultiPolygon, Point, Polygon } from "geojson";

const NLDI_BASE = "https://api.water.usgs.gov/nldi/linked-data";
const DEFAULT_TIMEOUT_MS = 10_000;

export type FlowlineFeature = Feature<LineString, { comid: string; name?: string; source: string; reachcode?: string }>;
export type CatchmentFeature = Feature<Polygon | MultiPolygon, { comid: string; source: string; areaSqKm?: number }>;
export type CatchmentCollection = FeatureCollection<CatchmentFeature["geometry"], CatchmentFeature["properties"]>;

export async function snapToFlowline({
  lat,
  lon,
  timeoutMs = DEFAULT_TIMEOUT_MS
}: {
  lat: number;
  lon: number;
  timeoutMs?: number;
}): Promise<{ feature: FlowlineFeature; snappedLat: number; snappedLon: number }> {
  // Try "smart snap" using EPA NHDPlus service first to find the closest flowline (including small tributaries)
  try {
    const smartResult = await findClosestFlowline(lat, lon, timeoutMs);
    if (smartResult) {
      return smartResult;
    }
  } catch (err) {
    console.warn("Smart snap failed, falling back to NLDI position", err);
  }

  // Fallback to standard NLDI position endpoint
  const params = new URLSearchParams();
  params.set("f", "json");
  params.set("coords", `POINT(${lon} ${lat})`);
  const url = `${NLDI_BASE}/comid/position?${params.toString()}`;
  const json = await fetchJson(url, "NLDI position", timeoutMs);
  const fc = ensureFeatureCollection(json, "flowline");
  const feature = fc.features?.[0] as Feature<LineString> | undefined;
  if (!feature?.geometry) {
    throw new Error("NLDI did not return a flowline near the selected location.");
  }
  const comid = extractComid(feature.properties);
  if (!comid) {
    throw new Error("NLDI response was missing the COMID identifier for the snapped flowline.");
  }
  return {
    feature: {
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        comid,
        name: (feature.properties as { name?: string }).name,
        reachcode: (feature.properties as { reachcode?: string }).reachcode,
        source: "nldi"
      }
    },
    snappedLat: lat, // NLDI doesn't give us the snapped point on the line easily without calculation, so use original
    snappedLon: lon
  };
}

export async function getCatchment(comid: string | number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<CatchmentCollection | null> {
  const url = `${NLDI_BASE}/comid/${comid}/basin?f=json`;
  try {
    const json = await fetchJson(url, "NLDI catchment", timeoutMs);
    const fc = ensureFeatureCollection(json, "catchment");
    if (!fc.features?.length) return null;
    return normalizeCatchmentCollection(fc, comid, "nldi");
  } catch (err) {
    console.warn("NLDI catchment lookup failed", err);
    return null;
  }
}

export async function getUpstreamFlowlines(
  comid: string | number,
  distanceKm = 25,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<FeatureCollection<LineString>> {
  const url = `${NLDI_BASE}/comid/${comid}/navigate/UT/flowlines?distance=${distanceKm}&f=json`;
  const json = await fetchJson(url, "NLDI upstream flowlines", timeoutMs);
  const fc = ensureFeatureCollection(json, "upstream flowlines");
  return fc as FeatureCollection<LineString>;
}

export async function getSplitCatchment(
  lat: number,
  lon: number,
  upstream = true,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<FeatureCollection | null> {
  const url = "https://api.water.usgs.gov/nldi/pygeoapi/processes/nldi-splitcatchment/execution";

  // The API expects a specific list format for inputs with string boolean for 'upstream'
  const payload = {
    inputs: [
      { id: "lat", value: lat },
      { id: "lon", value: lon },
      { id: "upstream", value: String(upstream).toLowerCase() }
    ]
  };

  try {
    const res = await fetchWithTimeout(url, timeoutMs, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const preview = await safePreview(res);
      console.warn(`NLDI split catchment request failed (${res.status}) — ${preview}`);
      return null;
    }

    const json = await res.json();
    return ensureFeatureCollection(json, "split catchment");
  } catch (err) {
    console.warn("NLDI split catchment lookup failed", err);
    return null;
  }
}

function normalizeCatchmentCollection(
  fc: FeatureCollection,
  comid: string | number,
  source: string
): CatchmentCollection {
  return {
    type: "FeatureCollection",
    features: (fc.features ?? [])
      .filter((f): f is Feature<Polygon | MultiPolygon> => !!f?.geometry)
      .map((feat) => ({
        type: "Feature",
        geometry: feat.geometry as Polygon | MultiPolygon,
        properties: {
          ...feat.properties,
          comid: extractComid(feat.properties) ?? String(comid),
          source
        }
      }))
  };
}

function ensureFeatureCollection(json: unknown, label: string): FeatureCollection {
  if (!json || (json as { type?: string }).type !== "FeatureCollection") {
    throw new Error(`${label} response was not valid GeoJSON.`);
  }
  return json as FeatureCollection;
}

async function fetchJson(url: string, label: string, timeoutMs: number) {
  const res = await fetchWithTimeout(url, timeoutMs, {
    headers: {
      Accept: "application/geo+json, application/json;q=0.9, */*;q=0.5"
    }
  });
  if (!res.ok) {
    const preview = await safePreview(res);
    throw new Error(`${label} request failed (${res.status}) — ${preview}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${label} returned invalid JSON: ${truncate(text, 200)}`);
  }
}

function extractComid(props: unknown): string | undefined {
  if (!props || typeof props !== "object") return undefined;
  const candidates = [
    (props as { identifier?: string }).identifier,
    (props as { comid?: string | number }).comid,
    (props as { featureid?: string | number }).featureid,
    (props as { featureId?: string | number }).featureId
  ];
  const value = candidates.find((v) => v !== undefined && v !== null);
  return value != null ? String(value) : undefined;
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init?.signal ? combineSignals([controller.signal, init.signal]) : controller.signal;
  try {
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const defined = signals.filter(Boolean);
  const abortSignalWithAny = AbortSignal as typeof AbortSignal & { any?: (signals: AbortSignal[]) => AbortSignal };
  if (abortSignalWithAny.any) {
    return abortSignalWithAny.any(defined);
  }
  if (defined.length === 1) return defined[0];
  const controller = new AbortController();
  for (const sig of defined) {
    sig.addEventListener(
      "abort",
      () => {
        if (!controller.signal.aborted) {
          controller.abort((sig as { reason?: unknown }).reason);
        }
      },
      { once: true }
    );
  }
  return controller.signal;
}

async function safePreview(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    return truncate(txt.replace(/\s+/g, " "), 180);
  } catch {
    return "<no body>";
  }
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

// --- Smart Snapping Helpers ---

async function findClosestFlowline(lat: number, lon: number, timeoutMs: number) {
  const ARCGIS_BASE = "https://watersgeo.epa.gov/arcgis/rest/services/NHDPlus/NHDPlus/MapServer/2/query";

  const geom = { x: lon, y: lat, spatialReference: { wkid: 4326 } };
  const params = new URLSearchParams();
  params.set("f", "json");
  params.set("geometry", JSON.stringify(geom));
  params.set("geometryType", "esriGeometryPoint");
  params.set("spatialRel", "esriSpatialRelIntersects");
  params.set("distance", "3000"); // 3km buffer
  params.set("units", "esriSRUnit_Meter");
  params.set("outFields", "*");
  params.set("returnGeometry", "true");
  params.set("outSR", "4326");

  const url = `${ARCGIS_BASE}?${params.toString()}`;
  const json = await fetchJson(url, "EPA NHDPlus Query", timeoutMs);

  if (!json.features || json.features.length === 0) return null;

  let bestFeature: any = null;
  let minDist = Infinity;
  let bestPoint = { lat, lon };

  for (const f of json.features) {
    if (!f.geometry || !f.geometry.paths) continue;
    const { dist, point } = distPointToMultiLine(lon, lat, f.geometry.paths);
    // Convert approx deg distance to meters (very rough)
    const distM = dist * 111000;

    if (distM < minDist) {
      minDist = distM;
      bestFeature = f;
      bestPoint = point;
    }
  }

  if (!bestFeature || minDist > 2000) return null; // If closest is > 2km, ignore

  // Convert EPA feature to FlowlineFeature
  const comid = String(bestFeature.attributes.comid || bestFeature.attributes.COMID);
  const name = bestFeature.attributes.gnis_name || bestFeature.attributes.GNIS_NAME;
  const reachcode = bestFeature.attributes.reachcode || bestFeature.attributes.REACHCODE;

  // Construct GeoJSON LineString from paths
  const geometry: LineString | any = {
    type: bestFeature.geometry.paths.length === 1 ? "LineString" : "MultiLineString",
    coordinates: bestFeature.geometry.paths.length === 1 ? bestFeature.geometry.paths[0] : bestFeature.geometry.paths
  };

  return {
    feature: {
      type: "Feature",
      geometry,
      properties: {
        comid,
        name,
        reachcode,
        source: "epa_nhdplus"
      }
    } as FlowlineFeature,
    snappedLat: bestPoint.lat,
    snappedLon: bestPoint.lon
  };
}

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), x: x1, y: y1 };
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = x1 + t * (x2 - x1);
  const y = y1 + t * (y2 - y1);
  return { dist: Math.hypot(px - x, py - y), x, y };
}

function distPointToMultiLine(px: number, py: number, paths: number[][][]) {
  let minDist = Infinity;
  let bestPoint = { lat: py, lon: px };

  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      const { dist, x, y } = distPointToSegment(px, py, x1, y1, x2, y2);
      if (dist < minDist) {
        minDist = dist;
        bestPoint = { lat: y, lon: x };
      }
    }
  }
  return { dist: minDist, point: bestPoint };
}
