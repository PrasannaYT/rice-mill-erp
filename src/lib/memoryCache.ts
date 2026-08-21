/**
 * Microsecond In-Memory RAM Cache Engine for Rice Mill ERP.
 * 
 * Serves master data (suppliers, products, godowns, vehicles, banks) directly
 * from server memory in ~0.1ms, eliminating database query overhead.
 * 
 * Auto-invalidated whenever a mutation server action runs.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const memoryStore = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 60 * 1000; // 1 minute RAM TTL
const MAX_CACHE_ENTRIES = 100;

function purgeExpiredKeys() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.expiresAt) {
      memoryStore.delete(key);
    }
  }
  if (memoryStore.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey) memoryStore.delete(oldestKey);
  }
}

export function getCachedData<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): T {
  purgeExpiredKeys();
  memoryStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
  return data;
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Wraps an async database query with microsecond RAM caching.
 * Does NOT cache empty arrays unless cacheEmpty is explicitly true,
 * preventing temporary DB cold-start query fallbacks from polluting the RAM cache.
 */
export async function withMemoryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  cacheEmpty: boolean = false
): Promise<T> {
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }
  const fresh = await fetcher();
  if (!cacheEmpty && Array.isArray(fresh) && fresh.length === 0) {
    return fresh;
  }
  return setCachedData<T>(key, fresh, ttlMs);
}
