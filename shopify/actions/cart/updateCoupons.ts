import { AppContext } from "../../mod";
import { getCartCookie, setCartCookie } from "../../utils/cart";
import {
  AddCouponMutation,
  AddCouponMutationVariables,
  CartFragment,
} from "../../utils/storefront/storefront.graphql.gen";
import { AddCoupon } from "../../utils/storefront/queries";

type AddCouponProps = {
  discountCodes: string[];
};

const action = async (
  props: AddCouponProps,
  req: Request,
  ctx: AppContext,
): Promise<CartFragment | null> => {
  const { storefront } = ctx;
  const cartId = getCartCookie(req.headers);

  if (!cartId) {
    throw new Error("Missing cart id");
  }

  const { payload } = await storefront.query<
    AddCouponMutation,
    AddCouponMutationVariables
  >({
    variables: { cartId, discountCodes: props.discountCodes },
    ...AddCoupon,
  });

  setCartCookie(ctx.response.headers, cartId);

  return payload?.cart ?? null;
};

export default action;
