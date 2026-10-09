# Contentools service

> Unsupported: this is a commercetools-labs project, provided AS IS without support. See [../LICENSE](../LICENSE).

## What it is

The REST API behind Contentools: it stores pages, content items, templates, theme and other configuration, content types and datasource definitions as commercetools Custom Objects, resolves datasources (including product lookups through Product Search) when a page is read, and optionally stores uploaded media in a bucket. It is a Connect `service` application: a plain Express server on port 8080 whose router is mounted at `/service`. It is **not** an API Extension and **not** a Subscription handler: commercetools never calls it.

One service serves one commercetools project: the project of the API client that Connect generates for the deployment. Content is scoped inside the project by a business unit key in the URL (`/service/:businessUnitKey/...`); this is a content namespace, not a tenant.

Authentication: reads of published pages, published contents and configuration are public. Everything else (drafts, preview, templates, all writes, datasources, product search, media) needs `Authorization: Bearer <token>`, where the token is either a Merchant Center session token forwarded by the Merchant Center proxy (verified server-side) or the static `SERVICE_API_TOKEN`. Anything unknown below the gate answers 401.

| Route group | Paths (all below `/service`) | Access |
| --- | --- | --- |
| health | `GET /health`, `GET /status` | public |
| puck-pages | `GET, POST /:businessUnitKey/puck-pages`, `GET, PUT, DELETE /:businessUnitKey/puck-pages/:key`, `GET /:businessUnitKey/puck-pages/:key/states`, `PUT .../states/published` (publish), `DELETE .../states/draft` (revert), `GET .../versions` | protected |
| published pages | `GET /:businessUnitKey/published/puck-pages/:key`, `POST /:businessUnitKey/published/puck-pages/query` | public |
| page preview | `GET /:businessUnitKey/preview/puck-pages/:key`, `POST /:businessUnitKey/preview/puck-pages/query` | protected |
| puck-contents | the same routes as pages under `/:businessUnitKey/puck-contents`, with `published/` (public) and `preview/` (protected) variants | as pages |
| puck-templates | `GET, POST /:businessUnitKey/puck-templates`, `GET, DELETE /:businessUnitKey/puck-templates/:key` | protected |
| configuration reads | `GET /:businessUnitKey/configuration` and `/configurations` (aggregate), `GET /:businessUnitKey/configuration/<slice>` | public |
| configuration writes | `POST, PUT, DELETE /:businessUnitKey/configuration/<slice>`; slices: `theme`, `header`, `facet`, `footer`, `site-metadata`, `category-listing`, `translations`, `b2b-account-menu-links` | protected |
| datasource | `GET /datasource`, `GET, POST, PUT, DELETE /datasource/:key`, `POST /datasource/:key/test` | protected; `POST /datasource/:key/test` is public (rate limited) for the built-in product datasources only when `PUBLIC_DATASOURCE_RESOLVE=true` |
| products/search | `GET /products/search` | protected |
| content-type/import | `POST /content-type/import`, `POST /:businessUnitKey/content-type/import` | protected |
| upload-file, media-library | `POST /:businessUnitKey/upload-file`, `GET /:businessUnitKey/media-library` | protected; answer 501 `MEDIA_NOT_CONFIGURED` while `MEDIA_STORAGE_PROVIDER` is `none` |

Error bodies are `{ "message", "statusCode", "correlationId", "code"?, "errors"? }`.

## Run locally

Without Connect (plain Node 22 and Yarn 1):

```sh
cd service
cp .env.example .env     # fill CTP_API_URL, CTP_AUTH_URL, CTP_PROJECT_KEY, CTP_CLIENT_ID, CTP_CLIENT_SECRET, CTP_SCOPE
yarn install
yarn start:dev           # http://localhost:8080/service/health
# or: yarn build && node --env-file=.env build/index.js
```

