/**
 * VTEX API Client for TanStack Start.
 * Uses VTEX's public REST APIs (Intelligent Search + Catalog + Checkout).
 */

import { fetchWithCache, type FetchCacheOptions } from "./utils/fetchCache";

// ---------------------------------------------------------------------------
// URL sanitization (ported from deco-cx/apps vtex/utils/fetchVTEX.ts)
// ---------------------------------------------------------------------------

const removeNonLatin1Chars = (str: string): string =>
  str.replace(/[^\x00-\x7F]|["']/g, "");

const removeScriptChars = (str: string): string => {
  return str
    .replace(/\+/g, "")
    .replaceAll(" ", "")
    .replace(/[\[\]{}()<>]/g, "")
    .replace(/[\/\\]/g, "")
    .replace(/\./g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

function sanitizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  const QS_TO_SANITIZE = ["utm_campaign", "utm_medium", "utm_source", "map"];
  for (const qs of QS_TO_SANITIZE) {
    if (url.searchParams.has(qs)) {
      const values = url.searchParams.getAll(qs);
      url.searchParams.delete(qs);
      for (const v of values) {
        const sanitized = removeScriptChars(removeNonLatin1Chars(v));
        if (sanitized) url.searchParams.append(qs, sanitized);
      }
    }
  }

  const QS_TO_ENCODE = ["ft"];
  for (const qs of QS_TO_ENCODE) {
    if (url.searchParams.has(qs)) {
      const values = url.searchParams.getAll(qs);
      url.searchParams.delete(qs);
      for (const v of values) {
        url.searchParams.append(qs, encodeURIComponent(v.trim()));
      }
    }
  }

  return url.toString();
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface VtexConfig {
  account: string;
  publicUrl?: string;
  salesChannel?: string;
  locale?: string;
  appKey?: string;
  appToken?: string;
  /**
   * ISO 3166-1 alpha-3 country code used for simulation/checkout.
   * @default "BRA"
   */
  country?: string;
  /**
   * VTEX domain suffix. Override for non-standard VTEX environments.
   * @default "com.br"
   */
  domain?: string;
}

let _config: VtexConfig | null = null;
let _fetch: typeof fetch = globalThis.fetch;

export function configureVtex(config: VtexConfig) {
  _config = config;
  console.log(`[VTEX] Configured: ${config.account}.vtexcommercestable.com.br`);
}

/**
 * Override the fetch function used by all VTEX client calls.
 * Use this to plug in instrumented fetch for logging/tracing.
 *
 * @example
 * ```ts
 * import { createInstrumentedFetch } from "@decocms/start/sdk/instrumentedFetch";
 * import { setVtexFetch } from "@decocms/apps/vtex";
 * setVtexFetch(createInstrumentedFetch("vtex"));
 * ```
 */
export function setVtexFetch(fetchFn: typeof fetch) {
  _fetch = fetchFn;
}

export function getVtexConfig(): VtexConfig {
  if (!_config) throw new Error("VTEX not configured. Call configureVtex() first.");
  return _config;
}

/**
 * Build the VTEX hostname for a given environment.
 * Centralizes `{account}.{env}.{domain}` so nothing is hardcoded.
 */
export function vtexHost(
  environment: string = "vtexcommercestable",
  config?: VtexConfig,
): string {
  const c = config ?? getVtexConfig();
  const domain = c.domain ?? "com.br";
  return `${c.account}.${environment}.${domain}`;
}

function baseUrl(): string {
  return `https://${vtexHost()}`;
}

function isUrl(): string {
  return `https://${vtexHost()}/api/io/_v/api/intelligent-search`;
}

function authHeaders(): Record<string, string> {
  const c = getVtexConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (c.appKey && c.appToken) {
    headers["X-VTEX-API-AppKey"] = c.appKey;
    headers["X-VTEX-API-AppToken"] = c.appToken;
  }
  return headers;
}

export async function vtexFetchResponse(path: string, init?: RequestInit): Promise<Response> {
  const raw = path.startsWith("http") ? path : `${baseUrl()}${path}`;
  const url = sanitizeUrl(raw);
  const response = await _fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`VTEX API error: ${response.status} ${response.statusText} - ${url}`);
  }
  return response;
}

export async function vtexFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await vtexFetchResponse(path, init);
  return response.json();
}

export interface VtexCachedFetchOptions {
  /** SWR cache TTL override in ms */
  cacheTTL?: number;
}

/**
 * Like vtexFetch but routes GET requests through the SWR in-memory cache.
 * Uses in-flight dedup + stale-while-revalidate.
 * Non-GET requests fall through to regular vtexFetch.
 */
export async function vtexCachedFetch<T>(
  path: string,
  init?: RequestInit,
  cacheOpts?: VtexCachedFetchOptions,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET") return vtexFetch<T>(path, init);

  const raw = path.startsWith("http") ? path : `${baseUrl()}${path}`;
  const url = sanitizeUrl(raw);
  const opts: FetchCacheOptions | undefined = cacheOpts?.cacheTTL
    ? { ttl: cacheOpts.cacheTTL }
    : undefined;

  return fetchWithCache<T>(url, () =>
    _fetch(url, {
      ...init,
      headers: { ...authHeaders(), ...init?.headers },
    }),
    opts,
  );
}

/**
 * Result type for actions that need to propagate VTEX Set-Cookie headers.
 * In TanStack Start, the caller (server function) is responsible for
 * forwarding these cookies to the client via `setCookie` from vinxi/http.
 */
export interface VtexFetchResult<T> {
  data: T;
  setCookies: string[];
}

/**
 * Like vtexFetch, but also returns Set-Cookie headers from the response.
 * Use for checkout, session, and auth actions that set cookies.
 */
export async function vtexFetchWithCookies<T>(
  path: string,
  init?: RequestInit,
): Promise<VtexFetchResult<T>> {
  const response = await vtexFetchResponse(path, init);
  const data = await response.json() as T;
  const setCookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookies.push(value);
    }
  });
  if (setCookies.length === 0 && typeof response.headers.getSetCookie === "function") {
    setCookies.push(...response.headers.getSetCookie());
  }
  return { data, setCookies };
}

