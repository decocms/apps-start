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
  SALES_CHANNEL_COOKIE,
  parseSegment,
  buildSegmentFromParams,
  serializeSegment,
  DEFAULT_SEGMENT,
  type WrappedSegment,
} from "./utils/segment";
import { SESSION_COOKIE, ANONYMOUS_COOKIE } from "./utils/intelligentSearch";
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
  /**
   * VTEX region ID from the segment cookie.
   * Present when the user has set a postal code (CEP) for regionalization.
   * Null when no region is set (anonymous default segment).
   */
  regionId: string | null;
  /** Whether this request carries price tables (B2B). */
  hasCustomPricing: boolean;
  /** Intelligent Search session cookie. */
  isSessionId: string;
  /** Intelligent Search anonymous cookie. */
  isAnonymousId: string;
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
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function extractVtexContext(request: Request): VtexRequestContext {
  const cookies = request.headers.get("cookie") ?? "";
  const url = new URL(request.url);

  const segmentCookie = getCookieValue(cookies, SEGMENT_COOKIE_NAME);
  const cookieSegment = segmentCookie ? parseSegment(segmentCookie) : null;

  const paramSegment = buildSegmentFromParams(url.searchParams);

  const vtexsc = getCookieValue(cookies, SALES_CHANNEL_COOKIE);

  const segment: Partial<Segment> = {
    ...DEFAULT_SEGMENT,
    ...cookieSegment,
    ...paramSegment,
  };
  if (vtexsc) segment.channel = vtexsc;

  const segmentToken = serializeSegment(segment);

  const authToken = extractVtexAuthCookie(cookies);
  const authInfo = authToken ? parseVtexAuthToken(authToken) : null;

  const isSessionId = getCookieValue(cookies, SESSION_COOKIE) ?? generateUUID();
  const isAnonymousId = getCookieValue(cookies, ANONYMOUS_COOKIE) ?? generateUUID();

  return {
    segment,
    segmentToken,
    isLoggedIn: authInfo?.isLoggedIn ?? false,
    email: authInfo?.email,
    salesChannel: segment.channel ?? "1",
    regionId: segment.regionId ?? null,
    hasCustomPricing: Boolean(
      segment.priceTables && segment.priceTables.length > 0,
    ),
    isSessionId,
    isAnonymousId,
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
 * Ensure Intelligent Search cookies exist on the response.
 *
 * If the browser already has them, they are forwarded as-is.
 * If not, new UUIDs from the context are set. This ensures
 * every user has IS cookies for personalization and analytics.
 */
export function propagateISCookies(
  ctx: VtexRequestContext,
  response: Response,
): void {
  const maxAge = 365 * 24 * 60 * 60;
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${ctx.isSessionId}; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
  );
  response.headers.append(
    "Set-Cookie",
    `${ANONYMOUS_COOKIE}=${ctx.isAnonymousId}; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
  );
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
  const parts = [`sc=${ctx.salesChannel}`];
  if (ctx.regionId) parts.push(`r=${ctx.regionId}`);
  return `__vtex_${parts.join("_")}`;
}

// -------------------------------------------------------------------------
// Re-exports for convenience
// -------------------------------------------------------------------------

export { isVtexLoggedIn } from "./utils/vtexId";
export type { VtexAuthInfo } from "./utils/vtexId";
export type { Segment } from "./utils/types";
