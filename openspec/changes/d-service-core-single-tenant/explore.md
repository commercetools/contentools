# Explore notes: d-service-core-single-tenant

Working note (not an OpenSpec artifact). Source = `/Users/behnam/code/cms/service` (read-only). All line numbers are from the
source at the time of writing.

## 1. What the source service is

* `service/package.json`: name `service-typescript` v0.7.0, CommonJS (`tsc` -> `build/`), `packageManager yarn@1.22.22`,
  `@types/node ^18`, **express ^4.18**, but `@types/express ^5.0.1` (mismatch), `uuid ^14` (ESM-only: breaks under jest CJS),
  `@commercetools/sdk-client-v2 ^3` (legacy, forbidden by the Connect rules), `@google-cloud/firestore`, `jsonwebtoken`,
  `validator`, `dotenv`, `body-parser`, plus bundler deps (`lit`, `rollup*`, `@babel/standalone`) and storage deps
  (`@aws-sdk/client-s3`, `@google-cloud/storage`, `cloudinary`, `multer`).
* `src/index.ts` (16 lines): `dotenv.config()`, **hard-coded `PORT = 8080`**, `app.listen`.
* `src/app.ts` (71 lines): `app.disable('x-powered-by')`; CORS via `extractMainDomain()` against `CORS_ALLOWED_ORIGINS`
  (default list contains the internal host `ct-poc.net` -> forbidden); disallowed origin = `callback(new Error('Not allowed by CORS'))`
  which the error middleware turns into a **500**; allowed headers include `x-project-key`; `bodyParser.json()` (100 kb default limit);
  a request logger that does `console.log(JSON.stringify({payload: req.body, result: body ...}))` -> **logs full request and response
  bodies** (PII/secret leak, and `no-console` is an ESLint error in this repo); mounts `/service`; 404 via `app.use('*', () => { throw ... })`.
* `src/routes/service.route.ts` (49 lines): mounts 19 routers, all at `/`. Spec C removes 11 legacy ones.

## 2. Multi-tenancy surface (to remove) with exact evidence

