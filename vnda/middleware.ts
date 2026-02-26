import { AppMiddlewareContext } from "./mod";
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
import {
  buildSegmentCookie,
  getSegmentFromBag,
  getSegmentFromCookie,
  setSegmentCookie,
  setSegmentInBag,
} from "./utils/segment";

export const middleware = (
  _props: unknown,
  req: Request,
  ctx: AppMiddlewareContext,
) => {
  const segment = getSegmentFromBag(ctx);
  if (!segment) {
    const segmentFromRequest = buildSegmentCookie(req);
    const segmentFromCookie = getSegmentFromCookie(req);
    if (
      segmentFromRequest !== null &&
      !equal(segmentFromRequest, segmentFromCookie)
    ) {
      setSegmentInBag(ctx, segmentFromRequest);
      setSegmentCookie(segmentFromRequest, ctx.response.headers);
    }
  }
  return ctx.next!();
};
