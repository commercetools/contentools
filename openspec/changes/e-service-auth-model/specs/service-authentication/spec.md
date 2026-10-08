## ADDED Requirements

### Requirement: Credential format
Protected routes SHALL accept credentials only as `Authorization: Bearer <credential>`. A credential made of three base64url segments separated by dots
SHALL be treated as a Merchant Center exchange token; any other credential SHALL be compared with the configured `SERVICE_API_TOKEN`. The service SHALL NOT
accept `x-project-key`, cookies, query-string tokens, or Basic authentication.

#### Scenario: Header missing
- **WHEN** a protected route is called without an `Authorization` header
- **THEN** the response is `401` with body `{"message":"Authentication required","statusCode":401,"correlationId":"<id>"}` and header `WWW-Authenticate: Bearer realm="contentools"`

#### Scenario: Wrong scheme
- **WHEN** a protected route is called with `Authorization: Basic dXNlcjpwYXNz`
- **THEN** the response is `401` `{"message":"Invalid or expired credentials", ...}` with `WWW-Authenticate: Bearer realm="contentools", error="invalid_token"`

### Requirement: Merchant Center token verification
The service SHALL verify Merchant Center exchange tokens with `createSessionAuthVerifier` from `@commercetools-backend/express`, configured with
`audience` = origin of `CONNECT_SERVICE_URL`, `issuer` = the Merchant Center cloud identifier (`CLOUD_IDENTIFIER`, or derived from the host of `CTP_API_URL`),
`getRequestUrl` = the original request URL, and SHALL accept both audience policies (`forward-url-full-path` first, then `forward-url-origin`). Verification SHALL
require RS256, valid signature against the issuer's JWKS, matching issuer, audience, unexpired `exp`, and the gateway headers `x-mc-api-cloud-identifier` and
`x-mc-api-forward-to-version`. Every verification failure SHALL yield `401 Invalid or expired credentials` and the same response body regardless of cause; the cause
(error code only) SHALL be logged at `warn` with the correlation id, never the token.

#### Scenario: Valid token
- **WHEN** a request carries a correctly signed, unexpired token for the service audience with project claim equal to `CTP_PROJECT_KEY` and the two gateway headers
- **THEN** the request is processed and `req.principal` is `{kind:"merchant-center", userId, projectKey, permissions}`

#### Scenario: Rejection matrix
- **WHEN** the token is any of: garbage (`abc.def.ghi`), `alg: none`, HS256-signed, signed by another key, expired, not yet valid, wrong issuer, wrong audience, unknown `kid`; or the gateway headers are missing
- **THEN** the response is `401` with identical bodies (except `correlationId`), and no log line contains the token

#### Scenario: Identity provider unreachable
- **WHEN** the issuer's JWKS endpoint answers 500 or the network fails
- **THEN** the response is `503` `{"message":"Authentication service unavailable", ...}` with `Retry-After: 5`

#### Scenario: v1 gateway version
- **WHEN** the gateway sends `x-mc-api-forward-to-version: v1` and `CLOUD_IDENTIFIER=gcp-eu` and the token issuer is `https://mc-api.commercetools.com`
- **THEN** the token is accepted (the library selects the legacy issuer)

### Requirement: Project and permission authorisation
A verified Merchant Center token SHALL be authorised only if its project claim equals `CTP_PROJECT_KEY`; otherwise the response SHALL be `403`
`{"message":"Forbidden", ...}`. When `MC_REQUIRED_PERMISSION` is configured, the token's `user_permissions` claim SHALL contain that permission, otherwise `403`.

#### Scenario: Token of another project
- **WHEN** a valid token has project claim `someone-elses-project`
- **THEN** the response is `403` and the handler is not executed

#### Scenario: Required permission missing
- **WHEN** `MC_REQUIRED_PERMISSION=canManageContentools` and the token carries `["canViewContentools"]` or no permissions claim
- **THEN** the response is `403`; with `["canManageContentools"]` it is processed

### Requirement: Static service token
When `SERVICE_API_TOKEN` is configured (at least 32 characters, not three dot-separated segments) the service SHALL accept it as a credential on protected routes, comparing the
SHA-256 digests of the presented and configured values with a constant-time comparison, and set `req.principal` to `{kind:"service-token"}`. When it is not
configured, every non-JWT credential SHALL be rejected with `401`.

#### Scenario: Correct and wrong token
- **WHEN** `Authorization: Bearer <SERVICE_API_TOKEN>` is sent
- **THEN** the request is processed; with any other opaque value the response is `401 Invalid or expired credentials`

