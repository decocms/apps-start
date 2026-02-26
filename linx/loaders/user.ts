import type { AppContext } from "../../linx/mod";
import { toLinxHeaders } from "../utils/headers";
import { UserResponse } from "../utils/types/userJSON";

/**
 * @title Linx Integration
 * @description User loader
 */
const loader = async (
  _props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<UserResponse | null> => {
  const { api } = ctx;

  const response = await api["GET /Shopping/Shopper"]({}, {
    headers: toLinxHeaders(req.headers),
  });

  if (response === null) {
    return null;
  }

  const user = await response.json();

  if (!user) {
    throw new Error("Could not retrieve User");
  }

  if (!user.IsAuthenticated) {
    return null;
  }

  return user;
};

export default loader;
