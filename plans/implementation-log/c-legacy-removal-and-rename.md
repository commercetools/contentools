# Implementation log: c-legacy-removal-and-rename

Branch: `worktree-agent-a7c27e675bcc5bc3d` (reset to `develop` 156bf39 first). All 40 tasks in `tasks.md` ticked. `puck/` and `admin-app/` untouched (section 6 is a hand-over to I and K).

## Done
- Tools: `tools/check-forbidden-terms.mjs`, `tools/check-legacy-route-calls.mjs`, two list files, tests (19 tool tests pass), root scripts `check:forbidden`, `check:legacy-calls`.
- Evidence: `plans/evidence/c/legacy-calls.txt` (29 endpoint templates, 0 legacy).
- Service: 10 route files, compile-upload and 5 content-type CRUD handlers, 3 controllers, mapper, bundler, deprecation middleware, dead utils/types/samples/api/interfaces, 10 legacy e2e files, legacy constants and bundler deps removed; `samples/CMS` moved to `samples/content-types`; README stub.
- MCP: 11 legacy tool groups, 6 content-type tools + `compile_upload` removed; registry = function map = 42 (diff empty); rename to `contentools-mcp`, `ContentoolsAPI/Agent/Tool`, scope `@commercetools-labs`; README rewritten; Mastra removed.
- Pending list written (30 entries) -> `forbidden-terms: OK (0 hits, 30 pending)`; removing the `service/src/app.ts` line made the guard fail naming that file `[tenant-api]`.

## Deviations
1. Legacy-call count is 29, not 28: `puck-templates` is used both with `${query}` and without (distinct templates). All OK.
2. The guard also skips `tools/check-legacy-route-calls.mjs`, `tools/labs-publish.mjs`, `tools/test/labs-publish.test.mjs` (they name the legacy auth routes / the external `presales` plugin cache path on disk) and the two list files (their path text would match). Allow list stays empty. Note: `labs-publish.mjs` contains the plugin path `presales-plugin/presales`; spec R must make sure the gate does not flag it.
3. `service/src/validators/helpers.validators.ts` was NOT deleted (task 4.5 says delete, 4.5 also says keep `env.validators.ts`, which imports it; deleting broke `tsc`). It is `@ts-nocheck` and still imports the deleted `types/index.types`. D should delete both validator files or rewrite them.
4. `service/package.json`: added `"resolutions": {"@types/express-serve-static-core": "5.0.6"}`. Without a lockfile (A copied none) the newest 5.1.x types make 73 `tsc` errors in untouched routes (`string | string[]` params). The source lockfile pinned 5.0.6.
5. `mcp/package.json`: added devDependency `@types/node@^22` (tsc could not find `process`, `Buffer`, `fetch` without it; the source relied on hoisting).
6. Committed `service/yarn.lock` and `mcp/yarn.lock` (Yarn 1, registry.yarnpkg.com only), created by the required `yarn install`. Per Q-12 yarn.lock files are wanted; D/M may regenerate.
7. `service/e2e/file.e2e.ts`: removed the `POST /compile-upload` describe block (not in the tasks, but it would fail against a removed route).
8. `utils/__mocks__` removed with the task's `rm -r`.

## Questions for the owner
- Q-C1..Q-C5 unchanged (see `questions.md`); defaults used.
- New: keep `service/yarn.lock` / `mcp/yarn.lock` committed from C? Recommended: yes.

## MISSED / UNPORTED
- Intentionally dropped: all legacy HTTP routes and 46 MCP tools; `health` MCP tool went with the auth group (the 42-tool list in the task excludes it).
- `service/tests/integration/routes.spec.ts` is stale template code (imports `service.controller` that does not exist); not touched (spec B).

## TODO (for others)
- D: remove Firestore, tenant middleware, both validator files, unused deps (`uuid`, `@google-cloud/firestore`, `jsonwebtoken`).
- I and K: execute the section 6 lists, then narrow the `puck/` and `admin-app/` pending entries.
- Pre-existing lint errors remain in `service` (4 errors: `RequestInit` in `e2e/helpers/http.ts`, `console` in `app.ts`, unused `path` in two file controllers); none introduced by C.

## Verification
- `yarn test:tools` 19 pass; `yarn check:spdx` OK (372 files); `yarn check:forbidden` OK (0 hits, 30 pending); `yarn check:legacy-calls` OK (29, 0 legacy); `openspec validate c-legacy-removal-and-rename --strict` valid.
- Service: `yarn tsc --noEmit` exit 0; `yarn build` ok; runtime (node build/index.js, no credentials): the 8 legacy paths -> 404; `GET /service/health` -> 400 (tenant header required); `POST /service/content-type/import` -> 401. `npx ts-prune`: only unused exports, no unreachable module besides the validators.
- MCP: `yarn tsc --noEmit` exit 0; registry count 42, tool methods == function-map keys; `grep -i contenttools mcp` empty.
- Counts: `ls service/src/routes` 10, `service/e2e/*.e2e.ts` 5, no `.github`, no `cms/`.
- Not run: supertest `legacy-removed` test (spec B not applied), `yarn lint` clean (pre-existing errors above).
