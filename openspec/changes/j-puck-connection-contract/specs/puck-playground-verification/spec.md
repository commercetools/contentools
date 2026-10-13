## ADDED Requirements

### Requirement: Playground configuration
The playground SHALL read `VITE_BASE_URL`, `VITE_BUSINESS_UNIT_KEY`, `VITE_LOCALE`, `VITE_AUTH_MODE` (`token` | `fetcher` | `none`, default `token`) and `VITE_SERVICE_TOKEN`, SHALL NOT read any project key variable, and its `.env.example` SHALL contain only placeholders pointing at `http://localhost:8080/service` and the mock server defaults.

#### Scenario: Missing configuration
- **WHEN** the playground starts without `VITE_BASE_URL` or `VITE_BUSINESS_UNIT_KEY`
- **THEN** it shows the "Configuration required" panel naming exactly those two variables

#### Scenario: Auth modes
- **WHEN** `VITE_AUTH_MODE=fetcher` is set
- **THEN** the playground passes a `fetcher` that adds the token itself and passes no `jwtToken`, and the network log still shows authenticated writes

### Requirement: Mock service fallback
The repository SHALL contain a dependency-free Node mock of the service HTTP contract at `puck/playground/mock-server/server.mjs`, started with `yarn workspace @commercetools-labs/puck-playground mock`, listening on port 8080 under the `/service` prefix, holding data in memory with seed data, and enforcing the auth policy (Bearer token equal to `MOCK_SERVICE_TOKEN`, default `dev-token`, for protected routes; 401 otherwise) and CORS for the playground origin.

#### Scenario: Health and seed
- **WHEN** the mock starts and `curl -s localhost:8080/service/health` is run
- **THEN** it returns HTTP 200 and `GET /service/main-store/published/puck-pages/home` returns the seeded page

#### Scenario: Auth enforcement
- **WHEN** `PUT /service/main-store/puck-pages/home` is sent without `Authorization`
- **THEN** the mock answers 401 with a JSON error body, and with `Authorization: Bearer dev-token` it answers 200

#### Scenario: Same mock backs the tests
- **WHEN** the vitest suites run
- **THEN** they start `createMockServer()` on an ephemeral port in-process and need no network access beyond localhost

### Requirement: Automated contract tests
`yarn test` in `puck/` SHALL include vitest and React Testing Library tests for: header construction matrix, auth precedence and freshness, fetcher transport, policy table pinning, typed errors, public-read renderer, preview-without-auth, product block without provider, manager save through a fetcher, image-picker upload through the shared client, and an absence guard for `projectKey`/`x-project-key` in `src` and built `dist`.

#### Scenario: Suite passes
- **WHEN** `yarn test` runs
- **THEN** it exits 0 with at least 35 passing tests across `puck-api`, `puck-renderer`, `puck-page-manager`, `puck-image-picker` and `puck-components`

### Requirement: Browser verification script
The change SHALL provide a Chrome DevTools verification script (documented steps using `mcp__chrome-devtools__*` tools) that runs the playground against the mock service or the real service and checks: pages list loads, editing and saving a page sends one authenticated `PUT`, publishing works, the renderer tab renders the published page without any `Authorization` header and without `x-project-key`, preview mode without a token shows the authentication error, and the browser console has no errors.

#### Scenario: Network assertions
- **WHEN** the script lists network requests after the flow
- **THEN** no request has an `x-project-key` header, every `GET .../published/...` has no `Authorization` header, and every non-GET request has one

#### Scenario: Real service
- **WHEN** specs F and H are archived and `service` runs locally with `SERVICE_API_TOKEN=dev-token`
- **THEN** the same script passes with `VITE_BASE_URL` pointing at the real service
