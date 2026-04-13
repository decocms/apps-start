import { describe, expect, it } from "vitest";
import MatchAlways from "../matchers/always";
import MatchCookie from "../matchers/cookie";
import MatchCron from "../matchers/cron";
import MatchDate from "../matchers/date";
import MatchDevice from "../matchers/device";
import MatchEnvironment from "../matchers/environment";
import MatchHost from "../matchers/host";
import MatchLocation from "../matchers/location";
import MatchMulti from "../matchers/multi";
import NegateMatcher from "../matchers/negate";
import MatchNever from "../matchers/never";
import MatchPathname from "../matchers/pathname";
import MatchQueryString from "../matchers/queryString";
import MatchRandom from "../matchers/random";
import MatchSite from "../matchers/site";
import MatchUserAgent from "../matchers/userAgent";
import type { MatchContext } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCtx = (
	overrides: Partial<MatchContext> & { url?: string; headers?: Record<string, string> } = {},
): MatchContext => {
	const { url = "https://example.com/", headers = {}, ...rest } = overrides;
	return {
		request: new Request(url, { headers }),
		device: "desktop",
		siteId: 1,
		...rest,
	};
};

// ---------------------------------------------------------------------------
// always / never
// ---------------------------------------------------------------------------

describe("MatchAlways", () => {
	it("always returns true", () => {
		expect(MatchAlways()).toBe(true);
	});
});

