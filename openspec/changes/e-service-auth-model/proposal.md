## Why

The source service had no real authentication: every read trusted a registered project key header (so drafts, versions and previews were effectively public) and
every write trusted a self-issued JWT obtained by sending the tenant's commercetools client id and secret to the service. With a single tenant and a Merchant Center
(MC) custom application as the editor, the right model is the MC session: the MC API Gateway's `forward-to` proxy forwards the logged-in user's short-lived token, which the
service verifies. Servers and AI tools that are not in the MC need a simple static token. Every content route (F), media route (G), Puck client contract (J) and MCP app (M)
depends on this contract, so it is defined once, here.

## What Changes

- **BREAKING** Replace `x-project-key` + HS256 JWT with `Authorization: Bearer <token>` where the token is either (a) an MC exchange token verified with
  `@commercetools-backend/express` (`createSessionAuthVerifier`, audience = origin of `CONNECT_SERVICE_URL`, issuer from the MC cloud region) and authorised only when its project
  claim equals `CTP_PROJECT_KEY`, or (b) the optional static `SERVICE_API_TOKEN` (compared in constant time).
- Deny-by-default routing: a public section (health, published reads, configuration reads) followed by a single `requireAuth` gate; everything registered after the gate is protected.
  The authoritative public/protected table is part of this spec.
- Exact error contract for auth failures (401 / 403 / 503 bodies and `WWW-Authenticate`), without leaking verification details.
- CORS: explicit origin allowlist `CORS_ALLOWED_ORIGINS`, preflight without auth, correct headers (`x-project-key` removed); disallowed origins get no CORS headers instead of a 500.
- Opt-in `PUBLIC_DATASOURCE_RESOLVE` (default off) making built-in datasource resolve anonymous with a global rate limit; optional stable `code` field in the error contract.
- Optional hardening: `MC_REQUIRED_PERMISSION` (e.g. `canManageContentools`) checked against the `user_permissions` claim.
- Test kit (`tests/support/mc.ts`) and the parameterised auth-rejection matrix required by the Connect production-readiness checklist.
- Documents, for specs J/K/M/H, exactly how the MC frontend must call the service (forward-to headers) and which env keys the Connect config needs.

## Capabilities

### New Capabilities
- `service-authentication`: credential kinds, verification, authorisation (project check, permission), route access policy, auth error bodies, rejection matrix.
- `service-cors`: cross-origin policy of the service.

### Modified Capabilities
<!-- none -->

## Impact

- Code: `service/src/auth/*`, `middleware/auth.middleware.ts`, `middleware/cors.middleware.ts`, `config/env.ts` (auth section), `errors/custom.error.ts` (`headers`), `routes/service.route.ts` (gate), `types/express.d.ts`.
- Dependencies: `@commercetools-backend/express`, `cors` (already added by D), dev `jose`, `msw@2.10.5`.
- Environment/config for H: `CONNECT_SERVICE_URL` (platform), `CLOUD_IDENTIFIER` (standard, optional), `SERVICE_API_TOKEN` (secured, optional), `CORS_ALLOWED_ORIGINS` (standard, optional), `MC_REQUIRED_PERMISSION` (standard, optional), `PUBLIC_DATASOURCE_RESOLVE` and `PUBLIC_RESOLVE_MAX_PER_MINUTE` (standard, optional).
- Depends on D; unblocks F, G, J, M, H.
