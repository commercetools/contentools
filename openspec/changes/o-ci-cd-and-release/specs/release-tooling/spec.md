## ADDED Requirements

### Requirement: Preflight before any release action
`tools/release/preflight.mjs` SHALL succeed only when: `node tools/verify.mjs --strict` passes; the forbidden-terms pending list is empty; the versions of the root `package.json`, the ten `puck/packages/*` packages, `service`, `admin-app` and `mcp` are identical (lockstep, Q-05); and the version is valid semver. It SHALL print the release version and the expected npm dist-tag (`next` when the version has a prerelease part, otherwise `latest`).

#### Scenario: Version drift is caught
- **WHEN** `service/package.json` says `1.0.1` and the others `1.0.0`
- **THEN** preflight exits 1 listing each package and version

#### Scenario: Prerelease tag rule
- **WHEN** the lockstep version is `1.0.0-rc.0`
- **THEN** preflight prints `dist-tag: next`

### Requirement: Tagging is explicit and never pushes
`tools/release/tag.mjs <version>` SHALL by default (dry run) print the exact `git tag -a v<version> -m "Contentools <version>"` and `git push origin v<version>` commands; with `--execute` it SHALL require a clean git tree, a successful preflight and the operator typing the tag name, then create the annotated tag locally; it MUST NOT run `git push`.

#### Scenario: Dry run default
- **WHEN** `node tools/release/tag.mjs 1.0.0` is run
- **THEN** it prints the two commands and creates no tag

#### Scenario: Dirty tree refused
- **WHEN** `--execute` is given with uncommitted changes
- **THEN** it exits 1 with `git tree is not clean`

### Requirement: Release candidates and iteration
`tools/release/tag.mjs --next-rc` SHALL compute the next tag `v<base>-rc.<N>` from the existing local tags (starting at `rc.0`) for the lockstep version, accept explicit prerelease versions such as `1.0.0-rc.3`, and never move or delete an existing tag; the runbook SHALL state that after the repository is public fix commits are allowed only when the labs gate is clean (squash/recreate only for leaks).

#### Scenario: Next rc
- **WHEN** tags `v1.0.0-rc.0` and `v1.0.0-rc.1` exist and `--next-rc` is run (dry run)
- **THEN** it prints `git tag -a v1.0.0-rc.2 ...` and does not create it

### Requirement: Puck releases go through spec I's scripts
Root scripts `release:puck:bump` and `release:puck:publish` SHALL delegate to `yarn --cwd puck release:bump` and `yarn --cwd puck release:publish` respectively, passing through arguments; O MUST NOT duplicate the bump or publish logic, and MUST NOT define any trusted-publishing or token-based CI publish.

#### Scenario: Dry run by default
- **WHEN** `yarn release:puck:publish` is run
- **THEN** I's script runs in dry-run mode (no `--execute`) and nothing is published

### Requirement: Runbook
`tools/release/README.md` SHALL document, in order: verify (strict), choose version (rc under dist-tag `next` first), bump, preflight, commit, publish dry run, owner checkpoint, publish `--execute`, admin-app consuming the rc, final `1.0.0`, tag, push tag (owner), `connectorstaged create --repository-tag v<version>`, and rollback (`npm deprecate`, never `unpublish`).

#### Scenario: Runbook completeness
- **WHEN** the runbook is read
- **THEN** each step above is a numbered item with the exact command
