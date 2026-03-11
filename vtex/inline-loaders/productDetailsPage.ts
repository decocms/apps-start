/**
 * PDP loader using Legacy Catalog API + shared transform pipeline.
 * Maps VTEX catalog response to schema.org ProductDetailsPage
 * following the same pattern as deco-cx/apps.
 */
import { vtexCachedFetch, getVtexConfig } from "../client";
import { toProductPage, pickSku } from "../utils/transform";
import type { LegacyProduct } from "../utils/types";
import type { ProductDetailsPage } from "../../commerce/types/commerce";
import { searchBySlug } from "../utils/slugCache";

export interface PDPProps {
  slug?: string;
  skuId?: string;
  /** When true, PDP pages with ?skuId remain indexable */
  indexingSkus?: boolean;
  /** Use product.description instead of metaTagDescription for SEO */
  preferDescription?: boolean;
}

export default async function vtexProductDetailsPage(
  props: PDPProps,
): Promise<ProductDetailsPage | null> {
  const { slug, skuId, indexingSkus, preferDescription } = props;
  if (!slug) return null;

  try {
    const linkText = slug.replace(/\/p$/, "").replace(/^\//, "").toLowerCase();
    const config = getVtexConfig();
    const sc = config.salesChannel;

    const products = await searchBySlug(linkText);

    if (!products || products.length === 0) {
      return null;
    }

    const product = products[0];
    const baseUrl = config.publicUrl
      ? `https://${config.publicUrl}`
      : `https://${config.account}.vtexcommercestable.${config.domain ?? "com.br"}`;

    const sku = pickSku(product, skuId);

    const kitItems: LegacyProduct[] =
      Array.isArray(sku.kitItems) && sku.kitItems.length > 0
        ? await vtexCachedFetch<LegacyProduct[]>(
            `/api/catalog_system/pub/products/search/?fq=${sku.kitItems.map((item: any) => `skuId:${item.itemId}`).join("&fq=")}&_from=0&_to=49${sc ? `&sc=${sc}` : ""}`,
          )
        : [];

    const page = toProductPage(product, sku, kitItems, {
      baseUrl,
      priceCurrency: "BRL",
    });

    return {
      ...page,
      seo: {
        title: product.productTitle || product.productName,
        description: preferDescription
          ? product.description
          : product.metaTagDescription || product.description?.substring(0, 160) || "",
        canonical: `/${product.linkText}/p`,
        noIndexing: indexingSkus ? false : !!skuId,
      },
    };
  } catch (error) {
    console.error("[VTEX] PDP error:", error);
    return null;
  }
}
