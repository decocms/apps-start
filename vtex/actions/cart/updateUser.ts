import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { OrderForm } from "../../utils/types";
import { getSegmentFromBag } from "../../utils/segment";

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#get-/checkout/changeToAnonymousUser/-orderFormId-
 * @title Update User
 * @description Update the user
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
    ["GET /api/checkout/changeToAnonymousUser/:orderFormId"]({
      orderFormId,
      sc: segment?.payload.channel,
    }, {
      headers: {
        accept: "application/json",
        cookie,
      },
    });

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
