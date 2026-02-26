import { HttpError } from "../../../utils/http";
import { AppContext } from "../../mod";
import { getCartCookie, setCartCookie } from "../../utils/cart";
import { RemoveCoupon } from "../../utils/graphql/queries";
import {
  CheckoutFragment,
  RemoveCouponMutation,
  RemoveCouponMutationVariables,
} from "../../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../../utils/parseHeaders";

const action = async (
  _props: unknown,
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
    RemoveCouponMutation,
    RemoveCouponMutationVariables
  >({
    variables: { checkoutId: cartId },
    ...RemoveCoupon,
  }, { headers });

  const checkoutId = data.checkout?.checkoutId;

  if (cartId !== checkoutId) {
    setCartCookie(ctx.response.headers, checkoutId);
  }

  return data.checkout ?? {};
};

export default action;
