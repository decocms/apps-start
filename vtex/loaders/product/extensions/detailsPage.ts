import { ProductDetailsPage } from "../../../../commerce/types";
import { ExtensionOf } from "../../../../website/loaders/extension";
import { AppContext } from "../../../mod";
import { Props } from "../extend";

/**
 * @title VTEX Integration - Extra Info
 * @description Add extra data to your loader. This may harm performance
 */
const loader = (
  props: Omit<Props, "products">,
  _req: Request,
  ctx: AppContext,
): ExtensionOf<ProductDetailsPage | null> =>
async (page: ProductDetailsPage | null) => {
  if (page == null) {
    return page;
  }

  const products = await ctx.invoke(
    "vtex/loaders/product/extend.ts",
    { products: [page.product], ...props },
  );

  return {
    ...page,
    product: products[0],
  };
};

export const cache = "no-cache";

export default loader;
