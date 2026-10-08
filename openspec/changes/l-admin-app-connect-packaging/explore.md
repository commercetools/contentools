# L — explore notes (admin-app Connect packaging)

Working note. Facts verified 2026-10-08 against: the Connect skill (`commercetools-connect` 0.47.0, `references/merchant-center-customizations.md`,
`merchant-center-cli.md`, `lifecycle-scripts.md`, `security.md`), the commercetools docs (URLs inline), the local `commercetools` CLI 0.0.17 `--help`,
the sibling repo `/Users/behnam/code/commercetools-labs/search-config` (`connect.yaml`, `app/custom-application-config.mjs`, `docs/service-runbook.md`, `INSTALL.md`, `tools/connect-deploy.mjs`)
and the source `/Users/behnam/code/cms/contentools` (`custom-application-config.mjs`, `.env.example`, committed `public/index.html`).

## 1. The source config and what is wrong with it for a public repo
`/Users/behnam/code/cms/contentools/custom-application-config.mjs` (72 lines):
| Line(s) | Content | Problem |
| --- | --- | --- |
| 6-9 | `entryPointUriPath '${env:ENTRY_POINT_URI_PATH}'`, `cloudIdentifier '${env:CLOUD_IDENTIFIER}'` | fine (placeholders) |
| 10-16 | `env.production {applicationId '${env:CUSTOM_APPLICATION_ID}', url '${env:APPLICATION_URL}'}`, `env.development.initialProjectKey '${env:INITIAL_PROJECT_KEY}'` | fine; rename dev key to `CTP_INITIAL_PROJECT_KEY` (sibling) |
| 17-19 | `additionalEnv.CMS_API_URL '${env:CMS_API_URL}'` | "cms" name; and a `${env:}` placeholder for a key Connect may not set |
| 20-44 | `headers.csp`: `localhost:8080`, `*.us-central1.run.app`, `*.europe-west1.run.app`, `*.asia-southeast1.run.app`, `'unsafe-eval'` in `connect-src` and `script-src`, `blob:`, `cdn.jsdelivr.net`, `rsms.me`, `frame-src *.ct-poc.net` | internal hosts (publish gate FAIL), obsolete: the browser no longer talks to Cloud Run |
| 45-59 | `oAuthScopes` view x6, manage x3 | `manage_products`, `manage_api_clients`, `view_api_clients` were for onboarding and product search; now unused by the UI |
| 60 | `icon '${path:@tabler/icons/filled/square-letter-c.svg}'` | drops a dependency; use `@commercetools-frontend/assets/application-icons/files.svg` |
| 61-65 | `mainMenuLink` label `Contentools`, `permissions [PERMISSIONS.View]` | keep |
`.env.example` (7 keys): `CUSTOM_APPLICATION_ID=1234`, `APPLICATION_URL=https://todo.com`, `INITIAL_PROJECT_KEY`, `CMS_API_URL=http://localhost:8080/service`, `ENTRY_POINT_URI_PATH=contentools-wrapper`, `CLOUD_IDENTIFIER`.
Source `connect.yaml` (53 lines) has **no** MC app block at all (service only), so the packaging is new work.

### Evidence from the committed build `public/index.html` (source, never copy)
It shows what the Application Shell actually generates:
* a `<meta http-equiv="Content-Security-Policy">` assembled from **defaults + our `headers.csp`**; the defaults already contain `img-src * data:`, `style-src ... fonts.googleapis.com`, `font-src ... fonts.gstatic.com`, the MC API origin in `connect-src` (inferred from `cloudIdentifier`) and the app's own host in `script-src`/`style-src`. `frame-src` default is `'self'`.
* `window.app = {"CMS_API_URL": "...", "cdnUrl", "env", "frontendHost", "location": "gcp-us", "mcApiUrl", "applicationId", "applicationIdentifier", "applicationName", "entryPointUriPath", ...}`:
  **`additionalEnv` values are written into the public HTML** -> never put secrets there (the service URL is public information).
