import type { SiteNavigationElement } from "../../commerce/types";
import { STALE } from "../../utils/fetch";
import { AppContext } from "../mod";
import { categoryTreeToNavbar } from "../utils/transform";

export interface Props {
  /**
   * @description Number of levels of categories to be returned
   *  @default 2
   */
  levels?: number;
}

/**
 * @title Get Navbar
 * @description Get the navbar, return the categories formatted as SiteNavigationElement
 */
const loader = async (
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<SiteNavigationElement[] | null> => {
  const { vcsDeprecated } = ctx;
  const { levels = 2 } = props;

  const tree = await vcsDeprecated
    ["GET /api/catalog_system/pub/category/tree/:level"](
      { level: levels },
      STALE,
    ).then((res) => res.json());

  return categoryTreeToNavbar(tree);
};

/** TODO (@igorbrasileiro): implement stale-while-revalidate */
// This cache is used by compat/std/vtex/loaders/navbar.ts
export const cache = "no-cache";

export default loader;
