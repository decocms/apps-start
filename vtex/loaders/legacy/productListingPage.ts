/**
 * Compatibility re-export — mirrors deco-cx/apps `vtex/loaders/legacy/productListingPage.ts`.
 *
 * The actual implementation lives in `vtex/loaders/legacy.ts` (collapsed into a single
 * file in apps-start). This wrapper preserves the canonical import path that sites
 * migrated from Fresh expect, plus exposes the `getFirstItemAvailable` helper that
 * IS loaders compose.
 */

export {
	getFirstItemAvailable,
	legacyProductListingPage as default,
} from "../legacy";
