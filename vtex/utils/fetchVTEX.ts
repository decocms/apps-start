/**
 * VTEX fetch utilities — compat layer mirroring deco-cx/apps
 * `vtex/utils/fetchVTEX.ts`.
 *
 * Provides:
 *   - `fetchSafe`  — fetch wrapper that throws on non-2xx via {@link HttpError}
 *   - `fetchAPI`   — same, parsed to JSON
 *
 * URLs are sanitized for known XSS-prone query params (utm_*, ft, map) before
 * the request is dispatched. This matches the original behavior so site code
 * that calls `fetchSafe(url)` keeps the same security posture after the
 * Fresh → TanStack Start migration.
 */

type CachingMode = "stale-while-revalidate";

type DecoInit = {
	cache: CachingMode;
	cacheTtlByStatus?: Array<{ from: number; to: number; ttl: number }>;
};

export type DecoRequestInit = RequestInit & { deco?: DecoInit };

export class HttpError extends Error {
	readonly status: number;
	readonly response: Response;

	constructor(response: Response) {
		super(`HTTP ${response.status} ${response.statusText} — ${response.url}`);
		this.name = "HttpError";
		this.status = response.status;
		this.response = response;
	}
}

const removeNonLatin1Chars = (str: string): string =>
	// eslint-disable-next-line no-control-regex
	str.replace(/[^\x00-\xFF]/g, "");

const removeScriptChars = (str: string): string => str.replace(/[<>]/g, "");

const QS_TO_REMOVE_PLUS = ["utm_campaign", "utm_medium", "utm_source", "map"];
const QS_TO_REPLACE_PLUS = ["ft"];

const sanitizeUrl = (input: string | URL | Request): string | Request | URL => {
	let url: URL;

	if (typeof input === "string") {
		try {
			url = new URL(input);
		} catch {
			return input;
		}
	} else if (input instanceof URL) {
		url = input;
	} else {
		return input;
	}

	for (const key of QS_TO_REMOVE_PLUS) {
		if (!url.searchParams.has(key)) continue;
		const values = url.searchParams.getAll(key);
		const cleaned = values.map((v) => removeScriptChars(removeNonLatin1Chars(v))).filter(Boolean);
		url.searchParams.delete(key);
		for (const v of cleaned) url.searchParams.append(key, v);
	}

	for (const key of QS_TO_REPLACE_PLUS) {
		if (!url.searchParams.has(key)) continue;
		const values = url.searchParams.getAll(key);
		const cleaned = values.map((v) => encodeURIComponent(v.trim()));
		url.searchParams.delete(key);
		for (const v of cleaned) url.searchParams.append(key, v);
	}

	return url.toString();
};

/**
 * Fetch wrapper that throws {@link HttpError} on non-2xx responses.
 * Drop-in replacement for `fetchSafe` from deco-cx/apps.
 */
export async function fetchSafe(
	input: string | URL | Request,
	init?: DecoRequestInit,
): Promise<Response> {
	const sanitized = sanitizeUrl(input);
	const response = await fetch(sanitized as RequestInfo, init);
	if (!response.ok) {
		throw new HttpError(response);
	}
	return response;
}

/**
 * Fetch wrapper that parses the response as JSON. Throws on non-2xx.
 */
export async function fetchAPI<T = unknown>(
	input: string | URL | Request,
	init?: DecoRequestInit,
): Promise<T> {
	const response = await fetchSafe(input, init);
	return response.json() as Promise<T>;
}
