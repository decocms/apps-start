/**
 * Default-path provider for PDPs — mirrors deco-cx/apps
 * `vtex/loaders/paths/PDPDefaultPath.ts`.
 *
 * Returns a list of canonical PDP paths (e.g. `/produto-x/p`) seeded by the
 * top-selling products. Used by sitemap generators and Deco's static
 * default-path slot to enumerate routes for crawl/prerender.
 */

import { legacyProductList } from "../legacy";

export interface DefaultPathProps {
	possiblePaths: string[];
}

export interface Props {
	/** How many top-selling products to seed paths from (default `5`). */
	count?: number;
}

/**
 * @title PDP Default Path
 * @description Get paths for product details page seeded from top-selling products.
 */
const loader = async (props: unknown, req: Request): Promise<DefaultPathProps | null> => {
	const { count = 5 } = (props ?? {}) as Props;

	const baseUrl = new URL(req.url).origin;

	const products = await legacyProductList({
		query: {
			term: "",
			count,
			sort: "OrderByTopSaleDESC",
		},
		baseUrl,
	});

	const possiblePaths = (products ?? [])
		.map((p) => {
			if (!p.url) return undefined;
			try {
				const url = new URL(p.url);
				return url.href.replace(url.origin, "").substring(1).split("/p")[0];
			} catch {
				return undefined;
			}
		})
		.filter((p): p is string => Boolean(p));

	return { possiblePaths };
};

export const cache = "stale-while-revalidate" as const;

export const cacheKey = (props: Props) => `pdp-default-path-${props?.count ?? 5}`;

export default loader;
