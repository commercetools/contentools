## ADDED Requirements

### Requirement: Router mounted at the Connect endpoint
The service SHALL mount its router at `/service` (the `endpoint` declared in `connect.yaml`), listen on `process.env.PORT` (default
8080), disable `x-powered-by`, and answer any unknown path or method with `404` and the uniform error body.

#### Scenario: Unknown path
- **WHEN** `GET /nope` is requested
- **THEN** the response is `404` with `{"message":"Path not found.","statusCode":404,"correlationId":"<id>"}`

#### Scenario: Graceful shutdown
- **WHEN** the process receives `SIGTERM`
- **THEN** the HTTP server stops accepting connections, in-flight requests finish, and the process exits `0` within 10 seconds

### Requirement: Liveness endpoints
The service SHALL expose `GET /service/health` and `GET /service/status`, both unauthenticated, performing no commercetools call
and returning `200` `{"status":"UP","service":"contentools-service","timestamp":"<ISO-8601>"}`.

#### Scenario: Health without credentials
- **WHEN** `GET /service/health` is requested with no headers while commercetools is unreachable
- **THEN** the response is `200` with `status: "UP"`

#### Scenario: Status alias
- **WHEN** `GET /service/status` is requested
- **THEN** the response equals the `/service/health` response shape

### Requirement: Structured logging with correlation id
Every log line SHALL be single-line JSON and carry `correlationId`. The correlation id SHALL be the incoming `X-Correlation-ID` header when
present and a valid token (`^[A-Za-z0-9._:-]{1,128}$`), otherwise a new UUID v4; it SHALL be echoed in the `X-Correlation-ID`
response header and in every error body. The access log SHALL record method, the matched route template (`<unmatched>` when no route matched, never the raw URL or query string), status, duration in
milliseconds and `X-Source` (default `unknown`), and SHALL NOT record request or response bodies, `Authorization` values or cookies.

#### Scenario: Correlation id echoed
- **WHEN** a request carries `X-Correlation-ID: abc-123`
- **THEN** the response header `X-Correlation-ID` is `abc-123` and the access-log line has `"correlationId":"abc-123"`

#### Scenario: Generated id
- **WHEN** a request carries no correlation header
- **THEN** the response has an `X-Correlation-ID` that is a UUID

#### Scenario: Bodies never logged
- **WHEN** `PUT` with body `{"value":{"secret":"zzz"}}` and `Authorization: Bearer top-secret` completes
- **THEN** no captured log line contains `zzz` or `top-secret`

### Requirement: Uniform error contract
All error responses SHALL be JSON `{"message": string, "statusCode": number, "correlationId": string, "code"?: string, "errors"?: [...]}` where the optional `code` is a stable machine-readable identifier (for example `MEDIA_NOT_CONFIGURED`, set by the throwing code) that clients MAY use in addition to the HTTP status. In
`NODE_ENV=development` only, a `stack` field MAY be added. Unhandled errors SHALL return `500` `{"message":"Internal server error"}`
without stack, SDK error details or secrets. Body-parser errors SHALL map to `400` (`Invalid JSON body`) and `413` (`Payload too large`).
commercetools errors SHALL map as: 404 -> 404, 409 -> 409, 429 and 5xx -> 503, 401/403 -> 502 (`Upstream authorization failed`,
logged at error level), anything else -> 500.

#### Scenario: Malformed JSON
- **WHEN** `POST` with `Content-Type: application/json` and body `{bad`
- **THEN** the response is `400` `{"message":"Invalid JSON body", ...}` (not 500)

#### Scenario: Oversized body
- **WHEN** a JSON body larger than 2 MB is posted
- **THEN** the response is `413`

#### Scenario: Unexpected exception
- **WHEN** a handler throws `new Error("db password is hunter2")`
- **THEN** the response is `500` `{"message":"Internal server error", ...}` and the body does not contain `hunter2`

#### Scenario: commercetools credential failure
- **WHEN** commercetools answers a Custom Objects request with 403
- **THEN** the service responds `502` and logs an `error` line with the upstream status
