/**
 * Compatibility wrapper — mirrors deco-cx/apps
 * `vtex/loaders/intelligentSearch/productListingPage.ts`.
 *
 * The full PLP implementation lives in `vtex/inline-loaders/productListingPage.ts`
 * (default export). This module re-exports the loader at the canonical
 * Fresh-era path AND exposes the `LabelledFuzzy`/`mapLabelledFuzzyToFuzzy`
 * helper used by sites to translate friendly fuzzy labels into the values
 * the Intelligent Search API accepts.
 *
 * @see https://developers.vtex.com/docs/api-reference/intelligent-search-api
 */

import vtexProductListingPage from "../../inline-loaders/productListingPage";

/** Friendly fuzzy labels exposed in CMS UIs; mapped to IS API values. */
export type LabelledFuzzy = "automatic" | "disabled" | "enabled";

/**
 * Translate a friendly fuzzy label to the value the VTEX Intelligent Search
 * API expects. Returns `undefined` when no label is provided so callers can
 * omit the param entirely.
 */
export const mapLabelledFuzzyToFuzzy = (
	labelledFuzzy?: LabelledFuzzy,
): "0" | "1" | "auto" | undefined => {
	switch (labelledFuzzy) {
		case "automatic":
			return "auto";
		case "disabled":
			return "0";
		case "enabled":
			return "1";
		default:
			return undefined;
	}
};

export default vtexProductListingPage;
