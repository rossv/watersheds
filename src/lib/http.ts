const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 300;

export interface FetchWithProxyOptions {
  url: string;
  devProxyUrl?: string;
  init?: RequestInit;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

/**
 * Attempt to fetch through the Vite dev proxy first, then fall back to the
 * AllOrigins JSON wrapper with exponential backoff.
 */
export async function fetchWithProxy({
  url,
  devProxyUrl,
  init,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES,
  backoffMs = DEFAULT_BACKOFF_MS
}: FetchWithProxyOptions): Promise<Response> {
  // In Node.js (test) environment, fetch directly without proxy
  if (typeof window === "undefined") {
    return fetchWithTimeout(url, timeoutMs, init);
  }

  let lastError: unknown;

  if (devProxyUrl) {
    try {
      const devResponse = await fetchWithTimeout(devProxyUrl, timeoutMs, init);
      if (devResponse.ok) return devResponse;
      lastError = await buildResponseError(devResponse, "Vite proxy");
    } catch (err) {
      lastError = err;
    }
  }

  const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Strip headers for the proxy request to avoid CORS preflight issues
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { headers, ...proxyInit } = init || {};

      const response = await fetchWithTimeout(fallbackUrl, timeoutMs, proxyInit);
      if (response.ok) return response;
      lastError = await buildResponseError(response, "AllOrigins proxy");
    } catch (err) {
      lastError = err;
    }

    if (attempt < retries) {
      const delayMs = backoffMs * Math.pow(2, attempt);
      await wait(delayMs);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(String(lastError ?? "Unknown proxy failure"));
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const signals: AbortSignal[] = [controller.signal];
  if (init?.signal) signals.push(init.signal);
  const signal = buildCombinedSignal(signals);

  try {
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildCombinedSignal(signals: AbortSignal[]): AbortSignal {
  const definedSignals = signals.filter(Boolean);
  if (definedSignals.length === 1) return definedSignals[0];

  const abortSignalWithAny = AbortSignal as typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  };

  if (typeof abortSignalWithAny.any === "function") {
    return abortSignalWithAny.any(definedSignals);
  }

  const controller = new AbortController();
  for (const sig of definedSignals) {
    sig.addEventListener(
      "abort",
      () => {
        if (controller.signal.aborted) return;
        controller.abort((sig as { reason?: unknown }).reason);
      },
      { once: true }
    );
  }
  return controller.signal;
}

async function buildResponseError(res: Response, label: string) {
  const preview = await safePreview(res);
  return new Error(`${label} responded with ${res.status} — ${preview}`);
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
