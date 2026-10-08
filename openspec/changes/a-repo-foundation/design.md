## Context

Target `/Users/behnam/code/commercetools-labs/contentools` is empty except for planning folders. The source
`/Users/behnam/code/cms` is a working internal repo whose working tree contains secrets (`service/.env`), build output and
`node_modules`. The Connect rules (skill `monorepo-with-storefront.md`, `project-structure.md`) force: `connect.yaml` at the
root, one folder per app named like `deployAs[].name`, no `workspaces` at the root, each app self-contained.
The labs publish skill supplies `ossify.mjs` (LICENSE + SPDX headers + package renames) and `gate.mjs` (blocking gate).

## Goals / Non-Goals

**Goals**
- A deterministic, re-runnable, leak-free import of the four trees.
- Root tooling hub (`yarn verify`, `check:spdx`, `gate`) every later spec reusess.
- Headers + LICENSE from day one.

**Non-Goals**
- No dependency installs, no builds, no code edits beyond path-rename fallout (C, D... own those).
- No `connect.yaml` (H), no CI workflows (O), no README/SUPPORT/CONTRIBUTING (P), no git history (R).
- No `shared/` folder: only created if a later spec proves two apps share code (Connect rule: plain folder, relative imports).

## Decisions

1. **Copy list = `git ls-files`, not the working tree.** Alternative: `rsync -a --exclude` over the working tree. Rejected: it is an
   exclude-list (denylist) approach, and the first forgotten ignored file (`service/.env`, `service/src/samples/bb/`) leaks. An allowlist
   from git can only contain committed files. A defensive denylist regex is applied on top.
2. **Exclude all `yarn.lock`.** They pin the old dependency sets (and 63 old-scope lines in `puck/yarn.lock`). Owners regenerate:
   puck -> `yarn install` (Yarn 4), service/mcp/admin-app -> `yarn install` (Yarn 1).
3. **Yarn everywhere (owner decision, final)**: `service`, `mcp`, `admin-app` use Yarn 1 classic (`yarn.lock` committed, `yarn install --frozen-lockfile`, scripts run with `yarn <script>`, no `package-lock.json`), `puck/` uses Yarn 4.5.1 (corepack). A does not copy any lockfile; each owner generates its `yarn.lock`. `tools/lib/targets.mjs` records `pm: 'yarn'` for all four; spec O's hygiene check requires the lockfiles and forbids `package-lock.json`. Rejected: npm for the Connect apps (superseded by the owner decision).
4. **Wrapper instead of vendoring ossify/gate.** `tools/labs-publish.mjs` shells to the installed skill scripts. Alternative: copy
   `ossify.mjs`/`gate.mjs` into `tools/`. Rejected: `gate.mjs` depends on `policy.json` (a list of customer names) which must never enter a
   public repo; the wrapper keeps that file outside the tree. R decides how the final gate run is done.
5. **Own SPDX checker for CI.** `gate.mjs` needs a clean git tree and scans history, so it cannot run on every PR. The checker mirrors
   ossify's extension/skip rules and runs anywhere (git or not).
6. **Rename `contentools/` -> `admin-app/` and `puck-react-test` -> `puck/playground` at copy time** (not later) so every later spec writes the final paths.
7. **Root scripts are run with `yarn <script>`** (e.g. `yarn verify`). The root has no dependencies and no `packageManager` field; the scripts are plain `package.json` scripts.

### Exact include/exclude rules (single source of truth for tasks 3.x)

Include: `git -C $SRC ls-files -z service contentools mcp puck`.
Exclude (regex on the relative path, applied with `grep -zvE`):
```
^service/(Dockerfile|\.dockerignore|docker-compose\.e2e\.yml|LICENSE|postman/)
^contentools/netlify\.toml$
(^|/)yarn\.lock$
^puck/publish-puck-packages\.sh$
(^|/)(node_modules|build|dist|\.yarn|coverage|temp)/
(^|/)(\.DS_Store|\.env|\.env\.[^e][^/]*)$
\.log$
```
Never listed because never tracked: `.git`, `.env` (untracked), `service/build`, `puck/**/dist`.
Not in the include roots at all: `cms/`, `.github/` (internal Cloud Run/e2e workflows: dropped, NOT replaced; the owner decided there is no GitHub Actions, Connect builds and deploys),  `.cursor/`, `.playwright-mcp/`, root `connect.yaml`, root `*.md`.

### Resulting layout

```
contentools/
├── .nvmrc  .gitignore  LICENSE  package.json  README.md (stub, P rewrites)
├── tools/        run-all.mjs  labs-publish.mjs  check-spdx-headers.mjs  lib/{files,targets}.mjs  test/*.test.mjs
├── docs/         (.gitkeep)
├── service/      (138 files)   admin-app/ (60)   mcp/ (35)
├── puck/         packages/* (10 packages)  playground/ (9)  docs/api-contracts.json  scripts/  bump-versions.sh ...
└── openspec/  plans/
```

## Risks / Trade-offs

- [Leak of an env file] -> tracked-list copy + post-copy `find` + `.gitignore`; gate (R) is the last line.
- [`ossify --apply` touches files C later deletes] -> harmless; header churn only.
- [`ossify` mis-detects a third-party dir] -> it stops at dirs with their own `LICENSE`; none remain after excludes. Read its report (task 6.3).
- [Source repo moves on while we migrate] -> record `git -C $SRC rev-parse HEAD` in the task 3.1 output (kept in the scratchpad, not in the repo, because it contains no secret but is internal noise).

## Migration Plan

Forward-only, scripted. Rollback = delete the four app directories and the new root files (`rm -rf service admin-app mcp puck tools package.json .nvmrc .gitignore LICENSE`); the source is untouched.

## Open Questions

Q-A1 (package manager per app) and Q-A2 (excluding `service/postman/`); defaults in `questions.md`.
