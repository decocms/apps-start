/**
 * Algolia client + config — module-global, set once at app boot.
 *
 * Mirrors `magento/client.ts` and `vtex/client.ts`'s `configureX` /
 * `getX` pattern so the same wiring contract works across commerce
 * apps. The SearchClient is constructed lazily on the first
 * `getAlgoliaClient()` call so the underlying `algoliasearch` SDK
 * (which pulls in fetch polyfills + an LRU) only loads when actually
 * used.
 *
 * Two reasons we don't pass config explicitly to every loader:
 *  1. CMS-resolved loader instances don't know where the config block
 *     lives; the site's `initAlgoliaFromBlocks(blocks)` adapter is the
 *     single source of truth.
 *  2. Matches the rest of @decocms/apps so a site touching VTEX,
 *     Magento, and Algolia has consistent muscle memory.
 */

import { algoliasearch, type SearchClient } from "algoliasearch";

import type { AlgoliaConfig } from "./types";

// ---------------------------------------------------------------------------
// Module-global state
// ---------------------------------------------------------------------------

let config: AlgoliaConfig | null = null;
let cachedClient: SearchClient | null = null;

export function configureAlgolia(c: AlgoliaConfig): void {
	config = c;
	// Reset the cached client so the next getAlgoliaClient() call picks
	// up the new credentials. In practice this only happens during dev
	// hot-reload of the setup file.
	cachedClient = null;
}

export function getAlgoliaConfig(): AlgoliaConfig {
	if (!config) {
		throw new Error(
			"[Algolia] configureAlgolia() must be called before loaders run. " +
				"Wire it in your site's setup, e.g. configureAlgolia(blocks['deco-algolia']).",
		);
	}
	return config;
}

/**
 * Returns the configured `SearchClient` from `algoliasearch`. The
 * instance is cached so all loaders/actions in a worker share one
 * client (and therefore one in-memory request cache).
 *
 * Prefers `adminApiKey` (broader scope — needed for indexing/settings
 * actions) but falls back to `searchApiKey` so search-only sites that
 * never set the admin secret as a worker env var still serve hits.
 * Both keys live in the same SDK instance because v4's SearchClient
 * doesn't expose a key swap; downstream write actions that require
 * admin scope should check `getAlgoliaConfig().adminApiKey` themselves
 * and surface a clear "admin key missing" error.
 */
export function getAlgoliaClient(): SearchClient {
	if (cachedClient) return cachedClient;
	const c = getAlgoliaConfig();
	if (!c.applicationId) {
		throw new Error("[Algolia] applicationId is required.");
	}
	const key = c.adminApiKey || c.searchApiKey;
	if (!key) {
		throw new Error(
			"[Algolia] Either adminApiKey or searchApiKey is required. " +
				"Set ADMIN_KEY (or the env var your CMS block's Secret references) " +
				"as a worker env var, or populate searchApiKey on the block.",
		);
	}
	// algoliasearch v5 uses the global `fetch` and `crypto` APIs by
	// default — works on Cloudflare Workers, Bun, Deno, modern Node.
	// v4 (with crypto / node:http imports) does not run on Workers.
	cachedClient = algoliasearch(c.applicationId, key);
	return cachedClient;
}

// ---------------------------------------------------------------------------
// CMS block adapter
// ---------------------------------------------------------------------------

/**
 * Resolve a secret-shaped CMS field (`{__resolveType:
 * "website/loaders/secret.ts", name: "X"}`) to its plain-string value
 * by reading the named env var. Strings pass through unchanged; null
 * / undefined / unrecognized shapes become "".
 *
 * The Deco CMS stores admin keys as `Secret` references that the old
 * resolver pipeline used to dereference at boot. `@decocms/start`
 * doesn't run that pipeline before init, so we resolve here — same
 * trade-off Magento and VTEX took.
 */
function resolveSecret(v: unknown): string {
	if (typeof v === "string") return v;
	if (v && typeof v === "object") {
		const ref = v as { name?: string };
		if (ref.name) return process.env[ref.name] ?? "";
	}
	return "";
}

/**
 * Best-effort init from a CMS block — mirrors `initMagentoFromBlocks`.
 * The block is conventionally keyed `deco-algolia` (matches the prod
 * Fresh sites' admin block name), but a custom key can be passed for
 * sites that named theirs differently.
 *
 * Returns true if the block was found and applied, false otherwise.
 * The site setup typically ignores the return value — the next
 * loader-time `getAlgoliaConfig()` call will throw with a clear
 * message if config was never set.
 */
export function initAlgoliaFromBlocks(
	blocks: Record<string, unknown>,
	blockKey = "deco-algolia",
): boolean {
	const block = blocks[blockKey] as Record<string, unknown> | undefined;
	if (!block) return false;

	const applicationId = typeof block.applicationId === "string" ? block.applicationId : "";
	const searchApiKey = typeof block.searchApiKey === "string" ? block.searchApiKey : "";
	const adminApiKey = resolveSecret(block.adminApiKey);

	configureAlgolia({ applicationId, searchApiKey, adminApiKey });
	return true;
}

// Re-exported for convenience so consumers can `import { SearchClient }
// from "@decocms/apps/algolia/client"` without depending on the npm
// path explicitly.
export type { SearchClient };
