import {
  intelligentSearch,
  getVtexConfig,
  pageTypesFromPath,
  filtersFromPageTypes,
  toFacetPath,
  type PageType,
} from "../client";

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
  "Brand", "Category", "Department", "SubCategory",
  "Collection", "Cluster", "Search", "FullText", "Product",
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
    const value = isRange ? formatRange(item.range.from, item.range.to) : (item as ISFacetValueBoolean).value;
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
    (pt) => pt.pageType === "Category" || pt.pageType === "Department" || pt.pageType === "SubCategory",
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

/**
 * Mirrors the original deco-cx/apps PLP loader:
 *
 * 1. Resolve facets from CMS props or Page Type API
 * 2. Call product_search AND facets APIs in parallel (same params)
 * 3. Transform products to schema.org format
 * 4. Transform facets to FilterToggle format
 * 5. Build pagination from IS response
 */
export default async function vtexProductListingPage(
  props: PLPProps,
): Promise<any | null> {
  const {
    query = "",
    count = 12,
    sort = "",
    fuzzy,
    page = 0,
    selectedFacets: cmsSelectedFacets,
    hideUnavailableItems = false,
    __pagePath,
  } = props;

  try {
    // 1. Resolve selected facets
    let facets: SelectedFacet[] = cmsSelectedFacets && cmsSelectedFacets.length > 0
      ? cmsSelectedFacets
      : [];

    let pageTypes: PageType[] = [];

    if (facets.length === 0 && __pagePath && __pagePath !== "/" && __pagePath !== "/*") {
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

    const productEndpoint = facetPath
      ? `/product_search/${facetPath}`
      : "/product_search/";

    const facetsEndpoint = facetPath
      ? `/facets/${facetPath}`
      : "/facets/";

    console.log(`[VTEX] PLP: product_search="${productEndpoint}", facets="${facetsEndpoint}", params=${JSON.stringify(params)}`);

    // 2. Parallel calls — exactly like the original
    const [productsResult, facetsResult] = await Promise.all([
      intelligentSearch<ISProductSearchResult>(productEndpoint, params),
      intelligentSearch<ISFacetsResult>(facetsEndpoint, params),
    ]);

    const { products: vtexProducts, pagination, recordsFiltered } = productsResult;

    console.log(`[VTEX] PLP: ${vtexProducts.length} products (total: ${recordsFiltered}), ${facetsResult.facets.length} facet groups`);

    // 3. Transform products to schema.org
    const schemaProducts = vtexProducts.map((p: any) => {
      const item = p.items?.[0];
      const seller = item?.sellers?.[0];
      const offer = seller?.commertialOffer;

      return {
        "@type": "Product",
        productID: item?.itemId || p.productId,
        name: p.productName,
        description: p.description,
        url: `/${p.linkText}/p`,
        category: p.categories?.[0] ?? undefined,
        brand: p.brand
          ? { "@type": "Brand", "@id": String(p.brandId ?? ""), name: p.brand }
          : undefined,
        inProductGroupWithID: p.productId,
        additionalProperty: (p.clusterHighlights
          ? Object.entries(p.clusterHighlights).map(([id, name]) => ({
              "@type": "PropertyValue",
              name: "cluster",
              value: id,
              description: "highlight",
              propertyID: name,
            }))
          : []),
        image: item?.images?.map((img: any) => ({
          "@type": "ImageObject",
          url: img.imageUrl?.replace("http://", "https://"),
          alternateName: img.imageText || p.productName,
        })) ?? [],
        offers: {
          "@type": "AggregateOffer",
          lowPrice: offer?.Price ?? p.priceRange?.sellingPrice?.lowPrice ?? 0,
          highPrice: offer?.ListPrice ?? p.priceRange?.listPrice?.highPrice ?? 0,
          priceCurrency: "BRL",
          offerCount: p.items?.length ?? 1,
          offers: [{
            "@type": "Offer",
            price: offer?.Price ?? 0,
            listPrice: offer?.ListPrice,
            availability: (offer?.AvailableQuantity ?? 0) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            seller: seller?.sellerName,
            sellerID: seller?.sellerId,
            priceSpecification: offer?.Installments?.map((inst: any) => ({
              "@type": "UnitPriceSpecification",
              billingDuration: inst.NumberOfInstallments,
              billingIncrement: inst.Value,
              price: inst.TotalValuePlusInterestRate,
              name: inst.PaymentSystemName,
            })) ?? [],
          }],
        },
        isVariantOf: {
          "@type": "ProductGroup",
          productGroupID: p.productId,
          name: p.productName,
          url: `/${p.linkText}/p`,
          image: p.items?.flatMap((it: any) =>
            it.images?.map((img: any) => ({
              "@type": "ImageObject",
              url: img.imageUrl?.replace("http://", "https://"),
              alternateName: img.imageText || p.productName,
            })) ?? [],
          ) ?? [],
          hasVariant: p.items?.map((it: any) => ({
            "@type": "Product",
            productID: it.itemId,
            name: it.nameComplete || it.name,
            url: `/${p.linkText}/p?skuId=${it.itemId}`,
            image: it.images?.map((img: any) => ({
              "@type": "ImageObject",
              url: img.imageUrl?.replace("http://", "https://"),
            })) ?? [],
            additionalProperty: it.variations?.flatMap((v: any) =>
              v.values.map((val: string) => ({
                "@type": "PropertyValue",
                name: v.name,
                value: val,
              })),
            ) ?? [],
          })) ?? [],
        },
      };
    });

    // 4. Transform facets to filters (matching original toFilter)
    const visibleFacets = facetsResult.facets.filter((f) => !f.hidden);
    const filters = visibleFacets.map(toFilter(facets));

    // 5. Build pagination (matching original logic)
    const currentPageoffset = 1;
    const hasNextPage = Boolean(pagination.next?.proxyUrl);
    const hasPreviousPage = page > 0;

    const nextPageParams = new URLSearchParams();
    const prevPageParams = new URLSearchParams();
    if (query) {
      nextPageParams.set("q", query);
      prevPageParams.set("q", query);
    }
    if (sort) {
      nextPageParams.set("sort", sort);
      prevPageParams.set("sort", sort);
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
