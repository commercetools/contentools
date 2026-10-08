# Explore notes: f-service-content-api

Working note. SOURCE = `/Users/behnam/code/cms/service/src` (read-only). Media (`upload-file`, `media-library`, `compile-upload`) belongs to spec G, not F.
All files below are, at the start of F, in `service/src/_pending/` (parked by D; same relative sub-path).

## 1. Which routes are kept (verified by grepping `puck/packages/puck-api/src/api/*.ts`, `mcp/src/shared/functions.ts`)

`puck-api` (the only first-party HTTP client of the editor) calls exactly: puck-pages (list, get, create, update, delete, published get, preview get, `:mode/query`, states, publish, revert draft, versions), puck-contents (same set + list `?contentType=`),
puck-templates (list `?kind=`, create, delete), `configuration/theme` (GET/POST/PUT), `POST /:bu/content-type/import`, `GET /products/search`, `POST /datasource/:key/test`, media (G).
The brief also keeps all `configuration/*` slices, all `datasource/*`, and the storefront-facing published reads; the MCP (`mcp/src/shared/functions.ts` lines 99-249) uses every configuration slice (`GET/POST/PUT/DELETE`), `POST /content-type/import` (**no `:bu`**, line 249), `/health`.
Legacy `GET/POST/PUT/DELETE /content-type[/:key]` CRUD (content-type.route.ts lines 14-153 except `/import`) is legacy (spec C) and not ported; `puck-api` never calls it.

## 2. Route table (73 routes; "src" = source file:line of the registration; handler in the controller named)

Access column = decision of spec E (design.md section 4). `P` public, `A` authenticated (gate).

### 2.1 puck-pages (`routes/puck-page.route.ts`, controller `controllers/puck-page.controller.ts`, 421 lines) - 13 routes
| # | Method path | src | Controller fn | Success | Errors (source) | Access |
|--:|---|---|---|---|---|:-:|
| 1 | GET `/:bu/puck-pages` | :21 | `getPuckPages` | 200 `PuckPageWithStates[]` | - | A (was project-key) |
| 2 | GET `/:bu/puck-pages/:key` | :39 | `getPuckPageWithStates` | 200 page + `states` | 404 custom object missing | A |
| 3 | POST `/:bu/puck-pages` | :61 | `createPuckPage` | 201 CT custom object | 400 `value is required in request body`, `name is required`, `slug is required` | A |
| 4 | PUT `/:bu/puck-pages/:key` | :90 | `updatePuckPage` | 200 object | 400 value missing; 404 | A |
| 5 | DELETE `/:bu/puck-pages/:key` | :120 | `deletePuckPage` | 204 | 404 (leaks as 500, bug B1) | A |
| 6 | GET `/:bu/published/puck-pages/:key` | :139 | `getPublishedPuckPage` | 200 `PuckPageValue` with `resolvedData` | 404 `Published puck page not found` | P |
| 7 | GET `/:bu/preview/puck-pages/:key` | :165 | `getPreviewPuckPage` (draft else published) | 200 | 404 `Puck page not found` | A |
| 8 | POST `/:bu/published/puck-pages/query` | :192 | `queryPuckPage(..., 'published')` | 200 value | 400 `query is required in request body`; 404 | P |
| 9 | POST `/:bu/preview/puck-pages/query` | :219 | `queryPuckPage(..., ['draft','published'])` | 200 | 400; 404 | A |
| 10 | GET `/:bu/puck-pages/:key/states` | :246 | `getPuckPageStates` | 200 `{key,businessUnitKey,states}` (empty `{}` if none) | - | A |
| 11 | PUT `/:bu/puck-pages/:key/states/published?clearDraft=true` | :269 | `publishPuckPage` | 200 state | 404 page | A |
| 12 | DELETE `/:bu/puck-pages/:key/states/draft` | :295 | `revertPuckPageDraft` | 200 state | 404 `No published state found` | A |
| 13 | GET `/:bu/puck-pages/:key/versions` | :322 | `getPuckPageVersions` | 200 `{key,businessUnitKey,versions[]}` (empty list if none) | - | A |

### 2.2 puck-contents (`routes/puck-content.route.ts`, controller `puck-content.controller.ts`, 329 lines) - 13 routes
Same 13 shapes as 2.1 with `puck-contents` (route lines :21, :44, :66, :95, :125, :144, :170, :197, :224, :251, :274, :300, :327). Differences: list accepts `?contentType=`; create requires `name` and `contentType`
(400 `name is required`, `contentType is required`); no datasource resolution on read (published/preview return the stored value); queries use `contentType = "..."`.

