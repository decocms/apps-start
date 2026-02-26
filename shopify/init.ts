import { configureShopify } from "./client";
import { loadBlocks } from "@decocms/start/cms";

let initialized = false;

export function initShopifyFromBlocks() {
  if (initialized) return;

  const blocks = loadBlocks();

  const shopifyBlock = blocks["deco-shopify"] as Record<string, any> | undefined;
  if (!shopifyBlock) {
    console.warn("[Commerce] No deco-shopify.json block found. Shopify integration disabled.");
    return;
  }

  const storeName = shopifyBlock.storeName;
  const storefrontAccessToken = shopifyBlock.storefrontAccessToken;

  if (!storeName || !storefrontAccessToken) {
    console.warn("[Commerce] Shopify block missing storeName or storefrontAccessToken.");
    return;
  }

  console.log(`[Commerce] Initializing Shopify: ${storeName}.myshopify.com`);
  configureShopify({ storeName, storefrontAccessToken });
  initialized = true;
}
