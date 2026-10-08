## ADDED Requirements

### Requirement: README states unsupported status and describes the single-project system
The root `README.md` SHALL open with a blockquote banner stating that the repository is commercetools-labs reference code, freely available under the MIT license, AS IS and UNSUPPORTED, linking `SUPPORT.md` and `LICENSE`. It SHALL describe one commercetools project served by one Connect deployment and SHALL NOT mention multitenancy, Firestore, Cloud Run, a "demo"/"POC"/"pre-sales" framing, or the three letters "cms" in any case.

#### Scenario: Banner present
- **WHEN** the first 10 lines of `README.md` are read
- **THEN** they contain the words "UNSUPPORTED", a link to `SUPPORT.md` and a link to `LICENSE`

#### Scenario: Forbidden wording absent
- **WHEN** `node tools/check-docs-lint.mjs` runs
- **THEN** it exits 0 and no tracked `*.md` contains `\bcms\b` (case-insensitive), `multi-?tenan`, `firestore`, `cloud run`, `\bdemo\b`, `\bPOC\b` or `pre-?sales` outside an explicit allow-list entry

#### Scenario: Links resolve
- **WHEN** the docs lint resolves every relative markdown link in the root docs and `docs/`
- **THEN** every target file exists

### Requirement: INSTALL.md lets a stranger deploy and verify on Connect
`INSTALL.md` SHALL give an ordered procedure: prerequisites, creating the commercetools API access needed to deploy, local run, Merchant Center custom application registration (placeholder URL first), Connect staging and deployment (first deploy, then second deploy with real URLs), moving the application to Ready and installing it, verification checks, and troubleshooting. Every configuration key mentioned SHALL exist in `connect.yaml`.

#### Scenario: Config keys match connect.yaml
- **WHEN** `node tools/check-docs-config.mjs` extracts every `key:` under `configuration` and `inheritAs.configuration` in `connect.yaml`
- **THEN** each key appears in the configuration table of `INSTALL.md` or in `service/README.md`, `admin-app/README.md` or `mcp/README.md`, and every key in those tables exists in `connect.yaml` or is an injected `CTP_*` variable

#### Scenario: Register-first order documented
- **WHEN** a reader follows `INSTALL.md` from the top
- **THEN** the Merchant Center registration step precedes the first `deployment create`, and the second deploy step sets the real application URL

### Requirement: Architecture and API reference match the code
`docs/architecture.md` SHALL explain the components (service, admin-app, mcp, puck packages), the request/auth flow, storage (custom object containers, media backends), and the Connect topology. `docs/api-reference.md` SHALL list every mounted route with method, path, auth requirement, request summary and success status, grouped as in the route files, with the access policy of spec E (public: health, status, published reads, configuration reads; everything else Token) and the error body `{message, statusCode, correlationId, code?, errors?}`.

#### Scenario: Every documented route is mounted
- **WHEN** `yarn --cwd service test tests/docs/api-reference.test.ts` parses the route table of `docs/api-reference.md` and requests each route without credentials
- **THEN** no response is a 404 (a 401/403/400/200 proves the route exists)

#### Scenario: Removed surface not documented
- **WHEN** the route table is searched for `authenticate-project`, `refresh-jwt`, `proxy-script`, `compile-upload`, `content-items`, `page-rows`, `page-components`
- **THEN** none is found

### Requirement: Runbook covers operation without an event pipeline
`docs/runbook.md` SHALL document: redeploy after configuration change (partial-merge semantics) and after code change (tag -> setRepository -> publish -> redeploy with `updateConnector`), rotating `SERVICE_API_TOKEN`, reading logs with the correlation id, health check, content backup/restore via custom objects, and an explicit "Poison messages and replay: not applicable" section explaining that the connector has no event, job or subscription application.

#### Scenario: Rotation procedure is complete
- **WHEN** a reader follows the "Rotate SERVICE_API_TOKEN" section
- **THEN** it lists generating a new token, the redeploy command with only that key, updating each client (MCP client config, Postman variable, any server-to-server caller), and verifying the old token returns 401 and the new one 200

#### Scenario: Poison/replay explicitly not applicable
- **WHEN** the runbook is searched for "replay"
- **THEN** the only hit is the "not applicable" section stating there is no event/subscription application and what to do on a failed request instead

### Requirement: Every published package has a README
Each of the 10 `puck/packages/*` SHALL contain a `README.md` with: purpose, install command (`@commercetools-labs/<name>`), exported API summary, required peer dependencies, a minimal usage snippet, the auth/connection props it takes (where applicable), and the MIT/unsupported line. `puck/README.md`, `puck/playground/README.md`, `service/README.md`, `admin-app/README.md`, `mcp/README.md` SHALL exist.

#### Scenario: README present and packaged
- **WHEN** `npm pack --dry-run` runs in each `puck/packages/*`
- **THEN** the file list contains `README.md`

#### Scenario: Peer list matches package.json
- **WHEN** the package README peer-dependency list is compared with `peerDependencies` in its `package.json`
- **THEN** the sets are equal (checked by `tools/check-docs-lint.mjs`)

### Requirement: FEATURES.md maps features to code
`FEATURES.md` SHALL list each retained feature (pages, content items, states, versions, templates, theme and configuration documents, datasources, media, business-unit scoping, renderer, Merchant Center app, MCP) with the repository path that implements it.

#### Scenario: Paths exist
- **WHEN** the docs lint extracts every backticked repo path from `FEATURES.md`
- **THEN** each exists in the tree
