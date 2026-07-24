/**
 * Default network-level timeout for outbound `fetch()` calls.
 *
 * Mirrors `@decocms/blocks/sdk/fetchTimeout` in the deco-start monorepo —
 * duplicated locally because this repo pins `@decocms/start@6.6.1`, which
 * predates that export. Replace this file with a re-export from
 * `@decocms/start/sdk/fetchTimeout` once the dependency is bumped past the
 * version that ships it, and delete the copy.
 *
 * Background: nothing here previously bounded how long an outbound fetch
 * could hang. A hung upstream connection (VTEX/CDN holding a TCP connection
 * open) pins the request context in memory until the runtime kills the
 * isolate — see `apps-vtex/utils/fetchCache.ts`'s inflight-timeout comment
 * for the production incident this class of bug caused. This module fixes
 * the root cause: actually abort the request via `AbortSignal.timeout`,
 * composed with any caller-supplied signal so callers that already do their
 * own cancellation aren't overridden.
 */

/** Default per-request timeout for outbound fetch calls. */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Named alias for `typeof fetch`. Prefer this over repeating `typeof fetch`
 * in signatures — this repo bans the bare `fetch` global (see `biome.json`'s
 * `noRestrictedGlobals` override) and that ban also flags `typeof fetch`,
 * since it's the same identifier reference; `FetchFn` sidesteps that.
 */
export type FetchFn = typeof fetch;

/**
 * Combine a caller-supplied `AbortSignal` (if any) with a timeout signal, so
 * neither cancellation source is lost. Pass `timeoutMs <= 0` or non-finite
 * to opt out of the timeout entirely (e.g. long-lived streaming requests)
 * while still honoring the caller's own signal.
 */
export function withTimeoutSignal(
	signal: AbortSignal | undefined | null,
	timeoutMs: number,
): AbortSignal | undefined {
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return signal ?? undefined;
	const timeoutSignal = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

/**
 * Wrap a `fetch` implementation so every call is aborted after `timeoutMs`
 * unless it settles first. Use directly at ad-hoc fetch call sites that
 * don't go through an instrumented client.
 *
 * When `baseFetch` is omitted, `globalThis.fetch` is resolved on every call
 * (not captured once at wrap time) so tests that swap `globalThis.fetch`
 * with a mock after this module loads still get intercepted.
 */
export function withFetchTimeout(
	baseFetch?: typeof fetch,
	timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): typeof fetch {
	return (input, init) =>
		(baseFetch ?? globalThis.fetch)(input, {
			...init,
			signal: withTimeoutSignal(init?.signal, timeoutMs),
		});
}
