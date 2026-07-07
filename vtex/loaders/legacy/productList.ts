/**
 * Legacy product list loader for shelf/card display.
 *
 * VTEX's other product-list option (alongside Intelligent Search): queries the
 * legacy Catalog Search API (`/api/catalog_system/pub/products/search`) instead
 * of IS. Same lean `toProductShelf()` payload as `intelligentSearch/productList.ts`
 * so both are interchangeable in the same ProductShelf sections.
 *
 * Ported from deco-cx/apps `vtex/loaders/legacy/productList.ts`. The deprecated
 * `similars` enrichment is intentionally dropped — it required loader `ctx` (not
 * available here) and deco-cx already steers callers to product extensions.
 */

import type { Product } from "../../../commerce/types/commerce";
import { getVtexConfig, vtexCachedFetch } from "../../client";
import { pickSku, sortProducts, toProductShelf } from "../../utils/transform";
import type { LegacyProduct, LegacySort } from "../../utils/types";

/** @title Collection ID */
export interface CollectionProps {
	/** VTEX product cluster id (e.g. `"150"`). */
	collection: string;
	sort?: LegacySort;
	/** Total number of items to display. */
	count?: number;
}

/** @title Keyword Search */
export interface TermProps {
	/** Full-text term to search for. */
	term: string;
	sort?: LegacySort;
	count?: number;
}

/** @title Advanced Facets */
export interface FQProps {
	/** Raw legacy `fq` filters (e.g. `["C:1000001", "P:[0 TO 100]"]`). */
	fq: string[];
	sort?: LegacySort;
	count?: number;
}

/** @title Product SKUs */
export interface SkuIDProps {
	/** SKU ids to retrieve. */
	ids: string[];
}

/** @title Product IDs */
export interface ProductIDProps {
	/** Product ids to retrieve. */
	productIds: string[];
}

export interface LegacyProductListProps {
	props?: CollectionProps | TermProps | ProductIDProps | SkuIDProps | FQProps;
}

function isCollectionProps(p: any): p is CollectionProps {
	return typeof p?.collection === "string";
}
function isSkuIDProps(p: any): p is SkuIDProps {
	return Array.isArray(p?.ids) && p.ids.length > 0;
}
function isProductIDProps(p: any): p is ProductIDProps {
	return Array.isArray(p?.productIds) && p.productIds.length > 0;
}
function isFQProps(p: any): p is FQProps {
	return Array.isArray(p?.fq) && p.fq.length > 0;
}
function isTermProps(p: any): p is TermProps {
	return typeof p?.term === "string";
}

function buildSearchParams(props: NonNullable<LegacyProductListProps["props"]>): {
	search: URLSearchParams;
	ids?: string[];
	idProp?: "sku" | "inProductGroupWithID";
} {
	const search = new URLSearchParams();

	if (isSkuIDProps(props)) {
		const ids = props.ids;
		ids.forEach((id) => search.append("fq", `skuId:${id}`));
		search.set("_from", "0");
		search.set("_to", String(Math.max(ids.length - 1, 0)));
		return { search, ids, idProp: "sku" };
	}

	if (isProductIDProps(props)) {
		const productIds = props.productIds;
		productIds.forEach((id) => search.append("fq", `productId:${id}`));
		search.set("_from", "0");
		search.set("_to", String(Math.max(productIds.length - 1, 0)));
		return { search, ids: productIds, idProp: "inProductGroupWithID" };
	}

	const count = props.count ?? 12;
	search.set("_from", "0");
	search.set("_to", String(Math.max(count - 1, 0)));
	if (props.sort) search.set("O", props.sort);

	if (isCollectionProps(props)) {
		search.append("fq", `productClusterIds:${props.collection}`);
	} else if (isFQProps(props)) {
		props.fq.forEach((fq) => search.append("fq", fq));
	} else if (isTermProps(props) && props.term) {
		search.set("ft", props.term);
	}

	return { search };
}

/** @title Legacy */
export default async function vtexProductListLegacy(
	props: LegacyProductListProps,
): Promise<Product[] | null> {
	try {
		const inner = props.props ?? (props as NonNullable<LegacyProductListProps["props"]>);
		const { search, ids, idProp } = buildSearchParams(inner);

		const vtexProducts = await vtexCachedFetch<LegacyProduct[]>(
			`/api/catalog_system/pub/products/search?${search.toString()}`,
		);

		if (vtexProducts && !Array.isArray(vtexProducts)) {
			throw new Error(`Unexpected VTEX legacy search response: ${JSON.stringify(vtexProducts)}`);
		}

		const config = getVtexConfig();
		const baseUrl = config.publicUrl
			? `https://${config.publicUrl}`
			: `https://${config.account}.vtexcommercestable.${config.domain ?? "com.br"}`;

		let products = (vtexProducts ?? []).map((p) => {
			const fetchedSkus = ids && idProp === "sku" ? new Set(ids) : null;
			const preferredSku = fetchedSkus
				? (p.items.find((item) => fetchedSkus.has(item.itemId)) ?? pickSku(p))
				: pickSku(p);
			return toProductShelf(p, preferredSku, 0, { baseUrl, priceCurrency: "BRL" });
		});

		if (ids && idProp) {
			products = sortProducts(products, ids, idProp);
		}

		return products;
	} catch (error) {
		console.error("[VTEX] ProductListLegacy error:", error);
		return null;
	}
}
