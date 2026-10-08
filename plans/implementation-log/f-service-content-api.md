# Implementation log: f-service-content-api

Branch: worktree branch (reset to `develop` 43e5d00 first). All 47 checkboxes in `tasks.md` ticked.

## Done
- Core extensions: `customObjects().list(where, { limit })`; fake commercetools got a programmable Product Search (`fake.productSearch.respondWith/failWith/calls`); `tests/support/api.ts` (`setupApiTest`); `@babel/standalone` + `@types/babel__standalone`.
- Shared pieces: `types/content.ts`, `routes/params.ts` (`validateKeyParams`, `wrap`, `param`), `schemas/*` (zod 4, source messages), `services/query-grammar.ts`.
- Services: `products.ts` (400 -> 502 mapping), `datasource-resolution.ts` (built-ins, strict and swallowing resolvers, `resolvePuckData`), `item-store.ts` (generic store: states, versions with `MAX_VERSIONS` pruning, direct state reads, one state query per list, `update()` retry).
- Routes (73): pages and contents through `buildItemRouters` (public + protected routers), templates, configuration (slice table, aggregate with one list request), datasources on custom objects (container `datasource`, built-ins as constants), products search, content-type import on both paths. `service.route.ts` mounts the public routers (published pages and contents, configuration reads, `publicResolveGuard` on `POST /datasource/:key/test`) before `requireAuth` and the protected routers after it.
- Moved out of `_pending/`: 27 sample content types, `secure-transpiler.ts` (regexes without `g`), the import controller. Deleted the replaced parked files. `_pending/` now holds only G's five media files; `tools/forbidden-pending.txt` lost the 7 F entries.
- Tests (+17 suites, +311 tests; total 35 suites, 483 tests): unit (schemas, query grammar, products and resolution, item store, transpiler), integration per route group, `route-inventory` (against the access table: 74 entries = 73 routes + the conditional public datasource test) and `access-matrix` (every protected route 401 anonymous / 401 wrong token / not 401, 403, 5xx with the service token; every public route ignores a garbage header; Merchant Center token happy path and 403 for another project).
- Live: `jest.live.config.cjs`, `tests/live/{env,content.live}.ts`, script `yarn test:live`.

## Deviations
1. Task 1.5 (`setupApiTest`): B's fake and msw server are module-level singletons, so `setupApiTest()` is synchronous, takes no `startFakeCt(server)`, returns `{app, http, fake, auth, server}` and relies on `msw-setup` resetting after each test. The fake's API host is `https://api.ct.test` (not `api.test.local`).
2. Task 1.4: the product-search handler lives in `tests/support/fake-ct.ts` (module exports `productSearch`), not in `fake-ct-store.ts`, so `tools/fake-ct` is untouched.
3. Task 4.2 case 9 adapted: an armed 409 hits the first write (the item), so the test asserts the item write was attempted twice and the version entry exists once; the version-object race is covered by the parallel-PUT test in `states-versions.test.ts`.
4. `tests/support/expected-routes.ts` holds the expected table (shared by the inventory and the matrix); the inventory test itself is `route-inventory.test.ts`.
5. `revertDraft` rewrites the state as `{published}` only (equivalent to removing `draft`; avoids an unused-variable lint error).
6. Live env file loaded with `dotenv` (already a devDependency) instead of `process.loadEnvFile`: inside jest the latter did not populate the environment. The live env also maps `E2E_CTP_*` to `CTP_*` and uses `CONTAINER_PREFIX=contentools-test-f-<runId>-` (B's `E2E_*` variable names, B's `E2E_ENV_FILE`), plus a throw-away random `SERVICE_API_TOKEN`.
7. The line-number note for "10.1 `ls src/_pending` only G's files" holds: five files.
8. Remaining `uuid` words in `tests/` (D's correlation-id regex tests, B's `uuid-shim.ts`) are not dependencies or imports of F; task 11.1's grep is empty for `src` and `package.json`.

## Questions for the owner
- Q-F1: datasource definitions require `name` (zod `min(1)`) on POST/PUT, a small tightening over the source. Recommended: keep.
- Q-F2 (from spec): keep `@babel/standalone` runtime transpile at import. Recommended: keep.

## MISSED / UNPORTED
- Media routes (`file.route.ts`, file controllers): spec G. The `GET/PUT/DELETE /content-type/:key` legacy CRUD is not ported (spec C).
- `service/README.md` route/env table: spec H.

## Verification (in `service/` unless noted)
- `yarn typecheck`, `yarn lint`, `yarn build` exit 0 (`build/` has no `_pending`); `yarn test`: 35 suites, 483 tests pass.
- Root: `yarn check:spdx` OK (462 files), `yarn check:forbidden` OK (0 hits, 8 pending), `yarn test:tools` 34 pass.
- Live sandbox (task 12.2, `E2E_ENV_FILE` = owner file, prefix `contentools-test-f-`): `yarn test:live` 7 passed (6 saves keep 5 versions; publish; anonymous published read and slug query; theme PUT/GET/DELETE; datasource POST/GET/list/DELETE; import of 27 types; Product Search 200; 25 templates listed, so `limit/offset/sort=id asc` accepted; 900 KB page created and saved 6 times, all 2xx). Cleanup in `afterAll`; `node tools/sandbox-sweep.mjs` afterwards: `deleted 0`. No values printed.
- Manual check (task 12.3, built server on port 18090, owner sandbox, throw-away token): anonymous `GET /service/default/puck-pages` 401; with token 200; `GET /service/default/configuration` 200 with 9 keys.

## Not run
- Browser/UI checks (none in this spec). `openspec validate` / archive.
