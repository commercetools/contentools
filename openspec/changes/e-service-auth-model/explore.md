# Explore notes: e-service-auth-model

Working note. SOURCE = `/Users/behnam/code/cms`; MC = Merchant Center.

## 1. Auth in the source service (what we replace)

* Two credentials, neither real user auth:
  * **Reads**: `requireProjectKey` (`service/src/middleware/project-key.middleware.ts`, 58 lines): header `x-project-key` is looked up in the Firestore
    tenant registry. Anyone knowing a registered project key can read *everything*, including drafts, versions and (via `preview/*`) unpublished content.
  * **Writes**: `validateJwt` (`middleware/jwt.middleware.ts`, 129 lines): HS256 JWT signed with `JWT_SECRET`, `sub = projectKey`, issuer and audience both the
    literal `multitenant-contentools`; minted by `POST /authenticate-project` in exchange for the tenant's **commercetools client id + secret** (the
    caller sends CT credentials to the service; `controllers/auth.controller.ts`, 226 lines).
* Route census (source `routes/*.route.ts`, grep of `requireProjectKey|validateJwt`): every GET uses `requireProjectKey`; every POST/PUT/DELETE
  uses `validateJwt + validateProject`. So the **draft-exposing GETs were public in practice** (`GET /:bu/puck-pages`, `/:bu/puck-pages/:key`
  (with states), `.../states`, `.../versions`, `/:bu/preview/puck-pages/*`, same for contents/templates, `GET /datasource*`, `GET /products/search`).
* Clients: `puck/packages/puck-api/src/api/http-client.ts` lines 39-51 `readHeaders = {Content-Type, x-project-key}`,
  `writeHeaders = {..., x-project-key, Authorization: Bearer <jwt>}`; `x-source: puck-api` is added on every call (line 17).
  `contentools/src/contexts/auth.tsx` refreshes the JWT via `POST /refresh-jwt`; `mcp/src/shared/functions.ts` lines 28-29, 78-93 uses `x-project-key` + JWT.
* CORS (`service/src/app.ts` lines 21-35): allowed headers `Content-Type, Authorization, x-project-key, x-source`; origin allowlist by "main domain".

## 2. Merchant Center `forward-to` proxy: facts verified

Sources: `docs.commercetools.com/merchant-center-customizations/concepts/integrate-with-your-own-api` (via the knowledge MCP + WebFetch),
`.../concepts/merchant-center-api` (cloud identifiers), `.../tooling-and-configuration/commercetools-frontend-application-shell` (`executeHttpClientRequest`),
and the package source of `@commercetools-backend/express@27.13.0` (downloaded to the scratchpad, read in full: `dist/commercetools-backend-express.esm.js`).

* The MC frontend does NOT call our service directly. The browser calls the **MC API Gateway** endpoint `/proxy/forward-to` (host `mc-api.<region>.commercetools.com`)
  with headers: `Accept-version` (required; `v1` default, `v2` non-default), `X-Forward-To` (required, the full external URL), `X-Forward-To-Audience-Policy`
  (required: `forward-url-full-path` default | `forward-url-origin`), `X-Forward-To-Claims: permissions` (optional), `X-Project-Key` (required; the gateway checks the
  user has access to that project and only then forwards). Custom headers can be passed prefixed `x-forward-header-` (prefix stripped). Only `https` targets are allowed
  (no `http://localhost`; local dev needs a tunnel such as ngrok).
* Our service therefore sees a server-to-server request from the gateway: `Authorization: Bearer <exchange token>`, a 60-second RS256 JWT, plus the headers
  `x-mc-api-cloud-identifier` and `x-mc-api-forward-to-version` (set by the gateway). **There is no browser `Origin` on that hop; CORS is irrelevant for MC calls.**
  CORS only matters for direct browser callers (storefront, playground).
* Exchange token claims: `iss` = gateway URL for the cloud region, `aud` = forward URL per audience policy, `sub` = MC user id, `iat`, `exp` (60 s),
  `type: "exchange"`, `<iss>/claims/project_key`, optional `<iss>/claims/user_permissions` (only if `X-Forward-To-Claims: permissions`; values like `canViewChannels`).
* Cloud identifiers -> issuers: `gcp-au` mc-api.australia-southeast1.gcp, `gcp-eu` mc-api.europe-west1.gcp, `gcp-us` mc-api.us-central1.gcp, `aws-eu` mc-api.eu-central-1.aws,
  `aws-us` mc-api.us-east-2.aws (all `.commercetools.com`). With `Accept-version: v1` the library switches to legacy issuers for gcp-eu (`https://mc-api.commercetools.com`) and
  gcp-us (`https://mc-api.commercetools.co`).
