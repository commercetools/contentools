# K — explore notes (admin-app migration)

Working note, not an OpenSpec artifact. Everything here was read from the source on 2026-10-08.
Source root: `/Users/behnam/code/cms/contentools` (called `SRC` below). 2,086 lines under `src/`
(0 test files, 0 `*.spec.*`), 153 files of committed build output under `SRC/public/`.

## 1. What the source app actually does

`SRC/src/index.tsx` mounts `EntryPoint` (`components/entry-point/entry-point.tsx:26-43`):

```
ApplicationShell(environment=window.app, applicationMessages=loadMessages)
 └ NimbusProvider(loadFonts=false)
    └ AuthProvider            contexts/auth.tsx        <- JWT in a CT custom object + /refresh-jwt
       └ ConnectProvider      contexts/connect.tsx     <- shows <ConnectProject/> wizard until creds+JWT exist
          └ BusinessUnitProvider contexts/business-unit.tsx
             └ lazy(routes)   routes.tsx
```

`routes.tsx` (81 lines) wraps `AdminLayout` around three routes:
`${match.path}/pages` -> `<PageManager>`, `/items` -> `<ContentManager>`, `/theme` -> `<ThemeManager>`;
`exact match.path` redirects to `/pages`. Every manager receives
`baseURL={environment.CMS_API_URL} businessUnitKey projectKey={project.key} jwtToken`.
`PageManager`/`ContentManager` also get `parentUrl={`${match.url.slice(1)}/pages|items`}`
(they mount their own `BrowserRouter basename={parentUrl}`; verified in
`/Users/behnam/code/cms/puck/packages/puck-page-manager/src/PageManager.tsx:652-673`).
`ThemeManager` has no router of its own and uses the outer one
(`puck-theme-manager/src/components/theme-editor.tsx:920-940`).

### Tenant onboarding flow (to delete)
* `components/connect-project.tsx` (197 lines): button 1 calls `useCreateApiClient` (MC GraphQL
  mutation `createApiClient` with scope `manage_project:<key> view_checkout_applications:<key>` — an
  all-powerful `manage_project` client created in the browser); button 2 POSTs
  `{ct_client_id, ct_client_secret, ct_project_key, ct_scope, ct_region}` to `${CMS_API_URL}/authenticate-project`
  (`hooks/use-contentools-api`), stores `{clientId, clientSecret}` **in plaintext** in custom object
  `contentools-configuration/contentools-credentials` and the returned JWT in
  `contentools-configuration/contentools-jwt-token` (`hooks/use-shared-custom-object-storage`,
  `hooks/use-custom-objects`), then `window.location.reload()`.
* `contexts/auth.tsx` (139 lines): reads JWT from the custom object, decodes `exp` with `atob`, calls
  `POST /refresh-jwt` when expired.
* `contexts/connect.tsx` (82 lines): gate; renders spinner / wizard / children.
* `constants.ts:9-11`: `CONFIGURATION_CONTAINER`, `JWT_TOKEN_KEY`, `CREDENTIALS_KEY`.
All of it is tenancy plumbing and disappears (single tenant: the Connect-injected API client is the tenant).

### Things that are NOT onboarding but are dead
Grepped every symbol across `SRC/src` (`grep -rn`):
| Symbol / file | Importers | Verdict |
| --- | --- | --- |
| `hooks/use-associate-roles` | none | dead |
| `hooks/use-project-languages` | none | dead |
| `hooks/use-stores` | none | dead |
| `helpers.ts`, `types.ts`, `region.ts` | only each other (`helpers.ts` imports `./types/generated/ctp`, which does not exist) | dead starter-template leftovers; `tsc` cannot pass today |
| `i18n/data/core.json` | none at runtime | starter leftovers ("Channels.title", "Welcome.*") |
| `types/tenant-config.ts` (124 l), `utils/tenant-config.utils.ts` (92 l) | only each other | dead; contain `CmsConfig {provider: 'contentstack'|'contentful'}`, `clientSecret`, `FeatureFlags` of a different product (grep "cms") |
| `hooks/use-business-units` | `contexts/business-unit.tsx` | KEEP (feeds the BU dropdown) |

