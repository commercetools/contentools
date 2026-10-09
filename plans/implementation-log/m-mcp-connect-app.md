# Implementation log: m-mcp-connect-app

Branch: worktree branch (reset to `develop` 74229a2 first). Tasks: all ticked except 8.2 (`commercetools connect validate`, Docker daemon not running) and 12.2 (status board edit left to the coordinator).

## Done
- `mcp/` rebuilt as a self-contained Yarn 1 package (`@commercetools-labs/contentools-mcp`, private, Node 22, CommonJS): old tree, stale `yarn.lock`, tsup/vitest config removed; `package.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.cjs`, `.nvmrc`, `.gitignore`, `.env.example`, `LICENSE`, committed fresh `yarn.lock`.
- `src/core` (zod + Node only): types, `predicate` (escaped single-clause grammar), `client` (timeout, error mapping, multipart), `run`, `format`, `schemas`, `registry`, 8 tool files = 44 tools (24 read, 20 write).
- `src/mcp/server.ts` (SDK glue, `onToolResult` hook), `src/server/{config,logger,auth,app,index,post-deploy}.ts` (stateless Streamable HTTP, auth before body parsing, Origin check, 405/400/413/500 handling, post-deploy probe).
- Root `connect.yaml`: `mcp` app appended (6 standard + 2 secured keys); `service` block and `inheritAs.apiClient` untouched.
- Tests: 10 suites, 172 tests (unit: predicate, client, catalog table of all 44 tools, config, auth; integration: endpoint, auth matrix x3 methods, tools, post-deploy, internal-error, log hygiene), env-gated `tests/e2e/live.test.ts`.
- Tooling: `tests/support/{fake-service,dev-fake,app,catalog-fixture}.ts`, `scripts/verify-mcp.mjs`, `scripts/check-connect.mjs` (own offline `connect.yaml` check, see deviations), `README.md`.
- Root: `verify:mcp` script; two `# M` pending entries removed from `tools/forbidden-pending.txt`.

## Deviations
1. `yarn check:connect` (spec O) does not exist: added `mcp/scripts/check-connect.mjs` (`yarn check:connect-block`, needs the `yaml` devDependency) which asserts the `mcp` block (endpoint, type, 6+2 keys, secrets only secured, string defaults), that the `service` entry survives and root scopes are unchanged. Spec O may replace it.
2. `PuckDataSchema.root` is **required** (spec said optional). The live service rejects `puckData` without `root` (`400 expected object, received undefined`, verified live). Catalog/descriptions updated accordingly. Template `puckData` stays required (service allows optional; stricter is harmless).
3. No `lint` script and no eslint (the task's script referenced an eslint that is not a dependency); root `run-all` skips missing scripts.
4. `get_puck_page_versions`/`..._content_versions` description kept generic; the service returns `{ key, businessUnitKey, versions: [...] }` (newest first), not a bare array (found by the live test, test adapted).
5. Test service URLs use `https://svc.test/service` (config rejects non-localhost http, so the tasks' `http://svc.test` would fail validation).
6. Auth matrix integration test omits the "trailing space" header row: Node trims header whitespace, so it is not observable over HTTP; the unit test of the matcher covers it.
7. 500-path test lives in its own file (`internal-error.test.ts`) using `jest.mock` of `src/mcp/server`; the tasks' "inject a dependency that throws" had no seam.
8. `upload_media` `title`/`description` carry `max(200)`/`max(2000)` per design table; `list_media`/`search_products` follow the spec exactly.
9. `connect.yaml` descriptions end with a period and defaults are quoted strings (service block style); text otherwise equals design D9.
10. Inspector CLI with a wrong token prints the CLI's own `auth_required` error (it starts an OAuth flow after a 401 + `WWW-Authenticate`), not a plain 401; curl and the SDK script show the 401.

## Questions for the owner
- Q-M7: the service demands `puckData.root`; should `create_puck_page` default a missing `root` to `{}` server-side in the MCP instead of requiring it? Recommended: keep required (explicit; agents see it in the schema).
- Q-M1/Q-M2 (writes default off, shared agent token) stand on their defaults.

## MISSED / UNPORTED / TODO
- Source tools dropped by design (legacy grid pages, content items, auth, proxy, compile_upload, legacy content-type CRUD, 33 configuration tools collapsed to 4). stdio entry and npm adapters belong to spec N.
- 12.2: `plans/01-dependency-plan.md` has no status columns for M; coordinator to mark M implemented.
- 12.1 hand-offs: N consumes `src/core`, `src/core/index.ts`, `src/mcp/server.ts`; `package.json` stays `private: true`. Q gets the section 10 commands. O: replace `check-connect-block` by the shared check, and add the SPDX/forbidden greps (already covered by root `check:spdx`/`check:forbidden`).

## Verification (commands run)
- `mcp/`: `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn test` (10 suites, 172 tests), `yarn gcp-build`, `yarn check:connect-block`: all exit 0. Clean-build check (`rm -rf node_modules build`, install, `gcp-build`, `build/server/index.js` exists): OK. Root `yarn verify:mcp`: exit 0.
- Root: `yarn check:spdx` OK (545 files), `yarn check:forbidden` OK (0 hits, 1 pending), `yarn test:tools` 34 pass; forbidden-word grep over `mcp/` empty; `service` `tests/connect` (71 tests) still green with the new block.
- Fail-fast: built server without `MCP_ACCESS_TOKEN` prints `Invalid environment configuration: MCP_ACCESS_TOKEN is required`, exit 1.
- Fake service: `yarn dev:fake` then `yarn verify` -> `OK 44 tools; list_puck_pages returned 166 chars`; Inspector CLI `tools/list` and `tools/call get_puck_page` returned the fixture; curl `tools/list` returned tools, without a token `401` + `WWW-Authenticate`.
- Live (task 11): built `service/` run from a scratch launcher (owner env file read in-process, values mapped to `CTP_*`, never printed; throw-away `SERVICE_API_TOKEN`; `CONTAINER_PREFIX=contentools-test-m-<hex>-`), MCP built app on :8080 against it. `yarn test:e2e`: 4 passed (create, preview, publish, query by slug, versions, delete; product search; theme read; `list_media`; wrong service token -> `Service returned 401`). Via the real HTTP process: `yarn verify` OK 44 tools with writes, `import_default_content_types` ok, `list_datasources` ok, `upload_media` surfaced `415 MEDIA_TYPE_NOT_ALLOWED` for an invalid PNG (error text correct). Cleanup: `node tools/sandbox-sweep.mjs` -> `deleted 27` (the imported content types), all prefixed containers; pages deleted by the tests. Service version tested: this branch's `develop` 74229a2, 2026-10-09.
- Route/error-body mismatches found against the service: `puckData.root` required; versions response is an object (both handled above). No others.

## Not run
- `commercetools connect validate .` (Docker daemon not running; CLI installed). Deployed Connect checks and a real storage-backed `upload_media`/`list_media` (no `MEDIA_*` provider in the sandbox env).
- Chrome/browser checks: none apply. `openspec validate`/archive.
