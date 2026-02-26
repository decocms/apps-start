import {
  default as extend,
  Props,
} from "../../../website/loaders/extension";
import { ProductListingPage } from "../../types";

/**
 * @title Extend your product
 * @deprecated
 */
export default function ProductDetailsExt(
  props: Props<ProductListingPage | null>,
): Promise<ProductListingPage | null> {
  return extend(props);
}
