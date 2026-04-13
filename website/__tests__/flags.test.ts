import { describe, expect, it } from "vitest";
import Audience from "../flags/audience";
import Everyone from "../flags/everyone";
import Flag from "../flags/flag";
import type { Matcher } from "../types";
import multivariate from "../utils/multivariate";

// ---------------------------------------------------------------------------
// flag.ts
// ---------------------------------------------------------------------------

describe("Flag", () => {
	it("returns a FlagObj with the same values", () => {
		const matcher: Matcher = () => true;
		const result = Flag({
			matcher,
			true: "variant-a",
			false: "variant-b",
			name: "test-flag",
		});

		expect(result.matcher).toBe(matcher);
		expect(result.true).toBe("variant-a");
		expect(result.false).toBe("variant-b");
		expect(result.name).toBe("test-flag");
	});

	it("preserves complex true/false values", () => {
		const routes = [{ pathTemplate: "/*", handler: { value: {} } }];
		const result = Flag<typeof routes>({
			matcher: () => false,
			true: routes,
			false: [],
			name: "routes-flag",
		});

		expect(result.true).toBe(routes);
		expect(result.false).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// audience.ts
// ---------------------------------------------------------------------------

describe("Audience", () => {
	it("returns FlagObj with routes as true branch and empty as false", () => {
		const matcher: Matcher = () => true;
		const routes = [{ pathTemplate: "/products/*", handler: { value: {} } }];

		const result = Audience({ matcher, name: "vip-users", routes });

		expect(result.name).toBe("vip-users");
		expect(result.true).toEqual(routes);
		expect(result.false).toEqual([]);
	});

	it("defaults routes to empty array when not provided", () => {
		const result = Audience({ matcher: () => false, name: "empty" });

		expect(result.true).toEqual([]);
		expect(result.false).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// everyone.ts
// ---------------------------------------------------------------------------

describe("Everyone", () => {
	it("creates a flag named Everyone that always matches", () => {
		const routes = [{ pathTemplate: "/*", handler: { value: {} } }];
		const result = Everyone({ routes });

		expect(result.name).toBe("Everyone");
		expect(result.true).toEqual(routes);
		expect(result.false).toEqual([]);
		// The matcher should be MatchAlways which returns true
		expect(result.matcher()).toBe(true);
	});

	it("works with no routes", () => {
		const result = Everyone({});

		expect(result.name).toBe("Everyone");
		expect(result.true).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// multivariate
// ---------------------------------------------------------------------------

describe("multivariate", () => {
	it("returns the variants as-is", () => {
		const variants = [
			{ value: "A", weight: 0.5 },
			{ value: "B", weight: 0.5 },
		];

		const result = multivariate({ variants });

		expect(result.variants).toBe(variants);
		expect(result.variants).toHaveLength(2);
	});

	it("supports variants with matchers", () => {
		const matcher: Matcher = () => true;
		const variants = [{ value: "control", matcher }, { value: "default" }];

		const result = multivariate({ variants });

		expect(result.variants[0].matcher).toBe(matcher);
		expect(result.variants[1].matcher).toBeUndefined();
	});
});
