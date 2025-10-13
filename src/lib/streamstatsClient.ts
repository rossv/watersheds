/**
 * StreamStats client — fixed CORS proxy + new API params.
 * - Uses xlocation/ylocation (new API)
 * - Wraps production requests via https://cors.bridged.cc/
 * - Sends Accept + Origin headers so the proxy is happy
 */

export type WatershedGeoJSON = GeoJSON.FeatureCollection;

type FetchOpts = {
  lat: number;     // +N
  lon: number;     // +E (negative for W)
  rcode?: string;  // optional 2–3 char state/region code, e.g. "PA"
  includeParameters?: boolean;   // default true
  includeFeatures?: boolean;     // default true
  simplify?: boolean;            // default true
};

const STREAMSTATS_BASE =
  "https://streamstats.usgs.gov/streamstatsservices/watershed.geojson";

// In dev (Vite), call target directly; in prod (GitHub Pages), go through proxy
function isDev() {
  try {
    // Vite defines this; if you're not on Vite, set VITE_DEV=true in .env.local
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(import.meta as any)?.env?.DEV;
  } catch {
    return false;
  }
}

function proxify(url: string): string {
  if (isDev()) return url;
  // Cloudflare bridge requires Origin header (we send it below)
  return `https://cors.bridged.cc/${url}`;
}

function buildWatershedUrl({
  lat,
  lon,
  rcode,
  includeParameters = true,
  includeFeatures = true,
  simplify = true
}: FetchOpts): string {
  const params = new URLSearchParams();
  if (rcode) params.set("rcode", rcode); // optional; API will figure it out if omitted
  params.set("xlocation", String(lon));
  params.set("ylocation", String(lat));
  params.set("crs", "4326");
  params.set("includeparameters", includeParameters ? "true" : "false");
  params.set("includefeatures", includeFeatures ? "true" : "false");
  params.set("simplify", simplify ? "true" : "false");
  return `${STREAMSTATS_BASE}?${params.toString()}`;
}

/**
 * Fetch a watershed GeoJSON for a lat/lon.
 * Throws an Error with a friendly message if the server returns non-200.
 */
export async function fetchWatershed(opts: FetchOpts): Promise<WatershedGeoJSON> {
  const direct = buildWatershedUrl(opts);
  const url = proxify(direct);

  const res = await fetch(url, {
    method: "GET",
    // The proxy wants an Origin header to mirror; use current site if present.
    headers: {
      Accept: "application/json, application/geo+json;q=0.9, */*;q=0.8",
      // Some proxies choke without this:
      Origin: typeof window !== "undefined" ? window.location.origin : "https://example.org",
      "X-Requested-With": "fetch" // satisfies some proxy variants
    }
  });

  // If proxy sends HTML error page, this will catch it before JSON.parse explodes.
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const preview = await safePreview(res);
    throw new Error(
      `StreamStats request failed (${res.status}) — ${preview}`
    );
  }

  if (!/json/i.test(contentType)) {
    // Try to parse anyway (some servers forget the header)
    try {
      const data = (await res.json()) as WatershedGeoJSON;
      return data;
    } catch {
      const preview = await safePreview(res);
      throw new Error(
        `Expected JSON/GeoJSON but got "${contentType || "unknown"}". Preview: ${preview}`
      );
    }
  }

  return (await res.json()) as WatershedGeoJSON;
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
