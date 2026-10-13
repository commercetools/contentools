## ADDED Requirements

### Requirement: Root scripts delegate to each app
The root `package.json` SHALL define the scripts `install:all`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `verify`, `headers`, `check:spdx`, `test:tools`, `gate`, each of which runs through `tools/run-all.mjs` or a `tools/*.mjs` script, using the package manager recorded in `tools/lib/targets.mjs` (Yarn 1 for `service`, `mcp` and `admin-app`, Yarn 4 for `puck`).

#### Scenario: run-all skips absent scripts but fails on failing scripts
- **WHEN** `node tools/run-all.mjs lint` runs and an app has no `lint` script
- **THEN** that app is reported `skip` and the run continues; and if an app's script exits non-zero the runner exits non-zero after printing which app failed

### Requirement: Publish tooling wrapper never embeds policy
`tools/labs-publish.mjs` SHALL locate the presales `commercetools-labs-publish` scripts via `LABS_PUBLISH_DIR` or the newest match under `~/.claude/plugins/cache/presales-plugin/presales/*/skills/commercetools-labs-publish/scripts`, and forward `ossify` (dry run by default, `--apply` explicit) and `gate` with `--repo <root>`. It MUST NOT copy, read or print `policy.json`.

#### Scenario: Dry run by default
- **WHEN** `node tools/labs-publish.mjs ossify` is run
- **THEN** ossify runs without `--apply` and no file changes

#### Scenario: Missing skill
- **WHEN** no scripts directory can be found
- **THEN** the wrapper exits 2 with a message naming `LABS_PUBLISH_DIR`

### Requirement: SPDX checker
`tools/check-spdx-headers.mjs` SHALL verify the exact header text in the first 6 lines of every source file (same extension and skip rules as ossify) using `git ls-files` when `.git` exists and a filesystem walk otherwise, and exit 1 listing offenders.

#### Scenario: Offender reported
- **WHEN** a `.ts` file without a header exists
- **THEN** the checker prints its path and exits 1

### Requirement: Tool scripts are tested
Every `tools/*.mjs` script SHALL have a `node --test` test in `tools/test/` and `yarn test:tools` MUST pass.

#### Scenario: Tool tests green
- **WHEN** `yarn test:tools` is run
- **THEN** all tests pass
