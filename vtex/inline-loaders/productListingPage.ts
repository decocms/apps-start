import {
  intelligentSearch,
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
  selectedFacets?: SelectedFacet[];
  hideUnavailableItems?: boolean;
  /** Injected by CMS resolve — the matched page path (e.g. "/pisos/piso-vinilico-clicado") */
  __pagePath?: string;
}

/**
 * Mirrors the original deco-cx/apps PLP loader logic:
 *
 * 1. If CMS provides selectedFacets, use those directly.
 * 2. Otherwise, call VTEX Page Type API for each URL segment to discover
 *    whether it's a Department, Category, Brand, Collection, etc.
 * 3. Map page types to IS facet keys (category-1, category-2, brand, productClusterIds).
 * 4. Build the IS facet path and call product_search.
 */
export default async function vtexProductListingPage(
  props: PLPProps,
): Promise<any | null> {
  const { query, count = 12, sort, fuzzy, selectedFacets, __pagePath } = props;

  try {
    let facets: SelectedFacet[] = selectedFacets && selectedFacets.length > 0
      ? selectedFacets
      : [];

    let pageTypes: PageType[] = [];

    if (facets.length === 0 && __pagePath && __pagePath !== "/" && __pagePath !== "/*") {
      pageTypes = await pageTypesFromPath(__pagePath);
      facets = filtersFromPageTypes(pageTypes);
    }

    const facetPath = toFacetPath(facets);
    const endpoint = facetPath
      ? `/product_search/${facetPath}`
      : "/product_search/";

    const params: Record<string, string> = { count: String(count) };
    if (query) params.query = query;
    if (sort) params.sort = sort;
    if (fuzzy) params.fuzzy = fuzzy;

    console.log(`[VTEX] PLP: endpoint="${endpoint}", query="${query ?? ""}", count=${count}, facets=${JSON.stringify(facets)}`);

    const data = await intelligentSearch<{ products: any[]; recordsFiltered?: number; pagination?: any }>(
      endpoint, params,
    );

    const products = data.products || [];
    console.log(`[VTEX] PLP: ${products.length} products found (total: ${data.recordsFiltered ?? "?"})`);

    const schemaProducts = products.map((p: any) => {
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
        additionalProperty: p.clusterHighlights
          ? Object.entries(p.clusterHighlights).map(([id, name]) => ({
              "@type": "PropertyValue",
              name: "cluster",
              value: id,
              description: "highlight",
              propertyID: name,
            }))
          : [],
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

    const breadcrumbItems = pageTypes.map((pt, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: pt.name,
      item: `/${pt.url?.split("/").slice(-1)[0]?.toLowerCase() ?? ""}`,
    }));

    return {
      "@type": "ProductListingPage",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems,
        numberOfItems: breadcrumbItems.length,
      },
      filters: [],
      products: schemaProducts,
      pageInfo: {
        currentPage: 1,
        nextPage: undefined,
        previousPage: undefined,
        records: data.recordsFiltered,
      },
      sortOptions: [
        { label: "Relevância", value: "" },
        { label: "Menor preço", value: "price:asc" },
        { label: "Maior preço", value: "price:desc" },
        { label: "Mais vendidos", value: "orders:desc" },
        { label: "Mais recentes", value: "release:desc" },
        { label: "Melhor desconto", value: "discount:desc" },
      ],
      seo: pageTypes.length > 0
        ? {
            title: pageTypes[pageTypes.length - 1]?.title,
            description: pageTypes[pageTypes.length - 1]?.metaTagDescription,
          }
        : undefined,
    };
  } catch (error) {
    console.error("[VTEX] PLP error:", error);
    return null;
  }
}
