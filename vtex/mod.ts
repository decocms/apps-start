/**
 * VTEX app module — standard autoconfig contract.
 *
 * Exports `configure` following the AppModContract pattern.
 * The framework's `autoconfigApps()` calls these generically.
 *
 * @example
 * ```ts
 * import * as vtexApp from "@decocms/apps/vtex/mod";
 *
 * const app = await vtexApp.configure(blocks.vtex, resolveSecret);
 * if (app) {
 *   // app.manifest, app.state, app.middleware are available
 * }
 * ```
 */

import type {
	AppDefinition,
	AppMiddleware,
	ResolveSecretFn,
} from "../commerce/app-types";
import { configureVtex, type VtexConfig } from "./client";
import manifest from "./manifest.gen";
import {
	extractVtexContext,
	propagateISCookies,
	vtexCacheControl,
} from "./middleware";

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

export interface VtexState {
	config: VtexConfig;
}

// -------------------------------------------------------------------------
// Middleware
// -------------------------------------------------------------------------

const vtexMiddleware: AppMiddleware = async (request, next) => {
	const ctx = extractVtexContext(request);
	const response = await next();
	response.headers.set("Cache-Control", vtexCacheControl(ctx));
	propagateISCookies(ctx, response);
	return response;
};

// -------------------------------------------------------------------------
// Configure
// -------------------------------------------------------------------------

/**
 * Configure the VTEX app from CMS block data.
 * Returns an AppDefinition or null if required fields are missing.
 */
export async function configure(
	block: any,
	resolveSecret: ResolveSecretFn,
): Promise<AppDefinition<VtexState> | null> {
	if (!block?.account) return null;

	const appKey = await resolveSecret(block.appKey, "VTEX_APP_KEY");
	const appToken = await resolveSecret(block.appToken, "VTEX_APP_TOKEN");

	const config: VtexConfig = {
		account: block.account,
		publicUrl: block.publicUrl,
		salesChannel: block.salesChannel || "1",
		locale: block.locale || block.defaultLocale,
		appKey: appKey ?? undefined,
		appToken: appToken ?? undefined,
		country: block.country,
		domain: block.domain,
	};

	// Bridge: maintain global singleton for backward compat
	configureVtex(config);

	return {
		name: "vtex",
		manifest,
		state: { config },
		middleware: vtexMiddleware,
	};
}
