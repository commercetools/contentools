# Explore notes: h-service-connect-app

Working note (not an OpenSpec artifact). Source paths are under `/Users/behnam/code/cms/` (read-only).

## 1. The old `connect.yaml` (`/Users/behnam/code/cms/connect.yaml`, 60 lines)

| Lines | Content | Problem |
| ----- | ------- | ------- |
| 1-6 | `deployAs: name: service, applicationType: service, scripts.postDeploy: node build/connector/post-deploy.js` | `service/src/connector/` does not exist (`ls service/src`: api, app.ts, client, constants.ts, controllers, errors, index.ts, interfaces, mappers, middleware, routes, samples, services, types, utils, validators). The script path points at a file that is never built. No `preUndeploy`. |
| 7 | `endpoint: /service` | Correct: `app.ts` line 64 mounts `app.use('/service', ServiceRoutes)`. |
| 8-13 | `MAX_VERSIONS` standard, default `"5"` | Fine (read in `src/constants.ts` line 8). |
| 14-23, 35-40 | AWS and Cloudinary keys commented out | Dead config; those backends were unconfigurable on Connect. |
| 24-32 | `GCP_BUCKET_NAME`, `GCP_PROJECT_ID`, `GCP_STORAGE_SERVICE_ACCOUNT_CLIENT_EMAIL` standard, all `required: false` | Half of a credential in a visible field; nothing validates it. |
| 41-46 | `GCP_STORAGE_SERVICE_ACCOUNT_PRIVATE_KEY` secured, `required: false` | Key material optional, PEM newlines repaired in code (`gcp-file-controller.ts` lines 19-23). |
| 56-61 | `inheritAs.configuration.standardConfiguration: STORAGE_TYPE, default gcpcms` | Invalid default; `FileControllerFactory` throws `Unsupported storage type: gcpcms`. Global scope although only the service reads it. |
| (absent) | no `inheritAs.apiClient` | The service used per-tenant credentials from Firestore (`middleware/project.middleware.ts`), so Connect never generated a client. |
| (absent) | keys the runtime requires but the file never declared | `JWT_SECRET` (`utils/secrets.utils.ts` line 7), `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION`, `GCP_FIRESTORE_*` (`utils/firestore.utils.ts` lines 20-22), `CORS_ALLOWED_ORIGINS` (`constants.ts` line 5). A Connect deployment of the old file could not have worked. |

## 2. The old service as an application

* `service/package.json`: scripts `start` (`node build/index.js`), `gcp-build` (`tsc`), `start:dev` (concurrently+nodemon), `build`, `test` = `echo 'No tests for now'`, `test:e2e`. Yarn 1 (`packageManager: yarn@1.22.22`), `@commercetools/sdk-client-v2` (legacy), `@commercetools-backend/loggers ^21`, firestore, lit, rollup, babel, vite (all removed by C/D). Node 22 in `Dockerfile`, `.nvmrc`.
* `service/Dockerfile` (two-stage node:22-alpine, `EXPOSE 8080`) and `service/docker-compose.e2e.yml` (`build: dockerfile: Dockerfile`), `service/.dockerignore`: Cloud Run artefacts; Connect builds with Google buildpacks, so these are deleted.
* `src/index.ts`: `PORT = 8080` hard-coded; no graceful shutdown. `src/app.ts` lines 41-61: a request logger that does `console.log(JSON.stringify({ source, method, url, payload: req.body, status, result: body, durationMs }))`, i.e. it logs every request body and every response body (tokens, credentials posted to `authenticate-project`, page JSON). No correlation id. Lines 63-69: `app.use('/service', ...)`, a 404 `CustomError`, `errorMiddleware`.
* `src/middleware/error.middleware.ts`: hides stacks unless `NODE_ENV === 'development'`; typo `messge`. In development it returns `error.message` and `stack`.
* There is no health route anywhere (`grep -rn health src` finds nothing). `tests/integration/routes.spec.ts` is the unmodified CLI template test (targets a `service.controller` that no longer exists).
* `src/utils/logger.utils.ts`: `createApplicationLogger()` from `@commercetools-backend/loggers` (winston). Installed copy 21.25.2 (`node_modules/@commercetools-backend/loggers/dist/declarations/src/types.d.ts`): options `level`, `silent`, `json`, `formatters: Format[]`.

## 3. commercetools API calls actually made (scope audit of the KEPT surface)

Method: `grep -rnE "apiRoot|\.execute\(\)" src` and reading each caller.

| Call | Where | Scope needed |
| ---- | ----- | ------------ |
| Custom Objects create/update (`POST /custom-objects`), get by container+key, query by container, delete by container+key | `controllers/custom-object.controller.ts` lines 28-212; used by `configuration.controller.ts`, `puck-page.controller.ts`, `puck-content.controller.ts`, `puck-template.controller.ts`, `content-type-import.controller.ts`, routes for datasource and content-type (containers `puck-page`, `puck-page-state`, `puck-page-version`, `puck-content*`, `puck-template`, `configuration`, `content-type`, datasource container) | `manage_key_value_documents` (read+write+delete; `view_key_value_documents` alone is insufficient). Source: https://docs.commercetools.com/api/scopes (API extensibility > Custom Objects). |
| Product Search `POST /products/search` | `services/products.ts` lines 17-23, used by `controllers/product.controller.ts` (`GET /products/search` picker and the `product-by-sku`/`products-by-sku` datasources) | `view_products` (docs: product-search page; the API must be activated per project and deactivates itself after 30 days without calls: `ObjectNotFound` 400). |
| `GET /product-types/{id}` | `services/products.ts` `getProductTypeById` lines 32-51 | No caller in the kept routes (`grep -rn getProductTypeById src` finds only the definition). Not carried over; no scope needed. |
| Everything else (`pages`, `content-item*`, `page-*`) | legacy controllers | Removed by spec C; they only used Custom Objects. |
| Business units, stores, orders, customers, categories, extensions, subscriptions, types | none | No call exists. `view_business_units` and `view_stores`, listed in `plans/manual-steps.md` M-01 as a draft, are NOT needed: the BU in the URL is only a Custom Object key prefix, never resolved against the API. |

