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
