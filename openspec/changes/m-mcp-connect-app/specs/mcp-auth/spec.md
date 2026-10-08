## ADDED Requirements

### Requirement: Inbound bearer authentication
Every `POST /mcp` request SHALL carry `Authorization: Bearer <token>` where the token equals one of the comma-separated values in `MCP_ACCESS_TOKEN`; comparison MUST be constant-time (SHA-256 digests with `timingSafeEqual`). A missing, malformed, or unknown token MUST yield `401`, a JSON-RPC error body, and `WWW-Authenticate: Bearer realm="contentools-mcp"` without executing any MCP method (including `initialize`).

#### Scenario: auth rejection matrix
- **WHEN** a request has no header, `Basic abc`, `Bearer` with empty token, `Bearer wrong`, a token that is a prefix of the real one, or the real token with extra whitespace inside
- **THEN** each is answered `401` and the SDK transport is never invoked

#### Scenario: rotation
- **WHEN** `MCP_ACCESS_TOKEN` is `old-token...,new-token...`
- **THEN** a request with either token is accepted

#### Scenario: status is open
- **WHEN** `GET /mcp/status` is called without a token
- **THEN** it returns `200`

### Requirement: Origin policy
If the request has an `Origin` header whose value is not in `MCP_ALLOWED_ORIGINS` (default empty), the app SHALL answer `403`. Requests without `Origin` (non-browser clients) are allowed after bearer auth. CORS headers SHALL NOT be emitted.

#### Scenario: browser origin refused by default
- **WHEN** a request with the correct token and `Origin: https://evil.example` arrives
- **THEN** the response is `403`

### Requirement: Outbound service credential without passthrough
Calls from tools to the content service SHALL use `Authorization: Bearer <SERVICE_API_TOKEN>` configured on the app. The inbound token MUST NOT be forwarded, logged or echoed, and tool inputs MUST NOT be able to set or override the outbound token, project key or URL. Each outbound call SHALL send `x-source: mcp` and a correlation id (`x-correlation-id`).

#### Scenario: inbound token is not forwarded
- **WHEN** a client calls `get_preview_puck_page` with inbound token A
- **THEN** the mocked service receives `Authorization: Bearer <SERVICE_API_TOKEN>` (not A) and `x-source: mcp`

#### Scenario: argument injection ignored
- **WHEN** a client calls a tool with extra arguments `jwtToken`, `projectKey` or `baseUrl`
- **THEN** the call is rejected by strict schema validation (an `isError` result or JSON-RPC invalid-params error) and no outbound request is made

### Requirement: Error hygiene
Responses SHALL NOT include stack traces, environment values, upstream request headers or any token. Unhandled exceptions SHALL return a generic JSON-RPC error `-32603` with HTTP 500.

#### Scenario: unexpected exception
- **WHEN** the MCP handler throws unexpectedly
- **THEN** the body is `{"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal server error"},"id":null}` and logs carry the stack, not the response
