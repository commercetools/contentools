## Context
`admin-app` (spec K) is a React app that the Merchant Center loads from a URL. Connect builds it (`mc-scripts build`) and hosts the static output.
Facts, sources and the sibling comparison: `explore.md`. The service is spec H; the transport is K design D2.

## Decisions

### D1. `connect.yaml` block (this is the contract; H merges it into the root file)
```yaml
deployAs:
  # ... service (H), mcp (M) ...
  - name: admin-app                      # == folder name
    applicationType: merchant-center-custom-application
    configuration:
      standardConfiguration:
        - key: CUSTOM_APPLICATION_ID
          description: The Application ID the Merchant Center shows after the custom application is registered
          required: true
        - key: ENTRY_POINT_URI_PATH
          description: The entry point URI path the custom application is registered with (unique per region, 2-64 chars, lowercase alphanumerics and hyphens)
          required: true
          default: contentools
        - key: CONTENTOOLS_SERVICE_URL
          description: https URL of the service application, ending in /service. Empty on the first deployment; set it with a redeploy once the service URL is known
          required: false
inheritAs:
  configuration:
    standardConfiguration:
      - key: CLOUD_IDENTIFIER
        description: Merchant Center cloud identifier of the project's region (gcp-eu, gcp-us, gcp-au, aws-eu, aws-us); the admin-app's MC API host and the issuer of the forwarded tokens verified by the service
        required: true
```
No `endpoint`, no `securedConfiguration`, no `scripts`, no `APPLICATION_URL` (Connect provides it; skill `merchant-center-customizations.md` Pattern 5 and checklist). If the first Connect build needs it, add `APPLICATION_URL` (required: false) and record it here (R-L1).
`CLOUD_IDENTIFIER` lives in `inheritAs.configuration` because both `service` (issuer for `createSessionMiddleware`) and `admin-app` need the identical value (sibling does the same). H must not declare it a second time.
Alternatives rejected: (a) `CLOUD_IDENTIFIER` with a default `gcp-eu` as in the docs example: a wrong default silently breaks projects in other regions; required without default forces a decision. (b) Passing the service URL as `securedConfiguration`: pointless, it ends up in public HTML.

### D2. `custom-application-config.mjs`
```js
import { PERMISSIONS } from './src/constants';

/** @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication} */
const config = {
  name: 'Contentools',
  description: 'Manage pages, content items and the theme of your storefront content.',
  entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    development: { initialProjectKey: '${env:CTP_INITIAL_PROJECT_KEY}' },
    production: { applicationId: '${env:CUSTOM_APPLICATION_ID}', url: '${env:APPLICATION_URL}' },
  },
  // read directly: a ${env:} placeholder throws when unset, and the first deployment has no service URL yet
  additionalEnv: { serviceUrl: process.env.CONTENTOOLS_SERVICE_URL ?? '' },
  oAuthScopes: { view: ['view_business_units'], manage: ['manage_key_value_documents'] },
  icon: '${path:@commercetools-frontend/assets/application-icons/files.svg}',
  mainMenuLink: { defaultLabel: 'Contentools', labelAllLocales: [], permissions: [PERMISSIONS.View] },
};
export default config;
```
(plus the SPDX header). `description` is kept in the file because `config:sync` pushes the whole config (sibling comment). No `submenuLinks` (the in-app sidebar, K Q-K2).
`serviceUrl` appears in the public `window.app`; it is not secret.

### D3. Service URL discovery
Chosen: explicit key + two-pass deploy (explore section 2). Alternatives: (a) rely on `CONNECT_SERVICE_URL` in the app: not provided to MC apps, cannot work. (b) Have the service expose the URL (e.g. `GET /service/config`) and let the app guess its location: the app needs the URL to call the service, circular. (c) Derive from the app URL by naming convention (`admin-app-xyz` -> `service-xyz`): undocumented, brittle. (d) Resolve through the Connect API from the browser: needs credentials, no.
The redeploy is cheap: URL is stable across redeploys of the same deployment key.

