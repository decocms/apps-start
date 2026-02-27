import { intelligentSearch } from "../client";

export interface WorkflowProductsProps {
  props?: {
    query?: string;
    count?: number;
    sort?: string;
    collection?: string;
  };
  page?: number;
  pagesize?: number;
}

export default async function vtexWorkflowProducts(
  props: WorkflowProductsProps
): Promise<any[] | null> {
  const inner = props.props || props;
  const collection = (inner as any).collection;
  const query = (inner as any).query || "";
  const count = (inner as any).count || props.pagesize || 12;

  try {
    const params: Record<string, string> = {
      count: String(count),
      query: query,
    };

    if (collection) {
      params.fq = `productClusterIds:${collection}`;
    }

    const data = await intelligentSearch<{ products: any[] }>(
      "/product_search/",
      params
    );

    const products = data.products || [];

    return products.map((p: any) => {
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
    console.error("[VTEX] Workflow products error:", error);
    return null;
  }
}
