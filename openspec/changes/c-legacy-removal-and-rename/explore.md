# Explore notes for C (legacy removal and rename)

All numbers were measured on 2026-10-08 against the files git tracks in `/Users/behnam/code/cms` (SOURCE, read-only), restricted to what A copies (service, contentools->admin-app, mcp, puck minus the A excludes = 479 files). `cms/` itself is never copied (A), so "delete `cms/`" is satisfied by A; C verifies it stays absent.
Method: `git ls-files | grep -v '^cms/'` then `grep -Ic/-In`. Counts are "files / hits".

## 1. Occurrence classes of the forbidden words

| Term (case-insens.) | Where (files / hits) | Classes and replacement |
| --- | --- | --- |
| `cms` | service 7/13, admin-app 7/19, mcp 2/3, puck/packages 16/47, playground 1/1, puck/README 1/1 | (a) **directory names**: `puck/packages/puck-components/src/components/cms/` (27 files), `puck/packages/puck-editor/src/components/cms/` (28 files), `service/src/samples/CMS/` (28 files) -> `blocks/`, `blocks/`, `content-types/`; (b) imports of those dirs (`./cms/shared`, `./cms`, `./components/cms`, `../samples/CMS`) in 7 files; (c) package `description` fields (`"... Puck CMS integration"` in puck-api, puck-editor, puck-page-manager, puck-theme-manager, puck-types); (d) comments "CMS components" (puck-editor `components/index.ts:29`, `config/defaultPuckConfig.ts:70`, `src/index.ts:45`; puck-components `components/index.ts:14`); (e) env var `CMS_API_URL` (admin-app: `.env.example:6`, `custom-application-config.mjs:20`, `contexts/auth.tsx:42-43`, `hooks/use-contentools-api/use-contentools-api.ts:21-22`, `routes.tsx:23,46,55,64`); (f) UI badge `CMS` (`admin-layout/index.tsx:68`); (g) type `CmsConfig`/`cms?:` in `types/tenant-config.ts` (file is deleted by K -> pending list); (h) constants `CMS_DEPLOYED_URL_KEY` (service/src/constants.ts:69, unused); (i) docs prose (mcp/README.md:3,59; mcp/package.json:4; puck/README.md:1; service/e2e/README.md:1,3; service/README.md:17,18 postman links); (j) playground `<title>Puck CMS Test App</title>`; (k) files `service/postman/cms-api-*` (not copied by A). Also in the dropped `.github/workflows/e2e.yml` (`cms-service` image/container name, 4 hits) - dropped, not replaced. |
| `demo` word | only in 3 non-scope places | `contentools/package.json:19` script `versions:demo` (-> `versions:labs`), `contentools/src/i18n/data/core.json:4` ("... for demo purposes ...", an unused starter string -> delete the `Welcome.*` keys), dropped workflow `environment: name: demo`. (`nodemon` matches `demo` only without word boundaries.) |
| `commercetools-demo` (npm scope `@commercetools-demo/`) | admin-app package.json + src (2 files/11), mcp package.json+README (2/9), puck/package.json (1/1), puck/packages (109 files/176: 10 package.json, 9 `tsup.config.ts`, ~90 `src` files), playground (3/26: package.json, vite.config.ts, src/App.tsx), puck/README (1/20) | Mechanical: `@commercetools-demo/` -> `@commercetools-labs/` everywhere (A's `ossify` already re-scoped the `name` field of each `package.json`, not the dependency entries or imports). The only non-scope hit is the `versions:demo` script. |
| `ct-poc` | `admin-app/custom-application-config.mjs:46` (CSP `frame-src ['*.ct-poc.net']`), `service/src/constants.ts:6` (default CORS list contains `ct-poc.net`) | Delete the entry (frame-src key removed; CORS default list reduced to localhost origins, spec E rewrites CORS). |
| `poc` word | same two lines as above | same fix. |
| `multitenant` | admin-app `src/constants.ts:4` (`entryPointUriPath = 'multitenant-contentools-wrapper'`), service `auth.controller.ts:130,131,184,185,224`, `middleware/jwt.middleware.ts:42,44` (JWT issuer/audience `multitenant-contentools`), dropped workflow (`gcloud run deploy multitenant-contentools`), README (root, not copied) | admin-app entry point -> `contentools`; the service JWT files are deleted by D/E (pending list). |
| `contenttools` (typo) | mcp: 11 files / 45 hits - package name `@commercetools-demo/contenttools-mcp`, classes `ContentToolsAPI`, `ContentToolsAgent`, `ContentToolsTool`, function `createContentToolsMcpServer`, `SERVER_NAME = 'contenttools-mcp'`, README | `Contentools*` / `contentools-mcp`; package `@commercetools-labs/contentools-mcp`. |
| `run.app`, `*.us-central1.run.app` etc. | admin-app `custom-application-config.mjs:29-31,40-42` (CSP), `mcp/README.md:24` (`https://your-service.run.app/service`) | Remove the CSP hosts (spec L rebuilds the CSP from the Connect URL); README example -> `https://<your-connect-service-url>/service`. |
| `sellertools` | `service/src/constants.ts:68` (`SHARED_CONTAINER = 'shared-sellertools-container'`, unused) | delete constant. |
| `frontend.site` | `service/src/constants.ts:6` (CORS default), `admin-app/src/types/tenant-config.ts` (comment) | delete from CORS default; tenant-config pending. |
| `firestore` (owner: gone entirely) | service 11 files/44: `package.json` (`@google-cloud/firestore`), `.env.example` (`GCP_FIRESTORE_DATABASE_ID`, `GCP_FIRESTORE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `GCP_FIRESTORE_SERVICE_ACCOUNT_PRIVATE_KEY`), `utils/firestore.utils.ts`, `middleware/project.middleware.ts`, `middleware/project-key.middleware.ts`, `controllers/auth.controller.ts`, `routes/datasource.route.ts` (**datasources are stored in Firestore** under `projects/<pk>/datasources`; D must move them to a custom-object container), `controllers/datasource-resolution.route.ts`, `types/service.types.ts`, `e2e/README.md`; dropped workflows (9 hits). | Owned by D (module + dependency + env removal). C adds the guard term and lists the files as pending-D. |
| `x-project-key` | service 19 files/68 (app.ts CORS `allowedHeaders`, middleware, e2e), puck/packages 4 files/8 (puck-api `http-client.ts`, `configuration.api.ts`, `media-library.api.ts`; image-picker `media-library.api.ts`), mcp 3/5 (`functions.ts`, `types/auth.ts`) | Owned by D/E (service), J (puck), M (mcp): pending list. |
| `authenticate-project`, `refresh-jwt`, `validateProject` | admin-app `contexts/auth.tsx:68`, `use-contentools-api.ts:28`; service `routes/auth.route.ts`, `project.middleware.ts`, 7 route files import `validateProject`; mcp `functions.ts` | D/E/K/M, pending list. |
| `pre-sales` | none in tracked files (only in a local `.claude/settings.local.json` that is not tracked) | guard term only. |
| `GCP_*` (storage) | `service/.env.example`, `connect.yaml`, `gcp-file-controller.ts` | KEPT (GCS is one of three pluggable media backends, spec G). Not forbidden. |

Docs not copied/rewritten elsewhere: root `README.md` (19 `demo`, 17 `commercetools-demo`, 8 `cms`, 15 `firestore`), `release.md`, `task.md`, `TODO.md`, `todo-rest.md` - not migrated (A). `.cursor/`, `.playwright-mcp/` (a console log with localhost URLs) - not migrated (A). `.github/workflows/{workflow,e2e}.yml` - Cloud Run deploy + Docker e2e: **dropped, not replaced** (owner decision: no GitHub Actions; Connect builds and deploys).

## 2. Service route inventory (from `service/src/routes/*.route.ts`, mounted by `routes/service.route.ts`, all under `/service`)

### Legacy (DELETE) - 44 routes
| Route file | Routes |
| --- | --- |
| `content-item.route.ts` (10) | `GET /:bu/content-items`, `GET /:bu/content-items/content-type/:contentType`, `GET /:bu/content-items/:key`, `GET /:bu/published/content-items/:key`, `POST /:bu/published/content-items/query`, `POST /:bu/preview/content-items/query`, `GET /:bu/preview/content-items/:key`, `POST /:bu/content-items`, `PUT /:bu/content-items/:key`, `DELETE /:bu/content-items/:key` |
| `content-item-state.route.ts` (3) | `GET /:bu/content-items/:key/states`, `PUT .../states/published`, `DELETE .../states/draft` |
| `content-item-version.route.ts` (1) | `GET /:bu/content-items/:key/versions` |
| `content-type.route.ts` (5 of 6) | `GET /content-type`, `GET /content-type/:key`, `POST /content-type`, `PUT /content-type/:key`, `DELETE /content-type/:key` (the 6th, `POST /content-type/import`, is KEPT) |
| `page-component.route.ts` (4) | `POST /:bu/pages/:key/components`, `POST .../components/:contentItemKey/move`, `PUT .../components/:contentItemKey`, `DELETE .../components/:contentItemKey` |
| `page-content-item-state.route.ts` (3) | `GET /:bu/page-items/:key/states`, `PUT .../states/published`, `DELETE .../states/draft` |
| `page-row.route.ts` (3) | `DELETE /:bu/pages/:key/rows/:rowId`, `POST /:bu/pages/:key/rows`, `PUT .../rows/:rowId/cells/:cellId` |
| `page-state.route.ts` (3) | `GET /:bu/pages/:key/states`, `PUT .../states/published`, `DELETE .../states/draft` |
| `page-version.route.ts` (1) | `GET /:bu/pages/:key/versions` |
| `pages.route.ts` (9) | `GET /:bu/pages`, `GET /:bu/pages/:key`, `POST /:bu/pages`, `PUT /:bu/pages/:key`, `DELETE /:bu/pages/:key`, `POST /:bu/published/pages/query`, `POST /:bu/preview/pages/query`, `GET /:bu/published/pages/:key`, `GET /:bu/preview/pages/:key` |
| `proxy.route.ts` (1) | `GET /proxy-script` (open proxy that fetches any URL: also a security smell) |
| `file.route.ts` (1 of 3) | `POST /compile-upload` (rollup bundler; KEPT in the same file: `POST /:bu/upload-file`, `GET /:bu/media-library`) |

### Kept (verified used, section 4)
`puck-page.route.ts` (13), `puck-content.route.ts` (13), `puck-template.route.ts` (4), `configuration.route.ts` (36: theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links x GET/POST/PUT/DELETE + `GET /:bu/configuration` + `GET /:bu/configurations`), `datasource.route.ts` (6), `product.route.ts` (`GET /products/search`), `file.route.ts` (`POST /:bu/upload-file`, `GET /:bu/media-library`), `content-type.route.ts` (`POST /content-type/import`), `auth.route.ts` (`GET /health` kept; `POST /authenticate-project`, `POST /refresh-jwt` removed by D/E).
Spec E also decides whether `GET /datasource` and `GET /:bu/media-library` stay public.

### Other legacy code in `service/src` found by an import-graph walk
I walked imports from `src/index.ts` after dropping the 10 legacy route files (script kept in the scratchpad, reproducible: BFS over `from './...'`). Files that become unreachable (all deleted by C unless noted):
`controllers/content-item.controller.ts` (414 lines), `controllers/page.controller.ts` (830), `controllers/page-content-item.controller.ts` (142), `mappers/page.ts`, `utils/constants.ts` (136; only content-item.controller imports it), `utils/assert.utils.ts`, `utils/distance.ts`, `utils/__mocks__/config.utils.ts`, `types/index.types.ts`, `types/sdkError.ts`, `types/rollup-plugin-string.d.ts`, `interfaces/{config,resource,response}.interface.ts`, `api/success.api.ts`, `validators/helpers.validators.ts`, `samples/content-types.ts`, `samples/datasource.ts` (the last two were already dead), plus `utils/bundler.utils.ts` (reachable only via `compile-upload`) and `middleware/deprecation.middleware.ts` (only legacy rules `/content-items`, `/pages|page-items`). Kept although not reachable today: `validators/env.validators.ts` (D reuses its ideas).
KEPT and verified NOT legacy: `controllers/content-state-controller.ts` and `content-version-controller.ts` (generic `withDependencies` helpers imported by puck-page/puck-content controllers), `custom-object.controller.ts`, `datasource-resolution.route.ts`, `product.controller.ts`, `content-type-import.controller.ts` (+ `utils/secure-transpiler.ts` using `@babel/standalone`, + `samples/CMS` -> `samples/content-types`).
`service/src/constants.ts` exports referenced by no kept file (delete): `CONTENT_ITEM_CONTAINER`, `CONTENT_ITEM_STATE_CONTAINER`, `CONTENT_ITEM_VERSION_CONTAINER`, `JWT_TOKEN_KEY`, `DATASOURCES`, `SHARED_CONTAINER`, `CMS_DEPLOYED_URL_KEY`, `PAGE_VERSION_CONTAINER`, `PAGE_STATE_CONTAINER`, `CONTENT_PAGE_CONTAINER`, `PAGE_CONTENT_ITEMS_CONTAINER`, `PAGE_CONTENT_ITEM_STATE_CONTAINER`, `PAGE_CONTENT_ITEM_VERSION_CONTAINER`, `NUMBER_OF_COLUMNS`. Kept: `CORS_ALLOWED_ORIGINS`, `MAX_VERSIONS`, `CONTENT_TYPE_CONTAINER` (content-type import), `CONFIGURATION_*`, `PUCK_*`.
Service dependencies used only by the bundler (remove from `service/package.json`): `lit`, `rollup`, `@rollup/plugin-commonjs`, `@rollup/plugin-node-resolve`, `@rollup/plugin-typescript`, `rollup-plugin-string`; devDependencies `rollup-plugin-typescript2`, `vite`, `vite-node` (no import of `vite`/`vite-node` anywhere in `src`, scripts do not use them). `@babel/standalone` STAYS (secure-transpiler). Gitignore line `/temp/` (bundler temp dir) and `.eslintignore` line `temp-compile/*` become obsolete.
Service e2e: legacy files deleted: `auth, content-item, content-type, page-component, page-content-item-state, page-row, page-state, page-version, pages, proxy` `.e2e.ts` (10). Kept (B/F adapt): `configuration, datasource, file, puck-content, puck-page` + support files. `service/README.md` (1132 lines) documents the legacy API almost entirely -> replaced by a stub (P writes the real one).

## 3. MCP (`mcp/src/shared`) tool inventory
Registry `shared/tools.ts` spreads 15 groups = 88 tools; there are NO puck-page/puck-content/puck-template tools today (spec M adds them).
* DELETE groups (46 tools): `auth` (authenticate_project, refresh_jwt, health), `content-item` (10), `content-item-version` (1), `content-item-state` (3), `page` (8), `page-version` (1), `page-state` (3), `page-row` (3), `page-component` (4), `page-content-item-state` (3), `proxy` (1); and inside kept dirs: `content-type` CRUD (list/get/create/update/delete: 5) and `file.compile_upload` (1).
* KEEP (42): `configuration` (33), `datasource` (6), `file` (upload_file, get_media_library), `content-type.import_content_types`.
* `shared/functions.ts` (592 lines) holds the implementation map `method -> HTTP call`; remove the matching entries.
* `package.json` exports only `./ai-sdk` and `./langchain`, yet README advertises `./mastra` (never existed): remove the mastra lines.

## 4. Evidence: which routes does the front end call (ground truth for "keep")
Script (scratchpad `calls.mjs`, reproduced in tasks.md 3.1 as `tools/check-legacy-route-calls.mjs`) extracts every template literal starting with `${baseURL}` / `${baseUrl}` under `puck/packages/*/src` and `contentools/src` and classifies it. Result on SOURCE (26 distinct endpoint templates, 25 OK + 1 false positive for the `${query}` suffix):
```
/${businessUnitKey}/puck-pages[/${key}[/states[/draft|/published]|/versions]]   (puck-api puck-pages.api.ts, puck-states.api.ts)
/${businessUnitKey}/{published|preview}/puck-pages/${key}, /${businessUnitKey}/${mode}/puck-pages/query
/${businessUnitKey}/puck-contents[/${key}[/states[/draft|/published]|/versions]]  (puck-contents.api.ts, puck-content-states.api.ts)
/${businessUnitKey}/{published|preview}/puck-contents/${key}, /${businessUnitKey}/${mode}/puck-contents/query
/${businessUnitKey}/puck-templates[${query}], /${businessUnitKey}/puck-templates/${key}
/${businessUnitKey}/configuration/theme                     (configuration.api.ts)
/${businessUnitKey}/content-type/import                     (configuration.api.ts)
/${businessUnitKey}/media-library?${params}, /${businessUnitKey}/upload-file   (media-library.api.ts + image-picker)
/datasource/${datasourceKey}/test                           (datasource.api.ts)
/products/search?${params}                                  (products.api.ts)
```
Only the admin app's tenant onboarding calls `/authenticate-project` and `/refresh-jwt` (`hooks/use-contentools-api/use-contentools-api.ts:28`, `contexts/auth.tsx:68`; removed by K/E). Zero calls to `content-items`, `pages`, `page-items`, rows, components, `content-type` CRUD, `proxy-script`, `compile-upload`. Note: the Puck packages never call the other configuration documents (header, facet, footer, ...) nor datasource CRUD; the storefront / admin UI consume them, and the feature matrix keeps them, so they stay.

## 5. Risks
* Wide mechanical rename (`@commercetools-demo/` in ~120 files) must not touch `node_modules`/lockfiles: operate on the explicit tracked file list, not `find .`.
* Renaming `components/cms` -> `components/blocks` changes deep import paths; puck `package.json` `exports` only expose the package root, so no external consumer imports those paths (checked: each package.json `exports` has only `.`).
* Deleting `utils/constants.ts` (service) - confirm no kept file imports it (graph walk says none).
* The guard must not match itself or the openspec/plans folders that legitimately quote the words.

Ownership of the renames above (coordinator decision): C applies them to `service/` and `mcp/`; spec I applies the `puck/` rows; spec K applies the `admin-app/` rows (tasks.md Section 6 is the hand-over list). The guard scans everything; `puck/` and `admin-app/` are pending prefixes until I and K finish.
