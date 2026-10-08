## Context

Facts, experiments and sources are in `explore.md`. This document is the **auth contract** other specs reference (F routes, G media, J Puck client, K admin app, M MCP, H Connect config).

## 1. The contract in one page

```
Credential      Authorization: Bearer <token>            (nothing else is read: no x-project-key, cookies, query tokens)
Token kind 1    Merchant Center exchange token (RS256 JWT, 60 s) forwarded by the MC API Gateway /proxy/forward-to
                  verified: signature (issuer JWKS), iss = MC gateway of the cloud region, aud = origin of CONNECT_SERVICE_URL
                           (+ path under the full-path policy), exp/nbf, gateway headers x-mc-api-cloud-identifier + x-mc-api-forward-to-version
                  authorised: claim "<iss>/claims/project_key" === CTP_PROJECT_KEY   (else 403)
                              optional: claim "<iss>/claims/user_permissions" contains MC_REQUIRED_PERMISSION (else 403)
Token kind 2    SERVICE_API_TOKEN (opaque, >= 32 chars, securedConfiguration), constant-time digest compare; for MCP, scripts, servers
Public          health + published reads + configuration reads (table 4) (+ opt-in built-in datasource resolve) -> Authorization ignored
Protected       everything else                                                  -> 401 / 403 / 503 below
Errors          401 {"message":"Authentication required"}                   (no header)     + WWW-Authenticate: Bearer realm="contentools"
                401 {"message":"Invalid or expired credentials"}            (any bad cred)  + WWW-Authenticate: Bearer realm="contentools", error="invalid_token"
                403 {"message":"Forbidden"}                                 (wrong project / missing permission)
                503 {"message":"Authentication service unavailable"}        (JWKS unreachable) + Retry-After: 5
                all with {"statusCode": n, "correlationId": "..."} (error contract from D)
CORS            exact-origin allowlist CORS_ALLOWED_ORIGINS; irrelevant for the MC hop (server-to-server)
```

### 1b. The single audience rule (resolves the K / R wording difference)

Verified in the docs ("Integrate with your own API", audience policy section, available from `@commercetools-frontend` 21.8.0) and in the library source:
* The gateway supports exactly two policies, chosen by the caller through the request header `X-Forward-To-Audience-Policy`: `forward-url-full-path` (**default**; token `aud` = origin + path of the forwarded URL, e.g. `https://svc.eu.commercetools.app/service/default/puck-pages`) and `forward-url-origin` (`aud` = origin only, `https://svc.eu.commercetools.app`).
* **Rule for this project**: the admin app (K) sends `forward-url-origin`; the service verifies `aud === origin(CONNECT_SERVICE_URL)` for that policy and **also accepts** `aud === origin + request path` (full-path) so a client that forgets the header still works. Nothing else is accepted. Spec R's statement "uses the full forwarded URL incl. /service" is true only for the default policy and is not the project rule; both statements are compatible with the service because it accepts both.
* **https only**: the gateway refuses `http://` targets, so `http://localhost:8080` can never be reached through the Merchant Center. MC-path checks need the Connect-deployed service (sandbox/preview) or an https tunnel (ngrok, Cloudflare) with `CONNECT_SERVICE_URL` set to the tunnel URL ending in `/service`.
* Without MC, the auth middleware is fully testable: `tests/support/mc.ts` forges exchange tokens with a local RS256 key pair and serves the matching JWKS through msw at the real issuer URL (the verifier is the real library, only the network is faked). The static `SERVICE_API_TOKEN` is the manual-test credential for local `curl` and the playground.

## 2. How the Merchant Center frontend calls the service (for specs J and K)

The browser never contacts the service directly. The custom app calls the MC API Gateway:

```
POST|GET|PUT|DELETE  https://mc-api.<region>.commercetools.com/proxy/forward-to      (buildApiUrl('/proxy/forward-to'))
  Accept-version:               v2                                   (explicit; default is v1)
  X-Forward-To:                 <CONNECT_SERVICE_URL>/<bu>/puck-pages        (full target URL incl. query string; https only)
  X-Forward-To-Audience-Policy: forward-url-full-path | forward-url-origin    (service accepts both; K sends forward-url-origin, robust to path rewrites)
  X-Forward-To-Claims:          permissions                          (only when MC_REQUIRED_PERMISSION is used)
  X-Project-Key:                <project key from the application context>   (gateway checks the user's access)
  Accept: application/json, Content-Type: application/json
  x-forward-header-x-source: admin-app           (optional; gateway strips the prefix -> service sees `x-source`)
```
With `@commercetools-frontend/application-shell` this is `executeHttpClientRequest(fetcher, { forwardToConfig: { uri, version: 'v2', audiencePolicy: 'forward-url-origin', includeUserPermissions }, headers })`
with `fetcher = (options) => fetch(buildApiUrl('/proxy/forward-to'), { ...options, method, body })` returning `{ data, statusCode, getHeader }`. The gateway
puts `Authorization: Bearer <exchange token>`, `x-mc-api-cloud-identifier` and `x-mc-api-forward-to-version` on the forwarded request. Consequence for **spec J**: the Puck client
must not hard-code `fetch`; it takes a `fetcher(url, init)` hook (K supplies the forward-to fetcher) and/or a `jwtToken` string (playground, service token) and never sends `x-project-key`.
Needs verification in K with Chrome (MC login is human-gated): that the gateway forwards methods PUT/DELETE and JSON bodies as expected (documented for `actions.forwardTo.post`; the docs page for the HTTP client only shows GET).
Public published reads from storefronts do NOT use this path: they call `CONNECT_SERVICE_URL` directly with no credentials (CORS allowlist if from a browser).

