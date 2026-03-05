/**
 * VTEX Cart (OrderForm) loader.
 * Pure async function — requires configureVtex() to have been called.
 *
 * Ported from deco-cx/apps:
 *   vtex/loaders/cart.ts
 *
 * @see https://developers.vtex.com/docs/api-reference/checkout-api#get-/api/checkout/pub/orderForm
 */
import { vtexFetch, getVtexConfig } from "../client";
import type { OrderForm } from "../utils/types";
import { forceHttpsOnAssets } from "../utils/transform";

/**
 * Fetch the current cart (OrderForm).
 *
 * When `orderFormId` is provided the existing cart is retrieved;
 * otherwise a fresh OrderForm is created via POST.
 *
 * @param orderFormId - Optional existing orderForm ID (from checkout cookie)
 * @param salesChannel - Optional sales channel override
 * @param authCookie - Optional cookie string for authenticated requests
 */
export async function getCart(
  orderFormId?: string,
  opts?: { salesChannel?: string; authCookie?: string },
): Promise<OrderForm> {
  const { salesChannel } = getVtexConfig();
  const sc = opts?.salesChannel ?? salesChannel;
  const headers: Record<string, string> = {};
  if (opts?.authCookie) headers.cookie = opts.authCookie;

  const scParam = sc ? `?sc=${sc}` : "";

  const cart = orderFormId
    ? await vtexFetch<OrderForm>(
        `/api/checkout/pub/orderForm/${orderFormId}${scParam}`,
        { method: "POST", headers },
      )
    : await vtexFetch<OrderForm>(
        `/api/checkout/pub/orderForm${scParam}`,
        { method: "POST", headers },
      );

  return forceHttpsOnAssets(cart);
}
