/**
 * NOAA/HDSC client with proxy-friendly fetch helpers.
 */
function isDev() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(import.meta as any)?.env?.DEV;
  } catch {
    return false;
  }
}

function proxify(url: string): string {
  if (isDev()) return url;
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

export interface RainfallTable {
  aris: string[];
  rows: { label: string; values: Record<string, number> }[];
}

/**
 * Low-level fetch that returns text (CSV/HTML) and plays nice with the proxy.
 */
export async function fetchTextThroughProxy(url: string): Promise<string> {
  const target = proxify(url);
  const isProxy = target.includes('allorigins.win');

  // Only add custom headers if NOT using the external proxy.
  // The external proxy handles the request to the target, and adding headers here
  // can cause CORS preflight failures or be rejected by the proxy.
  const headers: HeadersInit = {};
  if (!isProxy) {
    headers['Accept'] = "text/plain, text/csv, text/html;q=0.8, */*;q=0.5";
    headers['Origin'] = typeof window !== "undefined" ? window.location.origin : "https://example.org";
    headers['X-Requested-With'] = "fetch";
  }

  const res = await fetch(target, {
    method: "GET",
    headers
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    const preview = await safePreview(res);
    throw new Error(`Rainfall fetch failed (${res.status}) — ${preview}`);
  }

  // NOAA endpoints usually return text, sometimes with odd content types.
  if (!/text|csv|json/i.test(ct)) {
    // Still try to read body; caller decides how to parse.
    return await res.text();
  }

  return await res.text();
}

function buildRainfallUrl(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Latitude and longitude must be finite numbers");
  }

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    data: "depth",
    units: "english",
    series: "pds"
  });

  // Updated URL based on investigation (fe_text_read.p returns 404)
  return `https://hdsc.nws.noaa.gov/cgi-bin/new/fe_text_mean.csv?${params.toString()}`;
}

/**
 * Convenience: fetch a NOAA/HDSC CSV using latitude/longitude.
 */
export async function fetchRainfallCSV(lat: number, lon: number): Promise<string> {
  const url = buildRainfallUrl(lat, lon);
  return fetchTextThroughProxy(url);
}

/**
 * Parse a NOAA rainfall CSV into a structured RainfallTable.
 */
export function parseRainfallCSV(csv: string): RainfallTable | null {
  // Normalize line endings, strip BOM
  let s = csv ?? "";
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = s
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  // Find header line. Usually contains "ARI" or "Average recurrence interval"
  const headerIdx = lines.findIndex((line) =>
    /\bARI\b/i.test(line) || /Average recurrence interval/i.test(line)
  );

  if (headerIdx === -1) return null;

  const headerLine = lines[headerIdx];

  // Robust parsing: 
  // 1. Find the first valid data row to count the number of columns.
  // 2. Extract ALL numbers from the header line.
  // 3. Take the last N numbers from the header, where N is the number of data columns.

  let dataColumnCount = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(?<label>[^:,]+?):\s*(?<values>.+)$/);
    const label = m?.groups?.label?.trim();
    const valuesPart = m?.groups?.values?.trim() ?? "";

    if (label && isDurationLabel(label)) {
      const tokens = valuesPart.split(/[\s,]+/).filter((t) => t.length > 0);
      dataColumnCount = tokens.length;
      break;
    }
  }

  if (dataColumnCount === 0) return null;

  // Extract all potential numbers from the header
  const allHeaderNumbers = Array.from(headerLine.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) => m[1]);

  // Take the last N numbers
  if (allHeaderNumbers.length < dataColumnCount) return null;
  const aris = allHeaderNumbers.slice(-dataColumnCount);

  const rows: RainfallTable["rows"] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(?<label>[^:,]+?):\s*(?<values>.+)$/);
    const label = m?.groups?.label?.trim();
    const valuesPart = m?.groups?.values?.trim() ?? "";

    if (!label || !isDurationLabel(label)) continue;

    const tokens = valuesPart.split(/[\s,]+/).filter((t) => t.length > 0);
    const values: Record<string, number> = {};

    // Ensure we don't go out of bounds if a row has fewer values than expected (though unlikely if valid)
    const loopCount = Math.min(aris.length, tokens.length);

    for (let j = 0; j < loopCount; j++) {
      const token = tokens[j];
      const num = token != null ? parseFloat(token) : NaN;
      values[aris[j]] = Number.isFinite(num) ? num : NaN;
    }

    rows.push({ label, values });
  }

  if (rows.length === 0) return null;

  return { aris, rows };
}

/* ===========================
   Helpers
   =========================== */

function isDurationLabel(label: string): boolean {
  return /(\d+(?:\.\d+)?)\s*[-]?\s*(min|minute|minutes|hr|hour|hours|day|days)/i.test(label);
}

async function safePreview(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    return truncate(txt.replace(/\s+/g, " "), 280);
  } catch {
    return "<no body>";
  }
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + "…";
}
