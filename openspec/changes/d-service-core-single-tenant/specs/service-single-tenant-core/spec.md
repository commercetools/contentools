## ADDED Requirements

### Requirement: No tenant registry or per-tenant credentials
The service SHALL NOT contain any multi-tenant mechanism: no Firestore dependency or import, no `projectKey` URL segment or
`x-project-key` header handling, no `authenticate-project` or `refresh-jwt` endpoints, no self-issued JWT, no per-request
commercetools credentials. The service SHALL act on exactly one commercetools project, the one identified by `CTP_PROJECT_KEY`.

#### Scenario: Removed endpoints do not exist
- **WHEN** a client sends `POST /service/authenticate-project` or `POST /service/refresh-jwt`
- **THEN** the service responds `404` with body `{"message":"Path not found.", ...}`

#### Scenario: No tenant code remains
- **WHEN** the source tree `service/src` and `service/package.json` are searched case-insensitively for `firestore`, `GCP_FIRESTORE`, `jsonwebtoken`, `x-project-key`, `authenticate-project`, `refresh-jwt`, `validateProject`, `requireProjectKey`, `multitenant`, `sdk-client-v2`
- **THEN** there are zero matches

#### Scenario: Unported routes are parked, not compiled
- **WHEN** `yarn build` runs in `service/`
- **THEN** it succeeds and `service/src/_pending/**` is excluded from compilation and from jest

### Requirement: Environment contract with fail-fast validation
The service SHALL read all configuration from environment variables through a single `readConfiguration()` function that validates
the whole environment at startup and throws one error listing every problem. Required: `CTP_API_URL` (https URL),
`CTP_AUTH_URL` (https URL), `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`. Optional: `CTP_SCOPE` (space separated),
`PORT` (default `8080`), `LOG_LEVEL` (default `info`), `MAX_VERSIONS` (integer 1..100, default `5`), `CONTAINER_PREFIX`
(default empty, `[A-Za-z0-9_~.-]{0,64}`). The process SHALL exit non-zero before listening when validation fails, and the error
SHALL name variables but never print secret values.

#### Scenario: All variables valid
- **WHEN** `readConfiguration()` is given the five required variables
- **THEN** it returns a typed object with defaults applied (`port 8080`, `maxVersions 5`, `containerPrefix ""`)

#### Scenario: Several variables invalid at once
- **WHEN** `CTP_API_URL` is `http://x`, `CTP_PROJECT_KEY` is missing and `MAX_VERSIONS` is `0`
- **THEN** it throws one `ConfigurationError` whose message names `CTP_API_URL`, `CTP_PROJECT_KEY` and `MAX_VERSIONS`

#### Scenario: Secret never echoed
- **WHEN** validation fails while `CTP_CLIENT_SECRET` is set to `s3cr3t-value`
- **THEN** neither the error message nor any log line contains `s3cr3t-value`

#### Scenario: Process refuses to start on bad configuration
- **WHEN** the built service is started without `CTP_PROJECT_KEY`
- **THEN** it logs the problem list at `error` level and exits with a non-zero code without opening the port

### Requirement: Single process-wide commercetools client
The service SHALL build one commercetools API root, lazily and once per process, with `@commercetools/ts-client@^4` `ClientBuilder`
(client-credentials flow using `CTP_AUTH_URL`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, scopes from `CTP_SCOPE` split on spaces; HTTP
middleware using `CTP_API_URL`, a 10 second timeout and retry on `429, 502, 503, 504` with at most 3 retries) and
`@commercetools/platform-sdk@^8` `createApiBuilderFromCtpClient(...).withProjectKey({projectKey: CTP_PROJECT_KEY})`.
The service SHALL NOT depend on `@commercetools/sdk-client-v2`.

#### Scenario: Client reused
- **WHEN** `getApiRoot()` is called twice
- **THEN** the same object is returned and the OAuth token endpoint is requested at most once while the token is valid

#### Scenario: Scopes taken from the generated client
- **WHEN** `CTP_SCOPE="manage_key_value_documents:p1 view_products:p1"`
- **THEN** the token request sends `scope=manage_key_value_documents:p1 view_products:p1`

### Requirement: Container-bound Custom Objects client
The service SHALL access commercetools Custom Objects only through `customObjects(containerKey)` which is bound to one container
whose real name is `CONTAINER_PREFIX + <fixed name>`. The client SHALL offer: `get` (returns `null` on 404), `getOrThrow`
(throws `CustomError(404)`), `create` (create-only; throws `CustomError(409)` when the key exists), `put` (upsert), `delete`
(returns `false` on 404, never throws for 404), `list(where?)` (returns ALL matching objects by paginating, hard cap 10000 with a
warning log) and `update(key, mutate)` (read-modify-write using the object's `version`, retrying up to 3 times on HTTP 409).
The fixed container names SHALL be: `puck-page`, `puck-page-state`, `puck-page-version`, `puck-content`, `puck-content-state`,
`puck-content-version`, `puck-template`, `configuration`, `content-type`, `datasource`.

#### Scenario: Missing object
- **WHEN** `get("nope")` is called and commercetools answers 404
- **THEN** it resolves `null`; `getOrThrow("nope")` rejects with `CustomError` status 404

#### Scenario: Delete is idempotent
- **WHEN** `delete("nope")` is called for a missing object
- **THEN** it resolves `false` (no exception, no 500)

#### Scenario: List is complete
- **WHEN** the container holds 1203 matching objects
- **THEN** `list()` returns 1203 objects (three requests of `limit=500`), not 20

#### Scenario: Concurrent modification is retried
- **WHEN** `update(key, mutate)` receives HTTP 409 on its first write and 200 on the second
- **THEN** `mutate` is called twice with fresh data and the second result is returned

#### Scenario: Container prefix applied
- **WHEN** `CONTAINER_PREFIX="contentools-test-"` and `customObjects("puckPage").put("k", {})` runs
- **THEN** the request body has `container: "contentools-test-puck-page"`

### Requirement: Safe query predicates
The service SHALL build `where` predicates only through helpers that escape `\` and `"` in interpolated values and SHALL reject
(`CustomError(400)`) path-derived keys that do not match `^[A-Za-z0-9_.~-]{1,128}$`.

#### Scenario: Quote injection neutralised
- **WHEN** `eq("businessUnitKey", 'x" OR key = "y')` is built
- **THEN** the result is `businessUnitKey = "x\" OR key = \"y"`
