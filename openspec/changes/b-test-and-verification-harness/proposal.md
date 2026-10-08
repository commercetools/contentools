## Why

Every later spec must be verifiable by the implementer alone, without the owner and without a commercetools project for
unit/integration work. That needs one agreed test stack per app, a faithful fake of the commercetools API surface the service uses,
a guarded live-sandbox e2e path that cannot touch a real project, and a scripted Chrome DevTools playbook for UI checks.

## What Changes

- `service/`: add jest + ts-jest (existing) + supertest + msw 2; `tests/{unit,integration,support,fixtures}`; narrow `jest.config.cjs`; `tsconfig.test.json`; in-memory fake commercetools (custom objects, token, product search) as msw handlers; hand-written fixtures; replace the stale `tests/integration/routes.spec.ts`; `yarn test` becomes real.
- `service/e2e/`: env-gated live sandbox harness: `E2E_*` env, **sandbox guard** (`E2E_ALLOW_PROJECT_KEY` must equal the project key), per-run container prefix `contentools-test-<runId>-`, cleanup in `afterAll`, a sweep script; runs the app in-process.
- `puck/`: vitest + jsdom + Testing Library + msw 2 shared config; first smoke tests for `puck-api`.
- `mcp/`: vitest config + smoke test (tools registry loads).
- `admin-app/`: keep the MC jest preset; add msw 0.49.x-style handler helper and a smoke test of the render helper.
- `tools/fake-ct/` standalone fake commercetools HTTP server (same in-memory store) so UI/e2e-like runs need no sandbox; `tools/verify/*.md` Chrome DevTools playbooks with exact tool call sequences and evidence conventions; root scripts `test:e2e`, `dev:fake-ct`.
- Documents the Connect-required test categories (auth rejection matrix, idempotent postDeploy, no stack leak, health, correlation id) as shared helpers that D/E/F/H/M fill in.
- **BREAKING:** the old live e2e (`/authenticate-project`, `x-project-key`) is replaced; legacy e2e files are deleted by C.

## Capabilities

### New Capabilities
- `service-test-harness`: jest/supertest/msw stack, fake CT, fixtures, env defaults, scripts.
- `sandbox-e2e`: env-gated live sandbox tests with guard, prefix, cleanup, sweep.
- `ui-test-harness`: vitest (puck, mcp) and MC jest preset (admin-app) setups with msw.
- `browser-playbook`: Chrome DevTools verification playbooks, fake-CT server, evidence conventions.

### Modified Capabilities
<!-- none -->

## Impact

- Adds dev dependencies only (supertest, msw, vitest, jsdom, Testing Library); no runtime dependency changes.
- Needs the sandbox project (manual M-01) only for `yarn test:e2e`.
- Consumed by D-Q: each later spec's "Verification" section uses these helpers and playbooks.
