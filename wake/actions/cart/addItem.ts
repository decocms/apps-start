import { AppContext } from "../../mod";
import { CheckoutFragment } from "../../utils/graphql/storefront.graphql.gen";
import { CartItem as Props } from "./addItems";

export type { CartItem as Props } from "./addItems";

const action = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<Partial<CheckoutFragment>> => {
  return await ctx.invoke.wake.actions.cart.addItems({ products: [props] });
};

export default action;
