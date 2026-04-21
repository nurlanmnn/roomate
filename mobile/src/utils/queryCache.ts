/**
 * Lightweight SWR-style cache for GET requests.
 *
 * Three responsibilities:
 *   1. Give a screen an instant synchronous snapshot of the previous response
 *      (so returning to a tab paints immediately instead of spinning).
 *   2. Deduplicate concurrent identical GETs (e.g. when two effects race).
 *   3. Let mutations invalidate groups of keys without a full reload loop.
 *
 * Intentionally in-memory only — we don't persist across app restarts here
 * because our data changes frequently and a cold start already hits the
 * network. Persistence would require careful TTL + staleness UX which isn't
 * worth it for now.
 */

type Listener = () => void;

const cache = new Map<string, unknown>();
const cachedAt = new Map<string, number>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<Listener>>();

/** Read the last-seen value for a key (sync). Returns `undefined` if we've
 *  never fetched it or it was invalidated. */
export const getCached = <T,>(key: string): T | undefined => {
  return cache.get(key) as T | undefined;
};

export const getCachedAt = (key: string): number | undefined => cachedAt.get(key);

export const setCached = <T,>(key: string, data: T): void => {
  cache.set(key, data);
  cachedAt.set(key, Date.now());
  listeners.get(key)?.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      if (__DEV__) console.warn('[queryCache] listener threw:', e);
    }
  });
};

/**
 * Patch a cached value in place and notify subscribers. Skips if the key has
 * never been cached (we don't want to synthesise a snapshot from nothing — if
 * we did, a subscriber could paint partial data that was never produced by a
 * real fetch). Return `undefined` from the updater to drop the entry.
 */
export const updateCached = <T,>(
  key: string,
  updater: (prev: T) => T | undefined
): void => {
  if (!cache.has(key)) return;
  const prev = cache.get(key) as T;
  const next = updater(prev);
  if (next === undefined) {
    cache.delete(key);
    cachedAt.delete(key);
  } else {
    cache.set(key, next);
    cachedAt.set(key, Date.now());
  }
  listeners.get(key)?.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      if (__DEV__) console.warn('[queryCache] listener threw:', e);
    }
  });
};

/** Remove any keys that start with the given prefix (plus exact matches).
 *  Used by mutations: e.g. after deleting an expense, invalidate any key
 *  starting with `expenses:<householdId>` to force the next reader to refetch. */
export const invalidateCache = (prefix: string): void => {
  for (const k of Array.from(cache.keys())) {
    if (k === prefix || k.startsWith(prefix)) {
      cache.delete(k);
      cachedAt.delete(k);
      listeners.get(k)?.forEach((fn) => fn());
    }
  }
};

export const clearAllCache = (): void => {
  cache.clear();
  cachedAt.clear();
  // Intentionally don't clear listeners — components will re-subscribe.
};

/**
 * Run `fetcher` but collapse concurrent calls with the same key into one
 * shared promise, and on success store the result in the cache.
 */
export const dedupedFetch = async <T,>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> => {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    try {
      const data = await fetcher();
      setCached(key, data);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
};

/** Fire-and-forget warm-up. Used by prefetch call sites. */
export const prefetch = <T,>(key: string, fetcher: () => Promise<T>): void => {
  if (inflight.has(key)) return;
  dedupedFetch(key, fetcher).catch(() => {
    /* swallow — a prefetch failure shouldn't surface to the user */
  });
};

/** Subscribe to updates for a key. Returns an unsubscribe function. */
export const subscribe = (key: string, fn: Listener): (() => void) => {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
};