describe("MatchNever", () => {
	it("always returns false", () => {
		expect(MatchNever()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// cookie
// ---------------------------------------------------------------------------

describe("MatchCookie", () => {
	it("matches when cookie value equals", () => {
		const ctx = makeCtx({ headers: { cookie: "theme=dark; lang=en" } });
		expect(MatchCookie({ name: "theme", value: "dark" }, ctx)).toBe(true);
	});

	it("does not match when cookie value differs", () => {
		const ctx = makeCtx({ headers: { cookie: "theme=light" } });
		expect(MatchCookie({ name: "theme", value: "dark" }, ctx)).toBe(false);
	});

	it("does not match when cookie is missing", () => {
		const ctx = makeCtx({});
		expect(MatchCookie({ name: "theme", value: "dark" }, ctx)).toBe(false);
	});

	it("handles cookie values with = sign", () => {
		const ctx = makeCtx({ headers: { cookie: "token=abc=123" } });
		expect(MatchCookie({ name: "token", value: "abc=123" }, ctx)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// cron
// ---------------------------------------------------------------------------

describe("MatchCron", () => {
	it("returns false for empty cron", () => {
		expect(MatchCron({ cron: "" })).toBe(false);
	});

	it("matches wildcard cron (every minute)", () => {
		expect(MatchCron({ cron: "* * * * *" })).toBe(true);
	});

	it("does not match impossible cron (Feb 30)", () => {
		// minute 99 doesn't exist
		expect(MatchCron({ cron: "99 99 30 2 *" })).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// date
// ---------------------------------------------------------------------------

describe("MatchDate", () => {
	it("matches when now is within range", () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		const future = new Date(Date.now() + 86400000).toISOString();
		expect(MatchDate({ start: past, end: future })).toBe(true);
	});

	it("does not match when now is before start", () => {
		const future = new Date(Date.now() + 86400000).toISOString();
		expect(MatchDate({ start: future })).toBe(false);
	});

	it("does not match when now is after end", () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		expect(MatchDate({ end: past })).toBe(false);
	});

	it("matches when no bounds specified", () => {
		expect(MatchDate({})).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// device
// ---------------------------------------------------------------------------

describe("MatchDevice", () => {
	it("matches desktop", () => {
		expect(MatchDevice({ desktop: true }, makeCtx({ device: "desktop" }))).toBe(true);
	});

	it("matches mobile", () => {
		expect(MatchDevice({ mobile: true }, makeCtx({ device: "mobile" }))).toBe(true);
	});

	it("does not match wrong device", () => {
		expect(MatchDevice({ mobile: true }, makeCtx({ device: "desktop" }))).toBe(false);
	});

	it("matches multiple devices", () => {
		expect(MatchDevice({ mobile: true, tablet: true }, makeCtx({ device: "tablet" }))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// environment
// ---------------------------------------------------------------------------

describe("MatchEnvironment", () => {
	it("matches production when NODE_ENV is production", () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		expect(MatchEnvironment({ environment: "production" })).toBe(true);
		expect(MatchEnvironment({ environment: "development" })).toBe(false);
		process.env.NODE_ENV = original;
	});

	it("matches development when NODE_ENV is not production", () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = "test";
		expect(MatchEnvironment({ environment: "development" })).toBe(true);
		expect(MatchEnvironment({ environment: "production" })).toBe(false);
		process.env.NODE_ENV = original;
	});
});

// ---------------------------------------------------------------------------
// host
// ---------------------------------------------------------------------------

describe("MatchHost", () => {
	it("matches host by includes", () => {
		const ctx = makeCtx({ headers: { host: "www.example.com" } });
		expect(MatchHost({ includes: "example" }, ctx)).toBe(true);
	});

	it("does not match when host does not include", () => {
		const ctx = makeCtx({ headers: { host: "www.other.com" } });
		expect(MatchHost({ includes: "example" }, ctx)).toBe(false);
	});

	it("matches host by regex", () => {
		const ctx = makeCtx({ headers: { host: "store.example.com" } });
		expect(MatchHost({ match: "^store\\." }, ctx)).toBe(true);
	});

	it("does not match when regex fails", () => {
		const ctx = makeCtx({ headers: { host: "www.example.com" } });
		expect(MatchHost({ match: "^store\\." }, ctx)).toBe(false);
	});

	it("matches when both includes and match pass", () => {
		const ctx = makeCtx({ headers: { host: "store.example.com" } });
		expect(MatchHost({ includes: "example", match: "^store" }, ctx)).toBe(true);
	});

	it("returns true when no conditions specified", () => {
		const ctx = makeCtx({ headers: { host: "anything.com" } });
		expect(MatchHost({}, ctx)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// location
// ---------------------------------------------------------------------------

describe("MatchLocation", () => {
	it("matches by country", () => {
		const ctx = makeCtx({ headers: { "cf-ipcountry": "BR" } });
		expect(MatchLocation({ includeLocations: [{ country: "BR" }] }, ctx)).toBe(true);
	});

	it("does not match wrong country", () => {
		const ctx = makeCtx({ headers: { "cf-ipcountry": "US" } });
		expect(MatchLocation({ includeLocations: [{ country: "BR" }] }, ctx)).toBe(false);
	});

	it("excludes matching location", () => {
		const ctx = makeCtx({ headers: { "cf-ipcountry": "BR" } });
		expect(MatchLocation({ excludeLocations: [{ country: "BR" }] }, ctx)).toBe(false);
	});

	it("matches by city", () => {
		const ctx = makeCtx({ headers: { "cf-ipcity": "Sao Paulo", "cf-ipcountry": "BR" } });
		expect(MatchLocation({ includeLocations: [{ city: "Sao Paulo" }] }, ctx)).toBe(true);
	});

	it("returns true when includeLocations is empty", () => {
		const ctx = makeCtx({});
		expect(MatchLocation({ includeLocations: [] }, ctx)).toBe(true);
	});

	it("returns true when no locations specified", () => {
		const ctx = makeCtx({});
		expect(MatchLocation({}, ctx)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// multi
// ---------------------------------------------------------------------------

describe("MatchMulti", () => {
	const trueM: MatchContext["request"] extends any ? () => boolean : never = () => true;
	const falseM = () => false;

	it("OR: true if any matcher matches", () => {
		const matcher = MatchMulti({ op: "or", matchers: [falseM, trueM] });
		expect(matcher(makeCtx())).toBe(true);
	});

	it("OR: false if no matcher matches", () => {
		const matcher = MatchMulti({ op: "or", matchers: [falseM, falseM] });
		expect(matcher(makeCtx())).toBe(false);
	});

	it("AND: true if all matchers match", () => {
		const matcher = MatchMulti({ op: "and", matchers: [trueM, trueM] });
		expect(matcher(makeCtx())).toBe(true);
	});

	it("AND: false if any matcher fails", () => {
		const matcher = MatchMulti({ op: "and", matchers: [trueM, falseM] });
		expect(matcher(makeCtx())).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// negate
// ---------------------------------------------------------------------------

describe("NegateMatcher", () => {
	it("negates a true matcher", () => {
		const matcher = NegateMatcher({ matcher: () => true });
		expect(matcher(makeCtx())).toBe(false);
	});

	it("negates a false matcher", () => {
		const matcher = NegateMatcher({ matcher: () => false });
		expect(matcher(makeCtx())).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// pathname
// ---------------------------------------------------------------------------

describe("MatchPathname", () => {
	it("matches exact pathname (Equals)", () => {
		const ctx = makeCtx({ url: "https://example.com/about" });
		expect(MatchPathname({ case: { type: "Equals", pathname: "/about" } }, ctx)).toBe(true);
	});

	it("does not match different pathname (Equals)", () => {
		const ctx = makeCtx({ url: "https://example.com/contact" });
		expect(MatchPathname({ case: { type: "Equals", pathname: "/about" } }, ctx)).toBe(false);
	});

	it("matches substring (Includes)", () => {
		const ctx = makeCtx({ url: "https://example.com/products/shoes" });
		expect(MatchPathname({ case: { type: "Includes", pathname: "/products" } }, ctx)).toBe(true);
	});

	it("matches template pattern (Template)", () => {
		const ctx = makeCtx({ url: "https://example.com/product/my-shoe/p" });
		expect(MatchPathname({ case: { type: "Template", pathname: "/product/:slug/p" } }, ctx)).toBe(
			true,
		);
	});

	it("does not match template for wrong structure", () => {
		const ctx = makeCtx({ url: "https://example.com/product/my-shoe/extra/p" });
		expect(MatchPathname({ case: { type: "Template", pathname: "/product/:slug/p" } }, ctx)).toBe(
			false,
		);
	});

	it("negates the match when negate is true", () => {
		const ctx = makeCtx({ url: "https://example.com/about" });
		expect(MatchPathname({ case: { type: "Equals", pathname: "/about", negate: true } }, ctx)).toBe(
			false,
		);
	});

	it("returns false when pathname is empty", () => {
		const ctx = makeCtx({ url: "https://example.com/about" });
		expect(MatchPathname({ case: { type: "Equals" } }, ctx)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// queryString
// ---------------------------------------------------------------------------

describe("MatchQueryString", () => {
	it("matches Equals condition", () => {
		const ctx = makeCtx({ url: "https://example.com/?color=red" });
		expect(
			MatchQueryString(
				{ conditions: [{ param: "color", case: { type: "Equals", value: "red" } }] },
				ctx,
			),
		).toBe(true);
	});

	it("does not match Equals with different value", () => {
		const ctx = makeCtx({ url: "https://example.com/?color=blue" });
		expect(
			MatchQueryString(
				{ conditions: [{ param: "color", case: { type: "Equals", value: "red" } }] },
				ctx,
			),
		).toBe(false);
	});

	it("matches Exists condition", () => {
		const ctx = makeCtx({ url: "https://example.com/?color=red" });
		expect(
			MatchQueryString({ conditions: [{ param: "color", case: { type: "Exists" } }] }, ctx),
		).toBe(true);
	});

	it("fails Exists when param is missing", () => {
		const ctx = makeCtx({ url: "https://example.com/" });
		expect(
			MatchQueryString({ conditions: [{ param: "color", case: { type: "Exists" } }] }, ctx),
		).toBe(false);
	});

	it("matches Includes condition", () => {
		const ctx = makeCtx({ url: "https://example.com/?name=typescript" });
		expect(
			MatchQueryString(
				{ conditions: [{ param: "name", case: { type: "Includes", value: "script" } }] },
				ctx,
			),
		).toBe(true);
	});

	it("all conditions must match (AND)", () => {
		const ctx = makeCtx({ url: "https://example.com/?a=1&b=2" });
		expect(
			MatchQueryString(
				{
					conditions: [
						{ param: "a", case: { type: "Equals", value: "1" } },
						{ param: "b", case: { type: "Equals", value: "2" } },
					],
				},
				ctx,
			),
		).toBe(true);

		expect(
			MatchQueryString(
				{
					conditions: [
						{ param: "a", case: { type: "Equals", value: "1" } },
						{ param: "b", case: { type: "Equals", value: "3" } },
					],
				},
				ctx,
			),
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// random
// ---------------------------------------------------------------------------

describe("MatchRandom", () => {
	it("always matches with traffic = 1", () => {
		// traffic = 1 means 100% probability
		let allTrue = true;
		for (let i = 0; i < 100; i++) {
			if (!MatchRandom({ traffic: 1 })) {
				allTrue = false;
				break;
			}
		}
		expect(allTrue).toBe(true);
	});

	it("never matches with traffic = 0", () => {
		let anyTrue = false;
		for (let i = 0; i < 100; i++) {
			if (MatchRandom({ traffic: 0 })) {
				anyTrue = true;
				break;
			}
		}
		expect(anyTrue).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// site
// ---------------------------------------------------------------------------

describe("MatchSite", () => {
	it("matches when siteId equals", () => {
		expect(MatchSite({ siteId: 42 }, makeCtx({ siteId: 42 }))).toBe(true);
	});

	it("does not match when siteId differs", () => {
		expect(MatchSite({ siteId: 42 }, makeCtx({ siteId: 99 }))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// userAgent
// ---------------------------------------------------------------------------

describe("MatchUserAgent", () => {
	it("matches by includes", () => {
		const ctx = makeCtx({ headers: { "user-agent": "Mozilla/5.0 Chrome/120" } });
		expect(MatchUserAgent({ includes: "Chrome" }, ctx)).toBe(true);
	});

	it("does not match when UA does not include", () => {
		const ctx = makeCtx({ headers: { "user-agent": "Mozilla/5.0 Firefox/120" } });
		expect(MatchUserAgent({ includes: "Chrome" }, ctx)).toBe(false);
	});

	it("matches by regex", () => {
		const ctx = makeCtx({ headers: { "user-agent": "Googlebot/2.1" } });
		expect(MatchUserAgent({ match: "Googlebot" }, ctx)).toBe(true);
	});

	it("returns true when no conditions specified", () => {
		const ctx = makeCtx({ headers: { "user-agent": "anything" } });
		expect(MatchUserAgent({}, ctx)).toBe(true);
	});
});
