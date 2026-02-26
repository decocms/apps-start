import { Product } from "../../../../commerce/types";
import { ExtensionOf } from "../../../../website/loaders/extension";
import { AppContext } from "../../../mod";
import { fetchAndApplyPrices } from "../../../utils/transform";

export interface Props {
  priceCurrency: string;
}

const loader = (
  { priceCurrency }: Props,
  req: Request,
  ctx: AppContext,
): ExtensionOf<Product[] | null> =>
(products: Product[] | null) => {
  if (!Array.isArray(products)) return products;

  return fetchAndApplyPrices(products, priceCurrency, req, ctx);
};

export default loader;
