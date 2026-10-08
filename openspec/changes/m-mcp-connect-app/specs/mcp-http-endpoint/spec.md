## ADDED Requirements

### Requirement: Stateless Streamable HTTP MCP endpoint
The `mcp` application SHALL serve the Model Context Protocol over Streamable HTTP at `POST /mcp` without server-side sessions: each POST MUST be handled by a freshly created `McpServer` and `StreamableHTTPServerTransport` configured with `sessionIdGenerator: undefined` and `enableJsonResponse: true`, both closed when the response closes. `GET /mcp` and `DELETE /mcp` SHALL return HTTP 405 with `Allow: POST` and a JSON-RPC error body.

#### Scenario: initialize and list tools without a session
- **WHEN** an authenticated client POSTs a JSON-RPC `initialize` and then `tools/list` to `/mcp`, each as a separate HTTP request with no `Mcp-Session-Id` header
- **THEN** both requests succeed with `200` and `Content-Type: application/json`, and `tools/list` returns the registered tools

#### Scenario: two instances behave identically
- **WHEN** consecutive `tools/call` requests are served by different process instances
- **THEN** each succeeds because no state is held between requests

#### Scenario: GET and DELETE are rejected
- **WHEN** a client sends `GET /mcp` or `DELETE /mcp`
- **THEN** the response is `405`, includes `Allow: POST`, and the body is a JSON-RPC error object

#### Scenario: oversized or malformed body
- **WHEN** the POST body is not valid JSON, or exceeds the configured body limit
- **THEN** the response is `400` (JSON-RPC code -32700) or `413` respectively and no tool is executed

### Requirement: Connect application packaging
The repository SHALL contain a folder `mcp/` equal to the `deployAs[].name` `mcp` in the root `connect.yaml`, with `applicationType: service` and `endpoint: /mcp`; the Express router MUST be mounted at `/mcp`. The app MUST be self-contained (own `package.json`, no workspaces, no imports outside `mcp/`) and target Node 22.

#### Scenario: connect.yaml validates
- **WHEN** `commercetools connect validate` is run at the repository root
- **THEN** it passes and lists an application `mcp` of type `service` with endpoint `/mcp`

#### Scenario: build from a clean checkout of the folder
- **WHEN** `yarn install --frozen-lockfile && yarn gcp-build && yarn start` is run inside `mcp/` with valid environment variables
- **THEN** the server listens on port 8080 and `GET /mcp/status` returns `200`

### Requirement: Fail-fast configuration
The app SHALL validate all environment variables once at startup and MUST exit non-zero with a message naming every invalid variable (never its value) if `CONTENT_SERVICE_URL` is not an `https://` URL (or `http://localhost` for local runs), `MCP_ACCESS_TOKEN` or `SERVICE_API_TOKEN` is missing or shorter than 32 characters, `MCP_ENABLE_WRITES` is not `true|false`, or `MCP_TOOL_GROUPS` names an unknown group.

#### Scenario: missing access token
- **WHEN** the process starts without `MCP_ACCESS_TOKEN`
- **THEN** it exits with a non-zero code and the log names `MCP_ACCESS_TOKEN` as missing, and no port is opened

### Requirement: Health endpoint and structured logs
The app SHALL expose `GET /mcp/status` (unauthenticated, no secrets in body) returning `200 {"status":"ok"}` and SHALL write one JSON log line per MCP request and per tool call containing a correlation id, tool name, outcome and duration, and MUST NOT log tool argument values, tokens, or response bodies.

#### Scenario: log hygiene
- **WHEN** a `create_puck_page` tool call is executed with a page named "Secret launch"
- **THEN** the log line contains the tool name and outcome but not the string "Secret launch" and no token

### Requirement: Deploy-time dependency validation
`postDeploy` SHALL run an idempotent, read-only probe of the content service: first the public `GET <CONTENT_SERVICE_URL>/health` (reachability), then an authenticated read using the configured `SERVICE_API_TOKEN`. It MUST fail the deployment only when the service answers `401` or `403` (credential mismatch); an unreachable service or a `5xx` SHALL produce a warning and not fail the deployment.

#### Scenario: wrong service token
- **WHEN** the service answers the probe with 401
- **THEN** `yarn connector:post-deploy` exits non-zero with a message that `SERVICE_API_TOKEN` does not match the service

#### Scenario: service not yet deployed
- **WHEN** the health probe cannot connect
- **THEN** the script logs a warning and exits 0

### Requirement: Documented operations
`mcp/README.md` SHALL state the configuration table, required scopes (none beyond what the service holds), fail-open/fail-closed behaviour, the absence of a replay runbook (synchronous, stateless, no queue), and the unsupported banner.

#### Scenario: README completeness
- **WHEN** the README is reviewed against the Connect production-readiness checklist
- **THEN** every applicable item (auth, secrets, health, fail mode, stateless) is addressed in text
