## ADDED Requirements

### Requirement: No CI or deployment-pipeline files
`tools/check-repo-hygiene.mjs` SHALL fail when the tree contains `.github/`, `.gitlab-ci.yml`, `.circleci/`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `cloudbuild.yaml`, `Dockerfile*` or `docker-compose*.yml`.

#### Scenario: Workflow file added
- **WHEN** `.github/workflows/ci.yml` exists
- **THEN** the check exits 1 naming that path and the rule `no CI files (Connect builds and deploys)`

### Requirement: No pending work folders at release
With `--strict` the check SHALL fail when any directory named `_pending` exists anywhere in the tree (work-in-progress material such as `service/src/_pending` must be gone before a release); without `--strict` it SHALL not report them.

#### Scenario: Pending folder blocks a release
- **WHEN** `service/src/_pending/x.ts` exists and `node tools/check-repo-hygiene.mjs --strict` is run
- **THEN** it exits 1 with `no _pending folder at release`, while the run without `--strict` exits 0

### Requirement: Forbidden files
The check SHALL fail on `.env` and `.env.*` (except `*.example`), `*.pem`, `*.key`, `.npmrc`, `package-lock.json`, `*.tgz`, `.DS_Store`, files named like `*service-account*.json`, a tracked `node_modules`, and any `LICENSE*` file other than the root `LICENSE`.

#### Scenario: Env file
- **WHEN** `service/.env` exists in the scanned tree
- **THEN** the check exits 1

### Requirement: Yarn lockfiles
The check SHALL fail on any `package-lock.json` anywhere, and with `--strict` SHALL fail when `service/`, `admin-app/`, `mcp/` or `puck/` has a `package.json` but no committed `yarn.lock`.

#### Scenario: npm lockfile
- **WHEN** `service/package-lock.json` exists
- **THEN** the check exits 1 with `no package-lock.json (Yarn only)`

#### Scenario: Missing yarn.lock at release
- **WHEN** `mcp/package.json` exists without `mcp/yarn.lock` and `--strict` is given
- **THEN** the check exits 1 naming `mcp/yarn.lock`

### Requirement: Secret patterns
The check SHALL fail on the public patterns `ghp_`/`gho_`/`github_pat_` tokens, `sk-` keys of 20+ characters, `AIza` keys, Slack tokens `xox[baprs]-`, PEM private-key blocks, and assignments of values of 16+ characters to variables whose name contains `SECRET`, `PASSWORD`, `TOKEN` or `PRIVATE_KEY`, ignoring `*.example`, `openspec/`, `plans/`, test and fixture paths (`tests/`, `__tests__/`, `e2e/`, `tools/test/`, `*.test.*`) and lines containing `hygiene-ok`.

#### Scenario: Token committed
- **WHEN** a source file contains `const t = 'ghp_' + ...` expanded to a 40-character GitHub token
- **THEN** the check exits 1 with the path and line (the matched text is NOT printed)

### Requirement: Relationship to the labs gate
The hygiene check SHALL NOT embed customer or internal names (that list lives only in the labs skill's policy and is applied by spec R) and SHALL state in its `--help` that it is a fast pre-check, not a replacement for `gate.mjs`.

#### Scenario: Help text
- **WHEN** `node tools/check-repo-hygiene.mjs --help` is run
- **THEN** the output contains `not a replacement for gate.mjs`
