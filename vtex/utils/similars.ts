import type { Product } from "../../commerce/types/commerce";
import { vtexFetch } from "../client";

export const withIsSimilarTo = async (
  product: Product,
): Promise<Product> => {
  const id = product.isVariantOf?.productGroupID;

  if (!id) {
    return product;
  }

  try {
    const similars = await vtexFetch<Product[]>(
      `/api/catalog_system/pub/products/crossselling/similars/${product.inProductGroupWithID}`,
    );

    return {
      ...product,
      isSimilarTo: similars ?? undefined,
    };
  } catch {
    return product;
  }
};
