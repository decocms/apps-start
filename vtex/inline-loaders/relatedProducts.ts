/**
 * Related/cross-selling products loader using Legacy Catalog API + shared transform.
 * Maps VTEX catalog response to schema.org Product[] following deco-cx/apps pattern.
 */
import { vtexFetch, getVtexConfig } from "../client";
import { toProduct, pickSku } from "../utils/transform";
import type { LegacyProduct } from "../utils/types";
import type { Product } from "../../commerce/types/commerce";

export type CrossSellingType =
  | "similars"
  | "suggestions"
  | "accessories"
  | "whosawalsosaw"
  | "whosawalsobought"
  | "whoboughtalsobought"
  | "showtogether";

export interface RelatedProductsProps {
  slug?: string;
  crossSelling?: CrossSellingType;
  count?: number;
  hideUnavailableItems?: boolean;
}

export default async function vtexRelatedProducts(
  props: RelatedProductsProps,
): Promise<Product[] | null> {
  const { slug, crossSelling = "similars", count = 8 } = props;
  if (!slug) return null;

  try {
    const linkText = slug.replace(/\/p$/, "").replace(/^\//, "");
    const config = getVtexConfig();
    const sc = config.salesChannel;
    const scParam = sc ? `?sc=${sc}` : "";

    const products = await vtexFetch<LegacyProduct[]>(
      `/api/catalog_system/pub/products/search/${linkText}/p${scParam}`,
    );
    if (!products?.length) return null;

    const productId = products[0].productId;

    const related = await vtexFetch<LegacyProduct[]>(
      `/api/catalog_system/pub/products/crossselling/${crossSelling}/${productId}`,
    );
    if (!related?.length) return [];

    const baseUrl = config.publicUrl
      ? `https://${config.publicUrl}`
      : `https://${config.account}.vtexcommercestable.${config.domain ?? "com.br"}`;

    let result = related.slice(0, count).map((p) => {
      const sku = pickSku(p);
      return toProduct(p, sku, 0, { baseUrl, priceCurrency: "BRL" });
    });

    if (props.hideUnavailableItems) {
      result = result.filter((p) =>
        p.offers?.offers?.some(
          (o) => o.availability === "https://schema.org/InStock",
        ),
      );
    }

    return result;
  } catch (error) {
    console.error("[VTEX] Related products error:", error);
    return null;
  }
}
