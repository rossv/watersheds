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
}): Promise<FlowlineFeature> {
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
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      ...feature.properties,
      comid,
      name: (feature.properties as { name?: string }).name,
      reachcode: (feature.properties as { reachcode?: string }).reachcode,
      source: "nldi"
    }
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
