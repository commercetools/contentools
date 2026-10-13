## ADDED Requirements

### Requirement: Managers are mounted from the new puck packages
`routes.tsx` SHALL import `PageManager`, `ContentManager` and `ThemeManager` from `@commercetools-labs/puck-page-manager`, `@commercetools-labs/puck-content-manager` and `@commercetools-labs/puck-theme-manager` and mount them at `/pages`, `/items` and `/theme` below the entry point route.

#### Scenario: Routes
- **WHEN** a user opens `/<projectKey>/<entryPointUriPath>/items`
- **THEN** `ContentManager` renders; likewise `/pages` renders `PageManager` and `/theme` renders `ThemeManager`

#### Scenario: Unknown managers props are not passed
- **WHEN** `yarn --cwd admin-app typecheck` runs
- **THEN** it passes, proving no removed prop (`projectKey`, `jwtToken`) is still passed

### Requirement: All service traffic goes through the Merchant Center forward-to proxy
The app SHALL provide the managers a `fetcher` that issues every request to `${mcApiUrl}/proxy/forward-to` using `executeHttpClientRequest` with `forwardToConfig = { uri: <target URL>, audiencePolicy: 'forward-url-origin', includeUserPermissions: true, version: 'v2' }`, preserving method, body and `Content-Type`. The browser SHALL NOT call the service URL directly.

#### Scenario: Headers on the wire
- **WHEN** the page list loads
- **THEN** the network request goes to `https://mc-api.<region>.commercetools.com/proxy/forward-to` with headers `X-Forward-To: <serviceUrl>/<businessUnitKey>/puck-pages…`, `X-Forward-To-Audience-Policy: forward-url-origin`, `X-Forward-To-Claims: permissions`, `Accept-version: v2`, and no request to the service host appears in the network list

#### Scenario: Write methods are preserved
- **WHEN** the user saves a theme (HTTP PUT) and uploads an image (multipart POST)
- **THEN** the gateway receives `PUT` and `POST` respectively and the body reaches the service intact (live check, needs MC login)

### Requirement: Service URL comes from configuration
The app SHALL read the service base URL from `additionalEnv.serviceUrl` (env `CONTENTOOLS_SERVICE_URL`, ending in `/service`) and SHALL render an explicit "Service not configured" state, never a crash, when it is empty or not `https://`.

#### Scenario: Missing URL
- **WHEN** the app starts with an empty `CONTENTOOLS_SERVICE_URL`
- **THEN** a Nimbus notice explains which key to set and no request to `/proxy/forward-to` is sent

### Requirement: Permission gating
The app SHALL use `PERMISSIONS.View` as the permission of the main-menu link and SHALL render the routes only for users who have it (the Application Shell enforces this by default). Write authorization SHALL be enforced by the service from the forwarded `userPermissions` claim (`canManage<EntryPoint>`); the app SHALL NOT be the only line of defence and SHALL surface a 403 from the service as a translated error notification.

#### Scenario: View-only user
- **WHEN** a user with only the view permission opens Pages and tries to create a page
- **THEN** the list renders, the service answers 403, and the app shows a translated "not allowed" notification

#### Scenario: User without permission
- **WHEN** a user without the view permission opens the entry point URL
- **THEN** the Application Shell shows its "unauthorized" page and no request to `/proxy/forward-to` is sent

### Requirement: Failures are visible
When a forwarded request fails (401, 403, 5xx, network), the app SHALL show an error notification with the status and a correlation id if present, and SHALL NOT add retries of its own. (The Application Shell's `executeHttpClientRequest` itself retries exactly once, with a renewed session token, when the response status is 401; the app documents this and relies on the service answering 403, not 401, for permission failures.)

#### Scenario: Service down
- **WHEN** the service returns 503 for the page list
- **THEN** an error state with the status 503 is shown and the console has no unhandled promise rejection