### 2.3 puck-templates (`routes/puck-template.route.ts`, controller `puck-template.controller.ts`, 109 lines) - 4 routes
GET `/:bu/puck-templates?kind=page|content` (:22), GET `/:bu/puck-templates/:key` (:49), POST `/:bu/puck-templates` (:67, body `{value:{name, kind, puckData?}}`, 400 `name is required`, `kind must be "page" or "content"`), DELETE `/:bu/puck-templates/:key` (:96, 204).
Templates have **no states and no versions**. Reads A (editor only; were project-key).

### 2.4 configuration (`routes/configuration.route.ts` 642 lines, controller `configuration.controller.ts` 523 lines) - 34 routes
GET `/:bu/configuration` (:30) and GET `/:bu/configurations` (:49) both `getAllConfigurations` (P). For each of the 8 slices `theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links`:
GET (P, 200 value or JSON `null`), POST (A, 201), PUT (A, 200), DELETE (A, 204). (theme lines :12/:68/:89/:110; header :127/:145/:166/:187; facet :204/:218/:238/:258; footer :275/:289/:309/:329; site-metadata :346/:363/:383/:403; category-listing :420/:437/:458/:479; translations :496/:513/:533/:553; b2b-account-menu-links :570/:587/:607/:627.)
Body: `{ value }` (any JSON; translations is `Record<locale, Record<string,string>>`; b2b links is an array). **No validation in the source** (`value` undefined goes to commercetools).
Storage: container `configuration`, key `<bu>-<slice>` (`theme`, `header`, `facet`, `footer`, `site-metadata`, `category-listing`, `translations`, `contentools-base-url`, `b2b-account-menu-links`).
POST and PUT are both an upsert (`POST /custom-objects`); they differ only in status 201 vs 200.
**Default-BU fallback**: for reads where the requested BU has no object and BU != `default`, the value of BU `default` is returned (single GET and aggregate, per slice).
Aggregate response keys: `theme, header, facetConfiguration, footer, siteMetadata, categoryListing, translations, contentoolsBaseUrl, b2bAccountMenuLinks` (null when absent). One `where key in (...)` query (<= 9 keys) per BU, plus one more for `default` when BU != default.
`contentoolsBaseUrl` (key `<bu>-contentools-base-url`, string value) has controller CRUD functions (lines 484-508) but **no route** in the source; it is only read by the aggregate. F keeps it in the aggregate and does not port the unused CRUD functions.

### 2.5 datasource (`routes/datasource.route.ts`, 114 lines; resolver `controllers/datasource-resolution.route.ts`, 34 lines) - 6 routes
GET `/datasource` (:23), GET `/datasource/:key` (:34), POST `/datasource/:key` (:50, create, 400 `Datasource '<k>' already exists`), PUT `/datasource/:key` (:69, upsert merge), DELETE `/datasource/:key` (:82, 204 even if missing),
POST `/datasource/:key/test` (:93, body `{params}`; built-ins `product-by-sku` and `products-by-sku` need no stored definition; others 404 if not stored).
**Storage in the source is Firestore** (`getFirestoreClient().collection('projects').doc(projectKey).collection('datasources')`, doc id = key, doc `{value, createdAt, updatedAt}`; list returns `{key, value}`). Firestore is removed (owner decision) -> definitions move to commercetools custom objects (container `datasource`, key = datasource key, value = the posted `value`). The seed file `samples/datasource.ts` already uses container `datasource` and two built-in definitions (`product-by-sku` param `sku`; `products-by-sku` param `skus` comma-separated). Resolution: only the two built-ins have a resolver (switch in `resolveDatasource`); for other keys the source returns `undefined` (empty 200).
No migration of existing Firestore datasource documents (the labs repo starts fresh; internal data is not carried over).
Datasource use inside pages: `resolvePuckPageDatasources` (puck-page.controller.ts lines 100-167) walks `puckData.content` and every `puckData.zones[*]`, and for each prop value shaped `{type:string, skus:string[]}` calls `resolveDatasource(type, type==='product-by-sku' ? {sku: skus[0]} : {skus: skus.join(',')})`, then writes `{...value, resolvedData}`; failures are swallowed (`resolvedData: null`). Applied on published, preview and query reads (not on list/get-with-states).

