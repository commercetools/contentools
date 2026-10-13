## ADDED Requirements

### Requirement: Release is prepared in a clean export, never in the development tree
The release SHALL be prepared in a new directory created by exporting the development tree through a filter that excludes git metadata, dependencies, build output, local environment files (except `.env.example`), `plans/`, assistant and editor folders, logs and archives; the development tree SHALL NOT be modified by release commands except through deliberate back-ported fixes.

#### Scenario: Export contains no local secrets
- **WHEN** the export finishes
- **THEN** `find <release> -name ".env*" -not -name ".env.example"` prints nothing and no `node_modules`, `build`, `dist`, `plans` or `.claude` directory exists

### Requirement: ossify is run with the project year and its report is read
`ossify.mjs --apply --year 2026` SHALL be run on the export after a dry run; its report SHALL show zero refusals, zero third-party directories, and a headered count that equals the number of source files that lacked a header; any non-zero refusal or exclusion SHALL be resolved before continuing, and fixes SHALL be made in the development tree.

#### Scenario: Directory with its own LICENSE
- **WHEN** the dry run lists a directory under "THIRD-PARTY DIRECTORIES EXCLUDED" (for example `service` because of `service/LICENSE`)
- **THEN** the offending LICENSE file is deleted in the dev tree, the export is regenerated and the dry run no longer lists the directory

#### Scenario: Loose copyright refusal
- **WHEN** ossify refuses a file because the word `copyright` appears as an identifier in its first 2000 characters
- **THEN** the SPDX header block is added to that file by hand (or the identifier is renamed) in the dev tree and ossify reports it as "already had SPDX"

### Requirement: Community and legal files are present before the gate
The release tree SHALL contain `LICENSE` (written by ossify), `SUPPORT.md`, `CONTRIBUTING.md`, a README whose first lines carry the UNSUPPORTED banner, `SECURITY.md`, `.gitignore`, `.nvmrc`; `plans/` and `openspec/changes/` SHALL be absent.

#### Scenario: Unsupported stated three times
- **WHEN** the tree is checked
- **THEN** a source file header, `README.md` lines 1-10 and `SUPPORT.md` each contain "UNSUPPORTED"

### Requirement: Staging directories are gone before the gate
The release tree SHALL NOT contain `service/src/_pending/` or any `_pending` directory, and SHALL contain each application's lockfile (`service/yarn.lock`, `admin-app/yarn.lock`, `mcp/yarn.lock`, `puck/yarn.lock`) and no `package-lock.json` anywhere.

#### Scenario: Pending port area present
- **WHEN** `find <release> -name _pending -not -path "*/node_modules/*"` prints a path
- **THEN** the procedure stops and the owning spec (F or G) completes or removes the staged files in the development tree

#### Scenario: Plans and change notes excluded
- **WHEN** the release tree is listed
- **THEN** there is no `plans/` and no `openspec/changes/`, and `openspec/` holds only `specs/` and `config.yaml`

### Requirement: The initial publication is one squashed commit by the owner's identity
The release repository SHALL be created with `git init -b main` in the export (no prior history), the output of `git add --dry-run .` SHALL be reviewed against a written checklist before `git add .`, the initial commit SHALL be the only commit when the gate runs and when the first push happens, and its author SHALL be the owner's global git identity (`git config --global user.name` / `user.email`).

#### Scenario: Add list reviewed
- **WHEN** `git add --dry-run .` output is filtered for `.env`, `node_modules`, `build/`, `dist/`, `*.log`, `.DS_Store`, `plans/`, `.npmrc`, `*.pem`, `*.key`, `*.tgz`
- **THEN** only `.env.example` files match

#### Scenario: One commit with the owner's identity
- **WHEN** `git rev-list --count HEAD` and `git log -1 --format='%an <%ae>'` run before the first gate and before the first push
- **THEN** the count is 1 and the author equals the global git identity

