import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import { fetchState, fetchWatershed } from "./streamstats";
import { delineateFromDEM } from "./elevation";
import { fetchHydroshareCatchment } from "./hydroshare";
import { getCatchment, getSplitCatchment, snapToFlowline, type CatchmentCollection } from "./nldi";

export type WatershedGeoJSON = FeatureCollection<Geometry>;

export type DelineationResult = {
  basin: WatershedGeoJSON;
  source: "nldi" | "hydroshare" | "dem" | "streamstats";
  comid?: string;
  snappedFlowline?: Feature<LineString>;
};

export async function delineateBasin(lat: number, lon: number): Promise<DelineationResult> {
  const snappedResult = await snapToFlowline({ lat, lon });
  const snappedFeature = snappedResult.feature;
  const comid = snappedFeature.properties.comid;

  let basin: CatchmentCollection | FeatureCollection<Geometry> | null = null;
  let source: DelineationResult["source"] = "nldi";

  // Try StreamStats first
  try {
    const rcode = await fetchState(lat, lon);
    if (rcode) {
      basin = await fetchWatershed({ lat, lon, rcode });
      source = "streamstats" as any;
    }
  } catch (e) {
    console.warn("StreamStats delineation failed, falling back to NLDI:", e);
  }

  if (!basin) {
    // Try split catchment first for more precise delineation using the smart snapped point
    basin = await getSplitCatchment(snappedResult.snappedLat, snappedResult.snappedLon);
    source = "nldi";
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
    basin = await delineateFromDEM({ lat, lon }, snappedFeature.geometry, 750);
    source = "dem";
  }

  if (!basin) {
    throw new Error("Unable to delineate a basin with StreamStats, NLDI, HydroShare, or DEM fallback sources.");
  }

  return {
    basin: basin as FeatureCollection<Geometry>,
    source,
    comid: comid ? String(comid) : undefined,
    snappedFlowline: snappedFeature as Feature<LineString>
  };
}
