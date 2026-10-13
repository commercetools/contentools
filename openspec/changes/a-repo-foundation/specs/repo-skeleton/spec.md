## ADDED Requirements

### Requirement: Target directory skeleton
The repository SHALL contain the directories `service/`, `admin-app/`, `mcp/`, `puck/`, `docs/`, `tools/`, `openspec/` at its root; the repository MUST NOT contain a `.github/workflows` directory (quality gates are local scripts, Connect builds and deploys), and the folder names of Connect apps SHALL equal their future `deployAs[].name` (`service`, `admin-app`, `mcp`).

#### Scenario: Skeleton present
- **WHEN** a developer lists the repository root after spec A is implemented
- **THEN** all seven directories exist and `contentools/` (old name) and `cms/` do not exist

### Requirement: Root package.json is a tooling hub only
The root `package.json` MUST be `private`, MUST NOT declare a `workspaces` field, and MUST NOT declare `dependencies` or `devDependencies`.

#### Scenario: No workspaces at root
- **WHEN** `node -e "const p=require('./package.json');process.exit(p.workspaces||p.dependencies||p.devDependencies?1:0)"` is run at the root
- **THEN** the exit code is 0

### Requirement: Node version pinned
The repository SHALL pin Node 22 in a root `.nvmrc` containing exactly `22`, and the root `package.json` SHALL declare `"engines": { "node": ">=22" }`.

#### Scenario: nvm picks Node 22
- **WHEN** `cat .nvmrc` is run
- **THEN** it prints `22`

### Requirement: Ignore rules prevent secrets and build output
The root `.gitignore` SHALL ignore `node_modules`, `build/`, `dist/`, `coverage/`, `.env`, `.env.*` (except `.env.example`), `.DS_Store`, `*.log`, `*.tgz`, `.connect/`, `.yarn/cache`, `.yarn/install-state.gz`, `admin-app/public/`, `service/temp/`, `plans/evidence/` and `.claude/settings.local.json`.

#### Scenario: Env file ignored, example tracked
- **WHEN** `git check-ignore -v service/.env service/.env.e2e service/.env.example` is run in a scratch git repo seeded with the tree
- **THEN** `.env` and `.env.e2e` are reported as ignored and `.env.example` is not

### Requirement: MIT license at the root only
The repository SHALL contain a single `LICENSE` at the root with the MIT text and the line `Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors`; no sub-directory SHALL contain its own `LICENSE`.

#### Scenario: One LICENSE
- **WHEN** `find . -name 'LICENSE*' -not -path './node_modules/*'` is run
- **THEN** only `./LICENSE` is printed