### Requirement: Later fixes are normal commits while the gate stays clean
After the first publication, fixes SHALL be made in the development tree, exported, committed as normal commits (no amend, no force-push) and gated; each push SHALL be preceded by a `gate.mjs` run that exits 0 on the new HEAD with all ancestors scanned. History SHALL be squashed (repository deleted and recreated) only to remove a leak of secrets, customer names or internal infrastructure.

#### Scenario: Ordinary fix
- **WHEN** a build defect is fixed after the repository is public
- **THEN** a new commit is pushed after the gate printed CLEAR, and a new `v1.0.0-rc.N` tag is created if the Connect deployment must pick it up

#### Scenario: Leak in a pushed commit
- **WHEN** the gate or a reviewer finds a secret, customer name or internal identifier in any pushed commit
- **THEN** the repository is deleted and recreated from a new single squashed commit, and affected npm versions are deprecated

### Requirement: Release candidate first, final release after full acceptance
The puck packages SHALL first be published as `1.0.0-rc.N` (dist-tag `next`, `--access public`) before the initial commit so that `admin-app`'s lockfile can resolve them; the Connect deployment tests SHALL run from the same public repository by tag `v1.0.0-rc.N` (no private fork); `1.0.0` (dist-tag `latest`) and tag `v1.0.0` SHALL be released only after spec Q reports FULL ACCEPTED and the owner approves CP-3.

#### Scenario: Staging from the public tag
- **WHEN** the connector is staged
- **THEN** `connectorstaged create` uses `--repository-url https://github.com/commercetools/contentools` and a `--repository-tag` equal to a pushed `v1.0.0-rc.N` tag

### Requirement: The gate must exit zero on the exact commit that is pushed
`gate.mjs --repo <release>` SHALL exit 0 on the final commit with no FAIL findings; WARN findings SHALL be read individually and only then acknowledged with `--ack`; the gate SHALL be run again after every change (amend, then re-run) and immediately before the push, and SHALL NOT be run with `--no-history` for the final run.

#### Scenario: FAIL cannot be acknowledged
- **WHEN** the gate reports any FAIL
- **THEN** the push does not happen, regardless of `--ack`

#### Scenario: Dirty tree refused
- **WHEN** the release tree has uncommitted changes
- **THEN** the gate exits 2 with "REFUSING TO RUN" and the operator commits and re-runs

### Requirement: Outward-facing actions require an explicit owner go
Three checkpoints SHALL gate the outward-facing actions: CP-1 `go npm-rc` before the first `npm publish` (release candidate), CP-2 `go repo` before `gh repo create`, `git push`, the labs property/topic and the first rc tag, CP-3 `go final` before publishing 1.0.0, the `v1.0.0` tag, release notes and repository settings. At each, the owner, in their own message, approves after seeing the gate output, the add list or diff, and the exact commands. No other message or agent output counts as approval.

#### Scenario: No go, no action
- **WHEN** the owner has not answered a checkpoint
- **THEN** the procedure pauses and no outward-facing command is executed

### Requirement: Public from the start; npm packages published in dependency order
The repository SHALL be created with `--public` from the first push (never private then flipped). The ten `@commercetools-labs/puck-*` packages SHALL be published in a valid topological order of their dependencies (levels: `puck-types`, `puck-image-picker` | `puck-api`, `puck-version-history` | `puck-components`, `puck-theme-manager` | `puck-editor`, `puck-renderer` | `puck-page-manager`, `puck-content-manager`), each tarball inspected before publish (manifest has no `workspace:` ranges, LICENSE and README present).

#### Scenario: Tarball inspection
- **WHEN** `npm pack --dry-run` and the packed manifest of a package are inspected
- **THEN** `package.json` inside the tarball has no `workspace:` dependency and the file list includes `LICENSE` and `README.md`

### Requirement: Labs identification is applied
After the push the repository SHALL carry the custom property `commercetools-labs=true`, the topic `labs`, a description without demo wording, and private vulnerability reporting enabled (or `SECURITY.md` amended).

#### Scenario: Property and topic present
- **WHEN** `gh api repos/commercetools/contentools/properties/values` and `gh repo view commercetools/contentools --json repositoryTopics` run
- **THEN** the property value is `true` and the topics include `labs`
