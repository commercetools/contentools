## ADDED Requirements

### Requirement: npm scope is commercetools-labs in service and mcp
Every import, dependency entry and README snippet in `service/` and `mcp/` SHALL use `@commercetools-labs/`; the same rename in `puck/` and `admin-app/` is performed by specs I and K and those trees are pending-list prefixes until then.

#### Scenario: Scope grep is empty for service and mcp
- **WHEN** `node tools/check-forbidden-terms.mjs --no-pending --list` is run
- **THEN** no file under `service/` or `mcp/` is listed with term `demo`

### Requirement: No cms identifiers in service and mcp
Directories, files, exports, env vars and prose in `service/` and `mcp/` MUST NOT contain the letters `cms` in any case (`samples/CMS` -> `samples/content-types`, constant `CMS_DEPLOYED_URL_KEY` deleted); the final replacements for `puck/` (`components/cms` -> `components/blocks`, "Puck CMS" descriptions) and `admin-app/` (`CMS_API_URL` -> `CONTENTOOLS_SERVICE_URL`, badge `CMS` -> `Contentools`) are specified in tasks.md Section 6 and executed by I and K.

#### Scenario: Samples directory renamed with import fixed
- **WHEN** `yarn tsc --noEmit` is run in `service/` after the rename
- **THEN** it exits 0 and `grep -rIil cms service --exclude-dir=node_modules` prints nothing

### Requirement: Internal hosts and names are gone
No tracked file SHALL contain `ct-poc`, `run.app`, `Cloud Run`, `sellertools`, `frontend.site`, `multitenant`, `contenttools` or the pre-sales/POC wording, except files named in `tools/forbidden-pending.txt` that are owned by a later spec.

#### Scenario: Only pending files remain
- **WHEN** `node tools/check-forbidden-terms.mjs --no-pending --list` is run
- **THEN** every reported file is listed in `tools/forbidden-pending.txt` with an owner comment

### Requirement: MCP naming
The MCP package SHALL be named `@commercetools-labs/contentools-mcp`, its classes `ContentoolsAgent`, `ContentoolsAPI`, `ContentoolsTool`, `createContentoolsMcpServer`, and its server name `contentools-mcp`.

#### Scenario: Typo removed
- **WHEN** `grep -rIil contenttools mcp` is run
- **THEN** it prints nothing

### Requirement: Hand-over of puck and admin-app renames
tasks.md Section 6 SHALL list, for specs I and K, every rename (files, lines, old/new text) so that no forbidden word is left unowned; `tools/forbidden-pending.txt` SHALL contain the prefixes `puck/` (owner I,J) and `admin-app/` (owner K).

#### Scenario: Ownership explicit
- **WHEN** `cat tools/forbidden-pending.txt` is run after C
- **THEN** every line carries an owner comment and the two prefixes are present