Conclusion: a custom CSP is only needed for origins beyond the defaults; with forward-to the browser only talks to the MC API (allowed by default), so the starting point is **no `headers.csp` block at all** and every directive added must be justified by a console CSP violation (task 4.x).

## 2. How the app learns the service URL (the question in the brief)
* Docs `https://docs.commercetools.com/merchant-center-customizations/deployment/commercetools-connect.md`: the only automatically provided variable for an MC custom application is **`APPLICATION_URL`**; the page says nothing about `CONNECT_SERVICE_URL`, `additionalEnv` or CSP.
* Skill `lifecycle-scripts.md:124` (verified: docs "automation scripts"): `CONNECT_SERVICE_URL` is injected for **`service`** applications (the public URL of that service). Sibling `docs/service-runbook.md:136` states it reaches the service, and `APPLICATION_URL` reaches the app.
* The master plan (`01-dependency-plan.md`, "Sequencing rationale") says "Connect injects `CONNECT_SERVICE_URL`; the MC app's `additionalEnv` and CSP need the service URL": **this is not supported by the docs for MC apps**. No documented cross-application URL injection exists.
* Proven pattern (sibling, deployed): declare an ordinary `standardConfiguration` key on the app (`SEARCH_CONFIG_SERVICE_URL` there; `CONTENTOOLS_SERVICE_URL` here), leave it empty on first deploy, read the service application's URL from the deployment (`applications[].url` in the Connect API response, `commercetools connect deployment describe`), then `redeploy` with that value. Sibling `tools/connect-deploy.mjs:151-156` automates it: `deployment?.applications?.find(a => a.applicationName === 'service')?.url`.
* The value must end in `/service` (the service `endpoint`): the Connect URL format is `{connect-provided-url}/{endpoint}` (docs `connect/development.md`, table row `endpoint`).
* The same string is the `X-Forward-To` base, so `new URL(value).origin` is the forward-to **audience** under `forward-url-origin` (K). The service derives its expected audience from its own `CONNECT_SERVICE_URL` origin: identical by construction, nothing to configure twice (H/E to confirm, Q-L2).
=> Result: a two-pass deployment (deploy, read URL, redeploy), same as the register-first/update-URL-last dance for `APPLICATION_URL`.

## 3. Facts about Connect for `merchant-center-custom-application`
* `connect.yaml` entry: `applicationType: merchant-center-custom-application`; `endpoint` NOT required and must not be set; `configuration.standardConfiguration` only (docs table: `securedConfiguration` N/A for the app in all documented examples); keys `CUSTOM_APPLICATION_ID` (required), `ENTRY_POINT_URI_PATH` (required), optional `CLOUD_IDENTIFIER` (default `gcp-eu` in docs). `CUSTOM_APPLICATION_ID` and `ENTRY_POINT_URI_PATH` "must only be used for" those purposes.
  The docs' example does not declare `APPLICATION_URL` (skill checklist: "no stray ... `APPLICATION_URL`"). The sibling declares it as a key; because the docs say Connect provides it, we do not; if the first real build fails with `Invalid application URL: ""` (sibling INSTALL.md:197), that is the signal to add it (R-L1).
* `name` must equal the folder (`admin-app`), allowed characters letters/digits/`_`/`-`, <= 256 chars (docs `connect/development.md`).
* Root `inheritAs.configuration` applies to all applications (sibling: `CLOUD_IDENTIFIER`, shared by service and app). Root `inheritAs.apiClient.scopes` creates one API client for the connector (injects `CTP_CLIENT_ID/SECRET/SCOPE/PROJECT_KEY/API_URL/AUTH_URL`; skill `security.md:86`). The MC app does not use it. Because inherited secured values may be visible to every app's build environment, the app must never reference them (checked by test, task 6).
* Deployments: CLI `commercetools connect deployment create --region <europe-west1.gcp|us-central1.gcp|australia-southeast1.gcp|us-east-2.aws|eu-central-1.aws> [--key] [--connector-key|--connector-id] [--connector-staged] [--type preview|sandbox|production] [--configuration '<app>.<KEY>=<value>' | '<KEY>=<value>' ...]`;
  `deployment redeploy [--key|--id] [--configuration ...] [--skipScripts] [--updateConnector]`; `deployment describe --key`; `deployment logs --key --application <name> --startDate --endDate`; `connect validate [DIR] [--skip tests|analysis]`; `connect application build|start|test`; `connect bundle` (verified with `--help`, CLI 0.0.17).
  Redeploy semantics (sibling `tools/connect-deploy.mjs` header): without `updateConnector` the old build restarts; a key not sent on redeploy loses its value; an undeclared key is dropped silently.
