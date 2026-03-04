// Client & Config
export { configureShopify, getShopifyClient, getShopifyConfig, getBaseUrl } from "./client";
export type { ShopifyConfig } from "./client";
export { initShopify, initShopifyFromBlocks } from "./init";

// Product Loaders
export { default as productListLoader } from "./loaders/ProductList";
export { default as productDetailsPageLoader } from "./loaders/ProductDetailsPage";
export { default as productListingPageLoader } from "./loaders/ProductListingPage";
export { default as relatedProductsLoader } from "./loaders/RelatedProducts";

// Cart
export { getCart, createCart } from "./loaders/cart";
export type { Cart, CartItem } from "./loaders/cart";
export { default as addItems } from "./actions/cart/addItems";
export { default as updateItems } from "./actions/cart/updateItems";
export { default as updateCoupons } from "./actions/cart/updateCoupons";

// Utils
export { getCookies, setCookie } from "./utils/cookies";
export { getCartCookie, setCartCookie } from "./utils/cart";
