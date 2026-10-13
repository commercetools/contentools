# Explore note: j-puck-connection-contract

Working note (not an OpenSpec artifact). Source read-only: `/Users/behnam/code/cms/puck`. Paths below are relative to that folder and will be
`puck/...` in the target repo after spec I. Line numbers are from the source at 2026-10-08 and shift after spec I adds the SPDX header (+6 lines
per file) and the `cms` -> `blocks` rename; re-grep before editing.

## 1. Every use of the old connection inputs

Command: `grep -rnIE "x-project-key|jwtToken|projectKey|PuckApiProvider|PROJECT_KEY|JWT_TOKEN|readHeaders|writeHeaders" packages/*/src puck-react-test/src puck-react-test/.env.example README.md packages/*/README.md docs scripts`
-> **368 matching lines in 41 files** (listing below: file and line numbers).

- `packages/puck-api/src/index.ts`: 3, 4
- `packages/puck-api/src/context/PuckApiContext.tsx`: 5, 7, 21, 22
- `packages/puck-api/src/context/PuckApiProvider.tsx`: 4, 8, 11, 13, 18
- `packages/puck-api/src/hooks/usePuckStateManagement.ts`: 29, 42, 52, 60, 63, 64, 71, 75, 78, 79, 84
- `packages/puck-api/src/hooks/usePuckContents.ts`: 27, 45, 56, 69, 72, 73, 80, 85, 88, 89, 95
- `packages/puck-api/src/hooks/useProductSearch.ts`: 15, 22, 44, 61
- `packages/puck-api/src/hooks/usePuckContentType.ts`: 14, 23, 29, 30, 39
- `packages/puck-api/src/hooks/usePuckConfiguration.ts`: 21, 34, 41, 49, 55, 56, 65, 70, 76, 77, 89
- `packages/puck-api/src/hooks/useMediaLibrary.ts`: 50, 71, 73, 92, 101, 106, 108, 141
- `packages/puck-api/src/hooks/useDatasource.ts`: 21, 32, 44, 46, 59
- `packages/puck-api/src/hooks/usePuckContent.ts`: 40, 59, 71, 88, 99, 100, 117, 122, 127, 128, 141, 145, 150, 151, 164, 170, 178
- `packages/puck-api/src/hooks/usePuckTemplates.ts`: 34, 47, 57, 65, 68, 69, 76, 81, 84, 85, 91
- `packages/puck-api/src/hooks/usePuckPages.ts`: 24, 35, 42, 50, 53, 54, 61, 66, 69, 70, 76
- `packages/puck-api/src/api/datasource.api.ts`: 1, 5, 7, 15
- `packages/puck-api/src/hooks/usePuckPage.ts`: 38, 58, 70, 85, 97, 98, 118, 123, 128, 129, 143, 148, 153, 154, 167, 171, 176, 177, 190, 196, 204
- `packages/puck-api/src/api/media-library.api.ts`: 6, 8, 18, 19, 29, 31, 46
- `packages/puck-api/src/api/puck-states.api.ts`: 5, 9, 15, 21, 22, 33, 39, 40, 46, 52, 58
- `packages/puck-api/src/api/configuration.api.ts`: 3, 5, 8, 9, 10, 13, 14, 27, 32, 40, 41, 49, 58, 59, 67, 76, 77, 84
- `packages/puck-api/src/api/puck-templates.api.ts`: 7, 11, 18, 24, 25, 33, 41, 42, 48
- `packages/puck-api/src/api/products.api.ts`: 1, 18, 28
- `packages/puck-api/src/api/puck-pages.api.ts`: 8, 12, 17, 23, 29, 35, 36, 44, 52, 53, 62, 70, 71, 77, 83, 89, 95, 101, 107, 116
- `packages/puck-api/src/api/http-client.ts`: 39, 41, 44, 45, 46, 49, 50
- `packages/puck-api/src/api/puck-content-states.api.ts`: 5, 9, 15, 21, 22, 33, 39, 40, 46, 52, 58
- `packages/puck-api/src/api/puck-contents.api.ts`: 8, 12, 19, 25, 31, 37, 38, 46, 54, 55, 64, 72, 73, 79, 85, 91, 97, 103, 109, 118
- `packages/puck-content-manager/src/ContentManager.tsx`: 4, 406, 411, 413, 425, 427, 434, 436, 438, 441
- `packages/puck-content-manager/src/ContentManagerRouter.tsx`: 40, 892, 894, 912, 914, 923, 925, 927, 937
- `packages/puck-editor/src/PuckEditor.tsx`: 6, 36, 342, 349, 353, 387, 389, 403, 405, 407, 425
- `packages/puck-content-manager/src/ContentEditor.tsx`: 6, 339, 344, 346, 364, 366, 377, 379, 381, 391
- `packages/puck-image-picker/src/hooks/useMediaLibrary.ts`: 50, 71, 73, 92, 101, 106, 108, 141
- `packages/puck-image-picker/src/context/ImagePickerProvider.tsx`: 16, 18, 24
- `packages/puck-image-picker/src/context/ImagePickerContext.tsx`: 5, 7
- `packages/puck-image-picker/src/api/media-library.api.ts`: 9, 11, 22, 24, 44, 46, 61, 62
- `packages/puck-theme-manager/src/components/import-content-types.tsx`: 4, 20, 22, 138, 140, 145, 147, 149, 156
- `packages/puck-renderer/src/PuckRenderer.tsx`: 2, 55, 75, 76, 79, 97, 98, 100, 122, 185, 189, 239, 273, 275, 277, 281
- `packages/puck-page-manager/src/PageManager.tsx`: 12, 493, 532, 534, 640, 642, 659, 661, 669, 671, 673, 679
- `packages/puck-renderer/src/PuckDataRenderer.tsx`: 29
- `packages/puck-theme-manager/src/components/theme-editor.tsx`: 4, 272, 274, 922, 924, 929, 931, 933, 940
- `puck-react-test/src/App.tsx`: 11, 13, 31, 118, 122, 262, 324, 335, 337, 358
- `README.md`: 22, 103, 105, 125, 126, 151, 166, 176, 191, 192
- `puck-react-test/.env.example`: 3, 5
- `docs/api-contracts.json`: 425, 453

