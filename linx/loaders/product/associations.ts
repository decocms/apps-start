import { Product, ProductDetailsPage } from "../../../commerce/types";
import { AppContext } from "../../mod";

export interface Props {
  pdpLoader: ProductDetailsPage | null;
}

export default function loader(
  props: Props,
  _req: Request,
  _ctx: AppContext,
): Product[] | null {
  const { pdpLoader } = props;

  if (!pdpLoader) {
    return null;
  }

  return pdpLoader.product.isRelatedTo ?? null;
}
