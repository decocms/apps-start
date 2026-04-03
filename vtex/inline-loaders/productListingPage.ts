import {
	filtersFromPageTypes,
	getVtexConfig,
	intelligentSearch,
	type PageType,
	pageTypesFromPath,
	toFacetPath,
} from "../client";
import { pickSku, toProduct } from "../utils/transform";
import type { Product as ProductVTEX } from "../utils/types";

export interface SelectedFacet {
	key: string;
	value: string;
}

export interface PLPProps {
	query?: string;
	count?: number;
	sort?: string;
	fuzzy?: string;
	page?: number;
	selectedFacets?: SelectedFacet[];
	hideUnavailableItems?: boolean;
	/** Injected by CMS resolve — the matched page path (e.g. "/pisos/piso-vinilico-clicado") */
	__pagePath?: string;
	/** Injected by CMS resolve — the full request URL (e.g. "https://site.com/s?q=telha&sort=price:asc") */
	__pageUrl?: string;
}

// -- Types matching VTEX IS API responses --

interface ISPaginationItem {
	index: number;
	proxyUrl?: string;
}

interface ISPagination {
	count: number;
	current: ISPaginationItem;
	before: ISPaginationItem[];
	after: ISPaginationItem[];
	perPage: number;
	next: ISPaginationItem;
	previous: ISPaginationItem;
	first: ISPaginationItem;
	last: ISPaginationItem;
}

interface ISProductSearchResult {
	products: any[];
	recordsFiltered: number;
	pagination: ISPagination;
	correction?: { misspelled?: boolean };
	operator?: string;
	redirect?: string;
}

interface ISFacetValueBoolean {
	quantity: number;
	name: string;
	value: string;
	selected: boolean;
}

interface ISFacetValueRange {
	quantity: number;
	name: string;
	selected: boolean;
	range: { from: number; to: number };
}

interface ISFacet {
	key: string;
	name: string;
	type: "TEXT" | "PRICERANGE";
	hidden: boolean;
	quantity: number;
	values: Array<ISFacetValueBoolean | ISFacetValueRange>;
}

interface ISFacetsResult {
	facets: ISFacet[];
}

// Valid page types for filtering (matching original getValidTypesFromPageTypes)
const VALID_PAGE_TYPES = new Set([
	"Brand",
	"Category",
	"Department",
	"SubCategory",
	"Collection",
	"Cluster",
	"Search",
	"FullText",
	"Product",
]);

function getValidPageTypes(pageTypes: PageType[]): PageType[] {
	return pageTypes.filter((pt) => VALID_PAGE_TYPES.has(pt.pageType));
}

// -- Filter transformation (mirrors original toFilter + facetToToggle) --

function formatRange(from: number, to: number): string {
	return `${from}:${to}`;
}

function isRangeValue(val: any): val is ISFacetValueRange {
	return Boolean(val.range);
}

function filtersToSearchParams(
	facets: SelectedFacet[],
	paramsToPersist?: URLSearchParams,
): URLSearchParams {
	const searchParams = new URLSearchParams(paramsToPersist);
	for (const { key, value } of facets) {
		searchParams.append(`filter.${key}`, value);
	}
	return searchParams;
}

function facetToToggle(
	selectedFacets: SelectedFacet[],
	key: string,
	paramsToPersist?: URLSearchParams,
) {
	return (item: ISFacetValueBoolean | ISFacetValueRange) => {
		const { quantity, selected } = item;
		const isRange = isRangeValue(item);
		const value = isRange
			? formatRange(item.range.from, item.range.to)
			: (item as ISFacetValueBoolean).value;
		const label = isRange ? value : (item as ISFacetValueBoolean).name;
		const facet = { key, value };

		const filters = selected
			? selectedFacets.filter((f) => f.key !== key || f.value !== value)
			: [...selectedFacets, facet];

		return {
			value,
			quantity,
			selected,
			url: `?${filtersToSearchParams(filters, paramsToPersist)}`,
			label,
		};
	};
}

function toFilter(selectedFacets: SelectedFacet[], paramsToPersist?: URLSearchParams) {
	return (facet: ISFacet) => ({
		"@type": "FilterToggle" as const,
		key: facet.key,
		label: facet.name,
		quantity: facet.quantity,
		values: facet.values.map(facetToToggle(selectedFacets, facet.key, paramsToPersist)),
	});
}

// -- Breadcrumb from page types (mirrors original pageTypesToBreadcrumbList) --