### 1.1 Reading the listing (what each cluster is)

* **Header builders** (`packages/puck-api/src/api/http-client.ts:39-51`): `readHeaders(projectKey)` -> `Content-Type: application/json` + `x-project-key`;
  `writeHeaders(projectKey, jwtToken)` adds `Authorization: Bearer`. `httpClient()` (lines 9-37) always adds `x-source: puck-api`, throws
  `Error("[puck-api] HTTP <status>: <body>")` on non-2xx, returns `null` on 404 when `nullOn404`, `undefined` on 204/non-JSON.
* **Duplicates of the header builders**: `puck-api/src/api/configuration.api.ts:3-14` (own `readHeaders`/`writeHeaders`, raw `fetch`, own `handleResponse`),
  `puck-api/src/api/media-library.api.ts:18-19,46` (inline `x-project-key`, optional `Authorization`), `puck-image-picker/src/api/media-library.api.ts:22-24,61-62`
  (a full second copy of the media API and `fetch` error handling; this package has **no** dependency on puck-api).
* **Raw API functions** take `(baseURL, projectKey, [jwtToken,] businessUnitKey, ...)` positional args: 9 files, 35 exported functions (table in section 2).
* **Context + provider**: `PuckApiContext.tsx:3-13` (`baseURL, projectKey, businessUnitKey, jwtToken?, locale?`), `PuckApiProvider.tsx:4-22`;
  `usePuckApiContext` (lines 17-26) **throws** when no provider. Image picker has its own `ImagePickerContext.tsx:3-9` / `ImagePickerProvider.tsx:16-24`.
