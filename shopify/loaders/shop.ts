import { AppContext } from "../mod";
import { GetShopInfo } from "../utils/storefront/queries";
import {
  Shop,
  ShopMetafieldsArgs,
} from "../utils/storefront/storefront.graphql.gen";
import { Metafield } from "../utils/types";

export interface Props {
  /**
   * @title Metafields
   * @description search for metafields
   */
  metafields?: Metafield[];
}

export const defaultVisibility = "private";

const loader = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<Shop> => {
  const { storefront } = ctx;
  const { metafields = [] } = props;

  const shop = await storefront.query<{ shop: Shop }, ShopMetafieldsArgs>({
    variables: { identifiers: metafields },
    ...GetShopInfo,
  }).then((data) => data.shop);

  return shop;
};

export default loader;
