import { type createGraphqlClient } from "../../utils/graphql";
import { type AppContext } from "../mod";

export type Config = {
  storefront: ReturnType<typeof createGraphqlClient>;
  admin: ReturnType<typeof createGraphqlClient>;
};

const loader = (_props: unknown, _req: Request, ctx: AppContext): Config => ({
  storefront: ctx.storefront,
  admin: ctx.admin,
});

export default loader;