function pageTypesToBreadcrumb(pageTypes: PageType[]) {
	const filtered = pageTypes.filter(
		(pt) =>
			pt.pageType === "Category" || pt.pageType === "Department" || pt.pageType === "SubCategory",
	);
	return filtered.map((page, index) => {
		const position = index + 1;
		const slugParts = filtered.slice(0, position).map((x) => {
			const urlPath = x.url ? new URL(`http://${x.url}`).pathname : "";
			const segments = urlPath.split("/").filter(Boolean);
			return segments[segments.length - 1]?.toLowerCase() ?? "";
		});
		return {
			"@type": "ListItem" as const,
			name: page.name,
			item: `/${slugParts.join("/")}`,
			position,
		};
	});
}

// -- SEO from page types (mirrors original pageTypesToSeo) --

function pageTypesToSeo(pageTypes: PageType[]) {
	const current = pageTypes[pageTypes.length - 1];
	if (!current) return undefined;
	return {
		title: current.title || current.name || "",
		description: current.metaTagDescription || "",
	};
}

// -- Build IS query params (mirrors original withDefaultParams) --

function buildISParams(opts: {
	query: string;
	page: number;
	count: number;
	sort: string;
	fuzzy?: string;
	locale: string;
	hideUnavailableItems: boolean;
}): Record<string, string> {
	const params: Record<string, string> = {
		page: String(opts.page + 1), // IS API is 1-indexed
		count: String(opts.count),
		query: opts.query,
		sort: opts.sort,
		locale: opts.locale,
		hideUnavailableItems: String(opts.hideUnavailableItems),
	};
	if (opts.fuzzy) params.fuzzy = opts.fuzzy;
	return params;
}

const INVALID_PLP_PREFIXES = [
	"/image/",
	"/.well-known/",
	"/assets/",
	"/favicon",
	"/_serverFn/",
	"/_build/",
	"/node_modules/",
];

function isValidPLPPath(path: string): boolean {
	const lower = path.toLowerCase();
	if (INVALID_PLP_PREFIXES.some((p) => lower.startsWith(p))) return false;
	const ext = lower.split("/").pop()?.split(".")?.pop();
	if (
		ext &&
		[
			"png",
			"jpg",
			"jpeg",
			"gif",
			"svg",
			"webp",
			"ico",
			"css",
			"js",
			"woff",
			"woff2",
			"ttf",
		].includes(ext)
	) {
		return false;
	}
	return true;
}

/**
 * Mirrors the original deco-cx/apps PLP loader:
 *
 * 1. Resolve facets from CMS props or Page Type API
 * 2. Call product_search AND facets APIs in parallel (same params)
 * 3. Transform products to schema.org format
 * 4. Transform facets to FilterToggle format
 * 5. Build pagination from IS response
 */
