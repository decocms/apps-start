# Salesforce Marketing Cloud Personalization app

Ports the Salesforce Marketing Cloud Personalization (formerly Evergage)
campaign API from `deco-cx/apps/salesforce` (Fresh/Deno) to
`@decocms/apps/salesforce` (TanStack Start/Node), following the same
shape as `algolia/` and `magento/`.

## Status

**Initial scaffold** — covers the campaign personalization read path
(homepage shelves, PDP recommendations, cart cross-sell). No write
actions yet; the legacy `apps/salesforce/actions/*` aren't ported.

## What's here

- `types.ts` — `SalesforceProduct` (open-ended via index signature so
  dataset-specific columns survive), `PersonalizationBody`,
  `PersonalizationResponse`, `CampaignResponse`, `ParsedUserCookie`.
- `utils/parseUserCookie.ts` — decode Evergage's URL-encoded JSON cookie
  to `{ encryptedId | anonymousId }`. Falls back to
  `{ anonymousId: "anonymous" }` so first-visit requests still hit the
  default campaign instead of erroring.
- `utils/httpClient.ts` — runtime-agnostic Proxy client supporting the
  legacy indexed-route syntax (`client["POST /api2/event/:dataset"]`).
  Compatible with Cloudflare Workers / Bun / Deno / modern Node — only
  requires the global `fetch`.
- `utils/transform.ts` — `createProductTransformer({ propertyMapper? })`
  factory that converts an Evergage product into a schema.org `Product`.
  Sites pass a `propertyMapper` to project their dataset's custom
  columns (e.g. `Marca`, `Volume`, `Linha`) into `PropertyValue[]`.
- `loaders/products/list.ts` — campaign personalization shelf (homepage).
- `loaders/products/listRecomended.ts` — related-product recommendations
  (PDP / PDC).
- `loaders/products/listCart.ts` — cart-aware cross-sell.

## Why no `configureSalesforce`

Unlike Magento / VTEX / Algolia (one global SDK client per site), the
Salesforce loaders here are stateless — every call is a plain `fetch`
POST to `/api2/event/:dataset`, and a single site might run multiple
datasets (homepage uses dataset A, PDP uses dataset B). Passing
`baseUrl` / `dataset` / `campaignId` / `cookieName` via loader props
keeps the package free of hidden global state and lets the CMS block
remain the single source of truth.

## Wiring in a site

```ts
// src/packs/salesforce/products/list.ts (site-side wrapper)
import salesforceList from "@decocms/apps/salesforce/loaders/products/list";
import { granadoPropertyMapper } from "../attributeMapper";

interface SiteProps {
  baseUrl: string;
  dataset: string;
  campaignId: string;
  cookieName: string;
}

export default function loader(props: SiteProps) {
  return salesforceList({
    ...props,
    currencyCode: "BRL",
    propertyMapper: granadoPropertyMapper,
  });
}
```

```ts
// src/packs/salesforce/attributeMapper.ts (site-specific)
import type { PropertyMapper } from "@decocms/apps/salesforce";

export const granadoPropertyMapper: PropertyMapper = (product) => {
  const props: { "@type": "PropertyValue"; name: string; value: unknown }[] = [];
  if (product.Marca) props.push({ "@type": "PropertyValue", name: "marca", value: product.Marca });
  if (product.Volume) props.push({ "@type": "PropertyValue", name: "volume", value: product.Volume });
  if (product.Linha) props.push({ "@type": "PropertyValue", name: "linha", value: product.Linha });
  if (product.tag) props.push({ "@type": "PropertyValue", name: "tag__phebo", value: product.tag });
  if (product.freeShipping) {
    props.push({ "@type": "PropertyValue", name: "free_shipping__phebo", value: product.freeShipping });
  }
  if (product.SubCategoria) {
    props.push({ "@type": "PropertyValue", name: "subCategory", value: product.SubCategoria });
  }
  return props;
};
```

## Cookie reading and the framework gap

The campaign API expects a user identifier on every request. Evergage
drops `_evga_<account>` on the browser, encoded as JSON. The loaders
read this cookie via `getCookies()` from `@tanstack/react-start/server`
— which reads the in-flight request out of `AsyncLocalStorage` rather
than from an explicit `req` argument.

Why ALS instead of a `req` parameter? In `@decocms/start`, the
`commerceLoader(resolvedProps)` resolver path doesn't forward the
request object to the loader (see `commerce/resolve.ts`), so loaders
that need cookies have to recover them from the framework's stored
context. This matches what the in-tree Magento loaders already do.

Sites that aren't using `@decocms/start` (raw TanStack Start, tests,
etc.) can call the loader from inside a server function — the same
`getCookies()` resolution works as long as the call is inside a
TanStack Start request boundary.

## Error handling

Each loader wraps its POST in a try/catch that logs to `console.error`
under `[salesforce/products/...]` and returns `null`. The legacy Deno
loaders returned silent `null` on error; we keep the same return shape
(callers don't need to handle rejections) but surface the error so API
outages and CORS regressions don't hide behind an empty shelf.

## Tests

```bash
bun run test salesforce
```

The unit tests mock `fetch` directly — no Evergage credentials needed.
