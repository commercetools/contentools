## Why

The service inherited from the internal CMS is multi-tenant: a Firestore tenant registry, per-tenant API-client credentials, a
self-minted JWT, and a new commercetools client built on every request. A Connect `service` app is the opposite: one deployment is
bound to exactly one commercetools project through the platform-generated API client (`inheritAs.apiClient`), configured by
environment variables, stateless, with no Firestore. Every later spec (auth, content API, media, Connect packaging) needs a clean,
single-tenant core to build on, so the core must be established first.

## What Changes

- **BREAKING** Remove the whole tenant layer: Firestore utils, `validateProject`, `requireProjectKey` (`x-project-key`), the HS256 JWT
  middleware, `POST /authenticate-project`, `POST /refresh-jwt`, secrets utils, tenant types, `readConfiguration(req)`, region mapping.
- Replace the per-request `ClientBuilder` (legacy `@commercetools/sdk-client-v2`) with one process-wide client built from the
  Connect-injected `CTP_API_URL`, `CTP_AUTH_URL`, `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`
  using `@commercetools/ts-client@^4` + `@commercetools/platform-sdk@^8` (retry + timeout configured).
- Add fail-fast, typed environment validation (zod) that reports every problem at once and stops the process before listening.
- Add a container-bound `CustomObjectsClient` (get, create-only, upsert, delete, paginated list, optimistic-concurrency
  read-modify-write with retry) replacing `CustomObjectController`, fixing its missing-`await`, 20-item truncation and
  last-writer-wins bugs; add predicate-escaping helpers.
- Add structured JSON logging with a per-request correlation id (`X-Correlation-ID`), an access log without request/response bodies,
  a uniform error body and error middleware that never leaks stack traces (and maps body-parser/CT errors correctly).
- Add unauthenticated liveness endpoints `GET /service/health` and `GET /service/status`.
- Create the single-tenant `service/` skeleton (scripts, tsconfig, jest config, `.env.example`, test support incl. a stateful fake of
  the commercetools Custom Objects API) and park the not-yet-ported F/G route+controller files in `service/src/_pending/`
  (excluded from the build) so the tree compiles and tests run at the end of this change.

## Capabilities

### New Capabilities
- `service-single-tenant-core`: the single commercetools project binding: removal of tenancy, environment contract and validation, the
  commercetools client and Custom Objects client.
- `service-runtime`: HTTP runtime behaviour: bootstrap, logging and correlation ids, error contract, health endpoints, body parsing.

### Modified Capabilities
<!-- none: no specs exist yet in openspec/specs -->

## Impact

- Code: everything under `service/src` outside `routes/`, `controllers/` of F/G (which are only moved to `_pending/`).
- Dependencies removed: `@google-cloud/firestore`, `jsonwebtoken`, `@types/jsonwebtoken`, `@commercetools/sdk-client-v2`, `validator`,
  `@types/validator`, `dotenv`, `body-parser`, `uuid`, `@types/node-fetch`, `@types/request`. Added: `@commercetools/ts-client`,
  `zod`, `@commercetools-backend/express` (used by E), dev: `msw@2.10.5`, `supertest`, `jose`.
- Environment contract (documented for H): injected `CTP_*` (6), plus `PORT`, `LOG_LEVEL`, `MAX_VERSIONS`, `CONTAINER_PREFIX`.
- Depends on C (legacy removal) being archived; unblocks E, F, G, H.
- Cross-spec: E adds the auth section to the configuration module; F/G move their files out of `_pending/`.
