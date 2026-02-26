import {
  default as extend,
  Props,
} from "../../../../website/loaders/extension";
import { ProductDetailsPage } from "../../../types";

/**
 * @title Extend your product
 */
export default function ProductDetailsExt(
  props: Props<ProductDetailsPage | null>,
): Promise<ProductDetailsPage | null> {
  return extend(props);
}

export const cache = "no-cache";
