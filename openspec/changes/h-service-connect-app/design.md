## Context

Specs C-G leave `service/` as a single-tenant Express app: no Firestore, no per-tenant JWT, an injected commercetools client, auth middleware (E), content routes (F) and
media routes (G). H makes it a Connect application and proves the commercetools-connect production-readiness checklist for the `service` app. The old `connect.yaml`
(`/Users/behnam/code/cms/connect.yaml`) is the starting point we read and then replace; `explore.md` section 1 lists what was wrong with it.

Ownership boundaries (to avoid duplicate work with neighbours):
- D owns: logger factory, CT client built from `CTP_*`, `CustomError` + error middleware, config reader (zod), correlation id + access log + log format (`src/observability/*`), health route, graceful shutdown, `index.ts`/`app.ts`, npm lockfile. H only VERIFIES these and fixes small deviations.
- E owns: auth middleware (`requireAuth`), CORS and the names/semantics of its keys. H copies E's and D's final key rows into `connect.yaml`.
- G owns: the 15 `MEDIA_*` keys and the media provider code. H copies the rows and calls `loadMediaConfig`/`checkConnectivity` from `postDeploy`.
- L and M append `deployAs` entries to the same file; H creates the file with the `service` entry and the top-level `inheritAs`.

## Goals / Non-Goals

**Goals:** a deployable Connect `service` app; a manifest whose every key is real, classified and documented; least-privilege scopes derived from code; lifecycle scripts that
catch bad credentials at deploy time; logs that are searchable per request without leaking data; tests that make drift impossible; a README that satisfies the checklist.