### 2.6 products (`routes/product.route.ts` 35, controller `product.controller.ts` 150, `services/products.ts` 51) - 1 route
GET `/products/search?text=&limit=&locale=` (:14): `limit = min(Number(limit)||20, 50)`, `locale` default `en-US`, `text` (or `q`); empty text -> `[]`. Uses the Product Search API `POST /products/search` with `or` of three wildcard clauses (name, description with `language`, `variants.sku`), `caseInsensitive`, wildcards `*`/`?` typed by the user are stripped. Returns slim `[{id,name,sku,image,slug}]`. Needs scope `view_products` and the Product Search feature enabled on the project.
Built-in datasources use `exact` on `variants.sku` (`productProjectionParameters: {}`).

### 2.7 content-type import (`routes/content-type.route.ts:66`, controller `content-type-import.controller.ts` 88 lines) - 1 route (+ alias)
POST `/content-type/import` (server) vs `POST /:bu/content-type/import` (client `puck-api/src/api/configuration.api.ts:81`). **Source bug**: the editor's import call 404s; the MCP calls the unscoped path. Decision: serve both (same handler; content types are global, not BU-scoped).
Handler: for each of the **27** sample content types in `samples/CMS/index.ts` (renamed `samples/content-types/` by D): derive key = kebab-case of `metadata.type` (`WebsiteLogo` -> `website-logo`), transpile `code.decodedText` with `SecureTranspiler` (`@babel/standalone`, preset `react`), base64 both source and transpiled code, `createCustomObject('content-type', key, {key, metadata, code:{componentName, transpiledCode, text}})` = **upsert** (re-import overwrites edits). Response 200 `{imported:string[], failed:[{key,error}]}`.
`SecureTranspiler` (`utils/secure-transpiler.ts`, 67 lines): regex deny-list with `g` flag used with `.test()` (**stateful `lastIndex` bug B6**: a second `.test` on the same regex object resumes at the previous index, so a dangerous pattern can be missed on later components), 50 000-char limit.
The samples folder name in the source is `samples/CMS/` (27 files): renamed by D; text inside samples contains no "cms" (grep clean).

## 3. Custom-object containers and keys (single source of truth; fixed names from D's `CONTAINER_NAMES`)

| Container (constant) | Key | Value |
|---|---|---|
| `puck-page` (`puckPage`) | `puck-page-<uuid>` | `PuckPageValue {key,businessUnitKey,name,slug,puckData,meta?,createdAt,updatedAt}` (the *latest saved* value: updated on every save, replaced by the published value on revert) |
| `puck-page-state` | `<bu>_<pageKey>` | `{key,businessUnitKey,states:{draft?:PuckPageValue,published?:PuckPageValue}}` |
| `puck-page-version` | `<bu>_<pageKey>` | `{key,businessUnitKey,versions:[{...PuckPageValue,id:uuid,timestamp}]}` newest first, max `MAX_VERSIONS` |
| `puck-content` / `-state` / `-version` | `puck-content-<uuid>` / `<bu>_<key>` | same shape with `PuckContentValue {key,businessUnitKey,name,contentType,data,meta?,createdAt,updatedAt}` |
| `puck-template` | `puck-template-<uuid>` | `{key,businessUnitKey,name,kind:'page'|'content',puckData,createdAt,updatedAt}` |
| `configuration` | `<bu>-<slice>` | arbitrary JSON (string for `contentools-base-url`) |
| `content-type` | kebab-case of `metadata.type` | `{key,metadata,code:{componentName,transpiledCode(b64),text(b64)}}` |
| `datasource` | datasource key | the posted `value` (`{name,key,params:[{key,type,required}]}`) |

## 4. Semantics worth preserving exactly (read in `content-state-controller.ts` 310 lines, `content-version-controller.ts` 152 lines)

