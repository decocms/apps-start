/**
 * Compatibility wrapper — mirrors deco-cx/apps
 * `vtex/loaders/intelligentSearch/productList.ts`.
 *
 * The runtime implementation lives in `vtex/inline-loaders/productList.ts`
 * (default export). This module re-exports the loader at the canonical
 * Fresh-era path and surfaces the four prop shapes (Collection / Query /
 * ProductID / Facets) so sites can compose their own search loaders against
 * a stable, schema-driven interface.
 *
 * Shapes mirror the original deco-cx/apps types so site code that imported
 * them via `import { CollectionProps, ... } from ".../productList"` keeps
 * type-checking after the migration to TanStack Start.
 */

import vtexProductList from "../../inline-loaders/productList";
import type { Sort } from "../../utils/types";

export interface CommonProps {
	/** Hide unavailable items from the response. */
	hideUnavailableItems?: boolean;
	/** Include similar products via the `withIsSimilarTo` enrichment pipeline. */
	similars?: boolean;
	/** VTEX simulation behavior when computing prices/availability. */
	simulationBehavior?: "default" | "skip";
}

/** @title Collection ID */
export interface CollectionProps extends CommonProps {
	/** VTEX product cluster id (e.g. "150"). */
	collection: string;
	sort?: Sort;
	count: number;
}

/** @title Advanced Facets */
export interface FacetsProps extends CommonProps {
	query?: string;
	/** Facets path (e.g. `category-1/moda-feminina/category-2/calcados`). */
	facets: string;
	sort?: Sort;
	count: number;
}

/** @title Keyword Search */
export interface QueryProps extends CommonProps {
	query: string;
	sort?: Sort;
	count: number;
	fuzzy?: import("./productListingPage").LabelledFuzzy;
}

/** @title Product IDs */
export interface ProductIDProps extends CommonProps {
	/** SKU ids to retrieve. */
	ids: string[];
}

export interface Props {
	props: CollectionProps | QueryProps | ProductIDProps | FacetsProps;
}

export default vtexProductList;
