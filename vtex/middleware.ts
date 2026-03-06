/**
 * VTEX Middleware utilities for TanStack Start.
 *
 * Extracts segment information from cookies/URL params, detects login state,
 * propagates Intelligent Search cookies, and provides cache-control decisions.
 *
 * Use with TanStack Start's createMiddleware() in the storefront:
 *
 * @example
 * ```ts
 * import { createMiddleware } from "@tanstack/react-start";
 * import {
 *   extractVtexContext,
 *   vtexCacheControl,
 * } from "@decocms/apps/vtex/middleware";
 *
 * const vtexMiddleware = createMiddleware().server(async ({ next, request }) => {
 *   const vtexCtx = extractVtexContext(request);
 *   const response = await next();
 *   response.headers.set("Cache-Control", vtexCacheControl(vtexCtx));
 *   propagateISCookies(request, response);
 *   return response;
 * });
 * ```
 */

import {
  SEGMENT_COOKIE_NAME,
  parseSegment,
  buildSegmentFromParams,
  serializeSegment,
  DEFAULT_SEGMENT,
  type WrappedSegment,
} from "./utils/segment";
import { isVtexLoggedIn, extractVtexAuthCookie, parseVtexAuthToken } from "./utils/vtexId";
import type { Segment } from "./utils/types";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface VtexRequestContext {
  /** Decoded segment from cookie or URL params. */
  segment: Partial<Segment>;
  /** Serialized segment token for cache key use. */
  segmentToken: string;
  /** Whether the user has a valid (non-expired) VTEX auth cookie. */
  isLoggedIn: boolean;
  /** Extracted email from the auth JWT, if available. */
  email?: string;
  /** Sales channel derived from segment. */
  salesChannel: string;
  /** Whether this request carries price tables (B2B). */
  hasCustomPricing: boolean;
}

// -------------------------------------------------------------------------
// Cookie helpers
// -------------------------------------------------------------------------

const IS_COOKIE_PREFIX = "vtex_is_";

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

// -------------------------------------------------------------------------
// Core extraction
// -------------------------------------------------------------------------

/**
 * Extract VTEX context from an incoming request.
 *
 * Reads the segment cookie, URL params (utm_*, sc), and auth cookie
 * to build a complete picture of the user's VTEX session state.
 */
export function extractVtexContext(request: Request): VtexRequestContext {
  const cookies = request.headers.get("cookie") ?? "";
  const url = new URL(request.url);

  // 1. Parse segment from cookie
  const segmentCookie = getCookieValue(cookies, SEGMENT_COOKIE_NAME);
  const cookieSegment = segmentCookie ? parseSegment(segmentCookie) : null;

  // 2. Parse segment overrides from URL params
  const paramSegment = buildSegmentFromParams(url.searchParams);

  // 3. Merge: URL params override cookie values, cookie overrides defaults
  const segment: Partial<Segment> = {
    ...DEFAULT_SEGMENT,
    ...cookieSegment,
    ...paramSegment,
  };

  const segmentToken = serializeSegment(segment);

  // 4. Auth state
  const authToken = extractVtexAuthCookie(cookies);
  const authInfo = authToken ? parseVtexAuthToken(authToken) : null;

  return {
    segment,
    segmentToken,
    isLoggedIn: authInfo?.isLoggedIn ?? false,
    email: authInfo?.email,
    salesChannel: segment.channel ?? "1",
    hasCustomPricing: Boolean(
      segment.priceTables && segment.priceTables.length > 0,
    ),
  };
}

// -------------------------------------------------------------------------
// Cache control
// -------------------------------------------------------------------------

/**
 * Determine the appropriate Cache-Control header based on VTEX context.
 *
 * Rules:
 * - Logged-in users: private (personalized prices, wishlists, etc.)
 * - Custom pricing (B2B): private (price table specific)
 * - Anonymous default segment: public with CDN caching
 */
export function vtexCacheControl(
  ctx: VtexRequestContext,
  options?: {
    /** Max age for public (anonymous) responses in seconds. @default 60 */
    publicMaxAge?: number;
    /** Stale-while-revalidate for public responses in seconds. @default 3600 */
    publicSWR?: number;
  },
): string {
  if (ctx.isLoggedIn || ctx.hasCustomPricing) {
    return "private, no-cache, no-store, must-revalidate";
  }

  const maxAge = options?.publicMaxAge ?? 60;
  const swr = options?.publicSWR ?? 3600;

  return `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}, stale-if-error=86400`;
}

// -------------------------------------------------------------------------
// Cookie propagation
// -------------------------------------------------------------------------

/**
 * Propagate Intelligent Search cookies from request to response.
 *
 * VTEX IS uses cookies (vtex_is_*) for search personalization and
 * analytics. These must be forwarded from the original request to
 * the storefront response so the browser maintains them.
 */
export function propagateISCookies(
  request: Request,
  response: Response,
): void {
  const cookies = request.headers.get("cookie") ?? "";
  const pairs = cookies.split(";").map((p) => p.trim());

  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx < 0) continue;
    const name = pair.slice(0, eqIdx);
    if (name.startsWith(IS_COOKIE_PREFIX)) {
      const value = pair.slice(eqIdx + 1);
      response.headers.append(
        "Set-Cookie",
        `${name}=${value}; Path=/; SameSite=Lax`,
      );
    }
  }
}

/**
 * Build a segment cookie Set-Cookie header for the response.
 *
 * Use this when URL params change the segment (e.g., ?sc=2) so the
 * browser persists the new segment for subsequent requests.
 */
export function buildSegmentSetCookie(
  segment: Partial<Segment>,
  domain?: string,
): string {
  const token = serializeSegment(segment);
  let cookie = `${SEGMENT_COOKIE_NAME}=${token}; Path=/; SameSite=Lax; Max-Age=86400`;
  if (domain) cookie += `; Domain=${domain}`;
  return cookie;
}

// -------------------------------------------------------------------------
// Cache key helpers
// -------------------------------------------------------------------------

/**
 * Build a cache key suffix from the VTEX context.
 *
 * This is used in the Cloudflare Worker entry to differentiate cached
 * responses by segment. Two anonymous users on the same sales channel
 * get the same cache key; a logged-in user gets a unique (uncached) key.
 */
export function vtexCacheKeySuffix(ctx: VtexRequestContext): string {
  if (ctx.isLoggedIn) return "__vtex_auth";
  return `__vtex_sc=${ctx.salesChannel}`;
}

// -------------------------------------------------------------------------
// Re-exports for convenience
// -------------------------------------------------------------------------

export { isVtexLoggedIn } from "./utils/vtexId";
export type { VtexAuthInfo } from "./utils/vtexId";
export type { Segment } from "./utils/types";
