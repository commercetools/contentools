# API reference

The content API of the `service` application. Source of truth: the routers in `service/src/routes/`
(`service.route.ts` mounts them). This table is checked by tests: every row must be a mounted route
(`service/tests/docs/api-reference.test.ts`) and must match the Postman collection
(`tools/check-docs-postman.mjs`).

- **Base path:** `/service`. A Connect deployment serves it at `https://<service-url>`, where `<service-url>` already ends in `/service`.
- **Business unit scoping:** `:bu` is `:businessUnitKey`, a content namespace inside the one commercetools project (not a tenant). Use `default` if you do not use several.
- **Auth legend:** **Public** = no credentials needed (an `Authorization` header is ignored). **Token** = `Authorization: Bearer <token>`, where the token is a Merchant Center session token forwarded by the Merchant Center proxy, or the static `SERVICE_API_TOKEN`. Anything that is not listed answers 401 without a token.
- **Rate and size:** public datasource resolve is rate limited (`PUBLIC_RESOLVE_MAX_PER_MINUTE`, default 120 per minute); uploads are limited by `MEDIA_MAX_UPLOAD_BYTES`.

**Error body** (every error, never a stack): `{ "message": string, "statusCode": number, "correlationId": string, "code"?: string, "errors"?: [...] }`.
401 `Authentication required` (no header) or `Invalid or expired credentials`; 403 `Forbidden` (token valid but for another project, or the user lacks `MC_REQUIRED_PERMISSION`); 503 `Authentication service unavailable` with `Retry-After` when the Merchant Center key set cannot be reached; 404 for an unknown item; 409 for a concurrent change or an existing datasource; 501 `MEDIA_NOT_CONFIGURED` for the media endpoints while `MEDIA_STORAGE_PROVIDER` is `none`. Send your own `X-Correlation-ID` (8 to 128 characters of `A-Z a-z 0-9 . _ -`) to trace a call; it is returned in the response header and in error bodies.

`<slice>` below is one of `theme`, `header`, `facet`, `footer`, `site-metadata`, `category-listing`, `translations`, `b2b-account-menu-links`; each has its own four rows.

