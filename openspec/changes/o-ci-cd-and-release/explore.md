# Explore notes for O (local quality gates and release tooling)

Spec O was re-scoped by the owner: **no GitHub Actions, no `.github/workflows`, no CI service of any kind** (Connect builds and deploys; there is no hosted pipeline). The directory name `o-ci-cd-and-release` is kept only because the change id is fixed. O now provides the local gates, a Connect-contract check, release tagging and thin wrappers around spec I's puck release scripts. Nothing here is "trusted publishing".

## 1. What the source had (all dropped, not replaced)
`/Users/behnam/code/cms/.github/workflows/workflow.yml` (81 lines): on push to `main` deploys the service to Google Cloud Run in two regions with `gcloud run deploy multitenant-contentools ...`, GCP service-account secrets, `environment: demo`. `e2e.yml` (93 lines): builds a Docker image `cms-service:e2e`, runs it with Firestore/JWT secrets and executes the legacy e2e (triggers only on branch `no_test`). Neither is reusable: Cloud Run/Firestore/tenant concepts are gone and the owner decided against any workflow. Spec C lists `.github/` as "dropped, not replaced".

## 2. What the other specs already define (O must wrap, not duplicate)
Read from `openspec/changes/*/tasks.md` on 2026-10-08:
| Owner | Command / artifact | Notes |
| --- | --- | --- |
| A | root `package.json` hub; `tools/run-all.mjs`; `tools/check-spdx-headers.mjs`; `tools/labs-publish.mjs`; `tools/lib/{files,targets}.mjs` | `verify` there = `run-all lint typecheck test build` (O replaces by an orchestrator) |
| C | `check:forbidden` (guard + pending list), `check:legacy-calls` | O requires the pending list to be EMPTY in strict mode |
| B | per-app tests; `tools/fake-ct`; `tools/sandbox-sweep.mjs` | live e2e is opt-in, never part of `verify` |
| H | `service/package.json` scripts `build, gcp-build, start, typecheck, lint, test, test:e2e, connector:post-deploy, connector:pre-undeploy`; root `verify:service` (install + typecheck + lint + test + build); `commercetools connect validate .` (Docker, 15 min first run); Yarn 1 | O keeps `verify:service` and does not call it (it installs) |
| I | `puck/package.json`: `verify` (`check:headers`, `check:metadata`, build, typecheck, lint, test), `verify:pack`, `release:bump` -> `scripts/bump-versions.mjs`, `release:publish` -> `scripts/publish-packages.mjs` (dry run by default; `--execute` needs clean git tree, `npm whoami`, typed confirmation; prerelease versions publish under dist-tag `next`); lockstep version `1.0.0` | O wraps these two |
| K | `admin-app` `verify` = typecheck, lint, test, `check:pins`, `check:deps`, `check:i18n`, build (run with the app's package manager) | O calls it |
| L | `tools/check-admin-app-connect.mjs` (text checker for the `admin-app` block of `connect.yaml`) | O's connect check runs it when present |
| M | `mcp/package.json` `check` = `typecheck && test && gcp-build`; Yarn 1 (owner decision); `connect.yaml` `mcp` entry `endpoint: /mcp` | O calls `typecheck/lint/test/build` where present |
| R | `tools/release/anonymous-proof.sh` (clean-clone proof incl. installs, `commercetools connect validate`), checkpoints CP-1..3, tag `v1.0.0`, `gate.mjs` | O's gates are the fast dev-time subset; R's proof is the final one |

Package managers (owner decision, final): Yarn everywhere - service, admin-app, mcp = Yarn 1 classic with committed `yarn.lock` (`yarn install --frozen-lockfile`, `yarn <script>`, no `package-lock.json`), puck = Yarn 4.5.1 (`yarn install --immutable`). Recorded in `tools/lib/targets.mjs` (spec A).

## 3. Connect facts used (skill `commercetools-connect`, `connect-cli.md`, `deployment-installation.md`)
* Commands: `commercetools connect application build|start|test`, `commercetools connect validate`, `commercetools connect bundle`. Validate also runs the build in an image (needs Docker) and static analysis; the documented flow is "auth login -> connect validate -> connectorstaged create" (deployment-installation.md:54), so it is NOT verified whether `validate` works without a prior `auth login`; task 5.1 records the outcome and, if a login is needed, the step is skipped with a message unless `--connect` is given (manual M-05).
* Rules a script can check cheaply: `connect.yaml` at repo root; app folder == `deployAs[].name`; `service` `endpoint: /service`; `mcp` `endpoint: /mcp`; MC custom application has no `endpoint`; secrets only in `securedConfiguration`; do not declare `CTP_*` credentials (auto-injected with `inheritAs.apiClient.scopes`; skill security.md:86 lists `CTP_CLIENT_ID, CTP_CLIENT_SECRET, CTP_SCOPE, CTP_PROJECT_KEY, CTP_API_URL, CTP_AUTH_URL`); no npm `workspaces`; Node 22; `postDeploy` idempotent (tested elsewhere).
* Release tagging: `connectorstaged create --repository-url <url> --repository-tag <tag>` registers the staged connector from a git tag, so a pushed tag is the unit Connect consumes. Owner decision: Connect is tested from the SAME public repo using release-candidate tags `v1.0.0-rc.N`; the repo becomes public right after R's gate and before the Connect tests, and fix commits after that are allowed only if the gate is clean (the squash/recreate rule applies only to leaks). The sibling repo uses `connect-v<semver>` tags created by its deploy tool; this repo uses plain `v<semver>` (R's decision).

## 4. Why no hosted CI is acceptable
Each Connect app is built and its tests are run by Connect itself (`commercetools connect validate` / deployment build), puck is released from a maintainer's machine, and the public repo is a single commit created by R. The local gates must therefore be strict enough to replace "red/green on PR": one orchestrator (`verify`), one strict mode for releases, and a hygiene scan that mirrors the public parts of the labs gate. The labs `gate.mjs` itself (customer names via `policy.json`) is run only by R.

## 5. Risks
* A local gate is only as good as discipline: strict mode is wired into the release preflight so a release cannot proceed without it.
* `commercetools connect validate` needs Docker and minutes; it is opt-in (`--connect`) in daily use and mandatory in `--strict`.
* `connect.yaml` has no YAML parser in a dependency-free root: the check uses a documented line-based subset parser (same approach as L's checker) and defers to `connect validate` as the authority.