* Library behaviour (`createSessionAuthVerifier`, `createSessionMiddleware`), read from source:
  * options `audience` (required, origin), `issuer` (required: cloud id or URL), `audiencePolicy`, `inferIssuer`, `getRequestUrl`.
  * throws plain `Error` for missing `x-mc-api-cloud-identifier`, missing `x-mc-api-forward-to-version`, missing `authorization`; jose errors otherwise
    (`algorithms: ['RS256']` pinned, so `alg: none` and HS256 are refused with `ERR_JOSE_ALG_NOT_ALLOWED`).
  * audience compared = `origin(audience) + pathname(request.originalUrl|url)` under full-path policy (query string dropped), or only the origin under origin policy.
  * on success sets `request.session = { userId, projectKey, userPermissions? }`. **It does not check that `projectKey` is OUR project**: any user of any MC project can
    legitimately make the gateway forward to our public URL with a valid token. -> **Authorization (projectKey must equal `CTP_PROJECT_KEY`) is our job.** This is the critical
    security finding of this spec.
  * `createSessionMiddleware` forwards every failure with `next(error)` (default Express handler would answer 500): we must wrap it and answer 401.
* Sibling reference: `/Users/behnam/code/commercetools-labs/search-config/service/src/auth/merchant-center.ts` does the same (tries both audience policies, checks project key,
  issuer from `CLOUD_IDENTIFIER`, audience from `CONNECT_SERVICE_URL`). Its `CONNECT_SERVICE_URL` doc: "external base URL, ending in the endpoint path".

## 3. Experiments run in the scratchpad (evidence for the test matrix)

Express + `createSessionMiddleware({audience:'https://svc.example.app', issuer:'gcp-eu', audiencePolicy:'forward-url-origin'})`, msw serving the JWKS at
`https://mc-api.europe-west1.gcp.commercetools.com/.well-known/jwks.json`, jose 5.10 signing RS256 tokens, supertest. Results (status after wrapping errors to 401):

| Case | jose / library error |
| --- | --- |
| valid | session `{userId, projectKey}` |
| no Authorization | `Error: Missing "authorization" header` |
| missing gateway headers | `Error: Missing "X-MC-API-Cloud-Identifier" header.` |
| wrong audience | `ERR_JWT_CLAIM_VALIDATION_FAILED` (`aud`) |
| wrong issuer | `ERR_JWT_CLAIM_VALIDATION_FAILED` (`iss`) |
| expired | `ERR_JWT_EXPIRED` |
| not yet valid (`nbf`) | `ERR_JWT_CLAIM_VALIDATION_FAILED` |
| wrong signature (other key) | `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` |
| `alg: none` | `ERR_JOSE_ALG_NOT_ALLOWED` |
| HS256 token | `ERR_JOSE_ALG_NOT_ALLOWED` |
| garbage `abc.def.ghi` | `ERR_JWS_INVALID` |
| unknown `kid` | `ERR_JWKS_NO_MATCHING_KEY` |
| JWKS endpoint answers 500 | `JOSEError ERR_JOSE_GENERIC` ("Expected 200 OK from the JSON Web Key Set HTTP response") |
| JWKS network error | `TypeError: Network error` |

-> JWKS availability failures (`ERR_JOSE_GENERIC`, `TypeError`, `ERR_JWKS_TIMEOUT`) must be answered **503**, not 401, so operators do not chase "bad tokens".
Test-stack gotchas (shared with D): msw must be pinned `2.10.5`; ignore `127.0.0.1` in `onUnhandledRequest`; jose `5.x` (the library's own dependency) is used to sign test tokens.

CORS experiment (cors 2.8.5): function origin `(o, cb) => cb(null, !o || allowed.has(o))` yields `Access-Control-Allow-Origin` + `Vary: Origin` for allowed origins, no CORS
headers (and no error) for denied origins, preflight `204` with `Access-Control-Allow-Headers/Methods` for allowed. Source's behaviour (error -> 500) is wrong.

## 4. Decisions that follow (details in design.md)

* Public = published reads + configuration reads + health. Everything else authenticated by default (deny-by-default router order).
* Token kinds: MC exchange token (JWT shaped) or `SERVICE_API_TOKEN` (opaque). No self-issued tokens, no refresh endpoint.
* The MC issuer is derived from `CTP_API_URL` host (Connect does not inject a region) unless `CLOUD_IDENTIFIER` is set.
* Audience = origin of `CONNECT_SERVICE_URL`.
* Authorization: `session.projectKey === CTP_PROJECT_KEY` (403 otherwise); optional `MC_REQUIRED_PERMISSION`.

## 5. Risks

1. MC users of other projects forwarding to our URL (mitigated by the project check; tested).
2. `CONNECT_SERVICE_URL` path vs gateway forward URL mismatch -> every MC call 401. Mitigation: accept both audience policies, document, log the failing `aud` reason code at warn.
3. Public published routes call CT with service credentials on each request (datasource resolution): amplification; documented in F (cache is out of scope).
4. A leaked `SERVICE_API_TOKEN` grants full write access to all business units: documented, rotate by redeploy (partial-merge semantics noted for H).
5. Gateway rejects `http://` targets, so local MC testing needs a tunnel; the static token path lets local dev and the playground work without MC.
