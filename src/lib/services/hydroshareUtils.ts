import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";

export function normalizeHydrogeojson(
  json: unknown,
  comid: string | number
): FeatureCollection<Polygon | MultiPolygon> {
  if (!json || (json as { type?: string }).type !== "FeatureCollection") {
    return { type: "FeatureCollection", features: [] };
  }
  const fc = json as FeatureCollection<Geometry>;
  const features = (fc.features ?? [])
    .filter((f): f is Feature<Polygon | MultiPolygon> => !!f?.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
    .map((feat) => ({
      type: "Feature",
      geometry: feat.geometry as Polygon | MultiPolygon,
      properties: { ...feat.properties, comid: (feat.properties as { comid?: unknown })?.comid ?? String(comid), source: "hydroshare" }
    }));
  return { type: "FeatureCollection", features };
}
