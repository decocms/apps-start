import { intelligentSearch, getVtexConfig } from "../client";

interface ISProduct {
  productId: string;
  productName: string;
  brand: string;
  brandId: number;
  description: string;
  link: string;
  linkText: string;
  items: Array<{
    itemId: string;
    name: string;
    nameComplete: string;
    images: Array<{ imageUrl: string; imageText: string }>;
    sellers: Array<{
      sellerId: string;
      sellerName: string;
      commertialOffer: {
        Price: number;
        ListPrice: number;
        AvailableQuantity: number;
      };
    }>;
    variations: Array<{ name: string; values: string[] }>;
  }>;
  categories: string[];
  categoriesIds: string[];
  priceRange: {
    sellingPrice: { lowPrice: number; highPrice: number };
    listPrice: { lowPrice: number; highPrice: number };
  };
}

function toSchemaProduct(p: ISProduct) {
  const item = p.items?.[0];
  const seller = item?.sellers?.[0];
  const offer = seller?.commertialOffer;
  const image = item?.images?.[0];

  return {
    "@type": "Product" as const,
    productID: item?.itemId || p.productId,
    name: p.productName,
    description: p.description,
    url: `/${p.linkText}/p`,
    brand: { "@type": "Brand" as const, name: p.brand },
    image: item?.images?.map((img) => ({
      "@type": "ImageObject" as const,
      url: img.imageUrl?.replace("http://", "https://"),
      alternateName: img.imageText || p.productName,
    })) ?? [],
    offers: {
      "@type": "AggregateOffer" as const,
      lowPrice: offer?.Price ?? p.priceRange?.sellingPrice?.lowPrice ?? 0,
      highPrice: offer?.ListPrice ?? p.priceRange?.listPrice?.highPrice ?? 0,
      priceCurrency: "BRL",
      offerCount: p.items?.length ?? 1,
      offers: p.items?.flatMap((it) =>
        it.sellers?.map((s) => ({
          "@type": "Offer" as const,
          price: s.commertialOffer.Price,
          listPrice: s.commertialOffer.ListPrice,
          availability: s.commertialOffer.AvailableQuantity > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: s.sellerName,
          priceSpecification: [],
        }))
      ) ?? [],
    },
    isVariantOf: {
      "@type": "ProductGroup" as const,
      productGroupID: p.productId,
      name: p.productName,
      url: `/${p.linkText}/p`,
      hasVariant: p.items?.map((it) => ({
        "@type": "Product" as const,
        productID: it.itemId,
        name: it.nameComplete || it.name,
        url: `/${p.linkText}/p?skuId=${it.itemId}`,
        image: it.images?.map((img) => ({
          "@type": "ImageObject" as const,
          url: img.imageUrl?.replace("http://", "https://"),
          alternateName: img.imageText || "",
        })) ?? [],
        offers: {
          "@type": "AggregateOffer" as const,
          lowPrice: it.sellers?.[0]?.commertialOffer.Price ?? 0,
          highPrice: it.sellers?.[0]?.commertialOffer.ListPrice ?? 0,
          priceCurrency: "BRL",
          offerCount: 1,
          offers: it.sellers?.map((s) => ({
            "@type": "Offer" as const,
            price: s.commertialOffer.Price,
            listPrice: s.commertialOffer.ListPrice,
            availability: s.commertialOffer.AvailableQuantity > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            priceSpecification: [],
          })) ?? [],
        },
        additionalProperty: it.variations?.flatMap((v) =>
          v.values.map((val) => ({
            "@type": "PropertyValue" as const,
            name: v.name,
            value: val,
          }))
        ) ?? [],
      })) ?? [],
      additionalProperty: [],
    },
  };
}

export interface ProductListProps {
  query?: string;
  count?: number;
  sort?: string;
  collection?: string;
  props?: { query?: string; count?: number; sort?: string };
}

export default async function vtexProductList(
  props: ProductListProps
): Promise<any[] | null> {
  const inner = props.props || props;
  const query = inner.query || "";
  const count = inner.count || 12;

  try {
    console.log(`[VTEX] ProductList: query="${query}", count=${count}`);
    const data = await intelligentSearch<{ products: ISProduct[] }>(
      "/product_search/",
      { query: query || "", count: String(count) }
    );
    const products = data.products || [];
    console.log(`[VTEX] ProductList: ${products.length} products found`);
    return products.map(toSchemaProduct);
  } catch (error) {
    console.error("[VTEX] ProductList error:", error);
    return null;
  }
}
