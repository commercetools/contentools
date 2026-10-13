## Context

D provides the single-tenant core (`customObjects()`, config, errors, logging), E the access gate and `requireAuth`. F ports the content API from `service/src/_pending/` onto them. Facts, line numbers and the bug list are in `explore.md`; the access policy is the table in spec E's `design.md` section 4 (authoritative).
Media (upload/library) is spec G. Legacy routes are gone (spec C).

## 1. Goals / Non-Goals

Goals: same HTTP contract as the source for the kept routes (shapes and status codes), hardened and tested; datasources on custom objects; no Firestore; compile-green and test-green tree with `_pending/` containing only G's media files at the end.
Non-goals: new features, caching, rate limiting of published reads (spec E R3), changing the Puck data model, media.

## 2. Route table (73 routes; prefix `/service`; `bu` = `:businessUnitKey`)

Access: P public (before the gate), A protected, P* public only when `PUBLIC_DATASOURCE_RESOLVE=true` and the key is built-in (spec E D-E10). "Src" = source file:line (see explore section 2).

| # | Method + path | Access | Success | Notes |
|--:|---|:-:|---|---|
| 1 | GET `/:bu/puck-pages` | A | 200 list+states | all items, one state query |
| 2 | GET `/:bu/puck-pages/:key` | A | 200 page+states | 404 other BU |
| 3 | POST `/:bu/puck-pages` | A | 201 object | body `{value:{name,slug,puckData?,meta?}}` |
| 4 | PUT `/:bu/puck-pages/:key` | A | 200 object | whitelist `name,slug,puckData,meta` |
| 5 | DELETE `/:bu/puck-pages/:key` | A | 204 | 404 if missing |
| 6 | GET `/:bu/published/puck-pages/:key` | P | 200 value+resolvedData | 404 if not published |
| 7 | GET `/:bu/preview/puck-pages/:key` | A | 200 | draft else published |
| 8 | POST `/:bu/published/puck-pages/query` | P | 200 value | `{query}`; grammar section 5 |
| 9 | POST `/:bu/preview/puck-pages/query` | A | 200 value | |
| 10 | GET `/:bu/puck-pages/:key/states` | A | 200 state | `{states:{}}` if none |
| 11 | PUT `/:bu/puck-pages/:key/states/published` | A | 200 state | `?clearDraft=true` |
| 12 | DELETE `/:bu/puck-pages/:key/states/draft` | A | 200 state | 404 no published |
| 13 | GET `/:bu/puck-pages/:key/versions` | A | 200 versions | |
| 14-26 | same 13 for `/:bu/puck-contents` (list `?contentType=`; no datasource resolution) | 2 P (#19, #21), rest A | | create needs `name`,`contentType` |
| 27 | GET `/:bu/puck-templates` (`?kind=`) | A | 200 | |
| 28 | GET `/:bu/puck-templates/:key` | A | 200 | 404 other BU |
| 29 | POST `/:bu/puck-templates` | A | 201 | |
| 30 | DELETE `/:bu/puck-templates/:key` | A | 204 | |
| 31 | GET `/:bu/configuration` | P | 200 aggregate | |
| 32 | GET `/:bu/configurations` | P | 200 aggregate | alias |
| 33-40 | GET `/:bu/configuration/<slice>` x8 | P | 200 value or `null` | default-BU fallback |
| 41-48 | POST `/:bu/configuration/<slice>` x8 | A | 201 value | upsert |
| 49-56 | PUT `/:bu/configuration/<slice>` x8 | A | 200 value | upsert |
| 57-64 | DELETE `/:bu/configuration/<slice>` x8 | A | 204 | idempotent |
| 65 | GET `/datasource` | A | 200 `[{key,value}]` | built-ins + stored |
| 66 | GET `/datasource/:key` | A | 200 `{key,value}` | |
| 67 | POST `/datasource/:key` | A | 201 | 409 duplicate/built-in |
| 68 | PUT `/datasource/:key` | A | 200 | upsert; 409 built-in |
| 69 | DELETE `/datasource/:key` | A | 204 | 409 built-in |
| 70 | POST `/datasource/:key/test` | A / P* | 200 | 400 >25 SKUs; 404/501 |
| 71 | GET `/products/search` | A | 200 `[...]` | |
| 72 | POST `/:bu/content-type/import` | A | 200 | |
| 73 | POST `/content-type/import` | A | 200 | same handler |

(Plus `GET /health`, `GET /status` from D = 75 registered routes in the app; the inventory test counts the 73 F routes and checks D's two separately.) Slices: `theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links`.
Public routes: #6, #8, #19, #21, #31, #32, #33-40 = 14, plus the conditional #70.

## 3. Custom-object containers, keys, versions (single source of truth: explore section 3)

State write rules, version rule and `MAX_VERSIONS` pruning are specified in `content-states-versions`. Implementation summary:
`items.update(key, mutate)` (D) for the item, `states.update(stateKey, mutate)` and `versions.update(versionKey, mutate)` for the side objects; pruning is `versions.slice(0, maxVersions)` after `unshift` inside the `mutate` callback so it is atomic with the version check.
`maxVersions` comes from D's `getConfiguration().maxVersions` (1..100, default 5).

## 4. Decisions

* **F1 One generic item store, two thin controllers.** The source already had factory-style state/version controllers (`withDependencies`) but duplicated 13 routes and ~300 lines per type. New: `services/item-store.ts` (`createItemStore(options)`) implements list/get/create/update/remove/published/preview/query/states/publish/revert/versions for any item type; `routes/item-routes.ts` (`buildItemRouters(def)`) registers the 13 routes into a public and a protected router. Pages and contents are ~50-line definitions. Rejected: copy-port both (doubles tests and bug surface); class inheritance (hides the access split).
* **F2 Direct key reads for states.** The state object key is `<bu>_<itemKey>`, so published/preview/states reads use `states.get(key)` instead of the source's `where value(key = ... AND businessUnitKey = ...)` list query: one cheap GET, no predicate.
* **F3 One state query for lists.** `states.list(value(businessUnitKey = "<bu>"))` once, joined in memory (fixes B4).
* **F4 Restricted query grammar.** The `query` body is parsed (section 5) and re-serialised with the escaping helpers. Rejected: forwarding the string (B3); a general predicate parser (needless power on a public route).
* **F5 Whitelist updates.** `applyUpdate` copies only the allowed fields (B8).
* **F6 Datasources on custom objects.** Container `datasource`, key = datasource key (validated), value = posted `value`. Built-ins are constants (`BUILT_IN_DATASOURCES` in `services/datasource-resolution.ts`), merged into list/get, never stored, protected from write/delete (409). `created/updated` timestamps come from commercetools (`createdAt`, `lastModifiedAt`) instead of Firestore fields; the HTTP shape `{key, value}` is unchanged. Create-only semantics use `customObjects.create` (get then put). Error shape for datasource 404/409 is the uniform contract (the source returned `{error: ...}`).
  Alternatives rejected: keeping a JSON file (Connect has no persistent disk); a new database (owner decision: content stays in commercetools); storing under `configuration` (different lifecycle and key scheme). Existing-data migration: none needed (fresh labs repository; documented in `manual.md` only as "re-create custom datasources by POST if you had some in the old service").
  Resolver coverage: only built-ins resolve (as in the source). A stored custom definition is metadata; `/test` answers `501` instead of the source's empty `200`.
* **F7 Configuration by slice table.** One `SLICES` constant (`path`, `keySuffix`, `aggregateKey`, `shape: 'object'|'array'`) drives the 8x4 routes, the aggregate and the fallback. The dead `contentools-base-url` CRUD is not ported; the aggregate still reads it.
* **F8 Import path.** Both paths, one handler (explore B10).
* **F9 Transpiler.** `@babel/standalone` kept (the stored `transpiledCode` is consumed by existing storefront code); regexes without `g` (B6). Alternative (pre-transpile at build time and ship JSON) rejected for now: changes the data flow; noted as optional follow-up in questions Q-F2.
* **F10 SKU cap 25** for `products-by-sku` (B11), 400 on `/test`, silently truncated during page reads.
* **F11 Product search errors.** A 400 from the Product Search API means the feature is not activated for the project: answer 502 with a precise message.
* **F12 Access split by routers.** `routes/service.route.ts` mounts: health, `publishedPagesRouter`, `publishedContentsRouter`, `configurationReadRouter`, `datasourcePublicResolveRouter`, `requireAuth`, then the protected routers.

## 5. Query grammar (public and preview query routes)

```
query   := clause ( WS "AND" WS clause )*          (AND case-insensitive)
clause  := field WS? "=" WS? '"' chars '"'         chars: any char except unescaped " ; \" and \\ allowed
field   := one of the item type's queryFields      pages: slug | name | key       contents: contentType | name | key
```
Anything else (OR, parentheses, other operators, other fields, empty) -> `400 Invalid query`. Parsed values are unescaped then passed to `eq()`; `businessUnitKey` is always appended by the server. Max length 512 characters.

## 6. Datasource resolution on read (unchanged behaviour)

Walk `puckData.content` and each array in `puckData.zones`; for each prop whose value is an object with string `type` and array `skus`, drop empty SKUs, truncate to 25, resolve (`product-by-sku` -> first SKU; any other type -> comma-joined `skus` through `resolveDatasource`), set `{...value, resolvedData}`; on any error `resolvedData: null`; unknown types resolve to `undefined` which is stored as `null`. Props that are not datasource-shaped are untouched.

## 7. File map: source -> target (each is one task in tasks.md)

| Source (in `_pending/` after D) | Target (repo `service/src/...`) | Change |
|---|---|---|
| `controllers/content-state-controller.ts`, `content-version-controller.ts`, parts of `puck-page.controller.ts` / `puck-content.controller.ts` | `services/item-store.ts` | generic store on `customObjects()`; no `req`; `update()` retry; direct state reads |
| `controllers/puck-page.controller.ts` (types lines 19-77; resolver 100-167) | `types/content.ts`, `services/datasource-resolution.ts`, `controllers/puck-pages.controller.ts` | split; `crypto.randomUUID()` |
| `controllers/puck-content.controller.ts` | `controllers/puck-contents.controller.ts` | thin definition |
| `routes/puck-page.route.ts` + `puck-content.route.ts` | `routes/item-routes.ts`, `routes/puck-pages.route.ts`, `routes/puck-contents.route.ts`, `routes/published-*.route.ts` | factory; access split; zod bodies |
| `controllers/puck-template.controller.ts`, `routes/puck-template.route.ts` | `controllers/puck-templates.controller.ts`, `routes/puck-templates.route.ts` | BU ownership checks; zod |
| `controllers/configuration.controller.ts`, `routes/configuration.route.ts` | `controllers/configuration.controller.ts`, `routes/configuration.route.ts`, `routes/configuration-read.route.ts`, `config/slices.ts` | slice table |
| `routes/datasource.route.ts` (Firestore) + `controllers/datasource-resolution.route.ts` | `controllers/datasource.controller.ts`, `services/datasource-resolution.ts`, `routes/datasource.route.ts`, `routes/datasource-public-resolve.route.ts` | custom objects instead of Firestore |
| `controllers/product.controller.ts`, `services/products.ts`, `routes/product.route.ts` | `controllers/products.controller.ts`, `services/products.ts`, `routes/products.route.ts` | no `req`; 502 mapping |
| `controllers/content-type-import.controller.ts`, `utils/secure-transpiler.ts`, `samples/content-types/*` (27 files), `routes/content-type.route.ts` (import only) | `controllers/content-type-import.controller.ts`, `utils/secure-transpiler.ts`, `samples/content-types/*`, `routes/content-type.route.ts` | both paths; regex fix |
| (new) | `schemas/*.ts`, `routes/params.ts` | zod, param validation |

Not ported (and why): `controllers/file-controller*`, `routes/file.route.ts` (spec G); the legacy `GET/PUT/DELETE /content-type/:key` (legacy, spec C).

## 8. Risks / Trade-offs

* Version entries embed full page data x `MAX_VERSIONS`; a very large page times five may approach a custom-object size limit (not documented in the sources consulted; open question Q-F3 to verify on the sandbox: create a ~900 KB page and save 6 times).
* `list()` over a large container is O(n/500) requests; list endpoints could be slow for thousands of pages (the editor lists them all, same as the source).
* Product Search must be activated in the project; otherwise datasources/picker degrade (`resolvedData: null`, 502 for the picker).
* Public published reads cost one or two commercetools calls each plus datasource searches; mitigate with a CDN (spec E R3).
* The fake commercetools evaluator supports a deliberately small predicate subset; real-API differences are covered by the env-gated sandbox smoke (group 12).

## 9. Migration notes

No data migration: container names, keys and value shapes are unchanged (explore section 3), so data created by the old service remains readable. Datasource definitions that lived in Firestore are not migrated. Clients: auth changes per spec E; the editor's import button starts working (path fix); `x-project-key` no longer sent.
