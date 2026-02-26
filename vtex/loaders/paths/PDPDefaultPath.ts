import { DefaultPathProps } from "../../../website/pages/Page";
import { AppContext } from "../../mod";
import productList from "../legacy/productList";

export interface Props {
  count: number;
}

/**
 * @title PDP Default Path
 * @description Get paths for product details page
 */
const loader = async (
  props: unknown,
  req: Request,
  ctx: AppContext,
): Promise<DefaultPathProps | null> => {
  const { count = 5 } = props as Props;

  const response = await productList(
    {
      props: {
        term: "",
        count,
        sort: "OrderByTopSaleDESC",
      },
    },
    req,
    ctx,
  );

  const defaultPaths = response?.map((p) => {
    if (p.url) {
      const url = new URL(p.url);
      return url.href.replace(url.origin, "").substring(1).split("/p")[0];
    }
  });

  return {
    possiblePaths: defaultPaths as string[],
  };
};

export const cache = "stale-while-revalidate";

export const cacheKey = (props: Props, _req: Request, _ctx: AppContext) => {
  return `pdp-default-path-${props.count ?? 5}`;
};

export default loader;
