import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { InstallmentOption } from "../../utils/types";
import { getSegmentFromBag } from "../../utils/segment";

export interface Props {
  paymentSystem: number;
}

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#get-/api/checkout/pub/orderForm/-orderFormId-/installments
 * @title Get Installment
 * @description Get the installment options for a given cart with a given payment method
 */
const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<InstallmentOption> => {
  const { vcsDeprecated } = ctx;
  const { paymentSystem } = props;
  const { orderFormId } = parseCookie(req.headers);
  const cookie = req.headers.get("cookie") ?? "";
  const segment = getSegmentFromBag(ctx);

  const response = await vcsDeprecated
    ["GET /api/checkout/pub/orderForm/:orderFormId/installments"](
      { orderFormId, paymentSystem, sc: segment?.payload.channel },
      { headers: { accept: "application/json", cookie } },
    );

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
