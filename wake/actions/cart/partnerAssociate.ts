import { HttpError } from "../../../utils/http";
import { AppContext } from "../../mod";
import { getCartCookie, setCartCookie } from "../../utils/cart";
import { CheckoutPartnerAssociate } from "../../utils/graphql/queries";
import {
  CheckoutFragment,
  CheckoutPartnerAssociateMutation,
  CheckoutPartnerAssociateMutationVariables,
} from "../../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../../utils/parseHeaders";
import { setPartnerCookie } from "../../utils/partner";

export interface Props {
  partnerAccessToken: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Partial<CheckoutFragment>> => {
  const { storefront } = ctx;
  const cartId = getCartCookie(req.headers);
  const headers = parseHeaders(req.headers);
  const { partnerAccessToken } = props;

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  const data = await storefront.query<
    CheckoutPartnerAssociateMutation,
    CheckoutPartnerAssociateMutationVariables
  >({
    variables: { checkoutId: cartId, partnerAccessToken },
    ...CheckoutPartnerAssociate,
  }, { headers });

  const checkoutId = data.checkout?.checkoutId;

  if (cartId !== checkoutId) {
    setCartCookie(ctx.response.headers, checkoutId);
  }

  setPartnerCookie(ctx.response.headers, partnerAccessToken);

  return data.checkout ?? {};
};

export default action;
