# Explore notes for A (repo foundation)

Working note. Facts below were read from the source on 2026-10-08. All paths are under `/Users/behnam/code/cms` (SOURCE, read-only) unless prefixed `contentools/` (TARGET = `/Users/behnam/code/commercetools-labs/contentools`).

## 1. State of the TARGET today
* Contains only `README.md` (one line, `# contentools`), `plans/`, `openspec/`. It is **not** a git repository (scripts must work without `.git`).
* Node on this machine: v22.21.1, Yarn classic 1.22.22 (`yarn -v`), openspec 1.6.0.

## 2. What the SOURCE tracks (`git ls-files`, clean working tree)
| Top-level | Tracked files | Copied by A? |
| --- | ---: | --- |
| `service/` | 145 | yes (138 after excludes) |
| `contentools/` | 62 | yes, as `admin-app/` (60 after excludes) |
| `mcp/` | 36 | yes (35 after excludes) |
| `puck/` | 248 | yes (246 after excludes) |
| `cms/` | 345 | **NO** (legacy lit web-component monorepo; never enters the target) |
| `.github/` (2 internal workflows: Cloud Run deploy + e2e; dropped, not replaced - no CI service, owner decision), `.cursor/` (2), `.playwright-mcp/` (1 console log), `connect.yaml`, `README.md`, `release.md`, `task.md`, `TODO.md`, `todo-rest.md`, `.gitignore` | 12 | **NO** (internal, replaced by later specs) |

Expected result of the copy: **479 files** = service 138 + admin-app 60 + mcp 35 + puck 246 (`puck/puck-react-test` -> `puck/playground` is 9 of the 246).
Verified with: `git -C /Users/behnam/code/cms ls-files service contentools mcp puck | <exclude regex> | wc -l` -> 479.

Why copy from `git ls-files` and not from the working tree: the working tree holds untracked/ignored junk
(`service/node_modules`, `service/build`, `service/.env` (a real env file), `service/.DS_Store`, `puck/**/dist`,
`puck/.yarn`, `puck/puck-react-test/.env`, `mcp/dist`-style output `mcp/ai-sdk`, `mcp/langchain`, `contentools/public`,
`service/src/samples/bb/`). The tracked list excludes all of them by construction, so a copy cannot leak a `.env`.

## 3. Tracked files that must still be excluded (decisions)
| Path (SOURCE) | Why excluded |
| --- | --- |
| `**/yarn.lock` (service, contentools, mcp, puck) | Stale; 63 hits of the old npm scope in `puck/yarn.lock`; dependency sets change in D/H/K/M. Each owner spec regenerates its lockfile. |
| `service/Dockerfile`, `service/.dockerignore`, `service/docker-compose.e2e.yml` | Cloud Run packaging. Connect builds from source with `npm`; Docker is unused. |
| `service/LICENSE` | Placeholder text "Copyright <YEAR> <COPYRIGHT HOLDER>". The labs gate FAILs on any directory with its own LICENSE; the root LICENSE (MIT) is the only one. |
| `service/postman/*` (2 files) | 100% about `x-project-key`/tenants/legacy routes and named `cms-api-*`. Replaced by the API reference in P. |
| `contentools/netlify.toml` | SPA redirect for a Netlify-hosted copy of the MC app. Connect hosts the app. |
| `puck/publish-puck-packages.sh` | Manual `npm publish` script; replaced by the trusted-publishing workflow (O). `puck/bump-versions.sh` IS kept (version bump helper reused by O). |

Kept on purpose although they contain things later specs fix: `service/e2e/**` (legacy e2e, C prunes, B rewrites), `service/tests/integration/routes.spec.ts` (stale template: imports `../../src/controllers/service.controller` which does not exist), `puck/docs/api-contracts.json` (J updates), sub-READMEs (P rewrites; C only removes forbidden words).

## 4. Package managers / versions in the SOURCE
* `service/package.json`: `"packageManager": "yarn@1.22.22"`, Node 22 (`service/.nvmrc` = `22`), `jest ^29`, `ts-jest`, scripts `start`, `gcp-build`, `start:dev`, `build`, `lint`, `format`, `test` (a stub echo), `test:e2e`.
* `contentools/package.json`: `yarn@1.22.22`, `.nvmrc` = `22`, mc-scripts 27.13, `jest 29.7`, `msw 0.49.3`, scripts `build,start,compile-html,test,lint,typecheck,...`; no test file exists.
* `mcp/package.json`: tsup build, `type: module`, no tests.
* `puck/package.json`: Yarn **4.5.1** workspace (`packages/*`, `puck-react-test`), `.yarnrc.yml` = `nodeLinker: node-modules` (no `yarnPath`, so corepack provides Yarn), scripts `build` (`yarn workspaces foreach --all --topological-dev run build`), `typecheck`, `lint`, `start:test`.
* Test files that exist in the whole copied set: only `service/tests/integration/routes.spec.ts` and `service/e2e/*.e2e.ts` (16 files). Nothing in contentools/mcp/puck.
* Connect rule (skill `monorepo-with-storefront.md`): root `package.json` is a tooling hub, no `workspaces`; Connect installs and builds inside each app folder (package manager detected from the lockfile).

## 5. Path-rename fallout when `puck/puck-react-test` becomes `puck/playground`
`grep -rn puck-react-test` over the kept files finds exactly: `puck/package.json:6` (workspaces entry), `puck/package.json:13` (`start:test` script), `puck/README.md:8,311` (prose, P/I), `puck/puck-react-test/package.json:2` (`"name"`). A fixes the first, second and fourth; the README is I's.

## 6. Publish tooling (read from the presales skill, content of `policy.json` NOT copied)
* `ossify.mjs --repo <p> [--apply] [--year Y]`: writes MIT `LICENSE`, prepends the SPDX header to `.ts .tsx .js .jsx .mjs .cjs .mts .cts .css .scss .sh .graphql ...`, re-scopes every `package.json` name to `@commercetools-labs/<unscoped-name>`. It skips dirs `.git node_modules public dist build coverage ...` and extensions `.json .md .yaml .yml .toml .svg ...`. Dry run is the default.
* `gate.mjs --repo <p> [--ack]`: needs a git repo with a clean tree, scans every commit; FAILs on forbidden files, missing LICENSE/SUPPORT.md/CONTRIBUTING.md, non-labs package names, missing headers.
* Both live in `~/.claude/plugins/cache/presales-plugin/presales/<version>/skills/commercetools-labs-publish/scripts/` (version at read time `0.29.4`). `policy.json` there must never be copied into this repo.
* Sibling repo `/Users/behnam/code/commercetools-labs/search-config` has `tools/*.mjs` (zero-dependency Node scripts with `node --test` tests in `tools/test/`) - we follow that style.

## 7. Risks
* Copying from the wrong working tree leaks `.env` -> mitigated by `git ls-files` + a post-copy forbidden-file `find`.
* `ossify --apply` renames `package.json` names to `@commercetools-labs/<dir-name>`; for `admin-app` that yields a name we then fix in K; harmless in A.
* Headers added by A make C's later string edits touch files that already have a header: fine.
* Corepack: Yarn 4 in `puck/` requires `corepack enable` once per machine (manual note M-A1).
