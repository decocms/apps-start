import { vtexFetch, getVtexConfig } from "../client";

export interface PDPProps {
  slug?: string;
}

export default async function vtexProductDetailsPage(
  props: PDPProps
): Promise<any | null> {
  const { slug } = props;
  if (!slug) return null;

  try {
    console.log(`[VTEX] PDP: slug="${slug}"`);

    // VTEX catalog search by link text
    const linkText = slug.replace(/\/p$/, "").replace(/^\//, "");
    const products = await vtexFetch<any[]>(
      `/api/catalog_system/pub/products/search/${linkText}/p`
    );

    if (!products || products.length === 0) {
      console.warn(`[VTEX] PDP: no product found for slug="${slug}"`);
      return null;
    }

    const p = products[0];
    const item = p.items?.[0];
    const seller = item?.sellers?.[0];
    const offer = seller?.commertialOffer;

    const product = {
      "@type": "Product",
      productID: item?.itemId || p.productId,
      name: p.productName,
      description: p.description,
      url: `/${p.linkText}/p`,
      brand: { "@type": "Brand", name: p.brand },
      image: item?.images?.map((img: any) => ({
        "@type": "ImageObject",
        url: img.imageUrl?.replace("http://", "https://"),
        alternateName: img.imageText || p.productName,
        width: img.imageWidth,
        height: img.imageHeight,
      })) ?? [],
      offers: {
        "@type": "AggregateOffer",
        lowPrice: offer?.Price ?? 0,
        highPrice: offer?.ListPrice ?? offer?.Price ?? 0,
        priceCurrency: "BRL",
        offerCount: p.items?.length ?? 1,
        offers: p.items?.flatMap((it: any) =>
          it.sellers?.map((s: any) => ({
            "@type": "Offer",
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
            alternateName: img.imageText || "",
          })) ?? [],
          offers: {
            "@type": "AggregateOffer",
            lowPrice: it.sellers?.[0]?.commertialOffer.Price ?? 0,
            highPrice: it.sellers?.[0]?.commertialOffer.ListPrice ?? 0,
            priceCurrency: "BRL",
            offerCount: 1,
            offers: it.sellers?.map((s: any) => ({
              "@type": "Offer",
              price: s.commertialOffer.Price,
              listPrice: s.commertialOffer.ListPrice,
              availability: s.commertialOffer.AvailableQuantity > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              priceSpecification: [],
            })) ?? [],
          },
          additionalProperty: it.variations?.flatMap((v: any) =>
            v.values.map((val: string) => ({
              "@type": "PropertyValue",
              name: v.name,
              value: val,
            }))
          ) ?? [],
        })) ?? [],
        additionalProperty: [],
      },
    };

    console.log(`[VTEX] PDP: resolved "${p.productName}" with ${item?.images?.length || 0} images`);

    return {
      "@type": "ProductDetailsPage",
      breadcrumbList: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          ...(p.categories || []).map((cat: string, i: number) => ({
            "@type": "ListItem",
            position: i + 2,
            name: cat.split("/").filter(Boolean).pop() || cat,
            item: cat,
          })),
          { "@type": "ListItem", position: 10, name: p.productName, item: `/${p.linkText}/p` },
        ],
        numberOfItems: 2 + (p.categories?.length || 0),
      },
      product,
      seo: {
        title: p.productTitle || p.productName,
        description: p.metaTagDescription || p.description?.substring(0, 160),
        canonical: `/${p.linkText}/p`,
      },
    };
  } catch (error) {
    console.error("[VTEX] PDP error:", error);
    return null;
  }
}
