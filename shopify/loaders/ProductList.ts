import { getShopifyClient } from "../client";
import type { Product } from "../../commerce/types/commerce";

const PRODUCT_LIST_QUERY = `
  query ProductList($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          handle
          title
          description
          vendor
          tags
          images(first: 5) {
            nodes {
              url
              altText
              width
              height
            }
          }
          variants(first: 10) {
            nodes {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              selectedOptions {
                name
                value
              }
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

export interface Props {
  query?: string;
  count?: number;
  sort?: string;
  props?: { query?: string; count?: number; sort?: string };
  filters?: Record<string, unknown>;
}

function shopifyProductToSchema(node: any, baseUrl: string): Product {
  const variant = node.variants?.nodes?.[0];
  const price = variant?.price ? Number(variant.price.amount) : undefined;
  const listPrice = variant?.compareAtPrice
    ? Number(variant.compareAtPrice.amount)
    : undefined;
  const currency = variant?.price?.currencyCode || "USD";

  return {
    "@type": "Product",
    productID: node.id,
    name: node.title,
    description: node.description,
    url: `${baseUrl}/products/${node.handle}`,
    image: node.images?.nodes?.map((img: any) => ({
      "@type": "ImageObject" as const,
      url: img.url,
      alternateName: img.altText || node.title,
    })) ?? [],
    offers: {
      "@type": "AggregateOffer",
      lowPrice: price ?? 0,
      highPrice: listPrice ?? price ?? 0,
      offerCount: node.variants?.nodes?.length ?? 1,
      priceCurrency: currency,
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
      "@type": "ProductGroup",
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
          offerCount: 1,
          priceCurrency: v.price?.currencyCode || currency,
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

export default async function productListLoader(
  props: Props
): Promise<Product[] | null> {
  const client = getShopifyClient();
  const innerProps = props.props || props;
  const query = innerProps.query || "";
  const count = innerProps.count || 6;

  try {
    console.log(`[Shopify] Fetching products: query="${query}", count=${count}`);

    const data = await client.query<any>(PRODUCT_LIST_QUERY, {
      first: count,
      query: query || null,
    });

    const edges = data?.products?.edges ?? [];
    console.log(`[Shopify] Got ${edges.length} products`);

    return edges.map((edge: any) =>
      shopifyProductToSchema(edge.node, "")
    );
  } catch (error) {
    console.error("[Shopify] ProductList error:", error);
    return null;
  }
}
