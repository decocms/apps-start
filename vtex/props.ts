/**
 * VTEX app CMS Props — JSON Schema source for admin and site app bridges.
 * Runtime configure() lives in mod.ts; Props mirror deco-cx/apps/vtex/mod.ts.
 */

import type { Secret } from "../website/cms-props";

/** @title VTEX */
export interface Props {
	/**
	 * @description VTEX Account name
	 */
	account: string;

	/**
	 * @title Public store URL
	 * @description Domain registered on License Manager (e.g. secure.mystore.com.br)
	 */
	publicUrl: string;

	/** @title App Key */
	appKey?: Secret;

	/**
	 * @title App Token
	 * @format password
	 */
	appToken?: Secret;

	/**
	 * @title Default Sales Channel
	 * @deprecated
	 */
	salesChannel?: string;

	/**
	 * @title Set Refresh Token
	 * @default false
	 */
	setRefreshToken?: boolean;

	defaultSegment?: Record<string, unknown>;

	usePortalSitemap?: boolean;

	/**
	 * @hide true
	 * @default vtex
	 */
	platform?: "vtex";

	advancedConfigs?: {
		doNotFetchVariantsForRelatedProducts?: boolean;
		removeUTMFromCacheKey?: boolean;
	};

	/** @title Cached Search Terms */
	cachedSearchTerms?: {
		terms?: unknown;
		extraTerms?: string[];
	};
}
