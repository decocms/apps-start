import { getShopifyClient } from "../client";
import { GetProduct } from "../utils/storefront/queries";
import { toProduct } from "../utils/transform";
import type { ProductDetailsPage } from "../../commerce/types/commerce";

export interface Props {
  slug?: string;
}

export default async function productDetailsPageLoader(
  props: Props
): Promise<ProductDetailsPage | null> {
  const { slug } = props;
  if (!slug) return null;

  const client = getShopifyClient();
  const handle = slug.replace(/-\d+$/, "");

  try {
    const data = await client.query<any>(GetProduct, { handle });
    const shopifyProduct = data?.product;

    if (!shopifyProduct) return null;

    const sku = shopifyProduct.selectedOrFirstAvailableVariant ??
      shopifyProduct.variants?.nodes?.[0];

    const product = toProduct(
      shopifyProduct,
      sku,
      new URL(`https://storefront.deco.site/products/${slug}`)
    );

    return {
      "@type": "ProductDetailsPage",
      breadcrumbList: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          { "@type": "ListItem", position: 2, name: product.name || "", item: product.url || "" },
        ],
        numberOfItems: 2,
      },
      product,
      seo: {
        title: shopifyProduct.seo?.title || shopifyProduct.title,
        description: shopifyProduct.seo?.description || shopifyProduct.description,
        canonical: product.url || "",
      },
    };
  } catch (error) {
    console.error("[Shopify] ProductDetailsPage error:", error);
    return null;
  }
}
