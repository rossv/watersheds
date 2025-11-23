export type CacheEntry<T> = { value: T; expiresAt?: number };

export interface MemoryCache<T> {
  get(key: string): T | null;
  set(key: string, value: T): void;
  clear(): void;
}

export function createMemoryCache<T>({
  namespace = "cache",
  maxEntries = 24,
  ttlMs = 1000 * 60 * 60 * 24 * 7
}: {
  namespace?: string;
  maxEntries?: number;
  ttlMs?: number;
}): MemoryCache<T> {
  const store = new Map<string, CacheEntry<T>>();

  hydrateFromStorage(namespace, store);

  function persist() {
    try {
      const serializable: Record<string, CacheEntry<T>> = {};
      for (const [key, entry] of store.entries()) {
        serializable[key] = entry;
      }
      localStorage.setItem(namespace, JSON.stringify(serializable));
    } catch {
      /* ignore storage errors for non-browser environments */
    }
  }

  function set(key: string, value: T) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    trim();
    persist();
  }

  function get(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      store.delete(key);
      persist();
      return null;
    }
    return entry.value;
  }

  function trim() {
    if (store.size <= maxEntries) return;
    const keys = Array.from(store.keys());
    const removeCount = store.size - maxEntries;
    for (let i = 0; i < removeCount; i++) {
      store.delete(keys[i]);
    }
  }

  function clear() {
    store.clear();
    persist();
  }

  return { get, set, clear };
}

function hydrateFromStorage<T>(namespace: string, target: Map<string, CacheEntry<T>>) {
  try {
    const raw = localStorage.getItem(namespace);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry<T>>;
    for (const [key, entry] of Object.entries(parsed)) {
      target.set(key, entry);
    }
  } catch {
    // Ignore storage parsing errors in non-browser environments
  }
}
