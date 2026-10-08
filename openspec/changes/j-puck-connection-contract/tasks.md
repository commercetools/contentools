## 0. Conventions and pre-conditions (read first)

Vocabulary. **Tenant / projectKey**: the old internal service served many commercetools projects; every call said which one with a `projectKey` prop and an `x-project-key` header. Contentools serves exactly one project, so that concept is deleted. **BU (business unit)**: a commercetools B2B entity used here only to scope content (`/:businessUnitKey/...` in URLs); it stays. **JWT**: a signed login token sent as `Authorization: Bearer <token>`. **Merchant Center (MC)**: the commercetools admin UI; a custom app inside it cannot call our service directly with a token, it calls the MC **forward-to proxy**, which verifies the user and forwards the request to our service with a fresh JWT. **Fetcher**: a function the host app gives us that performs the HTTP request instead of `fetch`. **Client**: the new object (`createPuckClient`) that builds URLs, headers and errors for every call. **Mock service**: a tiny fake of our backend used for local verification.

Shorthand: `$REPO=/Users/behnam/code/commercetools-labs/contentools`, `$PUCK=$REPO/puck`. Commands run from `$PUCK` with `corepack yarn` (Yarn 4.5.1). `OLD=/Users/behnam/code/cms/puck` is the original, read-only.

Pre-conditions:
* Spec I is archived: `$PUCK` exists with `@commercetools-labs/puck-*` names, `components/blocks/`, ESLint 9, vitest, SPDX headers; `corepack yarn verify` is green. **Line numbers in this file are from the original source (see explore.md) and have shifted by +6 (SPDX header); always search by symbol (`grep -rn projectKey packages/*/src`).**
* Specs E and F are *not* required. If they are archived, read their `design.md` auth section and compare with the policy table in 1.3 before starting (differences go into design.md D-3 + questions.md).
* Tools: Node 22, Chrome with the Chrome DevTools connector (tools `mcp__chrome-devtools__*`), `curl`.

Rules: no `any`; no commented-out code; every new file starts with the SPDX header from `plans/04-spec-author-brief.md`; no `projectKey` or `x-project-key` anywhere when you finish (except the migration doc and the guard test); after each group run `corepack yarn typecheck` (tsc is the safety net: every old call site fails to compile until migrated, so the order below keeps the tree compiling per package).

## 1. Connection types, client, errors, policy (puck-types + puck-api)

Context: today three different pieces of code build headers and call `fetch` (`puck-api/src/api/http-client.ts`, `puck-api/src/api/configuration.api.ts`, `puck-image-picker/src/api/media-library.api.ts`). We replace them with one client. Design: `design.md` D-1 to D-4.

- [x] 1.1 Create `packages/puck-types/src/connection.types.ts` with exactly the types in design.md D-1 (`PuckHttpMethod`, `PuckRequest`, `PuckResponse`, `PuckFetcher`, `PuckAuthHeaders`, `PuckGetAuthHeaders`, `PuckConnection`) and export them from `packages/puck-types/src/index.ts` (`export type { ... } from './connection.types';`).
  Done when: `corepack yarn workspace @commercetools-labs/puck-types build` exits 0 and `dist/index.d.ts` contains `PuckConnection`.
- [x] 1.2 Create `packages/puck-api/src/client/errors.ts`:
  ```ts
  export class PuckHttpError extends Error {
    readonly status: number; readonly statusText: string; readonly body: string; readonly url: string; readonly method: string;
    constructor(init: { status: number; statusText: string; body: string; url: string; method: string }) {
      super(`[puck-api] HTTP ${init.status}: ${init.body || init.statusText}`);
      this.name = 'PuckHttpError'; Object.assign(this, init);
    }
  }
  export class PuckAuthError extends PuckHttpError {
    readonly authCode: 'PUCK_AUTH_REQUIRED' | 'PUCK_AUTH_REJECTED';
    constructor(init: ConstructorParameters<typeof PuckHttpError>[0], authCode: 'PUCK_AUTH_REQUIRED' | 'PUCK_AUTH_REJECTED') {
      super(init); this.name = 'PuckAuthError'; this.authCode = authCode;
    }
  }
  ```
  The service error body is `{ message, statusCode, correlationId, code?, errors? }` (spec E/D). In the `PuckHttpError` constructor parse `init.body` with `JSON.parse` in try/catch and expose optional `readonly serverMessage?: string` (`message`), `code?: string`, `correlationId?: string`, `errors?: unknown`; build `super()` message as `[puck-api] HTTP <status>: <serverMessage ?? body ?? statusText>`. `PuckAuthError`'s client-side `code` union (`PUCK_AUTH_REQUIRED`/`PUCK_AUTH_REJECTED`) is stored in a separate field `authCode` so it never collides with the server's `code` string (adjust the snippet: `readonly authCode`; tests use `authCode`).
  `Object.assign(this, init)` is acceptable only because the fields are declared `readonly` above; if TS complains (`strictPropertyInitialization`), assign each field explicitly.
  Done when: `tsc` passes for the package (`corepack yarn workspace @commercetools-labs/puck-api typecheck`).
- [x] 1.3 Create `packages/puck-api/src/client/auth-policy.ts`. Define `export type PuckOp = ...` as the union of the 35 function names (copy the names from `packages/puck-api/src/index.ts` exports ending in `Api`), `type Mode = 'published' | 'preview'`, `type PolicyValue = 'public' | 'protected' | 'attach' | ((mode: Mode) => 'public' | 'protected')`, and
  ```ts
  export const PUCK_AUTH_POLICY: Record<PuckOp, PolicyValue> = {
    // public (spec E table 4: published reads + configuration reads)
    getPublishedPuckPageApi: 'public', getPublishedPuckContentApi: 'public', getThemeApi: 'public',
    queryPuckPageApi: (mode) => (mode === 'preview' ? 'protected' : 'public'),
    queryPuckContentApi: (mode) => (mode === 'preview' ? 'protected' : 'public'),
    // protected: everything else, listed one by one (preview reads, lists, get-with-states, mutations, states, versions,
    // templates, media, upload, import, search) and, special, resolveDatasourceApi: 'attach' (service decides, flag PUBLIC_DATASOURCE_RESOLVE)
    getPreviewPuckPageApi: 'protected', /* ... all remaining 28 entries ... */
  };
  ```
  Done when: it compiles (the `Record<PuckOp, ...>` type forces all 35 keys) and `grep -c "'protected'" auth-policy.ts` is at least 27; the one `'attach'` entry is `resolveDatasourceApi`. Cross-check against `openspec/changes/e-service-auth-model/design.md` section 4 and `f-service-content-api/design.md` section 2 (list of public routes: published reads/queries and the configuration GETs).
  Also in this task: in `client.ts` treat `'attach'` like `'public'` for the pre-check, and add `publicDatasourceResolve?: boolean` to `PuckConnection` (task 1.1) and a getter `client.publicDatasourceResolve` (from the connection).
