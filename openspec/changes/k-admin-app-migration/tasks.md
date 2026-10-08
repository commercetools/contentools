## Conventions used below

* `SRC` = `/Users/behnam/code/cms/contentools` (read-only source). `ROOT` = `/Users/behnam/code/commercetools-labs/contentools`. Paths without a prefix are relative to `ROOT`.
* **Merchant Center (MC)** is the commercetools admin web UI. A **Custom Application** is a React app that MC loads inside its own shell; the **Application Shell** (`@commercetools-frontend/application-shell`) is the library that provides login, project context, permissions and the HTTP gateway.
* **forward-to** is an MC API Gateway endpoint (`/proxy/forward-to`) that verifies the logged-in user and then calls *your* backend with a short-lived signed JWT. It is how the app talks to the `service` app. Full explanation: `design.md` D2.
* **BU** = business unit (content is scoped per BU: URLs look like `<serviceUrl>/<businessUnitKey>/puck-pages`).
* **Puck packages** = the `@commercetools-labs/puck-*` npm packages produced by specs I and J from `puck/`.
* Every new `.ts/.tsx/.js/.mjs` file starts with this header (exact):
```
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
* No GitHub Actions: all gates are local scripts (`yarn verify`) and Connect's own build.

---

## 0. Pre-conditions (do not start before these are true)

Context: K consumes work from other specs. If a condition is false, stop and tell the coordinator; do not invent the missing piece.

- [ ] 0.1 Spec A is archived: `ls admin-app` shows a copy of the source tree (or, if A only created the empty skeleton, copy it in task 1.1).
  Done when: `test -d admin-app && echo ok` prints `ok`.
- [ ] 0.2 Spec J is archived and its puck API has: no `projectKey`/`jwtToken` props, and a `fetcher` prop on `PageManager`, `ContentManager`, `ThemeManager`.
  Check: `grep -n "fetcher" puck/packages/puck-page-manager/src/PageManager.tsx puck/packages/puck-content-manager/src/ContentManagerRouter.tsx puck/packages/puck-theme-manager/src/components/theme-editor.tsx` prints at least one match per file, and `grep -rn "projectKey\|jwtToken" puck/packages/puck-*/src | wc -l` prints `0`.
  Done when: both commands give the expected output. If `fetcher` is missing, J must add it (default `fetch`; type `(url: string, init?: RequestInit) => Promise<Response>`); see `questions.md` Q-K1.
- [ ] 0.3 A pre-release of the three managers is either published (`npm view @commercetools-labs/puck-page-manager@next version` prints `1.0.0-rc.N`) **or** you will use the local tarball path (group 7).
- [ ] 0.4 Tooling: `node -v` prints `v22.x`; `yarn -v` prints `1.22.x` (owner decision: Yarn 1 classic for every Connect app, `admin-app` included, with a committed `yarn.lock`; the `puck/` workspace uses Yarn 4 on its own); `corepack` must not force another Yarn in `admin-app` (no `packageManager` field there).

Rollback for the whole spec: `rm -rf admin-app` (nothing else depends on it before spec L).

---

## 1. Create the app tree and delete the tenant code

Context: we start from a copy of the old wrapper and delete everything that only existed for multi-tenancy (an in-browser "wizard" that created an API client, stored its secret and a service token in a project custom object, and refreshed the token). With one Connect-injected API client and MC session auth none of it is needed. The authoritative keep/delete table is `design.md` D1.

- [ ] 1.1 Copy the source, minus generated and secret files.
  ```bash
  mkdir -p admin-app
  rsync -a --exclude node_modules --exclude public --exclude .env --exclude yarn.lock --exclude .yarnrc.yml \
        --exclude netlify.toml --exclude jest-runner-eslint.config.js --exclude jest.eslint.config.js --exclude .eslintrc.js \
        /Users/behnam/code/cms/contentools/ admin-app/
  ls -A admin-app
  ```
  Expected `ls -A`: `.env.example .gitignore .nvmrc .prettierignore .prettierrc README.md custom-application-config.mjs intl-formatter.js jest.d.ts jest.test.config.js package.json src tsconfig.json`.
  Done when: `test ! -e admin-app/.env && test ! -d admin-app/public && echo clean` prints `clean`. (If A already copied the tree, run the same `rm -rf` of those paths instead.)
- [ ] 1.2 Delete onboarding and dead code (exact list):
  ```bash
  cd admin-app/src
  rm components/connect-project.tsx contexts/auth.tsx contexts/connect.tsx
  rm -r hooks/use-create-api-client hooks/use-shared-custom-object-storage hooks/use-custom-objects hooks/use-contentools-api
  rm -r hooks/use-associate-roles hooks/use-project-languages hooks/use-stores
  rm -r types utils
  rm types.ts helpers.ts region.ts i18n/data/core.json
  ```
  Verify what is left: `find . -type f | sort` must print exactly:
  `./components/admin-layout/admin-layout.module.css ./components/admin-layout/index.tsx ./components/entry-point/entry-point.tsx ./components/entry-point/index.ts ./constants.ts ./contexts/business-unit.tsx ./graphql.d.ts ./hooks/use-business-units/fetch-business-units.ctp.graphql ./hooks/use-business-units/index.ts ./hooks/use-business-units/use-business-units.ts ./i18n/data/de.json ./i18n/data/en.json ./index.tsx ./load-messages.ts ./routes.tsx ./test-utils/index.tsx`.
  Done when: the list matches. (The project does not compile yet; that is expected until group 4.)
- [ ] 1.3 Add the SPDX header to every remaining `.ts/.tsx/.mjs/.js` file under `admin-app/` (not `*.json`, `*.css`, `*.graphql`). For JS/TS the header is a block comment on lines 1-5 followed by a blank line. If spec A provides a header tool use it (the root header-fix script from spec A); otherwise edit by hand (about 12 files).
  Done when: `grep -rL "SPDX-License-Identifier: MIT" admin-app/src admin-app/*.mjs admin-app/*.js --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.js'` prints nothing.
- [ ] 1.4 Rename leftovers. In `admin-app/.env.example` rewrite fully (the source file has `CMS_API_URL`, `multitenant`-era values):
  ```
  # Copy to .env for local development. Never commit .env.
  # Region of the project you develop against: gcp-eu | gcp-us | gcp-au | aws-eu | aws-us
  CLOUD_IDENTIFIER=
  # Project opened by `yarn start`. Local development only.
  CTP_INITIAL_PROJECT_KEY=
  # Unique per region, 2-64 chars, lowercase alphanumerics and hyphens. Must equal the registered path.
  ENTRY_POINT_URI_PATH=contentools
  # Set after registering the custom application in the Merchant Center (manual-steps M-03).
  CUSTOM_APPLICATION_ID=
  # Connect provides this at deploy time. For a local `yarn build` any https URL works.
  APPLICATION_URL=https://example.com
  # https URL of the service app, ending in /service (a tunnel URL in local development).
  CONTENTOOLS_SERVICE_URL=
  ```
  Rewrite `admin-app/.gitignore`: `node_modules`, `public`, `dist`, `.env`, `.env.local`, `.local-puck/`.
  Done when: `grep -rniE "cms|multitenant|ct-poc|run\.app" admin-app --exclude-dir=node_modules -l` lists only `admin-app/src/components/admin-layout/index.tsx` and `admin-app/src/constants.ts` and `admin-app/custom-application-config.mjs` (fixed in groups 3, 5 and by spec L).

Pitfalls: do not copy `SRC/.env` (real values); do not `cp -r` the whole directory (it brings 153 build files and `node_modules`).
Verification: the three `grep`/`find` commands above. Rollback: `rm -rf admin-app && git checkout -- admin-app` (if tracked) or redo 1.1.

---

## 2. Rebuild `package.json` and install

Context: the source `package.json` has 82 dependencies of which about 20 are used; its lint and test tooling cannot run (peer mismatches: `jest-preset-mc-app@27.13.0` needs Jest 30, `eslint-config-mc-app@27.13.0` needs ESLint 9). Rule from the Connect skill `merchant-center-cli.md`: keep **all** `@commercetools-frontend/*` packages on the same version. Rationale per package: `design.md` D5.

- [ ] 2.1 Replace `admin-app/package.json` with:
  ```json
  {
    "name": "@commercetools-labs/admin-app",
    "version": "1.0.0",
    "private": true,
    "description": "Merchant Center custom application for Contentools (pages, content items, theme).",
    "license": "MIT",
    "engines": { "node": ">=22" },
    "scripts": {
      "build": "mc-scripts build",
      "start": "mc-scripts start",
      "compile-html": "mc-scripts compile-html",
      "compile-html:local": "MC_APP_ENV=development mc-scripts compile-html --transformer @commercetools-frontend/mc-dev-authentication/transformer-local.js",
      "start:prod:local": "yarn compile-html:local && mc-scripts serve",
      "extract-intl": "formatjs extract --format=./intl-formatter.js --out-file=./src/i18n/data/core.json 'src/**/!(*.spec).(ts|tsx)'",
      "typecheck": "tsc --noEmit",
      "lint": "eslint src scripts",
      "test": "jest --config jest.test.config.js",
      "format": "prettier --write 'src/**/*.{ts,tsx}' 'scripts/*.mjs'",
      "check:deps": "node scripts/check-deps.mjs",
      "check:pins": "node scripts/check-pins.mjs",
      "check:i18n": "node scripts/check-i18n.mjs",
      "verify": "yarn typecheck && yarn lint && yarn test && yarn check:pins && yarn check:deps && yarn check:i18n && yarn build"
    },
    "dependencies": {
      "@apollo/client": "3.12.4",
      "@chakra-ui/react": "3.36.1",
      "@commercetools-frontend/application-config": "27.13.0",
      "@commercetools-frontend/application-shell": "27.13.0",
      "@commercetools-frontend/application-shell-connectors": "27.13.0",
      "@commercetools-frontend/assets": "27.13.0",
      "@commercetools-frontend/constants": "27.13.0",
      "@commercetools-frontend/i18n": "27.13.0",
      "@commercetools-frontend/mc-scripts": "27.13.0",
      "@commercetools-labs/puck-content-manager": "^1.0.0-rc.0",
      "@commercetools-labs/puck-page-manager": "^1.0.0-rc.0",
      "@commercetools-labs/puck-theme-manager": "^1.0.0-rc.0",
      "@commercetools/nimbus": "3.5.1",
      "@commercetools/nimbus-icons": "3.5.1",
      "@commercetools/nimbus-tokens": "3.5.1",
      "@emotion/react": "^11.14.0",
      "graphql": "^16.8.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "react-intl": "^7.1.4",
      "react-redux": "^9.1.2",
      "react-router-dom": "5.3.4",
      "redux": "^5.0.1",
      "slate": "0.123.0",
      "slate-dom": "0.126.0",
      "slate-history": "0.115.0",
      "slate-hyperscript": "0.115.0",
      "slate-react": "0.123.0"
    },
    "devDependencies": {
      "@commercetools-frontend/eslint-config-mc-app": "27.13.0",
      "@commercetools-frontend/jest-preset-mc-app": "27.13.0",
      "@commercetools-frontend/mc-dev-authentication": "27.13.0",
      "@formatjs/cli": "6.2.12",
      "@testing-library/dom": "^10.4.0",
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.1.0",
      "@types/jest": "^30.0.0",
      "@types/react": "^19.0.3",
      "@types/react-dom": "^19.0.2",
      "@types/react-router-dom": "^5.3.3",
      "eslint": "^9.0.0",
      "jest": "^30.0.0",
      "prettier": "2.8.8",
      "typescript": "~5.9.3"
    }
  }
  ```
  Note: while spec J's rc is not published, leave the three `@commercetools-labs/puck-*` lines as above and use group 7 to install.
  Done when: `node -e "JSON.parse(require('fs').readFileSync('admin-app/package.json','utf8'))"` exits 0.
- [ ] 2.2 Remove the Yarn-2 file and the old lock: `rm -f admin-app/.yarnrc.yml admin-app/yarn.lock`. Install (needs the rc on npm; otherwise do group 7 first):
  ```bash
  cd admin-app && yarn install
  ```
  Expected: finishes with `Done in NN.NNs`, creates `yarn.lock` whose first lines are `# THIS IS AN AUTOGENERATED FILE.` and `# yarn lockfile v1`; there must be no `package-lock.json` in `admin-app/`. Yarn 1 only warns about peers: warnings naming `nimbus`, `chakra`, `slate`, `react-intl`, `react-redux` or `redux` mean a pin in 2.1 is outside a peer range, fix the pin.
  Done when: `yarn check --integrity` prints `success Folder in sync with yarn.lock`, and `yarn install --frozen-lockfile` (after deleting `node_modules`) succeeds without changing `yarn.lock`.
