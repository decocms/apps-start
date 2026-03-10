import type { Product } from "../../commerce/types/commerce";
import { vtexFetch, getVtexConfig } from "../client";
import { toProduct, pickSku } from "./transform";
import type { LegacyProduct } from "./types";

export const withIsSimilarTo = async (
  product: Product,
): Promise<Product> => {
  const id = product.isVariantOf?.productGroupID ?? product.inProductGroupWithID;

  if (!id) {
    return product;
  }

  try {
    const rawSimilars = await vtexFetch<LegacyProduct[]>(
      `/api/catalog_system/pub/products/crossselling/similars/${id}`,
    );

    if (!rawSimilars?.length) return product;

    const config = getVtexConfig();
    const baseUrl = config.publicUrl
      ? `https://${config.publicUrl}`
      : `https://${config.account}.vtexcommercestable.com.br`;

    const similars = rawSimilars.map((p) => {
      const sku = pickSku(p);
      return toProduct(p, sku, 0, { baseUrl, priceCurrency: "BRL" });
    });

    return {
      ...product,
      isSimilarTo: similars,
    };
  } catch {
    return product;
  }
};
