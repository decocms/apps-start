import { getCookies } from "../shopify/utils/cookies";
import { AppMiddlewareContext } from "./mod";
import {
  getISCookiesFromBag,
  setISCookiesBag,
} from "./utils/intelligentSearch";
import { getSegmentFromBag, setSegmentBag } from "./utils/segment";

export const middleware = (
  _props: unknown,
  req: Request,
  ctx: AppMiddlewareContext,
) => {
  const segment = getSegmentFromBag(ctx);
  const isCookies = getISCookiesFromBag(ctx);

  if (!isCookies || !segment) {
    const cookies = getCookies(req.headers);

    if (!isCookies) {
      setISCookiesBag(cookies, ctx);
    }

    if (!segment) {
      setSegmentBag(cookies, req, ctx);
    }
  }

  return ctx.next!();
};