- [ ] 2.3 Check single copies (risk R4): run each and expect exactly one version in the output:
  ```bash
  for p in react react-dom react-intl @chakra-ui/react @commercetools/nimbus @commercetools-labs/puck-types; do echo "== $p"; yarn --silent why $p | grep -E "^info Has been hoisted|Hoisted from|=> Found" ; done
  ```
  Simpler equivalent: `find node_modules -path '*/node_modules/@commercetools/nimbus/package.json' | wc -l` must print `1` (repeat for `react`, `@chakra-ui/react`).
  Done when: all counts are `1`. If not, add the offender to `resolutions` with the hoisted version and re-run `yarn install`; record it in `design.md` D5.
- [ ] 2.4 Write `admin-app/eslint.config.js`:
  ```js
  /* SPDX header */
  const mcAppConfig = require('@commercetools-frontend/eslint-config-mc-app');
  module.exports = [...mcAppConfig, { ignores: ['public/**', 'src/i18n/data/**', 'node_modules/**'] }];
  ```
  Edit `admin-app/tsconfig.json` to:
  ```json
  { "extends": "@commercetools-frontend/application-config/tsconfig-mc-app.json",
    "compilerOptions": { "jsx": "react-jsx", "preserveSymlinks": false },
    "include": ["src"] }
  ```
  Done when: `cd admin-app && yarn eslint --print-config src/index.tsx > /dev/null && echo ok` prints `ok`.

