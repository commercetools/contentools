# Contentools admin app

> Freely available, AS IS and UNSUPPORTED. See the repository `LICENSE`.

A Merchant Center custom application that mounts the Contentools page, content item and theme
managers (`@commercetools-labs/puck-*`) against the Contentools `service` app. It has no login or
onboarding of its own: the Merchant Center session authenticates every call through its `forward-to`
proxy, and the service uses its own commercetools API client.

## Prerequisites

Node 22, Yarn 1 (`yarn.lock` is committed; no `package-lock.json`), a Merchant Center custom
application registration (see the repository docs), and a running `service` app reachable over https.

## Configuration (`.env`, copy from `.env.example`)

| Key | Meaning |
| --- | --- |
| `CLOUD_IDENTIFIER` | Region of the project: `gcp-eu`, `gcp-us`, `gcp-au`, `aws-eu`, `aws-us` |
| `CTP_INITIAL_PROJECT_KEY` | Project opened by `yarn start` (local development only) |
| `ENTRY_POINT_URI_PATH` | Registered path, unique per region (default `contentools`) |
| `CUSTOM_APPLICATION_ID` | Id shown after registering the application |
| `APPLICATION_URL` | Provided by Connect at deploy time; any https URL for a local build |
| `CONTENTOOLS_SERVICE_URL` | https URL of the service app, ending in `/service` |

## Commands

| Command | What it does |
| --- | --- |
| `yarn start` | Dev server on `http://localhost:3001` (opens a Merchant Center login) |
| `yarn verify` | typecheck, lint, tests, pin/dependency/catalog checks, production build |
| `yarn check:pins`, `check:deps`, `check:i18n` | Individual guards (lockstep versions, no unused dependency, `en`/`de` catalogs) |
| `yarn extract-intl` | Rewrites `src/i18n/data/core.json` from the code; then copy it to `en.json` and translate `de.json` |

## Developing against unpublished puck packages

The committed `package.json` always names registry versions. Until the puck pre-release is on npm,
or while you change puck at the same time, run from the repository root:

```bash
node tools/admin-app-use-local-puck.mjs            # build puck, pack tarballs, install them (no lockfile written)
node tools/admin-app-use-local-puck.mjs --restore  # put package.json back and reinstall
```

(or `yarn admin-app:local-puck`). Add `--ignore-engines` if your Node is older than a dependency's
engines range. While the tarballs are active `yarn check:pins` fails on purpose; never commit in that
state. The first real install after the pre-release is published must add the puck entries to
`yarn.lock` (`yarn install`, then commit the lockfile).

## Running with a local service (tunnel)

`forward-to` only calls https URLs, so expose a local service with a tunnel (for example
`ngrok http 8080`). Set the service session audience to the tunnel origin and the issuer to the cloud
identifier, put `CONTENTOOLS_SERVICE_URL=https://<tunnel>/service` in `.env`, then `yarn start`.
Tunnel URLs change on restart: update both places.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| "The service URL is not configured" | `CONTENTOOLS_SERVICE_URL` is empty or not https: set it and redeploy |
| Requests repeat after a 401 | The service answers 401 where it should answer 403 for a missing permission |
| Blank page in development | Not logged in to the Merchant Center |

## Deploy

The whole first-deployment walk-through (all three applications, Merchant Center registration, verification) is [../INSTALL.md](../INSTALL.md); this section is the admin-app part of it.

The admin app is the `admin-app` application of the root `connect.yaml` (type
`merchant-center-custom-application`: static files, no `endpoint`, no secrets, no lifecycle scripts).
Connect runs `yarn install --frozen-lockfile` and `yarn build` in this folder and hosts `public/`.

### Configuration

| Key | Where set | Kind | Required | Meaning |
| --- | --- | --- | --- | --- |
| `CUSTOM_APPLICATION_ID` | `admin-app` block | standard | yes | Application ID shown after registering the custom application |
| `ENTRY_POINT_URI_PATH` | `admin-app` block | standard | yes (default `contentools`) | Registered entry point path, unique per region |
| `CONTENTOOLS_SERVICE_URL` | `admin-app` block | standard | no | https URL of the `service` application, ending in `/service` |
| `CLOUD_IDENTIFIER` | shared (`inheritAs.configuration`) | standard | yes, no default | Cloud identifier of the project region; also the issuer the service verifies |

Provided by Connect: `APPLICATION_URL` (do not declare it). `CONNECT_SERVICE_URL` is injected only into
service applications, not into Merchant Center applications; that is why the service URL is an explicit
key and the first deployment is followed by a redeploy (two passes).

