## 0. How to read this file

Vocabulary.
- **Connect**: commercetools' hosting platform for integrations. A repository (a "connector") has one `connect.yaml` at its root declaring applications; each application lives in a folder with the same name.
  Connect builds the folder with Google buildpacks (it runs `yarn install`, then the script `gcp-build`, then `start`), injects configuration as environment variables, and runs lifecycle scripts after a deployment.
- **`service` application**: a plain HTTP server on port 8080, here the Contentools REST API under `/service`.
- **Custom Object**: commercetools' generic JSON document store (container + key). Contentools stores pages, content, templates and configuration there.
- **`inheritAs.apiClient`**: asks Connect to create an API client with the listed scopes per deployment and inject `CTP_API_URL`, `CTP_AUTH_URL`, `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`.
- **postDeploy / preUndeploy**: commands from `connect.yaml` that Connect runs after a successful deployment and before an undeployment.
- **Correlation id**: a per-request identifier (`X-Correlation-ID`) copied into every log line so one request can be followed through the logs.
- Paths are relative to the repo root `/Users/behnam/code/commercetools-labs/contentools/`; source references are under `/Users/behnam/code/cms/` (read-only). Run commands in `service/` unless stated.
- Every new `.ts`/`.mjs` file starts with the SPDX header (exact text in the project brief): 
```ts
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
- No "cms", no `any`, no commented-out code, no GitHub Actions or other hosted CI (owner decision), no Firestore anywhere.

Pre-conditions for the whole spec: specs C, D, E, F, G are archived (so `service/src/_pending/` no longer exists: `test ! -d service/src/_pending`). `service/` therefore has the single-tenant client, config reader, logger, `CustomError` + error middleware (D), auth middleware and its keys (E), content routes (F), media module (G).
Tools: Node 22 (`node -v` prints v22.x), Yarn 1.22 classic (`yarn -v`; `service/` has its own `yarn.lock`; owner decision: Yarn 1 for service, admin-app and mcp), Docker running (`docker info`), Connect CLI (`commercetools --version` prints `@commercetools/cli/0.0.17` or newer; install with `npm i -g @commercetools/cli`).
Names owned by D/E (verified in their designs): `readConfiguration`/`getConfiguration` in `src/config/env.ts` (zod), `createApp(config)` in `src/app.ts`, `getLogger()` in `src/utils/logger.utils.ts`, `CustomError` + `errorMiddleware` + `notFoundMiddleware`, `src/observability/{request-context,log-format,access-log}.ts`, `src/routes/health.route.ts`, graceful shutdown in `src/index.ts`, `requireAuth` and the CORS middleware under `src/middleware/`. Error body contract (D+E): `{ message, statusCode, correlationId, code?, errors? }`.

## 1. Package, TypeScript and dependency clean-up

Context: Connect needs `service/package.json` to have `gcp-build` and `start` scripts, the CLI needs `build`, `test` and `start`, and Connect's validation fails on HIGH/CRITICAL dependency advisories. We make the package conform and remove deploy artefacts of the old Cloud Run setup.

Pre-conditions: section 0.

- [x] 1.1 Delete Cloud Run leftovers: `git rm service/Dockerfile service/.dockerignore service/docker-compose.e2e.yml service/tests/integration/routes.spec.ts` (the last one is the unmodified CLI-template test of a controller that no longer exists; real tests come in group 6). If `service/postman/` still exists keep it only if spec F/P owns it, otherwise leave untouched.
  Done when: `ls service | grep -iE 'docker'` prints nothing.
- [x] 1.2 Rewrite `service/package.json`. Spec D already created it (Yarn 1, `yarn.lock`; scripts `build`, `gcp-build`, `start`, `start:dev`, `lint`, `typecheck`, `test`, `test:watch`); this task COMPLETES it. Compare with the target below and add only what is missing (`test:e2e`, `connector:*`, the bundling step in `build`, `license`, `engines`). Target shape (versions are minimums; run `yarn install` so the lockfile resolves current ones):
```json
{
  "name": "@commercetools-labs/contentools-service",
  "version": "1.0.0",
  "private": true,
  "license": "MIT",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "rimraf build && tsc -p tsconfig.build.json && node scripts/bundle-lifecycle.mjs",
    "gcp-build": "yarn build",
    "start": "node build/index.js",
    "start:dev": "<keep spec D's value: tsc --watch plus node --env-file=.env --watch build/index.js via concurrently>",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "jest --ci",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config e2e/jest.config.js --runInBand",
    "connector:post-deploy": "node build/connector/post-deploy.js",
    "connector:pre-undeploy": "node build/connector/pre-undeploy.js"
  }
}
```
  Dependencies must include `express@^4`, `cors`, `multer@^2`, `@commercetools/platform-sdk@^8`, `@commercetools/ts-client@^4`, `@commercetools-backend/loggers@^27`, the media SDKs (spec G), E's auth packages; devDependencies: `typescript@^5`, `esbuild`, `rimraf`, `jest@^29`, `ts-jest`, `supertest`, `msw@^2`, `yaml`, `@types/*`, `eslint` + plugins already used.
  Spec D already removed Firestore, legacy bundler and tenant packages; here only confirm with `yarn list` that none of `@commercetools/sdk-client-v2`, `@google-cloud/firestore`, `@babel/standalone`, `lit`, `rollup`, `vite`, `dotenv` remain, and add the missing devDependencies (`esbuild`, `yaml`).
  Done when: `yarn install` succeeds, `yarn list --pattern sdk-client-v2` prints nothing, and `node -e "const s=require('./package.json').scripts;['build','gcp-build','start','start:dev','typecheck','lint','test','test:e2e','connector:post-deploy','connector:pre-undeploy'].forEach(k=>{if(!s[k])throw new Error(k)})"` exits 0.
- [x] 1.3 TypeScript configs. `tsconfig.json` (editor + typecheck, includes tests): `"extends": "@tsconfig/node22/tsconfig.json"` (add that dev dependency) or inline `"target":"ES2022","module":"commonjs","moduleResolution":"node","strict":true,"esModuleInterop":true,"skipLibCheck":true,"resolveJsonModule":true`, `"include":["src","tests","e2e","scripts"]`, `"noEmit":true`.
  `tsconfig.build.json`: `{ "extends": "./tsconfig.json", "compilerOptions": { "noEmit": false, "outDir": "build", "rootDir": "src", "sourceMap": true }, "include": ["src"], "exclude": ["src/connector", "tests", "e2e"] }`.
  Done when: `yarn typecheck` exits 0 (fix type errors that D-G left, report them rather than hiding with `any`).
- [x] 1.4 Run `yarn audit --groups dependencies --level high; echo $?` -> `0`. Then `yarn audit --level high` (includes devDependencies): fix HIGH/CRITICAL findings by upgrading or `"resolutions"` in `package.json` (do not ignore). Done when both exit 0.
  Why: Connect's validation scans devDependencies too and refuses HIGH/CRITICAL findings that have a fix.
- [x] 1.5 `service/.nvmrc` containing `22` (if A did not create it) and `service/.gitignore` containing `node_modules`, `build`, `.env`, `.env.e2e`, `coverage`. Done when `git status --short service | grep -E 'node_modules|build/'` prints nothing.

Verification: `yarn install --frozen-lockfile && yarn typecheck`.
Rollback: `git checkout service/package.json service/yarn.lock service/tsconfig*.json` and `git reset service/Dockerfile ...` to restore the deleted files.
Pitfalls: `gcp-build` must not need environment variables or network beyond npm; `rimraf` must be a devDependency that Connect's install keeps until `gcp-build` ran (it does); the Connect build and the CLI detect Yarn from `yarn.lock`, so commit it and never add a `package-lock.json`.

## 2. Verify entry points, health route and shutdown (owned by spec D)

Context: spec D created `src/index.ts` (listen on 8080 / `PORT`, graceful shutdown on SIGTERM), `src/app.ts` (`createApp(config)`), `src/routes/health.route.ts` and the observability files. H does not rewrite them; it checks they satisfy the Connect contract and adds tests where D has none. If a check fails, fix it in place (small edits) and note it in the PR.

Pre-conditions: group 1 done; D archived.

- [x] 2.1 Check `src/index.ts`: reads `PORT` defaulting to 8080, listens, handles `SIGTERM` (close, exit 0, forced exit after 10 s), and calls spec G's `loadMediaConfig` (through D's `readConfiguration` or directly) before listening. Done when: `grep -n "8080\|SIGTERM" src/index.ts` shows both.
- [x] 2.2 Check `src/app.ts`: middleware order is `requestContext` -> `accessLog` -> CORS (E) -> `express.json({ limit: '2mb' })` -> health -> `app.use('/service', ...)` -> `notFoundMiddleware` -> `errorMiddleware`; there is no body-dumping logger (old `app.ts` lines 41-61 are gone: `grep -n "payload\|result:" src/app.ts` prints nothing) and the router is mounted exactly at `/service`.
- [x] 2.3 Check the health route name (the contract with spec M's post-deploy probe): `GET /service/health` and alias `GET /service/status` answer 200 `{"status":"UP"}`, unauthenticated, no outbound call; `GET /health` (no prefix) answers 404. If D mounted it at the app root, move it under `/service`.
- [x] 2.4 Run the app for real: `yarn build && PORT=8099 node build/index.js &` then `curl -s localhost:8099/service/health` prints `{"status":"UP"}`; `curl -s -o /dev/null -w '%{http_code}' localhost:8099/health` prints `404`; `kill %1`. (Needs the Connect-injected variables in the environment or a `.env` loaded with `--env-file`.)

Verification: group 6 tests. Rollback: `git checkout` the touched files.
Pitfalls: the 404 handler must be after all routers; never log `req.body`.

## 3. Verify observability (owned by spec D; H adds the missing guards)

Context: correlation id, JSON logs and the access log are required by the Connect checklist. Spec D implemented `request-context.ts`, `log-format.ts` and `access-log.ts` in `src/observability/` with the names agreed with H. H verifies behaviour against the H specs and adds the leak guards.

Pre-conditions: group 2 done.

- [x] 3.1 Compare D's implementation with spec `service-observability`: valid incoming `X-Correlation-ID` (`^[A-Za-z0-9._-]{8,128}$`) kept, otherwise UUID, echoed in the response header, added by the log format to every line (AsyncLocalStorage); access log writes the route template, status and duration, never body, query string or `Authorization`. Fix deviations in D's files (do not create parallel files). If D's access log lacks `businessUnitKey`, add it from `req.params` inside the `finish` callback.
- [x] 3.2 Grep audit for leaks: `grep -rnE "(logger|getLogger\(\))\.[a-z]+\(.*(req\.body|req\.headers|authorization|token|secret|password|originalname)" src` prints nothing; `grep -rn "console\." src` prints nothing. Fix each hit by logging identifiers only.
- [x] 3.3 Confirm `LOG_LEVEL` is honoured (D's logger factory takes the level from configuration) and that the key is declared in `connect.yaml` (group 4).

Verification: group 6 tests (they extend D's `tests/unit/observability.test.ts` rather than replace it).
Rollback: `git checkout` touched files.
Pitfalls: `AsyncLocalStorage.run(store, next)` keeps context across awaits only if `next` runs inside `run`; body-parser errors raised before `requestContext` would lack the id, hence the order in 2.2.

## 4. `connect.yaml`

Context: this file is the install contract. It must list every configuration key the service reads, split between standard and secured, plus the API-client scopes. Old file and reasons for each change: `design.md` decision 2. Specs L and M later append their `deployAs` entries to this same file.

Pre-conditions: groups 1-3 done; E's and G's final key lists known (`grep -n "key:" openspec/changes/e-service-auth-model/design.md`, same for G; use the archived specs under `openspec/specs/` if archived).

- [x] 4.1 Create `/Users/behnam/code/commercetools-labs/contentools/connect.yaml` (root!) with the block in design.md decision 1, written in long form:
```yaml
deployAs:
  - name: service
    applicationType: service
    endpoint: /service
    scripts:
      postDeploy: yarn connector:post-deploy
      preUndeploy: yarn connector:pre-undeploy
    configuration:
      standardConfiguration:
        - key: MAX_VERSIONS
          description: Maximum number of saved versions kept per page or content item; older versions are pruned on save.
          required: false
          default: "5"
        # ... one entry per row of design.md decision 1 ...
      securedConfiguration:
        - key: SERVICE_API_TOKEN
          description: ...
          required: false
inheritAs:
  apiClient:
    scopes:
      - manage_key_value_documents
      - view_products
```
  The auth and core rows are fixed by the finished specs D and E (verified): standard `CONTAINER_PREFIX` (default `""`), `CORS_ALLOWED_ORIGINS` (no default), `MC_REQUIRED_PERMISSION` (no default), `PUBLIC_DATASOURCE_RESOLVE` (default `"false"`), `PUBLIC_RESOLVE_MAX_PER_MINUTE` (default `"120"`); secured `SERVICE_API_TOKEN` (at least 32 characters, E enforces it; say so in the description). Re-read `openspec/changes/e-service-auth-model/tasks.md` task 2.2 and `d-service-core-single-tenant/design.md` section D2 once more and copy the names exactly; if they changed, the manifest and README follow them. Do NOT declare `CLOUD_IDENTIFIER` in the service block: spec L declares it once under `inheritAs.configuration`; if L is not implemented yet, leave it out (the drift test in 6.3 accepts keys from `inheritAs.configuration` too). Do NOT declare any `CTP_*` key. Do not leave comments saying PROVISIONAL.
  Done when: `node -e "const y=require('yaml').parse(require('fs').readFileSync('../connect.yaml','utf8'));console.log(y.deployAs[0].configuration.standardConfiguration.length, y.deployAs[0].configuration.securedConfiguration.length)"` (run from `service/` after `yarn add -D yaml`) prints `17 6` (adjust only if E changed its rows, and then also update the numbers in design.md).
- [ ] 4.2 Run the Connect CLI static check from the repo root: `commercetools connect validate . --skip tests --skip analysis` (this still builds the image and needs Docker; first run downloads images and takes several minutes). Expected: the build step for `service` reports success. If the build fails, read the log path printed by the CLI.
  Done when: the command exits 0.

Verification: group 6 manifest tests. Rollback: `git rm connect.yaml`.
Health route name (contract with spec M's post-deploy probe): `GET /service/health`, alias `/service/status`; never `/health`.
Pitfalls: Connect silently drops values for keys not declared here, so a missing declaration looks like "the setting does nothing"; defaults must be quoted strings; `inheritAs.apiClient` is top-level (shared by every app in the file), never add a scope for L/M here without updating the README scope table and `tests/connect/manifest.test.ts`; a `deployAs[].name` must equal its folder name.

## 5. Lifecycle scripts

Context: `postDeploy` runs once per deployment and is the cheapest place to discover a wrong client scope or a bad bucket key; it must only read. `preUndeploy` must not delete customer data. Both are bundled so they run without `node_modules`.

Pre-conditions: groups 1-4 done; spec G's `loadMediaConfig` and `createStorageProvider` exist.

- [x] 5.1 `service/src/connector/env.ts`: `readLifecycleEnv(env)` returning `{ apiUrl, authUrl, projectKey, clientId, clientSecret }` or throwing `LifecycleError('config', 'missing: CTP_API_URL, ...')` (names only). Strip trailing `/` from URLs. `LifecycleError` has `check` and `reason`.
- [x] 5.2 `service/src/connector/checks.ts`: pure async functions taking `(ctx, fetchFn = fetch)`:
  - `checkToken(env)`: `POST ${authUrl}/oauth/token` with header `Authorization: Basic base64(clientId:clientSecret)` and body `grant_type=client_credentials`; non-2xx -> `LifecycleError('token', `HTTP ${status}`)`; returns `{ accessToken, scope }`.
  - `checkScopes(scope, projectKey)`: each of `manage_key_value_documents:${projectKey}`, `view_products:${projectKey}` must be in `scope.split(' ')` else `LifecycleError('scopes', 'missing scope <name without project key>')`.
  - `checkCustomObjects(...)`: `GET ${apiUrl}/${projectKey}/custom-objects/puck-page?limit=1` with `Authorization: Bearer`; non-2xx -> `LifecycleError('custom-objects', `HTTP ${status}`)`. (Use the container constant from F; import it instead of repeating the literal.)
  - `checkProductSearch(...)`: `POST ${apiUrl}/${projectKey}/products/search` body `{"limit":1}`; 200 -> ok; 400 with `errors[0].code === 'ObjectNotFound'` -> returns `warn` with hint "Product Search is not activated: Merchant Center > Settings > Project settings > Storefront Search"; 401/403 -> `LifecycleError('product-search', ...)`; other -> `LifecycleError`.
  - `checkStorage(env)`: `const cfg = loadMediaConfig(env)` (a `MediaConfigError` becomes `LifecycleError('storage', e.message)`); `provider === 'none'` -> `skipped`; else `createStorageProvider(cfg)` then `checkConnectivity()`; `StorageUnavailableError` -> `LifecycleError('storage', e.message)`.
  Each returns `{ check, status: 'ok' | 'warn' | 'skipped', detail? }`.
  Verify the exact body accepted by Product Search against a sandbox (Q-H4); if `{"limit":1}` is rejected, add a minimal `query` taken from the Product Search docs (`https://docs.commercetools.com/api/projects/product-search`) and keep `limit: 1`.
- [x] 5.3 `service/src/connector/post-deploy.ts`:
```ts
async function run(): Promise<void> {
  const results: CheckResult[] = [];
  try {
    const env = readLifecycleEnv(process.env);
    const { accessToken, scope } = await checkToken(env); results.push(ok('token'));
    checkScopes(scope, env.projectKey); results.push(ok('scopes'));
    results.push(await checkCustomObjects(env, accessToken));
    results.push(await checkProductSearch(env, accessToken));
    results.push(await checkStorage(process.env));
    for (const r of results) console.log(JSON.stringify({ msg: 'post-deploy', ...r }));
  } catch (e) {
    for (const r of results) console.log(JSON.stringify({ msg: 'post-deploy', ...r }));
    const err = e instanceof LifecycleError ? e : new LifecycleError('unexpected', 'unexpected failure');
    console.error(JSON.stringify({ msg: 'post-deploy', check: err.check, status: 'failed', reason: err.reason }));
    process.exitCode = 1;
  }
}
void run();
```
  Never print `e.message` of non-Lifecycle errors (can contain URLs with credentials). Done when: lifecycle tests (6.5) pass.
- [x] 5.4 `service/src/connector/pre-undeploy.ts`: prints `{"msg":"pre-undeploy","status":"ok","retained":{"customObjectContainers":[...],"mediaPrefix":"..."}}` using the container constants from F and `MEDIA_PATH_PREFIX`; sends no request; exit 0.
- [x] 5.5 `service/scripts/bundle-lifecycle.mjs`:
```js
import { build } from 'esbuild';
await build({ entryPoints: ['src/connector/post-deploy.ts', 'src/connector/pre-undeploy.ts'], outdir: 'build/connector',
  bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: 'linked', logLevel: 'info', external: [] });
```
  Run `yarn build` -> expect `build/connector/post-deploy.js` and `pre-undeploy.js` and `build/index.js`.
  Done when: `ls build/connector` lists both files, and the standalone test below passes.
- [x] 5.6 Standalone proof: `mkdir -p /tmp/lc && cp build/connector/post-deploy.js /tmp/lc/ && (cd /tmp/lc && env -i PATH="$PATH" CTP_API_URL=http://127.0.0.1:9 CTP_AUTH_URL=http://127.0.0.1:9 CTP_PROJECT_KEY=p CTP_CLIENT_ID=i CTP_CLIENT_SECRET=s node post-deploy.js; echo "exit=$?")`.
  Expected: stderr JSON with `"check":"token"` and `"status":"failed"` (connection refused) and `exit=1`, and NO `Cannot find module` error. If bundling a storage SDK fails or the file is unusably large, mark that SDK `external` only for the lifecycle bundle, change `postDeploy` in `connect.yaml` to `yarn install --production --frozen-lockfile && yarn connector:post-deploy`, and record the decision in `design.md` Risks.
  (Use the scratch directory given by the session if `/tmp` is not allowed.)

Verification: group 6 `lifecycle.test.ts`. Rollback: delete `src/connector`, `scripts/bundle-lifecycle.mjs`; restore `package.json` scripts.
Pitfalls: `process.exit(1)` inside async code can truncate output, set `process.exitCode`; Node 22 has global `fetch`, do not add `node-fetch`; the token endpoint of commercetools is `${authUrl}/oauth/token` (the injected `CTP_AUTH_URL` has no trailing path); do not use the `@commercetools/ts-client` in lifecycle code (plain `fetch` keeps the bundle small and the failure messages controlled); never print `process.env`.

## 6. Tests (offline; run via `commercetools connect application test`)

Context: the Connect checklist requires tests of real behaviour. Spec B provides the jest, supertest and msw wiring; placeholders `tests/support/*` below stand for B's modules. Set `jest.config.cjs`: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `testMatch: ['<rootDir>/tests/**/*.test.ts']`, `testPathIgnorePatterns: ['/e2e/']` (adapt to B's file if it exists).

