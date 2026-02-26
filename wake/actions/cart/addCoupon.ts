import { HttpError } from "../../../utils/http";
import { AppContext } from "../../mod";
import { getCartCookie, setCartCookie } from "../../utils/cart";
import { AddCoupon } from "../../utils/graphql/queries";
import {
  AddCouponMutation,
  AddCouponMutationVariables,
  CheckoutFragment,
} from "../../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../../utils/parseHeaders";

export interface Props {
  coupon: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Partial<CheckoutFragment>> => {
  const { storefront } = ctx;
  const cartId = getCartCookie(req.headers);
  const headers = parseHeaders(req.headers);

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  const data = await storefront.query<
    AddCouponMutation,
    AddCouponMutationVariables
  >({
    variables: { checkoutId: cartId, ...props },
    ...AddCoupon,
  }, { headers });

  const checkoutId = data.checkout?.checkoutId;

  if (cartId !== checkoutId) {
    setCartCookie(ctx.response.headers, checkoutId);
  }

  return data.checkout ?? {};
};

export default action;