Create the API client for the `.env` in the Merchant Center with exactly the two scopes listed under [Scopes](#scopes). Set `SERVICE_API_TOKEN` (at least 32 characters, for example `openssl rand -hex 24`) to call protected routes with `curl -H "Authorization: Bearer $SERVICE_API_TOKEN"`.

With the Connect CLI (needs Docker; run inside `service/`):

```sh
commercetools connect application build
commercetools connect application start
commercetools connect application test
```

Tests: `yarn test` (offline, no `.env` needed), `yarn typecheck`, `yarn lint`. Live checks against a sandbox project are described in [e2e/README.md](e2e/README.md).

## Deploy

The connector is described by `../connect.yaml`. Connect builds a git tag of the repository. Ordered steps:

1. `commercetools auth login` (an API client with the Connect scopes).
2. `commercetools connect validate .` from the repository root: builds the image, runs the tests inside it, scans dependencies.
3. `commercetools connect connectorstaged create --repository-url <url> --repository-tag <tag> --creator-email <email> --name contentools --key contentools`.
4. `commercetools connect connectorstaged preview --key contentools`, or create a deployment directly: `commercetools connect deployment create --connector-key contentools --connector-staged --region <region> --type sandbox --key contentools-sandbox --configuration service.LOG_LEVEL=info --configuration service.SERVICE_API_TOKEN=<token>`. Use the same region as the commercetools project.
5. `commercetools connect deployment describe --key contentools-sandbox` until it shows `Deployed`, then `commercetools connect deployment logs --key contentools-sandbox --application service`.
6. After pushing a new tag: `commercetools connect connectorstaged update ...` to point the staged connector at it, then `commercetools connect deployment redeploy --key contentools-sandbox --updateConnector`.

Pass every configuration key you want on each `create` and `redeploy` (`--configuration service.KEY=value`): keys that are not declared in `connect.yaml` are dropped, and values omitted on a redeploy may reset to the default (verify with `describe`).

## Scopes

`inheritAs.apiClient` asks Connect for one API client per deployment. It is shared by every application in `connect.yaml`.

| Scope | Needed for |
| --- | --- |
| `manage_key_value_documents` | Custom Objects: create, read, update, delete and query of pages, contents, versions, states, templates, configuration, content types and datasources |
| `view_products` | `POST /products/search`: the product picker (`GET /service/products/search`) and the `product-by-sku` and `products-by-sku` datasources |

No `manage_project`, no write access to products, no extensions/subscriptions: this service registers none. A test (`tests/connect/drift.test.ts`) fails when the code starts calling an API that needs another scope.

## Configuration

`CTP_*` variables are injected by Connect (client generated from the scopes above) and are not configured. Provider-specific `MEDIA_*` keys are optional in the manifest because Connect cannot express conditions; they are required by the service when the provider is selected and checked at start and in postDeploy.

| Key | Standard or secured | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `MAX_VERSIONS` | standard | no | `5` | Maximum number of saved versions kept per page or content item; older versions are pruned on save. |
| `LOG_LEVEL` | standard | no | `info` | Log level: error, warn, info or debug. |
| `CONTAINER_PREFIX` | standard | no | - | Prefix added to every Custom Object container name; empty for production. Lets tests isolate data (for example contentools-test-). Changing it on a live deployment hides existing content. |
| `CORS_ALLOWED_ORIGINS` | standard | no | - | Comma-separated exact browser origins allowed to call the service (storefronts). No default: empty allows no browser origin. The Merchant Center hop is server-to-server and needs no CORS. |
| `MC_REQUIRED_PERMISSION` | standard | no | - | Optional Merchant Center permission a user must have for writes (for example canManageContentools). Empty means any user with access to the project. |
| `PUBLIC_DATASOURCE_RESOLVE` | standard | no | `false` | true makes resolving the built-in product-by-sku and products-by-sku datasources public (rate limited). Default false. |
| `PUBLIC_RESOLVE_MAX_PER_MINUTE` | standard | no | `120` | Global rate limit per minute for public datasource resolve. |
| `MEDIA_STORAGE_PROVIDER` | standard | no | `none` | Media storage backend: none, gcp, aws or cloudinary. With none the upload and media-library endpoints answer 501. |
| `MEDIA_PATH_PREFIX` | standard | no | `contentools/media` | Object key prefix for uploaded media, without leading or trailing slash. |
| `MEDIA_MAX_UPLOAD_BYTES` | standard | no | `10485760` | Largest accepted upload in bytes (1024 to 26214400). |
| `MEDIA_ALLOWED_MIME_TYPES` | standard | no | `image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf` | Comma-separated allowed upload content types. Add image/svg+xml only if you accept the risk. |
| `MEDIA_PUBLIC_BASE_URL` | standard | no | - | Optional https base URL (CDN) that serves the bucket; empty uses the provider public URL. |
| `MEDIA_GCP_BUCKET` | standard | no | - | Bucket name; required when MEDIA_STORAGE_PROVIDER is gcp. |
| `MEDIA_AWS_BUCKET` | standard | no | - | Bucket name; required when MEDIA_STORAGE_PROVIDER is aws. |
| `MEDIA_AWS_REGION` | standard | no | `us-east-1` | AWS region of the bucket. |
| `MEDIA_AWS_ENDPOINT` | standard | no | - | Optional S3-compatible endpoint URL (for example a MinIO server); empty means Amazon S3. |
| `MEDIA_CLOUDINARY_CLOUD_NAME` | standard | no | - | Cloud name; required when MEDIA_STORAGE_PROVIDER is cloudinary. |
| `SERVICE_API_TOKEN` | secured | no | - | Static bearer token (at least 32 characters) for server-to-server callers such as the MCP application. Empty disables token authentication; Merchant Center session tokens still work. |
| `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` | secured | no | - | Service-account JSON key, base64 on one line; required when MEDIA_STORAGE_PROVIDER is gcp. |
| `MEDIA_AWS_ACCESS_KEY_ID` | secured | no | - | Access key id; required when MEDIA_STORAGE_PROVIDER is aws. |
| `MEDIA_AWS_SECRET_ACCESS_KEY` | secured | no | - | Secret access key; required when MEDIA_STORAGE_PROVIDER is aws. |
| `MEDIA_CLOUDINARY_API_KEY` | secured | no | - | API key; required when MEDIA_STORAGE_PROVIDER is cloudinary. |
| `MEDIA_CLOUDINARY_API_SECRET` | secured | no | - | API secret; required when MEDIA_STORAGE_PROVIDER is cloudinary. |

Never commit values for secured keys. `SERVICE_API_TOKEN` is rotated by redeploying with a new value (callers see a short 401 window).

## Lifecycle scripts

`postDeploy` (`yarn connector:post-deploy`, bundled into `build/connector/post-deploy.js`, runs without `node_modules`) performs read-only checks and prints one JSON line per check:

1. `token`: client-credentials token request with the injected client.
2. `scopes`: the granted scopes include both required scopes for the project.
3. `custom-objects`: one read of the page container (honours `CONTAINER_PREFIX`).
4. `product-search`: one search with `limit` 1. Status `warn` (exit code stays 0) when Product Search is not activated (Merchant Center > Settings > Project settings > Storefront Search); only the product picker and the SKU datasources are affected.
5. `storage`: `skipped` for provider `none`; otherwise the media configuration is validated (missing keys are named, never their values) and the bucket is probed.

Any failed check prints `{"msg":"post-deploy","check":...,"status":"failed","reason":...}` to stderr and exits 1. Reasons contain HTTP statuses and key names only, never tokens, secrets or URLs. It never writes anything, so running it twice is safe.

`preUndeploy` (`yarn connector:pre-undeploy`) deletes nothing and sends no request. It logs which Custom Object containers (`puck-page`, `puck-page-state`, `puck-page-version`, `puck-content`, `puck-content-state`, `puck-content-version`, `puck-template`, `configuration`, `content-type`, `datasource`, each with your `CONTAINER_PREFIX`) and which media prefix remain, so an operator can remove them knowingly.

A failing script may not mark the deployment as failed; read `deployment logs`.

## Fail-open and fail-closed

| Use case | Stance | Status | Budget |
| --- | --- | --- | --- |
| Content reads and writes, preview (commercetools errors) | fail-closed, no stale cache | 503 (rate limit or upstream 5xx), 502 (upstream authorization), 409 (concurrent change), 404 | 10 s per call, up to 3 retries on 429, 502, 503, 504 |
| Request without a verifiable credential | fail-closed | 401 (403 for the wrong project or a missing permission) | none |
| Merchant Center key set unreachable | fail-closed | 503 with `Retry-After` | none |
| Media endpoints | fail-closed for themselves only; the content API is unaffected | 502 `MEDIA_STORAGE_UNAVAILABLE`, 501 when not configured | storage SDK defaults |
| Datasource resolution while reading a page | fail-open by design: the prop resolves to `null` so the page still renders | 200 | 10 s per commercetools call |
| Product picker (`GET /products/search`) | fail-closed | 400 or 502 | 10 s per call |
| commercetools operations (carts, orders) | not affected: the service registers no API Extension and no Subscription, so an outage can never block them | none | none |

## Logs and correlation ids

Every log line is JSON with `level`, `message`, `timestamp` and, inside a request, `correlationId`. One access-log line is written per request with `method`, `route` (the route template, never the raw URL), `status`, `durationMs` and `businessUnitKey`. Request and response bodies, the `Authorization` header, query strings, file names and configuration values are never logged.

```sh
commercetools connect deployment logs --key <k> --application service --startDate <iso> --endDate <iso>
```

Filter on `correlationId`. Send your own `X-Correlation-ID` (8 to 128 characters of `A-Z a-z 0-9 . _ -`) to trace a call; otherwise the service generates one and returns it in the response header `X-Correlation-ID` (and in error bodies). `LOG_LEVEL` (`error`, `warn`, `info`, `debug`) controls verbosity.

## Poison messages and replay

This service is not an event application: it has no Subscription, queue or dead-letter store, so messages cannot be redelivered or poisoned. Every request is synchronous and answered with its result. If a write fails the caller sees the status code and retries. Retrying is safe for `PUT`, `DELETE`, publish and revert: they address an item by key, and a repeated `PUT` appends one more version (pruned to `MAX_VERSIONS`) without creating a second page. A repeated `POST` that creates a page, content item or template is **not** idempotent: each call generates a new key, so a retried create can leave a duplicate that has to be deleted; `POST /datasource/:key` answers 409 when the key already exists. To re-apply a change, repeat the request; to investigate, search `deployment logs` for the response's `X-Correlation-ID`.

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Every protected call answers 401 | No credential kind is enabled or the token is wrong. Check the startup line `authentication` in the logs; set `SERVICE_API_TOKEN` or make sure Connect injects `CONNECT_SERVICE_URL`. |
| 403 for a Merchant Center user | The token belongs to another project, or the user lacks `MC_REQUIRED_PERMISSION`. |
| `postDeploy` fails with `check: scopes` | The API client lacks a scope; redeploy so Connect regenerates it from `inheritAs.apiClient`. |
| `postDeploy` warns about `product-search` | Activate Product Search in the project settings and call it at least once every 30 days. |
| Media endpoints answer 501 | `MEDIA_STORAGE_PROVIDER` is `none`; set a provider and its keys, then redeploy. |
| The service exits at start naming a key | Configuration is validated at start; the message names the key, never its value. |
| A setting has no effect | The key is not declared in `connect.yaml` (Connect drops undeclared keys), or it was omitted on the last `redeploy`. |
| Existing content disappeared | `CONTAINER_PREFIX` was changed; restore the previous value. |