* Deployment status `Queued -> Deployed`, up to 15 min; `sandbox` default type scales to zero (about 15 s cold start); `production` needs a non-trial project and a published Connector (docs `deployment-behavior-and-environments.md`).
* Region vocabulary differs: MC `cloudIdentifier` (`gcp-eu`, `gcp-us`, `gcp-au`, `aws-eu`, `aws-us`; source `region.ts`) vs Connect `--region` (`europe-west1.gcp`, `us-central1.gcp`, `australia-southeast1.gcp`, `eu-central-1.aws`, `us-east-2.aws`). Deploy in the project's region.
* Registration facts (`https://docs.commercetools.com/merchant-center-customizations/tooling-and-configuration/custom-application-config.md`): `entryPointUriPath` 2-64 chars, lowercase alphanumerics/`_`/`-` (no leading/trailing/adjacent separators), unique per cloud region, some reserved words (`account`, `orders`, `products`, `settings`...);
  `oAuthScopes` in the file are "mainly for local development": in production the scopes, menu links and permissions are those **registered in the Merchant Center** (UI or `mc-scripts config:sync`). Editing the file and redeploying does not change them (sibling INSTALL.md "Changing scopes or menu links later").
* Guide `https://docs.commercetools.com/guides/create-custom-application.md`: registration happens in MC > Organization settings > Custom Applications (configure, add app: name, application URL (placeholder), entry point path; permissions: default group view/manage OAuth scopes; main menu: label + link permissions) -> state Draft; note the Application ID.

## 4. Scopes actually needed by the UI (least privilege)
UI (browser, MC session) calls: (1) MC GraphQL `businessUnits(limit)` -> MC scope **`view_business_units`**; (2) forward-to to the service (no CT scope; the service uses its own API client). Everything else the old app requested (`view_products`, `view_key_value_documents`, `view_project_settings`, `view_stores`, `view_api_clients`, `manage_products`, `manage_key_value_documents`, `manage_api_clients`) belonged to the deleted onboarding flow or to hooks with no importers (K explore section 1).
Manage group: the MC permission `canManage<Entry>` is what the service reads from the forwarded `userPermissions` claim. A manage OAuth scope attached to it: default `manage_key_value_documents` (content is stored in key-value documents by the service; same scope the sibling uses), with open question Q-L1 whether an empty manage list is accepted by the registration form.

## 5. Risks
| # | Risk | Mitigation |
| --- | --- | --- |
| R-L1 | Connect build fails without `APPLICATION_URL` declared (sibling reports "Invalid application URL" for non-Connect hosts only) | first sandbox deploy is the test; fallback: declare `APPLICATION_URL` (required: false); recorded in design D2 |
| R-L2 | `additionalEnv` `${env:X}` throws when X unset (sibling comment) | read `process.env.CONTENTOOLS_SERVICE_URL ?? ''` directly |
| R-L3 | Service URL changes on redeploy of a *new* deployment key | URL is stable across redeploys of the same deployment (sibling runbook); a new key means a new URL -> repeat step 5 |
| R-L4 | Registered scopes drift from the file | `config:sync` task + README warning |
| R-L5 | Inherited secrets present in the app build env | app code/config never reads `CTP_*`; test greps `public/` for the fake secret |
| R-L6 | `entryPointUriPath` already used in the region | Q-K5 / `ENTRY_POINT_URI_PATH` is a deploy parameter |
| R-L7 | puck rc not on npm at Connect build time | hard pre-condition (M-08) |
