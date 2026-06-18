/**
 * Website app Props for admin JSON Schema generation.
 * Tanstack sites extend these in src/apps/site.ts (same as deco-cx/apps/website/mod.ts).
 */

import type { Props as SecretProps } from "./loaders/secret";

export type Script = { src: string };

export interface CacheDirectiveBase {
	name: string;
	value: number;
}

export interface StaleWhileRevalidate extends CacheDirectiveBase {
	name: "stale-while-revalidate";
}

export interface MaxAge extends CacheDirectiveBase {
	name: "max-age";
}

export type CacheDirective = StaleWhileRevalidate | MaxAge;

export interface Caching {
	enabled?: boolean;
	directives?: CacheDirective[];
}

export interface AbTesting {
	enabled?: boolean;
	/** @description The name of the A/B test — appears in cookies */
	name?: string;
	matcher?: unknown;
	/** @description URL to run the A/B test against */
	urlToRunAgainst?: string;
	replaces?: unknown[];
	includeScriptsToHead?: { includes?: Script[] };
	includeScriptsToBody?: { includes?: Script[] };
}

/** @titleBy framework */
export interface FreshFlavor {
	/** @default fresh */
	framework: "fresh";
}

/** @titleBy framework */
export interface HtmxFlavor {
	/** @default htmx */
	framework: "htmx";
}

export interface WebsiteProps {
	/** @title Routes Map */
	routes?: unknown[];

	/** @title Global Sections */
	global?: unknown[];

	/** @title Error Page */
	errorPage?: unknown;

	/** @title Caching configuration of pages */
	caching?: Caching;

	/**
	 * @title Global Async Rendering (Deprecated)
	 * @deprecated true
	 * @default false
	 */
	firstByteThresholdMS?: boolean;

	/** @title Avoid redirecting to editor */
	avoidRedirectingToEditor?: boolean;

	/** @title AB Testing */
	abTesting?: AbTesting;

	/** @title Flavor */
	flavor?: FreshFlavor | HtmxFlavor;

	/** @title Seo */
	seo?: Record<string, unknown>;

	/** @title Theme */
	theme?: unknown;

	/** @hide true */
	sendToClickHouse?: boolean;

	/** @title Default Image Quality */
	defaultImageQuality?: string;

	/** @title Disable image/asset proxy for this site */
	disableProxy?: boolean;

	/** @title Whilelist URL Patterns */
	whilelistURLs?: string[];
}

/** Secret block shape in decofile (website/loaders/secret.ts). */
export type Secret = SecretProps;
