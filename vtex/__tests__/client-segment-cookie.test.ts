/**
 * Regression tests for the auto-forwarding of `vtex_segment` on outgoing
 * VTEX API calls. Without this, Legacy Catalog endpoints don't see the
 * region cookie and return OutOfStock for products only available
 * through regional sellers — see vtex/client.ts:vtexFetchResponse.
 */

import { RequestContext } from "@decocms/start/sdk/requestContext";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureVtex, setVtexFetch, vtexFetchResponse } from "../client";

function mockResponse(body: unknown = {}, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? "OK" : "Error",
		json: () => Promise.resolve(body),
	} as Response;
}

/**
 * Run `fn` inside a fake request context with the given cookie header.
 *
 * Two problems prevented a naive `RequestContext.run(new Request(...))`
 * approach from working:
 *
 *  1. Under the Fetch spec a Request's headers are in the "request"
 *     guard mode, which silently drops forbidden request headers —
 *     including `cookie` — at construction time. Node 22 / undici
 *     enforces this strictly, so the cookie never reaches
 *     `request.headers.get("cookie")`.
 *  2. `@decocms/start`'s `RequestContext` is backed by a
 *     `RequestStore` that defaults to a NOOP implementation. The
 *     ALS-backed store is installed by site code at worker boot, not
 *     in unit tests. So `RequestContext.run(req, fn)` calls
 *     `fn()` without any propagation, and `RequestContext.current`
 *     inside `fn` still returns `null` — production code under test
 *     never sees the test's cookie.
 *
 * Fix: build a fresh `Headers` object (which uses the "none" guard,
 * so `set("cookie", ...)` works), wrap it in a minimal `Ctx`-shaped
 * object, and override the `RequestContext.current` getter via
 * `vi.spyOn`. The spy is restored after `fn` resolves to keep tests
 * isolated. Nothing here depends on undici or ALS internals.
 */
function withRequest<T>(cookieHeader: string | null, fn: () => Promise<T>): Promise<T> {
	const headers = new Headers();
	if (cookieHeader) headers.set("cookie", cookieHeader);
	const fakeCtx = {
		request: { headers } as unknown as Request,
		signal: new AbortController().signal,
		responseHeaders: new Headers(),
		bag: new Map(),
		startedAt: Date.now(),
	};
	const spy = vi
		.spyOn(RequestContext, "current", "get")
		.mockReturnValue(fakeCtx as unknown as ReturnType<typeof Reflect.get>);
	return fn().finally(() => spy.mockRestore());
}

describe("vtexFetchResponse — vtex_segment cookie forwarding", () => {
	let lastInit: RequestInit | undefined;

	beforeEach(() => {
		configureVtex({ account: "testaccount" });
		lastInit = undefined;
		setVtexFetch(((_url: string, init?: RequestInit) => {
			lastInit = init;
			return Promise.resolve(mockResponse());
		}) as typeof fetch);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("forwards vtex_segment cookie when present and caller didn't set one", async () => {
		await withRequest("vtex_segment=abc123; other=foo", async () => {
			await vtexFetchResponse("/api/catalog_system/pub/products/x");
		});
		const headers = lastInit?.headers as Record<string, string>;
		expect(headers.cookie).toBe("vtex_segment=abc123");
	});

	it("does not overwrite a caller-supplied cookie header", async () => {
		await withRequest("vtex_segment=abc123", async () => {
			await vtexFetchResponse("/api/x", {
				headers: { cookie: "custom=zzz" },
			});
		});
		const headers = lastInit?.headers as Record<string, string>;
		expect(headers.cookie).toBe("custom=zzz");
	});

	it("does not overwrite a caller-supplied Cookie header (case-insensitive)", async () => {
		await withRequest("vtex_segment=abc123", async () => {
			await vtexFetchResponse("/api/x", {
				headers: { Cookie: "custom=zzz" },
			});
		});
		const headers = lastInit?.headers as Record<string, string>;
		// The merged headers may contain both keys; the caller's value should win.
		const lowered = Object.fromEntries(
			Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
		);
		expect(lowered.cookie).toBe("custom=zzz");
	});

	it("is a no-op when there is no incoming cookie header", async () => {
		await withRequest(null, async () => {
			await vtexFetchResponse("/api/x");
		});
		const headers = lastInit?.headers as Record<string, string>;
		expect(headers.cookie).toBeUndefined();
	});

	it("is a no-op when there is a cookie header but no vtex_segment", async () => {
		await withRequest("other=foo; another=bar", async () => {
			await vtexFetchResponse("/api/x");
		});
		const headers = lastInit?.headers as Record<string, string>;
		expect(headers.cookie).toBeUndefined();
	});

	it("does not crash when called outside a RequestContext", async () => {
		await vtexFetchResponse("/api/x");
		const headers = lastInit?.headers as Record<string, string>;
		expect(headers.cookie).toBeUndefined();
	});

	it("preserves auth headers alongside the forwarded cookie", async () => {
		configureVtex({ account: "testaccount", appKey: "k", appToken: "t" });
		await withRequest("vtex_segment=abc123", async () => {
			await vtexFetchResponse("/api/x");
		});
		const headers = lastInit?.headers as Record<string, string>;
		expect(headers["X-VTEX-API-AppKey"]).toBe("k");
		expect(headers["X-VTEX-API-AppToken"]).toBe("t");
		expect(headers.cookie).toBe("vtex_segment=abc123");
	});
});