### D4. Scopes (least privilege)
`view_business_units` (MC GraphQL `businessUnits`), `manage_key_value_documents` (backs the Manage permission; the service enforces authorization from the forwarded `canManageContentools` claim, K D2). The source listed 9 scopes (6 view, 3 manage). Kept: `view_business_units`, `manage_key_value_documents`. Removed 7: `view_products`, `view_key_value_documents`, `view_project_settings`, `view_stores`, `view_api_clients`, `manage_products`, `manage_api_clients` (onboarding flow or hooks without importers). Open Q-L1: empty manage list.
Scopes are registered in the MC, not taken from the bundle in production; the registration copies the file (task 5.2), `config:sync` keeps them aligned.

### D5. CSP
Start without `headers.csp`. The Application Shell composes the policy from defaults (`img-src * data:`, MC API host from `cloudIdentifier`, fonts/styles from the shell's CDNs, app origin from `env.production.url`).
All internal entries of the source CSP disappear: `localhost:8080`, `*.us-central1.run.app`, `*.europe-west1.run.app`, `*.asia-southeast1.run.app`, `frame-src *.ct-poc.net`, `'unsafe-eval'`, `cdn.jsdelivr.net`, `rsms.me`, `blob:`.
Rationale: the browser only talks to the MC API (forward-to). If a console CSP violation appears (task B6), add only the minimal directive and record "directive, value, console message" in a table appended to this section. Candidate (unverified): `blob:` in `script-src`/`worker-src` if the editor spawns workers; `style-src` for a font CDN if puck CSS imports one (none found in the puck sources: grep of `jsdelivr|rsms|googleapis` over `puck/packages/*/src` returned nothing).

### D6. Sequence (register-first / update-URL-last) and who does what
| # | Step | Who | Tool |
| - | ---- | --- | ---- |
| 1 | Register custom application (placeholder URL `https://example.com`, entry path, scopes, menu, link permissions); copy Application ID | human (M-03) | MC UI |
| 2 | Publish puck rc to npm; commit `yarn.lock` pinned to it | human/agent (M-08) | npm |
| 3 | Tag release; stage + publish (or preview) the Connector | agent with CLI login (M-05) | `commercetools connect connectorstaged create ...` |
| 4 | `deployment create` with all three apps' config (admin-app: `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`; global `CLOUD_IDENTIFIER`; service keys from H) | agent | `commercetools connect deployment create` |
| 5 | Wait for `Deployed`; read `service` and `admin-app` URLs | agent | `deployment describe` |
| 6 | `redeploy` with `admin-app.CONTENTOOLS_SERVICE_URL=<service URL>` plus every other key | agent | `deployment redeploy` |
| 7 | Replace placeholder Application URL in the registration with the `admin-app` URL | human | MC UI or `mc-scripts config:sync` |
| 8 | Install the app for the organization/project; assign team permissions | human | MC UI |
Ordering rationale: the Application ID is needed at build (placeholder in config), the Application URL is only known after the first deploy (hence "last"), the service URL is only known after the service exists (hence second pass).

### D7. Build and test contract
Connect runs install + `yarn build` in `admin-app/` (Yarn 1 classic with the committed `yarn.lock`: the owner mandates Yarn for all Connect apps and Connect's CLI detects the lockfile via `nypm`, verified in H's design, so the lockfile type does not matter; see K design D6). `commercetools connect application test` runs `yarn test` with appended coverage flags: K's Jest 30 setup accepts them (the sibling's `tsc` wrapper exists only because it has no Jest). Node 22 via `.nvmrc`/`engines`.
`tools/admin-app-simulate-connect-build.mjs` reproduces the Connect environment locally: clean env containing only `ENTRY_POINT_URI_PATH`, `CLOUD_IDENTIFIER`, `CUSTOM_APPLICATION_ID`, `APPLICATION_URL`, `PATH`/`HOME`; optional `--service-url`; plus a canary `CTP_CLIENT_SECRET`; then `yarn build` and assertions on `public/index.html`.

### D8. Documentation produced here
`admin-app/README.md` gets a "Deploy" section: config table (key, kind, required, meaning, where it comes from), the D6 sequence with exact commands, fail-open/closed statement ("the app fails closed: without a valid service URL it shows a notice and sends no request"), scopes table with justification, redeploy runbook, troubleshooting. Spec P integrates it into `docs/`.

## Risks / trade-offs
See explore section 5. Trade-off: two-pass deployment is a manual-looking step; mitigated by a documented command pair and (optional, task 6.4) a tiny helper that prints the exact redeploy command from `describe` output.
