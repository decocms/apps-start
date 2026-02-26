import { AppContext } from "../mod";
import authenticate from "../utils/authenticate";
import { GetWishlist } from "../utils/graphql/queries";
import {
  GetWishlistQuery,
  GetWishlistQueryVariables,
  WishlistReducedProductFragment,
} from "../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../utils/parseHeaders";
import { handleAuthError } from "../utils/authError";

/**
 * @title Wake Integration
 * @description Product Wishlist loader
 */
const loader = async (
  _props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<WishlistReducedProductFragment[]> => {
  const { storefront } = ctx;

  const headers = parseHeaders(req.headers);

  const customerAccessToken = await authenticate(req, ctx);

  if (!customerAccessToken) return [];

  let data: GetWishlistQuery | undefined;
  try {
    data = await storefront.query<
      GetWishlistQuery,
      GetWishlistQueryVariables
    >({
      variables: { customerAccessToken },
      ...GetWishlist,
    }, {
      headers,
    });
  } catch (error: unknown) {
    handleAuthError(error, "load wishlist");
  }

  return data?.customer?.wishlist?.products?.filter((
    p,
  ): p is WishlistReducedProductFragment => Boolean(p)) ?? [];
};

export default loader;

// User-specific wishlist data; must not be cached/shared.
export const cache = "no-store";
