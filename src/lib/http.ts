function isDevEnv() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((import.meta as any)?.env?.DEV) return true;
  } catch {
    /* ignore */
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      onTimeout();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.finally(() => clearTimeout(id));
  });
  return Promise.race([promise, timeout]);
}

export type FetchWithProxyOptions = {
  devProxyUrl?: string;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  init?: RequestInit;
};

export async function fetchWithProxy(
  directUrl: string,
  { devProxyUrl, timeoutMs = 8000, retries = 2, backoffMs = 300, init }: FetchWithProxyOptions = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json, application/geo+json;q=0.9, text/plain;q=0.5',
    Origin: typeof window !== 'undefined' ? window.location.origin : 'https://example.org',
    'X-Requested-With': 'fetch',
    ...(init?.headers as Record<string, string> | undefined)
  };

  const baseInit: RequestInit = { ...init, headers };

  const tryFetch = (url: string) => withTimeout(fetch(url, baseInit), timeoutMs, () => {});

  if (devProxyUrl && isDevEnv()) {
    try {
      const res = await tryFetch(devProxyUrl);
      if (res.ok) return res;
    } catch {
      /* fall through to proxy */
    }
  }

  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;
  let lastError: unknown = new Error('Unknown proxy failure');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await tryFetch(proxyUrl);
      if (res.ok) return res;
      lastError = new Error(`Proxy responded with ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
    }
  }

  throw new Error(`Request to ${directUrl} failed after proxy fallback: ${formatError(lastError)}`);
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
