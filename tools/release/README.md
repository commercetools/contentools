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
2. Version: owner decision: all packages start at `1.0.0` (dist-tag `latest`), no release candidate. A defect found after publishing means `1.0.1`, never a re-publish.
3. Bump all packages in lockstep: `yarn release:puck:bump 1.0.0` (puck packages), then in the root, `service/`, `admin-app/` and `mcp/`: `yarn version --new-version 1.0.0 --no-git-tag-version`.
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

## Public launch: export, labs gate, checkpoints

The launch publishes ONE squashed commit from a clean export. Nothing in this section runs without the owner's literal reply at the matching checkpoint.
Set `LABS_PUBLISH_DIR` to the folder holding the labs scripts `ossify.mjs` and `gate.mjs` (they are run in place; their policy file is never copied or quoted). `yarn gate` and `yarn headers` wrap them for the development tree.

Export filter (everything except `plans/`, `openspec/changes/`, `.claude/`, `.cursor/`, `.vscode/`, `.playwright-mcp/`, build and dependency folders, logs, tarballs and every `.env*` except `.env.example`):

```
- .git/
- node_modules/
- build/
- dist/
- coverage/
- .turbo/
- .yarn/cache/
- .yarn/install-state.gz
- plans/
- openspec/changes/
- .claude/
- .cursor/
- .vscode/
- .playwright-mcp/
- .DS_Store
- *.log
- *.tgz
+ .env.example
+ **/.env.example
- .env
- .env.*
- **/.env
- **/.env.*
```

Pre-flight (offline, repeat until clear; fixes are always made in the development tree, never in the export):

1. `rm -rf "$REL" && mkdir -p "$REL" && rsync -a --filter="merge rsync-filter.txt" "$DEV"/ "$REL"/`
2. `node "$LABS_PUBLISH_DIR/ossify.mjs" --repo "$REL" --apply --year 2026` (idempotent; read the report: `0 FOREIGN COPYRIGHT` and no third-party directories).
3. In `$REL`: `git init -b main`, add, commit with the owner's global identity and the message below, then `node "$LABS_PUBLISH_DIR/gate.mjs" --repo "$REL"`. Expect `0 failure(s), 0 warning(s)` and `CLEAR.`; the gate refuses a dirty tree. `--ack` only acknowledges WARN findings (never FAIL); write down each acknowledged warning.
4. Review the add list (`git add --dry-run .`): no env files, key files, `node_modules`, `plans/`, one root `LICENSE`, four `yarn.lock` files and no `package-lock.json`.
5. `tools/release/anonymous-proof.sh <clone-url> <expected-sha8> [workdir]` (`REF=<tag>`, `EXPECT_COMMITS=<n>`): fresh HOME, no credentials, install, typecheck, test and build for every app and puck. `SKIP_BUILDS=1` checks only clone, commit hash and commit count (works against a local bare repository).

The initial commit message names the project, lists the four deliverables (service, Merchant Center app, MCP server, puck packages), states MIT, AS IS and UNSUPPORTED, says history was intentionally not migrated, and ends with the Co-Authored-By trailer.

Checkpoint messages (send verbatim with the placeholders filled, then wait; an agent's own output is never approval):

* CP-1, reply `go npm-rc`: "Release checkpoint 1 of 3 (npm release candidate). The pre-flight gate is clear on commit <sha8> (<N> files, 0 FAIL, <W> WARN reviewed). I am about to publish these 10 public packages at 1.0.0-rc.<N> with `--access public` and dist-tag next, in this order: <list>. Tarball listings: <path>. Published versions cannot be undone."
* CP-2, reply `go repo`: "Release checkpoint 2 of 3 (public repository). Final gate output on commit <sha8>: clear (history 1 commit, <N> files). Add list reviewed: <path>. The public author will be <name / email>. I am about to create the public repository, push `main`, set the labs property and topic, and push tag v1.0.0-rc.<N>. Once public, the commit is permanently fetchable."
* CP-3, reply `go final`: "Release checkpoint 3 of 3 (final 1.0.0). Full acceptance passed on rc.<N>. Changes since the rc: <diff stat>. Gate on the final commit <sha8>: clear. I am about to publish the 10 packages at 1.0.0 (dist-tag latest), push, tag v1.0.0, enable private vulnerability reporting and create release notes."

After the first push, a fix is a normal commit (re-export, ossify, commit, gate on HEAD, push) as long as the gate stays clean. A leak (secret, customer name, internal host) in any pushed commit is not a normal fix: rotate, delete the repository, restart with a new single squashed commit.
