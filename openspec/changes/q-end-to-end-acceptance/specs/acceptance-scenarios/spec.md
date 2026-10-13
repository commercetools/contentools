## ADDED Requirements

### Requirement: Scripted API walkthrough passes on a real sandbox project
The acceptance script SHALL exercise, against a running service backed by a real sandbox commercetools project, the full content lifecycle: create page, update (draft), preview read, publish, public published read, further edit, revert draft, version list, delete; the same for content items; templates (create, list by kind, get, delete); configuration documents (create, read, update, delete for every document key); datasources (create, list, test, delete); product search; content-type import; media upload and library listing (when a storage backend is configured); business-unit isolation.

#### Scenario: Page lifecycle
- **WHEN** a page is created, updated twice, published, edited again and the draft reverted
- **THEN** the published read returns the published content, the preview read returns the draft while one exists, the revert restores the published content in preview, and the version list is non-empty and never longer than `MAX_VERSIONS`

#### Scenario: Published reads are public
- **WHEN** a published page is requested with no Authorization header
- **THEN** the response is 200 with the published content

#### Scenario: Business-unit isolation
- **WHEN** a page is created under business unit A and listed under business unit B
- **THEN** it is absent from B's list

#### Scenario: Cleanup leaves nothing behind
- **WHEN** the cleanup tool runs for the test container prefix
- **THEN** a list of custom objects in every test container returns zero results

### Requirement: Negative authentication matrix is rejected
The system SHALL answer 401 (or 403 where specified by the auth contract) with a JSON error body and no stack trace for: missing header, non-Bearer scheme, malformed token, `alg: none` token, token signed by an unknown key, expired token, wrong issuer, wrong audience, wrong static token, token supplied only as a query parameter. A request carrying `x-project-key` SHALL NOT change which project is used.

#### Scenario: Write without token
- **WHEN** `POST /service/<bu>/puck-pages` is sent with no Authorization header
- **THEN** the status is 401 and the response body contains no `stack` text

#### Scenario: Forged alg none
- **WHEN** a request carries a hand-built `alg: none` token
- **THEN** the status is 401

#### Scenario: Wrong static token
- **WHEN** a mutation carries `Authorization: Bearer <random string>`
- **THEN** the status is 401 and the content is unchanged

### Requirement: Playground UI journey works end to end
Driven through the Chrome DevTools connector against the playground, the system SHALL allow: creating a page, editing a component, publishing, rendering it in the Renderer tab, viewing version history and applying an older version, changing and saving the theme with the change visible as CSS variables on the rendered page, creating a template and a page from it, using a datasource-backed field, and uploading and selecting a media file. The browser console SHALL contain no errors and the network log SHALL show no 4xx/5xx other than the expected ones and no `x-project-key` header.

#### Scenario: Create, edit, publish, render
- **WHEN** the tester creates a page, adds a Hero with a unique title, waits for autosave, and clicks Publish
- **THEN** the Renderer tab for that page shows the unique title and the published API read returns it

#### Scenario: Version history and revert
- **WHEN** the tester edits the title twice and opens version history, previews and applies an older version
- **THEN** the editor shows the older title and the draft in the API equals that version

#### Scenario: Theme change reaches the renderer
- **WHEN** a theme colour token is changed and saved
- **THEN** the corresponding CSS custom property on the rendered page has the new value

### Requirement: Merchant Center app works for an authenticated owner
With the owner's logged-in Merchant Center session, the installed `admin-app` SHALL load, list pages, create/edit/publish a page, show theme and content managers, and every request to the service SHALL be accepted using the forwarded Merchant Center session token; with a user lacking the permission the app SHALL deny access.

#### Scenario: MC session JWT accepted
- **WHEN** the owner creates and publishes a page in the app
- **THEN** the service logs show the requests authorised by the session-token path and the page is returned by the public published route

#### Scenario: Permission denied
- **WHEN** a user without the application's view permission opens the app route
- **THEN** the Merchant Center shows its access-denied page (or the app shows no data)

### Requirement: MCP server is usable by a client
The MCP application SHALL answer `initialize`, `tools/list` and `tools/call` over HTTP, authenticating to the service with the configured token, and SHALL refuse calls without valid credentials.

#### Scenario: Tool call creates and reads a page
- **WHEN** an MCP client calls the list-pages tool and then the create-page tool
- **THEN** the page exists in the service and the tool result contains its key

#### Scenario: Unauthenticated MCP call
- **WHEN** a `tools/call` request is sent without credentials
- **THEN** the response is an authentication error and no content changes

### Requirement: Connect local run and deployed run verified
`commercetools connect validate` SHALL pass; each application SHALL build and start locally via the Connect CLI; `postDeploy` SHALL run twice with identical resulting state. Optionally, a sandbox deployment SHALL serve `/service/health` with 200, accept redeploy with a changed configuration value, and keep serving the previous code when a deliberately broken tag fails to build.

#### Scenario: Idempotent postDeploy
- **WHEN** `npm run connector:post-deploy` is executed twice with the same environment
- **THEN** both exit 0 and the project resources it manages are identical after each run

#### Scenario: Redeploy applies configuration
- **WHEN** `deployment redeploy` changes `MAX_VERSIONS`
- **THEN** after it completes the version count behaviour changes accordingly
