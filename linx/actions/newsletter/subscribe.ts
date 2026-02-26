import { nullOnNotFound } from "../../../utils/http";
import type { AppContext } from "../../mod";
import { NewsletterResponse } from "../../utils/types/newsletterJSON";

export interface Props {
  name: string;
  email: string;
}

const action = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<NewsletterResponse | null> => {
  const { api } = ctx;

  const response = await api["POST /shopping/newsletter.json"]({
    Name: props.name,
    Email: props.email,
    AllowReceiveNewsletter: true,
    OptIn: true,
  }, {}).then((res) => res.json()).catch(nullOnNotFound);

  return response;
};

export default action;
