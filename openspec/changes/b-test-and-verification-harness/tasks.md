## 0. Vocabulary (read once)

* **TARGET** = `/Users/behnam/code/commercetools-labs/contentools`; paths below are relative to it. **SOURCE** = `/Users/behnam/code/cms` (read-only).
* **jest / vitest** = test runners. **ts-jest** compiles TypeScript inside jest. **supertest** calls an Express app in memory (no port). **msw** (Mock Service Worker) intercepts outgoing HTTP calls in tests and answers them from handlers.
* **commercetools Custom Object** = a JSON document stored in a project, addressed by `container` + `key`; the service stores all content (pages, contents, states, versions, templates, configuration) as custom objects.
* **Fake CT** = our in-memory imitation of the few commercetools endpoints the service calls (explore.md section 2).
* **Sandbox** = a throw-away real commercetools project owned by the team (manual M-01). **E2E** = end-to-end test against it.
* **Connect application test** = `commercetools connect application test`, the Connect CLI command that runs the app's `test` script.
* **Chrome DevTools connector** = the agent tools named `mcp__chrome-devtools__*` that drive a real Chrome (navigate, snapshot, click, read console/network).
* **BU** = business unit; content is scoped by `/:businessUnitKey/...` (decision Q-03).

## 1. Pre-conditions

Context: B adds tests around code that C/D/E/F will change later; it only needs the copied trees. Pre-conditions: spec A archived (tree exists, `yarn test:tools` green), Node 22, network access for `yarn install` (tests themselves run offline).

- [ ] 1.1 Verify: `ls service/package.json admin-app/package.json mcp/package.json puck/package.json tools/run-all.mjs` prints five paths; `node -v` is v22.x.
- [ ] 1.2 Look up current versions (do not guess): `for p in supertest msw vitest jsdom @testing-library/react @testing-library/user-event @types/supertest; do echo $p $(npm view $p version); done`. Use the latest of these MAJORS: supertest 7, @types/supertest 6, msw 2, vitest 3, jsdom 26, @testing-library/react 16, @testing-library/user-event 14. Note them in the PR notes.

Pitfalls: if C is already applied the legacy e2e files are gone; if not, the task 5.x edits still work (you only add files and edit `e2e/jest.config.js`).
Rollback: `git`-free: delete files you created (listed per task).

## 2. Service: jest configuration and scripts

Context: make `yarn test` in `service/` real and make helper files not run as tests. Pre-condition: Section 1.

- [ ] 2.1 Install dev dependencies (from `service/`): `yarn add --dev supertest@^7 @types/supertest@^6 msw@^2`. (ts-jest, jest, @types/jest already exist.)
  Done when: `node -e "require('msw/node')"` run in `service/` exits 0.
