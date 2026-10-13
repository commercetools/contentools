## ADDED Requirements

### Requirement: Single verification command
The root `package.json` SHALL expose `verify` running `node tools/verify.mjs`, which executes in this order the steps `tools` (`node --test tools/test/*.test.mjs`), `spdx`, `forbidden`, `legacy-calls`, `hygiene`, `connect-contract`, then one step per app (`puck`, `service`, `mcp`, `admin-app`), and finally (only with `--connect`) `connect-validate`; it SHALL print a table `step | status | seconds`, write each step's output to `.verify-logs/<step>.log`, and exit non-zero when any step failed.

#### Scenario: Green run
- **WHEN** `yarn verify` is run on a healthy tree
- **THEN** every row shows `PASS` or `SKIP` (with reason), the exit code is 0, and `.verify-logs/` contains one log per executed step

#### Scenario: One failure does not hide the others
- **WHEN** the `spdx` step fails and `--fail-fast` is not given
- **THEN** the remaining steps still run and the summary lists `spdx FAIL` and the process exits 1

### Requirement: Per-app step uses the app's own contract
For each app the step SHALL run the app's `verify` script when it exists, otherwise the scripts among `typecheck`, `lint`, `test`, `build` that exist, in that order, using the package manager recorded in `tools/lib/targets.mjs`; an app without `package.json` or without any of these scripts SHALL be reported `SKIP`.

#### Scenario: Admin app uses its verify script
- **WHEN** `admin-app/package.json` defines `verify`
- **THEN** the step runs the app's `verify` script (`yarn verify`) in `admin-app/` and not the four scripts separately

### Requirement: Strict mode for releases
`--strict` SHALL turn every `SKIP` into `FAIL`, SHALL pass `--require-empty-pending` to the forbidden-terms guard, SHALL pass `--strict` to the hygiene check (which then rejects `_pending` folders), and SHALL require `--connect` semantics (the `connect-validate` step must run and pass; if the `commercetools` CLI or Docker is missing the step FAILS).

#### Scenario: Skip is a failure in strict mode
- **WHEN** `node tools/verify.mjs --strict` runs and `mcp/` has no `test` script
- **THEN** the `mcp` row is `FAIL (strict: nothing to run)`

#### Scenario: Pending list must be empty
- **WHEN** `tools/forbidden-pending.txt` still contains an entry and `--strict` is used
- **THEN** the `forbidden` step fails with `pending list must be empty in strict mode`

### Requirement: Installs are explicit
`verify` MUST NOT install dependencies unless `--install` is given, in which case each app runs its frozen-lockfile install (`yarn install --frozen-lockfile` for the Yarn 1 apps service, mcp and admin-app, `yarn install --immutable` for puck's Yarn 4) before its step.

#### Scenario: Default run is offline-friendly
- **WHEN** `yarn verify --only spdx,forbidden` is run without network
- **THEN** it passes without attempting any install

### Requirement: No hosted CI
The repository MUST NOT contain workflow files; `verify` is the only automation entry point.

#### Scenario: Workflow directory absent
- **WHEN** `ls .github` is run
- **THEN** it reports that the directory does not exist
