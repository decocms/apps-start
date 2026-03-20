import type { Product } from "../../commerce/types/commerce";
import { getShopifyClient } from "../client";
import { ProductsByCollection, SearchProducts } from "../utils/storefront/queries";
import { type ProductShopify, toProduct } from "../utils/transform";
import type { Metafield } from "../utils/types";
import {
	type CollectionSortKeys,
	type SearchSortKeys,
	searchSortShopify,
	sortShopify,
} from "../utils/utils";

export interface QueryProps {
	query: string;
	count: number;
	sort?: SearchSortKeys;
}

export interface CollectionProps {
	collection: string;
	count: number;
	sort?: CollectionSortKeys;
}

export interface FilterProps {
	tags?: string[];
	productTypes?: string[];
	productVendors?: string[];
	priceMin?: number;
	priceMax?: number;
	variantOptions?: { name: string; value: string }[];
}

export type Props = {
	props: QueryProps | CollectionProps;
	filters?: FilterProps;
	metafields?: Metafield[];
};

const isQueryList = (p: any): p is QueryProps =>
	typeof p.query === "string" && typeof p.count === "number";

export default async function productListLoader(
	expandedProps: Props,
	url?: URL,
): Promise<Product[] | null> {
	const client = getShopifyClient();

	const props = expandedProps.props ?? (expandedProps as unknown as Props["props"]);

	const count = props.count ?? 12;
	const metafields = expandedProps.metafields || [];
	const sort = props.sort ?? "";

	const filters: any[] = [];
	expandedProps.filters?.tags?.forEach((tag) => filters.push({ tag }));
	expandedProps.filters?.productTypes?.forEach((productType) => filters.push({ productType }));
	expandedProps.filters?.productVendors?.forEach((productVendor) =>
		filters.push({ productVendor }),
	);
	if (expandedProps.filters?.priceMin)
		filters.push({ price: { min: expandedProps.filters.priceMin } });
	if (expandedProps.filters?.priceMax)
		filters.push({ price: { max: expandedProps.filters.priceMax } });
	expandedProps.filters?.variantOptions?.forEach((variantOption) =>
		filters.push({ variantOption }),
	);

	let shopifyProducts: { nodes: ProductShopify[] } | undefined;

	if (isQueryList(props)) {
		const data = await client.query<{ search: { nodes: ProductShopify[] } }>(SearchProducts, {
			first: count,
			query: props.query,
			productFilters: filters,
			identifiers: metafields,
			...searchSortShopify[sort],
		});
		shopifyProducts = data.search;
	} else {
		const data = await client.query<{
			collection?: { products: { nodes: ProductShopify[] } };
		}>(ProductsByCollection, {
			first: count,
			handle: (props as CollectionProps).collection,
			filters,
			identifiers: metafields,
			...sortShopify[sort],
		});
		shopifyProducts = data.collection?.products;
	}

	const baseUrl = url ?? new URL("https://localhost");

	const products = shopifyProducts?.nodes.map((p) => toProduct(p, p.variants.nodes[0], baseUrl));

	return products ?? [];
}
