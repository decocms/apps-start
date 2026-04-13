import { describe, expect, it } from "vitest";
import { stripHTML } from "../utils/html";
import { haversine, toRadians } from "../utils/location";

// ---------------------------------------------------------------------------
// html.ts
// ---------------------------------------------------------------------------

describe("stripHTML", () => {
	it("strips HTML tags from string", () => {
		expect(stripHTML("<p>Hello <strong>World</strong></p>")).toBe("Hello World");
	});

	it("returns plain text unchanged", () => {
		expect(stripHTML("no tags here")).toBe("no tags here");
	});

	it("handles empty string", () => {
		expect(stripHTML("")).toBe("");
	});

	it("strips self-closing tags", () => {
		expect(stripHTML("Hello<br/>World")).toBe("HelloWorld");
	});

	it("strips nested tags", () => {
		expect(stripHTML("<div><p><span>text</span></p></div>")).toBe("text");
	});
});

// ---------------------------------------------------------------------------
// location.ts
// ---------------------------------------------------------------------------

describe("toRadians", () => {
	it("converts 0 degrees to 0 radians", () => {
		expect(toRadians(0)).toBe(0);
	});

	it("converts 180 degrees to PI radians", () => {
		expect(toRadians(180)).toBeCloseTo(Math.PI);
	});

	it("converts 90 degrees to PI/2 radians", () => {
		expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
	});
});

describe("haversine", () => {
	it("returns 0 for same coordinates", () => {
		expect(haversine("-23.5505,-46.6333", "-23.5505,-46.6333")).toBeCloseTo(0, 0);
	});

	it("calculates distance between São Paulo and Rio (~360km)", () => {
		const sp = "-23.5505,-46.6333";
		const rj = "-22.9068,-43.1729";
		const distance = haversine(sp, rj);
		// ~360km
		expect(distance).toBeGreaterThan(350000);
		expect(distance).toBeLessThan(380000);
	});

	it("calculates distance between New York and London (~5570km)", () => {
		const ny = "40.7128,-74.0060";
		const london = "51.5074,-0.1278";
		const distance = haversine(ny, london);
		// ~5570km
		expect(distance).toBeGreaterThan(5500000);
		expect(distance).toBeLessThan(5700000);
	});
});
