# @decocms/apps

[![npm version](https://img.shields.io/npm/v/@decocms/apps.svg)](https://www.npmjs.com/package/@decocms/apps)
[![license](https://img.shields.io/npm/l/@decocms/apps.svg)](https://github.com/decocms/apps-start/blob/main/LICENSE)

Commerce integrations for [deco.cx](https://deco.cx) storefronts on **TanStack Start + React 19 + Cloudflare Workers**.

`@decocms/apps` provides VTEX, Shopify, and Resend integrations (loaders, actions, hooks, middleware) plus shared schema.org commerce types. It depends on [`@decocms/start`](https://www.npmjs.com/package/@decocms/start).

📖 **[Read the full documentation →](https://docs.deco.cx/v2/en/commerce/overview)**

---

## Install

```bash
npm install @decocms/apps
```

### Release channels

`@decocms/apps` publishes two npm dist-tags:

- **`@latest`** — default channel. `npm install @decocms/apps` and any `^X.Y.Z` range resolve here.
- **`@next`** — opt-in prerelease channel for validation builds (`X.Y.Z-next.N`). Carets never resolve to prereleases, so you only get these by asking:

  ```bash
  # Follow the next channel (re-resolves on each install)
  npm install @decocms/apps@next

  # Or pin an exact prerelease
  npm install @decocms/apps@1.14.0-next.0
  ```

---

## Minimum wiring

### VTEX

A working VTEX storefront needs three things: a `deco-vtex` config block, an `initVtexFromBlocks()` call in setup, and the commerce loader registry.

#### 1. Config block (`.deco/blocks/deco-vtex.json`)

```json
{
  "__resolveType": "deco-vtex",
  "account": "my-store",
  "publicUrl": "https://www.my-store.com.br",
  "salesChannel": "1",
  "appKey": { "__resolveType": "secret/key" },
  "appToken": { "__resolveType": "secret/key" }
}
```

#### 2. Setup (`src/setup.ts`)

```ts
import { createSiteSetup } from "@decocms/start/setup";
import {
  createVtexFetch,
  initVtexFromBlocks,
  setVtexFetch,
} from "@decocms/apps/vtex";
import { createVtexCommerceLoaders } from "@decocms/apps/vtex/commerceLoaders";

createSiteSetup({
  sections: import.meta.glob("./sections/**/*.tsx", { eager: true }),
  blocks,
  meta: () => meta,
  initPlatform: () => initVtexFromBlocks(),
  getCommerceLoaders: () => createVtexCommerceLoaders(),
});

// Plumbs spans, traceparent injection, URL redaction, and the
// canonical `http.client.request.duration` histogram into every
// outbound VTEX call (via `recordCommerceMetric`). Operation names
// are derived from the URL via `vtexOperationRouter` (overridable
// per call via `init.operation`).
setVtexFetch(createVtexFetch());
```

For Shopify storefronts the equivalent factory is `createShopifyFetch()`:

```ts
import { createShopifyFetch, setShopifyFetch } from "@decocms/apps/shopify";

setShopifyFetch(createShopifyFetch());
```

Shopify's GraphQL operation name (`query Foo { ... }` → `Foo`) is
extracted from the document body and stamped automatically — spans
become `shopify.Foo` instead of the generic `shopify.storefront.graphql`.

> **Heads up:** the factories require `@decocms/start@>=5.3.0-rc.0`
> for the per-call `init.operation` API used to label spans.

#### 3. Hooks in components

```tsx
import { useCart, useUser, useWishlist } from "@decocms/apps/vtex/hooks";

function AddToCartButton({ sku }: { sku: string }) {
  const { addItems, isMutating } = useCart();
  return (
    <button
      onClick={() => addItems([{ id: sku, quantity: 1 }])}
      disabled={isMutating}
    >
      Add to cart
    </button>
  );
}
```

That's it. Loaders are auto-registered, hooks are typed, edge cache + cookie propagation work out of the box.

### Shopify

```ts
import { createSiteSetup } from "@decocms/start/setup";
import { initShopifyFromBlocks } from "@decocms/apps/shopify/client";
import { createShopifyCommerceLoaders } from "@decocms/apps/shopify/commerceLoaders";

createSiteSetup({
  sections: import.meta.glob("./sections/**/*.tsx", { eager: true }),
  blocks,
  meta: () => meta,
  initPlatform: () => initShopifyFromBlocks(),
  getCommerceLoaders: () => createShopifyCommerceLoaders(),
});
```

Config block (`deco-shopify`) needs `storeName`, `storefrontAccessToken`, `languageCode`, `countryCode`.

> ⚠️ Shopify cart loaders require **cart-cookie wiring** in your route handler. See [Shopify reference](https://docs.deco.cx/v2/en/commerce/shopify) for the canonical pattern.

### Resend

```ts
import { initResendFromBlocks } from "@decocms/apps/resend/client";
import { sendEmail } from "@decocms/apps/resend/sdk";

await sendEmail({
  to: "customer@example.com",
  subject: "Order confirmed",
  html: "<h1>Thanks!</h1>",
});
```

---

## What's exported

### VTEX

| Subpath | Purpose |
|---------|---------|
| `@decocms/apps/vtex` | Barrel index |
| `@decocms/apps/vtex/client` | `vtexFetch`, `vtexFetchWithCookies`, `intelligentSearch`, `setVtexFetch`, `getVtexFetch`, `initVtexFromBlocks`, `configureVtex` |
| `@decocms/apps/vtex` (barrel) | All of `client`, plus `createVtexFetch`, `vtexOperationRouter` for observability wiring |
| `@decocms/apps/shopify` (barrel) | `createShopifyFetch`, `setShopifyFetch`, `shopifyOperationRouter`, `extractGraphqlOperationName` for observability wiring |
| `@decocms/apps/vtex/commerceLoaders` | `createVtexCommerceLoaders` |
| `@decocms/apps/vtex/loaders/*` | Cart, user, wishlist, search, catalog, sessions, orders, autocomplete |
| `@decocms/apps/vtex/actions/*` | Cart mutations, auth, profile, address, wishlist, newsletter |
| `@decocms/apps/vtex/hooks` | `useCart`, `useUser`, `useWishlist`, `useAutocomplete`, plus `createUseCart` / `createUseUser` / `createUseWishlist` factories |
| `@decocms/apps/vtex/inline-loaders/*` | PDP, PLP, shelves, suggestions, minicart |
| `@decocms/apps/vtex/middleware` | `extractVtexContext`, `vtexCacheKeySuffix`, `propagateISCookies`, `createVtexCheckoutProxy` |
| `@decocms/apps/vtex/utils/*` | Transform, segment, cookies, slugCache, sortwhitelist |

> 💡 **Calling VTEX loaders/actions from the client.** Use the typed `invoke` client generated by `@decocms/start` — `invoke["vtex/loaders/cart.ts"](props)` — or use the React hooks above. There is **no** `@decocms/apps/vtex/invoke` subpath.

### Shopify

| Subpath | Purpose |
|---------|---------|
| `@decocms/apps/shopify` | Barrel |
| `@decocms/apps/shopify/client` | `setShopifyFetch`, GraphQL helpers |
| `@decocms/apps/shopify/loaders/*` | PDP, PLP, ProductList, RelatedProducts, Cart, Account |
| `@decocms/apps/shopify/actions/cart/*` | `addItems`, `updateItems`, `discountCodesUpdate` |
| `@decocms/apps/shopify/actions/user/*` | `signIn`, `signUp` |
| `@decocms/apps/shopify/utils/*` | Transform, cookies, GraphQL queries |

### Resend

| Subpath | Purpose |
|---------|---------|
| `@decocms/apps/resend/client` | `initResendFromBlocks` |
| `@decocms/apps/resend/sdk` | `sendEmail` |
| `@decocms/apps/resend/actions/send` | Invocable email action |

### Shared commerce

Platform-agnostic types and components.

| Subpath | Purpose |
|---------|---------|
| `@decocms/apps/commerce/types` | schema.org `Product`, `ProductDetailsPage`, `ProductListingPage`, `Offer`, `BreadcrumbList`, etc. |
| `@decocms/apps/commerce/components/Image` | Optimized commerce image with CDN routing |
| `@decocms/apps/commerce/components/Picture` | `<picture>` with responsive sources |
| `@decocms/apps/commerce/components/JsonLd` | Structured data for SEO |
| `@decocms/apps/commerce/sdk/useOffer` | Pick the best offer per region/seller |
| `@decocms/apps/commerce/sdk/format` | `formatPrice`, `formatPriceRange` |
| `@decocms/apps/commerce/sdk/analytics` | Event types + `mapProductToAnalyticsItem` |
| `@decocms/apps/commerce/sdk/useVariantPossibilities` | Variant axis builder for selectors |

### Website (utility app)

| Subpath | Purpose |
|---------|---------|
| `@decocms/apps/website` | `configureWebsite`, `configureSeo` |
| `@decocms/apps/website/loaders/redirectsFromCsv` | Bulk redirects from CSV |
| `@decocms/apps/website/loaders/fonts/*` | Google fonts, custom CDN font loaders |

Complete export tables: [docs.deco.cx/v2/en/reference/commerce-exports](https://docs.deco.cx/v2/en/reference/commerce-exports).

---

## Documentation

The commerce documentation lives at **[docs.deco.cx/v2/en/commerce](https://docs.deco.cx/v2/en/commerce/overview)**:

- [VTEX overview](https://docs.deco.cx/v2/en/commerce/vtex-overview) — config block, secrets, install steps.
- [VTEX loaders & actions](https://docs.deco.cx/v2/en/commerce/vtex-loaders-and-actions) — input/output cookbook.
- [VTEX hooks](https://docs.deco.cx/v2/en/commerce/vtex-hooks) — `useCart`, `useUser`, `useWishlist`, `useAutocomplete`.
- [VTEX gotchas](https://docs.deco.cx/v2/en/commerce/vtex-gotchas) — cookies, sales channel, regionId, IS sort sanitization.
- [Shopify](https://docs.deco.cx/v2/en/commerce/shopify) — configure, loaders, actions, cart-cookie wiring.
- [Resend](https://docs.deco.cx/v2/en/commerce/resend) — email setup.

---

## Peer dependencies

```json
{
  "@decocms/start": ">=2.0.0",
  "@tanstack/react-query": ">=5.0.0",
  "react": ">=19.0.0",
  "react-dom": ">=19.0.0"
}
```

The published peer floor is React 18 to ease incremental migration, but the v2 stack assumes React 19 + the React Compiler.

---

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run check       # typecheck + unused export detection
```

This is a library — there is no dev server. Consumer storefronts run their own `vite dev`.

---

## License

MIT
