# Explore notes for B (test and verification harness)

Facts read on 2026-10-08 from `/Users/behnam/code/cms` (SOURCE) and the Connect skill. Paths relative to SOURCE unless marked TARGET.

## 1. What tests exist today
* `service/tests/integration/routes.spec.ts` (57 lines): a stale template. It imports `../../src/controllers/service.controller` (file does not exist) and mocks `../../src/utils/config.utils`. It cannot compile. Replace.
* `service/package.json` scripts: `"test": "echo 'No tests for now'"`, `"test:e2e": "jest --config=e2e/jest.config.js --runInBand"`. `service/jest.config.cjs` = ts-jest preset, node env, `testMatch: ['**/tests/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)']` (that glob would also pick up `tests/support/*.ts` helpers as tests: must be narrowed).
* `service/e2e/` (16 `*.e2e.ts` + `setup.ts`, `constants.ts`, `helpers/http.ts`, `jest.config.js`, `tsconfig.json`, `README.md`): live e2e against a RUNNING service (`E2E_BASE_URL`, default `http://localhost:8080`), env `E2E_BUSINESS_UNIT_KEY`, `E2E_CTP_PROJECT_KEY|CLIENT_ID|CLIENT_SECRET|REGION|SCOPE`; `setup.ts` obtains a JWT from `POST /authenticate-project` (tenant API, removed by D/E); every request sends `x-project-key` (removed). Legacy files (auth, content-item, content-type, page-*, pages, proxy) are deleted by C; kept for B/F: `puck-content.e2e.ts` (308 lines), `puck-page.e2e.ts` (300), `configuration.e2e.ts` (145), `datasource.e2e.ts` (129), `file.e2e.ts` (71).
* `contentools/` (admin-app): `jest.test.config.js` = `@commercetools-frontend/jest-preset-mc-app/typescript`; `src/test-utils/index.tsx` wraps `renderApp`/`renderAppWithRedux` from `@commercetools-frontend/application-shell/test-utils`; dev deps already include `msw 0.49.3`, `@testing-library/react 16.1.0`, `jest 29.7`. No spec file exists.
* `mcp/`, `puck/`: no tests, no test tooling (puck builds with tsup, playground with Vite).

## 2. What the service calls on commercetools (the surface msw/fake-CT must emulate)
From `service/src/controllers/custom-object.controller.ts` and `service/src/services/products.ts`:
| Call | Used by |
| --- | --- |
| `POST {auth}/oauth/token` (client credentials) | every request (SDK auth middleware) |
| `POST /{pk}/custom-objects` (upsert: body `{container,key,value,version?}`) | create/update (lines 30, 94) |
| `GET /{pk}/custom-objects/{container}/{key}` (+`expand`) | getCustomObject (line 56-62) |
| `DELETE /{pk}/custom-objects/{container}/{key}` | deleteCustomObject (125) |
| `GET /{pk}/custom-objects/{container}?where=&limit=&expand=` | list/query (150, 183-193) |
| `POST /{pk}/products/search` | product search + datasource resolution (`services/products.ts:18-20`) |
Containers (env-overridable, `service/src/constants.ts`): `PUCK_PAGE_CONTAINER`(`puck-page`), `PUCK_PAGE_STATE_CONTAINER`, `PUCK_PAGE_VERSION_CONTAINER`, `PUCK_CONTENT_CONTAINER`, `PUCK_CONTENT_STATE_CONTAINER`, `PUCK_CONTENT_VERSION_CONTAINER`, `PUCK_TEMPLATE_CONTAINER`, `CONFIGURATION_CONTAINER` (`configuration`), `CONTENT_TYPE_CONTAINER` (`content-type`). Because they are read at import time (`process.env.X || default`), a test must set the env BEFORE importing the app.
Today the CT client is built per request from tenant creds (`client/create.client.ts` uses `@commercetools/sdk-client-v2`, URLs derived from region in `utils/config.utils.ts`). After D it uses the Connect-injected `CTP_*`.

## 3. Facts from the Connect skill (testing.md, security.md, connect-cli.md)
* Run tests with `commercetools connect application test` (wraps `yarn test`); tests at router level with supertest + msw `onUnhandledRequest: 'error'`; required: auth rejection matrix (missing/malformed/`alg:none`/wrong signature/issuer/audience/expired + valid accept), idempotent lifecycle script tests, no stack-trace leaks.
* The platform injects ALL of `CTP_CLIENT_ID, CTP_CLIENT_SECRET, CTP_SCOPE, CTP_PROJECT_KEY, CTP_API_URL, CTP_AUTH_URL` for `inheritAs.apiClient` (security.md:86). `CTP_API_URL`/`CTP_AUTH_URL` are therefore read from env by D (coordinator-confirmed), which is what lets the whole stack run against a local fake CT. See questions.md Q-B1.
* Sibling reference: `/Users/behnam/code/commercetools-labs/search-config/service/test/support/{fake-ct.ts,mc.ts,keys.ts,app.ts}` (in-memory Custom Objects, MC-session fixtures, key generation, in-process app helper) and `tools/test/*.test.mjs` (node:test style).

## 4. Chrome DevTools connector tools available (names verified in this session)
`new_page, navigate_page, wait_for, take_snapshot, take_screenshot, click, fill, fill_form, type_text, press_key, drag, hover, evaluate_script, list_console_messages, get_console_message, list_network_requests, get_network_request, lighthouse_audit, resize_page, select_page, close_page` (prefix `mcp__chrome-devtools__`).

## 5. Playground (UI under test without Merchant Center)
`puck/puck-react-test` (-> `puck/playground` in A): Vite dev server on 5174 (`puck/README.md:316`), env `VITE_BASE_URL`, `VITE_PROJECT_KEY`, `VITE_BUSINESS_UNIT_KEY`, `VITE_JWT_TOKEN` (`.env.example`, `src/App.tsx:31`); J removes the project key/JWT-per-tenant props and I/J give it the new auth contract.

## 6. Risks
* msw 2 vs MC jest preset: the admin-app preset pins `msw 0.49.3` style (`rest` API); do NOT upgrade msw there.
* `ts-jest` + `tsconfig.json` `rootDir: ./src` -> TS6059 for files under `tests/`: needs `tsconfig.test.json`.
* `service/jest.config.cjs` testMatch would execute helper files; narrow to `*.test.ts`.
* Real e2e can leave data behind in the sandbox if a run is killed: provide a sweep script.
