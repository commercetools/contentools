## ADDED Requirements

### Requirement: Single-tenant app without onboarding
The `admin-app` SHALL NOT contain any code that creates API clients, stores credentials or tokens, refreshes a service JWT, or renders a project-connection wizard. The entry point SHALL render the application routes directly under the Application Shell.

#### Scenario: Onboarding code is gone
- **WHEN** `grep -rniE "authenticate-project|refresh-jwt|use-create-api-client|connect-project|clientSecret|jwtToken|x-project-key|createApiClient|CREDENTIALS_KEY|JWT_TOKEN_KEY" admin-app/src admin-app/custom-application-config.mjs` is run
- **THEN** it prints nothing and exits with status 1

#### Scenario: App opens straight into Pages
- **WHEN** a user with the view permission opens `/<projectKey>/<entryPointUriPath>`
- **THEN** the app redirects to `/<projectKey>/<entryPointUriPath>/pages` and shows the page list without any wizard or loading gate for credentials

### Requirement: Naming and legal hygiene
All files under `admin-app/` SHALL be free of the word "cms" (case-insensitive), of internal hostnames and customer names, and every `.ts`, `.tsx`, `.js`, `.mjs` file SHALL start with the SPDX header defined in the brief. The env key formerly named `CMS_API_URL` SHALL be named `CONTENTOOLS_SERVICE_URL`.

#### Scenario: No cms or internal strings
- **WHEN** `grep -rniE "cms|ct-poc|run\.app|commercetools-demo|multitenant" admin-app --exclude-dir=node_modules --exclude-dir=public --exclude=yarn.lock` is run
- **THEN** it prints nothing

#### Scenario: Every source file has the header
- **WHEN** the repository SPDX header check from spec A runs over `admin-app/`
- **THEN** it exits 0 and lists no source file without `SPDX-License-Identifier: MIT`

### Requirement: Entry point path is the single source of truth
The app SHALL derive `entryPointUriPath` at runtime from `window.app.entryPointUriPath` (falling back to `process.env.ENTRY_POINT_URI_PATH` during SSR/tests) so that permission keys, routes and the registered Custom Application cannot disagree.

#### Scenario: Permission keys follow the registered path
- **WHEN** the app is built with `ENTRY_POINT_URI_PATH=contentools`
- **THEN** `PERMISSIONS.View` equals `canViewContentools` and `PERMISSIONS.Manage` equals `canManageContentools`

### Requirement: Application messages in English and German
All user-visible strings that belong to the app (navigation labels, business-unit selector, error and empty states) SHALL be defined with `react-intl` `defineMessages`, extracted to `src/i18n/data/core.json`, and shipped as `en.json` and `de.json`. Locale `de` SHALL render German strings; any other locale SHALL fall back to English.

#### Scenario: German navigation
- **WHEN** the Merchant Center user locale is `de`
- **THEN** the sidebar labels are the German strings from `de.json` and no English default is visible for keys that exist in `core.json`

#### Scenario: Catalog completeness
- **WHEN** `yarn --cwd admin-app extract-intl && yarn --cwd admin-app check:i18n` runs
- **THEN** every key in `core.json` exists in `en.json` and `de.json` and the command exits 0

### Requirement: Layout keeps the business-unit selector
The `AdminLayout` SHALL show a sidebar with the links Pages, Items, Theme and, when more than one business unit exists, a business-unit selector whose selected key is passed to the three managers as `businessUnitKey` (default `default`).

#### Scenario: Selector hidden for a single unit
- **WHEN** the business-units query returns no unit besides the implicit `default`
- **THEN** the selector is not rendered and `businessUnitKey` is `default`

#### Scenario: Selection is propagated
- **WHEN** the user selects business unit `acme-b2b`
- **THEN** the next request made by the page list goes to `<serviceUrl>/acme-b2b/puck-pages…`
