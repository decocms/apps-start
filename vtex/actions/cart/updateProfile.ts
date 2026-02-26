import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { OrderForm } from "../../utils/types";
import { getSegmentFromBag } from "../../utils/segment";

export interface Props {
  ignoreProfileData: boolean;
}

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#patch-/api/checkout/pub/orderForm/-orderFormId-/profile
 * @title Update Profile
 * @description Update the profile in the cart
 */
const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const { vcsDeprecated } = ctx;
  const { ignoreProfileData } = props;
  const { orderFormId } = parseCookie(req.headers);
  const cookie = req.headers.get("cookie") ?? "";
  const segment = getSegmentFromBag(ctx);

  const response = await vcsDeprecated
    ["PATCH /api/checkout/pub/orderForm/:orderFormId/profile"]({
      orderFormId,
      sc: segment?.payload.channel,
    }, {
      body: { ignoreProfileData },
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        cookie,
      },
    });

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
