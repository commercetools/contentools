## ADDED Requirements

### Requirement: Static Connect contract check
`tools/check-connect-contract.mjs` SHALL read the root `connect.yaml` as text (documented subset) and fail (exit 1, printing `connect.yaml:<line>: <rule>`) unless: it exists at the repo root; every `deployAs[].name` has a sibling folder with a `package.json`; every `applicationType` is `service` or `merchant-center-custom-application`; `service` has `endpoint: /service` and `mcp` has `endpoint: /mcp` (both of type `service`); a `merchant-center-custom-application` block has no `endpoint`; exactly one top-level `inheritAs.apiClient.scopes` list exists and does not contain `manage_project`; no `configuration` key named `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`, `CTP_API_URL` or `CTP_AUTH_URL`; every key whose name contains `SECRET`, `TOKEN`, `PRIVATE_KEY`, `PASSWORD` or `API_KEY` is under `securedConfiguration`.

#### Scenario: Secret in the wrong section
- **WHEN** `SERVICE_API_TOKEN` is listed under `standardConfiguration` of the `service` block
- **THEN** the check exits 1 with `connect.yaml:<n>: secret-like key must be in securedConfiguration`

#### Scenario: Folder missing
- **WHEN** `connect.yaml` declares `name: mcp` and `mcp/` does not exist
- **THEN** the check exits 1 with `app folder missing: mcp`

### Requirement: App package contract
Each Connect app's `package.json` MUST NOT contain `workspaces`, MUST declare `engines.node` satisfying Node 22 (`>=22`), `service` and `mcp` MUST define the scripts `build`, `start` and `test`, and any `scripts.postDeploy`/`scripts.preUndeploy` command in `connect.yaml` of the form `yarn <s>` or `yarn run <s>` MUST reference an existing script `<s>` of that app.

#### Scenario: Missing start script
- **WHEN** `service/package.json` has no `start` script
- **THEN** the check fails naming `service: missing script "start"`

### Requirement: Per-app checkers are included
When `tools/check-admin-app-connect.mjs` exists the check SHALL run it and fail if it fails.

#### Scenario: L's checker integrated
- **WHEN** `node tools/check-connect-contract.mjs` runs and the admin-app block has a stray `endpoint:`
- **THEN** the overall result is a failure that includes L's message

### Requirement: Connect CLI remains the authority
`verify --connect` SHALL run `commercetools connect validate .` from the repo root and fail on non-zero exit; when the CLI is not installed the step SHALL print the install command (`npm install -g @commercetools/cli`) and count as `SKIP` (`FAIL` under `--strict`).

#### Scenario: CLI missing
- **WHEN** `--connect` is given and `commercetools` is not on `PATH`
- **THEN** the step is `SKIP` with the install hint (or `FAIL` with `--strict`)