### Config facts
* `custom-application-config.mjs` (72 l): `entryPointUriPath '${env:ENTRY_POINT_URI_PATH}'`, `cloudIdentifier '${env:CLOUD_IDENTIFIER}'`,
  `env.production {applicationId '${env:CUSTOM_APPLICATION_ID}', url '${env:APPLICATION_URL}'}`,
  `additionalEnv.CMS_API_URL '${env:CMS_API_URL}'`, CSP with three internal Cloud Run wildcard hosts
  (`*.us-central1.run.app`, `*.europe-west1.run.app`, `*.asia-southeast1.run.app`), `localhost:8080`,
  `'unsafe-eval'` inside `connect-src`, `frame-src: *.ct-poc.net` (internal host, gate FAIL),
  `oAuthScopes` view x6 / manage x3 (incl. `manage_products`, `manage_api_clients`, `view_api_clients`),
  `icon '${path:@tabler/icons/filled/square-letter-c.svg}'`, `mainMenuLink.permissions [PERMISSIONS.View]`.
* `src/constants.ts:4` hard-codes `entryPointUriPath = 'multitenant-contentools-wrapper'` while `.env`/`.env.example`
  use `contentools-wrapper` => the permission keys (`canViewMultitenantContentoolsWrapper`) and the registered
  path disagree. Fixed by deriving the path from `window.app.entryPointUriPath` (pattern used by
  `/Users/behnam/code/commercetools-labs/search-config/app/src/constants.ts`).
* `SRC/.env` is a real developer file (8 keys incl. a real `CUSTOM_APPLICATION_ID`, `APPLICATION_URL`,
  project key). It is git-ignored in the source and MUST NOT be copied. Only `.env.example` (7 keys) is migrated.
* `.nvmrc` = `22` (good). `package.json` `packageManager` says `yarn@1.22.22` but `.yarnrc.yml` has
  `nodeLinker: "node-modules"` (a Yarn 2+ setting) and `yarn.lock` is v1 -> inconsistent; target = Yarn classic 1.22 + `yarn.lock` v1 (owner decision, design D6; like `search-config/app`).
* `.eslintrc.js` requires `./schemas/ctp.json` which does not exist -> `yarn lint` fails today.
  `eslint 8.57` but `@commercetools-frontend/eslint-config-mc-app@27.13.0` has peer `eslint ^9` (flat config).
  `jest 29.7` but `jest-preset-mc-app@27.13.0` has peer `jest 30.x`. => the source toolchain is already broken; K rebuilds it.
* `netlify.toml`, `public/google977a5fb1d7733002.html` (Google site verification), `public/stats.json` are deploy leftovers.
* UI strings are hard-coded English in `admin-layout/index.tsx` ("Pages","Items","Theme","Business unit","Collapse","Expand sidebar", badge text `CMS`) and
  `connect-project.tsx`; `i18n/data/en.json` and `de.json` are `{}`. So i18n en/de is greenfield for this app.
* `admin-layout.module.css` (180 l) has a purple (`rgb(124,118,216)`) sidebar; uses CSS modules (supported by mc-scripts).

## 2. Dependency usage (grep of real imports in `SRC/src`, plus config files)

