/**
 * Shim for apps/commerce/types.ts
 * Re-exports from the canonical commerce types, plus local aliases
 * for names that the Deco storefront components expect.
 */
export type {
  ImageObject,
  SiteNavigationElement,
  PropertyValue,
  UnitPriceSpecification,
  AggregateOffer,
  Offer,
  Teasers as Teaser,
  Brand,
  Review,
  AggregateRating,
  Product,
  ProductGroup,
  BreadcrumbList,
  FilterRange,
  FilterToggleValue,
  FilterToggle,
  FilterRange as FilterRangeObj,
  Filter,
  SortOption,
  PageInfo,
  ProductListingPage,
  ProductDetailsPage,
  Suggestion,
  Search,
} from "../../commerce/types/commerce";
