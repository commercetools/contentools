## Why

Every Puck package still speaks the multi-tenant protocol: a `projectKey` prop, a per-tenant `jwtToken` string and an `x-project-key` header on all requests
(368 lines in 41 files). Contentools is single-tenant (the Connect-injected API client is the one project), reads of published content become public and
everything else needs a Merchant Center session token that only the MC `forward-to` proxy can provide. The packages need one small, stable connection contract that
works in three hosts: the Merchant Center custom application (token comes through a proxy transport), a storefront (public reads, optionally a service token on a server) and local development.

## What Changes

- **BREAKING** Remove `projectKey` from every public prop, provider, context, hook and raw API function; stop sending `x-project-key`.
- Introduce a connection contract in `puck-types`/`puck-api`: `baseURL`, `businessUnitKey`, `locale?`, and an auth injection point made of `jwtToken?` (string, convenience), `getAuthHeaders?()` (async, evaluated per request) and `fetcher?()` (full transport override, required for the Merchant Center forward-to proxy).
- Add `createPuckClient()` (React-free, usable in SSR/server code), a single request pipeline replacing the three duplicated header/fetch implementations (`http-client.ts`, `configuration.api.ts`, `puck-image-picker`), typed errors (`PuckHttpError`, `PuckAuthError`) and one auth-policy table (which calls require auth).
- Change raw API functions to `(client, ...args)`; hooks/components read the client from context.
- Renderer **public-read mode**: `PuckRenderer mode="published"` and `PuckDataRenderer` work with only `baseURL` + `businessUnitKey` (or no provider at all); `mode="preview"` requires auth; product blocks no longer throw without a provider or token.
- Preview and editor reads now send auth (they sent none before).
- `puck-image-picker` reuses the same client (depends on `puck-api`), removing its duplicate media API.
- Update `playground` (new env vars, auth modes `token | fetcher | none`), add a dependency-free mock service (`playground/mock-server`) so the UI can be verified without the real service, and add vitest/RTL tests plus a Chrome DevTools verification script.
- Rewrite the README usage sections, `docs/api-contracts.json` argument descriptions and add a migration table. Version stays `1.0.0` (first labs release; packages were renamed in spec I, so no semver promise to the old scope exists).

## Capabilities

### New Capabilities
- `puck-connection-contract`: the single-tenant connection and auth-injection contract of all Puck packages (props, provider/context, client, fetcher/getAuthHeaders, error model, public-read renderer).
- `puck-playground-verification`: the playground configuration, the mock service fallback and the automated and browser verification of the contract.

### Modified Capabilities
<!-- none -->

## Impact

- Code: `puck/packages/puck-api` (rewrite of `api/*`, `context/*`, hooks), `puck-types` (new connection types), `puck-renderer`, `puck-editor`, `puck-page-manager`, `puck-content-manager`, `puck-theme-manager`, `puck-image-picker` (props and wiring), `puck-components` (product blocks), `playground`, `README.md`, `docs/api-contracts.json`.
- Consumers: spec K (admin-app) builds a `fetcher` adapter on MC `executeHttpClientRequest`; spec E must allow the headers this client sends (`Authorization`, `Content-Type`, `x-source`) and treat the auth-policy table as its public/protected input; spec F/H provide the real service the playground can run against; spec Q reuses the Chrome script.
- Depends on I (names/toolchain/test stack), E (auth model), F (routes). Until E/F are archived the mock server is the reference counterpart (see design D-8).
