## Why

The source repository's `connect.yaml` could never have produced a working deployment: its `postDeploy` points at a script that is
not built, it declares neither `preUndeploy`, the API client scopes, nor half of the keys the service reads (JWT, Firestore, CORS),
it carries a broken storage default, and the service itself has no health route, no tests, no correlation id and logs every request and
response body. Contentools must ship as a Connect connector that passes the commercetools-connect production-readiness checklist.
This change turns the service (after specs C-G made it single-tenant, authenticated, content- and media-capable) into a deployable,
operable, documented Connect `service` application.

## What Changes

- Create the root `connect.yaml` with the `service` application (name equals folder `service`, `endpoint: /service`, router mounted at `/service`),
  a configuration table covering every key (standard vs secured), and `inheritAs.apiClient.scopes` limited to `manage_key_value_documents` and
  `view_products` (audited from the code, see explore.md section 3).
- Add `postDeploy` and `preUndeploy` scripts (`service/src/connector/`): read-only, idempotent, bundled to be self-contained; `postDeploy` validates the injected
  commercetools client (token, granted scopes, Custom Objects access, Product Search) and the selected media storage provider at deploy time and exits non-zero on real
  failure; `preUndeploy` deliberately deletes nothing (content is customer data) and logs what is retained.
- Make `service/` a conforming Connect app: `package.json` scripts `build`, `gcp-build`, `start`, `start:dev`, `test`, `typecheck`, `lint`, `test:e2e`, `connector:post-deploy`,
  `connector:pre-undeploy`; Node 22; Yarn 1 lockfile; `@commercetools/platform-sdk@^8` and `@commercetools/ts-client@^4`; delete `Dockerfile`, `.dockerignore`, `docker-compose.e2e.yml`.
- Verify observability: correlation-id middleware (`X-Correlation-ID`), JSON logs where every line of a request carries `correlationId`, an access log without bodies, `GET /service/health`,
  error hygiene tests; replace the old body-dumping logger.
- Add tests that run through `commercetools connect application test` and `commercetools connect validate`: manifest contract, route/endpoint match, config drift guard, README table guard,
  lifecycle scripts (idempotent, no destructive calls), correlation id, error hygiene.
- Write `service/README.md` with fail-open/fail-closed per use case, scopes, the full configuration table, lifecycle behaviour, and the poison-message/replay section (explained as not applicable).
- Explain every deviation from the old `connect.yaml` (design.md decision 2).
- **BREAKING** for anyone using the old manifest: configuration keys are renamed (`STORAGE_TYPE` and friends become `MEDIA_*`, spec G); the injected client replaces per-tenant credentials.

## Capabilities

### New Capabilities
- `connect-service-manifest`: the `service` block of `connect.yaml`, config keys, scopes, build/start scripts, route-endpoint match, Dockerfile removal.
- `connect-lifecycle-scripts`: `postDeploy` and `preUndeploy` behaviour, idempotency, deploy-time validation, exit codes.
- `service-observability`: correlation id, structured logs, access log, health endpoint, error hygiene.
- `service-connector-readme`: the connector README contract required by the Connect checklist.

### Modified Capabilities
<!-- none: openspec/specs/ is empty -->

## Impact

- New or rewritten: `connect.yaml`, `service/package.json`, `service/tsconfig*.json`, `service/scripts/bundle-lifecycle.mjs`, `service/src/connector/*`, `service/src/observability/*`,
  `service/src/index.ts`, `service/src/app.ts` (wiring), `service/tests/connect/*`, `service/tests/observability/*`, `service/README.md`, `service/.env.example`.
- Deleted: `service/Dockerfile`, `service/.dockerignore`, `service/docker-compose.e2e.yml`, `service/tests/integration/routes.spec.ts` (stale template test), nodemon/concurrently configuration.
- Cross-spec: consumes D (config reader, CT client, error middleware), E (auth keys, CORS), F (routes, `MAX_VERSIONS`), G (the 15 `MEDIA_*` keys). Specs L and M append their own `deployAs` entries to the same `connect.yaml` and must not edit `inheritAs.apiClient`.
- No CI service is involved (owner decision): quality gates are local scripts and Connect's own validation.
