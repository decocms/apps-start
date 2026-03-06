/**
 * Product Extension Pipeline.
 *
 * Composable middleware-style pipeline to enrich products after the
 * initial search/catalog fetch. Covers real-time price simulation
 * (for B2B/promotional pricing) and wishlist annotation.
 *
 * @example
 * ```ts
 * import {
 *   createProductPipeline,
 *   withSimulation,
 *   withWishlist,
 * } from "@decocms/apps/vtex/utils/enrichment";
 *
 * const enrich = createProductPipeline(
 *   withSimulation(),
 *   withWishlist(),
 * );
 *
 * const products = await vtexProductList(props);
 * const enriched = await enrich(products, { request });
 * ```
 */

import { vtexFetch, getVtexConfig, vtexIOGraphQL } from "../client";
import type { Product, Offer, AggregateOffer } from "../../commerce/types/commerce";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface EnrichmentContext {
  /** The incoming HTTP request (for cookies, auth tokens). */
  request?: Request;
  /** Sales channel override. */
  salesChannel?: string;
}

/**
 * A product enricher takes a list of products and returns an enriched list.
 * Enrichers are composed via `createProductPipeline`.
 */
export type ProductEnricher = (
  products: Product[],
  ctx: EnrichmentContext,
) => Promise<Product[]>;

// -------------------------------------------------------------------------
// Pipeline
// -------------------------------------------------------------------------

/**
 * Compose multiple enrichers into a single pipeline.
 *
 * Enrichers run sequentially -- each receives the output of the previous.
 * This is intentional: some enrichers depend on previous enrichments
 * (e.g., wishlist may need SKU IDs added by simulation).
 */
export function createProductPipeline(
  ...enrichers: ProductEnricher[]
): ProductEnricher {
  return async (products, ctx) => {
    if (!products.length) return products;

    let result = products;
    for (const enricher of enrichers) {
      try {
        result = await enricher(result, ctx);
      } catch (error) {
        console.error(
          `[ProductPipeline] Enricher failed, continuing with unenriched data:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    return result;
  };
}

// -------------------------------------------------------------------------
// Simulation Enricher
// -------------------------------------------------------------------------

interface SimulationItem {
  itemIndex: number;
  id: string;
  quantity: number;
  seller: string;
}

interface SimulationResult {
  items: Array<{
    itemIndex: number;
    listPrice: number;
    sellingPrice: number;
    price: number;
    availability: string;
    quantity: number;
  }>;
}

/**
 * Enrich products with real-time prices from VTEX simulation API.
 *
 * The search index may have stale prices. Simulation returns the
 * actual price the user would pay, accounting for promotions,
 * trade policies, price tables, and regional pricing.
 *
 * @param options.batchSize - Max products per simulation call. @default 50
 */
export function withSimulation(
  options?: { batchSize?: number },
): ProductEnricher {
  const batchSize = options?.batchSize ?? 50;

  return async (products, ctx) => {
    const config = getVtexConfig();
    const sc = ctx.salesChannel ?? config.salesChannel ?? "1";

    const skuItems: SimulationItem[] = [];
    const skuToProductIndex = new Map<string, { productIdx: number; offerIdx: number }>();

    for (let pi = 0; pi < products.length; pi++) {
      const product = products[pi];
      const aggOffer = product.offers;
      if (!aggOffer?.offers) continue;

      for (let oi = 0; oi < aggOffer.offers.length; oi++) {
        const offer = aggOffer.offers[oi];
        const skuId = offer.sku ?? product.sku;
        const seller = offer.seller ?? "1";

        if (skuId) {
          skuItems.push({
            itemIndex: skuItems.length,
            id: skuId,
            quantity: 1,
            seller,
          });
          skuToProductIndex.set(`${skuId}-${seller}`, { productIdx: pi, offerIdx: oi });
        }
      }
    }

    if (!skuItems.length) return products;

    const result = [...products];
    const batches: SimulationItem[][] = [];
    for (let i = 0; i < skuItems.length; i += batchSize) {
      batches.push(skuItems.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        const sim = await vtexFetch<SimulationResult>(
          `/api/checkout/pub/orderForms/simulation?sc=${sc}`,
          {
            method: "POST",
            body: JSON.stringify({
              items: batch,
              country: config.country ?? "BRA",
            }),
          },
        );

        for (const simItem of sim.items) {
          const original = batch[simItem.itemIndex];
          if (!original) continue;

          const key = `${original.id}-${original.seller}`;
          const mapping = skuToProductIndex.get(key);
          if (!mapping) continue;

          const product = { ...result[mapping.productIdx] };
          const aggOffer = product.offers;
          if (!aggOffer) continue;

          const offers = [...aggOffer.offers];
          const offer = { ...offers[mapping.offerIdx] };

          offer.price = simItem.sellingPrice / 100;
          offer.availability = simItem.availability === "available"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock";

          offers[mapping.offerIdx] = offer;
          product.offers = { ...aggOffer, offers };
          result[mapping.productIdx] = product;
        }
      } catch (error) {
        console.error("[Simulation] Batch failed:", error instanceof Error ? error.message : error);
      }
    }

    return result;
  };
}

// -------------------------------------------------------------------------
// Wishlist Enricher
// -------------------------------------------------------------------------

const WISHLIST_QUERY = `query GetWishlist($shopperId: String!, $name: String!, $from: Int!, $to: Int!) {
  viewList(shopperId: $shopperId, name: $name, from: $from, to: $to)
    @context(provider: "vtex.wish-list@1.x") {
    data {
      id
      productId
      sku
    }
  }
}`;

interface WishlistData {
  viewList: {
    data: Array<{ id: string; productId: string; sku: string }> | null;
  };
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

/**
 * Enrich products with wishlist status.
 *
 * Reads the user's wishlist and adds `isInWishlist: true` as an
 * additionalProperty on products that are wishlisted.
 *
 * Requires the user to be logged in (reads VtexIdclientAutCookie).
 * For anonymous users, this is a no-op.
 */
export function withWishlist(): ProductEnricher {
  return async (products, ctx) => {
    if (!ctx.request) return products;

    const cookies = ctx.request.headers.get("cookie") ?? "";
    const authCookie = getCookieValue(cookies, "VtexIdclientAutCookie");
    if (!authCookie) return products;

    let email: string | undefined;
    try {
      const parts = authCookie.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        email = payload.sub ?? payload.userId;
      }
    } catch {
      return products;
    }

    if (!email) return products;

    try {
      const data = await vtexIOGraphQL<WishlistData>(
        { query: WISHLIST_QUERY, variables: { shopperId: email, name: "Wishlist", from: 0, to: 500 } },
        { Cookie: `VtexIdclientAutCookie=${authCookie}` },
      );

      const wishlistItems = data.viewList?.data ?? [];
      const wishlistSkus = new Set(wishlistItems.map((i) => i.sku));
      const wishlistProductIds = new Set(wishlistItems.map((i) => i.productId));

      return products.map((product) => {
        const isWishlisted =
          (product.sku && wishlistSkus.has(product.sku)) ||
          (product.productID && wishlistProductIds.has(product.productID));

        if (!isWishlisted) return product;

        return {
          ...product,
          additionalProperty: [
            ...(product.additionalProperty ?? []),
            {
              "@type": "PropertyValue" as const,
              name: "isInWishlist",
              value: "true",
              propertyID: "WISHLIST",
            },
          ],
        };
      });
    } catch (error) {
      console.error("[Wishlist] Failed to fetch wishlist:", error instanceof Error ? error.message : error);
      return products;
    }
  };
}