Pitfalls: Yarn 1 `resolutions` are only read from the root `package.json`; `react-redux ^9` with `redux ^5` is the pair the shell's peers allow; do not upgrade `react-intl` to the npm "latest" (major 12): the shell requires `7.x`.
Verification: `yarn why @commercetools/nimbus` shows 3.5.1. Rollback: restore `package.json` from `/Users/behnam/code/cms/contentools/package.json`, delete `node_modules yarn.lock`.

---

## 3. Entry point, constants, service context

Context: the entry point previously wrapped the app in three providers. Now it needs only the Application Shell, Nimbus and two small providers: `ServiceProvider` (the service URL and the forward-to fetch function) and `BusinessUnitProvider` (kept).

- [ ] 3.1 Rewrite `admin-app/src/constants.ts`:
  ```ts
  import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

  // window.app is set by the Merchant Center shell at runtime; ENTRY_POINT_URI_PATH covers SSR/tests.
  export const entryPointUriPath: string =
    typeof window === 'undefined' || !(window as { app?: unknown }).app
      ? (process.env['ENTRY_POINT_URI_PATH'] ?? 'contentools')
      : (window as unknown as { app: { entryPointUriPath: string } }).app.entryPointUriPath;

  export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
  ```
  Delete the three old constants (`CONFIGURATION_CONTAINER`, `JWT_TOKEN_KEY`, `CREDENTIALS_KEY`) and the hard-coded `multitenant-contentools-wrapper`.
  Done when: `grep -n "multitenant\|JWT\|CREDENTIALS" admin-app/src/constants.ts` prints nothing.
