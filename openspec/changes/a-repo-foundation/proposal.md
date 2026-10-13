## Why

The Contentools migration needs a clean, rule-compliant home before any code can be changed: a target tree with the
Connect-mandated layout (apps as root siblings, root `package.json` as a tooling hub only), a trustworthy copy of the four
source trees that cannot leak `node_modules`, `.env`, build output or `.git`, and the publish tooling (MIT, SPDX headers)
wired in from day one so later specs never have to retrofit it.

## What Changes

- Create the target skeleton: `service/`, `admin-app/`, `mcp/`, `puck/` (+ `puck/packages/*`, `puck/playground`), `docs/`, `tools/`. The root `connect.yaml` is NOT created here (spec H owns it).
- Copy `service`, `contentools` (as `admin-app`), `mcp`, `puck` from `/Users/behnam/code/cms` using the tracked-file list (`git ls-files`) minus an explicit exclude list; rename `puck/puck-react-test` to `puck/playground`. The legacy `cms/` package is never copied.
- Add root files: `package.json` (tooling hub, no `workspaces`), `.nvmrc` (22), `.gitignore`, `LICENSE` (MIT), and fix the path-rename fallout in `puck/package.json`.
- Add zero-dependency tooling under `tools/`: `run-all.mjs` (run a script in every app), `labs-publish.mjs` (wrapper around the presales `ossify`/`gate` scripts, never copies `policy.json`), `check-spdx-headers.mjs`, shared `lib/files.mjs`, and `node --test` tests.
- Run `ossify --apply` once so `LICENSE` is written (MIT), every copied source file carries the SPDX header and every `package.json` name is re-scoped to `@commercetools-labs/`.
- **BREAKING (vs. source layout):** `contentools/` is now `admin-app/`; `puck/puck-react-test` is now `puck/playground`; yarn lockfiles are not carried over.

## Capabilities

### New Capabilities
- `repo-skeleton`: required directories/root files, Node pin, `.gitignore`, MIT LICENSE, no `workspaces` at root.
- `source-import`: deterministic, leak-free copy of the source trees with exact include/exclude rules and a verifiable file count.
- `tooling-hub`: root package scripts and `tools/` scripts (run-all, labs-publish wrapper, SPDX checker) that every later spec reuses.

### Modified Capabilities
<!-- none: openspec/specs is empty -->

## Impact

- Creates ~479 copied files plus ~12 new root/tool files in `/Users/behnam/code/commercetools-labs/contentools`.
- Nothing is built or installed in A (no `yarn install`); later specs own dependency work.
- Unblocks B (tests) and C (legacy removal).
