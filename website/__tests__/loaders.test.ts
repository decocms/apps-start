import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EnvironmentLoader from "../loaders/environment";
import googleFonts from "../loaders/fonts/googleFonts";
import localFonts from "../loaders/fonts/local";
import SecretLoader from "../loaders/secret";

// ---------------------------------------------------------------------------
// loaders/fonts/local.ts
// ---------------------------------------------------------------------------

describe("localFonts", () => {
	it("returns empty family and stylesheet for no fonts", () => {
		const result = localFonts({ fonts: [] });
		expect(result.family).toBe("");
		expect(result.styleSheet).toBe("");
	});

	it("generates @font-face for a single font", () => {
		const result = localFonts({
			fonts: [
				{
					family: "CustomFont",
					variations: [{ weight: "400", italic: false, src: "https://cdn.example.com/font.woff2" }],
				},
			],
		});

		expect(result.family).toBe("CustomFont");
		expect(result.styleSheet).toContain("@font-face");
		expect(result.styleSheet).toContain("font-family: 'CustomFont'");
		expect(result.styleSheet).toContain("font-weight: 400");
		expect(result.styleSheet).toContain("font-style: normal");
		expect(result.styleSheet).toContain("format('woff2')");
	});

	it("generates italic font-face", () => {
		const result = localFonts({
			fonts: [
				{
					family: "CustomFont",
					variations: [
						{ weight: "700", italic: true, src: "https://cdn.example.com/font-bold-italic.woff2" },
					],
				},
			],
		});

		expect(result.styleSheet).toContain("font-style: italic");
		expect(result.styleSheet).toContain("font-weight: 700");
	});

	it("merges duplicate font families", () => {
		const result = localFonts({
			fonts: [
				{
					family: "Inter",
					variations: [{ weight: "400", src: "https://cdn.example.com/inter-400.woff2" }],
				},
				{
					family: "Inter",
					variations: [{ weight: "700", src: "https://cdn.example.com/inter-700.woff2" }],
				},
			],
		});

		expect(result.family).toBe("Inter");
		expect(result.styleSheet).toContain("font-weight: 400");
		expect(result.styleSheet).toContain("font-weight: 700");
	});

	it("detects font format from extension", () => {
		const ttfResult = localFonts({
			fonts: [{ family: "F", variations: [{ weight: "400", src: "https://x.com/f.ttf" }] }],
		});
		expect(ttfResult.styleSheet).toContain("format('truetype')");

		const woffResult = localFonts({
			fonts: [{ family: "F", variations: [{ weight: "400", src: "https://x.com/f.woff" }] }],
		});
		expect(woffResult.styleSheet).toContain("format('woff')");
	});
});

// ---------------------------------------------------------------------------
// loaders/fonts/googleFonts.ts
// ---------------------------------------------------------------------------

describe("googleFonts", () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn();
		vi.stubGlobal("fetch", fetchSpy);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns empty font for no fonts", async () => {
		const result = await googleFonts({ fonts: [] });
		expect(result.family).toBe("");
		expect(result.styleSheet).toBe("");
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("fetches Google Fonts CSS with two User-Agents", async () => {
		fetchSpy.mockResolvedValue({ text: () => Promise.resolve("/* css */") });

		const result = await googleFonts({
			fonts: [{ family: "Inter", variations: [{ weight: "400" }] }],
		});

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(result.family).toBe("Inter");
		expect(result.styleSheet).toContain("/* css */");
	});

	it("handles fetch errors gracefully", async () => {
		fetchSpy.mockRejectedValue(new Error("Network error"));

		const result = await googleFonts({
			fonts: [{ family: "Roboto", variations: [{ weight: "400" }] }],
		});

		expect(result.family).toBe("Roboto");
		expect(result.styleSheet).toBe("\n");
	});

	it("merges duplicate font families", async () => {
		fetchSpy.mockResolvedValue({ text: () => Promise.resolve("") });

		await googleFonts({
			fonts: [
				{ family: "Inter", variations: [{ weight: "400" }] },
				{ family: "Inter", variations: [{ weight: "700" }] },
			],
		});

		// Should only have one "family" param for "Inter" with merged variations
		const calledUrl = fetchSpy.mock.calls[0][0] as URL;
		const families = calledUrl.searchParams.getAll("family");
		expect(families).toHaveLength(1);
		expect(families[0]).toContain("Inter");
	});
});

// ---------------------------------------------------------------------------
// loaders/secret.ts
// ---------------------------------------------------------------------------

describe("SecretLoader", () => {
	it("reads from process.env when name is set", () => {
		process.env.MY_SECRET = "super-secret";
		const result = SecretLoader({ encrypted: "xxx", name: "MY_SECRET" });
		expect(result.get()).toBe("super-secret");
		delete process.env.MY_SECRET;
	});

	it("returns null when encrypted is empty", () => {
		const result = SecretLoader({ encrypted: "" });
		expect(result.get()).toBeNull();
	});

	it("returns encrypted value as fallback in dev", () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = "test";
		const result = SecretLoader({ encrypted: "encrypted-value", name: "NONEXISTENT" });
		expect(result.get()).toBe("encrypted-value");
		process.env.NODE_ENV = original;
	});

	it("reads empty-string env var correctly", () => {
		process.env.EMPTY_SECRET = "";
		const result = SecretLoader({ encrypted: "fallback", name: "EMPTY_SECRET" });
		expect(result.get()).toBe("");
		delete process.env.EMPTY_SECRET;
	});
});

// ---------------------------------------------------------------------------
// loaders/environment.ts
// ---------------------------------------------------------------------------

describe("EnvironmentLoader", () => {
	it("reads from process.env when name is set", () => {
		process.env.MY_ENV_VAR = "hello";
		const result = EnvironmentLoader({ value: "fallback", name: "MY_ENV_VAR" });
		expect(result.get()).toBe("hello");
		delete process.env.MY_ENV_VAR;
	});

	it("returns value when env var is not set", () => {
		const result = EnvironmentLoader({ value: "fallback", name: "NONEXISTENT_VAR" });
		expect(result.get()).toBe("fallback");
	});

	it("returns null when value is empty", () => {
		const result = EnvironmentLoader({ value: "" });
		expect(result.get()).toBeNull();
	});
});
