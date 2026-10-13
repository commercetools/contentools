## Context

Facts are in `explore.md` (368 old-contract lines in 41 files; 35 raw API functions; three duplicated header/fetch implementations; MC `forward-to` proxy rules).
Locked inputs: single tenant, BU scoping stays (`/:businessUnitKey/...`), published reads public, preview + mutations + configuration writes need `Authorization: Bearer <token>`,
token is either an MC session JWT (only obtainable through the MC forward-to proxy) or a static service token (server-to-server). Spec E owns server details; this spec owns the **client** contract and a mock counterpart.
Spec I has moved/renamed/linted the packages (`@commercetools-labs/puck-*`, vitest available, `components/blocks`).

## Goals / Non-Goals

Goals: one tiny connection object everywhere; auth injectable in three ways; works in MC (proxy), storefront (public) and dev; fewer code paths (one HTTP implementation); verifiable without the real service.
Non-goals: server middleware/CORS (E), service routes/datasource storage (F), MC adapter implementation (K, but the shape is fixed here), media storage (G), any new UI features, Next.js `'use client'` directives (Q-J4).

## Decisions

### D-1 Types live in `puck-types`, runtime in `puck-api`
New file `packages/puck-types/src/connection.types.ts` (types only, no runtime, so every package including the standalone image picker can import it for free):
```ts
export type PuckHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export interface PuckRequest {
  url: string;                       // absolute: baseURL + path (+ query)
  method: PuckHttpMethod;
  headers: Record<string, string>;
  body?: string | FormData;          // JSON string or multipart
}
/** Minimal structural subset of the Fetch Response; a real Response satisfies it. */
export interface PuckResponse {
  ok: boolean; status: number; statusText: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}
export type PuckFetcher = (request: PuckRequest) => Promise<PuckResponse>;
export type PuckAuthHeaders = Record<string, string>;
export type PuckGetAuthHeaders = () => PuckAuthHeaders | Promise<PuckAuthHeaders>;

export interface PuckConnection {
  /** Service base URL including the service prefix, e.g. https://x.example/service */
  baseURL: string;
  businessUnitKey: string;
  /** Content locale, e.g. "en-US" (UI language + locale-aware calls). */
  locale?: string;
  /** Convenience: sent as `Authorization: Bearer <jwtToken>`. */
  jwtToken?: string;
  /** Evaluated before EVERY request; wins over jwtToken. Use for refreshing tokens. */
  getAuthHeaders?: PuckGetAuthHeaders;
  /** Replaces globalThis.fetch (Merchant Center forward-to proxy, tests, instrumentation). */
  fetcher?: PuckFetcher;
  /**
   * Mirror of the service flag PUBLIC_DATASOURCE_RESOLVE (spec E D-E10). When true, render-time
   * product blocks without embedded `resolvedData` may call datasource resolve anonymously.
   * Default false: such blocks render empty unless the client has auth.
   */
  publicDatasourceResolve?: boolean;
}
```
`PuckApiContextValue` becomes `{ client: PuckClient; baseURL; businessUnitKey; locale?; /* for UI: */ canAuthenticate: boolean }`.
Rejected: a `PuckConnectionConfig` nested object prop (`<PageManager connection={...}>`): flat props keep the diff small for consumers and match the existing README.
Rejected: keeping `jwtToken` only (cannot refresh, cannot do proxy). Rejected: `getToken(): Promise<string>` only (cannot express non-Bearer or extra headers).

