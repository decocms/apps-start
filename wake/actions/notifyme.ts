import { AppContext } from "../mod";
import { ProductRestockAlert } from "../utils/graphql/queries";
import {
  ProductRestockAlertMutation,
  ProductRestockAlertMutationVariables,
  RestockAlertNode,
} from "../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../utils/parseHeaders";

export interface Props {
  email: string;
  name: string;
  productVariantId: number;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<RestockAlertNode | null> => {
  const { storefront } = ctx;

  const headers = parseHeaders(req.headers);

  const data = await storefront.query<
    ProductRestockAlertMutation,
    ProductRestockAlertMutationVariables
  >({
    variables: { input: props },
    ...ProductRestockAlert,
  }, {
    headers,
  });

  return data.productRestockAlert ?? null;
};

export default action;
