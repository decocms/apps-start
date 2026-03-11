/**
 * SWR in-memory fetch cache for VTEX API responses.
 *
 * Inspired by deco-cx/deco runtime/fetch/fetchCache.ts.
 * Provides in-flight deduplication + stale-while-revalidate for GET requests.
 *
 * Only caches on the server side. Keyed by full URL string.
 */

const DEFAULT_MAX_ENTRIES = 500;

interface CacheEntry {
	body: unknown;
	status: number;
	createdAt: number;
	refreshing: boolean;
}

const TTL_BY_STATUS: Record<string, number> = {
	"2xx": 180_000, // 3 min for success
	"404": 10_000, // 10s for not found
	"5xx": 0, // never cache server errors
};

function ttlForStatus(status: number): number {
	if (status >= 200 && status < 300) return TTL_BY_STATUS["2xx"];
	if (status === 404) return TTL_BY_STATUS["404"];
	if (status >= 500) return TTL_BY_STATUS["5xx"];
	return 0;
}

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

function evictIfNeeded() {
	if (store.size <= DEFAULT_MAX_ENTRIES) return;
	const sorted = [...store.entries()].sort(
		(a, b) => a[1].createdAt - b[1].createdAt,
	);
	const toRemove = sorted.slice(0, store.size - DEFAULT_MAX_ENTRIES);
	for (const [key] of toRemove) store.delete(key);
}

async function executeFetch(
	_url: string,
	doFetch: () => Promise<Response>,
): Promise<CacheEntry> {
	const response = await doFetch();
	if (response.status >= 500) {
		throw new Error(
			`fetchWithCache: ${response.status} ${response.statusText}`,
		);
	}
	const body = response.ok ? await response.json() : null;
	return {
		body,
		status: response.status,
		createdAt: Date.now(),
		refreshing: false,
	};
}

export interface FetchCacheOptions {
	/**
	 * Custom TTL in ms. If provided, overrides status-based TTL.
	 */
	ttl?: number;
}

/**
 * Wrap a GET fetch call with SWR caching and in-flight dedup.
 *
 * Returns `null` for non-2xx responses that are cached (e.g. 404).
 * 5xx responses throw so the caller can handle them explicitly.
 *
 * @param cacheKey - Unique key (typically the full URL)
 * @param doFetch - The actual fetch call to execute
 * @param opts - Optional overrides
 * @returns Parsed JSON body, or null for cacheable error responses (e.g. 404)
 */
export function fetchWithCache<T>(
	cacheKey: string,
	doFetch: () => Promise<Response>,
	opts?: FetchCacheOptions,
): Promise<T | null> {
	const now = Date.now();
	const entry = store.get(cacheKey);

	if (entry) {
		const maxAge = opts?.ttl ?? ttlForStatus(entry.status);
		const isStale = now - entry.createdAt > maxAge;

		if (!isStale) return Promise.resolve(entry.body as T | null);

		if (isStale && !entry.refreshing) {
			entry.refreshing = true;
			executeFetch(cacheKey, doFetch)
				.then((fresh) => {
					// Only overwrite when the fresh response is successful (2xx).
					// A transient 4xx/5xx during revalidation must not replace a
					// previously successful cache entry with null or error data.
					if (fresh.status >= 200 && fresh.status < 300) {
						store.set(cacheKey, fresh);
					} else {
						entry.refreshing = false;
					}
				})
				.catch(() => {
					entry.refreshing = false;
				});
			return Promise.resolve(entry.body as T | null);
		}

		return Promise.resolve(entry.body as T | null);
	}

	const existing = inflight.get(cacheKey);
	if (existing) return existing.then((e) => e.body as T | null);

	const promise = executeFetch(cacheKey, doFetch)
		.then((fresh) => {
			const ttl = opts?.ttl ?? ttlForStatus(fresh.status);
			if (ttl > 0) {
				store.set(cacheKey, fresh);
				evictIfNeeded();
			}
			return fresh;
		})
		.finally(() => inflight.delete(cacheKey));

	inflight.set(cacheKey, promise);
	return promise.then((e) => e.body as T | null);
}

export function clearFetchCache() {
	store.clear();
	inflight.clear();
}

export function getFetchCacheStats() {
	return {
		entries: store.size,
		inflight: inflight.size,
	};
}
