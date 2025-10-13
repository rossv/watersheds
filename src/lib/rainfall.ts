/**
 * Updated NOAA rainfall frequency fetch utilities.
 *
 * The original implementation wrapped requests through the `cors.sh` service,
 * which now requires an API key and returns 404/403 errors when used
 * anonymously.  This module instead uses the `api.allorigins.win/raw`
 * proxy when running in production on GitHub Pages to fetch the CSV from
 * NOAA.  During development the existing Vite proxy (`/noaa-api`) defined
 * in `vite.config.ts` continues to be used.
 */

export interface RainfallRow {
  /** The duration label (e.g., "1 hr", "24 hr", "7 day"). */
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
 * Encode a URL to be used as a parameter on the proxy service.
 */
function encodeForProxy(url: string): string {
  return encodeURIComponent(url);
}

/**
 * Fetch the raw NOAA table CSV for the given coordinate.  In development
 * mode this uses the `/noaa-api` proxy defined in `vite.config.ts`.  In
 * production the request is wrapped through a reliable CORS proxy to avoid
 * cross‑origin blocking on GitHub Pages.
 *
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees
 */
export async function fetchRainfallCSV(lat: number, lon: number): Promise<string> {
  const noaaBase =
    `https://hdsc.nws.noaa.gov/cgi-bin/new/fe_text_mean.csv?data=depth` +
    `&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&series=pds&units=english`;
  const url = import.meta.env.DEV
    ? `/noaa-api/fe_text_mean.csv?data=depth&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&series=pds&units=english`
    : `https://api.allorigins.win/raw?url=${encodeForProxy(noaaBase)}`;
  console.log('Fetching rainfall via:', url);
  try {
    const resp = await fetch(url, {
      headers: {
        Origin: window.location.origin
      }
    });
    console.log('Rainfall fetch status:', resp.status);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: Failed to fetch NOAA data. Proxy responded with: ${text}`);
    }
    return await resp.text();
  } catch (error: any) {
    console.error('Error during rainfall fetch:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
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
  if (!header) {
    console.error("Could not find 'ARI (years)' header in the rainfall data.");
    return null;
  }
  const headerTail = header.split('ARI (years)').pop() ?? '';
  const aris = (headerTail.match(/\b\d+\b/g) ?? []).map((ari) => ari);
  if (aris.length === 0) {
    console.error('Could not parse any ARI values from the rainfall data header.');
    return null;
  }
  const rows: RainfallRow[] = [];
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const label = match[1].trim().replace(/:+$/, '');
    if (!DURATION_RE.test(label)) continue;
    const nums = (match[2].match(/[-+]?\d*(?:\.\d+)?(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    const values: Record<string, number> = {};
    for (let i = 0; i < aris.length; i++) {
      const val = nums[i];
      values[aris[i]] = Number.isFinite(val) ? val : Number.NaN;
    }
    rows.push({ label, values });
  }
  if (rows.length === 0) {
    console.error('No valid data rows could be parsed from the rainfall text.');
    return null;
  }
  return { aris, rows };
}
