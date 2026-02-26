import { HttpError } from "../../../utils/http";
import cartLoader, { Cart } from "../../loaders/cart";
import { AppContext } from "../../mod";
import { getCartCookie } from "../../utils/cart";

export interface Props {
  agent?: string;
  zip?: string;
  client_id?: number;
  coupon_code?: string;
  rebate_token?: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Cart> => {
  const { api } = ctx;
  const cartId = getCartCookie(req.headers);

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  await api["PATCH /api/v2/carts/:cartId"]({ cartId }, { body: props });

  return cartLoader({}, req, ctx);
};

export default action;
