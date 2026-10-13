## ADDED Requirements

Implementation note: spec D creates `src/observability/{request-context,log-format,access-log}.ts`, the health route and graceful shutdown; this spec is the acceptance contract that H verifies with tests.

### Requirement: Correlation id on every request
The service SHALL read the incoming `X-Correlation-ID` header and keep it when it matches `^[A-Za-z0-9._-]{8,128}$`; otherwise it SHALL generate a UUID v4. The value SHALL be
returned in the response header `X-Correlation-ID` and SHALL be attached as `correlationId` to every log line emitted while handling the request, including lines emitted
by deeper layers (through `AsyncLocalStorage`, without passing a logger parameter).

#### Scenario: Client-supplied id is kept
- **WHEN** a request carries `X-Correlation-ID: abc12345-test`
- **THEN** the response carries the same header and every captured log line of that request has `correlationId: "abc12345-test"`

#### Scenario: Malformed id is replaced
- **WHEN** the header is `x y` or longer than 128 characters
- **THEN** the response header is a freshly generated UUID, and the malformed value appears in no log line

#### Scenario: Deep log lines carry the id
- **WHEN** a controller two calls below the route handler logs a message
- **THEN** that line contains the request's correlation id

### Requirement: Structured JSON logs, no bodies
All logs SHALL be JSON objects with at least `level`, `message`, `timestamp`. The service SHALL emit one access-log line per completed request with `method`, `route` (the route template,
e.g. `/service/:businessUnitKey/puck-pages/:key`, never the raw URL with query string), `status`, `durationMs`, `correlationId`, and the `businessUnitKey` when present. The service SHALL NOT
log request bodies, response bodies, `Authorization` headers, cookies, query strings, uploaded file names, or configuration values. The level SHALL follow `LOG_LEVEL` (default `info`).

#### Scenario: Access log content
- **WHEN** `POST /service/main-bu/puck-pages` is handled with a JSON body containing the word `sentinel-body`
- **THEN** exactly one access-log line exists, with the route template, status and duration, and no captured log line contains `sentinel-body`

#### Scenario: Tokens are not logged
- **WHEN** a request with `Authorization: Bearer sentinel-token` is handled, including a failing authentication
- **THEN** no captured log line contains `sentinel-token`

#### Scenario: Log level
- **WHEN** `LOG_LEVEL=warn`
- **THEN** access-log lines at `info` are not emitted

### Requirement: Health endpoint
The service SHALL expose `GET /service/health` (and the alias `GET /service/status`) answering 200 `{ "status": "UP" }` without authentication, without any outbound call and without reading secrets.

#### Scenario: Liveness
- **WHEN** `GET /service/health` is called with no headers
- **THEN** the response is 200 with `{"status":"UP"}` and the mock commercetools server received no request

### Requirement: Error hygiene
Error responses in production mode (any `NODE_ENV` other than `development`) SHALL NOT contain stack traces, SDK error text, file system paths or configuration values. Unknown routes under
`/service` SHALL answer 404 with a JSON body. Unhandled errors SHALL answer 500 `{ "message": "Internal server error" }` and be logged once with the correlation id.

#### Scenario: Unhandled error
- **WHEN** a handler throws `new Error('secret path /srv/app/x.ts')`
- **THEN** the response is 500 with `{"message":"Internal server error"}`, the body does not contain `secret path`, and one error log line with the correlation id exists

#### Scenario: Unknown route
- **WHEN** `GET /service/does-not-exist` is called
- **THEN** the response is 404 with a JSON body and no stack

### Requirement: Graceful shutdown
On `SIGTERM` the process SHALL stop accepting connections, wait for in-flight requests for at most 10 seconds and exit 0.

#### Scenario: SIGTERM
- **WHEN** the test sends `SIGTERM` to a started server with no in-flight requests
- **THEN** the server closes and the exit hook runs with code 0
