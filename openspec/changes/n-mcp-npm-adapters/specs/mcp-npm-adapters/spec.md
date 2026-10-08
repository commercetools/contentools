## ADDED Requirements

### Requirement: Adapters share the tool core
The AI SDK adapter, the LangChain adapter and the MCP server factory SHALL be built from the same `src/core` definitions used by the Connect app; there MUST be no second copy of tool names, schemas, routes or error mapping. Every adapter tool call SHALL run through `runTool`.

#### Scenario: same catalog everywhere
- **WHEN** the adapters are created with all groups and writes enabled
- **THEN** each exposes exactly the 44 tool names of spec M, and a table-driven test proves the names equal `ALL_TOOLS`

#### Scenario: identical behaviour
- **WHEN** `get_puck_page` is executed through the AI SDK adapter, the LangChain adapter and the MCP server against the same mocked service
- **THEN** the outbound HTTP request is identical in all three and the returned text is identical

### Requirement: AI SDK adapter
`@commercetools-labs/contentools-mcp/ai-sdk` SHALL export `createAiSdkTools(options)` returning a `Record<string, Tool>` usable with `generateText`/`streamText`, where `options` = `{ baseUrl, token, defaultBusinessUnitKey?, groups?, enableWrites?, timeoutMs?, fetch? }`. Write tools MUST be absent unless `enableWrites` is true (default false).

#### Scenario: read-only by default
- **WHEN** `createAiSdkTools({ baseUrl, token })` is called
- **THEN** the result has 24 tools and none of `create_puck_page`, `delete_puck_page`

#### Scenario: tool execution
- **WHEN** a tool's `execute` is called with valid input and the service answers 200
- **THEN** it resolves to the JSON text of the service body; on a service 404 it resolves to a string starting `Service returned 404` (it does not throw), so the model can read the failure

### Requirement: LangChain adapter
`@commercetools-labs/contentools-mcp/langchain` SHALL export `createLangChainTools(options)` (same options) returning `DynamicStructuredTool[]` with strict zod schemas.

#### Scenario: invoke
- **WHEN** a returned tool is `invoke`d with `{ key: "k" }` (for `get_puck_page`)
- **THEN** the service receives `GET <baseUrl>/default/puck-pages/k` with `Authorization: Bearer <token>`

### Requirement: Credentials only from configuration
Adapter and stdio inputs MUST NOT let a tool argument set the token, base URL or business-unit default; the token is sent only to `baseUrl`; it MUST NOT be logged or placed in tool output. There is no `projectKey` anywhere.

#### Scenario: extra argument rejected
- **WHEN** a tool is invoked with an unknown key `token`
- **THEN** the call returns a validation error string/throws a validation error and no HTTP request is made

### Requirement: MCP server factory and stdio entry
The package SHALL export `createContentoolsMcpServer` from `./mcp` (optional peer `@modelcontextprotocol/sdk`) and a bin `contentools-mcp` that serves it over stdio configured by environment (`CONTENT_SERVICE_URL`, `SERVICE_API_TOKEN`, `DEFAULT_BUSINESS_UNIT_KEY`, `MCP_ENABLE_WRITES`, `MCP_TOOL_GROUPS`). stdout MUST carry only JSON-RPC; diagnostics go to stderr.

#### Scenario: inspector over stdio
- **WHEN** `npx @modelcontextprotocol/inspector --cli node dist/bin/stdio.js --method tools/list` runs with the env set
- **THEN** it lists the read tools (24 by default)

#### Scenario: missing configuration
- **WHEN** the bin starts without `SERVICE_API_TOKEN`
- **THEN** it prints the missing variable name to stderr and exits 1

### Requirement: No Mastra
Documentation, `package.json`, scripts and ignore files SHALL NOT mention Mastra or a `./mastra` export.

#### Scenario: grep gate
- **WHEN** `grep -rni mastra mcp --exclude-dir=node_modules --exclude-dir=openspec` runs
- **THEN** it finds nothing
