## ADDED Requirements

### Requirement: Connect application definition
The root `connect.yaml` SHALL contain a `deployAs` entry named `admin-app` (equal to the folder name) with `applicationType: merchant-center-custom-application`. The entry SHALL NOT declare `endpoint`, `securedConfiguration`, `scripts`, or a key named `APPLICATION_URL`. Its `standardConfiguration` SHALL declare `CUSTOM_APPLICATION_ID` (required), `ENTRY_POINT_URI_PATH` (required, default `contentools`) and `CONTENTOOLS_SERVICE_URL` (not required).

#### Scenario: Validation passes
- **WHEN** `commercetools connect validate` is run in the repository root
- **THEN** it reports no error for the `admin-app` application

#### Scenario: Forbidden fields absent
- **WHEN** the `admin-app` block of `connect.yaml` is inspected by `node tools/check-admin-app-connect.mjs` (defined in tasks.md group 2)
- **THEN** it exits 0 only if none of `endpoint`, `securedConfiguration`, `scripts`, `APPLICATION_URL` appear in that block

### Requirement: Region identifier is shared configuration
`CLOUD_IDENTIFIER` SHALL be declared exactly once, under `inheritAs.configuration.standardConfiguration` (required, no default), so that `admin-app` (MC API host) and `service` (forward-to token issuer) always use the same value.

#### Scenario: One declaration
- **WHEN** `grep -c "key: CLOUD_IDENTIFIER" connect.yaml` is run
- **THEN** it prints `1`

### Requirement: Config file contains placeholders only
`admin-app/custom-application-config.mjs` SHALL use `${env:...}` placeholders for `entryPointUriPath`, `cloudIdentifier`, `env.production.applicationId`, `env.production.url` and `env.development.initialProjectKey`, SHALL read the service URL into `additionalEnv.serviceUrl` from `process.env.CONTENTOOLS_SERVICE_URL` with an empty-string fallback, and SHALL NOT contain any literal host name, project key, application id or the word "cms".

#### Scenario: No literals
- **WHEN** `grep -nE "https?://|\.app\b|run\.app|ct-poc|localhost|cms" admin-app/custom-application-config.mjs` is run
- **THEN** it prints nothing

#### Scenario: Build with only Connect-provided variables
- **WHEN** `node tools/admin-app-simulate-connect-build.mjs` builds the app with only `ENTRY_POINT_URI_PATH`, `CLOUD_IDENTIFIER`, `CUSTOM_APPLICATION_ID`, `APPLICATION_URL` set
- **THEN** the build succeeds and `public/index.html` contains `"entryPointUriPath":"contentools"` and an empty or absent `serviceUrl`

### Requirement: Service URL is an explicit configuration value
The app SHALL obtain the service URL only from `CONTENTOOLS_SERVICE_URL` (a value ending in `/service`), set per deployment. The documentation SHALL state that Connect does not inject `CONNECT_SERVICE_URL` into Merchant Center applications and describe the two-pass deployment that fills the value.

#### Scenario: Value reaches the browser
- **WHEN** the app is built with `CONTENTOOLS_SERVICE_URL=https://service-abc.europe-west1.gcp.commercetools.app/service`
- **THEN** `window.app.serviceUrl` in the generated `index.html` equals that string

#### Scenario: Empty value is tolerated
- **WHEN** the app is built or started without `CONTENTOOLS_SERVICE_URL`
- **THEN** the build succeeds and the running app shows the "service not configured" state (K) instead of failing

### Requirement: No secrets in the app
The app build and bundle SHALL NOT read or contain any `CTP_*` variable or other secret, even though Connect inherits shared configuration into every application.

#### Scenario: Secret canary
- **WHEN** the simulated build runs with `CTP_CLIENT_SECRET=canary-secret-value` in the environment and `public/` is searched for that value
- **THEN** no file contains it

### Requirement: Minimal OAuth scopes
`oAuthScopes` SHALL list only scopes used by the browser session of the app: `view: ['view_business_units']` and `manage: ['manage_key_value_documents']` (the latter backing the manage permission that the service reads from the forwarded claim). It SHALL NOT list any `*_api_clients`, `manage_products`, `view_products`, `view_stores`, `view_project_settings`.

#### Scenario: Scope list
- **WHEN** the config is loaded and `oAuthScopes` printed
- **THEN** exactly the two scopes above are listed

### Requirement: Content Security Policy without hard-coded hosts
The config SHALL NOT define `headers.csp` unless a Content Security Policy violation observed in the browser requires it; any directive added SHALL be recorded in `design.md` with the console message that justified it, and SHALL NOT contain internal hosts, `*.run.app`, `localhost`, or `'unsafe-eval'` for connect/script sources.

#### Scenario: Default policy
- **WHEN** the app is built with no `headers.csp`
- **THEN** the generated `<meta http-equiv="Content-Security-Policy">` in `public/index.html` contains no host other than commercetools-provided defaults and the app's own URL

### Requirement: Entry point and menu
`entryPointUriPath` SHALL come from `ENTRY_POINT_URI_PATH`; the main menu link SHALL be labelled `Contentools` with permission `PERMISSIONS.View`; the icon SHALL be `${path:@commercetools-frontend/assets/application-icons/files.svg}`.

#### Scenario: Menu link
- **WHEN** the app is installed and a user has the view permission
- **THEN** the Merchant Center shows a main-menu entry "Contentools" linking to `/<project>/<entryPointUriPath>`

### Requirement: Self-contained build
`admin-app/` SHALL build with `yarn install --frozen-lockfile && yarn build` on Node 22 (Yarn 1 classic, committed `yarn.lock`, no `package-lock.json`) using only registry packages, and `yarn test` SHALL accept the extra jest flags that `commercetools connect application test` appends.

#### Scenario: Lockfile in sync
- **WHEN** `yarn install --frozen-lockfile` is run in a clean clone of `admin-app/`
- **THEN** it succeeds without modifying `yarn.lock`, and `admin-app/package-lock.json` does not exist
