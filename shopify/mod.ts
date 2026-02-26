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

// Type stubs for deco framework types (used by ported files)
export type SectionProps<T = any> = T;
export type WorkflowContext = any;
export type Workflow = any;
export type AppRuntime = any;
export type BaseContext = any;
export const Context = { active: () => ({}) } as any;
export function useScriptAsDataURI(...args: any[]): string { return ""; }
export function logger(...args: any[]) { return { error: console.error, warn: console.warn, info: console.info }; }
