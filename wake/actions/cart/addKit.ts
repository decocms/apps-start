import { HttpError } from "../../../utils/http";
import { AppContext } from "../../mod";
import { getCartCookie, setCartCookie } from "../../utils/cart";
import { AddKit } from "../../utils/graphql/queries";
import {
  AddKitMutation,
  AddKitMutationVariables,
  CheckoutFragment,
} from "../../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../../utils/parseHeaders";

export interface KitItemVariant {
  productVariantId: number;
  quantity: number;
}

export interface KitItem {
  productId: number;
  variants: KitItemVariant[];
}

export interface Props {
  products: KitItem[];
  quantity: number;
  kitId: number;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Partial<CheckoutFragment>> => {
  const { storefront } = ctx;
  const cartId = getCartCookie(req.headers);
  const headers = parseHeaders(req.headers);
  const { quantity, kitId, products } = props;

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  const data = await storefront.query<
    AddKitMutation,
    AddKitMutationVariables
  >({
    variables: { input: { id: cartId, quantity, kitId, products } },
    ...AddKit,
  }, { headers });

  const checkoutId = data.checkout?.checkoutId;

  if (cartId !== checkoutId) {
    setCartCookie(ctx.response.headers, checkoutId);
  }

  return data.checkout ?? {};
};

export default action;