* **Hooks** read `{ baseURL, projectKey, businessUnitKey, jwtToken }` from context and guard writes with `if (!jwtToken) throw new Error('jwtToken is required to ...')`
  (e.g. `usePuckPage.ts:85,123`, `useMediaLibrary.ts:101` in both packages) and `useDatasource.ts:32` silently returns when there is no token.
* **Public components that accept the props and re-mount a provider**: `PuckEditor.tsx:349,353,387,389,403-407`, `PageManager.tsx:640-642,659-661,669-673`
  (+ inner route reads context at 493 and re-passes `projectKey`/`jwtToken ?? ''` into `PuckEditor` at 532-534), `ContentManager.tsx:411-413,425-427,434-438`,
  `ContentManagerRouter.tsx:892-894,912-914,923-927`, `ContentEditor.tsx:344-346,364-366,377-381`, `theme-editor.tsx` (`ThemeManager`) `272-274,922-933`,
  `import-content-types.tsx:20-22,138-149` (`ImportContentTypes`), renderer `PuckRenderer.tsx:55,75-79,97-100,122,188-189,239-240,273-277` (only reads `projectKey`; never passes a token).
* **Docs/config**: `README.md:22,103,105,125,126,151,166,176,191,192` (config object, props list, renderer snippets), `puck-react-test/.env.example:3,5`
  (`VITE_PROJECT_KEY`, `VITE_JWT_TOKEN`), `puck-react-test/src/App.tsx:11,13,31,118,122,262,324,335,337,358` (env consts, `ConfigWarning` text, `RendererPanel` props, `sharedProps`),
  `docs/api-contracts.json:425,453` (descriptions that mention `projectKey` args).

## 2. Endpoints the client calls (all under `${baseURL}`; BU = `businessUnitKey`)

| Function (file) | Method + path | Header builder today | Auth needed under Q-01a |
| --- | --- | --- | --- |
| `listPuckPagesApi`, `getPuckPageApi` (puck-pages.api.ts) | GET `/:bu/puck-pages`, `/:bu/puck-pages/:key` | read (no token) | **yes** (editor reads drafts/states) |
| `createPuckPageApi`, `updatePuckPageApi`, `deletePuckPageApi` | POST/PUT/DELETE `/:bu/puck-pages[/:key]` | write | yes |
| `getPublishedPuckPageApi` | GET `/:bu/published/puck-pages/:key` | read | **no (public)** |
| `getPreviewPuckPageApi` | GET `/:bu/preview/puck-pages/:key` | read (**no token today**) | **yes (new)** |
| `queryPuckPageApi` | POST `/:bu/{published|preview}/puck-pages/query` | read | published: no; preview: yes |
| `getPuckPageStatesApi`, `getPuckPageVersionsApi` (puck-states.api.ts) | GET `.../states`, `.../versions` | read | yes |
| `publishPuckPageApi`, `revertPuckPageDraftApi` | PUT `.../states/published`, DELETE `.../states/draft` | write | yes |
| same 12 for contents (`puck-contents.api.ts`, `puck-content-states.api.ts`) | `/:bu/puck-contents...` | same | same |
| `listPuckTemplatesApi` / `createPuckTemplateApi` / `deletePuckTemplateApi` | GET/POST/DELETE `/:bu/puck-templates[/:key][?kind=]` | read/write/write | yes / yes / yes |
| `getThemeApi` (configuration.api.ts:25) | GET `/:bu/configuration/theme` (404 -> null) | read | **no (public; storefronts need the theme tokens/CSS variables)** - E to confirm |
| `createThemeApi`, `updateThemeApi`, `importDefaultContentTypesApi` | POST/PUT `/:bu/configuration/theme`, POST `/:bu/content-type/import` | write | yes |
| `fetchMediaLibraryApi` (media-library.api.ts:6) | GET `/:bu/media-library?extensions=&page=&limit=` | optional token | yes (E to confirm) |
| `uploadMediaFileApi` | POST `/:bu/upload-file` multipart (`FormData`: file, title, description) | write, **no Content-Type** | yes |
| `searchProductsApi` (products.api.ts) | GET `/products/search?text=&limit=&locale=` (**no BU in path**) | read | E to decide (editor: yes; renderer: not used) |
| `resolveDatasourceApi` (datasource.api.ts) | POST `/datasource/:key/test` body `{ params }` (**no BU in path**) | write | **conflict**, see 3.4 |