* **create**: object + `draft` state (merged with stored value) + version entry #1.
* **update**: merge `{...existing.value, ...input, businessUnitKey, key, updatedAt}`, save object, `draft` := merged value, push version entry. (Source lets the client overwrite `createdAt`; F whitelists input fields.)
* **publish** (`PUT .../states/published[?clearDraft=true]`): `published` := current stored object value; with `clearDraft` the `draft` key is removed.
* **revert draft** (`DELETE .../states/draft`): 404 `No published state found` when never published; else object := published value (+ `businessUnitKey`), draft removed. Returns the new state.
* **delete**: object, then state, then versions.
* **MAX_VERSIONS pruning** (`content-version-controller.ts` lines 66-105): new entry `{...value, timestamp: ISO, id: uuid}` is `unshift`ed; if `length > MAX_VERSIONS` the list is `slice(0, MAX_VERSIONS)`. Default 5 (`constants.ts:8`). A missing version object reads as `{key,businessUnitKey,versions:[]}`.
* **published/preview read**: query the *state* container with `value(key = "<k>" AND businessUnitKey = "<bu>")`, return `states.published` (or `states.draft` then `published` for preview).
* **query** (`queryPuck*`): `value(<client query> AND businessUnitKey = "<bu>")` against the item container, first hit's key -> state lookup. Client query examples in doc comments: `slug = "/home"`, `contentType = "hero"`.
* **list**: object list `value(businessUnitKey = "<bu>"[ AND contentType = "<t>"])`, then ONE state query with `(key = "k1" AND businessUnitKey = "bu") OR (...)` per object, joined in memory by key.

## 5. Bugs and hazards found (each addressed in design.md / tasks.md)

| ID | Where | Problem | Fix in F |
|---|---|---|---|
| B1 | `custom-object.controller.ts` 121-139 | delete not awaited, 404 -> 500 | D's `delete()` returns boolean; routes map `false` -> 404 |
| B2 | list queries | CT default `limit` 20 truncates lists | D's `list()` paginates |
| B3 | `puck-page.controller.ts:354`, `puck-content.controller.ts:265` | client `query` string spliced into the predicate; also BU/key interpolated raw everywhere | restricted query grammar + `predicate.ts` escaping + path-param validation |
| B4 | `getPuckPages`/`getPuckContents` | state join builds an OR predicate with one clause per object: URL-length failure beyond a few dozen items | fetch states per BU (`value(businessUnitKey = "<bu>")`) once, join in memory |
| B5 | state/version read-modify-write | lost updates under concurrent saves | D's `update()` with version + retry |
| B6 | `secure-transpiler.ts` | `g`-flag regexes with `.test()` | drop `g` |
| B7 | `GET /:bu/puck-pages/:key`, templates get/delete | does not verify the object belongs to `:bu` | compare `value.businessUnitKey`, else 404 |
| B8 | update | client can overwrite `createdAt`/`key` | whitelist `name, slug, puckData, meta` (pages), `name, contentType, data, meta` (contents) |
| B9 | configuration | `value` unchecked | 400 when `value` is undefined/null |
| B10 | content-type import | wrong path for editor | serve both paths |
| B11 | datasource resolution | `products-by-sku` fires N sequential searches, unbounded | cap 25 SKUs |
| B12 | version entries hold the full `puckData` x `MAX_VERSIONS` inside one custom object | object size grows (5 full pages); no hard limit known | documented risk; `MAX_VERSIONS` max 100 in D; open question Q-F3 |
| B13 | public published reads | each call resolves datasources against commercetools with service credentials | documented (spec E R3) |

## 6. Test approach (spec B + 03-testing-strategy)

jest + supertest + msw using D's stateful `tests/support/fake-ct.ts` (custom objects, `where` evaluator) and E's `tests/support/mc.ts`; auth via the static `SERVICE_API_TOKEN` (header `Authorization: Bearer test-service-token-...`) except
one MC-token happy path. Existing e2e expectations from `service/e2e/puck-page.e2e.ts` (source) are mirrored: POST without `value` -> 400; GET unknown key -> 404 (source accepted 404 or 500); published of unpublished page -> 404; query without `query` -> 400.
A route-inventory test asserts that the Express router contains exactly the 73 routes of section 2 with the public/protected split from E.

## 7. Results recorded during implementation

* Left for spec G in `service/src/_pending/`: `routes/file.route.ts`, `controllers/file-controller.ts`, `controllers/file-controllers/{aws,cloudinary,gcp}-file-controller.ts`.
* Q-F3 (object size) on the sandbox: a page with a 900 KB `puckData` was created and saved six times (version object holds five full copies, about 4.5 MB); every call answered 2xx. No size limit was hit at that scale.
* Live check: `limit`, `offset` and `sort=id asc` are accepted by the real API (25 templates listed); Product Search answered 200 on the sandbox.