- [x] 1.4 Create `packages/puck-api/src/client/client.ts` (full logic; this is the heart of the change):
  ```ts
  import type { PuckConnection, PuckFetcher, PuckHttpMethod, PuckRequest, PuckResponse } from '@commercetools-labs/puck-types';
  import { PuckAuthError, PuckHttpError } from './errors';
  import { PUCK_AUTH_POLICY, type PuckOp } from './auth-policy';

  export interface PuckRequestInit {
    method?: PuckHttpMethod;
    body?: unknown;                               // object -> JSON; FormData passes through
    query?: Record<string, string | number | undefined>;
    nullOn404?: boolean;
    mode?: 'published' | 'preview';              // for function-valued policies
  }
  export interface PuckClient {
    readonly baseURL: string;
    readonly businessUnitKey: string;
    readonly canAuthenticate: boolean;
    request<T>(op: PuckOp, path: string, init?: PuckRequestInit): Promise<T>;
  }

  const defaultFetcher: PuckFetcher = (r: PuckRequest) =>
    fetch(r.url, { method: r.method, headers: r.headers, body: r.body });   // the ONLY fetch( in the packages

  const holders = new WeakMap<PuckClient, { current: PuckConnection }>();

  export function createPuckClient(connection: PuckConnection): PuckClient {
    const holder = { current: connection };
    const client: PuckClient = {
      get baseURL() { return holder.current.baseURL.replace(/\/+$/, ''); },
      get businessUnitKey() { return holder.current.businessUnitKey; },
      get canAuthenticate() { const c = holder.current; return Boolean(c.jwtToken || c.getAuthHeaders || c.fetcher); },
      async request<T>(op: PuckOp, path: string, init: PuckRequestInit = {}): Promise<T> {
        const c = holder.current;
        const policy = PUCK_AUTH_POLICY[op];
        const level = typeof policy === 'function' ? policy(init.mode ?? 'published') : policy;
        const method = init.method ?? 'GET';
        const url = buildUrl(client.baseURL, path, init.query);
        if (level === 'protected' && !client.canAuthenticate) {
          throw new PuckAuthError({ status: 401, statusText: 'Unauthorized', body: 'auth required: configure jwtToken, getAuthHeaders or fetcher', url, method }, 'PUCK_AUTH_REQUIRED');
        }
        const headers: Record<string, string> = { 'x-source': 'puck-api' };
        let body: string | FormData | undefined;
        if (init.body instanceof FormData) body = init.body;
        else if (init.body !== undefined) { body = JSON.stringify(init.body); headers['Content-Type'] = 'application/json'; }
        const auth = c.getAuthHeaders ? await c.getAuthHeaders() : c.jwtToken ? { Authorization: `Bearer ${c.jwtToken}` } : {};
        Object.assign(headers, auth);
        const res: PuckResponse = await (c.fetcher ?? defaultFetcher)({ url, method, headers, body });
        if (res.status === 404 && init.nullOn404) return null as T;
        if (!res.ok) {
          const text = await res.text();
          const err = { status: res.status, statusText: res.statusText, body: text, url, method };
          throw res.status === 401 || res.status === 403 ? new PuckAuthError(err, 'PUCK_AUTH_REJECTED') : new PuckHttpError(err);
        }
        if (res.status === 204 || !(res.headers.get('content-type') ?? '').includes('application/json')) return undefined as T;
        return (await res.json()) as T;
      },
    };
    holders.set(client, holder);
    return client;
  }
  export function updatePuckClient(client: PuckClient, connection: PuckConnection): void {
    const h = holders.get(client); if (h) h.current = connection;
  }
  ```
  plus `buildUrl(base, path, query)` (skips `undefined` query values, uses `URLSearchParams`). The `as T` casts on `null`/`undefined` are the one accepted escape (same as the old `httpClient`); comment why in one line.
  Done when: package typechecks.
- [x] 1.5 Create `packages/puck-api/src/client/index.ts` exporting everything public (`createPuckClient`, `PuckClient`, `PuckRequestInit`, `PuckHttpError`, `PuckAuthError`, `PUCK_AUTH_POLICY`, `PuckOp`) but **not** `updatePuckClient` (internal: import it by relative path from the provider). Add to `packages/puck-api/src/index.ts`: `export * from './client';` and re-export the connection types: `export type { PuckConnection, PuckFetcher, PuckRequest, PuckResponse, PuckGetAuthHeaders, PuckAuthHeaders } from '@commercetools-labs/puck-types';`.
  Also export `fetcherFromFetch(f: typeof fetch): PuckFetcher` (design D-7b) from `client/index.ts`.
  Done when: `grep -n "createPuckClient" packages/puck-api/src/index.ts packages/puck-api/src/client/index.ts` finds it in the index chain and a 1-line test shows `fetcherFromFetch(spy)` calls `spy(url, { method, headers, body })`.
- [x] 1.6 Tests `packages/puck-api/src/client/client.test.ts` (vitest; use an inline `PuckFetcher` that records requests, no server needed yet). One `it` each:
  0. error body `{"message":"Authentication required","statusCode":401,"correlationId":"c1"}` yields `serverMessage`, `correlationId` and `error.message === '[puck-api] HTTP 401: Authentication required'`; a body with `code: 'X'` exposes `error.code === 'X'`;
  1. public read, no auth: headers exactly `{ 'x-source': 'puck-api' }`, no `Authorization`, no `Content-Type`;
  2. write with `jwtToken: 'abc'`: headers include `Authorization: Bearer abc` and `Content-Type: application/json`, body is the JSON string;
  3. `getAuthHeaders` async wins over `jwtToken`;
  4. `FormData` body: no `Content-Type` key in headers;
  5. protected call without auth: rejects `PuckAuthError` with `authCode === 'PUCK_AUTH_REQUIRED'` and the fetcher spy was **not** called;
  6. `fetcher` only (no token): protected call succeeds and no `Authorization` key was added;
  7. 401 and 403 -> `PuckAuthError` with `authCode 'PUCK_AUTH_REJECTED'`, 500 -> `PuckHttpError` (not Auth), message starts with `[puck-api] HTTP 500:`;
  8. 404 with `nullOn404` -> `null`; 204 -> `undefined`;
  9. `mode: 'preview'` on `queryPuckPageApi` is protected, `'published'` is public;
  10. `updatePuckClient` swaps token and `client` identity stays the same;
  11. trailing slash in `baseURL` is removed; query values `undefined` skipped.
  Add `auth-policy.test.ts`: `expect(Object.keys(PUCK_AUTH_POLICY).sort()).toMatchSnapshot()` and `expect(Object.keys(PUCK_AUTH_POLICY)).toHaveLength(35)`.
  Run: `corepack yarn vitest run packages/puck-api` -> expected "12 passed" (11 + policy file adds 2 => 13; the exact count is yours, all green).
  Done when: all pass.

Pitfalls: `FormData` exists in Node 22 and jsdom (global); the `instanceof FormData` check is why tests run in jsdom/Node 22. `res.json()` on a `PuckResponse` returns `Promise<unknown>`; the `as T` cast is deliberate. Do not log headers (they contain the token).
Verification: `corepack yarn typecheck && corepack yarn vitest run packages/puck-api`.
Rollback: delete `packages/puck-api/src/client/` and the type file; nothing else is changed yet.

## 2. Raw API functions take the client

Context: the 35 exported functions currently take `(baseURL, projectKey, [jwtToken,] businessUnitKey, ...)`. They become `(client, ...args)` (mapping table: design.md D-10). Do one file at a time; each file is small. Use `enc = encodeURIComponent` for every key placed in a path (create `packages/puck-api/src/client/path.ts` exporting `enc`).

- [x] 2.1 Rewrite `packages/puck-api/src/api/puck-pages.api.ts` (8 functions; old paths in explore.md section 2). Skeleton for three of them, the rest follow the same pattern with the old URL kept:
  ```ts
  export const listPuckPagesApi = (client: PuckClient) =>
    client.request<PuckPageListResponse>('listPuckPagesApi', `/${client.businessUnitKey}/puck-pages`);
  export const createPuckPageApi = (client: PuckClient, body: { value: CreatePuckPageInput }) =>
    client.request<PuckPageResponse>('createPuckPageApi', `/${client.businessUnitKey}/puck-pages`, { method: 'POST', body });
  export const queryPuckPageApi = (client: PuckClient, body: { query: string }, mode: 'published' | 'preview') =>
    client.request<PuckPageResponse['value'] | null>('queryPuckPageApi', `/${client.businessUnitKey}/${mode}/puck-pages/query`, { method: 'POST', body, nullOn404: true, mode });
  ```
  The op name string equals the exported function name (typed by `PuckOp`). Delete the `readHeaders/writeHeaders/httpClient` imports.
  Done when: file has no `baseURL` parameter; typecheck of this file passes (other files still fail until migrated: use `corepack yarn tsc --noEmit -p packages/puck-api 2>&1 | grep puck-pages.api`).
