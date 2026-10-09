# Release runbook

There is no CI in this repository (no GitHub Actions, no hosted pipeline). Connect builds and deploys the apps from
`connect.yaml`; the puck packages are published from a maintainer's machine. `yarn verify:strict` is the gate.

## Local gates

| Command | What it does |
| ------- | ------------ |
| `yarn verify` | Tool tests, SPDX headers, forbidden terms, legacy route calls, repo hygiene, Connect contract, then each app's own checks. Prints a table; logs in `.verify-logs/` (git-ignored). |
| `yarn verify --install` | Same, with each app's frozen install first (`--immutable` for puck, `--frozen-lockfile` for the Yarn 1 apps). |
| `yarn verify --connect` | Adds the admin-app Connect build simulation and `commercetools connect validate .` (Docker). |
| `yarn verify:strict` | Release grade: `--connect`, forbidden-terms pending list must be empty, no `_pending` folders, every app needs a committed `yarn.lock`, nothing may be skipped. |
| `yarn check:connect` | Static `connect.yaml` and app-folder contract (no Docker). |
| `yarn check:hygiene` | No CI/Docker/env/key/`.npmrc`/tarball files, one root `LICENSE`, public secret patterns. |
| `yarn check:admin-app-connect`, `yarn check:admin-app-build` | Spec L checks (also part of `check:connect` and `verify --connect`). |
| `yarn verify:service`, `yarn verify:mcp` | Per-app chains that install first (specs H and M). |

Flags: `--only a,b`, `--skip a,b`, `--fail-fast`. Step ids: `tools spdx forbidden legacy-calls hygiene connect-contract puck service mcp admin-app admin-app-connect-build connect-validate`.
mcp's own `yarn verify` is the live end-to-end check against a running server (needs a token); the orchestrator runs
`check:app` and `check:connect-block` for mcp instead.

Package managers: puck is Yarn 4.5.1 through corepack (`corepack enable` once), service, admin-app and mcp are Yarn 1.
The root tooling (`yarn test`, `yarn verify`, `release:puck:*`) runs puck through `corepack yarn` with Yarn 1's injected PATH removed.

## Connect conventions

* Each `service`/`mcp` app has `build`, `gcp-build` (Connect's build entry), `start`, `test`, `typecheck`; `lint` where eslint is set up.
* Lifecycle scripts `connector:post-deploy` / `connector:pre-undeploy` exist for every name `connect.yaml` references.
* Node 22 (`engines.node` `>=22`), no workspaces in any Connect app or the root.
* No `CTP_*` keys in `connect.yaml` (injected via `inheritAs`); secret-like keys live under `securedConfiguration`.
* `commercetools connect application test` must pass offline in `service/` and `mcp/`; `admin-app` is a Merchant Center custom application, check it through `yarn test` and the Connect build simulation.
* `commercetools connect validate .` is mandatory before `connectorstaged create`.

## Release steps

1. `yarn verify:strict` (needs Docker running and the `commercetools` CLI; record the date and CLI version).
2. Choose the version: first `1.0.0-rc.0` (dist-tag `next`), then `1.0.0` (`latest`).
3. Bump all packages in lockstep: `yarn release:puck:bump 1.0.0-rc.0` (puck packages), then in the root, `service/`, `admin-app/` and `mcp/`: `yarn version --new-version 1.0.0-rc.0 --no-git-tag-version`.
4. `yarn release:preflight` (strict verify, lockstep versions, dist-tag, clean git tree).
5. Commit the bump.
6. Dry run: `yarn release:puck:publish` (prints the `npm publish --dry-run` results for every package, publishes nothing).
7. Owner checkpoint CP-1: show the preflight and dry-run output and wait for approval.
8. Publish: `yarn release:puck:publish --execute` (clean tree, `npm whoami`, typed confirmation; a prerelease goes to `--tag next`).
9. Point `admin-app` at the release candidate, rebuild, run the end-to-end acceptance.
10. Final: bump to `1.0.0`, preflight, publish with `--execute` (dist-tag `latest`).
11. Tag: `yarn release:tag 1.0.0` (dry run), then `yarn release:tag 1.0.0 --execute`. For Connect tests use release candidates: `yarn release:tag --next-rc` (dry run), then add `--execute` to create `v1.0.0-rc.N`. The tool never pushes.
12. The owner pushes: `git push origin v1.0.0-rc.N` or `v1.0.0` (checkpoint CP-3). Later fixes are normal commits, allowed only when the labs gate is clean on the new commit (squash only for leaks); then bump, `yarn verify:strict`, next rc tag. Tags are never moved or deleted once pushed.
13. Connect: `commercetools connect connectorstaged create --repository-url <url> --repository-tag v1.0.0 --creator-email <email> --name contentools --key contentools`, then `deployment create` per region (see `service/README.md`).
14. Rollback: never `npm unpublish`. Use `npm deprecate @commercetools-labs/<pkg>@<version> "<reason>"` and publish a patch. Delete an unpushed local tag with `git tag -d v<version>`.
