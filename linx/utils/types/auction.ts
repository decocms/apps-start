export { type ProductAuction } from "./auctionJSON";
import { Filter } from "../../../commerce/types";
import { ProductAuction } from "./auctionJSON";

export interface AuctionListingPage {
  products: ProductAuction[];
  facets: Filter[];
  pageCount: number;
  pageIndex: number;
  pageNumber: number;
}