Connect silently drops keys that `connect.yaml` does not declare, and a key left out of a redeploy loses
its value: send every key again each time. `yarn check:admin-app-connect` (repository root) guards the
block; `yarn check:admin-app-build` builds with only the Connect environment and inspects `public/`.

### Sequence (register first, update the URL last)

Placeholders are in angle brackets. Region names: MC `gcp-eu` = Connect `europe-west1.gcp`, `gcp-us` =
`us-central1.gcp`, `gcp-au` = `australia-southeast1.gcp`, `aws-eu` = `eu-central-1.aws`, `aws-us` =
`us-east-2.aws`.

| # | Step | Command or place |
| - | ---- | ---------------- |
| 1 | Register the custom application (name `Contentools`, URL `https://example.com`, entry path `contentools`, View scope `view_business_units`, Manage scope `manage_key_value_documents`, menu label `Contentools`, link permissions View and Manage); copy the Application ID | Merchant Center, organization, Custom Applications |
| 2 | Create the Connector from the repository tag | `commercetools connect connectorstaged create --key contentools --name "Contentools" --repository-url <repository-url> --repository-tag <tag> --creator-email <email> --supported-regions <connect-region> --integration-types other` |
| 3 | First deployment (preview shown; sandbox/production need `connectorstaged publish` and `deployment create`) | `commercetools connect connectorstaged preview --key contentools --deployment-key <deployment-key> --region <connect-region> --configuration CLOUD_IDENTIFIER=<cloud-id> --configuration admin-app.CUSTOM_APPLICATION_ID=<id> --configuration admin-app.ENTRY_POINT_URI_PATH=contentools --configuration service.<KEY>=<value> ...` |
| 4 | Wait for `Deployed`, read the `admin-app` and `service` URLs | `commercetools connect deployment describe --key <deployment-key>` |
| 5 | Second pass: give the app the service URL (all keys again; add `--updateConnector` only when the tag changed) | `commercetools connect deployment redeploy --key <deployment-key> --configuration CLOUD_IDENTIFIER=<cloud-id> --configuration admin-app.CUSTOM_APPLICATION_ID=<id> --configuration admin-app.ENTRY_POINT_URI_PATH=contentools --configuration admin-app.CONTENTOOLS_SERVICE_URL=<service-url> --configuration service.<KEY>=<value> ...` |
| 6 | Replace the placeholder Application URL with the `admin-app` URL | Merchant Center registration, or `config:sync` (below) |
| 7 | Install for the organization or project; give a team View (and Manage for editors) | Merchant Center, Custom Applications, Install |

A new deployment key means new URLs for both applications: repeat steps 4 to 6. Preview and sandbox
deployments scale to zero (the first request after idle takes about 15 seconds). Deploy in the region of
the project. The service keys come from `service/README.md`.

### Scopes

| Scope | Why | Needed by |
| --- | --- | --- |
| `view_business_units` | Lists business units for the selector (Merchant Center GraphQL) | Everyone who opens the app |
| `manage_key_value_documents` | Backs the Manage permission; writes are authorized by the service from the forwarded permission claim | Editors |

Scopes, menu links and permissions are taken from the registration, not from the deployed bundle. After
editing `custom-application-config.mjs`, run `npx mc-scripts config:sync` (add `--dry-run` to preview;
needs `npx mc-scripts login` and `CUSTOM_APPLICATION_ID` in the environment) or edit the registration in
the Merchant Center.

### Failure behaviour

The app fails closed: without a valid https service URL it shows a notice and sends no request; every
write is authorized by the service from the forwarded permission claim.

### Content Security Policy

The config ships no `headers.csp` override. The Application Shell builds the default policy; the browser
only talks to the Merchant Center API (through `forward-to`). Add an entry only when the browser console
reports a violation, with the minimal directive and value, and never a wildcard of a cloud provider.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Build log: `Invalid application URL: ""` | Connect did not provide `APPLICATION_URL`: declare it (`required: false`) in the `admin-app` block and redeploy |
| Build log: `Missing environment variable ...` | The key was not sent: pass it with `--configuration admin-app.<KEY>=<value>` |
| `yarn install --frozen-lockfile` fails in the build | `yarn.lock` is stale or the puck pre-release is not published and locked |
| "The service URL is not configured" | `CONTENTOOLS_SERVICE_URL` empty or not https: redeploy with it |
| A value disappeared after a redeploy | A key was left out of the redeploy: send every key again |
| Menu entry missing | App not installed for the project, or the team lacks View permission |
| Scopes differ from the file | The registration wins: run `config:sync` or edit the registration |

This repository is freely available, AS IS and UNSUPPORTED (see the root `LICENSE`).
