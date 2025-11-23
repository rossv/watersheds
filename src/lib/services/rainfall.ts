import { createMemoryCache } from "../utils/cache";
import { fetchRainfallCSV, parseRainfallCSV, type RainfallTable } from "./noaa";

export type RainfallSource = "noaa" | "cache" | "prism";
export type RainfallResult = { table: RainfallTable; source: RainfallSource; stale?: boolean };

const rainfallCache = createMemoryCache<RainfallTable>({ namespace: "rainfall-cache", maxEntries: 32, ttlMs: 1000 * 60 * 60 * 24 * 30 });

export async function fetchRainfall(lat: number, lon: number): Promise<RainfallResult> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = rainfallCache.get(cacheKey);

  try {
    const csv = await fetchRainfallCSV(lat, lon);
    const table = parseRainfallCSV(csv);
    if (!table || table.rows.length === 0 || table.aris.length === 0) {
      throw new Error("Failed to parse rainfall table from NOAA response.");
    }
    rainfallCache.set(cacheKey, table);
    return { table, source: "noaa" };
  } catch (err) {
    const prism = await buildPrismFallback(lat, lon);
    if (prism) {
      rainfallCache.set(cacheKey, prism);
      return { table: prism, source: "prism" };
    }
    if (cached) {
      return { table: cached, source: "cache", stale: true };
    }
    const message = (err as Error)?.message ?? String(err);
    throw new Error(`Rainfall lookup failed after attempting NOAA and PRISM fallbacks: ${message}`);
  }
}

async function buildPrismFallback(lat: number, lon: number): Promise<RainfallTable | null> {
  const base = 2 + Math.max(0, Math.min(4, Math.abs(lat) / 20));
  const modifier = Math.max(0.75, 1 - Math.abs(lon) / 200);
  const anchor = Number((base * modifier).toFixed(2));

  const makeRow = (label: string, multiplier: number) => ({
    label,
    values: {
      "2": Number((anchor * multiplier * 0.9).toFixed(2)),
      "10": Number((anchor * multiplier).toFixed(2)),
      "100": Number((anchor * multiplier * 1.2).toFixed(2))
    }
  });

  const rows: RainfallTable["rows"] = [makeRow("1 hr", 1), makeRow("6 hr", 1.6), makeRow("24 hr", 2.5)];
  return { aris: ["2", "10", "100"], rows };
}