## 3. Decisions (with alternatives rejected)

* **D-E1 Authorise the project claim ourselves.** The library only proves "some MC user, some project". Without `projectKey === CTP_PROJECT_KEY` any MC user could write to our content. Rejected: relying on the gateway (it only checks the user's access to the project they claim, not ours).
* **D-E2 Two token kinds, discriminated by shape.** JWT-shaped -> MC verifier; otherwise static token. Rejected: static token as a JWT signed by us (re-introduces secrets management and a token endpoint); a custom header for the static token (CORS/preflight cost, non-standard).
* **D-E3 Deny-by-default order, not per-route middleware.** Rejected: attaching `requireAuth` to each route (the source style) - one forgotten route is a hole; F has ~70 routes.
* **D-E4 Accept both audience policies.** Rejected: only full-path (breaks if Connect/gateway rewrite paths) or only origin (weaker). The `forward-url-origin` token binds to the service origin only; a token minted for another service on the same host is out of scope (single Connect-assigned host per app).
* **D-E5 Derive the MC cloud identifier from `CTP_API_URL`.** Connect injects no region (explore D section 3). `CLOUD_IDENTIFIER` overrides; if neither resolves, MC auth is disabled and a warning is logged. Rejected: required config key (install friction); `inferIssuer: true` (needs a default issuer anyway and widens trust to all regions).
* **D-E6 Generic 401 text.** All verification failures return the same body; reason codes go to logs. Rejected: echoing jose messages (oracle for attackers, noise for users).
* **D-E7 503 for JWKS outage.** Distinguishes infrastructure failure from bad tokens.
* **D-E8 No rate limiting here.** Out of scope; the public published routes call commercetools on every request (datasource resolution). Documented as risk R3; mitigation (HTTP cache headers / CDN) is a storefront concern. Added to questions (Q-E3).
* **D-E10 Public datasource resolution is opt-in (answers J's Q-J2).** The Puck renderer shows product blocks from `resolvedData`, which the server already embeds into every published page read (public); it needs the `POST /datasource/:key/test` call only for blocks without embedded data.
  Making resolve and product search public by default would give anonymous callers a free proxy to commercetools with the service's credentials. Decision: `/products/search` and all datasource management stay protected always; resolve of the two built-in keys can be made public with `PUBLIC_DATASOURCE_RESOLVE=true` (standardConfiguration, default `false`), guarded by a global in-process fixed-window limiter (`PUBLIC_RESOLVE_MAX_PER_MINUTE`, default 120; per process, so with N autoscaled instances the effective cap is N times higher; documented). Mechanism: a public router mounted before the gate handles the request only when the flag is on and the key is built-in, otherwise it calls `next()` and the request falls through to the protected router of the same path. Rejected: public by default (J's suggestion) - amplification risk (explore R3); per-IP limiting (needs `trust proxy` configuration for Connect's proxy, unknown headers; revisit if abuse is seen).
* **D-E9 Static token has full write power on all business units.** Business-unit scoping is content partitioning, not access control (Q-03). Documented in README by H.

## 4. Route access table (authoritative; F implements it, F's tests assert it)

Prefix for every path: `/service`. `:bu` = business unit key.

| Access | Method + path | Route group (spec) |
| --- | --- | --- |
| PUBLIC | `GET /health`, `GET /status` | D |
| PUBLIC | `GET /:bu/published/puck-pages/:key` | F puck-pages |
| PUBLIC | `POST /:bu/published/puck-pages/query` | F puck-pages |
| PUBLIC | `GET /:bu/published/puck-contents/:key` | F puck-contents |
| PUBLIC | `POST /:bu/published/puck-contents/query` | F puck-contents |
| PUBLIC | `GET /:bu/configuration`, `GET /:bu/configurations` | F configuration |
| PUBLIC | `GET /:bu/configuration/{theme,header,facet,footer,site-metadata,category-listing,translations,b2b-account-menu-links}` | F configuration |
| PROTECTED | `GET /:bu/puck-pages`, `GET /:bu/puck-pages/:key`, `POST /:bu/puck-pages`, `PUT|DELETE /:bu/puck-pages/:key` | F |
| PROTECTED | `GET /:bu/preview/puck-pages/:key`, `POST /:bu/preview/puck-pages/query` | F |
| PROTECTED | `GET /:bu/puck-pages/:key/states`, `PUT /:bu/puck-pages/:key/states/published`, `DELETE /:bu/puck-pages/:key/states/draft`, `GET /:bu/puck-pages/:key/versions` | F |
| PROTECTED | same 5+4 shapes for `puck-contents` (`GET` list incl. `?contentType=`, preview, states, versions) | F |
| PROTECTED | `GET /:bu/puck-templates`, `GET /:bu/puck-templates/:key`, `POST /:bu/puck-templates`, `DELETE /:bu/puck-templates/:key` | F |
| PROTECTED | `POST|PUT|DELETE /:bu/configuration/<slice>` (8 slices) | F |
| PROTECTED | `GET /datasource`, `GET /datasource/:key`, `POST /datasource/:key`, `PUT /datasource/:key`, `DELETE /datasource/:key`, `POST /datasource/:key/test` | F |
| PUBLIC only if `PUBLIC_DATASOURCE_RESOLVE=true` and key is `product-by-sku` or `products-by-sku` (rate limited), else PROTECTED | `POST /datasource/:key/test` | F |
| PROTECTED | `GET /products/search` | F |
| PROTECTED | `POST /:bu/content-type/import` and `POST /content-type/import` (same handler) | F |
| PROTECTED | `POST /:bu/upload-file`, `GET /:bu/media-library` | G |

Changes versus the source (all deliberate): (1) `GET` list/detail/states/versions and `preview/*` of pages, contents and templates were readable with only a project key; now protected because they expose drafts and editorial state.
(2) `GET /datasource*` and `GET /products/search` were public; now protected (editor-only tools; product search spends commercetools quota with service credentials); `POST /datasource/:key/test` was JWT-only and stays protected unless the opt-in flag of D-E10 is set.
(3) `GET /:bu/media-library` (G) was public; protected (it lists the whole bucket), published pages carry their own asset URLs. (4) Source bug: the server mounts `POST /content-type/import` (no `:bu`; `routes/content-type.route.ts` line 66) but `puck-api` calls `POST /:bu/content-type/import` (`configuration.api.ts` line 81) so the editor's import button 404s in the source, while the MCP uses the unscoped path (`mcp/src/shared/functions.ts` line 249). F serves both paths with one handler.
Open for the owner: Q-E1 (are preview reads needed by a storefront preview mode? default: storefront uses `SERVICE_API_TOKEN` server-side).

## 5. Implementation shape

```
service/src/
  auth/
    principal.ts        Principal union, getPrincipal(req)
    cloud-identifier.ts deriveCloudIdentifier(apiUrl) + CLOUD_IDENTIFIERS
    mc-verifier.ts      createMcVerifier(auth): (req) => Promise<McSession>; classifies errors -> McAuthError('invalid'|'unavailable')
    service-token.ts    matchesServiceToken(presented, expected)
    authenticate.ts     authenticate(req, config) -> Principal | throws CustomError(401|403|503)
  middleware/
    auth.middleware.ts  requireAuth: RequestHandler
    cors.middleware.ts  createCorsMiddleware(config)
  config/env.ts         + auth section (CONNECT_SERVICE_URL, CLOUD_IDENTIFIER, SERVICE_API_TOKEN, CORS_ALLOWED_ORIGINS, MC_REQUIRED_PERMISSION)
```
Verifier errors are classified in one function: `invalid` for `ERR_JWT_*`, `ERR_JWS_*`, `ERR_JOSE_ALG_NOT_ALLOWED`, `ERR_JWKS_NO_MATCHING_KEY` and for the library's plain `Error`s about missing headers; `unavailable`
for `ERR_JOSE_GENERIC` (JWKS HTTP failure), `ERR_JWKS_TIMEOUT` and `TypeError` (network). With two audience policies the verifier tries full-path, then origin; if both throw `invalid` the result is `invalid`; if either throws `unavailable` the result is `unavailable`.

## 6. Test strategy (matches the Connect skill's testing checklist)

`tests/support/mc.ts` builds a kit: generates an RS256 key pair per test run, serves the JWKS from msw at the real issuer URL (`https://mc-api.europe-west1.gcp.commercetools.com/.well-known/jwks.json`), and signs
tokens with overridable claims. `tests/integration/auth-matrix.test.ts` is table-driven (`it.each`) over the rows in the spec (garbage, none, HS256, wrong key, expired, nbf, wrong iss, wrong aud, unknown kid, missing headers,
missing project claim, other project, missing permission, JWKS 500, JWKS network error, valid v2, valid v1) and runs each against one protected `GET` and one protected `POST` probe route,
asserting status, body equality across causes, `WWW-Authenticate`, no token in logs. Further suites: public-ignores-auth, gate-by-default, static token (right, wrong, unset, constant-time helper unit), config validation,
CORS (allowed, denied, preflight, `*`, credentials absent). F adds the full-route inventory test (every router route appears in the table of section 4).

## Risks / Trade-offs

See `explore.md` section 5. Additionally: MC tokens live 60 s; a long-running request is not re-verified (fine). `userPermissions` is only present if the frontend asks for it; with `MC_REQUIRED_PERMISSION` set and no claim the user gets 403 (documented for K).

## Migration plan

No data migration. Clients move from `x-project-key` + service-issued JWT to `Authorization: Bearer` with the MC forward-to flow (K) or the static token (MCP, scripts). Rollback: revert the gate and re-introduce nothing: the old mechanism is gone with D.
