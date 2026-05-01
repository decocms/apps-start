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

/** Run `fn` inside a fake request context with the given cookie header. */
function withRequest<T>(cookieHeader: string | null, fn: () => Promise<T>): Promise<T> {
	const request = new Request("http://localhost/", {
		headers: cookieHeader ? { cookie: cookieHeader } : {},
	});
	return RequestContext.run(request, fn);
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