### D-2 One request pipeline: `createPuckClient`
New folder `packages/puck-api/src/client/`:
* `errors.ts`: `PuckHttpError`, `PuckAuthError`. The service error body is `{ message, statusCode, correlationId, code?, errors? }` (spec E/D). `PuckHttpError` keeps `body` (raw text) and exposes parsed, optional `serverMessage`, `code`, `correlationId`, `errors` (tolerant `JSON.parse`; unknown shapes leave them undefined). `error.message` = `[puck-api] HTTP <status>: <serverMessage ?? body ?? statusText>`.
* `auth-policy.ts`: `export const PUCK_AUTH_POLICY = { getPublishedPuckPageApi: 'public', ... }` (35 keys, values `'public' | 'protected' | 'attach'`). `public`: never requires auth, attaches it when available. `protected`: requires an auth source client-side. `attach`: no client-side requirement, attaches auth when available, the server decides (used only for datasource resolve).
* `client.ts`:
  ```ts
  export interface PuckClient {
    readonly baseURL: string;
    readonly businessUnitKey: string;
    readonly canAuthenticate: boolean;   // jwtToken || getAuthHeaders || fetcher
    request<T>(op: keyof typeof PUCK_AUTH_POLICY, path: string, init?: { method?: PuckHttpMethod; body?: unknown | FormData; nullOn404?: boolean; query?: Record<string, string | number | undefined> }): Promise<T>;
  }
  export function createPuckClient(connection: PuckConnection): PuckClient;
  export function updatePuckClient(client: PuckClient, connection: PuckConnection): void; // internal, used by the provider to keep identity stable
  ```
  Implementation rules: the client keeps the *current* connection in a mutable holder (`let current = connection`), `request()` always reads `current`; `PuckApiProvider` creates the client once (`useRef`/lazy `useState`) and calls `updatePuckClient` in a layout effect on prop change, so identity is stable and rotated tokens apply to the next request (spec scenario "Rotated token without remount"). `request()` steps: (1) look up policy for `op`; (2) if `protected` and `!canAuthenticate` -> throw `PuckAuthError` (status 401, authCode `PUCK_AUTH_REQUIRED`) **before** I/O; (3) headers = `{ 'x-source': 'puck-api' }` + `Content-Type: application/json` only when body is a string/JSON; (4) auth: `getAuthHeaders ? await getAuthHeaders() : jwtToken ? { Authorization: 'Bearer ' + jwtToken } : {}` merged over headers; (5) transport: `fetcher ?? defaultFetch` (a wrapper around `globalThis.fetch`: the **only** `fetch(` call in the packages); (6) 404 + `nullOn404` -> `null`; non-2xx -> `PuckAuthError` for 401/403 else `PuckHttpError`; 204 or non-JSON -> `undefined`; else `res.json()`.
* JSON body serialisation is inside `request` (callers pass objects), so the `FormData`/JSON distinction is in one place.
* `index.ts` exports `createPuckClient`, types, errors, `PUCK_AUTH_POLICY`.
Rejected: patching `httpClient` in place (keeps three header builders alive); a dependency such as axios/ky (extra weight for a library).

### D-3 Which calls are `protected` (the policy table; aligned with spec E section 4 and F section 2, both final)
Public (E table): `getPublishedPuckPageApi`, `getPublishedPuckContentApi`, `queryPuckPageApi`/`queryPuckContentApi` **with mode `published`**, and `getThemeApi` (E makes every `GET /:bu/configuration/*` slice public). Protected: everything else, including the **preview** variants (`mode: 'preview'` makes `queryPuck*Api` protected: the policy value for these two functions is a function `(mode) => mode === 'preview' ? 'protected' : 'public'`; type `PolicyValue = 'public' | 'protected' | 'attach' | ((mode: 'published' | 'preview') => 'public' | 'protected')`), lists and gets with states/drafts (`listPuck*Api`, `getPuck*Api`), states, versions, templates (E protects them: they expose editorial state), media library, upload, content-type import, and `searchProductsApi` (E: spends commercetools quota with service credentials; editor-only). `resolveDatasourceApi` is `attach`: E makes datasource *management* always protected but resolve of the two built-in keys public only when the service runs with `PUBLIC_DATASOURCE_RESOLVE=true`, so the client cannot know; it attaches auth when present and lets the server answer 401. `SERVICE_API_TOKEN` is accepted by the service on every protected route, so `jwtToken` with the static token works for server-side/SSR and for the playground.
The table is a pinned snapshot test; a new API function without an entry fails `tsc` (typed as `Record<PuckOp, PolicyValue>` where `PuckOp` is a union generated from the function names).

