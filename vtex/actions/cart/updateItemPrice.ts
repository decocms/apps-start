import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { OrderForm } from "../../utils/types";
import { getSegmentFromBag } from "../../utils/segment";

export interface Props {
  itemIndex: number;
  price: number;
}

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#put-/api/checkout/pub/orderForm/-orderFormId-/items/-itemIndex-/price
 * @title Update Item Price
 * @description Update the price of an item in the cart
 */
const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const { vcsDeprecated } = ctx;
  const {
    itemIndex,
    price,
  } = props;
  const { orderFormId } = parseCookie(req.headers);
  const cookie = req.headers.get("cookie") ?? "";
  const segment = getSegmentFromBag(ctx);

  const response = await vcsDeprecated
    ["PUT /api/checkout/pub/orderForm/:orderFormId/items/:index/price"]({
      orderFormId,
      index: itemIndex,
      sc: segment?.payload.channel,
    }, {
      body: { price },
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie,
      },
    });

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
