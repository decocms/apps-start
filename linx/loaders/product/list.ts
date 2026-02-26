import type { Product } from "../../../commerce/types";
import { STALE } from "../../../utils/fetch";
import { nullOnNotFound } from "../../../utils/http";
import type { AppContext } from "../../mod";
import { isGridProductsModel } from "../../utils/paths";
import { addAuctions, toProduct } from "../../utils/transform";

export interface Props {
  /** @description e.g.: /listas/vitrine-destaque */
  path: string;
}

/**
 * @title LINX Integration
 * @description Product List loader
 */
const loader = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Product[] | null> => {
  const url = req.url;
  const { api, cdn } = ctx;
  const { path } = props;
  const splat = path?.[0] === "/" ? path.slice(1) : path;

  const params = {
    splat: splat.endsWith(".json") ? splat : `${splat}.json`,
    fc: "false",
  };

  const response = await api["GET /*splat"](params, STALE)
    .then((res) => res.json())
    .catch(nullOnNotFound);

  if (!response || !isGridProductsModel(response)) {
    return null;
  }

  const products = response?.Model?.Grid?.Products ?? [];

  const leiloes = await ctx.invoke.linx.loaders.auction.apiList();

  return products.map((product) => {
    return addAuctions(
      toProduct(product, product.ProductSelection?.SkuID, {
        cdn,
        url,
        currency: "BRL",
      }),
      leiloes,
    );
  });
};

export default loader;
