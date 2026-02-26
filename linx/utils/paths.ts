import { API } from "./client";
import { WebPage as ProductWebPage } from "./types/productJSON";
import { WebPage as GridProductsWebPage } from "./types/gridProductsJSON";
import { WebPage as SuggestionsWebPage } from "./types/suggestionsJSON";
import { WebPage as AuctionWebPage } from "./types/auctionJSON";
import { WebPage as AuctionDetailWebPage } from "./types/auctionDetailJSON";

export const isProductModel = (
  page: API["GET /*splat"]["response"],
): page is ProductWebPage => page.PageInfo.RouteClass.includes("-product-");

export const isGridProductsModel = (
  page: API["GET /*splat"]["response"],
): page is GridProductsWebPage =>
  page.PageInfo.SectionClass === "grid-products";

export const isSuggestionModel = (
  page: API["GET /*splat"]["response"],
): page is SuggestionsWebPage =>
  page.PageInfo.RouteClass === "SearchSuggestRoute";

export const isAuctionModel = (
  page: API["GET /*splat"]["response"],
): page is AuctionWebPage => page.PageInfo.RouteClass === "ProductAuctionRoute";

export const isAuctionDetailModel = (
  page: API["GET /*splat"]["response"],
): page is AuctionDetailWebPage =>
  page.PageInfo.RouteClass === "ProductAuctionDetailRoute";
