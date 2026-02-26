import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { OrderForm } from "../../utils/types";
import { getSegmentFromBag } from "../../utils/segment";

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#post-/api/checkout/pub/orderForm/-orderFormId-/items/removeAll
 * @title Remove Items from Cart
 * @description Remove all items from the cart
 */
const action = async (
  _props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const { vcsDeprecated } = ctx;
  const { orderFormId } = parseCookie(req.headers);
  const cookie = req.headers.get("cookie") ?? "";
  const segment = getSegmentFromBag(ctx);

  const response = await vcsDeprecated
    ["POST /api/checkout/pub/orderForm/:orderFormId/items/removeAll"](
      { orderFormId, sc: segment?.payload.channel },
      {
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie,
        },
      },
    );

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
