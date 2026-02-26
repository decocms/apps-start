import { AppContext } from "../mod";
import { ExtensionOf } from "../../website/loaders/extension";
import { ProductDetailsPage } from "../../commerce/types";
import { addVideoToProduct } from "../utils/transform";
import { STALE } from "../../utils/fetch";

export default function productDetailsPageVideo(
  _props: unknown,
  _req: Request,
  ctx: AppContext,
): ExtensionOf<ProductDetailsPage | null> {
  const { api } = ctx;
  return async (productDetailsPage: ProductDetailsPage | null) => {
    if (!productDetailsPage) {
      return null;
    }
    const { product } = productDetailsPage;
    const { inProductGroupWithID } = product;
    const videos = await api["GET /api/v2/products/:productId/videos"]({
      productId: inProductGroupWithID as string,
    }, STALE).then((r) => r.json()).catch(() => null);
    const productWithVideo = addVideoToProduct(product, videos);
    return {
      ...productDetailsPage,
      product: productWithVideo,
    };
  };
}