export default async function vtexProductListingPage(props: PLPProps): Promise<any | null> {
	const pageUrl = props.__pageUrl ? new URL(props.__pageUrl, "https://localhost") : null;

	const query = props.query ?? pageUrl?.searchParams.get("q") ?? "";
	const countFromUrl = pageUrl?.searchParams.get("PS");
	const rawCount = Number(countFromUrl ?? props.count ?? 12);
	const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 12;
	const sort = props.sort || pageUrl?.searchParams.get("sort") || "";
	const fuzzy = props.fuzzy ?? pageUrl?.searchParams.get("fuzzy") ?? undefined;
	const pageFromUrl = pageUrl?.searchParams.get("page");
	const rawPage = props.page ?? (pageFromUrl ? Number(pageFromUrl) - 1 : 0);
	const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;

	const { selectedFacets: cmsSelectedFacets, hideUnavailableItems = false, __pagePath } = props;

	try {
		// 1. Resolve selected facets (CMS + URL filter.* params, matching original)
		let facets: SelectedFacet[] =
			cmsSelectedFacets && cmsSelectedFacets.length > 0 ? [...cmsSelectedFacets] : [];

		// Extract filter.* params from URL (e.g. filter.category-1=telhas)
		if (pageUrl) {
			for (const [name, value] of pageUrl.searchParams.entries()) {
				const dotIndex = name.indexOf(".");
				if (dotIndex > 0 && name.slice(0, dotIndex) === "filter") {
					const key = name.slice(dotIndex + 1);
					if (key && !facets.some((f) => f.key === key && f.value === value)) {
						facets.push({ key, value });
					}
				}
			}
		}

		// Handle VTEX `map` query param (e.g. /1368?map=productClusterIds).
		// The `map` param tells IS how to interpret each path segment as a facet type.
		// Segments and map values are positionally matched (comma-separated).
		if (facets.length === 0 && pageUrl && __pagePath) {
			const mapParam = pageUrl.searchParams.get("map");
			if (mapParam) {
				const segments = __pagePath.split("/").filter(Boolean);
				const mapValues = mapParam.split(",");
				for (let i = 0; i < Math.min(segments.length, mapValues.length); i++) {
					const key = mapValues[i].trim();
					const value = decodeURIComponent(segments[i]);
					if (key && value) {
						facets.push({ key, value });
					}
				}
			}
		}

		let pageTypes: PageType[] = [];

		if (
			facets.length === 0 &&
			!query &&
			__pagePath &&
			__pagePath !== "/" &&
			__pagePath !== "/*" &&
			isValidPLPPath(__pagePath)
		) {
			const allPageTypes = await pageTypesFromPath(__pagePath);
			pageTypes = getValidPageTypes(allPageTypes);
			facets = filtersFromPageTypes(pageTypes);
		}

		if (!facets.length && !query) {
			return null;
		}

		const facetPath = toFacetPath(facets);
		const config = getVtexConfig();
		const locale = config.locale ?? "pt-BR";

		const params = buildISParams({
			query,
			page,
			count,
			sort,
			fuzzy,
			locale,
			hideUnavailableItems,
		});

		const productEndpoint = facetPath ? `/product_search/${facetPath}` : "/product_search/";

		const facetsEndpoint = facetPath ? `/facets/${facetPath}` : "/facets/";

		// 2. Parallel calls — exactly like the original
		const [productsResult, facetsResult] = await Promise.all([
			intelligentSearch<ISProductSearchResult>(productEndpoint, params),
			intelligentSearch<ISFacetsResult>(facetsEndpoint, params),
		]);

		const { products: vtexProducts, pagination, recordsFiltered } = productsResult;

		// 3. Transform products using shared transform pipeline (same as deco-cx/apps)
		const baseUrl = config.publicUrl
			? `https://${config.publicUrl}`
			: `https://${config.account}.vtexcommercestable.com.br`;

		const schemaProducts = (vtexProducts as ProductVTEX[]).map((p) => {
			const sku = pickSku(p);
			return toProduct(p, sku, 0, { baseUrl, priceCurrency: "BRL" });
		});

		// Persist URL params (q, sort, filter.*) across filter toggles and pagination links
		const paramsToPersist = new URLSearchParams();
		if (pageUrl) {
			for (const [k, v] of pageUrl.searchParams.entries()) {
				if (k !== "page" && k !== "PS" && !k.startsWith("filter.")) {
					paramsToPersist.append(k, v);
				}
			}
		} else {
			if (query) paramsToPersist.set("q", query);
			if (sort) paramsToPersist.set("sort", sort);
		}

		// 4. Transform facets to filters (matching original toFilter)
		const visibleFacets = facetsResult.facets.filter((f) => !f.hidden);
		const filters = visibleFacets.map(toFilter(facets, paramsToPersist));

		// 5. Build pagination (matching original logic)
		const currentPageoffset = 1;
		const hasNextPage = Boolean(pagination.next?.proxyUrl);
		const hasPreviousPage = page > 0;

		const nextPageParams = new URLSearchParams(paramsToPersist);
		const prevPageParams = new URLSearchParams(paramsToPersist);

		// Re-add active filter.* params so pagination links preserve selected filters
		for (const { key, value } of facets) {
			nextPageParams.append(`filter.${key}`, value);
			prevPageParams.append(`filter.${key}`, value);
		}

		if (hasNextPage) {
			nextPageParams.set("page", String(page + currentPageoffset + 1));
		}
		if (hasPreviousPage) {
			prevPageParams.set("page", String(page + currentPageoffset - 1));
		}

		const breadcrumbItems = pageTypesToBreadcrumb(pageTypes);

		return {
			"@type": "ProductListingPage",
			breadcrumb: {
				"@type": "BreadcrumbList",
				itemListElement: breadcrumbItems,
				numberOfItems: breadcrumbItems.length,
			},
			filters,
			products: schemaProducts,
			pageInfo: {
				nextPage: hasNextPage ? `?${nextPageParams}` : undefined,
				previousPage: hasPreviousPage ? `?${prevPageParams}` : undefined,
				currentPage: page + currentPageoffset,
				records: recordsFiltered,
				recordPerPage: pagination.perPage,
			},
			sortOptions: [
				{ value: "", label: "relevance:desc" },
				{ value: "price:desc", label: "price:desc" },
				{ value: "price:asc", label: "price:asc" },
				{ value: "orders:desc", label: "orders:desc" },
				{ value: "name:desc", label: "name:desc" },
				{ value: "name:asc", label: "name:asc" },
				{ value: "release:desc", label: "release:desc" },
				{ value: "discount:desc", label: "discount:desc" },
			],
			seo: pageTypesToSeo(pageTypes),
		};
	} catch (error) {
		console.error("[VTEX] PLP error:", error);
		return null;
	}
}
