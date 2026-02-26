import { ProductListingPage } from "../../../../commerce/types";
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
): ExtensionOf<ProductListingPage | null> =>
async (page: ProductListingPage | null) => {
  if (page == null) {
    return page;
  }

  const products = await ctx.invoke(
    "vtex/loaders/product/extend.ts",
    { products: page.products, ...props },
  );

  return {
    ...page,
    products,
  };
};

export const cache = "no-cache";

export default loader;
