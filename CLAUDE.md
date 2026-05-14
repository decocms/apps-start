# CLAUDE.md

Guidance for AI assistants working with `@decocms/apps`.

## Project Overview

`@decocms/apps` is the Deco commerce apps library for TanStack Start: Shopify, VTEX, Resend, generic website utilities, and the shared commerce types / SDK. It is the apps-start counterpart to the framework package `@decocms/start`.

**Not a storefront itself** — this is the npm package that storefronts depend on.

## Tech Stack

- Runtime: Node ≥ 18 / Cloudflare Workers (via `@decocms/start`)
- Framework integration: TanStack Start / React 19
- State: `@tanstack/react-query`
- Tooling: Biome (lint + format), Vitest (tests), tsc (typecheck), knip (unused exports)
- Published as: `@decocms/apps` on npmjs.com

## Common Commands

```bash
npm test                # vitest run
npm run typecheck       # tsc --noEmit
npm run lint            # biome check
npm run lint:fix        # biome check --write
npm run check           # tsc --noEmit && biome check . && knip
npm run generate:manifests   # regenerate per-app manifest.gen.ts files
```

## Release pipeline

Two channels via semantic-release. The decision tree for which one to target lives in [`.agents/skills/decocms-apps-release-workflow/SKILL.md`](./.agents/skills/decocms-apps-release-workflow/SKILL.md) — read it before opening a PR.

- **`main` → `@decocms/apps@latest`** (e.g. `1.13.0`). Default for all consumers via `^` ranges. Routine fixes go here.
- **`next` → `@decocms/apps@next`** (e.g. `1.14.0-next.3`). Opt-in via `npm install @decocms/apps@next`. Use for risky / behavior-changing / breaking work that benefits from a customer validating first. Promote to stable by opening a PR `next` → `main`.

Hard rules: never push directly to `main` or `next`; never run `npm publish` locally; never include the canonical GitHub-Actions CI-skip token (the one documented at `.github/workflows/release.yml:3-21`) in a PR title or body targeting either branch — it silently suppresses the release workflow.

`package.json` on `main` is not auto-bumped (we dropped `@semantic-release/git` to honor main branch protection). The current shipped version lives in the git tag and the npm dist-tag — `package.json` may lag.
