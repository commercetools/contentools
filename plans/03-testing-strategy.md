# Testing strategy — self-driven, minimal dependence on the owner

Goal: every spec can be verified by the implementer (an agent or a junior dev) alone.

## Layers

| Layer | Tool | Where | Needs real CT? |
| ----- | ---- | ----- | :------------: |
| Unit (pure logic: mappers, validators, version pruning, theme CSS vars) | jest (+ ts-jest) / vitest in `puck/` | each package | no |
| HTTP integration of the service | jest + supertest + **msw** mocking the CT API and storage | `service/tests/` | no |
| Connect contract tests (`connect.yaml` valid, route↔endpoint, postDeploy idempotent, auth rejection matrix) | jest + `commercetools connect application test` | `service/`, `mcp/` | no |
| Component tests | React Testing Library | `puck/packages/*`, `admin-app/` (MC jest preset + `renderAppWithRedux`) | no |
| **Live sandbox e2e** (service ↔ real CT custom objects) | jest e2e, env-gated (`E2E_*`) | `service/e2e/` | **yes** (sandbox project) |
| **Browser verification** | **Chrome DevTools connector** (`mcp__chrome-devtools__*`) | playground app + MC app | yes for MC |

## Chrome DevTools verification playbook (used by J, K, L, Q and any UI task)

The implementer runs these themselves via the Chrome connector tools:

1. Start the service locally (`yarn --cwd service start:dev`, port 8080) and the target UI
   (`yarn --cwd puck/playground dev` → http://localhost:5173, or `yarn --cwd admin-app start` →
   http://localhost:3001).
2. `new_page` / `navigate_page` to the URL; `wait_for` a stable text; `take_snapshot` (a11y tree) to find uids.
3. Drive the flow with `click`, `fill`, `fill_form`, `press_key`, `drag` (Puck drag-and-drop).
4. Assert with `take_snapshot` text and `evaluate_script` (e.g. read DOM / `fetch` the API).
5. Check `list_console_messages` (no errors) and `list_network_requests` (expected status codes, no
   4xx/5xx, correct auth headers, no `x-project-key`).
6. `take_screenshot` into `plans/evidence/<spec>/<step>.png` as evidence (kept out of the published repo).
7. `lighthouse_audit` optional on the renderer page.

**Limit:** Merchant Center needs a logged-in human session (SSO/2FA). Tests against `admin-app` run
in the owner's already-logged-in Chrome profile (manual step M-04); everything else (playground
app with the same packages, service, MCP) is fully automatable without the owner. Specs K/L/Q
therefore split their checks into **A. automatable** and **B. needs MC login** and mark B as
"best effort, owner-assisted".

## Test data & isolation

* One dedicated **sandbox commercetools project** (manual-steps M-01) with an API client of the exact
  scopes in `connect.yaml`. Tests create custom objects only under containers prefixed `contentools-test-`
  and delete them in `afterAll`. Never run e2e against a non-sandbox project (guard: refuse unless
  `E2E_ALLOW_PROJECT_KEY` matches).
* msw handlers record fixtures under `service/tests/fixtures/` (hand-written, no real project keys/IDs).
* No secrets in the repo: `.env.example` only; the gate (`gate.mjs`) scans for them.

## Required test categories (from the Connect production-readiness checklist)

* auth-rejection matrix (missing / expired / wrong issuer / wrong audience / `alg:none`),
* idempotent `postDeploy` (run twice → same state),
* envelope/ack edge cases only if an `event` app is ever added (none planned),
* error responses never leak stack traces,
* health endpoint (`/service/health`) returns 200,
* structured log lines carry a correlation id.

## Commands (final, defined in spec B and the root tooling hub)

```
yarn test            # all unit + integration, no network
yarn test:e2e        # needs E2E_* env, hits the sandbox
yarn verify          # lint + typecheck + test + build for every app and puck/
yarn gate            # runs tools/gate (labs publish gate) — blocking before publish
```
