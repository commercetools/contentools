## ADDED Requirements

### Requirement: Lifecycle scripts are declared and self-contained
`connect.yaml` SHALL declare `scripts.postDeploy: yarn connector:post-deploy` and `scripts.preUndeploy: yarn connector:pre-undeploy` for the `service` application.
The package scripts SHALL run the bundled files `build/connector/post-deploy.js` and `build/connector/pre-undeploy.js`. These bundles SHALL contain all their dependencies,
so that they run with Node 22 alone, without a `node_modules` directory.

#### Scenario: Bundle runs without node_modules
- **WHEN** `build/connector/post-deploy.js` is copied to an empty temporary directory and run with `node` and an environment pointing at a mock server
- **THEN** it does not fail with a module-resolution error

### Requirement: postDeploy validates the commercetools connection
`postDeploy` SHALL read `CTP_API_URL`, `CTP_AUTH_URL`, `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET` from the environment and fail (exit code 1) naming the missing
variable NAMES if any is absent. It SHALL request an access token with the client-credentials grant, SHALL fail if the request is rejected, and SHALL fail if the granted
scope string (token response `scope`) lacks `manage_key_value_documents:<projectKey>` or `view_products:<projectKey>`. It SHALL verify Custom Objects access with one read
(`GET /{projectKey}/custom-objects/{container}?limit=1` for the page container) and SHALL fail on a non-2xx answer.

#### Scenario: Valid credentials
- **WHEN** the mock auth server returns a token with both scopes and the mock API answers 200 for the Custom Objects read
- **THEN** the script prints one JSON line per check with `"status":"ok"` and exits 0

#### Scenario: Missing scope
- **WHEN** the token response scope lacks `view_products:<projectKey>`
- **THEN** the script exits 1 and its output names the missing scope

#### Scenario: Rejected credentials
- **WHEN** the auth server answers 401
- **THEN** the script exits 1, prints a message containing the HTTP status and no secret value

### Requirement: postDeploy checks Product Search without failing the deployment on inactivity
`postDeploy` SHALL call `POST /{projectKey}/products/search` with a body requesting one result. HTTP 200 SHALL be `ok`; HTTP 400 with error code `ObjectNotFound`
(Product Search not activated) SHALL be reported as `warn` with an activation hint and SHALL NOT change the exit code; HTTP 401 or 403 SHALL be a failure.

#### Scenario: Search not activated
- **WHEN** the mock API answers 400 `ObjectNotFound` for the search call
- **THEN** the script exits 0 and prints a line with `"status":"warn"` for the `product-search` check

### Requirement: postDeploy validates media storage connectivity
When `MEDIA_STORAGE_PROVIDER` is `none` or unset, `postDeploy` SHALL print a `skipped` line. Otherwise it SHALL load the media configuration with spec G's `loadMediaConfig`
(failing on missing keys by name) and call the provider's `checkConnectivity()`; a rejection SHALL make the script exit 1 with the sanitized reason.

#### Scenario: Storage selected but a key is missing
- **WHEN** `MEDIA_STORAGE_PROVIDER=aws` and `MEDIA_AWS_SECRET_ACCESS_KEY` is empty
- **THEN** the script exits 1 and its output contains `MEDIA_AWS_SECRET_ACCESS_KEY` and no other configuration value

#### Scenario: Storage unreachable
- **WHEN** the mocked provider's `checkConnectivity()` rejects
- **THEN** the script exits 1 and the output contains the provider name and the sanitized reason only

### Requirement: postDeploy is idempotent and non-destructive
`postDeploy` SHALL perform only reads and one search query. It SHALL NOT create, update or delete any commercetools resource or storage object. Running it twice with the same environment
SHALL produce the same exit code and the same set of outbound requests.

#### Scenario: Run twice
- **WHEN** the script runs twice against the same mock server
- **THEN** both runs exit with the same code and the recorded requests are identical in method and path, and none is a `DELETE`, `PUT` or a `POST` other than the token request and the search call

### Requirement: preUndeploy retains customer data
`preUndeploy` SHALL exit 0, SHALL NOT delete Custom Objects or storage objects, and SHALL log which containers (`puck-page`, `puck-page-state`, `puck-page-version`, `puck-content`,
`puck-content-state`, `puck-content-version`, `puck-template`, `configuration`, `content-type`, and the datasource container used by spec F) and which media prefix remain.
The service registers no API Extension and no Subscription, so there is nothing to unregister.

#### Scenario: No destructive calls
- **WHEN** `preUndeploy` runs against a mock server that fails the test on any request
- **THEN** it exits 0 without sending a request

### Requirement: Failures are visible
On failure the scripts SHALL write a single-line JSON record to stderr with `msg`, `check` and `reason` fields, set `process.exitCode = 1` (not `process.exit` inside async work), and
never print token, client secret, private key or API key values. The README SHALL tell operators to read `deployment logs` because a failing script may not mark the deployment as failed.

#### Scenario: Secrets are never printed
- **WHEN** the lifecycle tests run every failure path with sentinel secret values in the environment
- **THEN** no captured output contains any sentinel
