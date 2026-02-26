/**
 * Shopify app module (Node.js-compatible port of deco-cx/apps/shopify/mod.ts).
 *
 * Provides the AppContext type and app factory for Shopify integration.
 */
import { type GraphQLClient } from "./utils/graphql";

export interface AppContext {
  storefront: GraphQLClient;
  admin?: GraphQLClient;
  response: { headers: Headers };
}

export interface Props {
  storeName: string;
  publicUrl?: string;
  storefrontAccessToken: string;
  adminAccessToken?: string;
  storefrontDigestCookie?: string;
  platform: "shopify";
}

export interface State extends Props {
  storefront: GraphQLClient;
  admin?: GraphQLClient;
}

export const color = 0x96bf48;