| Group | Method | Path | Access | Success | Notes |
| --- | --- | --- | --- | --- | --- |
| Health | GET | `/health` | Public | 200 | body `{ status: "UP", service, timestamp }` |
| Health | GET | `/status` | Public | 200 | alias of `/health` |
| Pages | GET | `/:bu/puck-pages` | Token | 200 | list of pages |
| Pages | POST | `/:bu/puck-pages` | Token | 201 | body `{ value: { name, slug, puckData?, meta? } }`; the key is generated |
| Pages | GET | `/:bu/puck-pages/:key` | Token | 200 | page with its states |
| Pages | PUT | `/:bu/puck-pages/:key` | Token | 200 | partial update; saves a draft and a version |
| Pages | DELETE | `/:bu/puck-pages/:key` | Token | 204 | removes the item, its states and its versions |
| Pages | GET | `/:bu/published/puck-pages/:key` | Public | 200 | published value with resolved datasources; 404 if not published |
| Pages | POST | `/:bu/published/puck-pages/query` | Public | 200 | body `{ query: 'slug = "/home"' }` |
| Pages | GET | `/:bu/preview/puck-pages/:key` | Token | 200 | draft if present, else published |
| Pages | POST | `/:bu/preview/puck-pages/query` | Token | 200 | body `{ query: 'slug = "/home"' }` |
| Pages | GET | `/:bu/puck-pages/:key/states` | Token | 200 | `{ key, businessUnitKey, states: { draft?, published? } }` |
| Pages | PUT | `/:bu/puck-pages/:key/states/published` | Token | 200 | publish the current item; query `clearDraft=true` removes the draft |
| Pages | DELETE | `/:bu/puck-pages/:key/states/draft` | Token | 200 | revert to the published version; 404 if never published |
| Pages | GET | `/:bu/puck-pages/:key/versions` | Token | 200 | at most `MAX_VERSIONS`, newest first |
| Contents | GET | `/:bu/puck-contents` | Token | 200 | list; query `contentType=` filters |
| Contents | POST | `/:bu/puck-contents` | Token | 201 | body `{ value: { name, contentType, data?, meta? } }`; the key is generated |
| Contents | GET | `/:bu/puck-contents/:key` | Token | 200 | content item with its states |
| Contents | PUT | `/:bu/puck-contents/:key` | Token | 200 | partial update; saves a draft and a version |
| Contents | DELETE | `/:bu/puck-contents/:key` | Token | 204 | removes the item, its states and its versions |
| Contents | GET | `/:bu/published/puck-contents/:key` | Public | 200 | published value with resolved datasources; 404 if not published |
| Contents | POST | `/:bu/published/puck-contents/query` | Public | 200 | body `{ query: 'contentType = "hero"' }` |
| Contents | GET | `/:bu/preview/puck-contents/:key` | Token | 200 | draft if present, else published |
| Contents | POST | `/:bu/preview/puck-contents/query` | Token | 200 | body `{ query: 'contentType = "hero"' }` |
| Contents | GET | `/:bu/puck-contents/:key/states` | Token | 200 | `{ key, businessUnitKey, states: { draft?, published? } }` |
| Contents | PUT | `/:bu/puck-contents/:key/states/published` | Token | 200 | publish the current item; query `clearDraft=true` removes the draft |
| Contents | DELETE | `/:bu/puck-contents/:key/states/draft` | Token | 200 | revert to the published version; 404 if never published |
| Contents | GET | `/:bu/puck-contents/:key/versions` | Token | 200 | at most `MAX_VERSIONS`, newest first |
| Templates | GET | `/:bu/puck-templates` | Token | 200 | query `kind=page` or `kind=content` filters |
| Templates | GET | `/:bu/puck-templates/:key` | Token | 200 |  |
| Templates | POST | `/:bu/puck-templates` | Token | 201 | body `{ value: { name, kind, puckData? } }` |
| Templates | DELETE | `/:bu/puck-templates/:key` | Token | 204 | there is no PUT |
| Configuration | GET | `/:bu/configuration` | Public | 200 | all documents of the business unit in one object |
| Configuration | GET | `/:bu/configurations` | Public | 200 | alias of `/:bu/configuration` |
| Configuration | GET | `/:bu/configuration/theme` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/theme` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/theme` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/theme` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/header` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/header` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/header` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/header` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/facet` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/facet` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/facet` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/facet` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/footer` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/footer` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/footer` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/footer` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/site-metadata` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/site-metadata` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/site-metadata` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/site-metadata` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/category-listing` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/category-listing` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/category-listing` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/category-listing` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/translations` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/translations` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/translations` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/translations` | Token | 204 | idempotent |
| Configuration | GET | `/:bu/configuration/b2b-account-menu-links` | Public | 200 | value or `null`; falls back to the `default` business unit |
| Configuration | POST | `/:bu/configuration/b2b-account-menu-links` | Token | 201 | body `{ value }`; upsert |
| Configuration | PUT | `/:bu/configuration/b2b-account-menu-links` | Token | 200 | body `{ value }`; upsert |
| Configuration | DELETE | `/:bu/configuration/b2b-account-menu-links` | Token | 204 | idempotent |
| Datasources | GET | `/datasource` | Token | 200 | built-in and stored definitions |
| Datasources | GET | `/datasource/:key` | Token | 200 |  |
| Datasources | POST | `/datasource/:key` | Token | 201 | body `{ value: { name, params? } }`; 409 if the key exists or is built in |
| Datasources | PUT | `/datasource/:key` | Token | 200 | 409 for built-in keys |
| Datasources | DELETE | `/datasource/:key` | Token | 204 | 409 for built-in keys |
| Datasources | POST | `/datasource/:key/test` | Token | 200 | body `{ params }`; public for the built-in keys `product-by-sku` and `products-by-sku` only when `PUBLIC_DATASOURCE_RESOLVE=true` (rate limited) |
| Products | GET | `/products/search` | Token | 200 | query `text`, `limit` (max 50, default 20), `locale` (default `en-US`); editor product picker |
| Content types | POST | `/:bu/content-type/import` | Token | 200 | imports the bundled default content types; same handler as the next row |
| Content types | POST | `/content-type/import` | Token | 200 | same handler |
| Media | POST | `/:bu/upload-file` | Token | 200 | multipart, part `file` plus optional `title`, `description`; answers `{ url, key, name, size, contentType }`; 501 without a media store |
| Media | GET | `/:bu/media-library` | Token | 200 | query `limit`, `cursor`, `extensions`; answers `{ files, pagination: { limit, nextCursor, hasMore } }`; 501 without a media store |

## Payload notes

**Pages.** A page value is `{ key, businessUnitKey, name, slug, puckData, meta, createdAt, updatedAt }`.
`GET` and `POST` answer the custom object (`{ id, version, container, key, value, ... }`), so the page is under `value`.
`name` and `slug` are required on create. Keys are generated (`puck-page-<uuid>`). Create body example:

```json
{ "value": { "name": "Home", "slug": "/home", "puckData": { "content": [], "root": {} } } }
```

`puckData` needs both `content` and `root` when it is sent. A query body names exactly one or more
`field = "value"` clauses joined with `AND`; the fields are `slug`, `name`, `key` for pages and
`contentType`, `name`, `key` for contents. Anything else answers 400 `Invalid query`.

**Contents.** A content item value is `{ key, businessUnitKey, name, contentType, data, meta, createdAt, updatedAt }`;
`name` and `contentType` are required on create. Keys are `puck-content-<uuid>`.

**Draft, publish, revert.** Every save (`POST`, `PUT`) writes the draft and appends a version.
`PUT .../states/published` promotes the current item to the published state; with `?clearDraft=true` the
draft is removed afterwards. `DELETE .../states/draft` restores the published version as the current item
and removes the draft; it answers 404 if the item was never published. Versions are kept per item, newest
first, limited by `MAX_VERSIONS` (default 5); older ones are pruned on save.

**Templates.** `kind` is `page` or `content`; `puckData` is optional. Keys are `puck-template-<uuid>`.

**Configuration.** The aggregate answers one object with the slices under `theme`, `header`, `facetConfiguration`,
`footer`, `siteMetadata`, `categoryListing`, `translations`, `b2bAccountMenuLinks` (and `contentoolsBaseUrl`).
`b2b-account-menu-links` stores an array, the others an object. A slice that does not exist for the business unit
falls back to the `default` business unit.

**Datasources.** The built-in datasources `product-by-sku` and `products-by-sku` are read-only; at most 25 SKUs are
resolved per call. Stored definitions need a `name`. Datasources are not business-unit scoped.

**Media.** Allowed types come from `MEDIA_ALLOWED_MIME_TYPES` and are checked against the file's magic bytes,
not only its declared type. A rejected type answers 415 `MEDIA_TYPE_NOT_ALLOWED`. Objects are stored under
`<MEDIA_PATH_PREFIX>/<businessUnitKey>/...`.

## Postman

[`service/postman/`](../service/postman) holds a collection and an environment with the same routes. Set the
environment variable `service_api_token` to your `SERVICE_API_TOKEN` (a Merchant Center session token cannot
be minted in Postman); public requests are sent without credentials.
