/**
 * Tests for the checkout-cookie canonicalization in `createVtexCheckoutProxy`.
 *
 * Root cause it guards against: `checkout.vtex.com` is written by two paths
 * that must agree on scope — this proxy (domain-scoped) and the cart server
 * functions (domain-scoped post-fix; HOST-ONLY in older @decocms/apps). A
 * lingering host-only variant coexists with the domain-scoped one as a
 * distinct browser cookie, drifts to a different orderForm id, and breaks
 * checkout because VTEX reads whichever the browser sends last.
 *
 * On checkout UI entry the proxy uses the storefront's source-of-truth
 * `checkout.vtex.com__orderFormId` mirror to re-assert the canonical
 * domain-scoped cookie and expire the stale host-only variant.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureVtex, setVtexFetch } from "../../client";
import { createVtexCheckoutProxy } from "../proxy";

const ACCOUNT = "myaccount";
const STORE_HOST = "www.mystore.com.br";

beforeEach(() => {
	configureVtex({ account: ACCOUNT });
	// Upstream returns a plain 200 with no Set-Cookie of its own, so the
	// only Set-Cookie headers on the response come from the proxy logic.
	setVtexFetch(
		vi.fn(
			async () =>
				new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }),
		) as unknown as typeof fetch,
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function makeProxy() {
	return createVtexCheckoutProxy({
		account: ACCOUNT,
		checkoutOrigin: `secure.mystore.com.br`,
	});
}

function req(
	path: string,
	cookie?: string,
	method = "GET",
): { request: Request; url: URL } {
	const url = new URL(`https://${STORE_HOST}${path}`);
	const headers = new Headers();
	if (cookie) headers.set("cookie", cookie);
	return { request: new Request(url.toString(), { method, headers }), url };
}

describe("createVtexCheckoutProxy — checkout cookie canonicalization", () => {
	it("re-asserts domain-scoped checkout.vtex.com from the mirror and expires host-only residue", async () => {
		const proxy = makeProxy();
		const { request, url } = req(
			"/checkout/",
			"checkout.vtex.com__orderFormId=abc123; checkout.vtex.com=__ofid=stale999",
		);
		const res = await proxy(request, url);
		const cookies = res.headers.getSetCookie();

		// canonical domain-scoped cookie set to the mirror value
		expect(
			cookies.some(
				(c) =>
					/^checkout\.vtex\.com=__ofid=abc123/.test(c) &&
					new RegExp(`Domain=${STORE_HOST}`).test(c),
			),
		).toBe(true);

		// stale host-only variant expired (Max-Age=0, NO Domain attribute)
		expect(
			cookies.some((c) => /^checkout\.vtex\.com=;/.test(c) && /Max-Age=0/i.test(c) && !/Domain=/i.test(c)),
		).toBe(true);

		// host-only ownership residue expired
		expect(
			cookies.some(
				(c) => /^CheckoutOrderFormOwnership=;/.test(c) && /Max-Age=0/i.test(c) && !/Domain=/i.test(c),
			),
		).toBe(true);
	});

	it("does nothing when there is no orderFormId mirror cookie", async () => {
		const proxy = makeProxy();
		const { request, url } = req("/checkout/", "someOther=1");
		const res = await proxy(request, url);
		const cookies = res.headers.getSetCookie();
		expect(cookies.some((c) => c.startsWith("checkout.vtex.com="))).toBe(false);
		expect(cookies.some((c) => c.startsWith("CheckoutOrderFormOwnership="))).toBe(false);
	});

	it("does not canonicalize on non-checkout-UI paths (e.g. /api/* XHR)", async () => {
		const proxy = makeProxy();
		const { request, url } = req(
			"/api/checkout/pub/orderForm",
			"checkout.vtex.com__orderFormId=abc123",
		);
		const res = await proxy(request, url);
		const cookies = res.headers.getSetCookie();
		// no canonical re-assert injected on the API path
		expect(cookies.some((c) => /^checkout\.vtex\.com=__ofid=abc123/.test(c))).toBe(false);
	});

	it("does not canonicalize on POST checkout-UI mutations (VTEX may change the orderForm)", async () => {
		const proxy = makeProxy();
		const { request, url } = req(
			"/checkout/changeToAnonymousUser/abc123",
			"checkout.vtex.com__orderFormId=abc123",
			"POST",
		);
		const res = await proxy(request, url);
		const cookies = res.headers.getSetCookie();
		expect(cookies.some((c) => /^checkout\.vtex\.com=__ofid=abc123/.test(c))).toBe(false);
	});
});
