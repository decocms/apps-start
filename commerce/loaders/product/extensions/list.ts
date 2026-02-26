import {
  default as extend,
  Props,
} from "../../../../website/loaders/extension";
import { Product } from "../../../types";

/**
 * @title Extend your products
 */
export default function ProductsExt(
  props: Props<Product[] | null>,
): Promise<Product[] | null> {
  return extend(props);
}
