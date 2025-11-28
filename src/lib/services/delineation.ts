import type { FeatureCollection, Geometry } from "geojson";
import { fetchState, fetchWatershed } from "./streamstats";
import { delineateFromDEM } from "./elevation";
import { fetchHydroshareCatchment } from "./hydroshare";
import { getCatchment, snapToFlowline, type CatchmentCollection } from "./nldi";

export type WatershedGeoJSON = FeatureCollection<Geometry>;

export type DelineationResult = {
  basin: WatershedGeoJSON;
  source: "nldi" | "hydroshare" | "dem" | "streamstats";
  comid?: string;
};

export async function delineateBasin(lat: number, lon: number): Promise<DelineationResult> {
  const snapped = await snapToFlowline({ lat, lon });
  const comid = snapped.properties.comid;

  let basin: CatchmentCollection | FeatureCollection<Geometry> | null = null;
  let source: DelineationResult["source"] = "nldi";

  // Try StreamStats first
  try {
    const rcode = await fetchState(lat, lon);
    if (rcode) {
      basin = await fetchWatershed({ lat, lon, rcode });
      source = "streamstats" as any; // Cast because I haven't updated the type definition yet
    }
  } catch (e) {
    console.warn("StreamStats delineation failed, falling back to NLDI:", e);
  }

  if (!basin) {
    basin = await getCatchment(comid);
    source = "nldi";
  }

  if (!basin) {
    basin = await fetchHydroshareCatchment(comid);
    source = "hydroshare";
  }

  if (!basin) {
    basin = await delineateFromDEM({ lat, lon }, snapped.geometry, 750);
    source = "dem";
  }

  if (!basin) {
    throw new Error("Unable to delineate a basin with StreamStats, NLDI, HydroShare, or DEM fallback sources.");
  }

  return {
    basin: basin as FeatureCollection<Geometry>,
    source,
    comid: comid ? String(comid) : undefined
  };
}
