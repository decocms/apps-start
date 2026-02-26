import { createGraphqlClient, type GraphQLClient } from "./utils/graphql";

export interface ShopifyConfig {
  storeName: string;
  storefrontAccessToken: string;
  publicUrl?: string;
}

let _client: GraphQLClient | null = null;
let _config: ShopifyConfig | null = null;

export function configureShopify(config: ShopifyConfig) {
  _config = config;
  _client = createGraphqlClient(
    `https://${config.storeName}.myshopify.com/api/2025-04/graphql.json`,
    {
      "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken,
    }
  );
}

export function getShopifyClient(): GraphQLClient {
  if (!_client || !_config) {
    throw new Error(
      "Shopify not configured. Call configureShopify() first or check deco-shopify.json block."
    );
  }
  return _client;
}

export function getShopifyConfig(): ShopifyConfig {
  if (!_config) {
    throw new Error("Shopify not configured.");
  }
  return _config;
}

export function getBaseUrl(): string {
  return _config?.publicUrl || "";
}
