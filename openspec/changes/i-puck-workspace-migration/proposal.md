## Why

The Puck packages are the reusable core of Contentools (page editor, managers, renderer, API hooks). Today they live in an internal
repo under the `@commercetools-demo` npm scope with "CMS"/"Puck CMS" naming, no lint configuration (`yarn lint` fails), no tests,
bash release scripts that depend on a developer's stored npm login, and package metadata that is not publishable as a
commercetools-labs project. The Merchant Center app (`admin-app`) and external storefronts must consume these packages from the npm registry,
so they have to be moved, renamed, cleaned and made releasable before anything else can depend on them.

## What Changes

- Move `/Users/behnam/code/cms/puck` into `puck/` of the target repo as a Yarn 4 workspace (`puck/packages/*` + `puck/playground`), copying sources only
  (no `node_modules`, `dist`, `.env`, `.yarn/cache`).
- Rename all 10 packages from `@commercetools-demo/puck-*` to `@commercetools-labs/puck-*`, rename the workspace root to
  `@commercetools-labs/puck-workspace` and the playground `puck-react-test` -> `@commercetools-labs/puck-playground` (private); set version `1.0.0`.
- Rewire every internal dependency, import, `tsup` `external` list, Vite alias, README snippet and doc to the new scope (keep `workspace:^`; `yarn pack` rewrites it on publish).
- Rename the two `components/cms/` source directories to `components/blocks/` and remove every "CMS"/"demo" wording from descriptions, titles, comments and docs.
- Add the SPDX header to every source file (`.ts .tsx .mjs`), MIT `LICENSE` injected into each tarball at pack time (never committed per package), `repository`/`bugs`/`homepage`/`license`/`engines`/`keywords`, fixed `exports`
  (separate ESM/CJS `types`), `files` (`dist`, `README.md`; `LICENSE` is added by the release script), `publishConfig`.
- Create the missing toolchain: ESLint 9 flat config, vitest + React Testing Library + jsdom baseline, `yarn verify`; fix the 43 probe lint findings so `build`, `typecheck`, `lint`, `test` are green.
- Replace `bump-versions.sh` / `publish-puck-packages.sh` with local Node scripts (`puck/scripts/bump-versions.mjs`, `puck/scripts/publish-packages.mjs`): pack with Yarn, publish tarballs with npm, topological order, idempotent skip, dry-run default, guarded `--execute`. No CI service is involved (owner decision: Connect app, no GitHub Actions).
- Refresh `puck/docs/api-contracts.json` (paths, wording, stale datasource entry) and pin the toolchain (corepack Yarn 4.5.1, Node 22, regenerated `yarn.lock`).
- **BREAKING (identity only)**: package names/scope change; consumers must reinstall under the new names. The connection API (`projectKey`, `jwtToken`) is deliberately **not** changed here; that is spec J.

## Capabilities

### New Capabilities
- `puck-workspace`: the layout, package identity, dependency graph, build/lint/test/typecheck gates, release tooling and licensing hygiene of the `puck/` Yarn workspace and its ten published packages.

### Modified Capabilities
<!-- none: openspec/specs is empty -->

## Impact

- New tree `puck/` (10 packages, playground, scripts, docs). Roughly 16.7k LOC moved; ~110 files get an SPDX header; ~100 import lines and 10 `package.json` files edited; ~55 files renamed by the `cms` -> `blocks` move.
- Downstream: specs J (connection contract), K/L (admin-app consumes registry packages), O (documents `yarn release:puck` / local gate; no workflow), P (package READMEs), Q (rc publish), R (gate).
- Needs manual steps: npm scope/org ownership, npm login with 2FA, running the publish script (see `manual.md`).
- Depends on spec C only for the repo-wide "no cms" rule; this spec owns the puck-side renames. Spec A provides the repo skeleton, `.nvmrc`, root hub.