**Non-Goals:** registering an API Extension or Subscription (the service has none); a job or event application; creating commercetools Types/Channels (Custom Objects need no schema); hosted CI (owner decision: none, gates are local scripts plus Connect's validation); certification for the public marketplace.

## Decisions

### 1. The `connect.yaml` block (service entry and shared client)

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
        - { key: MAX_VERSIONS, description: "Maximum number of saved versions kept per page or content item; older versions are pruned on save.", required: false, default: "5" }
        - { key: LOG_LEVEL, description: "Log level: error, warn, info or debug.", required: false, default: "info" }
        # D- and E-owned rows, copied verbatim from spec E's design when implementing (names verified against the finished D and E designs).
        # CLOUD_IDENTIFIER is NOT declared here: spec L declares it once under inheritAs.configuration (shared by service and admin-app); the service only reads it.
        - { key: CONTAINER_PREFIX, description: "Prefix added to every Custom Object container name; empty for production. Lets tests isolate data (for example contentools-test-). Changing it on a live deployment hides existing content.", required: false, default: "" }
        - { key: CORS_ALLOWED_ORIGINS, description: "Comma-separated exact browser origins allowed to call the service (storefronts). No default: empty allows no browser origin. The Merchant Center hop is server-to-server and needs no CORS.", required: false }
        - { key: MC_REQUIRED_PERMISSION, description: "Optional Merchant Center permission a user must have for writes (for example canManageContentools). Empty means any user with access to the project.", required: false }
        - { key: PUBLIC_DATASOURCE_RESOLVE, description: "true makes resolving the built-in product-by-sku and products-by-sku datasources public (rate limited). Default false.", required: false, default: "false" }
        - { key: PUBLIC_RESOLVE_MAX_PER_MINUTE, description: "Global rate limit per minute for public datasource resolve.", required: false, default: "120" }
        # G-owned rows (spec G design decision 2):
        - { key: MEDIA_STORAGE_PROVIDER, description: "Media storage backend: none, gcp, aws or cloudinary. With none the upload and media-library endpoints answer 501.", required: false, default: "none" }
        - { key: MEDIA_PATH_PREFIX, description: "Object key prefix for uploaded media, without leading or trailing slash.", required: false, default: "contentools/media" }
        - { key: MEDIA_MAX_UPLOAD_BYTES, description: "Largest accepted upload in bytes (1024 to 26214400).", required: false, default: "10485760" }
        - { key: MEDIA_ALLOWED_MIME_TYPES, description: "Comma-separated allowed upload content types. Add image/svg+xml only if you accept the risk.", required: false, default: "image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf" }
        - { key: MEDIA_PUBLIC_BASE_URL, description: "Optional https base URL (CDN) that serves the bucket; empty uses the provider's public URL.", required: false }
        - { key: MEDIA_GCP_BUCKET, description: "Bucket name; required when MEDIA_STORAGE_PROVIDER is gcp.", required: false }
        - { key: MEDIA_AWS_BUCKET, description: "Bucket name; required when MEDIA_STORAGE_PROVIDER is aws.", required: false }
        - { key: MEDIA_AWS_REGION, description: "AWS region of the bucket.", required: false, default: "us-east-1" }
        - { key: MEDIA_AWS_ENDPOINT, description: "Optional S3-compatible endpoint URL (for example a MinIO server); empty means Amazon S3.", required: false }
        - { key: MEDIA_CLOUDINARY_CLOUD_NAME, description: "Cloud name; required when MEDIA_STORAGE_PROVIDER is cloudinary.", required: false }
      securedConfiguration:
        - { key: SERVICE_API_TOKEN, description: "Static bearer token for server-to-server callers (the MCP application). Empty disables token authentication; Merchant Center session tokens still work.", required: false }
        - { key: MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64, description: "Service-account JSON key, base64 on one line; required when MEDIA_STORAGE_PROVIDER is gcp.", required: false }
        - { key: MEDIA_AWS_ACCESS_KEY_ID, description: "Access key id; required when MEDIA_STORAGE_PROVIDER is aws.", required: false }
        - { key: MEDIA_AWS_SECRET_ACCESS_KEY, description: "Secret access key; required when MEDIA_STORAGE_PROVIDER is aws.", required: false }
        - { key: MEDIA_CLOUDINARY_API_KEY, description: "API key; required when MEDIA_STORAGE_PROVIDER is cloudinary.", required: false }
        - { key: MEDIA_CLOUDINARY_API_SECRET, description: "API secret; required when MEDIA_STORAGE_PROVIDER is cloudinary.", required: false }
inheritAs:
  apiClient:
    scopes:
      - manage_key_value_documents
      - view_products
```
(In the file the rows are written in the long block form that Connect's examples use; the flow style above is only for brevity here.) 23 keys in the service block: 17 standard and 6 secured, plus `CLOUD_IDENTIFIER` declared once in `inheritAs.configuration` by spec L; the manifest test asserts these counts so a change is deliberate. `required: true` is used nowhere: every key has a safe default or is conditional (see decision 3).

### 2. Every deviation from the old `connect.yaml`, explained

| Old (lines in `/Users/behnam/code/cms/connect.yaml`) | New | Why |
| --- | --- | --- |
| `name: service`, `applicationType: service`, `endpoint: /service` (2-4, 7) | Same | Correct and matches `app.use('/service', ...)`. |
| `scripts.postDeploy: node build/connector/post-deploy.js` (5-6) | `postDeploy: yarn connector:post-deploy` + real script | The old path did not exist. We follow the working sibling (`search-config`): call a package script, bundle the scripts so they do not depend on `node_modules`. |
| no `preUndeploy` | `preUndeploy` (no-op that logs retained data) | Checklist: preUndeploy must exist and be decided. Deleting customer content on undeploy would be wrong (decision 6). |
| `MAX_VERSIONS` standard, default "5" (8-13) | Same key, same default | Still read by the version-pruning code (F). Description now says what it does. |
| Commented-out AWS block (14-22) and Cloudinary block (33-38, 41-43) | Live `MEDIA_AWS_*` and `MEDIA_CLOUDINARY_*` keys | Commented-out config is dead code and made the two backends impossible to configure on Connect. |
| `GCP_BUCKET_NAME` standard optional (24-26) | `MEDIA_GCP_BUCKET` standard, conditional | Renamed (prefix `MEDIA_`), enforced in code when provider is gcp. |
| `GCP_PROJECT_ID` (27-29) | Removed | Derivable from the service-account JSON (`project_id`). Fewer keys, fewer ways to mismatch. |
| `GCP_STORAGE_SERVICE_ACCOUNT_CLIENT_EMAIL` standard (30-32) and `..._PRIVATE_KEY` secured (41-46), all `required: false` | One secured `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` | The credential was split in two places and optional without validation (a deployment without it succeeded, then every upload failed); the PEM needed a newline hack. Now one secured key, validated at startup and by postDeploy whenever provider is gcp. This is the fix for "GCP key material wrongly optional". |
| `inheritAs.configuration.standardConfiguration: STORAGE_TYPE`, default `gcpcms` (56-61) | `MEDIA_STORAGE_PROVIDER` under the service app, default `none` | `gcpcms` is not a valid value (factory throws) and contains the banned word; only the service reads it so it does not belong in the shared (global) section; `none` lets a fresh deployment work without a bucket. |
| (none) `inheritAs.apiClient` | `inheritAs.apiClient.scopes: [manage_key_value_documents, view_products]` | The old service used per-tenant credentials from Firestore. Single tenant means the generated Connect client; scopes derived by audit (explore.md section 3). |
| Keys the runtime read but the file never declared: `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION`, `GCP_FIRESTORE_*`, `CORS_ALLOWED_ORIGINS` | `JWT_*` and `GCP_FIRESTORE_*` removed from the product (D, E, owner decision: Firestore gone); `CORS_ALLOWED_ORIGINS` and `SERVICE_API_TOKEN` declared (E) | The old file could not deploy a working service. The new drift test makes this class of bug fail the build. |
| `*_CONTAINER`, `*_KEY` overrides read from env in `constants.ts` | Not exposed | These are data-schema names (where content lives). Changing them on a live deployment silently orphans all content. They stay constants in code. |
| (none) | `LOG_LEVEL` | Operators need to raise verbosity without redeploying code (checklist: observability). |

### 3. Required vs optional, and conditional keys

Connect cannot say "required if `MEDIA_STORAGE_PROVIDER=gcp`". Provider keys are therefore `required: false` and enforced by code in two places: service start (fail fast, spec G) and `postDeploy`
(first and clearest signal, in the deployment log). Alternative rejected: one `deployAs` entry per provider (3 service apps): triples cost and breaks the single `/service` endpoint. No key is `required: true`, because every
key is either defaulted or conditional; an unauthenticated deployment is impossible because E's middleware refuses all protected routes when neither a Merchant Center session nor a token can be verified.

### 4. Scopes (least privilege, from the audit)

| Scope | Needed by |
| ----- | --------- |
| `manage_key_value_documents` | Custom Objects create/update/read/query/delete: pages, contents, versions, states, templates, configuration, content types, datasources |
| `view_products` | `POST /products/search`: the product picker `GET /service/products/search` and the `product-by-sku` and `products-by-sku` datasources |

Not requested and why: `view_business_units`, `view_stores` (draft in `plans/manual-steps.md` M-01) because no call exists, `manage_extensions`, `manage_subscriptions` because the service registers nothing,
`manage_products` because it never writes products. A test fails if a new SDK call is added without a matching scope review (decision 9). `inheritAs.apiClient` is top-level in `connect.yaml`, so L and M inherit the
same generated client; they must not widen it without updating this spec's README table.

Deviation from the brief: it lists `CTP_REGION` among injected variables. Connect injects `CTP_API_URL` and `CTP_AUTH_URL` directly (docs: modify-connector), no region. D's client builder must read the URLs; for local runs `.env.example` sets all `CTP_*` including the two URLs (Q-H1).

### 5. Build, scripts and packaging

- Package manager Yarn 1 classic with `service/yarn.lock` committed and no `package-lock.json` (owner decision, also adopted by spec D, Q-D4 closed; the CLI's `nypm` detection then runs `yarn run <script>`). Module format CommonJS (`tsc`, target ES2022, `module: commonjs`) to keep the copied source unchanged; rejected: ESM migration (needs `.js` suffixes everywhere for no benefit).
- Scripts: `build` = `rimraf build && tsc -p tsconfig.build.json && node scripts/bundle-lifecycle.mjs`; `gcp-build` = `yarn build` (Connect runs it after install); `start` = `node build/index.js`; `start:dev` as defined by spec D (`tsc --watch` plus `node --env-file=.env --watch build/index.js` through `concurrently`); `typecheck` = `tsc --noEmit`; `lint` = `eslint .`; `test` = `jest --ci`; `test:e2e` = spec B's live suite; `connector:post-deploy` = `node build/connector/post-deploy.js`; `connector:pre-undeploy` = `node build/connector/pre-undeploy.js`.
- `tsconfig.build.json` excludes `src/connector/**` and `tests/**`; the lifecycle scripts are bundled by esbuild (`platform: node`, `target: node22`, `format: cjs`, nothing external) into `build/connector/`.  Why bundle: whether `node_modules` exists when Connect runs `postDeploy` is undocumented; the sibling connector bundles for the same reason.
- `dotenv` is already removed by spec D: Connect injects variables; local runs use `node --env-file=.env` (Node 22).
- Dependency hygiene: `yarn audit --groups dependencies --level high` must be clean and no HIGH/CRITICAL advisory with a fix may exist even in devDependencies (Connect validation uses Trivy with `--include-dev-deps`).

### 6. Lifecycle scripts

`postDeploy` (decision details in the spec): read-only checks, ordered: environment -> token and scopes -> Custom Objects read -> Product Search (warn only) -> storage (if selected). Fails (exit 1) for anything that makes the app useless:
missing client variables, rejected credentials, missing scope, Custom Objects unreachable, selected storage misconfigured or unreachable. Warns for Product Search inactive (the rest of the app works; the picker and datasources do not). Chosen over
warn-and-continue for failures because a deployed-but-broken content service is found by editors, not by the deployer. Outputs one JSON line per check (`{"msg":"post-deploy","check":"scopes","status":"ok"}`).
Idempotent by construction (no writes), so redeploys cannot leave a gap; there is no get-then-update logic because there is nothing to register.
`preUndeploy` never deletes: Custom Objects hold the customer's pages and the bucket holds their media; "undeploy" is not "delete my data". It logs the retained containers and prefix so an operator can remove them knowingly. Alternative rejected: an opt-in `PURGE_ON_UNDEPLOY` key (a destructive switch in a manifest is a footgun).

### 7. Observability layer

Spec D implements these files (names agreed with H); H verifies and extends them. `src/observability/request-context.ts`: `AsyncLocalStorage<{ correlationId: string }>`, `requestContext` middleware (validate/generate id, set response header, `run`), `currentCorrelationId()`.
`src/observability/log-format.ts`: a winston `format` (the `@commercetools-backend/loggers` option `formatters`) that adds `correlationId` from the store to every `info` object.
`src/observability/access-log.ts`: middleware logging on `res.on('finish')` with `req.route?.path` (route template; for unmatched routes `'<unmatched>'` so arbitrary URLs never become log fields). Replaces the body-dumping logger in the old `app.ts` (lines 41-61), which logged every payload and response.
Order in `app.ts`: `requestContext` -> `accessLog` -> CORS (E) -> body parsers -> health -> `/service` routers -> 404 -> error middleware (D). Health is mounted under `/service/health` and `/service/status` before auth. Graceful shutdown in `index.ts`: `server.close()` on `SIGTERM`, forced exit after 10 s.

### 8. Fail-open / fail-closed stance (stated in the README)

The service is not an API Extension or a subscriber: commercetools never calls it, so its outage cannot block carts or orders (the platform-level fail-open/closed question does not exist for this app).
Within the app: content reads/writes and preview are fail-closed (503/502 on commercetools errors; no stale cache), mutations without verifiable auth are fail-closed (401), media is isolated and fail-closed for its own endpoints only (502; content API unaffected),
datasource resolution is fail-open by design inherited from F (returns null so a page renders without the data) and product search is fail-closed for the picker (400/502). Timeout budget: commercetools calls 10 s (D's client), storage calls 30 s, overall Connect limit 5 min (documented; values copied from D/G code at implementation time).

### 9. Tests and gates

`tests/connect/` (manifest contract incl. YAML parse with the `yaml` package, scope allow-list and scope-usage audit, drift guard, README tables), `tests/connect/lifecycle.test.ts` (msw mock of auth and API, spawns the bundled scripts with `child_process` so the exit code and output are real),
`tests/observability/*` (supertest + captured winston transport). All offline. Gates are local: `yarn test`, `yarn typecheck`, `yarn lint`, `commercetools connect application test`, `commercetools connect validate`; no CI service.

## Risks / Trade-offs

- Provisional E rows: if E renames keys, the drift test fails loudly (good) and the rows are edited.
- Bundling the GCS/AWS/Cloudinary SDKs into the lifecycle bundle may fail or be large; fallback is marking them external and running `postDeploy: yarn install --production --frozen-lockfile && yarn connector:post-deploy`; the standalone test (task 6.5) decides at implementation time.
- A failing `postDeploy` may not fail the deployment (undocumented); README tells operators to read `deployment logs`.
- Trivy HIGH/CRITICAL findings in transitive devDependencies can block validation through no fault of ours; fix by upgrading or `resolutions`.
- Connect gateway limits for multipart uploads are undocumented (Q-H3).

## Coordination with L and M (added after the coordinator's message)

- `connect.yaml` is shared. H writes the file with the `service` entry and `inheritAs.apiClient`; L adds the `admin-app` block (no endpoint, scripts or secured configuration) and declares `CLOUD_IDENTIFIER` once under `inheritAs.configuration`; M adds the `mcp` block. H's `service` block must not redeclare `CLOUD_IDENTIFIER`.
- `CONNECT_SERVICE_URL` (read by E for the token audience; injected, so not declared) is injected only into service apps; the admin-app uses its own `CONTENTOOLS_SERVICE_URL` key (two-pass deploy, owned by L). Nothing in H depends on it except E's audience check.
- `SERVICE_API_TOKEN` stays declared per application that needs it (service here, mcp in M). Hoisting it to `inheritAs.configuration.securedConfiguration` is possible but would also hand the secret to admin-app, so H keeps it per app (Q-H6). Whoever hoists must update the manifest test and README table.
- Health contract for M's post-deploy probe: `GET /service/health` (alias `GET /service/status`) answers 200 `{"status":"UP"}`, unauthenticated, no outbound calls. This is the only health path; the old/proposed `/health` without prefix returns 404.