Derived least-privilege list for `inheritAs.apiClient.scopes`: `manage_key_value_documents`, `view_products`.
The lifecycle scripts need no further scope (they only read Custom Objects and call Product Search).

## 4. Connect platform facts (verified, with sources)

* Injected variables with `inheritAs.apiClient`: `CTP_API_URL`, `CTP_AUTH_URL`, `CTP_CLIENT_ID`, `CTP_PROJECT_KEY`, `CTP_CLIENT_SECRET`, `CTP_SCOPE` (https://docs.commercetools.com/connect/modify-connector). **There is no `CTP_REGION`**; the brief's locked decision lists it; the API/auth URLs are given directly. Recorded as a deviation (design.md, question Q-H1).
* `CONNECT_SERVICE_URL` is provided to `postDeploy` of a `service` app (https://docs.commercetools.com/connect/automation-scripts).
* Required `package.json` scripts: `gcp-build` and `start` (listening on 8080) (https://docs.commercetools.com/connect/convert-existing-integration).
* Service resources: 1 CPU, 512 MB, request timeout 5 min, stateless (https://docs.commercetools.com/connect/best-practices).
* Request body limit of the Connect gateway for multipart uploads: not documented; verify live (question Q-H3).
* Connect CLI 0.0.17 is installed here (`commercetools --version`). Read from its sources
  (`@commercetools/cli-topic-connect/dist/services/application.service.js`, `common/node-pkg-manager.js`):
  `commercetools connect application build|test|start` must be run INSIDE the application folder (it uses `path.resolve()` of the
  cwd), fail with "no script" unless `package.json` has `build`, `test` or `start`, and run `<pm> run <script>` where `<pm>` is detected by `nypm`
  (yarn when `yarn.lock` exists, npm otherwise; this repo uses Yarn 1 classic for service, admin-app and mcp by owner decision). Therefore the scripts are named exactly `build`, `test`, `start`.
* `commercetools connect validate [DIRECTORY] [--skip tests|analysis]` (`dist/commands/connect/validate.js`) needs Docker (`DockerUtilities.check()`).
  The validator package (`@commercetools-connect/connector-validator`) builds each app with Google buildpacks (`gcr.io/buildpacks/builder`, `buildpacksio/pack`), runs
  the tests in the image (`connect-tester` post-buildpack; result file `OVER_ALL_TEST_RESULT`), a SAST scan (Sonar) and a Trivy scan
  `fs --scanners vuln --severity HIGH,CRITICAL --include-dev-deps --ignore-unfixed` (`tasks/run-sca-scan.js`). Consequences: tests must pass offline in the image;
  any HIGH/CRITICAL advisory with a fix, including in devDependencies, fails validation.
* The sibling `/Users/behnam/code/commercetools-labs/search-config` shows a working layout: `connect.yaml` with `scripts: postDeploy: yarn connector:post-deploy`, `service/build.mjs` (esbuild),
  lifecycle scripts bundled to be self-contained because "node_modules may be absent when they run" (`service/build.mjs` comment), yarn 1 lockfile, `engines.node >=22`,
  Connect build refuses HIGH/CRITICAL `yarn audit` findings (`docs/service-runbook.md` line 60), `file:` dependencies trigger Connect's common-module buildpack (line 25), undeclared
  configuration keys are dropped silently by Connect (`tools/connect-deploy.mjs` header), `/service/health` + `/healthz`.
* `plans/` decisions that bind H: single tenant; apps `service`, `admin-app`, `mcp` are root siblings; Node 22; `@commercetools/platform-sdk@^8`, `@commercetools/ts-client@^4`;
  no GitHub Actions (owner decision); Firestore gone entirely (owner decision: no `GCP_FIRESTORE_*`, GCP only as optional media backend).

## 5. Environment variables the kept service code reads (to be reconciled by a test)

From `grep -rho "process.env\.[A-Z_]*" src`: `MAX_VERSIONS`, `CORS_ALLOWED_ORIGINS`, `NODE_ENV`, the `*_CONTAINER`/`*_KEY` overrides in `constants.ts` (data-schema names such as
`PUCK_PAGE_CONTAINER`; NOT exposed as Connect keys, see design.md decision 7), storage keys (spec G), and keys removed by D/E (`JWT_*`, `GCP_FIRESTORE_*`, `GCP_*` Firestore halves).
New in the target: `CTP_*` (injected), `SERVICE_API_TOKEN` (E, locked by the brief), `LOG_LEVEL`, `PORT` (local only), `CONNECT_SERVICE_URL` (runtime audience, E), `MEDIA_*` (G).
A drift test (tasks group 9) fails when `src/` reads a variable that `connect.yaml` neither declares nor allow-lists as injected.

## 6. Risks recorded

1. D, E, F, G finish before H, but their final names (config reader, auth middleware, E's keys) are not known; tasks use placeholders plus the drift test as the safety net.
2. `inheritAs.apiClient.scopes` is top level, so it applies to every application in the shared `connect.yaml`; specs L and M must not widen it silently.
3. Whether a failing `postDeploy` fails the deployment is not documented; scripts exit 1 and the README says to read `deployment logs`.
4. Whether `node_modules` exists when `postDeploy` runs is unknown; bundling the scripts removes the question.
5. Product Search may be inactive in a fresh project; `postDeploy` warns rather than fails.
