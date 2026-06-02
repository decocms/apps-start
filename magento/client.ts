/**
 * Magento API client config — module-global, set once at app boot.
 *
 * Mirrors `vtex/client.ts`'s configureVtex/getVtexConfig pattern so the
 * same wiring contract works across commerce apps. Sites should call
 * `configureMagento(...)` once from their setup phase before any
 * loader/action runs; loaders consume `getMagentoConfig()` to pick up
 * baseUrl, auth, and feature toggles.
 *
 * Two reasons we don't pass config explicitly to every loader:
 *  1. CMS-resolved loader instances don't know where the config block
 *     lives; the site's `initMagentoFromBlocks(blocks)` adapter is the
 *     single source of truth.
 *  2. Matches the rest of @decocms/apps so a site touching VTEX and
 *     Magento has consistent muscle memory.
 */

// ---------------------------------------------------------------------------
// Config shapes
// ---------------------------------------------------------------------------

export interface MagentoFeatures {
  dangerouslyDisableWishlist?: boolean;
  dangerouslyDisableOnLoadUpdate?: boolean;
  dangerouslyReturnNullAfterAction?: boolean;
  dangerouslyDontReturnCartAfterAction?: boolean;
  dangerouslyDisableOnVisibilityChangeUpdate?: boolean;
}

export interface MagentoImagesConfig {
  imagesQtd: number;
  imagesUrl: string;
}

export interface MagentoPricingConfig {
  maxInstallments: number;
  minInstallmentValue: number;
}

export interface MagentoCartConfigs {
  countProductImageInCart?: number;
  changeCardIdAfterCheckout?: boolean;
  cartErrorMessages?: string[];
}

export interface MagentoConfig {
  /** Magento storefront base URL, e.g. `https://loja.granado.com.br/` */
  baseUrl: string;
  /** Bearer token for `Authorization` header on admin REST calls */
  apiKey: string;
  /** Store ID used in headers + path prefixes */
  storeId: number;
  /** Site/site-code used in path segments */
  site: string;
  /** Which Store header to send (default: "site") */
  storeHeader?: string;
  /** Optional opaque header value sent as `x-origin-header` */
  originHeader?: string;
  /** Currency code (e.g. "BRL") */
  currencyCode?: string;
  /** Whether to append `_suffix` to admin endpoints */
  useSuffix?: boolean;
  /** Behavior toggles surfaced to client hooks */
  features?: MagentoFeatures;
  /** Cart-specific tunables */
  cartConfigs?: MagentoCartConfigs;
  /** Images CDN config */
  imagesConfig?: MagentoImagesConfig;
  /** Pricing rules for installments display */
  pricingConfig?: MagentoPricingConfig;
}

// ---------------------------------------------------------------------------
// Module-global state
// ---------------------------------------------------------------------------

let config: MagentoConfig | null = null;

export function configureMagento(c: MagentoConfig): void {
  config = c;
}

export function getMagentoConfig(): MagentoConfig {
  if (!config) {
    throw new Error(
      "[Magento] configureMagento() must be called before loaders run. " +
        "Wire it in your site's setup, e.g. configureMagento(blocks.magento).",
    );
  }
  return config;
}

/**
 * Best-effort init from a CMS block — mirrors `initVtexFromBlocks`.
 * Resolves secret references (`__resolveType: "website/loaders/secret.ts"`)
 * by reading the named env var; if absent or invalid, the block field
 * passes through as `""`.
 */
export function initMagentoFromBlocks(blocks: Record<string, unknown>): void {
  const block = blocks.magento as Record<string, any> | undefined;
  if (!block) {
    console.warn("[Magento] No `magento` block found in CMS; skipping init.");
    return;
  }

  const resolveSecret = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const ref = v as { name?: string };
      if (ref.name) return process.env[ref.name] ?? "";
    }
    return "";
  };

  const apiConfig = block.apiConfig ?? {};
  configureMagento({
    baseUrl: apiConfig.baseUrl ?? "",
    apiKey: resolveSecret(apiConfig.apiKey),
    storeId: apiConfig.storeId ?? 1,
    site: apiConfig.site ?? "",
    storeHeader: apiConfig.storeHeader,
    originHeader: resolveSecret(apiConfig.originHeader),
    currencyCode: apiConfig.currencyCode,
    useSuffix: apiConfig.useSuffix,
    features: block.features,
    cartConfigs: block.cartConfigs,
    imagesConfig: block.imagesConfig,
    pricingConfig: block.pricingConfig,
  });
}

// ---------------------------------------------------------------------------
// HTTP helpers (thin wrappers over fetch with auth pre-applied)
// ---------------------------------------------------------------------------

export interface MagentoFetchOpts extends RequestInit {
  /** Whether to attach the admin Bearer token. Default true. */
  authenticated?: boolean;
}

function buildHeaders(opts: MagentoFetchOpts, c: MagentoConfig): Headers {
  const headers = new Headers(opts.headers ?? {});
  if (opts.authenticated !== false && c.apiKey) {
    headers.set("Authorization", `Bearer ${c.apiKey}`);
  }
  if (c.originHeader) {
    headers.set("x-origin-header", c.originHeader);
  }
  if (!headers.has("Referer")) {
    headers.set("Referer", c.baseUrl);
  }
  return headers;
}

export function magentoFetch(path: string, opts: MagentoFetchOpts = {}): Promise<Response> {
  const c = getMagentoConfig();
  const url = path.startsWith("http")
    ? path
    : `${c.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...opts, headers: buildHeaders(opts, c) });
}
