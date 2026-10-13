## Why

The Merchant Center wrapper in `/Users/behnam/code/cms/contentools` is built around multi-tenancy: it
creates an all-powerful `manage_project` API client in the browser, stores the secret and a service JWT
in a project custom object, and blocks the UI behind a "Configuration Wizard". With one Connect-injected
API client (single tenant) and Merchant Center session auth (spec E), all of that is dead weight, and the
package is also unbuildable today (missing lint schema, missing generated types, toolchain peers
out of range, 70+ unused dependencies). We need a clean `admin-app/` that mounts the new
`@commercetools-labs/puck-*` managers and talks to the service through the Merchant Center `forward-to` proxy.

## What Changes

- Create `admin-app/` from `contentools/`: a file-by-file keep / delete / rewrite (table in `design.md`).
- **BREAKING (internal)** Delete the tenant onboarding flow: `connect-project.tsx`, `contexts/connect.tsx`, `contexts/auth.tsx`,
  `hooks/use-create-api-client`, `hooks/use-shared-custom-object-storage`, `hooks/use-custom-objects`, `hooks/use-contentools-api`,
  `types/tenant-config.ts`, `utils/tenant-config.utils.ts`, and dead starter leftovers (`helpers.ts`, `types.ts`, `region.ts`, unused hooks, `core.json`).
- Rewrite `routes.tsx` to mount `PageManager`, `ContentManager`, `ThemeManager` with `baseURL`, `businessUnitKey`, `locale` and a `fetcher`
  that sends every request through `/proxy/forward-to` (`executeHttpClientRequest` + `forwardToConfig`). No `projectKey`, no `jwtToken`.
- Add a `ServiceProvider` / `useServiceFetcher` in the app that reads the service URL from `additionalEnv.serviceUrl`.
- Keep the business-unit selector (Q-03), rewrite `AdminLayout` (no "CMS" badge, Nimbus icons, i18n).
- Rebuild the toolchain: Yarn 1 classic + `yarn.lock` v1 (owner decision: Yarn for all Connect apps), `@commercetools-frontend/*` pinned to one version (27.13.0), Nimbus `3.5.1`
  (matches the exact dependency of the application shell), ESLint 9 flat config, Jest 30 via `jest-preset-mc-app`; prune unused dependencies.
- i18n: app strings via `react-intl` messages, `en` and `de` catalogs.
- Define how the app consumes unpublished puck packages locally (tarballs via a script) and in Connect builds (npm registry `1.0.0-rc.N`).
- Add tests (jest + MC test utils) and a Chrome DevTools verification split into automatable / needs-MC-login.

## Capabilities

### New Capabilities
- `admin-app-structure`: layout, files kept/removed, naming (no "cms"), i18n en/de, SPDX, no onboarding or credential storage.
- `admin-app-service-access`: route wiring of the three managers, forward-to transport, business-unit scoping, permission gating, error states.
- `admin-app-dependencies`: dependency set and pins, toolchain, local consumption of unpublished puck packages vs registry.

### Modified Capabilities
<!-- none: openspec/specs/ is empty -->

## Impact

- New tree `admin-app/` (about 15 source files after pruning, from 2,086 lines in 40 files).
- Consumes puck packages from spec J (needs the `fetcher` injection point) and the auth contract from spec E (audience = service origin, `userPermissions` claim).
- Provides `admin-app/` as input to spec L (Connect packaging) and spec Q (acceptance).
- Adds env keys read by the app: `ENTRY_POINT_URI_PATH`, `CLOUD_IDENTIFIER`, `CUSTOM_APPLICATION_ID`, `CONTENTOOLS_SERVICE_URL`, `CTP_INITIAL_PROJECT_KEY`.
