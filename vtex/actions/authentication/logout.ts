import { getCookies, setCookie } from "../../shopify/utils/cookies";
import { AppContext } from "../../mod";
import { parseCookie } from "../../utils/vtexId";

/**
 * @title Logout
 * @description Logout the user
 */
export default async function action(
  _: unknown,
  req: Request,
  ctx: AppContext,
) {
  const cookies = getCookies(req.headers);
  const { payload } = parseCookie(req.headers, ctx.account);

  for (const cookieName in cookies) {
    if (cookieName.startsWith("VtexIdclientAutCookie")) {
      setCookie(ctx.response.headers, {
        name: cookieName,
        value: "",
        expires: new Date(0),
        path: "/",
      });
    }
  }

  const sessionId = payload?.sess;
  if (!sessionId) {
    return;
  }

  await ctx.invoke.vtex.actions.session.deleteSession({ sessionId });
}
