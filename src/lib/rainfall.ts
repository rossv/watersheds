/**
 * Functions for fetching and parsing NOAA Atlas 14 rainfall frequency tables.
 *
 * The NOAA service returns CSV data that lists durations and associated
 * average recurrence intervals (ARIs) with their mean depths.  This module
 * fetches that CSV and turns it into a structured table that can be used
 * interactively in the application.  It reuses much of the logic from
 * the designstorms project but with renamed types.
 */

export interface RainfallRow {
  /** The duration label (e.g., "1 hr", "24 hr", "7 day"). */
  label: string;
  /** A mapping from ARI (years) to depth (inches). */
  values: Record<string, number>;
}

export interface RainfallTable {
  /** Sorted list of recurrence intervals (ARI) in years. */
  aris: string[];
  /** Rows keyed by duration label. */
  rows: RainfallRow[];
}

/**
 * Fetch the raw NOAA table CSV for the given coordinate.  In development
 * mode this uses the `/noaa-api` proxy defined in vite.config.ts.  In
 * production the request is wrapped through https://api.allorigins.win/raw
 * to avoid CORS issues on GitHub Pages.
 *
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees
 */
export async function fetchRainfallCSV(lat: number, lon: number): Promise<string> {
  const noaaBase =
    `https://hdsc.nws.noaa.gov/cgi-bin/new/fe_text_mean.csv?data=depth` +
    `&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&series=pds&units=english`;
  let url: string;
  if (import.meta.env.DEV) {
    // Proxy through Vite for development
    url = `/noaa-api/fe_text_mean.csv?data=depth&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&series=pds&units=english`;
  } else {
    // Wrap via AllOrigins in production
    url = `https://api.allorigins.win/raw?url=${encodeURIComponent(noaaBase)}`;
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: Failed to fetch NOAA data`);
  }
  const text = await resp.text();
  return text;
}

// Regular expression to match duration labels like "1 hr", "15 min", etc.
const DURATION_RE = /^\s*(\d+(?:\.\d+)?)\s*[- ]?\s*(min|minute|minutes|hr|hour|hours|day|days)\s*:?\s*$/i;

/**
 * Parse the NOAA CSV into a structured table.  The CSV contains a header
 * row that lists ARIs (years) followed by multiple rows keyed by duration.
 * Rows without valid durations are ignored.
 */
export function parseRainfallCSV(text: string): RainfallTable | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  // Find the header row with the ARI list.  NOAA uses "ARI (years)" as a
  // marker.  Everything after that token are the return periods.
  const header = lines.find((line) => line.includes('ARI (years)'));
  if (!header) return null;
  const headerTail = header.split('ARI (years)').pop() ?? '';
  const aris = (headerTail.match(/\b\d+\b/g) ?? []).map((ari) => ari);
  if (aris.length === 0) return null;

  const rows: RainfallRow[] = [];
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const label = match[1].trim().replace(/:+$/, '');
    if (!DURATION_RE.test(label)) continue;
    const nums = (match[2].match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    const values: Record<string, number> = {};
    for (let i = 0; i < aris.length; i++) {
      const val = nums[i];
      values[aris[i]] = Number.isFinite(val) ? val : Number.NaN;
    }
    rows.push({ label, values });
  }
  if (rows.length === 0) return null;
  return { aris, rows };
}