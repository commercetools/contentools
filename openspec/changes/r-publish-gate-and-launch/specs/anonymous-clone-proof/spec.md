## ADDED Requirements

### Requirement: Anonymous clone builds every part
From a fresh directory, with an empty HOME, no git credentials and no npm configuration, a clone of the public repository SHALL install, typecheck, test and build `service/`, `admin-app/`, `mcp/` (Yarn 1 classic, `yarn install --frozen-lockfile`) and `puck/` (Yarn 4.5.1, `--immutable`, including the playground), and `commercetools connect validate` SHALL pass.

#### Scenario: Each application
- **WHEN** the documented proof commands run for each of `service`, `admin-app`, `mcp`, `puck`
- **THEN** each exits 0 and the log is saved

#### Scenario: Registry packages resolve without credentials
- **WHEN** `admin-app` installs with the lockfile from the clone and no npm token
- **THEN** every `@commercetools-labs/puck-*` dependency resolves from the public registry at the pinned version

### Requirement: Published tree matches the gated commit
The commit hash of the clone at the proven ref SHALL equal the hash that the gate run reported for it, and for the initial publication the clone SHALL contain exactly one commit (later refs: the commit count recorded at that release).

#### Scenario: Hash equality
- **WHEN** `git rev-parse HEAD` in the clone (after `REF` checkout) is compared with the "commit" line of the gate output
- **THEN** the first 8 characters are equal and, for the rc tag of the initial publication, `git rev-list --count HEAD` prints 1

### Requirement: Post-publication scan
After the push, the same gate SHALL be run against the anonymous clone (clean tree) and exit 0, and a text search of the clone SHALL find no occurrence of the removed vocabulary (the three letters "cms", multi-tenant wording, Firestore, Cloud Run, internal hosts).

#### Scenario: Gate on the clone
- **WHEN** `gate.mjs --repo <clone>` runs
- **THEN** it exits 0

### Requirement: Failure handling
An ordinary defect found by the proof SHALL be fixed with a normal commit that passes the gate. If a leak (secret, customer name, internal identifier) is found after the push, the procedure SHALL be: stop, rotate any exposed secret, delete the repository, fix the release tree, and repeat from the squashed initial commit; a force-push SHALL NOT be used as a fix.

#### Scenario: Leak found
- **WHEN** a leak exists in a public commit
- **THEN** the repository is deleted and recreated rather than force-pushed
