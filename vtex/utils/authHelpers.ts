/**
 * VTEX auth helpers — pure functions for cookie extraction, JWT parsing,
 * Set-Cookie forwarding, and logout.
 *
 * These are consumed by site-level createServerFn wrappers in invoke.ts.
 * createServerFn itself must live in site source (not node_modules) because
 * TanStack Start's Vite plugin only transforms source files.
 */
import { getVtexConfig } from "../client";

const DOMAIN_RE = /;\s*domain=[^;]*/gi;

const VTEX_COOKIE_PREFIXES = [
  "vtex_session=",
  "vtex_segment=",
  "VtexIdclientAutCookie",
  "checkout.vtex.com",
  "CheckoutOrderFormOwnership",
];

/**
 * Extract VTEX-relevant cookies from a raw Cookie header string.
 * Filters out analytics/CF cookies that can cause VTEX 503 errors.
 */
export function extractVtexCookiesFromHeader(raw: string): string {
  return raw
    .split(";")
    .map((c) => c.trim())
    .filter((c) => VTEX_COOKIE_PREFIXES.some((prefix) => c.startsWith(prefix)))
    .join("; ");
}

/**
 * Strip Domain= from Set-Cookie headers so cookies are associated
 * with the storefront domain instead of the VTEX domain.
 */
export function stripCookieDomain(cookies: string[]): string[] {
  return cookies.map((c) => c.replace(DOMAIN_RE, ""));
}

/** Standard VTEX cookies to expire on logout. */
export const VTEX_LOGOUT_COOKIES = [
  "checkout.vtex.com=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
  "CheckoutOrderFormOwnership=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
  "checkout.vtex.com__orderFormId=; Path=/; Max-Age=0",
  "vtex_session=; Path=/; Max-Age=0",
  "vtex_segment=; Path=/; Max-Age=0",
];

/**
 * Perform VTEX logout — calls the VTEX ID logout endpoint and returns
 * the Set-Cookie headers (with domain stripped) to expire auth cookies.
 */
export async function performVtexLogout(cookies: string): Promise<{ setCookies: string[] }> {
  const config = getVtexConfig();
  const domain = config.domain ?? "com.br";
  const logoutUrl = `https://${config.account}.vtexcommercestable.${domain}/api/vtexid/pub/logout?scope=${config.account}&returnUrl=/`;

  const res = await fetch(logoutUrl, {
    method: "GET",
    headers: { cookie: cookies },
    redirect: "manual",
  });

  const upstreamCookies = res.headers.getSetCookie?.() ?? [];

  return {
    setCookies: [
      ...stripCookieDomain(upstreamCookies),
      ...VTEX_LOGOUT_COOKIES,
    ],
  };
}

/**
 * Parse VTEX auth JWT to extract email and userId.
 * Reads the VtexIdclientAutCookie_* cookie from a raw Cookie header.
 */
export function parseVtexAuthJwt(rawCookies: string): { email: string; userId: string } | null {
  try {
    const match = rawCookies.match(/VtexIdclientAutCookie_[^=]+=([^;]+)/);
    if (!match) return null;
    const token = match[1];
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf-8"),
    );
    if (!payload.sub) return null;
    return { email: payload.sub, userId: payload.userId ?? "" };
  } catch {
    return null;
  }
}