#### Scenario: Service token on every protected route
- **WHEN** the correct `SERVICE_API_TOKEN` is presented on a preview read, a draft/state/version read, a content write, a configuration write, a datasource call or a media call
- **THEN** the request is authorised exactly like a Merchant Center principal that passes the project check (the gate does not distinguish read from write)

#### Scenario: Token not configured
- **WHEN** `SERVICE_API_TOKEN` is unset and a request presents an opaque bearer value
- **THEN** the response is `401`

#### Scenario: Weak token refused at startup
- **WHEN** `SERVICE_API_TOKEN` is `short` or `aaa.bbb.ccc`
- **THEN** `readConfiguration()` throws `ConfigurationError` naming `SERVICE_API_TOKEN` without printing its value

### Requirement: Deny-by-default route access policy
The service router SHALL register public routes first, then a single `requireAuth` gate, then all other routes, so that any route added after the gate is protected.
Public routes SHALL be exactly: `GET /service/health`, `GET /service/status`, `GET /service/:businessUnitKey/published/puck-pages/:key`,
`POST /service/:businessUnitKey/published/puck-pages/query`, `GET /service/:businessUnitKey/published/puck-contents/:key`,
`POST /service/:businessUnitKey/published/puck-contents/query`, `GET /service/:businessUnitKey/configuration`, `GET /service/:businessUnitKey/configurations`,
and `GET /service/:businessUnitKey/configuration/<slice>` for slices `theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links`.
Public routes SHALL ignore the `Authorization` header entirely. Everything else (including preview, drafts, states, versions, templates, datasources, product search,
content-type import, media, and all configuration writes) SHALL be protected.

#### Scenario: Public route with garbage credentials
- **WHEN** `GET /service/default/published/puck-pages/home` is called with `Authorization: Bearer garbage`
- **THEN** the request is processed as anonymous (not 401)

#### Scenario: New route is protected by default
- **WHEN** a route is registered after `requireAuth` and called without credentials
- **THEN** the response is `401`

#### Scenario: Draft-exposing reads are protected
- **WHEN** `GET /service/default/puck-pages`, `.../puck-pages/:key/states`, `.../puck-pages/:key/versions` or `/service/default/preview/puck-pages/:key` is called anonymously
- **THEN** the response is `401`

### Requirement: Opt-in public resolution of built-in datasources
When `PUBLIC_DATASOURCE_RESOLVE=true`, `POST /service/datasource/:key/test` SHALL be reachable without credentials for the built-in datasource keys `product-by-sku` and
`products-by-sku` only, subject to a global fixed-window limit of `PUBLIC_RESOLVE_MAX_PER_MINUTE` (default 120) requests per minute per process (excess requests answer `429`
`{"message":"Too many requests", ...}` with `Retry-After`). With the flag unset or `false` (default), or for any other datasource key, the same path SHALL require authentication like every
other protected route. `GET /service/products/search` and all datasource management routes SHALL remain protected in every configuration.

#### Scenario: Flag off (default)
- **WHEN** `POST /service/datasource/product-by-sku/test` is called anonymously and `PUBLIC_DATASOURCE_RESOLVE` is unset
- **THEN** the response is `401`

#### Scenario: Flag on, built-in key
- **WHEN** `PUBLIC_DATASOURCE_RESOLVE=true` and the same request is made anonymously
- **THEN** the request is processed (not 401); with an invalid `Authorization` header it is still processed anonymously

#### Scenario: Flag on, other key or other route
- **WHEN** `PUBLIC_DATASOURCE_RESOLVE=true` and an anonymous caller targets `POST /service/datasource/my-custom/test`, `GET /service/datasource` or `GET /service/products/search`
- **THEN** the response is `401`

#### Scenario: Limit exceeded
- **WHEN** `PUBLIC_RESOLVE_MAX_PER_MINUTE=2` and three anonymous resolve calls are made within the same minute
- **THEN** the third answers `429` with a `Retry-After` header

### Requirement: Startup diagnostics for authentication
At startup the service SHALL log (without secrets) which credential kinds are enabled and SHALL log a `warn` when Merchant Center verification cannot be enabled
(no `CONNECT_SERVICE_URL`, or no resolvable cloud identifier) or when no credential kind is enabled at all.

#### Scenario: Nothing enabled
- **WHEN** neither `CONNECT_SERVICE_URL` nor `SERVICE_API_TOKEN` is set
- **THEN** a `warn` line states that all protected routes will answer 401, and the service still starts
