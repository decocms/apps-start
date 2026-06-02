/**
 * Magento cart loader — fetches the customer's active cart by cookie.
 *
 * Reads the `dataservices_cart_id` cookie from the request, calls the
 * Magento admin REST endpoint, and returns the cart payload. Returns
 * `null` when no cart cookie is present (anonymous visitor — expected).
 *
 * This is a minimal port of `deco-cx/apps/magento/loaders/cart.ts`.
 * It omits, for now, the image-handling pipeline (`handleCartImages`)
 * and the cart-items-with-images transform. Those depend on
 * `utils/cache.ts` and `utils/cart.ts` from the original — both
 * pending ports (see magento/README.md).
 */
import { getCookies } from "@decocms/start/sdk/cookie";
import { getMagentoConfig, magentoFetch } from "../client";
import type { MagentoCart } from "../types";

const CART_COOKIE = "dataservices_cart_id";

function readCartIdFromCookie(headers: Headers): string | null {
  const cookies = getCookies(headers);
  const raw = cookies[CART_COOKIE];
  if (!raw) return null;
  // Magento sets the cookie as `"<id>"` (JSON-encoded). Try to parse;
  // fall back to the raw string if it isn't quoted.
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

export interface CartLoaderProps {
  /** Override the cart id (used by checkout flows that already know it). */
  cartId?: string;
}

export default async function cart(
  props: CartLoaderProps | undefined,
  req: Request,
): Promise<MagentoCart | null> {
  const cartId = props?.cartId ?? readCartIdFromCookie(req.headers);
  if (!cartId) return null;

  const { site, useSuffix } = getMagentoConfig();
  const suffix = useSuffix ? "_suffix" : "";
  // cartId comes from the request cookie and is user-controlled. Encode
  // it before splicing into the admin REST path so it can't break out of
  // the path segment (and can't tack on query/fragment parts that hit a
  // different endpoint with the privileged Bearer token).
  const path = `/${encodeURIComponent(site)}/V1/carts/${encodeURIComponent(cartId)}${suffix}`;

  const res = await magentoFetch(path);
  if (!res.ok) {
    if (res.status === 404) return null; // expired/invalid cart cookie
    throw new Error(`[Magento] cart loader: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as MagentoCart;
}
