import type { Product } from "../../commerce/types";
import relatedProductsLoader from "../loaders/legacy/relatedProductsLoader";
import { AppContext } from "../mod";

export const withIsSimilarTo = async (
  req: Request,
  ctx: AppContext,
  product: Product,
) => {
  const id = product.isVariantOf?.productGroupID;

  if (!id) {
    return product;
  }

  const isSimilarTo = await relatedProductsLoader(
    {
      crossSelling: "similars",
      id: product.inProductGroupWithID,
    },
    req,
    ctx,
  );

  return {
    ...product,
    isSimilarTo: isSimilarTo ?? undefined,
  };
};
