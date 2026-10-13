## ADDED Requirements

### Requirement: Origin allowlist
The service SHALL send CORS headers only to origins listed (exact match of scheme, host and port, no trailing slash) in `CORS_ALLOWED_ORIGINS` (comma separated), or to any origin
when the value is the single character `*`. With the variable unset no cross-origin browser access is granted. A request without an `Origin` header (server-to-server, the
Merchant Center gateway) SHALL be unaffected. A disallowed origin SHALL NOT cause an error response; the response simply lacks CORS headers.

#### Scenario: Allowed origin
- **WHEN** `CORS_ALLOWED_ORIGINS=http://localhost:5173` and a request has `Origin: http://localhost:5173`
- **THEN** the response has `Access-Control-Allow-Origin: http://localhost:5173`, `Vary: Origin` and `Access-Control-Expose-Headers: X-Correlation-ID`

#### Scenario: Disallowed origin
- **WHEN** a request has `Origin: https://evil.example`
- **THEN** the status is that of the route (not 500) and no `Access-Control-Allow-*` header is present

#### Scenario: Invalid configuration
- **WHEN** `CORS_ALLOWED_ORIGINS=localhost:5173` (no scheme) or `https://a.example/` (trailing slash)
- **THEN** `readConfiguration()` throws `ConfigurationError` naming `CORS_ALLOWED_ORIGINS`

### Requirement: Preflight without authentication
`OPTIONS` preflight requests from allowed origins SHALL be answered `204` before authentication with `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`,
`Access-Control-Allow-Headers: Content-Type,Authorization,X-Correlation-ID,X-Source` and `Access-Control-Max-Age: 600`. `x-project-key` SHALL NOT be an allowed header and
credentials (cookies) SHALL NOT be allowed.

#### Scenario: Preflight for a protected route
- **WHEN** `OPTIONS /service/default/puck-pages` with `Origin` allowed, `Access-Control-Request-Method: PUT`, `Access-Control-Request-Headers: authorization,content-type`
- **THEN** the response is `204` with the headers above and no `Authorization` was required

#### Scenario: No credentials mode
- **WHEN** any CORS response is produced
- **THEN** it has no `Access-Control-Allow-Credentials` header
