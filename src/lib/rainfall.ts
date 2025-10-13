/**
 * Rainfall utilities — CORS proxy fix + CSV parsing
 * - Uses https://cors.bridged.cc/ in production (GitHub Pages)
 * - Exports fetchRainfallCSV(url) and parseRainfallCSV(csv)
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
  return `https://cors.bridged.cc/${url}`;
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

/**
 * Convenience: fetch a NOAA/HDSC CSV by URL.
 */
export async function fetchRainfallCSV(url: string): Promise<string> {
  return fetchTextThroughProxy(url);
}

/**
 * Parse CSV into headers + rows. Handles quotes and BOMs.
 */
export function parseRainfallCSV(csv: string): {
  headers: string[];
  rows: string[][];
} {
  // Normalize line endings, strip BOM
  let s = csv ?? "";
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = s.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCsvLine(lines[i]);
    // Pad/truncate to header length so consumers can index safely
    if (parsed.length < headers.length) {
      while (parsed.length < headers.length) parsed.push("");
    } else if (parsed.length > headers.length) {
      parsed.length = headers.length;
    }
    rows.push(parsed);
  }

  return { headers, rows };
}

/* ===========================
   Helpers
   =========================== */

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
