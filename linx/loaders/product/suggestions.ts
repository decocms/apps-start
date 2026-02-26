import { Suggestion } from "../../../commerce/types";
import { STALE } from "../../../utils/fetch";
import { AppContext } from "../../mod";
import { isSuggestionModel } from "../../utils/paths";
import { toProduct } from "../../utils/transform";

interface Props {
  query?: string;

  /** @description number of suggested terms/products to return */
  count?: number;
}

/**
 * @title Linx Integration
 */
const loader = async (
  { query, count }: Props,
  req: Request,
  ctx: AppContext,
): Promise<Suggestion | null> => {
  const url = req.url;
  const { api, cdn } = ctx;

  const params = {
    splat: "sugestao.json",
    t: query,
    showCorrections: "true",
    showTerms: "true",
    showProducts: "true",
    termsLimit: count ?? 0,
    productsLimit: count ?? 0,
  };

  const response = await api["GET /*splat"](params, STALE)
    .then((res) => res.json());

  if (!response || !isSuggestionModel(response)) {
    return null;
  }

  const { Model: { Grid: { Products, Terms } } } = response;

  return {
    products: Products.map((product) =>
      toProduct(product, product.ProductSelection?.SkuID, {
        cdn,
        url,
        currency: "BRL",
      })
    ),
    searches: Terms.flatMap((term) =>
      term.Options.map((option) => ({
        term: option.Term,
        hits: option.Count,
      }))
    ),
  };
};

export default loader;