- [ ] 3.2 Create `admin-app/src/contexts/service.tsx`:
  ```tsx
  import { createContext, useContext, useMemo, type ReactNode } from 'react';
  import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
  import { forwardToFetch, type ServiceFetcher } from '../hooks/use-service-fetcher';
  import ServiceNotConfigured from '../components/service-not-configured';

  type ServiceValue = { serviceUrl: string; fetcher: ServiceFetcher };
  const ServiceContext = createContext<ServiceValue | undefined>(undefined);

  export const normalizeServiceUrl = (raw: unknown): string | null => {
    if (typeof raw !== 'string') return null;
    const url = raw.trim().replace(/\/+$/, '');
    return /^https:\/\/[^\s/]+(\/.*)?$/.test(url) ? url : null;
  };

  export const ServiceProvider = ({ children }: { children: ReactNode }) => {
    const raw = useApplicationContext((ctx) => (ctx.environment as { serviceUrl?: string }).serviceUrl);
    const serviceUrl = normalizeServiceUrl(raw);
    const value = useMemo(() => (serviceUrl ? { serviceUrl, fetcher: forwardToFetch } : undefined), [serviceUrl]);
    if (!value) return <ServiceNotConfigured />;
    return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
  };

  export const useService = (): ServiceValue => {
    const v = useContext(ServiceContext);
    if (!v) throw new Error('useService must be used within a ServiceProvider');
    return v;
  };
  ```
  Done when: file saved; `yarn typecheck` will pass after 4.1.
- [ ] 3.3 Create `admin-app/src/components/service-not-configured/{index.ts,service-not-configured.tsx}`: a Nimbus notice (use `Card.Root` + `Heading` + `Text` as in the deleted `connect-project.tsx`, lines 95-110 of the source) with the message id `Contentools.serviceNotConfigured` ("The service URL is not configured. Set CONTENTOOLS_SERVICE_URL (https, ending in /service) in the deployment configuration and redeploy.") using `FormattedMessage`. Do not render any buttons.
  Done when: component exports default and has no hooks that need the service context.
- [ ] 3.4 Rewrite `admin-app/src/components/entry-point/entry-point.tsx` (keep lines 1-24 of the source: `lazy` import of routes, `setupGlobalErrorListener()`), body:
  ```tsx
  <ApplicationShell enableReactStrictMode environment={window.app} applicationMessages={loadMessages}>
    <NimbusProvider loadFonts={false}>
      <ServiceProvider>
        <BusinessUnitProvider>
          <AsyncApplicationRoutes />
        </BusinessUnitProvider>
      </ServiceProvider>
    </NimbusProvider>
  </ApplicationShell>
  ```
  Remove imports of `AuthProvider`, `ConnectProvider`.
  Done when: `grep -n "Auth\|Connect" admin-app/src/components/entry-point/entry-point.tsx` prints nothing.
- [ ] 3.5 `admin-app/src/contexts/business-unit.tsx`: header; fix the `useMemo` dependency list at source line 56 to `[businessUnits, selectedBusinessUnitKey, loading]` (it omitted `loading`); remove the double blank lines. Keep the rest.
  Done when: `yarn eslint src/contexts` exits 0.

Pitfalls: `window.app` is undefined in Jest unless the test util sets it; the guard in 3.1 handles that. `useApplicationContext` must be called inside the shell (it is, `ServiceProvider` is a child of `ApplicationShell`).
Verification: unit tests in group 9 (9.1, 9.5). Rollback: `git checkout -- admin-app/src` if tracked, or re-copy from `SRC`.

---

## 4. The forward-to fetcher and the routes

Context: puck sends requests with plain `fetch(url, {method, headers, body})`. Inside MC every request to our own backend must instead go to `{MC API}/proxy/forward-to` with `X-Forward-To` set to the real URL. The function below makes that transparent: puck calls `fetcher(url, init)` exactly as it would call `fetch`. Read `design.md` D2 first.

- [ ] 4.1 Create `admin-app/src/hooks/use-service-fetcher/forward-to-fetcher.ts` with the skeleton from `design.md` D2, plus `index.ts` exporting `forwardToFetch` and `ServiceFetcher`.
  Details: `init.headers` may be a `Headers` instance or array in theory; puck passes a plain object, so convert with `Object.fromEntries(new Headers(init.headers).entries())` to be safe, then spread over `options.headers`. Never set `Content-Type` yourself for `FormData` bodies.
  Done when: `yarn typecheck` shows no error in this file (other files may still fail until 4.3).
