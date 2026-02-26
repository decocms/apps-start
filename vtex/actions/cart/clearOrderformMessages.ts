import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { OrderForm } from "../../utils/types";

/**
 * @title Clear OrderForm Messages
 * @description Clear the messages from the orderForm
 */
const action = async (
  _props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const { vcsDeprecated } = ctx;
  const { orderFormId } = parseCookie(req.headers);
  const cookie = req.headers.get("cookie") ?? "";

  const response = await vcsDeprecated[
    "POST /api/checkout/pub/orderForm/:orderFormId/messages/clear"
  ](
    { orderFormId },
    {
      headers: { accept: "application/json", cookie },
      body: {},
    },
  );

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
