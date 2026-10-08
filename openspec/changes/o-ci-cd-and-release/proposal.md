## Why

The owner decided there is no GitHub Actions and no hosted CI: Connect builds and deploys the apps, puck is released from a
maintainer's machine. The quality gates the plan expected from CI (lint/typecheck/test/build per app, the "no-cms" grep, `connect validate`,
release tagging) must therefore exist as local, scripted, strict gates that a maintainer and R's launch procedure run before anything leaves the
machine.

## What Changes

- `tools/verify.mjs` (root `yarn verify`): one orchestrator running, in order, tool tests, SPDX, forbidden-terms, legacy-calls, repo hygiene, Connect contract check, then each app's own `verify` (or typecheck/lint/test/build); summary table, per-step logs, flags `--only --skip --fail-fast --install --connect --strict`.
- `tools/check-connect-contract.mjs` (`yarn check:connect`): static checks of root `connect.yaml` and the app folders (names, endpoints, secrets placement, no `CTP_*` declarations, no workspaces, Node 22, required scripts, `postDeploy` script exists) plus L's `check-admin-app-connect.mjs` when present; `commercetools connect validate .` is the authority and is run by `verify --connect`.
- `tools/check-repo-hygiene.mjs` (`yarn check:hygiene`): no CI/workflow files (`.github`, GitLab/CircleCI/Jenkins/Azure), no env/key/npmrc/tarball/Dockerfile files, one `LICENSE`, public secret patterns; the local stand-in for "no secrets in CI".
- `tools/release/`: `preflight.mjs` (strict verify + empty pending list + lockstep versions + dist-tag rule), `tag.mjs` (annotated `v<semver>` tag, dry run by default, typed confirmation, never pushes), `README.md` (runbook). Root scripts `release:puck:bump` / `release:puck:publish` delegate to spec I's `puck/scripts/bump-versions.mjs` and `publish-packages.mjs`.
- Documents the Connect build/test conventions every app must satisfy (script contract, `commercetools connect application test`).
- **No** workflow files, no trusted-publishing job, no secrets in any file.

## Capabilities

### New Capabilities
- `local-verification`: the `verify` orchestrator and its strict mode.
- `connect-contract-check`: static Connect contract checks and the `connect validate` step.
- `release-tooling`: preflight, tagging, runbook and wrappers over I's puck scripts.
- `repo-hygiene-gate`: no-CI-files and secret/forbidden-file scan.

### Modified Capabilities
<!-- none -->

## Impact

- Adds ~6 scripts + tests under `tools/`; edits root `package.json` scripts and `.gitignore` (`.verify-logs/`).
- Replaces A's provisional `verify` script. Consumed by R (preflight, anonymous proof) and P (links the runbook).
- Depends on H, I, L, M (their scripts and `connect.yaml` blocks).
