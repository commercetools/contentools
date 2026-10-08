## Why

The source carries a legacy surface (grid pages, content items, content-type CRUD, a rollup/lit bundler, 44 service routes and 46 MCP tools)
that the Puck packages never call, plus internal names (`cms`, `commercetools-demo`, `ct-poc`, `multitenant-contentools`, Cloud Run hosts, the
`contenttools` typo, Firestore). The labs publish rules and the owner's "no cms" requirement forbid them. Removing the dead surface first
makes D (single-tenant core), I (puck workspace), K (admin app) and M (MCP) smaller, reviewable diffs.

## What Changes

- **Delete** the legacy service surface: 10 route files, `compile-upload` and 5 content-type CRUD routes, 3 controllers, mapper, bundler util, deprecation middleware, dead utils/types/validators/samples, legacy e2e files, legacy constants, bundler dependencies (`lit`, `rollup`, `@rollup/*`, `rollup-plugin-*`, `vite*`).
- **Prune** MCP: delete 46 legacy tools and their implementations; keep configuration, datasource, file (upload, media library) and content-type import.
- **Rename in `service/` and `mcp/`**: `samples/CMS` -> `samples/content-types`; MCP `contenttools` -> `contentools` and scope `@commercetools-labs/`; scrub `ct-poc`, `frontend.site`, `sellertools` from service constants. The `puck/` renames (`components/cms` -> `components/blocks`, scope, prose) are spec I's; the `admin-app/` renames (`CMS_API_URL` -> `CONTENTOOLS_SERVICE_URL`, entry point `contentools`, CSP hosts) are spec K's; tasks.md Section 6 hands them over verbatim.
- **Drop, not replace**: the old `.github/` workflows (Cloud Run deploy, Docker e2e), `service/Dockerfile` etc. (already excluded by A), `service/README.md` legacy API docs (stub left for P).
- **Add** `tools/check-forbidden-terms.mjs` (the "no-cms" guard; terms: cms, demo, commercetools-demo, ct-poc/poc/pre-sales, multitenant, contenttools, run.app/Cloud Run, sellertools, frontend.site, **firestore**, x-project-key, authenticate-project, refresh-jwt, validateProject) with a shrinking `tools/forbidden-pending.txt` (files owned by D/E/J/K/M that still need tenant removal) and `tools/check-legacy-route-calls.mjs` (proves front ends call only kept routes).
- **BREAKING**: legacy HTTP routes and MCP tools disappear (Q-02); import paths `.../components/cms/...` change (not publicly exported).

## Capabilities

### New Capabilities
- `legacy-surface-removal`: exactly which service/MCP/e2e/dependency artifacts are deleted or pruned, and what is kept.
- `identifier-rename`: every forbidden-word class and its replacement; no .
- `forbidden-terms-guard`: the guard script, its term list, pending/allow lists and the "firestore is gone" rule.
- `legacy-call-verification`: script + evidence that puck-api, other packages and the admin app only call kept routes.

### Modified Capabilities
<!-- none -->

## Impact

- `service/` and `mcp/` edited (~75 files deleted, 28 sample files moved); `puck/` and `admin-app/` untouched (pending prefixes for I/K).
- Root `package.json` gains `check:forbidden` and `check:legacy-calls` (used by O's `verify`).
- Unblocks D, I, K, M. Nothing is built in C beyond `tsc --noEmit` of `service/` and `mcp/` where possible.
