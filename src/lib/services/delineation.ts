import type { FeatureCollection, Geometry } from "geojson";
import { delineateFromDEM } from "./elevation";
import { fetchHydroshareCatchment } from "./hydroshare";
import { getCatchment, snapToFlowline, type CatchmentCollection } from "./nldi";

export type WatershedGeoJSON = FeatureCollection<Geometry>;

export type DelineationResult = {
  basin: WatershedGeoJSON;
  source: "nldi" | "hydroshare" | "dem";
  comid?: string;
};

export async function delineateBasin(lat: number, lon: number): Promise<DelineationResult> {
  const snapped = await snapToFlowline({ lat, lon });
  const comid = snapped.properties.comid;

  let basin: CatchmentCollection | FeatureCollection<Geometry> | null = await getCatchment(comid);
  let source: DelineationResult["source"] = "nldi";

  if (!basin) {
    basin = await fetchHydroshareCatchment(comid);
    source = "hydroshare";
  }

  if (!basin) {
    basin = await delineateFromDEM({ lat, lon }, snapped.geometry, 750);
    source = "dem";
  }

  if (!basin) {
    throw new Error("Unable to delineate a basin with NLDI, HydroShare, or DEM fallback sources.");
  }

  return {
    basin: basin as FeatureCollection<Geometry>,
    source,
    comid: comid ? String(comid) : undefined
  };
}
