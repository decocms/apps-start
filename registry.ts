/**
 * Declarative catalogue of installable apps published under `@decocms/apps`.
 *
 * `@decocms/start`'s `autoconfigApps()` consumes this array to wire CMS
 * commerce loaders and admin invoke handlers for whichever apps the host
 * site has configured in its decofile. New apps are added here — no edit
 * to the framework or the site is required.
 *
 * Import path: `@decocms/apps/registry`
 *
 * NOTE: the type is inlined rather than imported from
 * `@decocms/start/apps` so this file ships in `@decocms/apps@1.4.0`
 * against any installed `@decocms/start` version. Once callers pin a
 * start version that exposes `AppRegistry`, the type can be swapped.
 */

interface AppRegistryEntry {
	/** Block key in the decofile, e.g. "deco-shopify". */
	blockKey: string;
	/** Lazy dynamic import of the app's mod module. */
	module: () => Promise<any>;
	/** Human-readable name shown in admin install UI. */
	displayName?: string;
	/** Icon URL (absolute or site-relative) shown in admin install UI. */
	icon?: string;
	/** Grouping label, e.g. "commerce", "email", "analytics". */
	category?: string;
	/** Short summary shown in admin install UI. */
	description?: string;
}

type AppRegistry = readonly AppRegistryEntry[];

export const APP_REGISTRY: AppRegistry = [
	{
		blockKey: "deco-shopify",
		module: () => import("./shopify/mod"),
		displayName: "Shopify",
		category: "commerce",
		description: "Shopify Storefront API commerce integration",
	},
	{
		blockKey: "deco-vtex",
		module: () => import("./vtex/mod"),
		displayName: "VTEX",
		category: "commerce",
		description: "VTEX IO commerce integration",
	},
	{
		blockKey: "deco-resend",
		module: () => import("./resend/mod"),
		displayName: "Resend",
		category: "email",
		description: "Transactional email via Resend",
	},
];

export default APP_REGISTRY;
export type { AppRegistryEntry, AppRegistry };