- [ ] 2.2 Create `service/tsconfig.test.json` (needed because `service/tsconfig.json` has `rootDir: ./src`, which makes ts-jest fail with TS6059 for files in `tests/`):
  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": { "rootDir": ".", "noEmit": true, "types": ["jest", "node"] },
    "include": ["src/**/*", "tests/**/*", "e2e/**/*"],
    "exclude": ["node_modules", "build", "temp"]
  }
  ```
- [ ] 2.3 Replace `service/jest.config.cjs`:
  ```js
  /** Unit + integration tests. Live e2e has its own config in e2e/jest.config.js. */
  module.exports = {
    displayName: 'service',
    testEnvironment: 'node',          // NOT jsdom: msw 2 needs Node's fetch/Request globals
    roots: ['<rootDir>/tests'],
    testMatch: ['**/tests/{unit,integration}/**/*.test.ts'],
    setupFiles: ['<rootDir>/tests/support/env.ts'],              // runs BEFORE test files import the app
    setupFilesAfterEnv: ['<rootDir>/tests/support/msw-setup.ts'],
    transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
    moduleDirectories: ['node_modules', 'src'],
    clearMocks: true,
  };
  ```
- [ ] 2.4 Edit `service/package.json` scripts: `"test": "jest --config jest.config.cjs"`, `"test:watch": "jest --config jest.config.cjs --watch"`, `"test:e2e": "jest --config e2e/jest.config.js --runInBand"` (keep), and add `"typecheck": "tsc -p tsconfig.test.json"`.
  Done when: `grep -n "No tests for now" service/package.json` prints nothing.

Pitfalls: the old glob `**/tests/**/*.[jt]s?(x)` executed every helper in `tests/`; the new `testMatch` only takes `*.test.ts`.
Rollback: restore the three edited files from the copy in SOURCE (`/Users/behnam/code/cms/service/{jest.config.cjs,package.json}`).

## 3. Service: fake commercetools, msw wiring, fixtures

Context: one in-memory implementation of the commercetools endpoints the service uses (explore.md section 2). It is written once, framework-free, in TypeScript using only syntax that Node can strip (no enums, no constructor parameter properties) so that task 7.1 can reuse it in a standalone server. Pre-condition: Section 2.

- [ ] 3.1 Create `service/tests/support/fake-ct-store.ts` with these exports (implement fully; skeleton shows the contract):
  ```ts
  export interface CustomObject { id: string; version: number; container: string; key: string; value: unknown; createdAt: string; lastModifiedAt: string }
  export interface FakeResponse { status: number; body: unknown }
  export interface FakeStore { objects: Map<string, CustomObject>; productSearch: unknown; seq: number; calls: Array<{ method: string; path: string }> }

  export function createStore(): FakeStore {
    return { objects: new Map(), productSearch: { total: 0, offset: 0, limit: 20, hits: [] }, seq: 0, calls: [] };
  }

  /** commercetools-shaped error body */
  export function ctError(status: number, code: string, message: string, extra: Record<string, unknown> = {}): FakeResponse {
    return { status, body: { statusCode: status, message, errors: [{ code, message, ...extra }] } };
  }

  /** The single entry point: (method, "/proj/custom-objects/c/k", URLSearchParams, parsed JSON body) -> response */
  export function route(store: FakeStore, method: string, pathname: string, search: URLSearchParams, body: any): FakeResponse { /* see rules below */ }
  ```
  Rules `route` MUST implement (push `{method, path}` to `store.calls` first):
  1. `POST /oauth/token` -> `200 {access_token:'fake-access-token', token_type:'Bearer', expires_in:172800, scope:'manage_key_value_documents:test-project'}`.
  2. Split `pathname` on `/` (drop empties) into `seg`; `seg[0]` is the project key (accept any), `seg[1]` the resource.
  3. `POST /{pk}/custom-objects` body `{container,key,value,version?}`: new -> version 1; existing and `version` absent -> version+1; `version` present and different from current -> `ctError(409,'ConcurrentModification','Object <id> has a different version than expected. Expected: <v> - Actual: <cur>.',{currentVersion:cur})`. Id = `fake-id-<seq>`. Response 201 for create, 200 for update; body is the full custom object.
  4. `GET /{pk}/custom-objects/{container}/{key}` -> 200 object or `ctError(404,'ResourceNotFound',"The CustomObject with ID '<container>|<key>' was not found.")`. Ignore `expand`.
  5. `DELETE` same path -> 200 with the deleted object (409 if `?version=` mismatches, 404 if missing).
  6. `GET /{pk}/custom-objects/{container}` -> `{limit,offset,count,total,results}`; honour `limit` (default 20, max 500), `offset`, `sort` (only `createdAt`/`lastModifiedAt` asc/desc), `where` via `parseWhere`.
  7. `POST /{pk}/products/search` -> `200` with `store.productSearch`.
  8. Anything else -> `ctError(404,'ResourceNotFound','fake-ct: no route for <METHOD> <path>')` (loud on purpose).
- [ ] 3.2 In the same file implement `parseWhere(where: string): (o: CustomObject) => boolean`. Supported grammar (exactly the forms used in `/Users/behnam/code/cms/service/src/controllers/*.ts`): clauses joined by top-level `and` (case-insensitive, ignoring `and` inside quotes/parentheses): `id = "x"`, `key = "x"`, `key in ("a", "b")`, `value(<f> = "v")`, `value(<f1> = "v1" AND <f2> = "v2")`, `value(<f> in ("a","b"))`, where `<f>` may be dotted (`data.root.props.title`). Anything else throws an error that `route` turns into `ctError(400,'InvalidInput','fake-ct: unsupported where clause: <clause>')`.
  Skeleton for the splitter:
  ```ts
  function splitTopLevel(s: string): string[] {
    const out: string[] = []; let depth = 0; let quote = false; let start = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"') quote = !quote;
      else if (!quote && c === '(') depth++;
      else if (!quote && c === ')') depth--;
      else if (!quote && depth === 0 && /^\s+and\s+/i.test(s.slice(i))) {
        out.push(s.slice(start, i).trim()); i += s.slice(i).match(/^\s+and\s+/i)![0].length - 1; start = i + 1;
      }
    }
    out.push(s.slice(start).trim());
    return out;
  }
  ```
  Done when: `tests/unit/fake-ct.test.ts` (task 4.1) passes.
- [ ] 3.3 Create `service/tests/support/msw-setup.ts` and `service/tests/support/fake-ct.ts`:
  ```ts
  // fake-ct.ts
  import { http, HttpResponse } from 'msw';
  import { createStore, route, type FakeStore } from './fake-ct-store';
  export const API = 'http://api.ct.test';   // == CTP_API_URL in env.ts
  export const AUTH = 'http://auth.ct.test'; // == CTP_AUTH_URL
  export let store: FakeStore = createStore();
  export const resetStore = () => { store = createStore(); };
  async function respond(request: Request) {
    const url = new URL(request.url);
    const text = request.method === 'GET' || request.method === 'DELETE' ? '' : await request.text();
    const r = route(store, request.method, url.pathname, url.searchParams, text ? JSON.parse(text) : undefined);
    return HttpResponse.json(r.body as object, { status: r.status });
  }
  export const handlers = [http.all(`${AUTH}/*`, ({ request }) => respond(request)), http.all(`${API}/*`, ({ request }) => respond(request))];
  ```
  ```ts
  // msw-setup.ts (jest setupFilesAfterEnv)
  import { setupServer } from 'msw/node';
  import { handlers, resetStore } from './fake-ct';
  export const server = setupServer(...handlers);
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => { server.resetHandlers(); resetStore(); });
  afterAll(() => server.close());
  ```
- [ ] 3.4 Create `service/tests/support/env.ts` (SET env before imports; no real values):
  ```ts
  Object.assign(process.env, {
    NODE_ENV: 'test',
    CTP_PROJECT_KEY: 'test-project', CTP_CLIENT_ID: 'test-client-id', CTP_CLIENT_SECRET: 'test-client-secret',
    CTP_SCOPE: 'manage_key_value_documents:test-project view_products:test-project',
    CTP_API_URL: 'http://api.ct.test', CTP_AUTH_URL: 'http://auth.ct.test', CTP_REGION: 'europe-west1.gcp',
    SERVICE_API_TOKEN: 'test-service-token', MAX_VERSIONS: '3',
  });
  ```
  (`SERVICE_API_TOKEN` is spec E's name; harmless before E.)
- [ ] 3.5 Create fixtures in `service/tests/fixtures/` (hand-written, keys `test-project`, `test-bu`): `puck-page.json` (`{ "key":"home","businessUnitKey":"test-bu","name":"Home","slug":"/","data":{"content":[{"type":"HeroBanner","props":{"id":"hero-1","title":"Hello"}}],"root":{"props":{}}} }`), `puck-content.json`, `puck-template.json`, `theme-configuration.json`, `product-search-response.json` (`{"total":1,"offset":0,"limit":20,"hits":[{"id":"p-1","productProjection":{"id":"p-1","name":{"en":"Sample"},"masterVariant":{"sku":"SKU-1"}}}]}`). Check the real shapes by reading `/Users/behnam/code/cms/service/src/types/service.types.ts` and `controllers/puck-*.controller.ts` and match field names; invent only values.
  Create `service/tests/support/fixtures.ts`: `export const loadFixture = <T = any>(name: string): T => JSON.parse(readFileSync(join(__dirname, '../fixtures', name), 'utf8'));`.
  Done when: `grep -rnE "ct-poc|run\.app|commercetools-demo|multitenant" service/tests` prints nothing.

Pitfalls: handlers must register BOTH hosts (auth + api); `HttpResponse.json` needs an object, so wrap arrays. Do not import `src/app` in `fake-ct*.ts`.
Rollback: delete `service/tests/support`, `service/tests/fixtures`.

## 4. Service: tests, Connect-checklist helpers

Context: prove the harness with real tests and create the shared helpers D/E/F/H use. Pre-condition: Section 3.

- [ ] 4.1 Create `service/tests/unit/fake-ct.test.ts` covering: upsert v1 then v2; stale `version` -> 409 `ConcurrentModification`; GET 404 body shape; list with `where: key in ("a","b")`; `where: value(businessUnitKey = "test-bu" AND contentType = "x")`; unsupported `where: foo` -> 400. Use `route(createStore(), ...)` directly (no msw).
  Command: `cd service && yarn jest tests/unit/fake-ct.test.ts` -> `Tests: 6 passed`.
- [ ] 4.2 Create `service/tests/support/assertions.ts`:
  ```ts
  import type { Response } from 'supertest';
  export const expectErrorShape = (res: Response, status: number) => {
    expect(res.status).toBe(status);
    expect(res.body).toEqual(expect.objectContaining({ message: expect.any(String) }));
  };
  export const expectNoStackLeak = (res: Response) => {
    const text = JSON.stringify(res.body) + String(res.text ?? '');
    expect(text).not.toMatch(/\n\s+at\s|\.ts:\d+|node_modules|\/Users\/|\/app\//);
  };
  ```
- [ ] 4.3 Create `service/tests/support/auth-matrix.ts` exporting `authRejectionCases` as data and a runner, so spec E only supplies a token factory:
  ```ts
  export type TokenFactory = (kind: string) => Promise<string | undefined>;
  export const authRejectionCases = ['missing', 'malformed', 'alg-none', 'wrong-signature', 'wrong-issuer', 'wrong-audience', 'expired'] as const;
  /** E calls this with a factory that mints each kind of bad token; every case must yield 401 (never 200/500). */
  export function runAuthRejectionMatrix(call: (authHeader: string | undefined) => Promise<{ status: number }>, make: TokenFactory) {
    describe.each(authRejectionCases)('auth rejection: %s', (kind) => {
      it('is rejected with 401', async () => {
        const token = await make(kind);
        const res = await call(token === undefined ? undefined : `Bearer ${token}`);
        expect(res.status).toBe(401);
      });
    });
  }
  ```
- [ ] 4.4 Delete the stale `service/tests/integration/routes.spec.ts` and create `service/tests/integration/app-smoke.test.ts`:
  ```ts
  import request from 'supertest';
  import app from '../../src/app';
  import { expectErrorShape, expectNoStackLeak } from '../support/assertions';

  describe('app smoke', () => {
    it('answers 404 JSON for unknown paths', async () => {
      const res = await request(app).get('/definitely-not-a-route');
      expectErrorShape(res, 404);
      expect(res.body.message).toBe('Path not found.');
      expectNoStackLeak(res);
    });
  });
  ```
  Command: `cd service && yarn test` -> all pass. Pitfall: before spec D the app imports Firestore code; if `import app` throws at import time, add at the top `jest.mock('../../src/utils/firestore.utils')` (D deletes this line together with the module). The 404 behaviour comes from `app.use('*', ...)` + `errorMiddleware` in `src/app.ts`.
- [ ] 4.5 Add `service/tests/integration/fake-ct-msw.test.ts`: call `fetch('http://api.ct.test/test-project/custom-objects', {method:'POST', ...})` then GET it back -> proves the msw wiring; and a test that `fetch('http://example.invalid/')` REJECTS (unhandled request error).
  Done when: `yarn test` prints `Test Suites: 3 passed` (or more) offline (turn Wi-Fi off or run `yarn test` under `sandbox-exec`/firewall if you want proof; msw error on `example.invalid` is the in-repo proof).
- [ ] 4.6 Add to `service/.eslintrc.cjs` nothing; instead ensure `yarn lint` ignores `tests/support` console usage (it has none). Done when `yarn eslint tests --ext .ts` passes.

Verification for Section 4: `cd service && yarn test && yarn typecheck`.
Rollback: delete files created; restore `routes.spec.ts` from SOURCE if desired (it cannot compile anyway).

## 5. Service: sandbox e2e harness (live, guarded)

Context: some behaviour only the real API shows (optimistic concurrency, `where` semantics). These tests are opt-in and cannot touch a non-sandbox project. Pre-condition: Section 2; sandbox only needed for the final run (manual M-01).

- [ ] 5.1 Create `service/e2e/support/containers.ts`: the single list of container env vars and their suffixes:
  ```ts
  export const CONTAINER_ENV: Record<string, string> = {
    PUCK_PAGE_CONTAINER: 'puck-page', PUCK_PAGE_STATE_CONTAINER: 'puck-page-state', PUCK_PAGE_VERSION_CONTAINER: 'puck-page-version',
    PUCK_CONTENT_CONTAINER: 'puck-content', PUCK_CONTENT_STATE_CONTAINER: 'puck-content-state', PUCK_CONTENT_VERSION_CONTAINER: 'puck-content-version',
    PUCK_TEMPLATE_CONTAINER: 'puck-template', CONFIGURATION_CONTAINER: 'configuration', CONTENT_TYPE_CONTAINER: 'content-type',
  };
  export const TEST_CONTAINER_PREFIX = 'contentools-test-';
  ```
  (Source of the names: `/Users/behnam/code/cms/service/src/constants.ts`.)
- [ ] 5.2 Create `service/e2e/support/sandbox-guard.ts`:
  ```ts
  export const REQUIRED = ['E2E_CTP_PROJECT_KEY','E2E_CTP_CLIENT_ID','E2E_CTP_CLIENT_SECRET','E2E_CTP_REGION','E2E_CTP_SCOPE','E2E_BUSINESS_UNIT_KEY','E2E_ALLOW_PROJECT_KEY'] as const;
  export const e2eEnabled = (env = process.env) => REQUIRED.every((k) => !!env[k]);
  export function assertSandbox(env = process.env): void {
    const missing = REQUIRED.filter((k) => !env[k]);
    if (missing.length) throw new Error(`e2e: missing ${missing.join(', ')}`);
    if (env.E2E_CTP_PROJECT_KEY !== env.E2E_ALLOW_PROJECT_KEY)
      throw new Error('e2e: refusing to run: E2E_ALLOW_PROJECT_KEY must equal E2E_CTP_PROJECT_KEY (sandbox only)');
  }
  ```
- [ ] 5.3 Create `service/e2e/support/env-setup.ts` (jest `setupFiles`; runs before imports): if `!e2eEnabled()` return; else `assertSandbox()`; `const runId = process.env.E2E_RUN_ID ?? Date.now().toString(36)`; export it through `process.env.E2E_RUN_ID`; map `CTP_PROJECT_KEY/CLIENT_ID/CLIENT_SECRET/SCOPE/REGION` from `E2E_CTP_*`; DELETE `CTP_API_URL` and `CTP_AUTH_URL` so real hosts are used (or set them explicitly from region per spec D's mapping); for every entry of `CONTAINER_ENV` set `process.env[NAME] = \`${TEST_CONTAINER_PREFIX}${runId}-${suffix}\``. Also `dotenv.config({ path: path.resolve(__dirname, '../../.env.e2e') })` FIRST so a local git-ignored file works.
- [ ] 5.4 Create `service/e2e/support/gate.ts`:
  ```ts
  import { e2eEnabled } from './sandbox-guard';
  export const e2e: typeof describe = (e2eEnabled() ? describe : describe.skip) as typeof describe;
  if (!e2eEnabled()) console.warn('e2e skipped: set E2E_* (see service/e2e/README.md)');
  ```
