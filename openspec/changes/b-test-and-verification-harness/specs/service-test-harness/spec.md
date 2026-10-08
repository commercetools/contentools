## ADDED Requirements

### Requirement: Service test stack
`service/` SHALL run unit and integration tests with jest 29 + ts-jest, drive the Express app with supertest, and mock all outbound HTTP with msw 2 configured with `onUnhandledRequest: 'error'`; `yarn test` in `service/` MUST run them offline (no network, no real credentials) and `yarn test` MUST NOT be a placeholder echo.

#### Scenario: Offline test run
- **WHEN** `yarn test` is run in `service/` with the network disabled and no `.env`
- **THEN** all tests pass and an unmocked outbound request fails the test with an msw "unhandled request" error

### Requirement: Test file layout and matching
Tests SHALL live in `service/tests/unit/*.test.ts` and `service/tests/integration/*.test.ts`; helpers in `service/tests/support/` and data in `service/tests/fixtures/` MUST NOT be picked up as tests; a `tsconfig.test.json` SHALL let ts-jest compile files outside `src/`.

#### Scenario: Helpers are not executed as tests
- **WHEN** `yarn jest --listTests` is run in `service/`
- **THEN** only `*.test.ts` files under `tests/unit` and `tests/integration` are listed

### Requirement: Fake commercetools
`service/tests/support/fake-ct.ts` SHALL provide an in-memory commercetools emulation exposed as msw handlers for: the OAuth token endpoint, `POST /{projectKey}/custom-objects` (upsert with optimistic `version`), `GET` and `DELETE /{projectKey}/custom-objects/{container}/{key}`, `GET /{projectKey}/custom-objects/{container}` (with `where`, `limit`, `offset`, `sort`) and `POST /{projectKey}/products/search`; it MUST answer commercetools-shaped error bodies (`statusCode`, `message`, `errors[].code`) for 404 and version conflicts (409).

#### Scenario: Upsert then read
- **WHEN** a test POSTs a custom object `{container:"c",key:"k",value:{a:1}}` through the fake and then GETs `/test-project/custom-objects/c/k`
- **THEN** the response contains `version: 1` and `value: {a:1}`; a second POST with `version: 1` yields `version: 2`; a POST with a stale version yields 409

### Requirement: Deterministic test environment
`service/tests/support/env.ts` SHALL set, before any application import, a complete fake environment: `CTP_PROJECT_KEY=test-project`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`, `CTP_API_URL=http://api.ct.test`, `CTP_AUTH_URL=http://auth.ct.test` and `SERVICE_API_TOKEN=test-service-token`; no real project key, id or host MUST appear in fixtures or helpers.

#### Scenario: No real identifiers
- **WHEN** `grep -rnE "ct-poc|run\.app|commercetools-demo" service/tests` is run
- **THEN** it prints nothing

### Requirement: Connect-required test categories have a home
The harness SHALL provide reusable helpers `tests/support/assertions.ts` (`expectNoStackLeak(res)`, `expectErrorShape(res, status)`) and a parameterised-matrix helper `tests/support/auth-matrix.ts` (`authRejectionCases`: missing, malformed, `alg:none`, wrong signature, wrong issuer, wrong audience, expired) that spec E fills with real token minting.

#### Scenario: Stack traces never leak
- **WHEN** a test forces a 500 and calls `expectNoStackLeak(res)`
- **THEN** the body contains neither `at ` stack frames nor file paths

### Requirement: Hand-written fixtures
`service/tests/fixtures/` SHALL contain hand-written JSON for a puck page, puck content, template, theme configuration, content-type import sample and a product-search response, using only synthetic keys (`test-project`, `test-bu`).

#### Scenario: Fixtures load
- **WHEN** `loadFixture('puck-page.json')` is called from a test
- **THEN** a parsed object is returned and `JSON.stringify` of it contains no host name
