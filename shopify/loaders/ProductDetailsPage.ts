import { getShopifyClient } from "../client";
import type { ProductDetailsPage } from "../../commerce/types/commerce";

const PDP_QUERY = `
query GetProduct($handle: String) {
  product(handle: $handle) {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    tags
    productType
    publishedAt
    seo { title description }
    images(first: 10) {
      nodes { url altText width height }
    }
    variants(first: 30) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        sku
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
        image { url altText width height }
        product { handle }
      }
    }
    collections(first: 5) {
      nodes { handle title }
    }
  }
}
`;

export interface Props {
  slug?: string;
}

function shopifyProductToSchema(node: any, variantNode: any, baseUrl: string) {
  const variant = variantNode || node.variants?.nodes?.[0];
  const price = variant?.price ? Number(variant.price.amount) : undefined;
  const listPrice = variant?.compareAtPrice
    ? Number(variant.compareAtPrice.amount)
    : undefined;
  const currency = variant?.price?.currencyCode || "USD";

  return {
    "@type": "Product" as const,
    productID: variant?.id || node.id,
    name: node.title,
    description: node.description,
    url: `${baseUrl}/products/${node.handle}`,
    brand: node.vendor ? { "@type": "Brand" as const, name: node.vendor } : undefined,
    image: node.images?.nodes?.map((img: any) => ({
      "@type": "ImageObject" as const,
      url: img.url,
      alternateName: img.altText || node.title,
      width: img.width,
      height: img.height,
    })) ?? [],
    offers: {
      "@type": "AggregateOffer" as const,
      lowPrice: price ?? 0,
      highPrice: listPrice ?? price ?? 0,
      priceCurrency: currency,
      offerCount: node.variants?.nodes?.length ?? 1,
      offers: node.variants?.nodes?.map((v: any) => ({
        "@type": "Offer" as const,
        price: Number(v.price?.amount ?? 0),
        listPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
        availability: v.availableForSale
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        seller: node.vendor,
        priceSpecification: [],
      })) ?? [],
    },
    isVariantOf: {
      "@type": "ProductGroup" as const,
      productGroupID: node.id,
      name: node.title,
      url: `${baseUrl}/products/${node.handle}`,
      hasVariant: node.variants?.nodes?.map((v: any) => ({
        "@type": "Product" as const,
        productID: v.id,
        name: `${node.title} - ${v.title}`,
        url: `${baseUrl}/products/${node.handle}`,
        image: v.image ? [{ "@type": "ImageObject" as const, url: v.image.url, alternateName: v.image.altText || "" }] : [],
        offers: {
          "@type": "AggregateOffer" as const,
          lowPrice: Number(v.price?.amount ?? 0),
          highPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : Number(v.price?.amount ?? 0),
          priceCurrency: v.price?.currencyCode || currency,
          offerCount: 1,
          offers: [{
            "@type": "Offer" as const,
            price: Number(v.price?.amount ?? 0),
            listPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined,
            availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            priceSpecification: [],
          }],
        },
        additionalProperty: v.selectedOptions?.map((o: any) => ({
          "@type": "PropertyValue" as const,
          name: o.name,
          value: o.value,
        })) ?? [],
      })) ?? [],
      additionalProperty: [],
    },
  };
}

export default async function productDetailsPageLoader(
  props: Props
): Promise<ProductDetailsPage | null> {
  const { slug } = props;
  if (!slug) return null;

  const client = getShopifyClient();
  const handle = slug.replace(/-\d+$/, "");

  try {
    console.log(`[Shopify] PDP: fetching product handle="${handle}"`);
    const data = await client.query<any>(PDP_QUERY, { handle });
    const shopifyProduct = data?.product;

    if (!shopifyProduct) {
      console.warn(`[Shopify] PDP: product not found for handle="${handle}"`);
      return null;
    }

    const sku = shopifyProduct.variants?.nodes?.[0];
    const product = shopifyProductToSchema(shopifyProduct, sku, "");

    console.log(`[Shopify] PDP: resolved "${shopifyProduct.title}" with ${shopifyProduct.images?.nodes?.length || 0} images`);

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