Pre-conditions: groups 1-5 done.

- [x] 6.1 `tests/connect/manifest.test.ts`. Parse `../connect.yaml` (`yaml.parse`). Assert: every `deployAs[].name` has a directory at the repo root; `service` entry: `applicationType === 'service'`, `endpoint === '/service'`, `scripts.postDeploy === 'yarn connector:post-deploy'` and `scripts.preUndeploy === 'yarn connector:pre-undeploy'`; no key in either list starts with `CTP_`; every entry has non-empty `description` and boolean `required`; secret-pattern rule (`/SECRET|TOKEN|PRIVATE|PASSWORD|API_KEY|ACCESS_KEY|_B64$/` never in `standardConfiguration`); the six expected secured keys present; `inheritAs.apiClient.scopes` sorted equals `['manage_key_value_documents','view_products']`; root `package.json` has no `workspaces`; `service/package.json` scripts present and no `@commercetools/sdk-client-v2` dependency; no file `service/Dockerfile`; `service/src/_pending` does not exist (spec D parked unported files there; F and G must have emptied and removed it); `service/yarn.lock` exists and `service/package-lock.json` does not. One `it` per scenario of spec `connect-service-manifest`.
- [x] 6.2 `tests/connect/route-mount.test.ts`: supertest against `app`: `GET /service/health` 200 `{status:'UP'}`; `GET /service/status` 200; `GET /health` 404.
- [x] 6.3 `tests/connect/drift.test.ts`: collect the environment names the service reads from three places in `src/**/*.ts` (use `fs.readdirSync(dir, { recursive: true })`): (a) `process.env.NAME` and `process.env['NAME']`; (b) `env.NAME` and `env['NAME']` where `env` is the parameter of `readConfiguration`/`loadMediaConfig` (regex `/\benv(?:\.|\[['"])([A-Z][A-Z0-9_]+)/g`); (c) the keys of the zod schema in `src/config/env.ts` (regex `/^\s+([A-Z][A-Z0-9_]+):\s*z\./gm`). Assert each name is in `declared ∪ ALLOW`, where `declared` = keys of the `service` block of `connect.yaml` plus everything under `inheritAs.configuration` (spec L declares `CLOUD_IDENTIFIER` there) and `ALLOW = ['NODE_ENV','PORT','CONNECT_SERVICE_URL','CTP_API_URL','CTP_AUTH_URL','CTP_PROJECT_KEY','CTP_CLIENT_ID','CTP_CLIENT_SECRET','CTP_SCOPE']`; the failure message lists the undeclared names. Also assert the reverse (every declared service key is read somewhere; `CLOUD_IDENTIFIER` is read by E). Also assert `src/_pending` does not exist, and the scope audit: `src` contains `.customObjects(` and `.search(` and none of `.extensions(`, `.subscriptions(`, `.orders(`, `.customers(`, `.businessUnits(`, `.stores(`, `.productTypes(`.
  Names that the finished specs declare and that this test must find in the manifest: `CONTAINER_PREFIX`, `CORS_ALLOWED_ORIGINS`, `MC_REQUIRED_PERMISSION`, `PUBLIC_DATASOURCE_RESOLVE`, `PUBLIC_RESOLVE_MAX_PER_MINUTE`, `SERVICE_API_TOKEN`, `LOG_LEVEL`, `MAX_VERSIONS` (D, E), and the 15 `MEDIA_*` keys (G).