## 3. Findings that shape the design

1. **Preview reads send no token today** (`getPreviewPuckPageApi` and content twin use `readHeaders`). Q-01a makes preview protected, so these must start sending auth.
2. **Editor reads of drafts/states/versions/list are also unauthenticated today** (`readHeaders`). Under Q-01a, spec E decides; J's client therefore *attaches auth to every
   request when an auth source is configured* and *requires* it (client-side) only for calls in one policy table, so changing E's decision is a one-table edit.
3. **Tokens go stale**: the MC session JWT used for the forward-to proxy is short-lived and issued per request by the MC gateway; a static string `jwtToken` captured at mount
   cannot be refreshed. A `getAuthHeaders()` async hook (read at request time) and a `fetcher` are needed.
4. **Datasource resolution is used by render-time components**: `puck-components` blocks `ProductTeaser`, `ProductBanner`, `ProductSlider`, `RelatedProductsSlider`, `CrossSellBlock`
   call `useDatasource` (imports at `components/ProductTeaser.tsx:4` and `components/cms/*.tsx:4`). They short-circuit when `product.resolvedData` is present (e.g.
   `ProductBanner.tsx:30-35`), otherwise `useDatasource` calls `POST /datasource/:key/test`, which today requires a JWT, and the hook returns early without a token
   (`useDatasource.ts:32`) so **the public renderer shows empty product blocks**. Also `useDatasource` calls `usePuckApiContext()` which **throws** with no provider, so
   `PuckDataRenderer` (documented as provider-free, `PuckDataRenderer.tsx:27-33`) throws for product blocks without `resolvedData`. J makes the hook tolerate a missing provider (optional context)
   and no-auth (try the request; service decides), and raises question Q-J2 for spec E/F (public datasource resolve).
5. **CORS/preflight cost**: every call sends `Content-Type: application/json` (even GET) and `x-source: puck-api`, forcing a preflight on all requests. The service allow-list is
   `service/src/app.ts:33` = `['Content-Type','Authorization','x-project-key','x-source']`, logs `x-source` at `app.ts:44`. J: drop `x-project-key`, send `Content-Type` only with a body, keep `x-source`
   (spec E must allow `Authorization`, `Content-Type`, `x-source`, methods GET/POST/PUT/DELETE/OPTIONS).
6. **Provider mounting**: `PuckRenderer` only mounts a provider when `baseURL && projectKey && businessUnitKey` are all given (`PuckRenderer.tsx:273`); otherwise it relies on an ancestor provider.
7. **Image picker is standalone** (no internal deps) with its own context and API duplicate. J removes the duplicate by making it depend on `puck-api`'s client (design D-9).
8. `PuckEditor` is also used stand-alone by hosts (public props 345-385) -> it must accept the same connection props as the managers.

### 3.9 Media contract change from spec G (received during authoring)
Spec G (`openspec/changes/g-service-media-storage`) replaces page/totals pagination with `{ limit, nextCursor, hasMore }`, adds `key`/`contentType` to `MediaFile`, returns `{ url, key, name, size, contentType }` from upload and answers 501 `MEDIA_NOT_CONFIGURED` for the default provider `none`. Affected client code: `puck-types/src/puck-api.types.ts:22-43`, `puck-api/src/api/media-library.api.ts`, `puck-api/src/hooks/useMediaLibrary.ts` (page arithmetic at ~144-171), `puck-image-picker/src/{types.ts:12-20, hooks/useMediaLibrary.ts, ImagePickerField.tsx:224-235,373-399,483-499,592-596}` and the editor's twin `puck-editor/src/fields/ImagePickerField.tsx:214-225,363-383,440-456,542-546`. Both `ImagePickerField` copies render page indicators from `currentPage/totalPages`. See design D-15.

