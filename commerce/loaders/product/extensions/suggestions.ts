import {
  default as extend,
  Props,
} from "../../../../website/loaders/extension";
import { Suggestion } from "../../../types";

export { onBeforeResolveProps } from "../../../../website/loaders/extension";

/**
 * @title Extend your product
 */
export default function ProductDetailsExt(
  props: Props<Suggestion | null>,
): Promise<Suggestion | null> {
  return extend(props);
}
