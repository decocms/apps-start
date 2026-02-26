import { HttpError } from "../../../utils/http";
import cartLoader, { Cart } from "../../loaders/cart";
import { AppContext } from "../../mod";
import { getCartCookie } from "../../utils/cart";

interface Item {
  itemId: string;
  quantity: number;
  attributes?: Record<string, string>;
}

export interface Props {
  items: Item[];
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Cart> => {
  const { api } = ctx;
  const { items } = props;
  const cartId = getCartCookie(req.headers);

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  await api["POST /api/v2/carts/:cartId/items/bulk"]({ cartId }, {
    body: {
      items: items.map((item) => ({
        sku: item.itemId,
        quantity: item.quantity,
        customizations: item.attributes
          ? Object.entries(item.attributes).map(([key, value]) => ({
            [key]: value,
          }))
          : undefined,
      })),
    },
  });

  return cartLoader({}, req, ctx);
};

export default action;