### 3.10 Alignment with final specs E and F (received during authoring)
E section 4 (authoritative route table): public = health, published reads/queries, all `GET /:bu/configuration/*`; protected = drafts-exposing reads, preview, templates, `/products/search`, datasource management, media; datasource resolve public only with `PUBLIC_DATASOURCE_RESOLVE=true`; `SERVICE_API_TOKEN` accepted everywhere protected; error body `{ message, statusCode, correlationId, code?, errors? }`. F serves both `POST /content-type/import` and `POST /:bu/content-type/import`, and embeds `resolvedData` in published reads. This supersedes the assumptions in section 2 ("Auth needed" column) wherever they differ: templates and `/products/search` protected, configuration reads public, datasource resolve conditional.

## 4. Merchant Center forward-to proxy facts (docs, verified 2026-10-08)

Source: https://docs.commercetools.com/merchant-center-customizations/concepts/integrate-with-your-own-api (and the application-shell reference).
* The MC browser app must not call a custom backend directly with the user's token. It calls the MC API Gateway `.../proxy/forward-to` with headers `Accept-version`, `X-Forward-To` (the target URL),
  `X-Forward-To-Audience-Policy` (`forward-url-full-path` default | `forward-url-origin`), optional `X-Forward-To-Claims: permissions`, and `X-Project-Key`. The gateway checks project access and
  forwards the request adding `Authorization: Bearer <exchange JWT>`; the backend verifies it with `createSessionMiddleware({ audience, issuer })` from `@commercetools-backend/express` (session `{ userId, projectKey, userPermissions? }`).
* In code this is `actions.forwardTo.get/post/...({ uri, headers, audiencePolicy, includeUserPermissions })` (SDK actions) or `executeHttpClientRequest(fetcher, { forwardToConfig: { uri, headers, audiencePolicy, includeUserPermissions, version } })`
  from `@commercetools-frontend/application-shell`. The fetcher receives `{ credentials: 'include', headers }` (MC default headers) and must return `{ data, statusCode, getHeader }`.
  Custom headers for the backend go in `x-forward-header-<name>` (prefix stripped by the gateway).
* Consequence for puck: the **transport** is owned by the host. `fetch(url, init)` against the service URL is wrong inside MC. Hence the `fetcher` hook: `(request) => Promise<response>` where the MC adapter
  (spec K) wraps `executeHttpClientRequest` and builds a `Response`. No token string exists in the browser; `jwtToken` and `getAuthHeaders` stay unset and the `fetcher` alone authenticates.
* Open risk (Q-J3): multipart `FormData` upload through the proxy is not documented; the adapter may need a base64/JSON upload or direct upload to a signed URL (spec G/K).

## 5. Service reality check (read-only `/Users/behnam/code/cms/service`)

`service/src/routes/{puck-page,puck-content,puck-template,configuration,content-type,datasource,product,file}.route.ts` implement the endpoints of section 2 today with `validateJwt, validateProject`
middleware, and `datasource.route.ts` reads datasources from **Firestore** (`getDatasourcesCollection(projectKey)`), which spec F must replace (custom objects). Spec E/F own the final contract; the mock server in this
spec encodes the section 2 table as the *client-visible* contract and must be updated if E/F change a path.

## 6. Existing tests

None in `puck/`. Spec I adds vitest + React Testing Library + jsdom; spec B adds the global harness. J adds the connection-contract tests listed in tasks.md.

## 7. Risks

1. 35 raw API function signatures change at once (**BREAKING**); hooks and components must be moved in the same change or the build breaks.
2. `useDatasource` no-token behaviour change can fire many unauthenticated requests from a storefront page (rate); mitigate with in-memory request de-duplication per `(key, skus)` inside the client.
3. If E keeps editor reads public, `required` flags in the policy table must be relaxed; a unit test pins the table so a change is deliberate.
4. A `fetcher` returning a non-standard response breaks error parsing; the contract is a minimal structural interface (design D-2) plus tests with a fake fetcher.