- [ ] 5.5 Create `service/e2e/support/cleanup.ts` using the SDK with the E2E credentials (`@commercetools/ts-client` + `@commercetools/platform-sdk`, versions per spec D; until D lands use whatever the service already has installed): export `deleteRunObjects(runId)` which for each container name in `CONTAINER_ENV` lists custom objects (`limit 500`) and deletes each; and a jest `setupFilesAfterEnv` file `e2e/support/after-all.ts` calling it in `afterAll`. Replace `e2e/jest.config.js` content:
  ```js
  module.exports = {
    displayName: 'e2e', testEnvironment: 'node', rootDir: __dirname,
    testMatch: ['**/*.e2e.ts'],
    transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.test.json' }] },
    setupFiles: ['<rootDir>/support/env-setup.ts'],
    setupFilesAfterEnv: ['<rootDir>/support/after-all.ts'],
    testTimeout: 30000,
  };
  ```
  Delete `e2e/setup.ts` and `e2e/helpers/http.ts` (they use `/authenticate-project` and `x-project-key`; F re-creates request helpers with the new auth) - unless C already removed them.
- [ ] 5.6 Create `service/e2e/smoke.e2e.ts`: inside `e2e('sandbox smoke', ...)` (from `gate.ts`) write a custom object `{container: process.env.PUCK_PAGE_CONTAINER, key:'smoke', value:{ok:true}}` with the SDK, read it back, expect `value.ok === true`; delete it. Add `service/e2e/README.md` (rewrite): env table (the 7 variables), "skipped when unset", guard explanation, `yarn test:e2e`, the sweep command, and a warning "never use a production project".
  Commands: (a) no env: `cd service && yarn test:e2e` -> `e2e skipped: ...`, exit 0 (`echo $?` prints 0; jest prints "no tests"/skipped). (b) with sandbox env in `service/.env.e2e`: `yarn test:e2e` -> `1 passed`. (c) wrong allow key: `E2E_ALLOW_PROJECT_KEY=other yarn test:e2e` -> fails with `refusing to run`.
