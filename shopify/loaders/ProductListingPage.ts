import { getShopifyClient } from "../client";
import { SearchProducts, ProductsByCollection } from "../utils/storefront/queries";
import { toProduct } from "../utils/transform";
import type { ProductListingPage } from "../../commerce/types/commerce";

export interface Props {
  count?: number;
  query?: string;
  collection?: string;
}

export default async function productListingPageLoader(
  props: Props
): Promise<ProductListingPage | null> {
  const client = getShopifyClient();
  const { count = 12, query, collection } = props;

  try {
    let products: any[] = [];

    if (query) {
      const data = await client.query<any>(SearchProducts, {
        query,
        first: count,
        productFilters: [],
        sortKey: "RELEVANCE",
        reverse: false,
      });
      products = data?.search?.edges?.map((e: any) => e.node) ?? [];
    } else if (collection) {
      const data = await client.query<any>(ProductsByCollection, {
        handle: collection,
        first: count,
        filters: [],
        sortKey: "COLLECTION_DEFAULT",
        reverse: false,
      });
      products = data?.collection?.products?.edges?.map((e: any) => e.node) ?? [];
    }

    const url = new URL("/", "https://localhost");

    return {
      "@type": "ProductListingPage",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [],
        numberOfItems: 0,
      },
      filters: [],
      products: products.map((p: any) =>
        toProduct(p, p.variants?.nodes?.[0], url)
      ),
      pageInfo: {
        currentPage: 1,
        nextPage: undefined,
        previousPage: undefined,
      },
      sortOptions: [],
    };
  } catch (error) {
    console.error("[Shopify] ProductListingPage error:", error);
    return null;
  }
}