| File (source) | Lines | What it does | Fate |
| --- | ---: | --- | --- |
| `utils/firestore.utils.ts` | 193 | Firestore client + `getProjectByKey/storeProject/updateProjectLastAccessed/deleteProject`; tenant registry (collection `projects`) | DELETE |
| `middleware/project.middleware.ts` | 62 | `validateProject`: loads tenant from Firestore by `req.user.projectKey`, 403 if missing/inactive | DELETE |
| `middleware/project-key.middleware.ts` | 58 | `requireProjectKey`: `x-project-key` header -> Firestore lookup (this is how every **read** was "authenticated") | DELETE |
| `middleware/jwt.middleware.ts` | 129 | `validateJwt`, `validateJwtIgnoreExpiry`: HS256 JWT signed with `JWT_SECRET`, issuer/audience default `multitenant-contentools` | DELETE (replaced by spec E) |
| `middleware/auth.middleware.ts` | 21 | builds `AuthMiddlewareOptions` for `sdk-client-v2` from the tenant | DELETE |
| `middleware/http.middleware.ts` | 14 | builds `HttpMiddlewareOptions` from the tenant | DELETE |
| `middleware/deprecation.middleware.ts` | 57 | flags legacy routes (spec C removes the routes; D deletes it if still present) | DELETE |
| `controllers/auth.controller.ts` | 226 | `authenticateProject` (validates CT creds, stores tenant in Firestore, mints JWT), `refreshJwt`, `health` (`service: 'multitenant-contentools'`) | DELETE (health re-created in D) |
| `routes/auth.route.ts` | 18 | `POST /authenticate-project`, `POST /refresh-jwt`, `GET /health` (needs project key) | DELETE |
| `utils/secrets.utils.ts` | 21 | `getJwtSecret`, `getJwtExpiration` (`JWT_SECRET`, `JWT_EXPIRATION`) | DELETE |
| `types/service.types.ts` | 76 | `AuthenticateProjectRequest/Response`, `Project`, `JwtPayload`, `AuthenticatedRequest {user, project}` | DELETE (replaced by `types/express.d.ts`) |
| `client/build.client.ts`, `client/create.client.ts` | 16 + 24 | `createClient(req)` / `createApiRoot(req)`: a **new ClientBuilder per request** from `req.project` creds | REWRITE as `ct/client.ts` (singleton) |
| `utils/config.utils.ts` (+ `utils/__mocks__/config.utils.ts`) | 21 + 7 | `readConfiguration(req)` reads creds from `req.project`; URLs from `regionToCloudIdentifier` | DELETE, replaced by `config/env.ts` |
| `utils/region.ts` | 26 | `gcp-eu` -> `europe-west1.gcp` mapping, **defaults to us-central1 on unknown** | DELETE (Connect injects `CTP_API_URL`/`CTP_AUTH_URL`) |
| `validators/env.validators.ts`, `validators/helpers.validators.ts` (`@ts-nocheck`), `types/index.types.ts` | 55 + 149 + 17 | template env validators built on `validator`; **never invoked** by the app (grep: only imported by themselves) | DELETE (replaced by zod) |
| `utils/domain.ts` | 17 | `extractMainDomain` hack for CORS | DELETE |
| `constants.ts` | 112 | container names (env-overridable), `JWT_TOKEN_KEY`, `SHARED_CONTAINER = 'shared-sellertools-container'`, `CMS_DEPLOYED_URL_KEY = 'cms-app-deployed-url'`, default CORS origins incl. `ct-poc.net` | REWRITE (`config/containers.ts`) |
| `interfaces/config.interface.ts`, `interfaces/resource.interface.ts`, `interfaces/response.interface.ts`, `api/success.api.ts`, `types/sdkError.ts` | 8+2+9+27+12 | unused template leftovers (`apiSuccess`, `SDKError` have no importers; `response.interface` imports `UpdateAction` from `sdk-client-v2`) | DELETE |
| `.env.example` (service) | - | contains `GCP_FIRESTORE_*`, `JWT_SECRET` | REWRITE |
| `Dockerfile`, `.dockerignore`, `docker-compose.e2e.yml`, `postman/` | - | Cloud Run packaging; Connect builds the image itself | DELETE |
| `e2e/*.e2e.ts` (20 files) | - | old live e2e that create a tenant via `authenticate-project` | DELETE; new e2e is spec F/Q territory |
| `build/` | - | committed compiled output | DELETE, `.gitignore`d |

Also found: `src/controllers/custom-object.controller.ts` (212 lines) is the **single choke point to commercetools Custom Objects**
(every route group goes through `new CustomObjectController(req, container)`); its methods receive `req` only to reach
`createApiRoot(req)`. In the single-tenant core `req` disappears from the constructor. Bugs found in it (fixed in D, see design):
* `deleteCustomObject` returns the promise **without `await`** inside `try`, so the `catch` never runs and a CT 404 leaks as a raw SDK
  error (-> 500 via the error middleware) instead of 404 (lines 121-139).
* `getCustomObjects(query, expand, limit)` passes no `limit` unless given, so CT's **default limit of 20** silently truncates every list
  (pages, contents, templates, states). Source never paginates.
* `updateCustomObject` is `POST /custom-objects` with no `version` -> last-writer-wins; the state/version controllers do
  read-modify-write on top of it, so concurrent saves can lose version-history entries.
* `deleteCustomObjectById` builds `where: id="${id}"` by string concatenation (predicate injection if `id` is user input).

## 3. Connect facts verified (docs.commercetools.com + connect skill)

* With `inheritAs.apiClient.scopes` the platform injects exactly: `CTP_API_URL, CTP_AUTH_URL, CTP_CLIENT_ID, CTP_PROJECT_KEY,
  CTP_CLIENT_SECRET, CTP_SCOPE` (docs: `connect/modify-connector`, "Variables available in the Connect application"). **`CTP_REGION` is
  NOT injected** (it only exists in the non-generated-client template). The brief says `CTP_REGION`; this spec follows the docs: the
  client uses `CTP_API_URL` / `CTP_AUTH_URL` directly. `CTP_*` keys must NOT be declared in `connect.yaml` when using `inheritAs`.
