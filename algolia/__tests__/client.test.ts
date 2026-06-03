/**
 * Tests for algolia/client.ts.
 *
 * The goal is to lock the contract that downstream sites depend on:
 *  - configureAlgolia stores config and surfaces it via getAlgoliaConfig
 *  - getAlgoliaConfig throws a useful error when init never happened
 *  - getAlgoliaClient builds the SDK lazily and caches the instance
 *  - initAlgoliaFromBlocks dereferences Secret-shaped admin keys via
 *    `process.env` so prod CMS blocks (`{__resolveType:
 *    "website/loaders/secret.ts", name: "ADMIN_KEY"}`) work
 *
 * The SDK itself is mocked — we don't want network or fetch polyfills
 * pulled into the test runner; we only care that we call into
 * `algoliasearch(applicationId, adminApiKey)` with the right args.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const algoliasearchSpy = vi.fn(() => ({ __mockClient: true }));

// algoliasearch v4 uses a default export; v5 uses a named export. The
// production module imports the default with a `type SearchClient`
// type-only named import, so mocking the default is sufficient.
vi.mock("algoliasearch", () => ({
	default: (...args: unknown[]) =>
		algoliasearchSpy(...(args as Parameters<typeof algoliasearchSpy>)),
}));

// Importing after the mock so the production module picks up the
// mocked SDK. resetModules() in beforeEach keeps module-global state
// (cachedClient, config) isolated across tests.
let mod: typeof import("../client");

beforeEach(async () => {
	algoliasearchSpy.mockClear();
	vi.resetModules();
	mod = await import("../client");
});

afterEach(() => {
	delete process.env.TEST_ADMIN_KEY;
});

describe("configureAlgolia + getAlgoliaConfig", () => {
	it("returns the most recently configured values", () => {
		mod.configureAlgolia({ applicationId: "APP", searchApiKey: "S", adminApiKey: "A" });
		expect(mod.getAlgoliaConfig()).toEqual({
			applicationId: "APP",
			searchApiKey: "S",
			adminApiKey: "A",
		});
	});

	it("throws a helpful error when called before init", () => {
		expect(() => mod.getAlgoliaConfig()).toThrowError(/configureAlgolia/);
	});
});

describe("getAlgoliaClient", () => {
	it("constructs the SDK with applicationId + adminApiKey", () => {
		mod.configureAlgolia({ applicationId: "APP_X", searchApiKey: "S", adminApiKey: "ADMIN" });
		const client = mod.getAlgoliaClient();
		expect(algoliasearchSpy).toHaveBeenCalledExactlyOnceWith("APP_X", "ADMIN");
		expect(client).toEqual({ __mockClient: true });
	});

	it("caches the client across calls", () => {
		mod.configureAlgolia({ applicationId: "APP_X", searchApiKey: "S", adminApiKey: "ADMIN" });
		mod.getAlgoliaClient();
		mod.getAlgoliaClient();
		mod.getAlgoliaClient();
		expect(algoliasearchSpy).toHaveBeenCalledOnce();
	});

	it("rebuilds the client after configureAlgolia is called again", () => {
		mod.configureAlgolia({ applicationId: "APP_X", searchApiKey: "S", adminApiKey: "ADMIN1" });
		mod.getAlgoliaClient();
		mod.configureAlgolia({ applicationId: "APP_X", searchApiKey: "S", adminApiKey: "ADMIN2" });
		mod.getAlgoliaClient();
		expect(algoliasearchSpy).toHaveBeenCalledTimes(2);
		expect(algoliasearchSpy).toHaveBeenNthCalledWith(2, "APP_X", "ADMIN2");
	});

	it("throws when applicationId is missing", () => {
		mod.configureAlgolia({ applicationId: "", searchApiKey: "S", adminApiKey: "A" });
		expect(() => mod.getAlgoliaClient()).toThrowError(/applicationId/);
	});

	it("throws when adminApiKey is missing", () => {
		mod.configureAlgolia({ applicationId: "APP", searchApiKey: "S", adminApiKey: "" });
		expect(() => mod.getAlgoliaClient()).toThrowError(/adminApiKey/);
	});
});

describe("initAlgoliaFromBlocks", () => {
	it("returns false and skips configure() when block is absent", () => {
		const result = mod.initAlgoliaFromBlocks({});
		expect(result).toBe(false);
		expect(() => mod.getAlgoliaConfig()).toThrowError(/configureAlgolia/);
	});

	it("reads applicationId + searchApiKey + adminApiKey from the block", () => {
		const result = mod.initAlgoliaFromBlocks({
			"deco-algolia": {
				applicationId: "APP",
				searchApiKey: "SEARCH",
				adminApiKey: "ADMIN_STRING",
			},
		});
		expect(result).toBe(true);
		expect(mod.getAlgoliaConfig()).toEqual({
			applicationId: "APP",
			searchApiKey: "SEARCH",
			adminApiKey: "ADMIN_STRING",
		});
	});

	it("dereferences a Secret-shaped adminApiKey via process.env", () => {
		process.env.TEST_ADMIN_KEY = "from-env";
		mod.initAlgoliaFromBlocks({
			"deco-algolia": {
				applicationId: "APP",
				searchApiKey: "SEARCH",
				adminApiKey: {
					__resolveType: "website/loaders/secret.ts",
					name: "TEST_ADMIN_KEY",
				},
			},
		});
		expect(mod.getAlgoliaConfig().adminApiKey).toBe("from-env");
	});

	it("falls back to empty string when env var is unset", () => {
		mod.initAlgoliaFromBlocks({
			"deco-algolia": {
				applicationId: "APP",
				searchApiKey: "SEARCH",
				adminApiKey: {
					__resolveType: "website/loaders/secret.ts",
					name: "UNDEFINED_ENV_VAR_DO_NOT_SET",
				},
			},
		});
		expect(mod.getAlgoliaConfig().adminApiKey).toBe("");
	});

	it("honors a custom block key", () => {
		mod.initAlgoliaFromBlocks(
			{
				"my-algolia": {
					applicationId: "X",
					searchApiKey: "Y",
					adminApiKey: "Z",
				},
			},
			"my-algolia",
		);
		expect(mod.getAlgoliaConfig().applicationId).toBe("X");
	});
});