### D-4 Raw API function shape (BREAKING)
`(client, ...args)`; paths are built inside with `client.businessUnitKey`. Examples:
```ts
export const getPuckPageApi = (client: PuckClient, key: string) =>
  client.request<PuckPageWithStatesResponse>('getPuckPageApi', `/${client.businessUnitKey}/puck-pages/${enc(key)}`);
export const updatePuckPageApi = (client: PuckClient, key: string, body: { value: UpdatePuckPageInput }) =>
  client.request<PuckPageResponse>('updatePuckPageApi', `/${client.businessUnitKey}/puck-pages/${enc(key)}`, { method: 'PUT', body });
export const queryPuckPageApi = (client: PuckClient, body: { query: string }, mode: 'published' | 'preview') => ... nullOn404: true
export const searchProductsApi = (client: PuckClient, text: string, options?: { limit?: number; locale?: string }) => ... path '/products/search' (no BU)
export const resolveDatasourceApi = (client: PuckClient, datasourceKey: string, body: { params: Record<string, string> }) => ... '/datasource/:key/test' (no BU)
```
`enc` = `encodeURIComponent` (the old code interpolated raw keys; a key containing `/` or `?` was a latent bug; new behaviour is a bug fix, noted in the migration doc).
Hooks keep their public return shapes; they obtain `client` from context. The `if (!jwtToken) throw new Error('jwtToken is required ...')` guards disappear (the client's `PuckAuthError` replaces them; the error message changes from "jwtToken is required to save" to "[puck-api] HTTP 401: auth required", noted in the migration doc).

### D-5 Provider/context
`PuckApiProvider` props: `PuckConnection & { children }` (no `projectKey`). Context value: `{ client, baseURL, businessUnitKey, locale, canAuthenticate }`. `usePuckApiContext()` still throws without provider (public hook, unchanged behaviour) and a new `usePuckApiContextOptional()` returns `null` (used by blocks and the renderer). Exports added: `usePuckClient()` (throws like the old hook).
The five self-contained components (`PageManager`, `ContentManager` (+`ContentManagerRouter`, `ContentEditor`), `ThemeManager`, `PuckEditor`, `ImportContentTypes`) take `PuckConnection` props via `extends PuckConnection` in their prop interfaces, so documentation is DRY. Inner re-mounts (`PageEditorRoute` -> `PuckEditor`, `PageManager.tsx:532-534`) pass `connection` through a small helper `useConnectionProps()` returning `{ baseURL, businessUnitKey, locale, jwtToken, getAuthHeaders, fetcher }` read from context (the context stores the original connection too, `connection: PuckConnection`), so nested providers re-create nothing: **nested `PuckApiProvider` reuses the ancestor client when all props are shallow-equal** (simple check) else creates a new one.

### D-6 Renderer public-read mode
`PuckRenderer`: props `baseURL?`, `businessUnitKey?`, optional `jwtToken`/`getAuthHeaders`/`fetcher` (same as connection), else ancestor context. Mounts its own provider when `baseURL && businessUnitKey` given (was: three props). Fetch logic extracted to `packages/puck-renderer/src/loadPuckData.ts` (`loadPuckData(client, { type, pageKey, slug, contentKey, query, mode }): Promise<PuckData | null>`), exported for SSR (server components, `getServerSideProps`). `mode="preview"` without `client.canAuthenticate` -> error element text "Preview requires authentication" and no request. In `PuckDataRenderer` nothing changes except the doc comment.
Product blocks and the public renderer (answers E's D-E10): published page/content reads already embed `resolvedData` inside every product prop (`{ type, skus, resolvedData }`, F section 2 row 6), so a **public** render needs **no** datasource call: blocks render from `resolvedData`. Only blocks whose prop has no `resolvedData` (never resolved, or resolution failed server-side: `resolvedData: null`) would call datasource resolve. `useDatasource` therefore uses `usePuckApiContextOptional()` and behaves: no context -> `{ data: null, loading: false, error: null }`; with context it runs the request only when `type` and `skus` are set **and** (`client.canAuthenticate` or `connection.publicDatasourceResolve === true`); otherwise it stays idle (no anonymous 401 spam against a service that keeps resolve protected). Failures set `error` and blocks render nothing. Storefront guidance (README): for SSR/server components resolve with a server-side token (`createPuckClient({ ..., jwtToken: SERVICE_API_TOKEN })` + `loadPuckData`, preview too); never ship the token to the browser. Requests are de-duplicated per client with a module-level `WeakMap<PuckClient, Map<string, Promise<unknown>>>` keyed by `type + ':' + skusKey` (prevents N identical calls on a page with many blocks) and cleared on error.

### D-7 MC forward-to adapter (contract for spec K, **not implemented here**)
```ts
// admin-app: how K builds the fetcher (documented in puck README, tested in K)
const fetcher: PuckFetcher = async ({ url, method, headers, body }) =>
  executeHttpClientRequest(
    async ({ credentials, headers: mcHeaders }) => {
      const res = await fetch(buildApiUrl('/proxy/forward-to'), {
        method, credentials,
        headers: { ...mcHeaders, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [`x-forward-header-${k.toLowerCase()}`, v])) },
        body: body as BodyInit | undefined,
      });
      return { data: res, statusCode: res.status, getHeader: (n) => res.headers.get(n) };
    },
    { forwardToConfig: { uri: url, audiencePolicy: 'forward-url-origin', version: 2 } }
  ); // returns the Response to puck (PuckResponse is structural)
```
Facts it encodes: the gateway adds `Authorization` itself, so the host passes **no** `jwtToken`/`getAuthHeaders`; custom headers to the backend (`x-source`, `Content-Type`) are prefixed `x-forward-header-`; audience policy `forward-url-origin` makes the JWT audience independent of the request path (service verifies `audience` = service origin; spec E). K may adapt details (e.g. `executeHttpClientRequest` response typing, multipart handling, Q-J3). The contract guarantee from J: `fetcher` receives the **absolute** URL and the request object above, nothing else.

### D-7b Fetcher shape and K's "drop-in for fetch" request
Spec K asked for a `fetcher` prop on `PageManager`, `ContentManager`, `ThemeManager` and `PuckApiProvider` (MC `actions.forwardTo` has no PUT and puck needs PUT + multipart, so K builds it on `executeHttpClientRequest` with `forwardToConfig`). This design already puts `fetcher` on every public component through `PuckConnection` (D-5). The shape is `(request: PuckRequest) => Promise<PuckResponse>` with `PuckRequest = { url, method, headers, body }`, not the positional `(url, init)` of `fetch`, because the client needs headers/method/body in one inspectable object and `PuckResponse` is structural, so a real `Response` satisfies it. Anything shaped like `fetch` adapts in one line: `const toFetcher = (f: typeof fetch): PuckFetcher => (r) => f(r.url, { method: r.method, headers: r.headers, body: r.body });` (exported from `puck-api` as `fetcherFromFetch`; add it in task 1.5). PUT and DELETE are first-class `PuckHttpMethod` values; `body` may be `FormData` (multipart), K's adapter decides how to forward it (Q-J3).

### D-8 Playground + mock service (the self-driven backend)
Because F/H are not finished, the playground ships `playground/mock-server/`:
* `server.mjs` (CLI: `node playground/mock-server/server.mjs --port 8080`) and `index.mjs` exporting `createMockServer({ port?, token? }) => { server, url, close, store }` for vitest. Pure `node:http`, no dependencies, SPDX header.
* Prefix `/service`; routes (all under `/service`): `GET /health`; `/:bu/puck-pages` (GET list, POST create), `/:bu/puck-pages/:key` (GET with states, PUT draft update, DELETE), `/:bu/published/puck-pages/:key`, `/:bu/preview/puck-pages/:key`, `POST /:bu/{published|preview}/puck-pages/query` (`slug = "x"`), `/:bu/puck-pages/:key/states` (GET), `PUT .../states/published`, `DELETE .../states/draft`, `GET .../versions`; the same 9 for `puck-contents` (query `contentType = "x"`); `/:bu/puck-templates` (GET with `?kind=`, POST, DELETE `/:key`); `GET|POST|PUT /:bu/configuration/theme`; `POST /:bu/content-type/import`; `GET /:bu/media-library`; `POST /:bu/upload-file` (parses nothing, stores a placeholder URL `http://localhost:8080/service/files/<n>.png`, returns `{ url }`); `GET /products/search?text=` (3 canned products); `POST /datasource/:key/test` (returns a canned product by sku). Response shapes follow `puck-types` (`CtCustomObject<T>` = `{ id, version, container, key, value }`; list items add `states`).
* Error envelope: every error is `{ message, statusCode, correlationId, code? }` (spec E/D contract); 401 also sends `WWW-Authenticate: Bearer realm="contentools"`; published page reads embed `resolvedData` in product props for the seeded `product-by-sku` blocks; `POST /datasource/:key/test` is protected unless `MOCK_PUBLIC_DATASOURCE_RESOLVE=true` (then public for the two built-in keys `product-by-sku`, `products-by-sku`); `GET /products/search` protected; templates/media/preview/lists protected; all `GET /:bu/configuration/<slice>` public; `POST /content-type/import` and `POST /:bu/content-type/import` both served (spec F).
* Auth: protected routes (policy table, imported from the built `puck-api` so the mock cannot drift: `import { PUCK_AUTH_POLICY } from '@commercetools-labs/puck-api'` is not possible for plain `.mjs` without a build; so the mock keeps its own small list and a vitest test asserts it equals the policy table) require `Authorization: Bearer ${MOCK_SERVICE_TOKEN ?? 'dev-token'}`, else `401 {"error":"Unauthorized"}`. `x-project-key` is ignored (a test asserts the client never sends it).
* CORS: `Access-Control-Allow-Origin: http://localhost:5174` (configurable `--origin`), headers `Content-Type, Authorization, x-source`, methods `GET,POST,PUT,DELETE,OPTIONS`; `OPTIONS` -> 204.
* Seed (in memory, reset on restart; `POST /service/__reset` for tests): BU `main-store`; page `home` slug `/home` (published + draft differ), page `about`; content `hero-banner` (contentType `hero`); one template; theme tokens; 6 media files. Seed `puckData` uses `Heading`/`Hero`-type components that exist in `defaultRenderConfig` (read `packages/puck-components/src/components/index.ts` for names; use at least one product block with `resolvedData`).
* Fallback rule: **real service first when available** (`service` app from spec H: `yarn --cwd service start:dev`, `SERVICE_API_TOKEN=dev-token`), else the mock. The Chrome script is identical; only `VITE_BASE_URL`/token differ. The mock is a development tool, never deployed; it lives under `puck/playground/` and is not published (playground is private).
Rejected: msw in the browser (service-worker interception hides CORS/preflight and real network headers that this change must verify); json-server (extra dependency, cannot enforce the policy).

### D-15 Media contract from spec G (cursor pagination, public URLs, `none` provider)
Spec G changed the media API: `GET /:bu/media-library?extensions=&limit=&cursor=` returns `{ files, pagination: { limit, nextCursor, hasMore } }` (no page numbers/totals, `MediaFile` gets `key`/`contentType`, `createdAt` optional), `POST /:bu/upload-file` returns `{ url, key, name, size, contentType }` (public URLs only), and with the default provider `none` both endpoints answer **501** `MEDIA_NOT_CONFIGURED`. J follows: `MediaLibraryPagination = { limit; nextCursor: string | null; hasMore }`, `fetchMediaLibraryApi(client, { extensions?, limit?, cursor? })`, `MediaUploadResult`, and `useMediaLibrary` pages with a client-side **cursor stack** (cursors are opaque and forward-only, so "previous" re-requests the cursor that produced the previous page). 501 surfaces as `notConfigured: true` (not an error string) and the pickers show a dedicated, localised message and hide upload. `PuckHttpError.code` is parsed from the E/D error body (`{ message, statusCode, correlationId, code? }`) so UI code can branch on the media code (G names it `MEDIA_NOT_CONFIGURED`; E's message to J cited `MEDIA_NOT_CONFIGURED`: the client does not hard-code either, the 501 status is the trigger and the code is only shown in diagnostics). The mock service implements the same contract (cursor = base64url of the offset; `MOCK_MEDIA=none` switches both media routes to 501). `MediaFile.createdAt` may now be absent: picker UI must not assume it. **BREAKING** relative to the old `MediaLibraryResult`; recorded in the migration table.

### D-9 Image picker
`puck-image-picker` gets `dependencies: { "@commercetools-labs/puck-api": "workspace:^", "@commercetools-labs/puck-types": "workspace:^" }`; `ImagePickerProvider` props = `PuckConnection & { locale, messageOverrides, children }` and it internally mounts `PuckApiProvider` (so `useMediaLibrary` of the picker delegates to `puck-api`'s hook; the picker's own `api/media-library.api.ts`, `context/ImagePickerContext.tsx` are deleted; `ImagePickerConfig` type becomes an alias of `PuckConnection`; `useImagePickerContext` is removed). Its `useMediaLibrary` re-exports from `puck-api` to keep the symbol. This breaks its "no internal deps" property (acceptable: `puck-api` is small, React-only). Rejected: keeping a second implementation (the exact duplication that caused the 3-way header drift).

### D-10 Migration table (also shipped as `puck/docs/migration-1.0.md`)
| Old | New |
| --- | --- |
| prop `projectKey` on any component/provider | removed (single tenant) |
| prop `jwtToken: string` (required on managers) | optional `jwtToken?`, or `getAuthHeaders`, or `fetcher` |
| `PuckApiProvider projectKey jwtToken` | `PuckApiProvider baseURL businessUnitKey [jwtToken|getAuthHeaders|fetcher]` |
| `usePuckApiContext()` -> `{ baseURL, projectKey, businessUnitKey, jwtToken, locale }` | `{ client, baseURL, businessUnitKey, locale, canAuthenticate }` |
| `listPuckPagesApi(baseURL, projectKey, bu)` | `listPuckPagesApi(client)` |
| `getPuckPageApi(baseURL, projectKey, bu, key)` | `getPuckPageApi(client, key)` |
| `createPuckPageApi(baseURL, projectKey, jwt, bu, body)` | `createPuckPageApi(client, body)` |
| `updatePuckPageApi(baseURL, projectKey, jwt, bu, key, body)` | `updatePuckPageApi(client, key, body)` |
| `deletePuckPageApi(baseURL, projectKey, jwt, bu, key)` | `deletePuckPageApi(client, key)` |
| `getPublishedPuckPageApi(baseURL, projectKey, bu, key)` / preview | `getPublishedPuckPageApi(client, key)` / `getPreviewPuckPageApi(client, key)` |
| `queryPuckPageApi(baseURL, projectKey, bu, body, mode)` | `queryPuckPageApi(client, body, mode)` |
| `getPuckPageStatesApi`, `getPuckPageVersionsApi`, `publishPuckPageApi`, `revertPuckPageDraftApi` (same prefix args) | `(client, key[, clearDraft])` |
| all `*PuckContent*` functions | same transformation as the page functions |
| `listPuckTemplatesApi(baseURL, projectKey, bu, kind?)`, `createPuckTemplateApi`, `deletePuckTemplateApi` | `(client, kind?)`, `(client, body)`, `(client, key)` |
| `getThemeApi(baseURL, projectKey, bu)`, `createThemeApi/updateThemeApi(..., jwt, bu, value)`, `importDefaultContentTypesApi(...)` | `getThemeApi(client)`, `createThemeApi(client, value)`, `updateThemeApi(client, value)`, `importDefaultContentTypesApi(client, ...)` |
| `fetchMediaLibraryApi(baseURL, projectKey, bu, jwt?, ext, page, limit)`, `uploadMediaFileApi(baseURL, projectKey, bu, jwt, file, title?, desc?)` | `fetchMediaLibraryApi(client, { extensions?, limit?, cursor? })`, `uploadMediaFileApi(client, file, title?, desc?)` (returns `MediaUploadResult`) |
| `MediaLibraryResult.pagination { totalItems, totalPages, currentPage, limit }` | `{ limit, nextCursor, hasMore }`; hook `useMediaLibrary` adds `notConfigured`; `fetchMedia(extensions, page, limit)` -> `fetchMedia(extensions, limit)` |
| `searchProductsApi(baseURL, projectKey, text, opts)` | `searchProductsApi(client, text, opts)` |
| `resolveDatasourceApi(baseURL, projectKey, bu, jwt, key, body)` | `resolveDatasourceApi(client, key, body)` |
| `readHeaders`, `writeHeaders`, `httpClient` (not exported publicly) | internal; use `createPuckClient` |
| hook errors "jwtToken is required to ..." | `PuckAuthError` (`authCode: PUCK_AUTH_REQUIRED`) |
| header `x-project-key` | not sent |
| `ImagePickerProvider projectKey jwtToken` / `useImagePickerContext` | `PuckConnection` props / removed |
| playground `VITE_PROJECT_KEY`, `VITE_JWT_TOKEN` | removed; `VITE_AUTH_MODE`, `VITE_SERVICE_TOKEN` |
Hooks (`usePuckPages`, `usePuckPage`, ...) keep names and return shapes.

### D-11 SemVer
The packages are new under `@commercetools-labs` (spec I) and first released as `1.0.0` (rc first), so the break relative to `@commercetools-demo/puck-* 0.8.x` is communicated by the migration table, not a major bump. After 1.0.0, any change to `PuckConnection`, `PuckClient.request`, `PuckFetcher`/`PuckResponse`, `PuckAuthError`, the exported raw functions or `PUCK_AUTH_POLICY` keys is a **major** (breaking) change; adding optional fields or new functions is **minor**. Documented in the migration doc and `puck/README.md`.

### D-12 Tests (vitest + RTL; see tasks group 8)
Mock server in-process on an ephemeral port (real HTTP, so headers/CORS-free logic is genuinely exercised). Categories: client unit tests (matrix of header combinations; precedence; rotation; fetcher; errors; policy snapshot; encoding), hook tests (`renderHook` with a wrapper provider), component tests (renderer public/preview/no-provider; page manager save through fetcher; image picker upload), absence guards (source grep and built `dist` grep for `projectKey|x-project-key`). Deviation from `03-testing-strategy.md`: msw is **not** used for puck tests because the mock server gives real HTTP; msw remains the tool for the service.

### D-13 Browser verification (Chrome DevTools playbook, group 9)
Run against mock (default) or real service. Assertions use `list_network_requests` (headers) and `list_console_messages`; evidence PNGs to `plans/evidence/j/` (kept out of the published repo).

### D-14 German catalog
Decision (answers K's Q-K3 and I's Q-I1 for the puck side): J adds `de` to all six packages that have catalogs, generated with the existing `scripts/translate-messages.mjs --locale de` (machine translation, glossary applied) and the `Lang` unions in the six `EnsureIntlProvider.tsx` files. Rationale: the admin-app ships `en` + `de`; managers rendered inside the MC with a German user locale would otherwise fall back to English mid-screen. Cost is small (JSON + 6 one-line type edits) and verified by one test. Spanish stays. Rejected: leaving German to the host via `messageOverrides` (every host would redo the same work).

## Risks / Trade-offs

* [One big breaking edit] -> mechanical order in tasks: types -> client -> raw API -> hooks -> components -> image picker -> renderer -> playground; `yarn typecheck` after each package (tsc is the safety net because every old call site fails to compile).
* [E changes the public/protected split] -> single policy table, pinned snapshot, mock reads its own list but a test compares them.
* [Unauthenticated storefront datasource calls] -> request de-duplication; resolved by E D-E10 (unresolved blocks stay idle unless auth or `publicDatasourceResolve`).
* [Image picker now depends on puck-api] -> documented; tree-shaking keeps unused hooks out.
* [`fetcher` contract drift with MC SDK] -> structural `PuckResponse`; K owns an adapter test with a fake gateway.
* [Multipart through proxy unknown] -> Q-J3, adapter may fall back to a different upload strategy without changing the puck contract (fetcher receives `FormData`, may transform).

## Migration Plan

Edit in the order of tasks; each group ends with `yarn typecheck`/`yarn test` for the touched packages. Rollback: revert the groups in reverse; spec I's tree is the restore point.

## Open Questions

`questions.md` (Q-J1, Q-J2, Q-J7 are answered by E/F, see there): Q-J3 (multipart via MC proxy), Q-J4 (`'use client'` for Next App Router), Q-J5 (keep a deprecated `projectKey` alias? default no).
