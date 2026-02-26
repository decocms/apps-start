import { AppContext } from "../../mod";
import { proxySetCookie } from "../../utils/cookies";
import { parseCookie } from "../../utils/orderForm";
import type { OrderForm } from "../../utils/types";
import { DEFAULT_EXPECTED_SECTIONS } from "./updateItemAttachment";
import { getSegmentFromBag } from "../../utils/segment";

export interface Props {
  attachment: string;
  expectedOrderFormSections?: string[];
  // deno-lint-ignore no-explicit-any
  body: any;
}

/**
 * @title Update Attachment
 * @description Update an attachment in the cart
 */
const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const { vcsDeprecated } = ctx;
  const {
    attachment,
    body,
    expectedOrderFormSections = DEFAULT_EXPECTED_SECTIONS,
  } = props;
  const { orderFormId } = parseCookie(req.headers);

  if (!orderFormId || orderFormId === "") {
    throw new Error("Order form ID is required");
  }

  const cookie = req.headers.get("cookie") ?? "";
  const segment = getSegmentFromBag(ctx);

  const response = await vcsDeprecated
    ["POST /api/checkout/pub/orderForm/:orderFormId/attachments/:attachment"]({
      orderFormId,
      attachment,
      sc: segment?.payload.channel,
    }, {
      body: { expectedOrderFormSections, ...body },
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
