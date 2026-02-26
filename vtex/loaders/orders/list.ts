import { AppContext } from "../../mod";
import { Userorderslist } from "../../utils/openapi/vcs.openapi.gen";
import { parseCookie } from "../../utils/vtexId";

export interface Props {
  clientEmail: string;
  page?: string;
  per_page?: string;
}

/**
 * @title List Orders
 * @description List orders
 */
export default async function loader(
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Userorderslist> {
  const { vcsDeprecated } = ctx;
  const { clientEmail, page = "0", per_page = "15" } = props;
  const { cookie } = parseCookie(req.headers, ctx.account);

  const ordersResponse = await vcsDeprecated
    ["GET /api/oms/user/orders"](
      {
        clientEmail,
        page,
        per_page,
      },
      {
        headers: {
          cookie,
        },
      },
    );

  const ordersList = await ordersResponse.json();

  return ordersList;
}
