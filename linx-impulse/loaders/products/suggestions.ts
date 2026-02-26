// deno-lint-ignore-file require-await
import { fixSuggestionLink } from "../../utils/transform";
import { Suggestion } from "../../utils/types/search";
import { LinxEngage } from "./linxEngage";

export interface Props {
  linxEngage: LinxEngage | null;
}
/**
 * @title Linx Impulse Suggestions
 * @description For use at /lxsearch Product Listing Page loader
 */
const loader = async (
  props: Props,
): Promise<Suggestion[]> => {
  if (!props.linxEngage || !("suggestions" in props.linxEngage.response)) {
    return [];
  }

  return props.linxEngage.response.suggestions.map((suggestion) => ({
    ...suggestion,
    link: fixSuggestionLink(suggestion.link),
  }));
};

export default loader;
