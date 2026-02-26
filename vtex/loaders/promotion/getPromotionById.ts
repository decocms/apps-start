import { AppContext } from "../../mod";
import type { Document } from "../../utils/types";
import { parseCookie } from "../../utils/vtexId";

interface Props {
  /**
   * @description Promotion ID.
   */
  idCalculatorConfiguration: string;
}

export const defaultVisibility = "private";

/**
 * @title Get Promotion By ID
 * @description Get a promotion by its ID
 */
export default async function loader(
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Document[]> {
  const { vcs } = ctx;
  const { idCalculatorConfiguration } = props;
  const { cookie } = parseCookie(req.headers, ctx.account);

  const promotionById = await vcs
    ["GET /api/rnb/pvt/calculatorconfiguration/:idCalculatorConfiguration"]({
      idCalculatorConfiguration,
    }, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie,
      },
    }).then((response: Response) => response.json());

  return promotionById;
}
