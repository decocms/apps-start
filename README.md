# @decocms/apps

[![npm version](https://img.shields.io/npm/v/@decocms/apps.svg)](https://www.npmjs.com/package/@decocms/apps)
[![license](https://img.shields.io/npm/l/@decocms/apps.svg)](https://github.com/decocms/apps-start/blob/main/LICENSE)

Commerce integrations for [Deco](https://deco.cx) storefronts on **TanStack Start + React 19 + Cloudflare Workers**.

Provides VTEX and Shopify loaders, actions, hooks, and shared commerce types based on schema.org. Built on top of [`@decocms/start`](https://www.npmjs.com/package/@decocms/start).

## Install

```bash
npm install @decocms/apps
```

## Integrations

### VTEX

Full VTEX Intelligent Search and Checkout integration.

| Import | Purpose |
|--------|---------|
| `@decocms/apps/vtex` | Configuration and setup |
| `@decocms/apps/vtex/client` | VTEX API client with SWR caching |
| `@decocms/apps/vtex/loaders/*` | Product, cart, search, catalog, session, wishlist |
| `@decocms/apps/vtex/actions/*` | Checkout, auth, newsletter, profile, wishlist |
| `@decocms/apps/vtex/hooks` | useCart, useUser, useWishlist, useAutocomplete |
| `@decocms/apps/vtex/inline-loaders/*` | PDP, PLP, product list, suggestions |
| `@decocms/apps/vtex/middleware` | Cookie propagation and session handling |
| `@decocms/apps/vtex/invoke` | Server function wrappers |
| `@decocms/apps/vtex/utils/*` | Transform, enrichment, segment, cookies |

### Shopify

Storefront API integration via GraphQL.

| Import | Purpose |
|--------|---------|
| `@decocms/apps/shopify` | Configuration and setup |
| `@decocms/apps/shopify/client` | Storefront GraphQL client |
| `@decocms/apps/shopify/loaders/*` | PDP, PLP, product list, cart, user |
| `@decocms/apps/shopify/actions/cart/*` | Add, update items, coupons |
| `@decocms/apps/shopify/actions/user/*` | Sign in, sign up |
| `@decocms/apps/shopify/utils/*` | Transform, cookies, GraphQL queries |

### Shared Commerce

Platform-agnostic types and utilities.

| Import | Purpose |
|--------|---------|
| `@decocms/apps/commerce/types` | schema.org Product, Offer, BreadcrumbList, etc. |
| `@decocms/apps/commerce/components/Image` | Optimized commerce image component |
| `@decocms/apps/commerce/components/JsonLd` | Structured data for SEO |
| `@decocms/apps/commerce/sdk/*` | useOffer, formatPrice, analytics, URL utils |
| `@decocms/apps/commerce/utils/*` | productToAnalyticsItem, canonical, stateByZip |

## Peer Dependencies

- `@decocms/start` >= 0.19.0
- `@tanstack/react-query` >= 5
- `react` >= 18
- `react-dom` >= 18

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run check       # typecheck + unused export detection
```

## License

MIT
