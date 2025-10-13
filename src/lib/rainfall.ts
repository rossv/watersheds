/**
 * Rainfall utilities — fixed CORS proxy for NOAA/HDSC CSV/HTML endpoints.
 * Use this helper to fetch text/CSV through https://cors.bridged.cc/
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
 * Fetches a text resource (CSV/HTML) with robust diagnostics.
 */
export async function fetchTextThroughProxy(url: string): Promise<string> {
  const target = proxify(url);

  const res = await fetch(target, {
    method: "GET",
    headers: {
      // Ask for text explicitly to avoid proxy “unsupported media type” surprises
      Accept: "text/plain, text/csv, text/html;q=0.8, */*;q=0.5",
      Origin: typeof window !== "undefined" ? window.location.origin : "https://example.org",
      "X-Requested-With": "fetch"
    }
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const preview = await safePreview(res);
    throw new Error(`Rainfall fetch failed (${res.status}) — ${preview}`);
  }

  // Most NOAA endpoints return text/csv or text/html; just pass it upstream.
  if (!/text|csv|json/i.test(contentType)) {
    // Still read the body and return it; caller decides how to parse.
    const body = await res.text();
    return body;
  }

  return await res.text();
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
