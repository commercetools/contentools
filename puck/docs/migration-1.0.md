# Migrating to 1.0 (single tenant)

The earlier 0.8.x packages (published under the previous package scope) spoke a protocol for many tenants: a `projectKey` prop, a per-tenant `jwtToken` string and a project header on every request.
The `@commercetools-labs/puck-*` 1.0 packages serve exactly one commercetools project, so that concept is gone and replaced by one small connection object. This page is
the only place in the repository where the old names still appear.

The packages are new under the `@commercetools-labs` scope and start at `1.0.0` (first as a `1.0.0-rc.N` release under the `next` tag), so the break is communicated here instead of by a major bump.

## Mapping

| Old | New |
| --- | --- |
| prop `projectKey` on any component or provider | removed (single tenant) |
| prop `jwtToken: string` (required on the managers) | optional `jwtToken?`, or `getAuthHeaders`, or `fetcher` |
| `PuckApiProvider projectKey jwtToken` | `PuckApiProvider baseURL businessUnitKey [jwtToken or getAuthHeaders or fetcher]` |
| `usePuckApiContext()` returning `{ baseURL, projectKey, businessUnitKey, jwtToken, locale }` | `{ client, baseURL, businessUnitKey, locale, canAuthenticate, connection }` |
| `listPuckPagesApi(baseURL, projectKey, bu)` | `listPuckPagesApi(client)` |
| `getPuckPageApi(baseURL, projectKey, bu, key)` | `getPuckPageApi(client, key)` |
| `createPuckPageApi(baseURL, projectKey, jwt, bu, body)` | `createPuckPageApi(client, body)` |
| `updatePuckPageApi(baseURL, projectKey, jwt, bu, key, body)` | `updatePuckPageApi(client, key, body)` |
| `deletePuckPageApi(baseURL, projectKey, jwt, bu, key)` | `deletePuckPageApi(client, key)` |
| `getPublishedPuckPageApi(baseURL, projectKey, bu, key)` and the preview variant | `getPublishedPuckPageApi(client, key)` and `getPreviewPuckPageApi(client, key)` |
| `queryPuckPageApi(baseURL, projectKey, bu, body, mode)` | `queryPuckPageApi(client, body, mode)` |
| `getPuckPageStatesApi`, `getPuckPageVersionsApi`, `publishPuckPageApi`, `revertPuckPageDraftApi` (same prefix arguments) | `(client, key[, clearDraft])` |
| every `*PuckContent*` function | same transformation as the page functions |
| `listPuckTemplatesApi(baseURL, projectKey, bu, kind?)`, `createPuckTemplateApi`, `deletePuckTemplateApi` | `(client, kind?)`, `(client, body)`, `(client, key)` |
| `getThemeApi(baseURL, projectKey, bu)`, `createThemeApi` / `updateThemeApi(..., jwt, bu, value)`, `importDefaultContentTypesApi(...)` | `getThemeApi(client)`, `createThemeApi(client, value)`, `updateThemeApi(client, value)`, `importDefaultContentTypesApi(client)` |
| `fetchMediaLibraryApi(baseURL, projectKey, bu, jwt?, ext, page, limit)`, `uploadMediaFileApi(baseURL, projectKey, bu, jwt, file, title?, desc?)` | `fetchMediaLibraryApi(client, { extensions?, limit?, cursor? })`, `uploadMediaFileApi(client, file, title?, desc?)` (returns `MediaUploadResult`) |
| `MediaLibraryResult.pagination { totalItems, totalPages, currentPage, limit }` | `{ limit, nextCursor, hasMore }`; the hook `useMediaLibrary` adds `notConfigured`; `fetchMedia(extensions, page, limit)` becomes `fetchMedia(extensions, limit)` |
| `searchProductsApi(baseURL, projectKey, text, opts)` | `searchProductsApi(client, text, opts)` |
| `resolveDatasourceApi(baseURL, projectKey, bu, jwt, key, body)` | `resolveDatasourceApi(client, key, body)` |
| `readHeaders`, `writeHeaders`, `httpClient` (internal) | internal; use `createPuckClient` |
| hook errors "jwtToken is required to ..." | `PuckAuthError` with `authCode: 'PUCK_AUTH_REQUIRED'` |
| the project header on every request | not sent |
| `ImagePickerProvider projectKey jwtToken`, `useImagePickerContext` | `PuckConnection` props, hook removed |
| playground `VITE_PROJECT_KEY`, `VITE_JWT_TOKEN` | removed; `VITE_AUTH_MODE`, `VITE_SERVICE_TOKEN` |

Hooks (`usePuckPages`, `usePuckPage`, ...) keep their names and return shapes.

## Before and after

```tsx
// before
<PageManager baseURL={url} projectKey="p" businessUnitKey="bu" jwtToken={jwt} parentUrl="/pages" />

// after
<PageManager baseURL={url} businessUnitKey="bu" jwtToken={jwt} parentUrl="/pages" />
```

```ts
// before
const page = await getPuckPageApi(baseURL, projectKey, businessUnitKey, 'home');

// after
const client = createPuckClient({ baseURL, businessUnitKey, jwtToken });
const page = await getPuckPageApi(client, 'home');
```

## Behaviour changes

* **Auth on more calls.** Preview reads, lists, reads with states, templates, media, product search and all writes need credentials; the client refuses such a call before sending anything when no `jwtToken`, `getAuthHeaders` or `fetcher` is configured (`PuckAuthError`, `PUCK_AUTH_REQUIRED`). Published page/content reads and theme reads stay public.
* **Keys are encoded.** Keys placed in a URL path go through `encodeURIComponent`. The old code interpolated them raw, so a key containing `/` or `?` produced a wrong URL; that was a latent bug.
* **Error messages.** `[puck-api] HTTP <status>: <message>` now prefers the `message` of the service error body. Errors are `PuckHttpError` / `PuckAuthError` instances with `status`, `body`, `code`, `correlationId`.
* **`useDatasource` without a provider** returns `{ data: null, loading: false, error: null }` instead of throwing, and without credentials stays idle (unless `publicDatasourceResolve`). Identical concurrent requests of one client share one call.
* **Image picker.** `puck-image-picker` now depends on `puck-api` (one request pipeline instead of a duplicate). Pagination is cursor based: Previous/Next only, no page numbers. When the service has no media storage configured (HTTP 501) the picker shows a message and hides upload.
* **Request headers.** `Content-Type: application/json` is sent only on requests with a JSON body; `x-source: puck-api` is always sent; no tenant header.
* **Renderer.** `PuckRenderer` needs `baseURL` and `businessUnitKey` (or an ancestor `PuckApiProvider`); `mode="preview"` without credentials renders "Preview requires authentication" and makes no request.

## SemVer policy

After 1.0.0, a change to `PuckConnection`, `PuckClient.request`, `PuckFetcher` / `PuckResponse`, `PuckAuthError`, the exported raw API functions or the keys of `PUCK_AUTH_POLICY` is a **major** (breaking) change.
Adding optional fields or new functions is **minor**. Bug fixes are **patch**.

## Retired tenant names, for searching

`projectKey`, `VITE_PROJECT_KEY`, `VITE_JWT_TOKEN`, `readHeaders`, `writeHeaders`.
