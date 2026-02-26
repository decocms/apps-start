import { AppContext } from "../../mod";
import authenticate from "../../utils/authenticate";
import { WishlistAddProduct } from "../../utils/graphql/queries";
import { ProductFragment } from "../../utils/graphql/storefront.graphql.gen";
import {
  WishlistAddProductMutation,
  WishlistAddProductMutationVariables,
  WishlistReducedProductFragment,
} from "../../utils/graphql/storefront.graphql.gen";
import { parseHeaders } from "../../utils/parseHeaders";

export interface Props {
  productId: number;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<WishlistReducedProductFragment[] | null> => {
  const { storefront } = ctx;
  const { productId } = props;
  const customerAccessToken = await authenticate(req, ctx);
  const headers = parseHeaders(req.headers);

  if (!customerAccessToken) return [];

  const data = await storefront.query<
    WishlistAddProductMutation,
    WishlistAddProductMutationVariables
  >({
    variables: { customerAccessToken, productId },
    ...WishlistAddProduct,
  }, { headers });

  const products = data.wishlistAddProduct;

  if (!Array.isArray(products)) {
    return null;
  }

  return products
    .filter((node): node is ProductFragment => Boolean(node))
    .map(({ productId, productName }) => ({
      productId,
      productName,
    }));
};

export default action;
