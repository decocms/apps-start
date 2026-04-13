/**
 * Website app module — standard autoconfig contract.
 *
 * Exports `configure` following the AppModContract pattern.
 * Provides SEO defaults, theme, matchers, and flags for the site.
 */

import type { AppDefinition, ResolveSecretFn } from "../commerce/app-types";
import { configureWebsite } from "./client";
import manifest from "./manifest.gen";
import type { WebsiteConfig } from "./types";

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

export interface WebsiteState {
	config: WebsiteConfig;
}

// -------------------------------------------------------------------------
// Configure
// -------------------------------------------------------------------------

/**
 * Configure the Website app from CMS block data.
 * Always returns an AppDefinition (no required fields).
 */
export async function configure(
	block: any,
	_resolveSecret: ResolveSecretFn,
): Promise<AppDefinition<WebsiteState>> {
	const config: WebsiteConfig = {
		seo: block?.seo,
	};

	configureWebsite(config);

	return {
		name: "website",
		manifest,
		state: { config },
	};
}

/** Placeholder preview for CMS editor. */
export const preview = undefined;
