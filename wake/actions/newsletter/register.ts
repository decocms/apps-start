import { HttpError } from "../../../utils/http";
import { AppContext } from "../../mod";
import { CreateNewsletterRegister } from "../../utils/graphql/queries";
import {
  CreateNewsletterRegisterMutation,
  CreateNewsletterRegisterMutationVariables,
  NewsletterNode,
} from "../../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../../utils/parseHeaders";

export interface Props {
  email: string;
  name: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<NewsletterNode> => {
  const { storefront } = ctx;
  const headers = parseHeaders(req.headers);

  const data = await storefront.query<
    CreateNewsletterRegisterMutation,
    CreateNewsletterRegisterMutationVariables
  >({
    variables: { input: { ...props } },
    ...CreateNewsletterRegister,
  }, {
    headers,
  });

  if (!data.createNewsletterRegister) {
    throw new HttpError(400, "Error on Register");
  }

  return data.createNewsletterRegister;
};

export default action;
