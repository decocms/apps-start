import { AppContext } from "../mod";
import { getCartCookie } from "../utils/cart";
import { Cart } from "../utils/types";

const loader = async (
  _props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<Cart | undefined> => {
  const { api, storeId } = ctx;
  const maybeCartId = getCartCookie(req.headers);

  if (!maybeCartId) {
    return;
  }

  const cart = await api["GET /v1/:storeId/carts/:id"]({
    storeId: storeId,
    id: maybeCartId,
  }).then((response) => response.json());

  return cart;
};

export default loader;
