# Implementation log: h-service-connect-app

Branch: worktree branch (reset to `develop` c829b7b first). 32 of 35 checkboxes in `tasks.md` ticked; unticked: 4.2 and 9.1 (`commercetools connect validate`, Docker daemon not running) and 9.3 (deployed checks, public repository needed).

## Done
- Root `connect.yaml`: `service` application (endpoint `/service`, `postDeploy: yarn connector:post-deploy`, `preUndeploy: yarn connector:pre-undeploy`), 17 standard + 6 secured keys (verified against D/E/G: `readConfiguration`, auth schema, `loadMediaConfig`), top-level `inheritAs.apiClient.scopes` = `manage_key_value_documents`, `view_products`. No `CTP_*`, no `CLOUD_IDENTIFIER` (spec L declares it under `inheritAs.configuration`), no `required: true`.
- Lifecycle: `service/src/connector/{env,checks,post-deploy,pre-undeploy}.ts`, `service/scripts/bundle-lifecycle.mjs` (esbuild, cjs, node22, nothing external; optional output-dir argument used by the test). `yarn build` now = rimraf + tsc + bundle. `connector:post-deploy` and `connector:pre-undeploy` scripts added. `esbuild` and `yaml` added as devDependencies.
- Observability fixes in D's files (no parallel files): correlation id regex now `^[A-Za-z0-9._-]{8,128}$` (was `{1,128}` with `:`); access log now writes the full route template (`/service/:businessUnitKey/puck-pages`) and `businessUnitKey` (Express resets `baseUrl`/`params` before `finish`, so the template is rebuilt from the new constant `SERVICE_MOUNT` in `src/routes/mount.ts`, also used by `app.ts`); `timestamp` added to every log line (`@commercetools-backend/loggers` json output had none); graceful shutdown extracted to `src/observability/shutdown.ts` (`createShutdown`) so it is testable. D's tests that used 7-character correlation ids (`abc-123`, `cid-1`) were updated to 8+ characters.
- Config clean-up: removed the dead `src/_pending` entries from `tsconfig.json`, `tsconfig.test.json`, `tsconfig.build.json` (now excludes `src/connector`), `.eslintrc.cjs`, `.eslintignore`, `jest.config.cjs` (testMatch now also covers `tests/connect` and `tests/observability`).
- Tests (+83, total now 57 suites / 665 tests): `tests/connect/{manifest,route-mount,drift,lifecycle,checks,readme,env-example}.test.ts` (+ `support.ts`), `tests/observability/{correlation,logging,errors,shutdown}.test.ts` (+ `support.ts`).
- Docs: `service/README.md` rewritten (10 required headings, route table, scopes, generated configuration table guarded by `readme.test.ts`, lifecycle, fail-open/closed table, logs, replay, troubleshooting); `service/.env.example` rewritten (all 23 declared keys + 6 `CTP_*` + `PORT`, placeholders only; guarded by `env-example.test.ts`).
- Root `package.json`: `verify:service`.

