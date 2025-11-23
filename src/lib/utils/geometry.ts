import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

export type FeatureCollectionLike = FeatureCollection<Geometry>;

export function toFeatureCollection(input: Feature<Geometry> | FeatureCollectionLike | null): FeatureCollectionLike | null {
  if (!input) return null;
  if ((input as FeatureCollectionLike).type === "FeatureCollection") {
    return input as FeatureCollectionLike;
  }
  return {
    type: "FeatureCollection",
    features: [input as Feature<Geometry>]
  };
}

export function computeAreaSqMeters(fc: FeatureCollectionLike): number {
  let total = 0;
  for (const feat of fc.features ?? []) {
    if (!feat || !feat.geometry) continue;
    if (feat.geometry.type === "Polygon") {
      total += polygonAreaMeters(feat.geometry.coordinates as Position[][]);
    } else if (feat.geometry.type === "MultiPolygon") {
      for (const poly of feat.geometry.coordinates as Position[][][]) {
        total += polygonAreaMeters(poly);
      }
    }
  }
  return Math.max(0, total);
}

export function computeAreaAcres(fc: FeatureCollectionLike): number {
  return computeAreaSqMeters(fc) * 0.000247105;
}

export function bufferPointSquare(lat: number, lon: number, halfSizeMeters: number): FeatureCollectionLike {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = Math.cos((lat * Math.PI) / 180) * 111_320;
  const deltaLat = halfSizeMeters / metersPerDegreeLat;
  const deltaLon = metersPerDegreeLon !== 0 ? halfSizeMeters / metersPerDegreeLon : 0;

  const north = lat + deltaLat;
  const south = lat - deltaLat;
  const east = lon + deltaLon;
  const west = lon - deltaLon;

  const ring: Position[] = [
    [west, south],
    [west, north],
    [east, north],
    [east, south],
    [west, south]
  ];

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: { source: "synthetic", notes: "Square buffer around input point" }
      }
    ]
  };
}

function polygonAreaMeters(rings: Position[][]): number {
  if (!rings || rings.length === 0) return 0;
  let area = ringAreaMeters(rings[0]);
  for (let i = 1; i < rings.length; i++) {
    area -= ringAreaMeters(rings[i]);
  }
  return Math.abs(area);
}

function ringAreaMeters(coords: Position[]): number {
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
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const x = R * lambda;
  const y = Math.log(Math.tan(Math.PI / 4 + phi / 2)) * R;
  return [x, y];
}
