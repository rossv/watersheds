import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { bufferPointSquare } from "../utils/geometry";

export type DemDelineationResult = FeatureCollection<Polygon | MultiPolygon>;

export async function delineateFromDEM(
  point: { lat: number; lon: number },
  _hintGeometry?: unknown,
  halfSizeMeters = 500
): Promise<DemDelineationResult | null> {
  try {
    const fc = bufferPointSquare(point.lat, point.lon, halfSizeMeters);
    return {
      ...fc,
      features: fc.features.map((feat) => ({
        ...feat,
        properties: { ...feat.properties, source: "dem-fallback" }
      }))
    } as FeatureCollection<Polygon | MultiPolygon>;
  } catch (err) {
    console.warn("DEM delineation fallback failed", err);
    return null;
  }
}
