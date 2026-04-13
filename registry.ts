/**
 * App registry — maps CMS block keys to their module loaders.
 *
 * @decocms/start imports this registry instead of hardcoding known apps.
 * To register a new app, add an entry here and it will be auto-discovered
 * by the framework's `autoconfigApps()`.
 */
export const apps: Record<string, () => Promise<{ configure: (...args: never[]) => unknown }>> = {
	"deco-vtex": () => import("./vtex/mod"),
	"deco-shopify": () => import("./shopify/mod"),
	"deco-resend": () => import("./resend/mod"),
	"deco-website": () => import("./website/mod"),
};
