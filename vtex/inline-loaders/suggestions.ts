import { intelligentSearch } from "../client";

export interface SuggestionsProps {
  query?: string;
  count?: number;
}

interface ISSuggestion {
  term: string;
  count: number;
}

interface ISProductSuggestion {
  productId: string;
  productName: string;
  brand: string;
  linkText: string;
  items: Array<{
    itemId: string;
    name: string;
    images: Array<{ imageUrl: string; imageText: string }>;
    sellers: Array<{
      commertialOffer: { Price: number; ListPrice: number };
    }>;
  }>;
}

export default async function vtexSuggestions(
  props: SuggestionsProps
): Promise<{ searches: Array<{ term: string; count: number }>; products: any[] } | null> {
  const query = props.query || "";
  if (!query.trim()) return { searches: [], products: [] };

  try {
    const data = await intelligentSearch<{
      searches: ISSuggestion[];
      products: ISProductSuggestion[];
    }>("/autocomplete_suggestions/", { query });

    const searches = (data.searches || []).map((s) => ({
      term: s.term,
      count: s.count || 0,
    }));

    const products = (data.products || []).map((p) => {
      const item = p.items?.[0];
      const seller = item?.sellers?.[0];
      return {
        "@type": "Product" as const,
        productID: item?.itemId || p.productId,
        name: p.productName,
        url: `/${p.linkText}/p`,
        image: item?.images?.map((img) => ({
          "@type": "ImageObject" as const,
          url: img.imageUrl?.replace("http://", "https://"),
          alternateName: img.imageText || p.productName,
        })) ?? [],
        offers: {
          "@type": "AggregateOffer" as const,
          lowPrice: seller?.commertialOffer?.Price ?? 0,
          highPrice: seller?.commertialOffer?.ListPrice ?? 0,
          priceCurrency: "BRL",
        },
      };
    });

    return { searches, products };
  } catch (error) {
    console.error("[VTEX] Suggestions error:", error);
    return null;
  }
}
