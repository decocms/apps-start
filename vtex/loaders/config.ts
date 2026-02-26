import { type createGraphqlClient } from "../../utils/graphql";
import { type createHttpClient } from "../../utils/http";
import { type AppContext } from "../mod";
import { type SP } from "../utils/client";
import { type OpenAPI as API } from "../utils/openapi/api.openapi.gen";
import { type OpenAPI as VCS } from "../utils/openapi/vcs.openapi.gen";
import { type OpenAPI as MY } from "../utils/openapi/my.openapi.gen";
import { type OpenAPI as VPAY } from "../utils/openapi/payments.openapi.gen";
import { type OpenAPI as SUB } from "../utils/openapi/subscriptions.openapi.gen";

export type Config = {
  sp: ReturnType<typeof createHttpClient<SP>>;
  io: ReturnType<typeof createGraphqlClient>;
  vcs: ReturnType<typeof createHttpClient<VCS>>;
  my: ReturnType<typeof createHttpClient<MY>>;
  api: ReturnType<typeof createHttpClient<API>>;
  vpay: ReturnType<typeof createHttpClient<VPAY>>;
  sub: ReturnType<typeof createHttpClient<SUB>>;
};

/**
 * @title Get Clients
 * @description Get the clients to use in the storefront
 */
const loader = (_props: unknown, _req: Request, ctx: AppContext): Config => ({
  sp: ctx.sp,
  io: ctx.io,
  my: ctx.my,
  vcs: ctx.vcs,
  api: ctx.api,
  vpay: ctx.vpay,
  sub: ctx.sub,
});

export default loader;
