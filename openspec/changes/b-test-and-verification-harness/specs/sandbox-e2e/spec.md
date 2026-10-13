## ADDED Requirements

### Requirement: Live e2e is opt-in and skipped by default
`yarn test:e2e` in `service/` SHALL run live tests only when all of `E2E_CTP_PROJECT_KEY`, `E2E_CTP_CLIENT_ID`, `E2E_CTP_CLIENT_SECRET`, `E2E_CTP_REGION`, `E2E_CTP_SCOPE`, `E2E_BUSINESS_UNIT_KEY` and `E2E_ALLOW_PROJECT_KEY` are set; otherwise every e2e suite MUST be skipped and the run MUST exit 0 printing `e2e skipped: set E2E_* (see service/e2e/README.md)`.

#### Scenario: No env, no failure
- **WHEN** `yarn test:e2e` is run without any `E2E_*` variable
- **THEN** the exit code is 0 and the skip message is printed

### Requirement: Sandbox guard
Before any request, the e2e harness MUST abort with an error when `E2E_ALLOW_PROJECT_KEY` differs from `E2E_CTP_PROJECT_KEY`.

#### Scenario: Wrong project refused
- **WHEN** `E2E_CTP_PROJECT_KEY=a` and `E2E_ALLOW_PROJECT_KEY=b`
- **THEN** the run fails before any HTTP call with a message containing `refusing to run`

### Requirement: Isolated containers and cleanup
The harness SHALL override every container env var of the service with names prefixed `contentools-test-<runId>-` and, in `afterAll`, delete every custom object it created; a script `tools/sandbox-sweep.mjs` SHALL delete leftovers of any earlier run (containers starting with `contentools-test-`) and MUST refuse to run without the guard variables.

#### Scenario: Nothing left behind
- **WHEN** a green e2e run finishes
- **THEN** a query of custom objects whose container starts with `contentools-test-` returns zero results

### Requirement: In-process app against the real API
E2E tests SHALL start the Express app in-process (supertest) with `CTP_*` mapped from `E2E_CTP_*` and real commercetools endpoints, and MUST NOT require a separately started server.

#### Scenario: Round trip
- **WHEN** an e2e test creates a puck page through the app and reads it back
- **THEN** the object exists in a `contentools-test-` container of the sandbox and the response matches the fixture shape
