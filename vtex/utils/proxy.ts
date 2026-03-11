/**
 * VTEX Proxy Utility.
 *
 * Proxies storefront requests for /checkout, /account, /api, /files, /arquivos
 * to the VTEX origin. Essential for checkout and My Account pages to work.
 *
 * Designed to be used with TanStack Start API routes or Cloudflare Worker
 * fetch handlers.
 */

import { getVtexConfig, vtexHost, type VtexConfig } from "../client";
import { proxySetCookie } from "./cookies";

export interface VtexProxyOptions {
  /**
   * VTEX environment suffix.
   * @default "vtexcommercestable"
   */
  environment?: "vtexcommercestable" | "vtexcommercebeta";

  /**
   * Additional path prefixes to proxy beyond the defaults.
   * Example: ["/custom-api/"]
   */
  extraPaths?: string[];

  /**
   * Paths that should NOT be proxied even if they match a prefix.
   */
  excludePaths?: string[];

  /**
   * Whether to rewrite Set-Cookie domains to the storefront's domain.
   * @default true
   */
  rewriteCookieDomain?: boolean;

  /**
   * Custom headers to inject into every proxied request.
   */
  extraHeaders?: Record<string, string>;
}

const DEFAULT_PROXY_PATHS = [
  "/checkout",
  "/checkout/",
  "/account",
  "/account/",
  "/api/",
  "/files/",
  "/arquivos/",
  "/checkout/changeToAnonymousUser/",
  "/_v/",
  "/no-cache/",
  "/graphql/",
  "/login",
  "/login/",
  "/logout",
  "/logout/",
  "/assets/",
  "/_secure/account",
  "/XMLData/",
] as const;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Returns all path prefixes that should be proxied to VTEX.
 */
export function getVtexProxyPaths(options?: VtexProxyOptions): string[] {
  return [...DEFAULT_PROXY_PATHS, ...(options?.extraPaths ?? [])];
}

/**
 * Check if a request path should be proxied to VTEX.
 */
export function shouldProxyToVtex(
  pathname: string,
  options?: VtexProxyOptions,
): boolean {
  const paths = getVtexProxyPaths(options);
  const excluded = options?.excludePaths ?? [];

  if (excluded.some((ex) => pathname.startsWith(ex))) return false;
  return paths.some((prefix) => pathname.startsWith(prefix));
}

function buildOriginUrl(
  request: Request,
  config: VtexConfig,
  environment: string,
): URL {
  const url = new URL(request.url);
  const originHost = vtexHost(environment, config);
  return new URL(`https://${originHost}${url.pathname}${url.search}`);
}

function filterHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      filtered.set(key, value);
    }
  });
  return filtered;
}

/**
 * Proxy a request to VTEX origin.
 *
 * Forwards the request with all cookies and headers, rewrites
 * Set-Cookie domains on the response, and strips hop-by-hop headers.
 *
 * @example
 * ```ts
 * // In a TanStack Start API route or catch-all handler
 * if (shouldProxyToVtex(url.pathname)) {
 *   return proxyToVtex(request);
 * }
 * ```
 */
export async function proxyToVtex(
  request: Request,
  options?: VtexProxyOptions,
): Promise<Response> {
  const config = getVtexConfig();
  const environment = options?.environment ?? "vtexcommercestable";

  const originUrl = buildOriginUrl(request, config, environment);
  const forwardHeaders = filterHeaders(new Headers(request.headers));

  forwardHeaders.set("Host", originUrl.hostname);
  forwardHeaders.set("X-Forwarded-Host", new URL(request.url).hostname);
  forwardHeaders.set("X-Forwarded-Proto", "https");

  if (options?.extraHeaders) {
    for (const [k, v] of Object.entries(options.extraHeaders)) {
      forwardHeaders.set(k, v);
    }
  }

  if (config.appKey && config.appToken) {
    forwardHeaders.set("X-VTEX-API-AppKey", config.appKey);
    forwardHeaders.set("X-VTEX-API-AppToken", config.appToken);
  }

  const init: RequestInit = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error -- needed for streaming body in Workers
    init.duplex = "half";
  }

  const originResponse = await fetch(originUrl.toString(), init);

  const responseHeaders = filterHeaders(new Headers(originResponse.headers));

  if (options?.rewriteCookieDomain !== false) {
    proxySetCookie(
      originResponse.headers,
      responseHeaders,
      new URL(request.url).origin,
    );
  }

  if (originResponse.status >= 300 && originResponse.status < 400) {
    const location = originResponse.headers.get("location");
    if (location) {
      const originVtexHost = vtexHost(environment, config);
      const storefrontOrigin = new URL(request.url).origin;
      const vtexOrigin = `https://${originVtexHost}`;
      const rewritten = location.replace(vtexOrigin, storefrontOrigin);
      responseHeaders.set("location", rewritten);
    }
  }

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: responseHeaders,
  });
}
