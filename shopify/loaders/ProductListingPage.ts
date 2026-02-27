import { getShopifyClient } from "../client";
import type { ProductListingPage } from "../../commerce/types/commerce";

const SEARCH_QUERY = `
query SearchProducts($query: String!, $first: Int!) {
  search(query: $query, first: $first, types: PRODUCT) {
    edges {
      node {
        ... on Product {
          id handle title description vendor tags productType
          images(first: 5) { nodes { url altText width height } }
          variants(first: 10) {
            nodes {
              id title availableForSale
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              selectedOptions { name value }
              image { url altText }
              product { handle }
            }
          }
        }
      }
    }
  }
}
`;

const COLLECTION_QUERY = `
query ProductsByCollection($handle: String!, $first: Int!) {
  collection(handle: $handle) {
    title
    products(first: $first) {
      edges {
        node {
          id handle title description vendor tags productType
          images(first: 5) { nodes { url altText width height } }
          variants(first: 10) {
            nodes {
              id title availableForSale
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              selectedOptions { name value }
              image { url altText }
              product { handle }
            }
          }
        }
      }
    }
  }
}
`;

export interface Props {
  count?: number;
  query?: string;
  collection?: string;
}

function toSchemaProduct(node: any) {
  const variant = node.variants?.nodes?.[0];
  const price = variant?.price ? Number(variant.price.amount) : undefined;
  const listPrice = variant?.compareAtPrice ? Number(variant.compareAtPrice.amount) : undefined;
  const currency = variant?.price?.currencyCode || "USD";

  return {
    "@type": "Product" as const,
    productID: node.id,
    name: node.title,
    description: node.description,
    url: `/products/${node.handle}`,
    image: node.images?.nodes?.map((img: any) => ({
      "@type": "ImageObject" as const,
      url: img.url,
      alternateName: img.altText || node.title,
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
        availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: node.vendor,
        priceSpecification: [],
      })) ?? [],
    },
    isVariantOf: {
      "@type": "ProductGroup" as const,
      productGroupID: node.id,
      name: node.title,
      url: `/products/${node.handle}`,
      hasVariant: node.variants?.nodes?.map((v: any) => ({
        "@type": "Product" as const,
        productID: v.id,
        name: `${node.title} - ${v.title}`,
        url: `/products/${node.handle}`,
        image: v.image ? [{ "@type": "ImageObject" as const, url: v.image.url, alternateName: v.image.altText || "" }] : [],
        offers: {
          "@type": "AggregateOffer" as const,
          lowPrice: Number(v.price?.amount ?? 0),
          highPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : Number(v.price?.amount ?? 0),
          priceCurrency: v.price?.currencyCode || currency,
          offerCount: 1,
          offers: [{ "@type": "Offer" as const, price: Number(v.price?.amount ?? 0), listPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : undefined, availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", priceSpecification: [] }],
        },
        additionalProperty: v.selectedOptions?.map((o: any) => ({ "@type": "PropertyValue" as const, name: o.name, value: o.value })) ?? [],
      })) ?? [],
      additionalProperty: [],
    },
  };
}

export default async function productListingPageLoader(
  props: Props
): Promise<ProductListingPage | null> {
  const client = getShopifyClient();
  const { count = 12, query, collection } = props;

  try {
    let products: any[] = [];

    if (query) {
      console.log(`[Shopify] PLP search: query="${query}", count=${count}`);
      const data = await client.query<any>(SEARCH_QUERY, { query, first: count });
      products = data?.search?.edges?.map((e: any) => e.node) ?? [];
    } else if (collection) {
      console.log(`[Shopify] PLP collection: handle="${collection}", count=${count}`);
      const data = await client.query<any>(COLLECTION_QUERY, { handle: collection, first: count });
      products = data?.collection?.products?.edges?.map((e: any) => e.node) ?? [];
    }

    console.log(`[Shopify] PLP: ${products.length} products found`);

    return {
      "@type": "ProductListingPage",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [],
        numberOfItems: 0,
      },
      filters: [],
      products: products.map(toSchemaProduct),
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
