// Client & Config
export { configureShopify, getShopifyClient, getShopifyConfig, getBaseUrl, setShopifyFetch } from "./client";
export type { ShopifyConfig } from "./client";
export { initShopify, initShopifyFromBlocks } from "./init";

// Product Loaders
export { default as productListLoader } from "./loaders/ProductList";
export { default as productDetailsPageLoader } from "./loaders/ProductDetailsPage";
export { default as productListingPageLoader } from "./loaders/ProductListingPage";
export { default as relatedProductsLoader } from "./loaders/RelatedProducts";

// Cart
export { getCart, createCart } from "./loaders/cart";
export type { ShopifyCart, CartLine } from "./loaders/cart";
export { default as addItems } from "./actions/cart/addItems";
export { default as updateItems } from "./actions/cart/updateItems";
export { default as updateCoupons } from "./actions/cart/updateCoupons";

// Shop
export { default as shopLoader } from "./loaders/shop";
export type { Shop } from "./loaders/shop";

// User
export { default as userLoader } from "./loaders/user";
export type { ShopifyUser } from "./loaders/user";
export { default as signIn } from "./actions/user/signIn";
export { default as signUp } from "./actions/user/signUp";

// Cookie utils
export { getCookies, setCookie } from "./utils/cookies";
export { getCartCookie, setCartCookie } from "./utils/cart";
export { getUserCookie, setUserCookie } from "./utils/user";
