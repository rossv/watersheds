import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { normalizeHydrogeojson } from "./hydroshareUtils";

const HYDROSHARE_WFS = "https://geoserver.hydroshare.org/geoserver/NHDPlus_HR/wfs";

export async function fetchHydroshareCatchment(
  comid: string | number,
  timeoutMs = 10_000
): Promise<FeatureCollection<Polygon | MultiPolygon> | null> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: "NHDPlus_HR:NHDPlusCatchment",
    outputFormat: "application/json",
    cql_filter: `FEATUREID=${comid}`
  });
  const url = `${HYDROSHARE_WFS}?${params.toString()}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { Accept: "application/geo+json, application/json;q=0.9" },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HydroShare WFS returned ${res.status}`);
    }
    const json = await res.json();
    const fc = normalizeHydrogeojson(json, comid);
    return fc.features.length > 0 ? fc : null;
  } catch (err) {
    console.warn("HydroShare catchment fallback failed", err);
    return null;
  }
}