- [x] 2.2 Same for `puck-states.api.ts` (4: states GET, publish PUT `/states/published` with body per old code, revert DELETE `/states/draft`, versions GET), `puck-contents.api.ts` (8; `listPuckContentsApi` uses `new URL(...)` + query params today: use `query`), `puck-content-states.api.ts` (4), `puck-templates.api.ts` (3; the optional `kind` becomes `query: { kind }`).
  Done when: all four migrated; `grep -c "projectKey" <file>` is 0 for each.
- [x] 2.3 `configuration.api.ts` (4: `getThemeApi` with `nullOn404: true`, `createThemeApi` POST `/:bu/configuration/theme` body `{ value }`, `updateThemeApi` PUT same, `importDefaultContentTypesApi` POST `/:bu/content-type/import` with the old body): delete the local `readHeaders`, `writeHeaders`, `handleResponse` and all raw `fetch`.
  Done when: file has no `fetch(`.
- [x] 2.4 `media-library.api.ts` (contract from spec G: cursor pagination, see design D-15): `fetchMediaLibraryApi(client, options: { extensions?: string[]; limit?: number; cursor?: string } = {})` -> GET `/${bu}/media-library` with `query: { extensions: extensions.join(',') only if non-empty, limit, cursor }` (no `page`), returns `MediaLibraryResult`; `uploadMediaFileApi(client, file, title?, description?)` builds `FormData` exactly as before (`file`, `title`, `description`) and returns `MediaUploadResult` (`{ url, key, name, size, contentType }`, G's upload response). Update `packages/puck-types/src/puck-api.types.ts` (lines ~22-43 in the source): `MediaFile` gains optional `key`, `contentType`, `createdAt` becomes optional; `MediaLibraryPagination` becomes `{ limit: number; nextCursor: string | null; hasMore: boolean }` (remove `totalItems`, `totalPages`, `currentPage`); add `MediaUploadResult`; export it from `puck-types/src/index.ts`.
  Done when: no `x-project-key`; `grep -rn "totalPages\|totalItems\|currentPage" packages/puck-types/src packages/puck-api/src` -> empty.
- [x] 2.5 `products.api.ts`: `searchProductsApi(client, text, options = {})` -> GET `/products/search` with `query: { text, limit, locale }`. `datasource.api.ts`: `resolveDatasourceApi(client, datasourceKey, body)` -> POST `/datasource/${enc(key)}/test`, body `{ params }` as passed.
  Done when: both compile.
- [x] 2.6 Delete `packages/puck-api/src/api/http-client.ts` once nothing imports it (`grep -rn "http-client" packages/puck-api/src` -> empty).
  Done when: file removed.
- [x] 2.7 Tests with the mock server come in group 7/8; for now add one table test `packages/puck-api/src/api/paths.test.ts`: with a recording fetcher, call each of the 35 functions once and assert `method` + URL path (relative to baseURL) against a literal table (copy from explore.md section 2; `:bu` = `main-store`, key `k1`). Expected: 35 assertions green.
  Done when: test passes.

Pitfalls: `searchProductsApi` and `resolveDatasourceApi` have **no** BU segment in their path; do not "fix" that (spec F owns the routes). Old `listPuckContentsApi` built query params on a `URL`; the new `query` option replaces it.
Verification: `corepack yarn vitest run packages/puck-api`.
Rollback: `git`-less: restore the group-1 snapshot of `api/` from `$OLD` after re-applying spec I renames (copy `packages/puck-api/src/api` from `$OLD`, then rerun spec I's scope sed and header script).

## 3. Context, provider and hooks

Context: React glue. Hooks stop destructuring `projectKey`/`jwtToken` and use the client.

- [x] 3.1 `packages/puck-api/src/context/PuckApiContext.tsx`: replace the interface by
  ```ts
  export interface PuckApiContextValue {
    client: PuckClient;
    baseURL: string; businessUnitKey: string; locale?: string; canAuthenticate: boolean;
    connection: PuckConnection;      // original props, used to re-mount nested providers
  }
  export const usePuckApiContext = (): PuckApiContextValue => { /* throws as before */ };
  export const usePuckApiContextOptional = (): PuckApiContextValue | null => useContext(PuckApiContext);
  export const usePuckClient = (): PuckClient => usePuckApiContext().client;
  ```
  Done when: compiles; export the two new hooks from `src/index.ts`.
- [x] 3.2 `PuckApiProvider.tsx`: props `PuckConnection & { children }`. Create the client once: `const [client] = useState(() => createPuckClient({ baseURL, businessUnitKey, locale, jwtToken, getAuthHeaders, fetcher }))`; keep it current with `useLayoutEffect(() => updatePuckClient(client, connection))` where `connection` is the memoised props object (`useMemo`, deps are the 6 props). Context value via `useMemo` keyed on `client`, `baseURL`, `businessUnitKey`, `locale`, `connection`. Nested-provider rule (design D-5): if an ancestor context exists and its `connection` is shallow-equal, render children inside the ancestor provider's value (reuse client) instead of creating a new one.
  Done when: unit test `PuckApiProvider.test.tsx`: (a) `useRef` of `usePuckApiContext().client` is identical after `rerender` with a new `jwtToken`; (b) a protected call after rerender uses the new token (fetcher spy).
- [x] 3.3 Migrate hooks (one at a time, same pattern). Read `const { client, canAuthenticate } = usePuckApiContext();` instead of `{ baseURL, projectKey, businessUnitKey, jwtToken }`; replace calls (`getPuckPageApi(baseURL, projectKey, businessUnitKey, pageKey)` -> `getPuckPageApi(client, pageKey)`); remove every `if (!jwtToken) throw new Error('jwtToken is required ...')` (the client throws `PuckAuthError` itself; keep `setError((err as Error).message)` behaviour); dependency arrays use `[client, pageKey]`. Files with the usage-line counts from explore.md: `usePuckPage.ts` (21 hits), `usePuckContent.ts` (17), `usePuckStateManagement.ts`, `usePuckContents.ts`, `usePuckPages.ts`, `usePuckTemplates.ts`, `usePuckConfiguration.ts`, `usePuckContentType.ts`, `useMediaLibrary.ts`, `useProductSearch.ts`, `useDatasource.ts` (special: group 6.4).
  Done when: `grep -rn "projectKey\|jwtToken" packages/puck-api/src` prints nothing except `client/` + `context/PuckApiProvider.tsx` + `types`, and `corepack yarn workspace @commercetools-labs/puck-api typecheck` exits 0.
- [x] 3.4 `usePuckPage` keeps the 1500 ms debounce; its `saveDraft` previously threw synchronously when no token: now it rejects with `PuckAuthError` from the client **after** the debounce. For a faster UX add at the top of `saveDraft`: `if (!canAuthenticate) throw new PuckAuthError(...)` using the same authCode `PUCK_AUTH_REQUIRED` (export a helper `authRequiredError(url, method)` from `client/errors.ts` and use it in the client too). Same for `usePuckContent.saveDraft`.
  Done when: hook test `usePuckPage.test.tsx` (RTL `renderHook`, wrapper = provider with a recording fetcher): (1) with `jwtToken` `saveDraft` sends `PUT .../puck-pages/home` after fake-timer advance of 1500 ms; (2) without auth `saveDraft` rejects immediately with `PuckAuthError` and no request is made.
- [x] 3.5 Add hook tests for `usePuckPages` (list + create + delete with auth; list without auth shows `error` text starting `[puck-api] HTTP 401`), and `useMediaLibrary` (`uploadFile` sends `FormData`, no `Content-Type`).
  Done when: `corepack yarn vitest run packages/puck-api` all green (expected 30+ tests so far).

Pitfalls: hooks' `useCallback` dependency arrays previously included `projectKey`/`jwtToken`; if you leave them the tsc error tells you; replace with `client`. Because the client identity is stable, effects that depended on `jwtToken` to re-run after a token change no longer re-run: that is intended (a token change must not refetch); only `baseURL`/`businessUnitKey` changes create a new client... **they do not** (the provider updates the holder), so add `baseURL` and `businessUnitKey` from context to the deps of the *load* effects (`reload` callbacks) to keep refetching when the BU changes.
Verification: `corepack yarn workspace @commercetools-labs/puck-api build` (dist must not contain `projectKey`: `grep -c projectKey packages/puck-api/dist/index.js` -> 0).
Rollback: revert hooks/context from the spec I state.

## 4. Public components: editor, managers, theme, import

Context: each public component declares its own `projectKey`/`jwtToken` props and mounts a `PuckApiProvider`. Replace with `PuckConnection`.

- [x] 4.1 `packages/puck-editor/src/PuckEditor.tsx` (`PuckEditorProps` at ~349-353, component at ~387-407): `export interface PuckEditorProps extends PuckConnection { pageKey: string; config?: Config; ... }` (delete the `baseURL`, `projectKey`, `businessUnitKey`, `jwtToken`, `locale` members; keep their doc comments by moving them to `PuckConnection`), and mount `<PuckApiProvider baseURL=... businessUnitKey=... locale=... jwtToken=... getAuthHeaders=... fetcher=...>`. Fix the unused variable at the old line 62 only if spec I has not.
  Done when: `grep -n "projectKey" packages/puck-editor/src/PuckEditor.tsx` -> empty; the package's own `fields/ImagePickerField.tsx` (uses `useMediaLibrary` from puck-api) compiles unchanged.
- [x] 4.2 `packages/puck-page-manager/src/PageManager.tsx`: `PageManagerProps extends PuckConnection` (+ existing `parentUrl`, `config`, `backButton`, `messageOverrides`); in `PageEditorRoute` (old line ~493-534) replace the destructure + prop passing by `const { connection } = usePuckApiContext();` and `<PuckEditor {...connection} pageKey={pageKey!} config={config} .../>` (no more `jwtToken ?? ''`).
  Done when: no `projectKey`/`jwtToken ?? ''`; typecheck of the package passes after 4.1.
- [x] 4.3 `puck-content-manager`: `ContentManager.tsx` (props ~411-413, provider ~434-441), `ContentManagerRouter.tsx` (~892-937), `ContentEditor.tsx` (~344-391): same transformation (`extends PuckConnection`, pass the 6 connection props to the provider; inner components that re-mount `PuckEditor`/`ContentEditor` use `connection` from context).
  Done when: no `projectKey` remains in the package.
- [x] 4.4 `puck-theme-manager`: `components/theme-editor.tsx` (`ThemeManager`, props ~272-274, wrapper ~922-940) and `components/import-content-types.tsx` (`ImportContentTypes`, props ~20-22, wrapper ~138-156): same transformation. Check `src/index.ts` for re-exported prop types.
  Done when: no `projectKey`; package typechecks.
- [x] 4.5 Component tests (RTL + jsdom; use the recording fetcher until group 7 gives you the mock server): `packages/puck-page-manager/src/PageManager.test.tsx`: render `<PageManager parentUrl="/" baseURL="http://x/service" businessUnitKey="main-store" fetcher={fakeFetcher} />` where `fakeFetcher` answers `GET /main-store/puck-pages` with 2 pages; expect the text `Pages` heading (message `PageManager.pagesTitle`) and both page names; assert the first recorded request has no `x-project-key` and (since no token and `fetcher` is set) no `Authorization`. Wrap in `MemoryRouter` only if `BrowserRouter` complains in jsdom (the component mounts its own `BrowserRouter` with `basename={parentUrl}`; set `window.history.pushState({}, '', '/')` first).
  Done when: test passes.

Pitfalls: `BrowserRouter` + jsdom needs `window.location` path to start with `parentUrl`. Nimbus (Chakra v3) components in jsdom may need `window.matchMedia`; add a stub in `vitest.setup.ts` if you see `matchMedia is not a function`. Keep prop names `baseURL` (capital URL) exactly.
Verification: `corepack yarn typecheck` for the 5 packages; `corepack yarn vitest run packages/puck-page-manager`.
Rollback: per package from the spec I state.

## 5. Image picker uses the shared client

Context: `puck-image-picker` is the only package with its own HTTP code. We delete it and depend on `puck-api` (design D-9).

- [x] 5.1 `packages/puck-image-picker/package.json`: add `"@commercetools-labs/puck-api": "workspace:^"` and `"@commercetools-labs/puck-types": "workspace:^"` to `dependencies`; add both to `tsup.config.ts` `external`.
  Done when: `corepack yarn install` succeeds (updates the lockfile: expected diff = 2 workspace edges).
- [x] 5.2 Delete `src/api/media-library.api.ts`, `src/context/ImagePickerContext.tsx`. Rewrite `src/context/ImagePickerProvider.tsx`: props `PuckConnection & { children; locale?; messageOverrides? }`; body: `<PuckApiProvider ...connection props><EnsureIntlProvider ...>{children}</EnsureIntlProvider></PuckApiProvider>`. Rewrite `src/hooks/useMediaLibrary.ts` as `export { useMediaLibrary } from '@commercetools-labs/puck-api'; export type { UseMediaLibraryReturn } from '@commercetools-labs/puck-api';` (keep its type exports in `src/index.ts`). `src/index.ts`: `ImagePickerConfig` becomes `export type ImagePickerConfig = PuckConnection;`; remove `useImagePickerContext` exports.
  Done when: `grep -rn "fetch(\|projectKey\|x-project-key" packages/puck-image-picker/src` prints nothing; `ImagePickerField.tsx` still compiles (it uses `useMediaLibrary`; if it imports the removed context fix it).
- [x] 5.3 Test `packages/puck-image-picker/src/ImagePickerField.test.tsx`: render `<ImagePickerProvider baseURL=... businessUnitKey=... jwtToken="t" fetcher={fake}>` + `<ImagePickerField ... />`, trigger the library fetch (open the field's media dialog according to the component's UI; read `ImagePickerField.tsx` for the button label, ~lines 440-500), and assert the fetcher got `GET /main-store/media-library?page=1&limit=20` with `Authorization: Bearer t`. If opening the dialog in jsdom is too heavy, test `useMediaLibrary().fetchMedia()` via `renderHook` with the provider wrapper instead (assert the same request) and note that in the test file.
  Done when: test passes.
- [x] 5.4 Media hook with cursor pagination and the "not configured" state. Rewrite `packages/puck-api/src/hooks/useMediaLibrary.ts` (the only implementation after 5.2): state `{ files, pagination: { limit, nextCursor, hasMore }, loading, uploading, error, notConfigured }` plus a ref `cursorStack: (string | undefined)[]` and `currentCursor`. API (names kept, semantics changed):
  * `fetchMedia(extensions = [], limit = 20)`: loads the first page, clears the stack;
  * `loadNextPage(extensions = [])`: if `pagination.hasMore && pagination.nextCursor`, push `currentCursor` on the stack, fetch with `cursor: nextCursor`;
  * `loadPreviousPage(extensions = [])`: pop the stack and fetch with the popped cursor (`undefined` = first page);
  * `hasNextPage()` = `pagination.hasMore`; `hasPreviousPage()` = stack not empty;
  * `uploadFile(file, title?, description?)`: unchanged flow, but the new `MediaFile` is built from `MediaUploadResult` (`key`, `contentType`) and **no** `totalItems` bookkeeping;
  * on `PuckHttpError` with `status === 501` set `notConfigured: true`, `error: null` (the UI shows a dedicated message); any other error sets `error` as before. Add `notConfigured: boolean` to `UseMediaLibraryReturn`.
  Done when: `renderHook` tests with a recording fetcher: (a) first fetch sends `GET /main-store/media-library?limit=20` (no `page`); (b) response `{ files: [a], pagination: { limit: 20, nextCursor: 'c1', hasMore: true } }` then `loadNextPage()` sends `...&cursor=c1`; then `loadPreviousPage()` sends no `cursor`; (c) `hasMore:false` -> `hasNextPage()` false and `loadNextPage()` makes no request; (d) a 501 response with body `{"message":"x","statusCode":501,"code":"MEDIA_NOT_CONFIGURED"}` -> `notConfigured === true`, `error === null`; (e) 502 -> `error` set, `notConfigured` false; (f) upload with auth sends `FormData`.
- [x] 5.5 Both `ImagePickerField.tsx` files (`packages/puck-image-picker/src/ImagePickerField.tsx` and `packages/puck-editor/src/fields/ImagePickerField.tsx`; in the source the pagination block is at ~373-399 and ~363-383) show Previous/Next only: replace the condition `pagination.totalPages > 1` by `hasPreviousPage() || hasNextPage()`, delete the page indicator (`ImagePicker.pageIndicator` message key and its usage; keep the key in catalogs unused or remove it from en/es/de), `isDisabled` becomes `!hasPreviousPage()` / `!hasNextPage()`; change the prop type `pagination: { currentPage; totalPages }` to `{ hasPrevious: boolean; hasNext: boolean }`; the initial call `fetchMedia(extensions, 1, 20)` (lines ~456 / ~499) becomes `fetchMedia(extensions, 20)`. When `notConfigured` is true: render, instead of the grid, a Nimbus `Text` with new message `ImagePicker.mediaNotConfigured` = "Media storage is not configured for this installation. Ask an administrator to configure a media provider." and hide/disable the upload action; add the key to `en.json`, `es.json` ("El almacenamiento de medios no está configurado en esta instalación. Pida a un administrador que configure un proveedor de medios.") and, after task 9.5, `de.json` ("Der Medienspeicher ist für diese Installation nicht konfiguriert. Bitten Sie einen Administrator, einen Medienanbieter zu konfigurieren."). Find where the editor's copy gets its `ImagePicker.*` messages (`grep -rn "ImagePicker\." packages/puck-editor/src packages/*/src/intl/en.json`) and add the key to the same catalog.
  Done when: RTL tests (picker): (1) fake fetcher returns `hasMore: true` -> `Next` enabled, `Previous` disabled; click `Next` -> request carries `cursor`; (2) fetcher returns 501 -> the text "Media storage is not configured" is visible and no upload button is rendered; `corepack yarn typecheck` passes.

Pitfalls: the picker's bundle now has a runtime dependency on puck-api, so `README` peers list stays the same but dependency graph changes (build order: types -> api -> image-picker; `foreach --topological-dev` handles it). A cyclic dependency is impossible (api does not depend on picker).
Verification: `corepack yarn build` for the whole workspace.
Rollback: restore picker from spec I state and remove the two deps.

## 6. Renderer public-read mode and product blocks

Context: storefronts must render published content with no token and no provider; preview needs auth. Design D-6.

- [x] 6.1 Create `packages/puck-renderer/src/loadPuckData.ts` exporting `loadPuckData(client: PuckClient, target: { type: 'page' | 'content'; pageKey?: string; slug?: string; contentKey?: string; query?: string; mode: 'published' | 'preview' }): Promise<PuckData | null>`; move the branching from `PuckRenderer.tsx:68-110` into it (content by key -> `getPublishedPuckContentApi`/`getPreviewPuckContentApi`; by query -> `queryPuckContentApi(client, { query: `contentType = "${query}"` }, mode)`; page by key/slug likewise). Export it and its target type from `src/index.ts`.
  Done when: unit test with a recording fetcher: published page by key -> one `GET /main-store/published/puck-pages/home`; slug -> `POST /main-store/published/puck-pages/query` with body `{"query":"slug = \"/home\""}`; preview by key -> `GET /main-store/preview/puck-pages/home` and with no auth rejects `PuckAuthError`.
- [x] 6.2 Rewrite `PuckRenderer.tsx`: props `PuckRendererProps extends Partial<PuckConnection>` (`baseURL?`, `businessUnitKey?`, `locale?`, `jwtToken?`, `getAuthHeaders?`, `fetcher?`) + existing props; `PuckRendererInner` uses `usePuckApiContext().client`; mount `PuckApiProvider` when `baseURL && businessUnitKey` (was `baseURL && projectKey && businessUnitKey`, old line ~273); if neither props nor ancestor provider exist, render the error element with text `PuckRenderer needs baseURL and businessUnitKey or a PuckApiProvider` (use `usePuckApiContextOptional`; never throw). In `fetchData`: `if (mode === 'preview' && !client.canAuthenticate) { setError('Preview requires authentication'); setLoading(false); return; }`. Effect deps: `[client, baseURL, businessUnitKey, type, pageKey, slug, contentKey, query, mode]`.
  Done when: tests (RTL, recording fetcher): (a) published page anonymous -> exactly one request, no `Authorization`, page text visible; (b) `mode="preview"` without auth -> zero requests, text contains `authentication`; (c) preview with `jwtToken` -> one request to `/preview/` with `Authorization`; (d) no props and no provider -> error text, no throw.
- [x] 6.3 `PuckDataRenderer.tsx`: update the doc comment (line ~29: "Wrap with PuckApiProvider only if...") to "Works without any provider; product blocks use `resolvedData` or the optional ancestor provider". No code change expected.
  Done when: test: render `PuckDataRenderer` with data containing a `ProductBanner` whose `product.resolvedData` has a name; expect the name is visible and no request/throw.
- [x] 6.4 `packages/puck-api/src/hooks/useDatasource.ts`: use `usePuckApiContextOptional()`; if `null` return `{ data: null, loading: false, error: null }` (hooks order is preserved: call `useState` before the early return by structuring as: compute `ctx`, run `useState`s, then `useEffect` that returns early when `!ctx`). Replace the `!jwtToken` early return by the guard `ctx.client.canAuthenticate || ctx.client.publicDatasourceResolve` (design D-6): without either the hook stays idle; with auth or the opt-in flag it calls `resolveDatasourceApi` (policy `attach`) and a 401 from the service sets `error` and leaves `data` null. Add the module-level de-duplication cache: `const inflight = new WeakMap<PuckClient, Map<string, Promise<unknown>>>()`; key `${type}:${skusKey}`; delete the key in `.catch`. Replace the `eslint-disable-next-line react-hooks/exhaustive-deps` by correct deps `[ctx?.client, type, skusKey]` (compute `skus` inside via `skusKey.split(',')`).
  Done when: tests: (a) no provider -> `{ data: null }` and no throw; (b) with provider + token + fetcher answering `{ id: 'p1' }` -> data resolves; (c) two components with the same `type+skus` -> fetcher called once; (d) fetcher rejecting -> `error` set, no unhandled rejection; (e) provider without any auth and without `publicDatasourceResolve` -> **no request** and `data` null (renders empty); (f) same provider with `publicDatasourceResolve` -> one anonymous request is made.
- [x] 6.5 Update the 5 product blocks only if needed: they already pass `hasPreResolved ? undefined : product?.type`; no change expected besides compile fixes. Run `grep -rn "usePuckApiContext\b" packages/puck-components/src` -> must be empty (only the optional variant or the hook `useDatasource`).
  Done when: `corepack yarn workspace @commercetools-labs/puck-components typecheck` passes; update the spec I smoke test (`blocks.smoke.test.tsx`) to drop `projectKey` from its `PuckApiProvider` wrapper (or remove the wrapper: products use `resolvedData`).

Pitfalls: React hook order: never `return` before the `useState`/`useEffect` calls inside `useDatasource`. `PuckRenderer`'s `children` fallback semantics stay. Do not memoise `loadPuckData` results across mounts (stale preview).
Verification: `corepack yarn vitest run packages/puck-renderer packages/puck-api packages/puck-components`.
Rollback: restore renderer/hook files from the spec I state.

## 7. Mock service (`playground/mock-server`)

Context: specs F/H (the real service) are not finished, so the playground and the tests need a backend that behaves like the contract. It is a plain Node HTTP server; nothing to install.

- [x] 7.1 Create `playground/mock-server/index.mjs` exporting `createMockServer({ port = 0, token = process.env.MOCK_SERVICE_TOKEN ?? 'dev-token', origin = 'http://localhost:5174' } = {})` that returns `Promise<{ url: string; close(): Promise<void>; store: Store }>`. Skeleton:
  ```js
  import { createServer } from 'node:http';
  const PREFIX = '/service';
  export async function createMockServer(opts = {}) {
    const store = seed();
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      cors(req, res, opts.origin);
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (!url.pathname.startsWith(PREFIX)) return json(res, 404, { error: 'Not found' });
      const path = url.pathname.slice(PREFIX.length);          // e.g. /main-store/puck-pages/home
      const route = match(req.method, path);                    // { name, params } or null
      if (!route) return json(res, 404, { error: 'Not found' });
      if (PROTECTED.has(route.name(url)) && req.headers.authorization !== `Bearer ${token}`) return json(res, 401, { error: 'Unauthorized' });
      const body = await readBody(req);                         // JSON string -> object; multipart -> skip
      return handlers[route.name](...);
    });
    await new Promise((r) => server.listen(opts.port ?? 0, r));
    const { port } = server.address();
    return { url: `http://localhost:${port}/service`, close: () => new Promise((r) => server.close(r)), store };
  }
  ```
  Implement `cors` (`Access-Control-Allow-Origin: <origin>`, `-Headers: Content-Type, Authorization, x-source`, `-Methods: GET,POST,PUT,DELETE,OPTIONS`), `json`, `readBody`, a regex-based `match` for the routes below, and `PROTECTED` (names of protected routes, derived from design D-3 and spec E section 4: everything except `GET /:bu/published/*/:key`, `POST /:bu/published/*/query`, `GET /:bu/configuration/*`, `GET /health`, and the conditional datasource resolve).
  Routes (all verbs from explore.md section 2; response shapes from `puck-types`): `GET /health` -> `{ status: 'ok' }`; pages and contents: list `[ { id, version, container, key, value, states } ]`, get `{ ...item, states: { draft?, published? } }`, create (201) `{ id, version, container, key, value }` where `value = { key, businessUnitKey, name, slug, puckData, meta, createdAt, updatedAt }` (key generated from `name` slug if absent), update PUT writes the **draft** state, `states/published` PUT copies draft->published and appends a version (cap at 20), `states/draft` DELETE removes the draft, `versions` GET returns `[ { ...value, version: n } ]`, `published|preview/<kind>/:key` GET (preview = draft ?? published; 404 JSON if none), `query` POST (`slug = "..."` for pages, `contentType = "..."` for contents; 404 when no match -> client maps to null); templates list/create/delete; theme GET (404 until created) / POST / PUT; `POST /:bu/content-type/import` -> `{ imported: 3, skipped: 0 }` shaped like `ImportResult` (read `packages/puck-types/src/theme-types.ts:44`); `GET /:bu/media-library?extensions&limit&cursor` -> 6 seeded files served in cursor pages of at most `MOCK_MEDIA_MAX` (default 4) items, so 6 files are 2 pages (`{ files, pagination: { limit, nextCursor, hasMore } }`, cursor = base64url of the offset, ignore unknown cursors with 400 `MEDIA_INVALID_CURSOR`); `POST /:bu/upload-file` -> `{ url: '<server>/service/files/<n>.png', key, name, size, contentType }` (do not parse multipart; just drain the body); when started with env `MOCK_MEDIA=none` both media routes answer `501 { message, statusCode: 501, correlationId, code: "MEDIA_NOT_CONFIGURED" }` (mirrors spec G's default provider); `GET /products/search?text=` -> 3 canned `{ id, name, sku, image, slug }`; `POST /datasource/:key/test` -> canned product by `params.sku`/`skus` (protected unless env `MOCK_PUBLIC_DATASOURCE_RESOLVE=true`, then public for `product-by-sku`/`products-by-sku` only); every error uses the envelope `{ message, statusCode, correlationId, code? }` (401 text `Authentication required` + header `WWW-Authenticate: Bearer realm="contentools"`); published page/content reads embed `resolvedData` in product props; `POST /content-type/import` is served as well as `POST /:bu/content-type/import`; `GET /:bu/configuration/<slice>` public; `POST /__reset` -> reseeds (test helper, unprotected).
  Seed (`seed()`): BU `main-store`; page `home` (slug `/home`, published puckData with `HeroBanner` {title: 'Welcome', subtitle, image: 'https://placehold.co/1200x675'}, a `TextBlock` and a `ProductBanner` whose `product` is `{ type: 'product-by-sku', skus: ['SKU-1'], resolvedData: <canned product> }` to mimic the server-side embedding; **draft differs**: title 'Welcome (draft)'), page `about` (published only); content `hero-banner` (contentType `hero`); 1 template; no theme. Component type names must exist in `defaultRenderConfig` (`HeroBanner`, `TextBlock`: check `packages/puck-components/src/components/blocks/` props before writing JSON).
  Done when: `node -e "import('./playground/mock-server/index.mjs').then(async m=>{const s=await m.createMockServer();console.log(s.url);await s.close()})"` prints `http://localhost:<port>/service`.
- [x] 7.2 Create `playground/mock-server/server.mjs`: parses `--port` (default 8080), `--origin`, prints `mock service listening on http://localhost:8080/service (token: dev-token)` and handles SIGINT. Add playground script `"mock": "node mock-server/server.mjs"`.
  Done when: `corepack yarn workspace @commercetools-labs/puck-playground mock` starts; in another shell `curl -s localhost:8080/service/health` -> `{"status":"ok"}`; `curl -s -o /dev/null -w "%{http_code}" -X PUT localhost:8080/service/main-store/puck-pages/home -d '{}'` -> `401`; with `-H "Authorization: Bearer dev-token" -H "Content-Type: application/json"` -> `200`; `curl -s localhost:8080/service/main-store/published/puck-pages/home` returns JSON with `"key":"home"`.
- [x] 7.3 Contract tests for the mock itself `playground/mock-server/mock.test.mjs` (include the glob in `vitest.config.ts`: add `'playground/mock-server/**/*.test.mjs'`): (a) the set of protected route names equals `PUCK_AUTH_POLICY` entries marked protected (import the **built** `packages/puck-api/dist/index.mjs` via relative path; run `corepack yarn build` first; skip with a clear message if dist is missing); (b) every one of the 35 client functions works end-to-end against the mock (loop over a table, `createPuckClient({ baseURL: server.url, businessUnitKey: 'main-store', jwtToken: 'dev-token' })`, expect no rejection); (c) CORS preflight returns 204 with the three allowed headers.
  Done when: `corepack yarn vitest run playground/mock-server` green.

Pitfalls: Node's `http` lowercases header names (`req.headers.authorization`). `OPTIONS` preflight carries no `Authorization`: answer before auth. `readBody` must not choke on multipart (just consume `req` stream). Port 8080 may be taken by the real service: use `--port 8081` then and set `VITE_BASE_URL` accordingly. The mock is **not** published and never ships in a package `files` list.
Verification: group 7 tests; `curl` checks above.
Rollback: delete `playground/mock-server`.

## 8. Playground update and remaining tests

Context: the playground (spec I renamed it) must use the new props, support the three auth modes and tell the user what to start.

- [x] 8.1 `playground/.env.example` (replace content):
  ```
  # Copy to .env. Defaults match `yarn workspace @commercetools-labs/puck-playground mock`.
  VITE_BASE_URL=http://localhost:8080/service
  VITE_BUSINESS_UNIT_KEY=main-store
  # token | fetcher | none   (fetcher simulates the Merchant Center proxy transport)
  VITE_AUTH_MODE=token
  # Static service token (mock default: dev-token; real service: the SERVICE_API_TOKEN value)
  VITE_SERVICE_TOKEN=dev-token
  VITE_LOCALE=en-US
  ```
  Done when: no `PROJECT_KEY`/`JWT` strings remain (`grep -rn "PROJECT_KEY\|JWT" playground --exclude-dir=node_modules --exclude-dir=dist` -> empty).
- [x] 8.2 `playground/src/App.tsx` (old lines 11-13, 31, 118-122, 262, 324-337, 358): replace the env consts by `BASE_URL`, `BUSINESS_UNIT_KEY`, `AUTH_MODE`, `SERVICE_TOKEN`, `LOCALE`; `ConfigWarning` text lists only `VITE_BASE_URL` and `VITE_BUSINESS_UNIT_KEY` and shows the command `yarn workspace @commercetools-labs/puck-playground mock`; the missing-config condition is `!BASE_URL || !BUSINESS_UNIT_KEY`; build the connection once:
  ```tsx
  import type { PuckConnection, PuckFetcher } from '@commercetools-labs/puck-types';
  const proxyLikeFetcher: PuckFetcher = (req) =>   // stands in for the MC forward-to adapter
    fetch(req.url, { method: req.method, headers: { ...req.headers, Authorization: `Bearer ${SERVICE_TOKEN}` }, body: req.body });
  const connection: PuckConnection = {
    baseURL: BASE_URL, businessUnitKey: BUSINESS_UNIT_KEY, locale: LOCALE,
    ...(AUTH_MODE === 'token' ? { jwtToken: SERVICE_TOKEN } : AUTH_MODE === 'fetcher' ? { fetcher: proxyLikeFetcher } : {}),
  };
  ```
  `sharedProps = connection`; `RendererPanel` props `connection` (no `projectKey`), passes `<PuckRenderer type=... {...connection} .../>`. In `none` mode show an info line "No auth: only published rendering works". Add to `RendererPanel` a visible `data-testid="renderer-output"` wrapper and in `PageManager` area nothing else. Update `index.html` title already done in spec I. Add `mode` select exists ("Published"/"Preview"): keep.
  Done when: `corepack yarn workspace @commercetools-labs/puck-playground build` (tsc + vite) exits 0.
- [x] 8.3 Add the remaining unit tests that were deferred: `packages/puck-api/src/no-tenant.test.ts` (reads `src/**/*.ts(x)` of every package and `dist/index.js` if present, `expect(text).not.toMatch(/projectKey|x-project-key/)`; allow list: none; `puck/docs/migration-1.0.md` is outside `src`); `packages/puck-page-manager/src/PageManager.save.test.tsx`: mount `PageManager` against `createMockServer` with `fetcher` (token added by fetcher) at path `/pages/home`... if routing the editor in jsdom proves infeasible (Puck needs layout APIs), replace by a `usePuckPage` + `PuckEditor`-less test and mark the browser script (group 9) as the proof for the full UI; record that choice in design.md D-12.
  Done when: all new tests pass and `corepack yarn test` reports at least 35 tests across the five packages named in the spec.
- [x] 8.4 Run `corepack yarn verify` (headers, metadata, build, typecheck, lint, test).
  Done when: exit 0.

Pitfalls: Vite exposes only `VITE_`-prefixed variables; a token in `.env` ends up in the browser bundle: acceptable for local dev only; say so in a comment in `.env.example` (do not use a real service token). `proxyLikeFetcher` must not add `x-project-key`.
Rollback: restore `App.tsx` and `.env.example` from spec I.

## 9. Documentation

- [x] 9.1 `puck/README.md`: rewrite the "Usage" common config (old lines ~100-110) to
  ```tsx
  const connection = {
    baseURL: 'https://your-service.example.com/service',
    businessUnitKey: 'your-business-unit-key',
    jwtToken: 'optional-token',      // or getAuthHeaders / fetcher, see "Authentication"
    locale: 'en-US',
  };
  ```
  update the props lines for PageManager/ContentManager/ThemeManager, the Renderer examples (published needs no token), and add an **Authentication** section: (1) static `jwtToken`; (2) `getAuthHeaders` (refresh); (3) `fetcher` for the Merchant Center (include the D-7 snippet, marked "implemented by the Contentools admin-app"); (4) public-read renderer and preview; (5) errors (`PuckAuthError`); (6) SSR with `createPuckClient` + `loadPuckData`. Mention the three shipped languages (en, es, de) in the Localization section. Replace the "Reference app" section (`.env.example`, `yarn start:playground`, `yarn ... mock`).
  Done when: `grep -niE "projectKey|PROJECT_KEY|x-project-key" puck/README.md` is empty.
- [x] 9.2 Create `puck/docs/migration-1.0.md` from design.md D-10 (the table) plus sections "Behaviour changes" (preview and editor reads now send auth; `encodeURIComponent` on keys; error messages; `useDatasource` without provider; image picker depends on puck-api) and "SemVer policy" (D-11). The migration doc is the only place the old names appear.
  Done when: file exists; `grep -c "projectKey" puck/docs/migration-1.0.md` >= 5.
- [x] 9.3 `puck/docs/api-contracts.json`: update the two descriptions that mention `projectKey` args (old lines 425, 453: now "Calls queryPuckContentApi(client, { query }, mode)" / "queryPuckPageApi(client, { query }, mode)"), and add an `"auth"` field (`"public"`/`"protected"`) to each of the 13 entries taken from `PUCK_AUTH_POLICY`.
  Done when: JSON parses; `grep -c projectKey puck/docs/api-contracts.json` -> 0.
- [x] 9.4 Package READMEs created by spec I: no change needed except `puck-api/README.md` and `puck-renderer/README.md`: add a 10-line "Connect" example each (copy from the main README).
  Done when: both READMEs contain `businessUnitKey`.
- [x] 9.5 Add the German (`de`) catalog (decision D-14; admin-app ships `en` + `de`, so managers must follow). For every package that has `src/intl/` (`puck-components`, `puck-content-manager`, `puck-image-picker`, `puck-page-manager`, `puck-theme-manager`, `puck-version-history`; `puck-editor` has an empty folder: skip): (1) run `node scripts/translate-messages.mjs --locale de` from `$PUCK` (machine translation; set `GOOGLE_TRANSLATE_API_KEY` if you have one, otherwise the free endpoint; review `scripts/i18n-glossary.json` terms); (2) in each `src/intl/index.ts` add `import de from './de.json';` and `catalogs = { en, es, de }`; version-history has no `index.ts` catalog export: follow how its `es.json` is wired (`grep -rn "es.json" packages/puck-version-history/src`); (3) in each `EnsureIntlProvider.tsx` (content-manager, editor, image-picker, page-manager, renderer, theme-manager) change `type Lang = 'en' | 'es' | 'de'` and `SUPPORTED_LANGS = ['en', 'es', 'de']`, and update the doc comment "Resolves to en/es" -> "en/es/de"; (4) add test `packages/puck-page-manager/src/intl.test.tsx`: render `PageManager` with `locale="de-DE"` and a fake fetcher returning an empty list; expect the German text of `PageManager.pagesTitle` (read it from `de.json`) to be visible; `locale="fr"` still renders English.
  Done when: `ls packages/*/src/intl/de.json | wc -l` prints 6, the new test passes, and `grep -rn "'en' | 'es'" packages/*/src` prints nothing.

## 10. Chrome DevTools verification (self-driven)

Not run: connector detached. The wire format is covered by the mock contract tests (`playground/mock-server/mock.test.mjs`) and the component tests.

Context: the playground with the mock service (or the real one) proves the UI and the wire format. You run these yourself with the `mcp__chrome-devtools__*` tools (see `plans/03-testing-strategy.md`). Save screenshots under `plans/evidence/j/<step>.png`.

Setup (two terminals): `corepack yarn workspace @commercetools-labs/puck-playground mock` and `corepack yarn start:playground` (http://localhost:5174, `.env` copied from `.env.example`). Real service alternative: start `service` (spec H) with `SERVICE_API_TOKEN=dev-token` on 8080 and the same `.env`.

- [~] 10.1 **Configuration panel**: temporarily start with an empty `.env`: `new_page` -> `http://localhost:5174`; `wait_for` text `Configuration required`; `take_snapshot`; expect the panel mentions `VITE_BASE_URL` and `VITE_BUSINESS_UNIT_KEY` and **not** `PROJECT_KEY`. Restore `.env`.
- [~] 10.2 **Pages list (protected read with token)**: `navigate_page` to the playground; `wait_for` text `Pages`; `take_snapshot` and expect both seeded pages (`home`, `about`) in the list; `list_network_requests`: find `GET .../main-store/puck-pages` -> status 200, request header `Authorization: Bearer dev-token`, **no** `x-project-key`; `list_console_messages` -> no errors.
- [~] 10.3 **Edit + save**: click the `home` page row (snapshot uid); `wait_for` text `Save` (the toolbar button, message `Editor.save`); in the Puck canvas click the Hero banner; in the right panel `fill` the `title` field with `Welcome from Chrome`; `click` `Save`; `wait_for` the badge text `Draft`; `list_network_requests` -> exactly one `PUT .../main-store/puck-pages/home` (200) with `Authorization`, `Content-Type: application/json`; `take_screenshot` (evidence 10.3).
- [~] 10.4 **Publish**: click `Publish`; expect `PUT .../states/published` 200 and badge `Published`.
- [~] 10.5 **Renderer, published, anonymous**: switch the playground to the Renderer tab; set Type `Page`, Mode `Published`, Page Key `home`, click `Render`; `wait_for` text `Welcome from Chrome`; `list_network_requests` filter `published`: one `GET .../published/puck-pages/home` with **no** `Authorization` and no `Content-Type` header (use `get_network_request` for the request headers). Screenshot.
- [~] 10.6 **Preview without auth**: restart the playground with `VITE_AUTH_MODE=none`; Renderer tab, Mode `Preview (draft)`, Page Key `home`, `Render`; expect text `Preview requires authentication` and **zero** requests to `/preview/` (network list). Switch Mode to `Published` -> renders (anonymous). Screenshot.
- [~] 10.7 **Fetcher mode**: restart with `VITE_AUTH_MODE=fetcher`; repeat 10.2 and 10.3 quickly: the writes succeed and carry `Authorization` (added by the fetcher), proving the transport override path.
- [~] 10.7b **Media**: with the default mock, open a page, click an Image/HeroBanner image field's `Media library`; expect 4 files and an enabled `Next` button; click `Next` -> the request has `cursor=` and 2 more files show with `Next` disabled. Restart the mock with `MOCK_MEDIA=none`: the picker shows `Media storage is not configured` and no upload button; network shows 501 responses and the console has no uncaught errors.
- [~] 10.8 **401 path**: stop the mock, restart it with `MOCK_SERVICE_TOKEN=other`; reload with `VITE_SERVICE_TOKEN=dev-token`; the Pages tab must show an error state containing `401` (read the snapshot) and no uncaught exception in `list_console_messages` (an `error` log of the rejected call is acceptable only if emitted by the app via `console.error`).
  Done when (10.1-10.8): every expectation is met and `plans/evidence/j/` contains the screenshots.

Pitfalls: Puck's canvas is rendered in an iframe; if `click` cannot reach the Hero banner use `take_snapshot` after `evaluate_script` to focus the outline panel item (the left "Outline" list contains the component names) and click it there. Chrome caches CORS preflights: if you change mock headers, hard-reload. Vite reads `.env` at start: restart it after edits.
Rollback: none (read-only checks).

## 11. Final verification and Definition of Done

- [x] 11.1 Absence greps: `grep -rniE "projectKey|x-project-key|PROJECT_KEY" puck --include=*.ts --include=*.tsx --include=*.mjs --include=*.json --include=*.md --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.yarn --exclude=yarn.lock | grep -v "docs/migration-1.0.md" | grep -v "no-tenant.test"` -> empty. `grep -rn "fetch(" puck/packages/*/src puck/playground/src | grep -v "client/client.ts"` -> only the playground's `proxyLikeFetcher`.
- [x] 11.2 `cd $PUCK && corepack yarn verify` -> exit 0.
- [x] 11.3 Build consumer check: `node -e "const a=require('./packages/puck-api/dist/index.js'); console.log(typeof a.createPuckClient)"` -> `function`.
- [~] 11.4 (status board does not exist in plans/01-dependency-plan.md; hand-offs are in the implementation log) Update `plans/01-dependency-plan.md` status for J; hand the K spec author the D-7 snippet and the policy table; hand E the policy table and the three headers.

### Definition of Done (scenarios in `specs/**`)

| Requirement | Proven by |
| --- | --- |
| Single-tenant connection props (2 scenarios) | 11.1 grep; tsc check in 4.x (add a `// @ts-expect-error` line in `PageManager.test.tsx` passing `projectKey`) |
| Auth injection per-request (3) | tests 1.6 (2, 3, 10), 3.2 |
| Transport override (2) | tests 1.6 (6, 7), 8.3, Chrome 10.7 |
| Request headers (2) | tests 1.6 (1, 2, 4), Chrome 10.5 |
| Auth policy table (3) | tests 1.6, 1.3 snapshot, 7.3(a) |
| Typed errors (1) | test 1.6 (7), Chrome 10.8 |
| React-free client (1) | 1.6 and a Node script in 11.3 |
| Public-read renderer (3) | tests 6.1-6.4, Chrome 10.5-10.6 |
| Managers/editor/picker share the client (2) | 5.3, 4.5, 11.1 `fetch(` grep |
| Migration documentation (1) | 9.1, 9.2 |
| Playground configuration (2) | 8.1, 8.2, Chrome 10.1, 10.7 |
| Mock service fallback (3) | 7.2 curl checks, 7.3 |
| Automated contract tests (1) | 8.3 count >= 35 |
| Browser verification script (2) | group 10 (network assertions in 10.2-10.6; real service variant in setup) |
