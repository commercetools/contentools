## ADDED Requirements

### Requirement: Single-tenant connection props
Every Puck public component (`PuckEditor`, `PageManager`, `ContentManager`, `ThemeManager`, `PuckRenderer`, `ImagePickerProvider`, `ImportContentTypes`) and `PuckApiProvider` SHALL accept exactly these connection inputs: `baseURL` (string), `businessUnitKey` (string), optional `locale`, optional `jwtToken`, optional `getAuthHeaders`, optional `fetcher`, optional `publicDatasourceResolve`. No public type, prop, context field, hook argument or function parameter SHALL be named `projectKey`, and no request SHALL carry an `x-project-key` header.

#### Scenario: Source has no tenant identifiers
- **WHEN** `grep -rniE "projectKey|x-project-key|PROJECT_KEY" puck --include=*.ts --include=*.tsx --include=*.md --include=*.json --include=.env.example --exclude-dir=node_modules --exclude-dir=dist` is run
- **THEN** it returns only occurrences inside the migration table of `puck/docs/migration-1.0.md` and the guard test that asserts their absence

#### Scenario: TypeScript rejects the old prop
- **WHEN** a consumer writes `<PageManager projectKey="p" ... />`
- **THEN** `tsc` reports that `projectKey` does not exist on `PageManagerProps`

### Requirement: Auth injection with per-request evaluation
The client SHALL build request headers at request time in this precedence: headers returned by `getAuthHeaders()` (awaited, may be async), else `Authorization: Bearer <jwtToken>` when `jwtToken` is a non-empty string, else none. A token or header function that changes between renders SHALL be used by the next request without remounting the provider.

#### Scenario: Static token
- **WHEN** a provider has `jwtToken="abc"` and a hook performs a write
- **THEN** the request carries `Authorization: Bearer abc`

#### Scenario: getAuthHeaders wins and is async
- **WHEN** both `jwtToken="old"` and `getAuthHeaders={async () => ({ Authorization: 'Bearer fresh' })}` are set
- **THEN** the request carries `Authorization: Bearer fresh` and not the old token

#### Scenario: Rotated token without remount
- **WHEN** the host re-renders the provider with a new `jwtToken` and the user then saves
- **THEN** the save request uses the new token and no new client instance is observable by hooks (`usePuckApiContext().client` identity is stable)

### Requirement: Transport override for the Merchant Center proxy
When a `fetcher` is provided the client SHALL send every request through it instead of `globalThis.fetch`, passing `{ url, method, headers, body }` where `body` is a JSON string or `FormData`, and SHALL accept any response object that structurally provides `ok`, `status`, `statusText`, `headers.get`, `text()` and `json()`. A `fetcher` MAY be the only authentication mechanism.

#### Scenario: Fetcher is the only auth
- **WHEN** a provider has a `fetcher` and neither `jwtToken` nor `getAuthHeaders`, and a hook saves a page
- **THEN** the save is executed (no client-side "auth required" error), the fetcher is called once with `method: 'PUT'` and a URL under `baseURL/:businessUnitKey/puck-pages/`, and no `Authorization` header was added by the client

#### Scenario: Fetcher errors surface like network errors
- **WHEN** the fetcher returns `{ ok: false, status: 403, ... }`
- **THEN** the call rejects with a `PuckAuthError` whose `status` is 403

### Requirement: Request headers
The client SHALL send `Content-Type: application/json` only on requests that have a JSON body, SHALL NOT set `Content-Type` for `FormData` bodies, and SHALL send `x-source: puck-api` on every request.

#### Scenario: Simple public read
- **WHEN** `getPublishedPuckPageApi` is called with no auth configured
- **THEN** the single request has no `Authorization` and no `Content-Type` header

#### Scenario: Upload
- **WHEN** a file is uploaded
- **THEN** the body is `FormData` and no `Content-Type` header is set by the client (the browser adds the multipart boundary)

### Requirement: Auth policy table
All API calls SHALL be classified in one exported constant `PUCK_AUTH_POLICY` as `public` (no auth needed, auth attached when available), `protected` (auth required) or `attach` (auth sent when available, not required). Published page/content reads, published queries and `GET configuration/theme` SHALL be `public`; preview reads/queries, every mutation, content-type import, upload, media library, templates, states, versions, list/get-with-states and product search SHALL be `protected`; datasource resolve SHALL be `attach` (auth sent when available, never required client-side, because the service exposes it publicly only when `PUBLIC_DATASOURCE_RESOLVE` is on). For a `protected` call with no auth source (no `jwtToken`, no `getAuthHeaders`, no `fetcher`) the client SHALL reject before any network I/O with `PuckAuthError` (`status: 401`, `authCode: 'PUCK_AUTH_REQUIRED'`).

#### Scenario: Protected call without auth
- **WHEN** `updatePuckPageApi` is called on a client created with only `baseURL` and `businessUnitKey`
- **THEN** the promise rejects with `PuckAuthError` and `fetch` was never called

#### Scenario: Public call with auth available
- **WHEN** a published read is made on a client that has a token
- **THEN** the request still carries the `Authorization` header (attach-when-available)

#### Scenario: Policy is pinned
- **WHEN** the unit test snapshots `PUCK_AUTH_POLICY`
- **THEN** the snapshot lists every one of the 35 API functions exactly once

### Requirement: Typed errors
Non-2xx responses SHALL reject with `PuckHttpError` (`status`, `statusText`, `body`, `url`, `method`), with `PuckAuthError extends PuckHttpError` for 401 and 403. `error.message` SHALL keep the form `[puck-api] HTTP <status>: <body or statusText>`. A 404 on a call marked `nullOn404` SHALL resolve to `null`.

