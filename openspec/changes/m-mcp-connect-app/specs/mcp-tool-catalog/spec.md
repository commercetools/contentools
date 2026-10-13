## ADDED Requirements

### Requirement: Kept-surface-only tool catalog
The MCP server SHALL expose exactly the 44 tools listed in `design.md` section "Tool catalog" (24 `read`, 20 `write`), each mapped to one service route, and MUST NOT expose any tool for legacy routes (`content-items`, grid `pages`, `page-items`, rows, components, `proxy-script`, `compile-upload`, `authenticate-project`, `refresh-jwt`, legacy `content-type` CRUD).

#### Scenario: catalog matches the contract
- **WHEN** all tool groups are enabled with `MCP_ENABLE_WRITES=true` and `tools/list` is called
- **THEN** the returned tool names equal the 44 names in the design table, with no extras

#### Scenario: no legacy names
- **WHEN** the registry is built
- **THEN** no tool name or route contains `content-items`, `/pages`, `page-items`, `proxy-script`, `compile-upload`, `authenticate-project`, `refresh-jwt`

### Requirement: Write gating
Tools classified `write` MUST NOT be registered (they are absent from `tools/list` and `tools/call` returns the SDK's unknown-tool error) unless `MCP_ENABLE_WRITES` is `true`.

#### Scenario: default is read-only
- **WHEN** the app runs with `MCP_ENABLE_WRITES` unset
- **THEN** `tools/list` returns the 24 read tools only

#### Scenario: writes enabled
- **WHEN** `MCP_ENABLE_WRITES=true`
- **THEN** `create_puck_page`, `publish_puck_page`, `upsert_configuration` and the other 17 write tools are listed

### Requirement: Tool group filter
`MCP_TOOL_GROUPS` SHALL accept `all` (default) or a comma-separated subset of `pages, contents, templates, configuration, datasources, products, media, content-types`; only tools in the selected groups (and passing the write gate) SHALL be registered.

#### Scenario: subset
- **WHEN** `MCP_TOOL_GROUPS=pages,products` and writes are disabled
- **THEN** only the 8 read tools of `pages` plus `search_products` are listed

### Requirement: Typed inputs and business-unit default
Every tool SHALL declare a zod input schema; BU-scoped tools MUST accept an optional `businessUnitKey` that defaults to `DEFAULT_BUSINESS_UNIT_KEY` (default `default`). Path segments MUST be percent-encoded. Tool inputs MUST NOT include credentials, project keys or URLs.

#### Scenario: default business unit
- **WHEN** `get_puck_page` is called with `{ "key": "home" }` and the default BU is `default`
- **THEN** the service request is `GET <service>/default/puck-pages/home`

#### Scenario: path segment encoding
- **WHEN** `get_puck_page` is called with key `a/b c`
- **THEN** the request path contains `a%2Fb%20c` and no extra path segment is created

### Requirement: Structured queries only
Query-by-predicate tools SHALL NOT accept free-text predicates. Page lookup SHALL take `slug`; content lookup SHALL take `field` (enum `key|name|contentType`) and `value`. The server builds the predicate as one clause of the service's documented query grammar (spec F), `<field> = "<escaped value>"`, escaping `\` and `"` and rejecting control characters and values over 200 characters.

#### Scenario: injection attempt
- **WHEN** `query_published_puck_page` is called with slug `/x" OR key = "y`
- **THEN** the request body `query` is `slug = "/x\" OR key = \"y"` (escaped, a single comparison)

#### Scenario: control characters
- **WHEN** a slug contains a newline
- **THEN** the tool returns an error result and no request is sent to the service

### Requirement: Tool errors are results, not crashes
A non-2xx service response, a timeout or a network error SHALL produce a tool result with `isError: true` and a short text containing the HTTP status, the service's error `code` when present, its `message` and its `correlationId` (at most 500 characters in total; the service error body is `{message, statusCode, correlationId, code?, errors?}`), never a stack trace, header, or token.

#### Scenario: 404 from the service
- **WHEN** `get_published_puck_page` receives 404 from the service
- **THEN** the tool result has `isError: true` and text starting `Service returned 404`

#### Scenario: timeout
- **WHEN** the service does not answer within `MCP_REQUEST_TIMEOUT_MS`
- **THEN** the tool result is an error stating the request timed out, and the HTTP response to the MCP client is still `200` (JSON-RPC result)

### Requirement: Cursor-paginated media listing
`list_media` SHALL accept `limit` (1..100), `cursor` (opaque string) and `extensions` (1..20 entries matching `[A-Za-z0-9]{1,10}`) and MUST NOT accept `page`; it SHALL return the service response `{ files, pagination: { limit, nextCursor, hasMore } }` unchanged.

#### Scenario: following the cursor
- **WHEN** `list_media` is called with `{ "limit": 20, "cursor": "abc", "extensions": ["png","jpg"] }`
- **THEN** the service request is `GET <service>/default/media-library?limit=20&cursor=abc&extensions=png%2Cjpg`

#### Scenario: legacy page argument
- **WHEN** `list_media` is called with `{ "page": 2 }`
- **THEN** the call is rejected by strict schema validation and no request is sent

### Requirement: Media storage not configured is explained
When the service answers `501` with code `MEDIA_NOT_CONFIGURED`, the media tools SHALL return an error result whose text contains the code, so an agent can tell the user to configure a storage provider.

#### Scenario: provider none
- **WHEN** `upload_media` receives `501 {"message":"...","code":"MEDIA_NOT_CONFIGURED","statusCode":501}`
- **THEN** the result has `isError: true` and its text contains `MEDIA_NOT_CONFIGURED`

### Requirement: Media upload bound
`upload_media` SHALL accept base64 content decoding to at most 5 MiB and MUST reject larger input before any service call.

#### Scenario: too large
- **WHEN** `fileContent` decodes to more than 5 MiB
- **THEN** the tool returns an error result and the service is not called
