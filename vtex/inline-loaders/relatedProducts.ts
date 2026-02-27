import { vtexFetch } from "../client";

export interface RelatedProductsProps {
  slug?: string;
  crossSelling?: "similars" | "suggestions" | "accessories" | "view" | "buy" | "viewandBought" | "showtogether";
  count?: number;
  hideUnavailableItems?: boolean;
}

export default async function vtexRelatedProducts(
  props: RelatedProductsProps
): Promise<any[] | null> {
  const { slug, crossSelling = "similars", count = 8 } = props;
  if (!slug) return null;

  try {
    const linkText = slug.replace(/\/p$/, "").replace(/^\//, "");

    const products = await vtexFetch<any[]>(
      `/api/catalog_system/pub/products/search/${linkText}/p`
    );

    if (!products?.length) return null;

    const productId = products[0].productId;

    const related = await vtexFetch<any[]>(
      `/api/catalog_system/pub/products/crossselling/${crossSelling}/${productId}`
    );

    if (!related?.length) return [];

    return related.slice(0, count).map((p: any) => {
      const item = p.items?.[0];
      const seller = item?.sellers?.[0];
      const offer = seller?.commertialOffer;
      return {
        "@type": "Product" as const,
        productID: item?.itemId || p.productId,
        name: p.productName,
        url: `/${p.linkText}/p`,
        brand: { "@type": "Brand" as const, name: p.brand },
        image: item?.images?.map((img: any) => ({
          "@type": "ImageObject" as const,
          url: img.imageUrl?.replace("http://", "https://"),
          alternateName: img.imageText || p.productName,
        })) ?? [],
        offers: {
          "@type": "AggregateOffer" as const,
          lowPrice: offer?.Price ?? 0,
          highPrice: offer?.ListPrice ?? 0,
          priceCurrency: "BRL",
          offerCount: p.items?.length ?? 1,
          offers: [{
            "@type": "Offer" as const,
            price: offer?.Price ?? 0,
            listPrice: offer?.ListPrice,
            availability: (offer?.AvailableQuantity ?? 0) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            seller: seller?.sellerName,
          }],
        },
      };
    });
  } catch (error) {
    console.error("[VTEX] Related products error:", error);
    return null;
  }
}