- [ ] 5.7 Create `tools/sandbox-sweep.mjs` (zero deps; Node fetch): requires the 7 `E2E_*` variables + guard (same rule); gets a token from `https://auth.<region>.commercetools.com/oauth/token` (region host mapping = the same table as spec D's `region` util; for `E2E_CTP_REGION` like `europe-west1.gcp` use `https://auth.europe-west1.gcp.commercetools.com`), pages through `GET https://api.<region>.commercetools.com/<pk>/custom-objects?limit=500&offset=...`, deletes every object whose `container` starts with `contentools-test-`, prints `deleted N`. Test its pure parts in `tools/test/sandbox-sweep.test.mjs` (guard refusal, prefix filter).

Pitfalls: (1) `e2e/jest.config.js` has no `testMatch` for `smoke` unless the file ends `.e2e.ts`. (2) Never print `E2E_CTP_CLIENT_SECRET`. (3) The container env vars are read at import time: `env-setup.ts` must be `setupFiles`, not `setupFilesAfterEnv`. (4) If D renames container env vars, update ONLY `containers.ts`.
Rollback: delete `service/e2e/support`, `service/e2e/smoke.e2e.ts`, `tools/sandbox-sweep.mjs`.

## 6. UI test stacks (puck, mcp, admin-app)

Context: frontends need a DOM; puck/mcp use vitest, the Merchant Center app keeps its jest preset. Pre-condition: Section 1.

- [ ] 6.1 `puck/`: from `puck/` run `yarn add -D -W vitest@^3 jsdom@^26 @testing-library/react@^16 @testing-library/user-event@^14 @testing-library/jest-dom@^6 msw@^2` (needs `corepack enable`, manual M-A1). Create `puck/vitest.shared.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({ test: { environment: 'jsdom', globals: true, setupFiles: ['../../vitest.setup.ts'], restoreMocks: true } });
  ```
  and `puck/vitest.setup.ts`: `import '@testing-library/jest-dom/vitest'; import { setupServer } from 'msw/node'; export const server = setupServer(); beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); afterEach(() => server.resetHandlers()); afterAll(() => server.close());`.
- [ ] 6.2 `puck/packages/puck-api/`: add `vitest.config.ts` (`import shared from '../../vitest.shared'; export default shared;`), script `"test": "vitest run"`, and `src/__tests__/http-client.test.ts` which registers an msw handler for `http://svc.test/service/test-bu/puck-pages` returning `[]` and asserts `httpClient` (in `src/api/http-client.ts`) returns it, sends header `x-source: puck-api`, and throws `[puck-api] HTTP 500` on a 500. (J later changes the auth headers; this test asserts only what is stable.) Add root script in `puck/package.json`: `"test": "yarn workspaces foreach --all run test"` (packages without a `test` script are skipped by Yarn: use `yarn workspaces foreach --all --no-private run test` if it errors).
  Command: `cd puck && yarn test` -> `1 passed`.
- [ ] 6.3 `mcp/`: `yarn add --dev vitest@^3 msw@^2`; script `"test": "vitest run"`; `mcp/vitest.config.ts` (`environment: 'node'`); `mcp/src/shared/tools.test.ts` asserts `allTools` has length > 0 and `new Set(allTools.map(t => t.method)).size === allTools.length`. (`allTools` is exported from `mcp/src/shared/tools.ts`.)
  Command: `cd mcp && yarn test` -> `1 file passed`. (M replaces the tool set; the uniqueness test stays.)
- [ ] 6.4 `admin-app/`: keep `jest.test.config.js`. Create `admin-app/src/test-utils/msw.ts` exporting `server` built with `setupServer` from `msw/node` using the msw 0.49 API (`import { rest } from 'msw'`) and a `graphql` handler helper for the Merchant Center GraphQL proxy; add `src/components/__tests__/smoke.spec.tsx` that renders a trivial `<div>ok</div>` with `renderApplication(...)` from `src/test-utils/index.tsx` and asserts `screen.getByText('ok')`. Check `admin-app/package.json` already has `"test": "jest --config jest.test.config.js"`.
  Command: `cd admin-app && yarn install && yarn test` -> `1 passed`.
  Pitfall: do NOT bump msw in admin-app beyond what the MC jest preset supports (explore.md section 6); `install` here may need `--legacy-peer-deps` until K regenerates dependencies (record what you used).
- [ ] 6.5 Root hub: add to `/package.json` scripts `"dev:fake-ct": "node --experimental-strip-types tools/fake-ct/server.mjs"`; make sure `yarn test` at the root (A's `run-all`) now reports pass/skip per app.

Rollback: remove the added devDependencies and files.

## 7. Browser verification: fake-CT server and Chrome DevTools playbooks

Context: UI behaviour is verified by driving a real browser through the Chrome DevTools connector (NOTE: the connector must be attached to the session first, manual M-B1; when it is disconnected the playbooks cannot run and the automated tests of Sections 2-6 are the only evidence; record "browser verification not run: connector detached"). The stack runs against the fake CT so no sandbox is needed; Merchant Center is the only human-gated part. Pre-condition: Section 3. (Playbook steps that need the final auth contract/props are filled by J/K/Q; B ships the skeleton that works against whatever the playground supports at that time.)

- [ ] 7.1 Create `tools/fake-ct/server.mjs` (zero deps):
  ```js
  import { createServer } from 'node:http';
  import { createStore, route } from '../../service/tests/support/fake-ct-store.ts';
  const store = createStore();
  const port = Number(process.env.FAKE_CT_PORT ?? 8099);
  createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let raw = ''; for await (const c of req) raw += c;
    let body; try { body = raw ? (req.headers['content-type']?.includes('json') ? JSON.parse(raw) : undefined) : undefined; } catch { body = undefined; }
    const r = route(store, req.method, url.pathname, url.searchParams, body);
    res.writeHead(r.status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(r.body));
  }).listen(port, () => console.log(`fake-ct listening on :${port}`));
  ```
  Add `tools/fake-ct/README.md` (3 lines). `POST /oauth/token` carries a form body (`grant_type=...`): `route` ignores the body for that path, which is why content-type is checked.
  Test `tools/test/fake-ct-server.test.mjs`: spawn the server on a random port with `node --experimental-strip-types`, `fetch` token + custom-object round trip, kill it.
  Done when: `yarn dev:fake-ct` then `curl -s -X POST localhost:8099/oauth/token -d grant_type=client_credentials` prints a JSON with `access_token`.
- [ ] 7.2 Create `tools/verify/01-start-stack.md`: terminal commands in order, each in its own background shell:
  1. `yarn dev:fake-ct` (8099)
  2. `cd service && CTP_PROJECT_KEY=test-project CTP_CLIENT_ID=x CTP_CLIENT_SECRET=y CTP_SCOPE=manage_key_value_documents:test-project CTP_API_URL=http://localhost:8099 CTP_AUTH_URL=http://localhost:8099 SERVICE_API_TOKEN=local-dev-token yarn start:dev` (8080)
  3. `cd puck && yarn start:playground` (5174; set the playground `.env` per its `.env.example`: `VITE_BASE_URL=http://localhost:8080/service`, BU `test-bu`, token `local-dev-token` after J)
  Readiness check: `curl -s localhost:8080/service/health` -> 200 (after D/E).
- [ ] 7.3 Create `tools/verify/02-playground-smoke.md` containing this exact ordered script (the implementer executes it with the connector; `<uid>` values come from the snapshot):
  ```
  1. mcp__chrome-devtools__new_page            url=http://localhost:5174
  2. mcp__chrome-devtools__wait_for            text=<a stable heading of the playground>   (timeout 15000)
  3. mcp__chrome-devtools__take_snapshot       -> assert the page lists the Page manager
  4. mcp__chrome-devtools__list_console_messages -> assert no entry of type error
  5. mcp__chrome-devtools__click uid=<"Create page" button> ; fill uid=<name input> value="E2E Home" ; click uid=<confirm>
  6. mcp__chrome-devtools__wait_for            text="E2E Home"
  7. mcp__chrome-devtools__list_network_requests -> assert POST .../test-bu/puck-pages = 200/201, no 4xx/5xx, request headers have Authorization: Bearer ..., NONE has x-project-key
  8. mcp__chrome-devtools__evaluate_script      function="async () => (await fetch('http://localhost:8080/service/test-bu/puck-pages', {headers:{Authorization:'Bearer local-dev-token'}})).json()" -> assert array contains key of "E2E Home"
  9. mcp__chrome-devtools__take_screenshot     filePath=plans/evidence/<spec>/02-created.png
  ```
  End the file with the checklist: no console errors, no 4xx/5xx, no `x-project-key`, evidence saved, service log has the correlation id field.
- [ ] 7.4 Create `tools/verify/03-editor-drag-drop.md` (open a page in the editor; `drag` a component from the left list into the canvas; `take_snapshot` to assert the component's text; click Publish; `list_network_requests` shows `PUT .../states/published`), `tools/verify/04-renderer-ssr.md` (navigate to the playground renderer route, `wait_for` the published title, optional `lighthouse_audit`), `tools/verify/05-mc-app-owner-assisted.md` (starts with "A. automatable: none. B. needs MC login (manual M-04): ..." then the steps `navigate_page` to the MC URL of the custom application, `take_snapshot`, assert the page list renders, console/network checks) and `tools/verify/README.md` (conventions: evidence path, never screenshot secrets, how to read `take_snapshot` uids, `resize_page` 1440x900 default).
- [ ] 7.5 Add a unit test `tools/test/playbooks.test.mjs`: every `tools/verify/*.md` mentions at least one `mcp__chrome-devtools__` tool name and the words `evidence`; 05 contains `M-04`.
  Done when: `yarn test:tools` passes.

Pitfalls: `node --experimental-strip-types` prints an ExperimentalWarning (fine). Importing a `.ts` file from `.mjs` requires the explicit `.ts` extension. Chrome's first page may need `select_page` after `new_page`. Do not commit screenshots (`plans/evidence/` is ignored).
Rollback: delete `tools/fake-ct`, `tools/verify`.

## 8. Verification and Definition of Done

Automated (all offline except 8.4):
- [ ] 8.1 `cd service && yarn test && yarn typecheck` -> green.
- [ ] 8.2 `cd puck && yarn test`; `cd mcp && yarn test`; `cd admin-app && yarn test` -> green.
- [ ] 8.3 `yarn test:tools` (root) -> green; `yarn test` (root) prints per-app results.
- [ ] 8.4 With sandbox env (M-01): `cd service && yarn test:e2e` -> smoke passes and `node tools/sandbox-sweep.mjs` prints `deleted 0`.
- [ ] 8.5 Without env: `cd service && yarn test:e2e; echo $?` -> skip message and `0`.
- [ ] 8.6 Run playbook 01+02 once end-to-end with the Chrome connector (needs A+J done for the final props; before J run 01 and steps 1-4 only) and store evidence in `plans/evidence/b/`.

Definition of Done (scenario mapping): Offline test run -> 2.x, 4.5, 8.1. Helpers not executed -> 2.3 (`yarn jest --listTests`). Fake CT upsert/read/409 -> 3.1, 4.1. No real identifiers -> 3.5. Stack-leak helper -> 4.2, 4.4. Fixtures load -> 3.5. E2E skipped/guard/cleanup/in-process -> 5.x, 8.4-8.5. puck/admin-app/mcp smoke -> 6.x. Fake-CT server, playbooks, labelled MC steps, evidence ignored -> 7.x. `openspec validate b-test-and-verification-harness --strict` passes.
