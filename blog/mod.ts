/**
 * Blog app module — standard autoconfig contract.
 *
 * Exports `configure` following the AppModContract pattern.
 * Provides blog post, category, and author loaders for the site.
 */

import type { AppDefinition, ResolveSecretFn } from "../commerce/app-types";
import manifest from "./manifest.gen";

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

export type BlogState = {};

// -------------------------------------------------------------------------
// Configure
// -------------------------------------------------------------------------

/**
 * Configure the Blog app from CMS block data.
 * Always returns an AppDefinition (no required fields).
 */
export async function configure(
	_block: any,
	_resolveSecret: ResolveSecretFn,
): Promise<AppDefinition<BlogState>> {
	return {
		name: "blog",
		manifest,
		state: {},
	};
}

/** Placeholder preview for CMS editor. */
export const preview = undefined;
