---
name: decocms-apps-release-workflow
description: Choose the correct base branch (main vs next) when opening a PR against @decocms/apps, and operate the stable / prerelease release pipeline. Use BEFORE running `gh pr create` or pushing a branch, and when promoting a prerelease, publishing a hotfix, or explaining release channels to a user. Covers the PR base selection decision tree, semantic-release branching model, npm dist-tags (latest, next), customer-facing install commands, and gotchas (the canonical CI-skip token; package.json lagging the git tag).
globs:
  - ".releaserc.json"
  - ".github/workflows/release.yml"
  - "package.json"
---

# @decocms/apps Release Workflow

This package ships through **two long-lived branches** that map to **two npm dist-tags**.

| Branch | npm dist-tag | Version shape | Who gets it |
|--------|--------------|---------------|-------------|
| `main` | `latest` | `1.13.0` | Everyone with `"@decocms/apps": "^X.Y.Z"` (the default install). |
| `next` | `next` | `1.14.0-next.3` | Only customers who explicitly opt in via `npm install @decocms/apps@next` or pin a prerelease version exactly. |

**Why this matters:** npm's caret ranges (`^1.13.0`) *never* resolve to prerelease versions, and `npm install` with no qualifier follows the `latest` dist-tag. Together, these two rules give us complete isolation between channels with zero work on the customer side — the customer's `package.json` doesn't need to change.

## TL;DR — picking `--base` for a PR

Run this decision tree **before** `gh pr create` (or before pushing a feature branch):

1. **Bug fix the whole customer base needs ASAP** → `--base main`.
2. **New feature, behavior change, or anything that benefits from validation by 1–2 customers first** → `--base next`.
3. **Breaking change** → `--base next`. Validate, then promote.
4. **Doc-only / internal refactor with no shipped surface change** → `--base main`. semantic-release will no-op (commit-analyzer ignores `docs:`, `chore:`, `style:`, `test:` — see `.releaserc.json:12-15`).
5. **Hotfix for customers stuck on an older major** → **stop**. This skill does not cover maintenance branches yet; ask the user how they want to handle it.

If you're not sure between (1) and (2), ask the user. Default to `next` if there's any chance you've broken something — promotion is cheap, regression on `latest` is not.

## Branch lifecycle

```
  main  ──●──────●─────────●────●──────●─── (publishes to @latest)
           \              ↗      \    ↗
            \   merge    /        \  / merge
             ●──●──●──●─●          ●●●
                                          (next, publishes to @next)
```

- `main` is canonical. `next` periodically merges into `main` to promote a prerelease to stable.
- Never merge `main` → `next` except as a sync (e.g. after a hotfix landed on `main`, fast-forward `next` so it doesn't carry a stale base).
- Both branches are protected. Push is via PRs only.

## PR mechanics

```bash
# Stable patch — most PRs go here:
gh pr create --base main --title "fix(vtex): handle empty filter ranges"

# Prerelease — validation candidates:
gh pr create --base next --title "feat(vtex): add cache for intelligent search"
```

**Conventional commit prefixes drive the version bump on both branches** (`.releaserc.json:6-16`):

| Prefix | Bump on `main` | Bump on `next` |
|--------|---------------|----------------|
| `fix:`, `perf:`, `refactor:` | patch (`1.13.0 → 1.13.1`) | prerelease (`1.14.0-next.1 → 1.14.0-next.2`) |
| `feat:` | minor (`1.13.0 → 1.14.0`) | prerelease (`… → 1.14.0-next.N`) |
| Breaking (`BREAKING CHANGE:` footer, or `feat!:`) | major (`1.13.0 → 2.0.0`) | prerelease major (`2.0.0-next.N`) |
| `docs:`, `chore:`, `style:`, `test:` | no release | no release |

**Squash-merge is the convention.** The single squashed commit message is what semantic-release analyzes, so write a good conventional-commit title on the PR.

## Promoting a prerelease (`next` → `latest`)

When the validation customer signs off:

```bash
gh pr create --base main --head next --title "release: promote next to stable"
```

After merge:

1. semantic-release on `main` reads the same commits and publishes the stable equivalent (e.g. the running `1.14.0-next.7` becomes `1.14.0` on `@latest`).
2. The `@next` dist-tag is moved by semantic-release to point at the new stable too (channel-merging behavior — this is intentional, it prevents anyone on `@next` from falling behind `@latest`).

## Starting a fresh prerelease cycle

If `next` is stale (already promoted, or you want to start clean):

```bash
git fetch origin
git checkout -B next origin/main
git push origin next --force-with-lease
```

Then open feature/fix PRs `--base next` as normal.

## Verifying after any release

```bash
npm view @decocms/apps dist-tags
# Expected after a stable release:  { latest: '1.14.0',         next: '1.14.0' }
# Expected after a prerelease:      { latest: '1.13.0',         next: '1.14.0-next.3' }

npm view @decocms/apps@next version          # current prerelease
npm view @decocms/apps@latest version        # current stable
npm view @decocms/apps versions --json | tail -20   # recent published versions
```

Customer-side opt-in commands (use these when telling a customer how to test):

```bash
# Channel follower (re-resolves on every install):
npm install @decocms/apps@next

# Pinned to an exact prerelease:
npm install @decocms/apps@1.14.0-next.3

# Back to stable:
npm install @decocms/apps@latest
```

## Source-of-truth for the current version

`package.json` on `main` is **not** auto-bumped after each release — we dropped `@semantic-release/git` so the workflow doesn't push back to the protected branch. The current shipped version lives in:

- The git tag (e.g. `v1.14.0`) created by `@semantic-release/github`.
- The npm dist-tag (`npm view @decocms/apps dist-tags`).

`package.json` may lag the tag by one or more releases. Storefronts pin via `npm install` and are unaffected.

## Don't-do list

- ❌ **Never push directly to `main` or `next`.** Both are protected; releases must go through PRs so commit-analyzer sees clean conventional messages.
- ❌ **Never run `npm publish` from a laptop.** Only the GitHub Actions workflow has the npm token, and it runs `semantic-release` so the version, tag, GitHub Release, and dist-tag stay in sync. A manual publish will desync them.
- ❌ **Never modify dist-tags manually** (`npm dist-tag add`, `npm dist-tag rm`) on a live release without coordinating — semantic-release manages these.
- ❌ **Never include the canonical CI-skip token** (the bracketed phrase "skip" + "ci", written as one word) in a PR title or body that targets `main` or `next`. GitHub Actions silently skips the workflow if the head commit message contains that token anywhere — title, body, code blocks, all of it. See the gotcha block at `release.yml:3-21`. Refer to it descriptively if you need to mention it in a PR.
- ❌ **Never merge `main` into `next` casually.** Only do it as an explicit "sync `next` to current stable" operation, and prefer rebasing/resetting `next` to `main` when starting a fresh prerelease cycle.

## Cross-references

- `/.releaserc.json` — semantic-release config (branches, plugins, publishCmd).
- `/.github/workflows/release.yml` — CI workflow + gotcha documentation for the skip token.
- `/CLAUDE.md#release-pipeline` — short summary kept in initial agent context.
- `/.cursor/rules/release-workflow.mdc` — always-loaded Cursor pointer to this skill.
- [semantic-release pre-releases recipe](https://semantic-release.gitbook.io/semantic-release/recipes/release-workflow/pre-releases) — upstream docs for this exact pattern.