- [x] 6.4 `tests/observability/*.test.ts` (extend D's `tests/unit/observability.test.ts`; do not duplicate cases D already covers, add the missing ones):
  - `correlation.test.ts`: supertest with a log capture (add a winston `Transport` subclass or spy on the logger module's `info`/`log`; pick whichever D's logger allows): supplied id kept and echoed; malformed id replaced and absent from logs; deep log call (a helper `async function deep(){ logger.info('deep') }` invoked from a test route registered on a test app that uses `requestContext`) carries the id.
  - `logging.test.ts`: POST a JSON body with `sentinel-body` and a header `Authorization: Bearer sentinel-token` to a mounted route (use the media route or a test route with auth stub) -> exactly one `http.request` line, route template string, none of the sentinels in any captured line; `LOG_LEVEL=warn` produces no info lines (create the logger through a factory function so the test can pass a level).
  - `errors.test.ts`: a route throwing `new Error('secret path /srv/app/x.ts')` -> 500 `{"message":"Internal server error"}`, body lacks `secret path`, one error log line has the correlation id; unknown `/service/does-not-exist` -> 404 JSON without `stack`; with `NODE_ENV=production` explicitly set.
  - `shutdown.test.ts`: only if D has no shutdown test: test D's shutdown helper with a fake server and a spy `exit` (calls `exit(0)` after the `close` callback). If D left the logic inline in `index.ts`, extract it into a small function first.
- [x] 6.5 `tests/connect/lifecycle.test.ts`: start an msw `setupServer` in a mode where the scripts run in a child process, which msw cannot intercept; therefore start a real tiny `http.createServer` mock (auth + API) in the test on port 0 and pass its URL as `CTP_AUTH_URL`/`CTP_API_URL`; run `node build/connector/post-deploy.js` via `child_process.spawnSync` (the test file's `beforeAll` runs `yarn build` once if `build/connector` is missing; `jest` timeout 120 s). The mock records `method path` of every request. Cases mirroring spec `connect-lifecycle-scripts`:
  valid -> exit 0 and 4-5 `ok` lines; token 401 -> exit 1, output has `401`, no sentinel secret; token without `view_products:<key>` -> exit 1, names `view_products`; search 400 `ObjectNotFound` -> exit 0 with `warn`; missing env var -> exit 1 listing names; storage: `MEDIA_STORAGE_PROVIDER=aws` with empty secret -> exit 1 naming `MEDIA_AWS_SECRET_ACCESS_KEY`; idempotent: two runs -> equal exit codes and identical request lists, and the list contains only `POST /oauth/token`, `GET /custom-objects/...`, `POST /products/search`; `pre-undeploy.js` with a mock that records requests -> exit 0 and zero requests; sentinel secrets (`sentinel-secret-1` as client secret etc.) never appear in stdout/stderr in any failing case.
  Storage success path is covered by spec G's provider tests; here use `none` and the failing `aws` case (a real AWS call must never happen: the failure occurs before the SDK is called because config loading fails first).
- [x] 6.6 `tests/connect/readme.test.ts`: see group 7 (needs the README). Write it now, it fails until 7.x is done.
- [x] 6.7 Run: `yarn test` -> all green (record the number); then `commercetools connect application test` (inside `service/`) -> the CLI prints its start line, runs `yarn run test`, and ends with a success message.

Verification: `yarn test`, `yarn typecheck`, `yarn lint`, `commercetools connect application test` from `service/`.
Rollback: delete `tests/connect`, `tests/observability`.
Pitfalls: tests must not need `.env` (Connect runs them in an image without it); never import `build/` outputs from tests other than `lifecycle.test.ts`; `jest` default timeout 5 s is too short for the `yarn build` in `beforeAll`; msw does not intercept child processes (hence the real mock server); keep `onUnhandledRequest: 'error'` for the in-process tests.

## 7. README (`service/README.md`)

Context: the Connect checklist requires the README to state fail-open/closed, scopes, the full configuration table and the replay runbook. A guard test keeps README and manifest in sync.

Pre-conditions: group 4 done.

- [x] 7.1 Create `service/README.md` with: a banner `> Unsupported: this is a commercetools-labs project, provided AS IS without support. See ../LICENSE.` (the labs rules require "unsupported" three times: file header, README banner, SUPPORT.md; the root README of spec P carries its own banner; this banner is the package-level one) and these second-level headings, in order:
  `What it is` (one paragraph + route-group table: content `puck-pages`, `puck-contents`, `puck-templates`, `configuration/*`, `datasource/*`, `products/search`, `content-type/import`, `upload-file`, `media-library`, `health`), `Run locally`, `Deploy`, `Scopes`, `Configuration`, `Lifecycle scripts`, `Fail-open and fail-closed`, `Logs and correlation ids`, `Poison messages and replay`, `Troubleshooting`.
  - `Run locally`: (a) plain Node: `cp .env.example .env`, fill `CTP_API_URL`, `CTP_AUTH_URL`, `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`; `yarn install`, `yarn start:dev` (http://localhost:8080/service/health) or `yarn build && node --env-file=.env build/index.js`; (b) Connect CLI: `commercetools connect application build`, `commercetools connect application start`, `commercetools connect application test` (run inside `service/`).
  - `Deploy`: ordered commands: `commercetools auth login` (OAuth client with Connect scopes), `commercetools connect validate .`, `commercetools connect connectorstaged create --repository-url <url> --repository-tag <tag> --creator-email <email> --name contentools`, `... connectorstaged preview ...`, `... deployment create --connector-key <key> --region <region> --type sandbox` (same region as the project), `... deployment describe`, `... deployment logs --key <k> --application service`; redeploy for config changes (`deployment redeploy --key <k> --configuration KEY=value`, `updateConnector` after a new tag). Say: pass every configuration key you want on each redeploy because undeclared keys are dropped and omitted values may reset (verify with `describe`).
  - `Scopes`: table of the two scopes and the calls that need them (copy from design.md decision 4) and the sentence "No `manage_project`, no write access to products, no extensions/subscriptions: this service registers none."
  - `Configuration`: the full table: columns `Key | Standard or secured | Required | Default | Description`, one row per key in `connect.yaml` (generate with a throwaway script `node -e` from the YAML, then paste; the guard test checks it). Above the table: "`CTP_*` variables are injected by Connect (client generated from the scopes above) and are not configured. Provider-specific `MEDIA_*` keys are optional in the manifest because Connect cannot express conditions; they are required by the service when the provider is selected and checked at start and in postDeploy."
  - `Lifecycle scripts`: what `postDeploy` checks (the five checks, exit codes, `warn` for Product Search), that it never writes, that `preUndeploy` never deletes data, which containers/prefix remain, and: "A failing script may not mark the deployment as failed; read `deployment logs`."
  - `Fail-open and fail-closed`: the table from design.md decision 8 with columns `Use case | Stance | Status | Budget`, including the row "commercetools operations (carts, orders): not affected. The service registers no API Extension and no Subscription, so an outage can never block them."
  - `Logs and correlation ids`: `commercetools connect deployment logs --key <k> --application service --startDate <iso> --endDate <iso>`; every line is JSON; filter on `correlationId`; send your own `X-Correlation-ID` (8-128 chars of `[A-Za-z0-9._-]`) to trace a call; no bodies or tokens are logged.
  - `Poison messages and replay`: "This service is not an event application: it has no Subscription, queue or dead-letter store, so messages cannot be redelivered or poisoned. Every request is synchronous and answered with its result. If a write fails the caller sees the status code and retries; content writes are upserts of Custom Objects by container and key, so repeating the same request is safe (versions are appended with pruning to `MAX_VERSIONS`; repeating a PUT of the same content creates one more version, not a duplicate page). To re-apply a change, repeat the request; to investigate, search `deployment logs` for the response's `X-Correlation-ID`."
  Confirm the claim about repeating writes by reading F's controllers; if F creates duplicates on repeated POST, say so.
  Done when: all headings exist (`grep -c '^## ' README.md` prints 10).
- [x] 7.2 `tests/connect/readme.test.ts`: parse `service/README.md`; assert the eight required headings of the spec; extract the Configuration table rows (lines starting `|` under that heading), assert the key set equals the keys of `connect.yaml` and each row's standard/secured and default match; Scopes section mentions exactly the two scopes; `Fail-open and fail-closed` contains `API Extension` and `never block`; `Poison messages and replay` contains `not an event application`; banner contains `Unsupported`.
  Done when: `yarn test tests/connect/readme.test.ts` is green.

Verification: `yarn test`. Rollback: `git rm service/README.md`.
Pitfalls: table cells containing `|` break parsing (use `or`); keep defaults identical to the manifest strings (quote-free in README).

## 8. Local run and sample env

Context: a newcomer must be able to run the service against a sandbox project in minutes without Connect.

- [x] 8.1 `service/.env.example`: rewrite from `/Users/behnam/code/cms/service/.env.example`: remove everything Firestore (`GCP_FIRESTORE_*`), JWT (`JWT_*`), tenant and old storage names; add `CTP_API_URL=https://api.<region>.commercetools.com`, `CTP_AUTH_URL=https://auth.<region>.commercetools.com`, `CTP_PROJECT_KEY=`, `CTP_CLIENT_ID=`, `CTP_CLIENT_SECRET=`, `CTP_SCOPE=manage_key_value_documents view_products` (comment: Connect injects these; locally create an API client with exactly these two scopes), then every key of `connect.yaml` with empty or default values (the 17+6 keys plus any `inheritAs.configuration` key the service reads), `PORT=8080`. No real values.
  Done when: `tests/connect/env-example.test.ts` (write it now) passes: it parses `.env.example` keys and asserts they equal the keys declared in `connect.yaml` plus the six `CTP_*` variables plus `PORT`, and that no value looks like a real secret (every value is empty, a default from the manifest, or a `<placeholder>`).
- [x] 8.2 Run it for real (needs M-01 sandbox credentials; skip with a note if not available): `cp .env.example .env`, fill, `yarn start:dev`; in another shell `curl -s localhost:8080/service/health` -> `{"status":"UP"}`; `curl -s -i localhost:8080/service/main-bu/puck-pages` -> `401` (not public list; E) with an `x-correlation-id` response header; `curl -s -H 'x-correlation-id: trace-12345678' -i localhost:8080/service/health | grep -i x-correlation-id` echoes it; the server log line for that call contains `"correlationId":"trace-12345678"`.
  Then run the lifecycle script against the real project: `yarn build && node --env-file=.env build/connector/post-deploy.js; echo exit=$?` -> `ok` lines and `exit=0` (or `warn` for product-search if not activated).
  Done when: the expected outputs are observed (or "skipped: no credentials" is written in the PR description).

Verification: above. Rollback: `git checkout service/.env.example`.

## 9. Connect validation and optional sandbox deployment

Context: the final proof is Connect's own validator (build in the real buildpack image, tests inside the image, static analysis, dependency scan). A real deployment additionally needs the owner's Connect access (M-05).

- [ ] 9.1 From the repo root with Docker running: `commercetools connect validate .` (first run pulls several GB of images; allow 15 min). Expected: each step for `service` reports success and the final status is success. On failure open the log path the CLI prints. Typical fixes: failing offline test (a test used the network or `.env`), HIGH/CRITICAL advisory (upgrade or `resolutions`), missing `gcp-build`/`start` script, build needing a missing dev dependency.
  Done when: the command exits 0. Record the date and CLI version in the PR description.
- [x] 9.2 Local gate script: at the repo root `package.json` (the tooling hub from spec A) add or confirm `"verify:service": "yarn --cwd service install --frozen-lockfile && yarn --cwd service typecheck && yarn --cwd service lint && yarn --cwd service test && yarn --cwd service build"`. (No hosted CI exists by owner decision.) Done when: `yarn verify:service` exits 0.
- [ ] 9.3 (needs M-05 and the public repository, M-H4) Sandbox deployment from the SAME repository by git tag (no private fork): after the publish gate (spec R) made the repo public, cut a release-candidate tag (`git tag v1.0.0-rc.1 && git push origin v1.0.0-rc.1`), then follow the README `Deploy` section: `commercetools connect connectorstaged create --repository-url https://github.com/commercetools/contentools.git --repository-tag v1.0.0-rc.1 --creator-email <email> --name contentools`, `... connectorstaged preview ...` or `... deployment create --connector-key <key> --region <region> --type sandbox`. For the next candidate push a new tag `v1.0.0-rc.2` and move the staged connector (`setRepository`/`publish`, then `deployment redeploy` with `updateConnector: true`). After `deployment describe` shows `Deployed`: `deployment logs --key <k> --application service` contains the `post-deploy` JSON lines with `"status":"ok"`; `curl -s https://<service-url>/service/health` -> `{"status":"UP"}`; `deployment redeploy` once -> the same `post-deploy` lines again (idempotent, nothing duplicated).
  Done when: observed, or recorded as "not run: repository not public yet / no Connect access" in the PR description. Until the repo is public this task is deferred; everything before it is verified locally (`commercetools connect validate .` needs no remote repository).
- [x] 9.4 Hand-off: tell spec L and M owners (comment in `openspec/changes/l-*/` and `m-*/` or the PR): the root `connect.yaml` exists with `service` + `inheritAs.apiClient`; they append `deployAs` entries and do not edit `inheritAs.apiClient`; `CONNECT_SERVICE_URL` is the service URL for their config.

Verification: 9.1-9.3. Rollback: none needed (no state); a sandbox deployment is removed with `commercetools connect deployment delete --key <k>` (this leaves Custom Objects and bucket content in place, by design).
Pitfalls: `validate` rebuilds the image on every call and needs the docker socket; on Apple Silicon the builder runs as `linux/amd64` and is slow; do not run validate while another Docker build uses the same ports.

## 10. Definition of Done (mapped to spec scenarios)

| Spec | Scenario group | Proven by |
| ---- | -------------- | --------- |
| connect-service-manifest | Name/folder/endpoint, router mount, no workspaces | 6.1, 6.2 |
| | Drift guard, secret classification, injected keys, conditional keys | 6.3, 6.1; G's config tests |
| | Least-privilege scopes, scopes used | 6.1, 6.3 |
| | Package scripts, CLI test run, build and start | 6.1, 6.7, 2 verification |
| | Cloud Run artefacts removed | 1.1 and `grep -rniE 'dockerfile|cloud run|gcloud|firestore' service ../connect.yaml` (excluding node_modules/build) prints nothing |
| | Validates with Connect CLI | 9.1 |
| connect-lifecycle-scripts | Self-contained, token/scopes/custom objects/search/storage checks, idempotent, preUndeploy, failures visible | 5.6, 6.5 |
| service-observability | Correlation id, structured logs without bodies, health, error hygiene, shutdown | 6.2, 6.4 |
| service-connector-readme | Fail-open/closed, scopes + config table, poison/replay, operation sections | 7.2 |

Overall done when: `yarn verify:service` is green; `commercetools connect application test` (in `service/`) exits 0; `commercetools connect validate .` exits 0; `grep -rniE '\bcms\b' service connect.yaml --exclude-dir=node_modules --exclude-dir=build` prints nothing;
every `.ts`/`.mjs` file under `service/src`, `service/scripts`, `service/tests` contains `SPDX-License-Identifier: MIT`; the README guard test passes; no file named `*.yml` under `.github/` exists (none is created).
