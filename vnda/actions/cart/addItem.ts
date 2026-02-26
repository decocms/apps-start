import { HttpError } from "../../../utils/http";
import cartLoader, { Cart } from "../../loaders/cart";
import { AppContext } from "../../mod";
import { getCartCookie } from "../../utils/cart";

export interface Props {
  itemId: string;
  quantity: number;
  attributes: Record<string, string>;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Cart> => {
  const { api } = ctx;
  const { itemId, quantity, attributes } = props;
  const cartId = getCartCookie(req.headers);

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  await api["POST /api/v2/carts/:cartId/items"]({ cartId }, {
    body: {
      sku: itemId,
      quantity,
      extra: attributes,
    },
  });

  return cartLoader({}, req, ctx);
};

export default action;