## Deviations
1. `CONTAINER_PREFIX` is declared without `default: ""` (Connect behaviour for an empty-string default is unverified; an omitted default is equivalent because empty means unset). The README/env example show `-` / empty.
2. Task 4.2 command: the CLI (`@commercetools/cli/0.0.17`) rejects `--skip tests --skip analysis` ("Flag --skip can only be specified once"), so the static run would be `commercetools connect validate . --skip tests` or plain `commercetools connect validate .`. Deferred anyway (no Docker).
3. Task 1.1: no Dockerfile, `.dockerignore`, compose file or `routes.spec.ts` existed any more (D/G removed them); nothing to delete. Task 1.2/1.3: kept D's `typecheck` (`tsc -p tsconfig.test.json`) and tsconfig layout instead of the task's alternative shapes; `lint` stays `eslint . --ext .ts`, `test` stays `jest`.
4. Task 1.4: `yarn audit --groups dependencies --level high` = 0 vulnerabilities. `yarn audit --level high` (with devDependencies) reports 10 findings, all the same advisory (npm 1240992) on `braces` via `jest > micromatch`. The advisory lists no patched version (`patched <0.0.0`) and `braces@3.0.3` is already the latest release, so there is no fix to apply (Connect's scan only refuses findings that have a fix). If `connect validate` flags it anyway, add a `resolutions` entry or an ignore file as the follow-up.
5. Health body is D's `{status:'UP', service, timestamp}` (the spec says `{status:'UP'}`); tests assert `status === 'UP'`. D's runtime test pins the three fields, so left as is.
6. The correlation-id regex change makes ids of 1-7 characters (and any containing `:`) be replaced. This follows the H spec; D's regex was looser.
7. Task 6.5 lifecycle test bundles into a temporary directory through `node scripts/bundle-lifecycle.mjs <dir>` instead of running `yarn build` in `beforeAll`: `bootstrap.test.ts` also builds into `build/`, and a second `rimraf build` in parallel would race. Spawned with async `spawn` (not `spawnSync`) because the mock server runs in the test process.
8. Task 6.4 `shutdown.test.ts` was needed (D kept the logic inline); I extracted `createShutdown` as the task allows.
9. Task 5.6 standalone proof ran in the scratchpad (not `/tmp`): copied `post-deploy.js` alone, ran with unreachable URLs: stderr `{"check":"token","status":"failed","reason":"request failed (network error or timeout)"}`, exit 1, no `Cannot find module`. The bundle is 3.5 MB (all three storage SDKs); no need for the `yarn install --production` fallback.
10. Drift test: `CLOUD_IDENTIFIER` is accepted without a manifest entry via a `SHARED` list (until spec L declares it under `inheritAs.configuration`, which the test also reads); `MEDIA_*` quoted-literal detection only matches real key names (error codes like `MEDIA_NOT_CONFIGURED` share the prefix).
11. README repeat-write claim, checked against F: `PUT`, `DELETE`, publish, revert are safe to repeat; repeating `POST` on pages, contents or templates creates another item (new UUID key each time); `POST /datasource/:key` answers 409 on repeat. The README says so.

## Questions for the owner
- Q-H8: `connect validate` may refuse the dev-only `braces` advisory (see deviation 4). Recommended: wait for the first real validate run; if it fails, add a `resolutions`/ignore entry.
- Q-H9: Connect's behaviour for `default: ""` is unverified; I omitted it. Recommended: keep omitted.

## MISSED / UNPORTED / TODO
- Task 4.2 / 9.1: `commercetools connect validate .` not run (Docker daemon unreachable: "Cannot connect to the Docker daemon"). Run it once Docker Desktop is up (M-H1) and record date/CLI version (`@commercetools/cli/0.0.17`).
- Task 9.3 deployed checks (connectorstaged create, deployment create, logs, `/service/health` on the deployed URL, idempotent redeploy): deferred until the repository is public (spec R) and Connect access exists (M-05/M-H4).
- Live GCS media check remains G's deferral (no bucket variables in the owner file).

## Hand-off (task 9.4) for L and M
- Root `connect.yaml` exists with the `service` application and top-level `inheritAs.apiClient` (two scopes). L appends the `admin-app` block and declares `CLOUD_IDENTIFIER` once under `inheritAs.configuration`; M appends `mcp`. Neither may widen `inheritAs.apiClient` without updating `service/README.md` (Scopes table) and `tests/connect/manifest.test.ts` (scope assertion). `deployAs[].name` must equal the folder name (manifest test).
- `CONNECT_SERVICE_URL` is injected only into service applications. Health path for probes: `GET /service/health` (alias `/service/status`), never `/health`.
- The manifest test asserts 17 standard + 6 secured keys in the service block; `SERVICE_API_TOKEN` stays declared per application (service here, mcp in M).
- Deploy flag format for configuration is `--configuration service.KEY=value` (application-qualified), per `commercetools connect deployment create --help`.

## Verification (all in `service/` unless noted)
- `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`, `yarn build`: exit 0. Root `yarn verify:service`: exit 0.
- `yarn test`: 57 suites, 665 tests pass (582 before; +83).
- `commercetools connect application test` (inside `service/`): success message, 57 suites / 665 tests.
- Root: `yarn check:spdx` OK (508 files), `yarn check:forbidden` OK (0 hits, 7 pending), `yarn test:tools` 34 pass; `grep -rniE '\bcms\b' service connect.yaml` empty; no `.github`; no Docker/Cloud Run/Firestore terms in `service` or `connect.yaml` apart from the e2e README sentence about not keeping a Dockerfile (existing, not flagged by the checker).
- Live sandbox (owner env file read through `node --env-file`, values mapped to `CTP_*`, never printed; `CONTAINER_PREFIX=contentools-test-h-`, reads only): `node build/connector/post-deploy.js` printed `ok` for token, scopes, custom-objects and product-search (the `{"limit":1}` body is accepted), `skipped` for storage, exit 0. Built server on port 18131 with a throw-away token: `/service/health` 200, `/health` 404, anonymous `/service/main-bu/puck-pages` 401 with `X-Correlation-ID`, supplied `trace-12345678` echoed and present in the log line, authenticated list 200 (logged with `businessUnitKey` and the route template), SIGTERM logged and exited. No writes were made, so no sandbox sweep was needed.

## Not run
- `commercetools connect validate .` (Docker daemon not running), task 9.3 deployed checks, real Merchant Center token (K/Q), browser checks (connector detached), `openspec validate`/archive.