Imports present in `src` (non-relative): `@apollo/client`, `@commercetools-demo/puck-{page,content,theme}-manager`,
`@commercetools-frontend/{application-shell, application-shell-connectors, application-shell/ssr, application-shell/test-utils, constants, i18n, l10n}`,
`@commercetools/nimbus`, `@tabler/icons-react`, `graphql` (type decl only), `react`, `react-dom/client`, `react-router-dom`, `styled-components`.
Everything else in the 82-entry `dependencies` block is unused by `src` (see design.md table). Two corrections to a naive "unused" reading:
1. **Peer dependencies of the packages we keep.** `application-shell@27.13.0` peers: `react 19.x, redux 4.x||5.x, react-dom 19.x, react-intl 7.x, react-redux 7.x||9.x, @apollo/client 3.x, react-router-dom 5.x, @commercetools/nimbus >=3.2.0, @testing-library/react 16.x`.
   The three puck managers peer on `@chakra-ui/react ^3.36.0, @commercetools/nimbus(-icons) ^3.2.0, react-intl >=6, react-router-dom >=5 <6`.
   `@chakra-ui/react@3.36.1` peers `@emotion/react >=11`. `nimbus@3.5.1` peers `slate ^0.123.0, slate-react ^0.123.0, slate-history ^0.115.0, slate-hyperscript ^0.115.0, @chakra-ui/react ^3.36.1, nimbus-icons/tokens ^3.5.1`.
   The source pins `slate ^0.124.1 / slate-history ^0.113.1 / slate-hyperscript ^0.125.0 / slate-react ^0.125.1`: all outside nimbus' ranges.
2. `application-shell@27.13.0` has a hard dependency `@commercetools/nimbus: 3.5.1` (exact), so the app should use exactly `3.5.1` (+ icons/tokens `3.5.1`) to avoid two Nimbus copies.
   Latest on npm today: mc-scripts / application-shell / sdk / create-mc-app `27.13.0`; nimbus `3.6.0`; chakra `3.37.0`; react-intl `12.1.4` (do NOT jump: shell peers `7.x`).

## 3. Calling the service through Merchant Center `forward-to` (researched)

Docs: `https://docs.commercetools.com/merchant-center-customizations/concepts/integrate-with-your-own-api.md`, `.../development/data-fetching.md`,
`.../tooling-and-configuration/commercetools-frontend-application-shell.md` (sections `createApolloContextForProxyForwardTo`, `executeHttpClientRequest`).
Verified facts:
* Browser -> `POST|GET… {mcApiUrl}/proxy/forward-to` with headers `Accept-version` (`v2`), `X-Forward-To: <full target URL>`, `X-Forward-To-Audience-Policy`
  (`forward-url-full-path` default | `forward-url-origin`), optional `X-Forward-To-Claims: permissions`, `X-Project-Key` (+ session `Authorization`/cookie). Only **https** targets.
* The gateway verifies the user may access the project and calls the target with `Authorization: Bearer <exchange JWT>`: 60 s lifetime, claims `sub` (MC user id), `iss`
  (gateway), `aud` (per audience policy), `type: exchange`, `<iss>/claims/project_key`, optional `<iss>/claims/user_permissions` (values like `canViewContentools`).
* The service verifies with `createSessionMiddleware({audience, issuer: <CLOUD_IDENTIFIER>, audiencePolicy?})` from `@commercetools-backend/express`; `req.session = {userId, projectKey, userPermissions?}`.
  `audience` = the origin of the API (no path) when using `forward-url-origin`.
* `@commercetools-frontend/sdk` `actions.forwardTo` only has `get/del/head/post` (verified in
  `SRC/node_modules/@commercetools-frontend/sdk/dist/commercetools-frontend-sdk.esm.js:98-135`): **no PUT**. The puck API layer uses GET/POST/PUT/DELETE
  (`puck-api/src/api/*.ts`: 5x DELETE, 9x POST, 5x PUT) and a `multipart/form-data` upload (`media-library.api.ts:36-52`). Therefore the SDK-actions route is out; the app must use
  `executeHttpClientRequest(fetcher, {forwardToConfig})` with a custom `fetch` (works with any method and body) — see design.md D2.
* Custom headers to the service must be prefixed `x-forward-header-` (gateway strips the prefix). Not needed by us.
* The browser never talks to the service directly -> **no CORS on the service for the admin app**, and the app's CSP only needs the MC API host, which is allowed by default
  (docs: "The MC API host is allowed by default", inferred from `cloudIdentifier`).