export async function intelligentSearch<T>(
  path: string,
  params?: Record<string, string>,
  opts?: { cookieHeader?: string; locale?: string },
): Promise<T> {
  const url = new URL(`${isUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const c = getVtexConfig();
  if (c.salesChannel) url.searchParams.set("sc", c.salesChannel);

  const locale = opts?.locale ?? c.locale;
  if (locale && !url.searchParams.has("locale")) {
    url.searchParams.set("locale", locale);
  }

  const headers: Record<string, string> = { ...authHeaders() };
  if (opts?.cookieHeader) {
    headers["cookie"] = opts.cookieHeader;
  }

  const fullUrl = url.toString();

  // IS GET requests go through SWR cache (3 min TTL via status-based defaults)
  return fetchWithCache<T>(fullUrl, async () => {
    const response = await _fetch(fullUrl, { headers });
    if (!response.ok) {
      throw new Error(`VTEX IS error: ${response.status} - ${fullUrl}`);
    }
    return response;
  });
}

/**
 * Execute a GraphQL query against the VTEX IO Runtime (myvtex.com).
 * Used for private profile/session/wishlist/payment queries that the
 * original Deco loaders called via `ctx.io.query(...)`.
 */
export async function vtexIOGraphQL<T>(
  body: {
    query: string;
    variables?: Record<string, unknown> | null;
    operationName?: string;
  },
  headers?: Record<string, string>,
): Promise<T> {
  const { account } = getVtexConfig();
  const res = await vtexFetch<{ data: T; errors?: Array<{ message: string }> }>(
    `https://${account}.myvtex.com/_v/private/graphql/v1`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  if (res.errors?.length) {
    throw new Error(`VTEX IO GraphQL error: ${res.errors.map((e) => e.message).join(", ")}`);
  }
  return res.data;
}

// -- Page Type API (used by PLP to derive category facets from URL path) --

export interface PageType {
  id: string;
  name: string;
  url: string;
  title: string;
  metaTagDescription: string;
  pageType: "Brand" | "Category" | "Department" | "SubCategory" | "Collection" | "Cluster" | "Search" | "Product" | "NotFound" | "FullText";
}

const PAGE_TYPE_TO_MAP_PARAM: Record<string, string | null> = {
  Brand: "brand",
  Collection: "productClusterIds",
  Cluster: "productClusterIds",
  Search: null,
  Product: null,
  NotFound: null,
  FullText: null,
};

function pageTypeToMapParam(type: PageType["pageType"], index: number): string | null {
  if (type === "Category" || type === "Department" || type === "SubCategory") {
    return `category-${index + 1}`;
  }
  return PAGE_TYPE_TO_MAP_PARAM[type] ?? null;
}

function cachedPageType(term: string): Promise<PageType> {
  return vtexCachedFetch<PageType>(`/api/catalog_system/pub/portal/pagetype/${term}`);
}

/**
 * Query VTEX Page Type API for each path segment (cumulative).
 * Mirrors deco-cx/apps `pageTypesFromUrl`.
 * Uses in-flight deduplication to avoid duplicate calls for the same segment.
 */
export async function pageTypesFromPath(pagePath: string): Promise<PageType[]> {
  const segments = pagePath.split("/").filter(Boolean);
  return Promise.all(
    segments.map((_, index) => {
      const term = segments.slice(0, index + 1).join("/");
      return cachedPageType(term);
    }),
  );
}

const slugify = (str: string) =>
  str
    .replace(/,/g, "")
    .replace(/[·/_,:]/g, "-")
    .replace(/[*+~.()'"!:@&\[\]`/ %$#?{}|><=_^]/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Convert page types to selectedFacets with correct IS facet keys.
 * Mirrors deco-cx/apps `filtersFromPathname`.
 */
export function filtersFromPageTypes(
  pageTypes: PageType[],
): Array<{ key: string; value: string }> {
  return pageTypes
    .map((page, index) => {
      const key = pageTypeToMapParam(page.pageType, index);
      if (!key || !page.name) return null;
      return { key, value: slugify(page.name) };
    })
    .filter((f): f is { key: string; value: string } => f !== null);
}

/**
 * Build the IS facet path string from selectedFacets.
 * Mirrors deco-cx/apps `toPath`.
 */
export function toFacetPath(facets: Array<{ key: string; value: string }>): string {
  return facets.map(({ key, value }) => key ? `${key}/${value}` : value).join("/");
}

export function initVtexFromBlocks(blocks: Record<string, any>) {
  const vtexBlock = blocks["vtex"] || blocks["deco-vtex"];
  if (!vtexBlock) {
    console.warn("[VTEX] No vtex.json block found.");
    return;
  }
  configureVtex({
    account: vtexBlock.account,
    publicUrl: vtexBlock.publicUrl,
    salesChannel: vtexBlock.salesChannel || "1",
    locale: vtexBlock.locale || vtexBlock.defaultLocale,
    appKey: vtexBlock.appKey,
    appToken: vtexBlock.appToken,
    country: vtexBlock.country,
    domain: vtexBlock.domain,
  });
}

