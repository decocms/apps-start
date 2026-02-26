import { proxySetCookie } from "../../utils/cookie";
import type { AppContext } from "../mod";
import { toLinxHeaders } from "../utils/headers";
import { LoginResponse } from "../utils/types/login";

export interface Props {
  username: string;
  password: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<LoginResponse | null> => {
  const response = await ctx.api["POST /web-api/v1/Profile/Account/Login"]({}, {
    body: {
      Key: props.username,
      Password: props.password,
    },
    headers: toLinxHeaders(req.headers),
  });

  if (response === null || !response.ok) {
    ctx.response.status = 400;
    return null;
  }

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  const data = await response.json();

  if (!data.IsValid) {
    console.error("Could not perform Login:", data.Errors);
    return null;
  }

  return data;
};

export default action;
