## Why

The source repository has no Connect definition for the Merchant Center app, and its `custom-application-config.mjs` carries internal Cloud Run and
`ct-poc.net` hosts, a broad scope list built for tenant onboarding, and a service URL named after "cms". To ship `admin-app` as a Connect
`merchant-center-custom-application` that anyone can deploy to their own project, the packaging must be generic, env-driven and least-privilege,
and the order of operations (register app -> deploy -> read URLs -> update registration) must be documented and scripted as far as possible.

## What Changes

- Add the `admin-app` entry (`applicationType: merchant-center-custom-application`, no `endpoint`, no `securedConfiguration`, no `APPLICATION_URL`) to the root `connect.yaml`, with `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `CONTENTOOLS_SERVICE_URL` and the shared `CLOUD_IDENTIFIER`.
- Rewrite `admin-app/custom-application-config.mjs` with `${env:}` placeholders only, `additionalEnv.serviceUrl` fed from `CONTENTOOLS_SERVICE_URL`, minimal `oAuthScopes`, no hard-coded hosts, and no CSP override unless a verified need exists.
- Document and verify how the app learns the service URL: Connect does not inject `CONNECT_SERVICE_URL` into MC apps, so it is an explicit configuration key set in a second pass after the service is deployed.
- Define the deployment runbook: register first with a placeholder URL, deploy (service + admin-app), read both URLs, redeploy with the service URL, update the registered Application URL last, install and assign permissions.
- Add the deploy tasks (validate, build, stage/publish, `deployment create` / `redeploy` commands) and the README configuration table.
- Split verification into automatable (validate, simulated-Connect build, bundle inspection) and needs-MC-login (Chrome DevTools in a logged-in session).

## Capabilities

### New Capabilities
- `admin-app-connect-deployment`: `connect.yaml` block, config file, env keys, service-URL discovery, CSP and scope rules, build contract.
- `admin-app-mc-registration`: registration in the Merchant Center, order of operations, permission mapping, scope sync, verification.

### Modified Capabilities
<!-- none -->

## Impact

- Edits root `connect.yaml` (shared with H and M: whoever lands second merges the `inheritAs.configuration.CLOUD_IDENTIFIER` entry) and `admin-app/custom-application-config.mjs`, `admin-app/.env.example`, `admin-app/README.md`.
- New helper `tools/admin-app-simulate-connect-build.mjs` (build with only the variables Connect provides).
- Requires K archived and H archived (service URL shape and endpoint), puck `1.0.0-rc.N` on npm (manual M-08), a registered application (M-03).
- Cross-spec contract for E/H: the service's expected forward-to audience is the origin of its own `CONNECT_SERVICE_URL`.