- [ ] 4.2 Remove the old business-unit-independent leftovers: `grep -rn "useAuth\|useConnect\|CMS_API_URL" admin-app/src` must print nothing except `routes.tsx` (rewritten next).
- [ ] 4.3 Rewrite `admin-app/src/routes.tsx` to the final shape in `design.md` D3 (copy it). Add `key={selectedBusinessUnitKey}` on each manager element. Keep `ApplicationRoutes.displayName = 'ApplicationRoutes'` and `export default`.
  Source reference: `SRC/src/routes.tsx` (81 lines): the `Switch/Route/Redirect` skeleton stays; delete `useAuth`, `useHistory`, `project` and all `projectKey`/`jwtToken` props, and replace `environment.CMS_API_URL` with `serviceUrl` from `useService()`.
  Done when: `yarn typecheck` exits 0 (this needs spec J's types for `fetcher`; if `Property 'fetcher' does not exist` appears, stop and go back to 0.2).
- [ ] 4.4 Error surface: in `forwardToFetch` do not throw on non-2xx (puck's `httpClient` does that and formats `[puck-api] HTTP 403: ...`). In `admin-app/src/components/service-error-boundary.tsx` (NEW) add a React error boundary around the managers in `routes.tsx` that renders a Nimbus error notice with the message id `Contentools.requestFailed` and the caught `error.message`. Map "HTTP 403" to `Contentools.notAllowed`.
  Done when: unit test 9.4 passes.

Pitfalls: (1) a 401 from the service is retried once by the shell with a renewed token, so the service must answer 403 for missing permission (E; `questions.md` Q-K4). (2) `buildApiUrl` returns the MC API URL from `window.app.mcApiUrl`/`cloudIdentifier`: never hard-code it. (3) The managers mount their own `BrowserRouter basename={parentUrl}`; `parentUrl` must start with `/` and be the *full* path including the project key (`match.url` already is).
Verification: group 9. Rollback: `git checkout -- admin-app/src/routes.tsx`.

---

## 5. Layout, icons, i18n (en and de)

Context: all visible strings in the app are hard-coded English today and `en.json`/`de.json` are `{}`. We define messages once with `react-intl`, extract them, and translate to German.

- [ ] 5.1 Create `admin-app/src/i18n/messages.ts`:
  ```ts
  import { defineMessages } from 'react-intl';
  export default defineMessages({
    pages: { id: 'Contentools.nav.pages', defaultMessage: 'Pages' },
    items: { id: 'Contentools.nav.items', defaultMessage: 'Items' },
    theme: { id: 'Contentools.nav.theme', defaultMessage: 'Theme' },
    businessUnit: { id: 'Contentools.businessUnit', defaultMessage: 'Business unit' },
    collapse: { id: 'Contentools.sidebar.collapse', defaultMessage: 'Collapse' },
    expandTitle: { id: 'Contentools.sidebar.expand', defaultMessage: 'Expand sidebar' },
    collapseTitle: { id: 'Contentools.sidebar.collapseTitle', defaultMessage: 'Collapse sidebar' },
    serviceNotConfigured: { id: 'Contentools.serviceNotConfigured', defaultMessage: 'The service URL is not configured. Set CONTENTOOLS_SERVICE_URL (https, ending in /service) in the deployment configuration and redeploy.' },
    requestFailed: { id: 'Contentools.requestFailed', defaultMessage: 'The request to the service failed: {message}' },
    notAllowed: { id: 'Contentools.notAllowed', defaultMessage: 'You are not allowed to do this. Ask an administrator for the manage permission.' },
  });
  ```
- [ ] 5.2 Rewrite `admin-app/src/components/admin-layout/index.tsx` from the source (135 lines): header; replace tabler imports by
  `import { Description, ListAlt, Palette, ChevronLeft, ChevronRight } from '@commercetools/nimbus-icons';` (before coding, confirm the names exist in 3.5.1: `node -e "const i=require('@commercetools/nimbus-icons');console.log(['Description','ListAlt','Palette','ChevronLeft','ChevronRight'].map(n=>n+':'+typeof i[n]).join(' '))"` must print five `object` or `function` values, not `undefined`; if one is missing pick the closest `Material` icon and note it in `design.md`); labels via `useIntl().formatMessage(messages.pages)` etc.; badge text `CMS` -> `CT`; the aria-label "Business unit" via `messages.businessUnit`; icons sized with the Nimbus `Icon` wrapper or `size` prop as the icon API requires.
  Done when: `grep -rn "tabler\|CMS" admin-app/src` prints nothing and `yarn typecheck` passes.
- [ ] 5.3 Extract: `cd admin-app && yarn extract-intl`. Expected: `src/i18n/data/core.json` has 10 keys sorted case-insensitively (the formatter in `intl-formatter.js` sorts). `cp src/i18n/data/core.json src/i18n/data/en.json`.
- [ ] 5.4 Write `src/i18n/data/de.json` with exactly these values (same keys):
  `Contentools.nav.pages` "Seiten"; `Contentools.nav.items` "Inhalte"; `Contentools.nav.theme` "Design"; `Contentools.businessUnit` "Geschäftseinheit"; `Contentools.sidebar.collapse` "Einklappen"; `Contentools.sidebar.expand` "Seitenleiste ausklappen"; `Contentools.sidebar.collapseTitle` "Seitenleiste einklappen";
  `Contentools.serviceNotConfigured` "Die Service-URL ist nicht konfiguriert. Setzen Sie CONTENTOOLS_SERVICE_URL (https, endet auf /service) in der Deployment-Konfiguration und führen Sie ein Redeploy durch.";
  `Contentools.requestFailed` "Die Anfrage an den Service ist fehlgeschlagen: {message}"; `Contentools.notAllowed` "Dazu fehlt Ihnen die Berechtigung. Bitten Sie eine Administratorin oder einen Administrator um die Manage-Berechtigung.".
  Done when: both files are valid JSON with 10 keys: `node -e "for (const l of ['en','de']) console.log(l, Object.keys(require('./admin-app/src/i18n/data/'+l+'.json')).length)"` prints `en 10` and `de 10`.
- [ ] 5.5 Keep `load-messages.ts` as is (it maps `de` and defaults to `en`). Add the header only.

Pitfalls: ICU placeholders `{message}` must stay identical in both languages; `formatjs extract` ignores `*.spec.*` files by design; the German list intentionally uses "Inhalte" for Items (matches the puck content terminology; change only together with the puck German catalog, Q-K3).
Verification: unit test 9.7 (German labels). Rollback: `git checkout -- admin-app/src/i18n`.

---

## 6. Guard scripts (dependencies, pins, catalogs)

Context: these three small scripts make "no unused dependency", "lockstep versions" and "catalog completeness" objectively checkable.

- [ ] 6.1 `admin-app/scripts/check-pins.mjs` (no deps): read `package.json`; collect every dependency whose name starts with `@commercetools-frontend/`; if the set of distinct versions has size other than 1, print the offenders and `process.exit(1)`; also fail if `@commercetools/nimbus`, `nimbus-icons`, `nimbus-tokens` differ from each other, or if any `dependencies`/`devDependencies` spec matches `/^(file|link|workspace|portal):|\.\.\//`; also fail if `resolutions` contains any `file:`/`link:`/`workspace:`/`portal:` leftover, if `yarn.lock` is missing, or if a `package-lock.json` exists in `admin-app/` (owner decision: Yarn only).
  Done when: `yarn check:pins` prints `pins ok` and exits 0; changing one `@commercetools-frontend` pin to `27.12.0` makes it exit 1 (try, then revert).
- [ ] 6.2 `admin-app/scripts/deps-allowlist.json`: an object `{ "<package>": "<reason>" }` containing every dependency not imported from `src`. Initial content: `mc-scripts` (build), `application-config` (types + tsconfig), `assets` (menu icon path in config), `nimbus-tokens` (nimbus peer), `@chakra-ui/react` (peer of puck/nimbus), `@emotion/react` (chakra peer), `puck-*` three managers (imported), `react-redux`/`redux` (shell peers), `slate*` x5 (nimbus peers), `@apollo/client` (shell peer), plus every devDependency.
  `admin-app/scripts/check-deps.mjs`: collect imports from `src/**/*.{ts,tsx}` with the regex `/from\s+['"]([^'"./][^'"]*)['"]/g` plus `import('...')`; normalize to package name (`@scope/name` or `name`, strip subpaths); then fail if a dependency is neither imported nor in the allowlist, or if an import is not declared in `package.json`.
  Done when: `yarn check:deps` prints `deps ok`; temporarily adding `"moment": "^2"` to dependencies makes it fail naming `moment`.
- [ ] 6.3 `admin-app/scripts/check-i18n.mjs`: read `core.json`, `en.json`, `de.json`; fail if the key sets differ or any value is empty; fail if `de.json` value equals the English value for keys other than allowlisted product names.
  Done when: `yarn check:i18n` prints `i18n ok`.

Pitfalls: the import regex must not count `import type` of `@commercetools-frontend/application-shell/ssr` as a new package (strip subpaths). Verification: the three commands. Rollback: delete `scripts/`.

---

## 7. Local development against unpublished puck packages (tarball path)

Context: Connect builds `admin-app` from inside `admin-app/` (it detects the lockfile, `yarn.lock`, and installs with Yarn; verified in H's design), against the npm registry; workspace packages cannot be resolved there, so the committed `package.json` always uses registry versions. Until the pre-release is on npm (manual-steps M-08) or when you are changing puck at the same time, use this script. Design and rejected alternatives: `design.md` D9.

- [ ] 7.1 Create `tools/admin-app-use-local-puck.mjs` (Node 22, no dependencies, with SPDX header):
  1. Parse `--restore`. If set: if `admin-app/.local-puck/package.json.orig` exists copy it over `admin-app/package.json`; `rm -rf admin-app/.local-puck`; run `yarn --cwd admin-app install --frozen-lockfile`; print `restored`; exit.
  2. `execFileSync('yarn', ['--cwd','puck','build'])` (puck is the only Yarn 4 project).
  3. `mkdir -p admin-app/.local-puck`; run `yarn --cwd puck workspaces foreach --all --no-private pack --out <ABS>/admin-app/.local-puck/%s.tgz` (`%s` expands to `commercetools-labs-puck-api`, etc.).
  4. Copy `admin-app/package.json` to `.local-puck/package.json.orig`; read all tarball names; for each tarball build `resolutions["@commercetools-labs/puck-<name>"] = "file:./.local-puck/<file>"` (Yarn 1 applies `resolutions` to direct and transitive dependencies alike); write the modified `package.json`.
  5. `yarn --cwd admin-app cache clean @commercetools-labs/puck-api` (and each package; Yarn 1 caches `file:` tarballs by name, so a rebuilt tarball with the same version is otherwise ignored), then `yarn --cwd admin-app install --force --frozen-lockfile=false --no-lockfile` (no lockfile is read or written, so the committed `yarn.lock` stays untouched).
  6. Print the installed versions and the reminder `run with --restore before committing`.
  Done when: `node tools/admin-app-use-local-puck.mjs && ls admin-app/.local-puck | wc -l` prints the number of puck packages (9 or 10), and `yarn --cwd admin-app check:pins` **fails** with a message that `resolutions` contains `file:` leftovers (intended: it proves the committed-file guard works; it passes again after `--restore`).
- [ ] 7.2 `--restore` test: `node tools/admin-app-use-local-puck.mjs --restore && git diff --stat -- admin-app/package.json admin-app/yarn.lock` prints nothing (run `git add` first if the files are new: compare with `diff` against the saved `.orig` instead).
- [ ] 7.3 Add root `package.json` script (spec A hub): `"admin-app:local-puck": "node tools/admin-app-use-local-puck.mjs"`; document both commands in `admin-app/README.md` (task 9.9).

Pitfalls: Yarn 4 in `puck/` and Yarn 1 in `admin-app/` are separate; never run the script from inside `admin-app/`. `yarn pack` only includes `dist` (`files` field), so build first. If `yarn install` reports `Integrity check failed`, run `yarn cache clean` and retry. After a puck change you must repeat the script (about 40 s). `.local-puck/` is git-ignored: never commit it. Verification: `yarn --cwd admin-app why @commercetools-labs/puck-api` shows a `file:` source while the script is active; after `--restore` it shows a registry version.
Rollback: `node tools/admin-app-use-local-puck.mjs --restore`.

---

## 8. Local run with a tunnel (service on your machine)

Context: forward-to only calls `https` URLs, so a service on `http://localhost:8080` cannot be reached from MC. For local end-to-end runs expose the service with a tunnel (docs: "Local development using a secure tunnel").

- [ ] 8.1 Start the service locally (spec D/H commands, e.g. `yarn --cwd service start:dev`, port 8080) and a tunnel, e.g. `ngrok http 8080` or `cloudflared tunnel --url http://localhost:8080`. Copy the `https://<id>.ngrok.io` origin.
- [ ] 8.2 Configure the service for forwarded tokens: its session audience must be exactly that origin and the issuer the MC cloud identifier (spec E env names; typical: `CLOUD_IDENTIFIER=gcp-eu`, audience from the service-URL variable). Restart.
- [ ] 8.3 `admin-app/.env` (copy of `.env.example`): `CLOUD_IDENTIFIER=<region>`, `CTP_INITIAL_PROJECT_KEY=<sandbox project>`, `CONTENTOOLS_SERVICE_URL=https://<id>.ngrok.io/service`, `CUSTOM_APPLICATION_ID=<id from M-03>`.
- [ ] 8.4 `cd admin-app && yarn start` (dev server `http://localhost:3001`; first run opens a Merchant Center login prompt in the browser: the owner logs in when asked, manual step M-04).
  Done when: the browser shows the page list (empty list is fine) and the network panel shows requests to `https://mc-api.<region>.commercetools.com/proxy/forward-to`.
Pitfalls: ngrok URLs change on restart (update both the service audience and `.env`); `mc-scripts start` reads `.env` at start only.

---

## 9. Tests and verification

Context: the source app had zero tests. We add focused jest tests (MC test utils) and a Chrome DevTools playbook. Part A can be executed fully by an agent; part B needs a human-logged-in Merchant Center session (manual-steps M-04) and is "best effort, owner-assisted".

- [ ] 9.1 `admin-app/src/contexts/service.spec.tsx`: `normalizeServiceUrl` table test (`'https://a.b/service/'` -> `'https://a.b/service'`; `'http://localhost:8080/service'` -> `null`; `''` -> `null`; `undefined` -> `null`) and render test with `renderApplication` showing the not-configured notice for an empty `environment.serviceUrl`.
- [ ] 9.2 `admin-app/src/hooks/use-service-fetcher/forward-to-fetcher.spec.ts`: mock `global.fetch` with `jest.fn().mockResolvedValue(new Response('{}', {status:200, headers:{'content-type':'application/json'}}))`; call `forwardToFetch('https://svc.example/service/default/puck-pages', {method:'PUT', headers:{'Content-Type':'application/json'}, body:'{"a":1}'})`; assert the fetch URL ends with `/proxy/forward-to`, `method` is `PUT`, body is `'{"a":1}'`, headers include `X-Forward-To: https://svc.example/service/default/puck-pages`, `X-Forward-To-Audience-Policy: forward-url-origin`, `X-Forward-To-Claims: permissions`, `Accept-version: v2`. (If `executeHttpClientRequest` needs `window.app`, set `window.app = {...}` in `beforeEach` as `test-utils` does.)
- [ ] 9.3 Same file: a `FormData` body is passed by reference (`expect(init.body).toBe(formData)`) and no `Content-Type` header is set.
- [ ] 9.4 Same file: first response status 401, second 200 -> `fetch` called twice (documents the shell's one retry); a 403 response is returned without retry.
- [ ] 9.5 `admin-app/src/routes.spec.tsx`: `jest.mock` the three puck packages to stubs `({ ...props }) => <pre data-testid="page-manager">{JSON.stringify(props)}</pre>` (functions excluded by `JSON.stringify`, assert `typeof fetcher` via a separate prop spy). Assert: route `/pages` shows `page-manager` with `baseURL` equal to the env `serviceUrl`, `businessUnitKey: "default"`, no `projectKey`, no `jwtToken`; `/items` and `/theme` likewise; the base path redirects to `/pages`.
- [ ] 9.6 `admin-app/src/contexts/business-unit.spec.tsx`: mock `useBusinessUnits` -> one unit: selector absent; two units: `Select` present; choosing `acme-b2b` re-renders the stub manager with `businessUnitKey: "acme-b2b"`.
- [ ] 9.7 `admin-app/src/components/admin-layout/admin-layout.spec.tsx`: render with `locale: 'de'` and assert text "Seiten", "Inhalte", "Design".
- [ ] 9.8 Run: `cd admin-app && yarn test`. Expected: `Tests: NN passed, NN total`, 0 failed. Then `yarn verify`. Expected: exits 0, ending with the `mc-scripts build` output and a populated `public/` (do not commit it).
  Done when: `yarn verify` exits 0.
- [ ] 9.9 Write `admin-app/README.md` (about 40 lines): purpose, "unsupported" banner sentence (spec P owns the final wording), prerequisites, `.env` keys table (the six keys from 1.4), commands (`yarn start`, `yarn verify`), local-puck instructions (group 7), tunnel instructions (group 8), and a "Troubleshooting" table: `Service not configured` -> set `CONTENTOOLS_SERVICE_URL`; 401 loops -> service answers 401 instead of 403; blank page in dev -> not logged in to MC.

### Chrome DevTools verification (run these yourself; connector tools `mcp__chrome-devtools__*`)

**A. Automatable without Merchant Center login** (served by `mc-scripts serve`/jest; or via the puck playground for the same managers):
- [ ] A1 Build artifacts: `cd admin-app && yarn build && ls public | head` shows `index.html`, `app.*.js`; `grep -rl "x-project-key\|jwtToken\|authenticate-project" public/*.js | wc -l` prints `0`.
- [ ] A2 Bundle hygiene: `grep -rlE "ct-poc|run\.app|multitenant" public | wc -l` prints `0`.
- [ ] A3 Same managers against the service without MC: start the playground (`yarn --cwd puck/playground dev`, spec J) and the service locally; `new_page http://localhost:5173`; `take_snapshot` shows the page list; `list_network_requests` shows requests to the service with the J-defined auth header. This proves the packages work with a plain `fetcher`; it does not prove forward-to.
- [ ] A4 Unit-level proof of forward-to headers: `yarn test forward-to-fetcher` passes (9.2-9.4).

**B. Needs a logged-in MC session** (owner-assisted; open Merchant Center in Chrome, ask the owner to log in when the login prompt appears and wait for their confirmation (M-04); the app must be registered, M-03):
- [ ] B1 `navigate_page https://mc.<region>.commercetools.com/<project>/contentools` (after `yarn start`: `http://localhost:3001` redirects there); `wait_for` text "Pages"; `take_snapshot`; `take_screenshot` to `plans/evidence/k/b1-pages.png`. Expected: sidebar with Pages/Items/Theme, no wizard.
- [ ] B2 `list_network_requests`: every service call is `POST|GET|PUT|DELETE https://mc-api.<region>.commercetools.com/proxy/forward-to`, request headers contain `X-Forward-To`, `X-Forward-To-Audience-Policy: forward-url-origin`, `X-Forward-To-Claims: permissions`; no request to the service host; no `x-project-key` header towards the service; `list_console_messages` has no errors and no CSP violation lines.
- [ ] B3 Create a page, edit, publish (exercises POST, PUT); open Items, create an item; open Theme, change a colour, save (PUT). Expected: each step returns 2xx in the network list. If a `PUT` returns 4xx/5xx from the gateway itself (not from the service), record it in `manual.md` M-K2 and open risk R2.
- [ ] B4 Upload an image in the media library (multipart POST): expected 2xx and the image URL returned; if rejected for size/type by the gateway, record the limit.
- [ ] B5 Business units: if the project has BUs, pick one; the next requests carry `X-Forward-To: <serviceUrl>/<bu>/...`.
- [ ] B6 German: switch the MC profile language to Deutsch; reload; nav labels are German.
- [ ] B7 A user with view-only permission (second team) creating a page gets the translated "not allowed" notice; the service log shows 403.
- [ ] B8 Deep link + reload: open `.../contentools/pages/<pageKey>`, press reload, the editor reopens (checks the nested `BrowserRouter`, risk R6).

---

## Definition of Done (mapped to `specs/**` scenarios)

| Scenario | Evidence |
| --- | --- |
| structure: Onboarding code is gone | the `grep` in the scenario prints nothing (task 1.2, 3.x) |
| structure: App opens straight into Pages | test 9.5 + B1 |
| structure: No cms or internal strings | scenario `grep` empty (1.4, 5.2; `custom-application-config.mjs` by L) |
| structure: Every source file has the header | task 1.3 command + spec A header check |
| structure: Permission keys follow the registered path | test in 9.1 file: set `process.env.ENTRY_POINT_URI_PATH='contentools'`, import `constants`, expect `PERMISSIONS.View === 'canViewContentools'` |
| structure: German navigation / Catalog completeness | 9.7, `yarn check:i18n` |
| structure: Selector hidden / Selection is propagated | 9.6, B5 |
| service-access: Routes / unknown props | 9.5, `yarn typecheck` |
| service-access: Headers on the wire / write methods | 9.2, 9.3, B2, B3, B4 |
| service-access: Missing URL | 9.1 |
| service-access: Permission gating | B7 (+ service tests in E) |
| service-access: Service down | test 9.4/4.4 error boundary + B (stop the service, reload) |
| dependencies: Lockstep versions / No unused dependency | `yarn check:pins`, `yarn check:deps` |
| dependencies: Single copy | task 2.3 |
| dependencies: No local specifiers committed | scenario `grep` empty; `check:pins` |
| dependencies: Use then restore | 7.1, 7.2 |
| dependencies: Verify | `yarn verify` exits 0 (9.8) |

Final checklist: [ ] all boxes above ticked; [ ] `questions.md` and `manual.md` read by the coordinator; [ ] `plans/01-dependency-plan.md` status board updated for K.
