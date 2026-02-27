import { intelligentSearch } from "../client";

export interface PLPProps {
  query?: string;
  count?: number;
  collection?: string;
  category?: string;
  department?: string;
}

export default async function vtexProductListingPage(
  props: PLPProps
): Promise<any | null> {
  const { query, count = 12, collection, category } = props;

  try {
    let endpoint = "/product_search/";
    const params: Record<string, string> = { count: String(count) };

    if (query) {
      params.query = query;
      console.log(`[VTEX] PLP search: query="${query}", count=${count}`);
    } else if (collection) {
      params.query = "";
      params["fq"] = `productClusterIds:${collection}`;
      console.log(`[VTEX] PLP collection: ${collection}`);
    } else {
      params.query = "";
      console.log(`[VTEX] PLP: all products, count=${count}`);
    }

    const data = await intelligentSearch<{ products: any[]; recordsFiltered?: number }>(
      endpoint, params
    );

    const products = data.products || [];
    console.log(`[VTEX] PLP: ${products.length} products found`);

    // Transform to schema.org
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
            priceSpecification: [],
          }],
        },
        isVariantOf: {
          "@type": "ProductGroup",
          productGroupID: p.productId,
          name: p.productName,
          url: `/${p.linkText}/p`,
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
              }))
            ) ?? [],
          })) ?? [],
        },
      };
    });

    return {
      "@type": "ProductListingPage",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [],
        numberOfItems: 0,
      },
      filters: [],
      products: schemaProducts,
      pageInfo: {
        currentPage: 1,
        nextPage: undefined,
        previousPage: undefined,
      },
      sortOptions: [
        { label: "Relevância", value: "" },
        { label: "Menor preço", value: "price:asc" },
        { label: "Maior preço", value: "price:desc" },
        { label: "Mais vendidos", value: "orders:desc" },
        { label: "Mais recentes", value: "release:desc" },
        { label: "Melhor desconto", value: "discount:desc" },
      ],
    };
  } catch (error) {
    console.error("[VTEX] PLP error:", error);
    return null;
  }
}
