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

  const res = await fetch(target, {
    method: "GET",
    headers: {
      // Ask for text explicitly; some proxies complain otherwise.
      Accept: "text/plain, text/csv, text/html;q=0.8, */*;q=0.5",
      Origin: typeof window !== "undefined" ? window.location.origin : "https://example.org",
      "X-Requested-With": "fetch"
    }
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

  return `https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/fe_text_read.p?${params.toString()}`;
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

  const headerIdx = lines.findIndex((line) => /\bARI\b/i.test(line));
  if (headerIdx === -1) return null;

  const headerLine = lines[headerIdx];
  const ariSection = headerLine.slice(headerLine.toLowerCase().indexOf("ari"));
  const aris = Array.from(ariSection.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) => m[1]);
  if (aris.length === 0) return null;

  const rows: RainfallTable["rows"] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(?<label>[^:,]+?):\s*(?<values>.+)$/);
    const label = m?.groups?.label?.trim();
    const valuesPart = m?.groups?.values?.trim() ?? "";

    if (!label || !isDurationLabel(label)) continue;

    const tokens = valuesPart.split(/[\s,]+/).filter((t) => t.length > 0);
    const values: Record<string, number> = {};
    for (let j = 0; j < aris.length; j++) {
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
  return /(\d+(?:\.\d+)?)\s*(min|minute|minutes|hr|hour|hours|day|days)/i.test(label);
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
