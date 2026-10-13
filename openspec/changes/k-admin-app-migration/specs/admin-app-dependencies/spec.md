## ADDED Requirements

### Requirement: Minimal, pinned dependency set
`admin-app/package.json` SHALL list only packages that are imported by `src`, required as peer dependencies by the kept packages, or required by the MC toolchain. All `@commercetools-frontend/*` packages SHALL be pinned to the same exact version (27.13.0), `@commercetools/nimbus`, `@commercetools/nimbus-icons`, `@commercetools/nimbus-tokens` to exactly `3.5.1`, and `@chakra-ui/react` to `3.36.1`.

#### Scenario: Lockstep versions
- **WHEN** `yarn --cwd admin-app check:pins` (script `admin-app/scripts/check-pins.mjs`, created in tasks.md group 6) runs
- **THEN** it exits 0, printing one distinct version for all `@commercetools-frontend/*` dependencies

#### Scenario: No unused dependency
- **WHEN** `yarn --cwd admin-app check:deps` runs
- **THEN** every dependency is either imported in `src`, listed with a reason in `admin-app/scripts/deps-allowlist.json` (peer or toolchain), or the command fails naming it

### Requirement: Single copy of React, Nimbus and Chakra
The installed tree SHALL contain exactly one version of `react`, `react-dom`, `react-intl`, `@chakra-ui/react`, `@commercetools/nimbus` and `@commercetools-labs/puck-types`.

#### Scenario: Duplicate check
- **WHEN** `yarn --cwd admin-app why @commercetools/nimbus` (and the others) runs
- **THEN** it reports one installed version for each

### Requirement: Puck packages come from the registry in Connect builds
The committed `admin-app/package.json` SHALL reference `@commercetools-labs/puck-*` packages by semver range from the npm registry, never by `file:`, `link:`, `workspace:` or a path.

#### Scenario: No local specifiers committed
- **WHEN** `grep -nE '"(file|link|workspace|portal):|\.\./puck' admin-app/package.json` runs
- **THEN** it prints nothing

### Requirement: Local development against unpublished puck
The repository SHALL provide `tools/admin-app-use-local-puck.mjs` that builds and packs the puck workspace packages into `admin-app/.local-puck/*.tgz`, installs them with `yarn install --force --frozen-lockfile=false --no-lockfile` so the committed `yarn.lock` is untouched (adding `file:` entries to `resolutions` for every puck package inside a temporary edit of `package.json`), and a `--restore` option that returns `package.json` to its committed state and runs `yarn install --frozen-lockfile`.

#### Scenario: Use then restore
- **WHEN** a developer runs `node tools/admin-app-use-local-puck.mjs` then `yarn --cwd admin-app start`, then `node tools/admin-app-use-local-puck.mjs --restore`
- **THEN** the app runs against the local build, and afterwards `git diff --stat admin-app/package.json admin-app/yarn.lock` is empty

### Requirement: Toolchain commands work
`yarn --cwd admin-app <script>` SHALL provide `build`, `start`, `typecheck`, `lint`, `test`, `extract-intl`, `check:i18n`, `check:deps`, `check:pins`, all exiting 0 on a clean checkout (with puck packages resolvable).

#### Scenario: Verify
- **WHEN** `yarn --cwd admin-app verify` runs
- **THEN** typecheck, lint, tests and `mc-scripts build` succeed
