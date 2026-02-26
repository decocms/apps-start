import type { AppContext } from "../../mod";
import { RegisterAccount } from "../../utils/storefront/queries";
import {
  CustomerCreateInput,
  CustomerCreatePayload,
} from "../../utils/storefront/storefront.graphql.gen";

interface Props {
  email: string;
  /**
   * @format password
   */
  password: string;
  firstName: string;
  lastName: string;
  acceptsMarketing?: boolean;
}

/**
 * @title Shopify Integration
 * @description Register Account Action
 */
const action = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<CustomerCreatePayload> => {
  const { storefront } = ctx;

  const data = await storefront.query<
    { customerCreate: CustomerCreatePayload },
    CustomerCreateInput
  >({
    variables: props,
    ...RegisterAccount,
  });

  return data.customerCreate;
};

export default action;
