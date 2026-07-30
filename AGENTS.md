# AGENTS.md — `@decocms/apps`

Guidance for AI assistants and human contributors working inside the
`@decocms/apps` (apps-start) repository.

## What this repo is

`@decocms/apps` is the commerce layer for Deco storefronts on
**TanStack Start + React 19 + Cloudflare Workers**. It ships VTEX and
Shopify loaders / actions / hooks plus shared commerce types
(schema.org Product, Offer, BreadcrumbList, etc.).

It depends on `@decocms/start` (the framework layer). It is consumed
by every Deco storefront published on the new stack.

## Common Commands

```bash
npm run typecheck   # tsc --noEmit
npm run check       # typecheck + unused export detection
npm run lint        # biome check . — must be 0 errors before push
npx vitest run      # full test suite
```

There is no dev server: this is a library. Storefronts run their own
`vite dev` and consume the published package.

## Three-layer architecture

| Layer | Repo | Responsibility |
|-------|------|---------------|
| **Framework** | [`decocms/deco-start`](https://github.com/decocms/deco-start) | CMS bridge, admin protocol, worker entry, edge caching, rendering |
| **Commerce** | this repo | VTEX/Shopify loaders, actions, hooks, types, SDK helpers |
| **Site** | per-customer storefront repos | UI components, hooks, routes, styles, contexts |

Commerce code lives here, not in `deco-start`. Framework code lives
in `deco-start`, not here. Site-specific code lives in the customer
repo, not in either.

## Migration tooling policy

The canonical policy that governs all migration tooling work — across
`@decocms/start`, `@decocms/apps`, and customer storefront repos —
lives in **`decocms/deco-start`**:

- **Rule (always-applied):** [`.cursor/rules/migration-tooling-policy.mdc`](https://github.com/decocms/deco-start/blob/main/.cursor/rules/migration-tooling-policy.mdc)
- **Plan (living tracker):** [`MIGRATION_TOOLING_PLAN.md`](https://github.com/decocms/deco-start/blob/main/MIGRATION_TOOLING_PLAN.md)

Key decisions ratified there (D1–D5) that constrain work in
`apps-start` too:

| ID | Decision | Implication for this repo |
|----|----------|---------------------------|
| **D1** | Force convergence — no fork support layer | Site customisations live in `src/apps/local/`, or open a PR to canonical here. We do not ship per-fork override hooks. |
| **D2** | Rewrite HTMX on migration — no HTMX runtime | Don't add HTMX-aware loaders or hooks here. Migration codemods + skills handle the rewrite. |
| **D3** | Generated stubs throw at runtime | Anything stub-shaped that would otherwise return `null` / `{}` / identity-cast must throw with a clear message. Real impls stay real. |
| **D4** | Site-local apps by default, promote at 3+ sites | A pattern only earns a place in `vtex/` / `shopify/` / `commerce/` once it has shown up on three customer sites. Until then it lives site-local. |
| **D5** | Failed migrations: `rm -rf` and re-run | We don't carry a `--restart` mode in scripts. |

## When to add to apps-start

Per **D4**, a piece of code earns a place in `vtex/`, `shopify/`, or
`commerce/` when it is needed by **3+ customer sites**. Below that
threshold it lives site-local (typically in `src/apps/local/`).

Concrete pattern (mirrors how `createUseCart` / `createUseUser` /
`createUseWishlist` got promoted from baggagio + casaevideo): build it
twice in two different sites first, validate the abstraction, then
promote.

## Process

- **PR-only.** No direct pushes to `main`. Self-merge after CI is
  green is fine for routine work; loop in a human for behavioural
  shifts in the public surface (new exported types, signature
  changes, breaking removes).
- **Conventional commits** (`feat`, `fix`, `chore`, `docs`,
  `refactor`, `test`, `perf`). Imperative, lowercase, no trailing
  period.
- **CI must be green before merge.** Lint is enforced (\`npm run
  lint\` → 0 errors). TypeScript must pass. Tests must pass.
- **Plan updates ship with the work.** Whenever a Wave step lands,
  update `MIGRATION_TOOLING_PLAN.md` (in deco-start) in the same PR
  body so the tracker stays accurate.