#### Scenario: 401 response
- **WHEN** the service answers 401 with body `{"message":"Authentication required","statusCode":401,"correlationId":"c1"}`
- **THEN** the rejection is a `PuckAuthError`, `error.status === 401`, `error.correlationId === 'c1'` and `error.message` is `[puck-api] HTTP 401: Authentication required`

#### Scenario: Server error code
- **WHEN** the service answers 501 with body `{"message":"x","statusCode":501,"code":"MEDIA_NOT_CONFIGURED"}`
- **THEN** `error.code` equals that string

### Requirement: React-free client
`@commercetools-labs/puck-api` SHALL export `createPuckClient(connection)` returning a `PuckClient` usable without React (server components, scripts), and every raw API function SHALL take the client as its first argument. `PuckApiProvider` SHALL create one stable client per mount from its props.

#### Scenario: Server-side fetch
- **WHEN** a Node script calls `getPublishedPuckPageApi(createPuckClient({ baseURL, businessUnitKey }), 'home')`
- **THEN** it returns the page value without importing React

### Requirement: Public-read renderer
`PuckRenderer` with `mode="published"` (default) SHALL work with only `baseURL` and `businessUnitKey` and with no token; `PuckDataRenderer` SHALL render without any provider; `PuckRenderer mode="preview"` SHALL show its error element ("Preview requires authentication") when no auth source exists, without a network request. Product blocks that use datasources SHALL NOT throw without a provider or token: with `resolvedData` (embedded by the service in published reads) they render it with no request; without it they call datasource resolve only when the client has an auth source or `publicDatasourceResolve` is true, and otherwise render empty content without any request.

#### Scenario: Published page, anonymous
- **WHEN** `<PuckRenderer baseURL=... businessUnitKey=... pageKey="home" />` mounts
- **THEN** exactly one request is made, to `GET /:bu/published/puck-pages/home`, with no `Authorization` header, and the page renders

#### Scenario: Preview without auth
- **WHEN** `<PuckRenderer ... mode="preview" pageKey="home" />` mounts without auth
- **THEN** no request is made and the error element contains "authentication"

#### Scenario: Unresolved product block in public mode
- **WHEN** a published page contains a product block with `resolvedData: null` and the provider has no auth and no `publicDatasourceResolve`
- **THEN** no datasource request is made and the block renders empty

#### Scenario: Opt-in public resolve
- **WHEN** the same page renders with `publicDatasourceResolve` true
- **THEN** one anonymous datasource resolve request is made

#### Scenario: Data renderer without provider
- **WHEN** `<PuckDataRenderer data={dataWithProductBanner} />` renders a block whose product has `resolvedData`
- **THEN** it renders without throwing and without any request

### Requirement: Managers, editor and image picker share the client
`PageManager`, `ContentManager`, `ThemeManager`, `PuckEditor`, `ImportContentTypes` and `ImagePickerField` SHALL obtain requests exclusively through the same client; `puck-image-picker` SHALL NOT contain its own HTTP implementation.

#### Scenario: One implementation
- **WHEN** `grep -rn "fetch(" puck/packages --include=*.ts --include=*.tsx` is run over `src`
- **THEN** the only hit is in `puck-api/src/client/` (the default transport)

#### Scenario: Manager save uses injected auth
- **WHEN** `PageManager` is mounted with a `fetcher` and the user edits and saves a page in the editor
- **THEN** the fetcher receives the draft `PUT` and the UI shows saved state

### Requirement: Migration documentation
The package set SHALL ship `puck/docs/migration-1.0.md` with the old-to-new mapping for props, raw functions, hooks, env variables, headers and errors, and the README usage sections SHALL use only the new props.

#### Scenario: README is consistent
- **WHEN** a script extracts the props listed in the README for each component
- **THEN** none is `projectKey` and `getAuthHeaders` and `fetcher` are documented

### Requirement: Fetch adapter
`puck-api` SHALL export `fetcherFromFetch(fetchLike)` returning a `PuckFetcher` that calls `fetchLike(url, { method, headers, body })`.

#### Scenario: Adapter forwards request parts
- **WHEN** `fetcherFromFetch(spy)` is invoked with a PUT request carrying a JSON body
- **THEN** `spy` is called once with the same url and `{ method: 'PUT', headers, body }`

### Requirement: Locale catalogs
Every package that ships message catalogs SHALL ship `en`, `es` and `de`; an unsupported locale SHALL fall back to English and `de-*` locales SHALL resolve to German.

#### Scenario: German manager UI
- **WHEN** `PageManager` renders with `locale="de-DE"`
- **THEN** the page list heading shows the German catalog text for `PageManager.pagesTitle`

#### Scenario: Unsupported locale
- **WHEN** `locale="fr"` is used
- **THEN** English text is shown

### Requirement: Media library contract (cursor pagination and unconfigured storage)
`fetchMediaLibraryApi` SHALL send `limit` and `cursor` (no `page`), `MediaLibraryResult.pagination` SHALL be `{ limit, nextCursor, hasMore }`, and `useMediaLibrary` SHALL page forward with `nextCursor` and backward with a client-side cursor stack. A 501 response SHALL set `notConfigured` instead of an error and the image pickers SHALL show a localised "not configured" message and hide the upload action.

#### Scenario: Forward and back
- **WHEN** the first page answers `hasMore: true, nextCursor: "c1"` and the user clicks Next, then Previous
- **THEN** the second request carries `cursor=c1` and the third request carries no `cursor`

#### Scenario: Last page
- **WHEN** the response has `hasMore: false`
- **THEN** Next is disabled and no further request is made

#### Scenario: Storage not configured
- **WHEN** the media endpoint answers 501
- **THEN** `notConfigured` is true, `error` is null and the picker shows the "Media storage is not configured" text without an upload button
