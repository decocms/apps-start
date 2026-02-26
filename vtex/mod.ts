import { createGraphqlClient } from "../utils/graphql";
import { createHttpClient } from "../utils/http";
import workflow from "../workflows/mod";
import manifest, { Manifest } from "./manifest.gen";
import { middleware } from "./middleware";
import { SP, VTEXCommerceStable } from "./utils/client";
import { fetchSafe } from "./utils/fetchVTEX";
import { OpenAPI as VCS } from "./utils/openapi/vcs.openapi.gen";
import { OpenAPI as API } from "./utils/openapi/api.openapi.gen";
import { OpenAPI as MY } from "./utils/openapi/my.openapi.gen";
import { OpenAPI as VPAY } from "./utils/openapi/payments.openapi.gen";
import { OpenAPI as SUB } from "./utils/openapi/subscriptions.openapi.gen";
import { Segment } from "./utils/types";
import type { Secret } from "../website/loaders/secret";
import { removeDirtyCookies } from "../utils/normalize";
import { Markdown } from "../decohub/components/Markdown";
import { PreviewVtex } from "./preview/Preview";
import {
  type App as A,
  type AppContext as AC,
  type AppMiddlewareContext as AMC,
  type AppRuntime,
  type ManifestOf,
} from "../shopify/mod";
import { Suggestion } from "../commerce/types";
export type App = ReturnType<typeof VTEX>;
export type AppContext = AC<App>;
export type AppManifest = ManifestOf<App>;
export type AppMiddlewareContext = AMC<App>;
export type SegmentCulture = Omit<
  Partial<Segment>,
  | "utm_medium"
  | "utm_campaign"
  | "utm_source"
  | "utmi_campaign"
  | "utmi_part"
  | "utmi_page"
  | "campaigns"
  | "priceTables"
  | "regionId"
>;
/** @title VTEX */
export interface Props {
  /**
   * @description VTEX Account name. For more info, read here: https://help.vtex.com/en/tutorial/o-que-e-account-name--i0mIGLcg3QyEy8OCicEoC.
   */
  account: string;
  /**
   * @title Public store URL
   * @description Domain that is registered on License Manager (e.g: secure.mystore.com.br) to enable account/checkout/api proxy. Important: dont use the same domain as the public store url, or it will create a loop and break the app.
   */
  publicUrl: string;
  /**
   * @title App Key
   * @description Only required for extra features
   */
  appKey?: Secret;
  /**
   * @title App Token
   * @description Only required for extra features
   * @format password
   */
  appToken?: Secret;
  /**
   * @title Default Sales Channel
   * @description (Use defaultSegment instead)
   * @deprecated
   */
  salesChannel?: string;
  /**
   * @title Default Segment
   */
  /**
   * @title Set Refresh Token
   * @description Set the refresh token in the cookies in headless login actions (actions/authentication/*)
   * @default false
   */
  setRefreshToken?: boolean;
  defaultSegment?: SegmentCulture;
  usePortalSitemap?: boolean;
  /**
   * @description Use VTEX as backend platform
   * @default vtex
   * @hide true
   */
  platform: "vtex";

  advancedConfigs?: {
    doNotFetchVariantsForRelatedProducts?: boolean;
    /**
     * @title Remove UTM from cache key
     * @description Remove UTM from cache key to prevent cache fragmentation.
     */
    removeUTMFromCacheKey?: boolean;
  };

  /**
   * @title Cached Search Terms
   * @description List of search terms that should be cached. By default, search results are not cached.
   */
  cachedSearchTerms?: {
    /**
     * @title Terms
     * @description List of search terms that should be cached. Use the top searches loader to get the terms.
     */
    terms?: Suggestion;
    /**
     * @title Extra Paths
     * @description List of extra terms that should be cached.
     */
    extraTerms?: string[];
  };
}
export const color = 0xf71963;
/**
 * @appName vtex
 * @title VTEX
 * @description Power your store with product, inventory, and checkout tools from VTEX.
 * @category Ecommmerce
 * @logo https://assets.decocache.com/mcp/0d6e795b-cefd-4853-9a51-93b346c52c3f/VTEX.svg
 */
export default function VTEX(
  { appKey, appToken, account, publicUrl: _publicUrl, salesChannel, ...props }:
    Props,
) {
  const publicUrl = _publicUrl?.startsWith("https://")
    ? _publicUrl
    : `https://${_publicUrl}`;
  const headers = new Headers();
  appKey &&
    headers.set(
      "X-VTEX-API-AppKey",
      typeof appKey === "string" ? appKey : appKey?.get?.() ?? "",
    );
  appToken &&
    headers.set(
      "X-VTEX-API-AppToken",
      typeof appToken === "string" ? appToken : appToken?.get?.() ?? "",
    );
  const sp = createHttpClient<SP>({
    base: `https://sp.vtex.com`,
    processHeaders: removeDirtyCookies,
    fetcher: fetchSafe,
  });
  const my = createHttpClient<MY>({
    base: `https://${account}.myvtex.com/`,
    processHeaders: removeDirtyCookies,
    fetcher: fetchSafe,
  });
  const vcsDeprecated = createHttpClient<VTEXCommerceStable>({
    base: publicUrl,
    processHeaders: removeDirtyCookies,
    fetcher: fetchSafe,
  });
  const ioUrl = publicUrl.endsWith("/")
    ? `${publicUrl}api/io/_v/private/graphql/v1`
    : `${publicUrl}/api/io/_v/private/graphql/v1`;
  const io = createGraphqlClient({
    endpoint: ioUrl,
    processHeaders: removeDirtyCookies,
    fetcher: fetchSafe,
  });
  const vcs = createHttpClient<VCS>({
    base: publicUrl,
    fetcher: fetchSafe,
    processHeaders: removeDirtyCookies,
    headers: headers,
  });
  const api = createHttpClient<API>({
    base: `https://api.vtex.com/${account}`,
    fetcher: fetchSafe,
    processHeaders: removeDirtyCookies,
    headers: headers,
  });
  const vpay = createHttpClient<VPAY>({
    base: `https://${account}.vtexpayments.com.br`,
    fetcher: fetchSafe,
    processHeaders: removeDirtyCookies,
    headers: headers,
  });
  const sub = createHttpClient<SUB>({
    base: `https://${account}.vtexcommercestable.com.br`,
    processHeaders: removeDirtyCookies,
    fetcher: fetchSafe,
    headers: headers,
  });

  const cachedSearchTerms = [
    ...(props.cachedSearchTerms?.terms?.searches ?? []).map((search) =>
      search.term
    ),
    ...(props.cachedSearchTerms?.extraTerms ?? []),
  ];

  const state = {
    ...props,
    salesChannel: salesChannel ?? "1",
    account,
    publicUrl,
    vcsDeprecated,
    sp,
    io,
    vcs,
    my,
    api,
    vpay,
    sub,
    cachedSearchTerms,
  };
  const app: A<Manifest, typeof state, [
    ReturnType<typeof workflow>,
  ]> = {
    state,
    manifest,
    middleware,
    dependencies: [workflow({})],
  };
  return app;
}
export const preview = async (props: AppRuntime) => {
  const markdownContent = await Markdown(
    new URL("./README.md", import.meta.url).href,
  );
  return {
    Component: PreviewVtex,
    props: {
      ...props,
      markdownContent,
    },
  };
};