* `CONNECT_SERVICE_URL` is provided to service apps (skill `lifecycle-scripts.md` line 124; sibling `search-config/service/src/env.ts`
  treats it as "the external base URL, ending in the endpoint path").
* Endpoint: platform forwards to `{connect-provided-url}/{endpoint}`; Express must mount at `/service` (skill project-structure P2).
* Liveness: skill `observability-operations.md` P2 wants an unauthenticated cheap `/status`; the brief asks for `/service/health`. D provides both.
* Pinned stack: `@commercetools/ts-client@^4` + `@commercetools/platform-sdk@^8`. Verified in scratch: `ts-client 4.10.0` +
  `platform-sdk 8.27.0` resolve together; `ClientBuilder().withClientCredentialsFlow().withHttpMiddleware({host, httpClient: fetch,
  enableRetry, retryConfig:{maxRetries, retryCodes}, timeout})` builds a working client; a 404 from CT throws an error with
  `statusCode: 404`, `code: 'ResourceNotFound'`, `body`, `originalRequest`.
  (npm latest today is ts-client 5 / platform-sdk 9; the locked decision stays on ^4 / ^8, mention in questions.md Q-D2.)
* Express: `@commercetools-backend/express@27.13.0` depends on `express ^4.21`; stay on Express 4 + `@types/express@4`.
* `@commercetools-backend/loggers@27.13.0`: `createApplicationLogger({level, json, silent}) -> winston.Logger` (supports `.child`).
* Custom Objects API (OAS via knowledge MCP): `POST /custom-objects` upserts; a supplied `version` must match; "Concurrent updates to
  the same Custom Object returns a ConcurrentModification error even if the version is not provided". Query endpoint supports
  `where/sort/limit/offset/withTotal`.

## 4. Test-stack experiments (scratchpad, not in target tree)

Ran in `scratchpad/exp` with jest 29.7 + ts-jest 29.4 + supertest 7 + msw + jose 5.10 + `@commercetools-backend/express` 27.13:

* **msw >= 2.11 breaks under jest CJS** (`rettime` ships ESM only: `SyntaxError: Unexpected token 'export'`). **msw 2.10.5 and 2.7.0
  work.** -> pin `msw: 2.10.5` (exact) in `service/package.json`.
* With msw active, supertest's own request to `http://127.0.0.1:<port>` is intercepted: use
  `onUnhandledRequest(req, print) { if (new URL(req.url).hostname === '127.0.0.1') return; print.error(); }`.
* `uuid@14` cannot be imported in jest CJS; use `crypto.randomUUID()`.
* `ClientBuilder` + `createApiBuilderFromCtpClient` + msw handlers for `https://auth.test.local/oauth/token` and
  `https://api.test.local/<project>/custom-objects/<container>/<key>` work inside jest.

## 5. Risks

1. Compile-green at the end of D while routes/controllers of F and G are still unported -> D parks them in `service/src/_pending/`
   (excluded from tsc/jest) and F/G move them back one by one. `_pending` must be empty and deleted by the end of G.
2. `dotenv` removal: Node 22 `--env-file` replaces it for local dev.
3. Body size: default 100 kb is too small for Puck pages; D sets 2 MB and documents it.
4. `CTP_SCOPE` is space separated (`manage_key_value_documents:key view_products:key`): split before handing to `ClientBuilder`.
5. Source `.env` / `.env.example` in `cms/service` may contain real values: never copy `.env*` files (A's rules; D writes a fresh `.env.example`).

## Pending files still referencing tenant code (recorded by the implementation of D)

Files under `service/src/_pending/` that F/G must port (first column: `grep -ci` hits are in the working tree; source of truth is `tools/forbidden-pending.txt`):

```
controllers/datasource-resolution.route.ts   (F)
routes/configuration.route.ts                (F)
routes/content-type.route.ts                 (F)
routes/datasource.route.ts                   (F)
routes/file.route.ts                         (G)
routes/product.route.ts                      (F; uses validateJwt only, not flagged by the guard)
routes/puck-content.route.ts                 (F)
routes/puck-page.route.ts                    (F)
routes/puck-template.route.ts                (F)
```