* Local dev: the target must be https => ngrok / cloudflared tunnel (docs "Local development using a secure tunnel"); the service's `audience` must then be the tunnel origin.
* NOT documented / to verify empirically (needs MC login, listed in `manual.md`): (a) the gateway forwards `PUT` and request bodies of `application/json` and `multipart/form-data` unchanged,
  (b) request body size limit for uploads, (c) `Content-Type` is forwarded without the `x-forward-header-` prefix.

How the app learns the service URL: see L's explore.md (Connect does **not** inject `CONNECT_SERVICE_URL` into `merchant-center-custom-application`; it is a service/postDeploy variable).
K consumes a single env value `CONTENTOOLS_SERVICE_URL` via `additionalEnv.serviceUrl` and reads it with `useApplicationContext(ctx => ctx.environment.serviceUrl)`.

## 4. The puck contract K depends on (owned by J, not yet written)
Today's props (`PageManagerProps`, `ContentManagerProps`, `ThemeManagerProps`): `parentUrl, baseURL, projectKey, businessUnitKey, jwtToken, locale?, config?, backButton?, messageOverrides?`
(`defaultContentType?` on ContentManager). The low-level HTTP is `puck-api/src/api/http-client.ts` — plain global `fetch(url, {method, headers, body})`, then `res.status`, `res.text()`, `res.headers.get`, `res.json()`.
K REQUIRES from J (recorded in design.md D2 and questions.md Q-K1): `projectKey`/`jwtToken` removed; a `fetcher: (url: string, init: {method; headers; body}) => Promise<Response>` injection point
(drop-in for `fetch`) on all three managers, defaulting to `fetch`; `baseURL` stays and is the **service base URL including `/service`** (the same string given to `X-Forward-To` minus path).
Puck packages ship only `en` and `es` catalogs (`EnsureIntlProvider.tsx:35-36`) -> no `de` for puck-owned strings (cross-spec gap, Q-K3).
Puck managers peer on `react-router-dom <6` and mount `BrowserRouter` internally; they do not need `@measured/puck` from the host (regular dependency of the packages).

## 5. Sibling reference (`/Users/behnam/code/commercetools-labs/search-config/app`)
* Yarn classic (`yarn.lock` v1, no `package-lock.json`), `@commercetools-frontend/* 27.9.2` exact pins, nimbus `^3.5.1`, chakra `3.36.1`, slate `0.123.0` family, `react-redux ^9`, `redux ^5`.
* `entryPointUriPath` derived at runtime from `window.app` (SSR fallback to env) — adopted.
* `test` script is a `tsc --noEmit` wrapper because Connect's tester appends jest coverage flags; relevant to K's `yarn test` design (K keeps real jest, which accepts those flags).
* `additionalEnv.<camelCase>` read with `useApplicationContext((ctx) => ctx.environment as ...)`; `createApolloContextForProxyForwardTo` with `audiencePolicy: 'forward-url-full-path'` (works for them because a single `/graphql` path; we have many REST paths -> use `forward-url-origin`).
* Its `tools/vendor-runtime-tarball.mjs` is the precedent for consuming an unpublished package by tarball (`file:vendor/<tgz>`).

## 6. Risks
| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | J ships without a `fetcher` hook -> K cannot use forward-to | hard pre-condition in tasks.md group 0; Q-K1 |
| R2 | Gateway does not forward `PUT` or multipart | Chrome check B3/B4 in tasks; fallback documented in design D2 (tunnel PUT->POST via `x-http-method-override` would need E to support it) |
| R3 | puck 1.0.0-rc not on npm when Connect builds `admin-app` | rc publish (M-08); tarball path only for local dev |
| R4 | Duplicate React/Nimbus/Chakra copies via tarballs | `resolutions` + `yarn why` check in tasks |
| R5 | `react-intl` major drift (npm latest 12) vs shell peer 7.x | pin `^7.1.4` |
| R6 | Two `BrowserRouter`s (shell's and puck's) | verified existing behaviour; Chrome check A/B: deep link reload works |
| R7 | Session `projectKey` claim differs from `CTP_PROJECT_KEY` of the single tenant | E must reject (cross-spec note) |
