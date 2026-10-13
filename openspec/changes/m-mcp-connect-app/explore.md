# Explore notes: m-mcp-connect-app (working note, not an OpenSpec artifact)

All paths below were read on 2026-10-08. Source tree is `/Users/behnam/code/cms` (read-only).

## 1. What `/Users/behnam/code/cms/mcp` is today

| File | Lines | Fact |
| ---- | ----: | ---- |
| `mcp/package.json` | 62 | name `@commercetools-demo/contenttools-mcp` (typo "contenttools"), v1.1.7, `type: module`, exports only `./ai-sdk` and `./langchain`, `files` = built dirs, scripts `build` (tsup), `clean` (`rm -rf ai-sdk langchain mastra`), `mcp` (`tsx src/modelcontextprotocol/index.ts`). Peer deps: `@langchain/core >=0.3`, `@modelcontextprotocol/sdk >=1` (optional), `ai ^6 \|\| ^7`, `zod >=3`. Dev: `@modelcontextprotocol/sdk ^1.27.1`, `ai ^6`, `tsup ^8.3`, `tsx`. |
| `mcp/tsup.config.ts` | 24 | Two builds only: `src/ai-sdk/index.ts` -> `ai-sdk/`, `src/langchain/index.ts` -> `langchain/`; cjs+esm, dts, sourcemap. **No mastra build, no stdio/MCP build.** |
| `mcp/bin/run-mcp.cjs` | 35 | Spawns `node_modules/.bin/tsx src/modelcontextprotocol/index.ts` so MCP Inspector sees clean stdout. Dev-only hack. |
| `mcp/src/modelcontextprotocol/index.ts` | 67 | **stdio only** (`StdioServerTransport`). Reads `--baseUrl/--projectKey/--businessUnitKey/--jwtToken` or `BASE_URL/PROJECT_KEY/BUSINESS_UNIT_KEY/JWT_TOKEN`. There is **no HTTP transport** today. |
| `mcp/src/modelcontextprotocol/agent.ts` | 42 | `createContentToolsMcpServer(authConfig)`: `new McpServer({name:'contenttools-mcp',version:'1.0.0'})`, loops `allTools`, `server.registerTool(tool.method, {description, inputSchema: tool.parameters}, handler)`; handler -> `api.run(method,args)` -> `formatToolOutput`. |
| `mcp/src/shared/api.ts` | 39 | `ContentToolsAPI` holds `baseUrl, projectKey, businessUnitKey, jwtToken`; `run(method,arg)` looks up `createFunctionMap`; **per-call overrides** of `projectKey`, `businessUnitKey`, `jwtToken` from tool args (a security smell: an LLM could inject a different token/tenant). |
| `mcp/src/shared/functions.ts` | 592 | Hand-written `fetch` per tool. Every request sets `x-project-key`, `Content-Type`, `x-source: mcp`, and `Authorization: Bearer <jwt>` for mutating routes. 404/!ok -> `Error("API <method> <path>: <status> <text>")`. `upload_file` builds `FormData` from base64 `fileContent`. |
| `mcp/src/shared/*/tools.ts` | 15 files, 89 `method:` entries | Tool defs: `{method, name, description, parameters: z.object, actions}`. `actions` (read/create/update namespaces) is **never used for filtering** (README claims "configuration.actions can restrict tools" - stale; there is no `Configuration` type anywhere). |
| `mcp/src/shared/tools.ts` | 34 | `allTools` = spread of 15 groups. |
| `mcp/src/ai-sdk/{agent,tool,index}.ts` | 29/20/3 | `ContentToolsAgent({authConfig}).getTools()` -> `Record<string, Tool>` from `ai` `tool({description, inputSchema, execute})`. |
| `mcp/src/langchain/{agent,tool,index}.ts` | 28/21/3 | Same, `DynamicStructuredTool[]`. |
| `mcp/README.md` | 65 | Documents a `/mastra` export and `pnpm add @mastra/core`. See section 2. |

### 1.1 Tool inventory today (89) and fate

| Group (file) | Count | Routes it hits | Fate |
| --- | ---: | --- | --- |
| auth (`auth/tools.ts`) | 3 | `POST /authenticate-project`, `POST /refresh-jwt`, `GET /health` | **Removed** (multi-tenancy; Q-01/D/E). |
| configuration | 33 | `/:bu/configuration[/theme\|header\|facet\|footer\|site-metadata\|category-listing\|translations\|b2b-account-menu-links]` GET/POST/PUT/DELETE | **Kept, collapsed** to 4 slice-parameterised tools (all 8 slices share one shape). |
| content-type | 6 | `/content-type` CRUD + `POST /content-type/import` | Legacy CRUD **removed** (Q-02); `import` **kept** as `import_default_content_types`. |
| content-item, -version, -state | 10+1+3 | `/:bu/content-items*`, `/published/content-items`, `/preview/content-items` | **Removed** (legacy). Replaced by the `puck-contents` family. |
| datasource | 6 | `/datasource[/:key[/test]]` | **Kept** (6 -> 6). |
| file | 3 | `POST /:bu/upload-file`, `GET /:bu/media-library`, `POST /compile-upload` | upload + media-library **kept**; `compile-upload` **removed** (legacy lit/rollup bundler). |
| page, page-version, page-state | 9+1+3 | `/:bu/pages*` (grid pages) | **Removed** (legacy). Replaced by `puck-pages`. |
| page-row, page-component, page-content-item-state | 3+4+3 | `/:bu/pages/:key/rows|components`, `/:bu/page-items/*` | **Removed** (legacy grid editor). |
| proxy | 1 | `GET /proxy-script` | **Removed** (legacy). |

**Critical finding:** the current MCP has **zero tools for the Puck routes** (`puck-pages`, `puck-contents`, `puck-templates`) and none for `products/search`, i.e. every page/content tool it ships talks to legacy routes that Q-02 deletes. "Prune legacy" therefore also means **author the Puck tools new**. Nothing is a straight copy except configuration/datasource/file shapes.

## 2. Mastra claim (stale, verified)

`README.md` lines 2, 11-12, 36-45, 49 mention Mastra and an `@commercetools-demo/contenttools-mcp/mastra` export. Evidence it never shipped in this tree:
* no `src/mastra/` directory (`ls mcp/src` = ai-sdk, langchain, modelcontextprotocol, shared, types);
* no mastra entry in `tsup.config.ts`, no `./mastra` in `package.json` `exports`/`files`, no `@mastra/*` dependency, `node_modules/@mastra` absent;
* only residue: the `clean` script (`rm -rf ... mastra`) and `.gitignore` line `mastra/*`.
Decision: drop every Mastra mention and the residue (spec N). Mastra users can consume the AI-SDK adapter or the HTTP MCP endpoint (Mastra's MCP client speaks Streamable HTTP).

## 3. Service routes the kept tools will call (source: `/Users/behnam/code/cms/service/src/routes/*.ts`)

Router is mounted at `/service` (`service/src/app.ts` line `app.use('/service', ServiceRoutes)`); `service.route.ts` mounts all routers at `/`.

### 3.1 puck-pages (`routes/puck-page.route.ts`, 13 routes) - and identically `puck-content.route.ts` (`puck-contents`)
| Verb + path (under `/service`) | Auth in source | Notes |
| --- | --- | --- |
| `GET /:bu/puck-pages` | project key only | list (content variant accepts `?contentType=`) |
| `GET /:bu/puck-pages/:key` | project key | item + `states` |
| `POST /:bu/puck-pages` | `validateJwt` | body `{value}`; 400 if missing; 201 |
| `PUT /:bu/puck-pages/:key` | `validateJwt` | body `{value}`; auto-saves draft + version |
| `DELETE /:bu/puck-pages/:key` | `validateJwt` | 204 |
| `GET /:bu/published/puck-pages/:key` | project key | 404 if none |
| `GET /:bu/preview/puck-pages/:key` | project key (**spec E: preview must require bearer**) | draft or published |
| `POST /:bu/published/puck-pages/query` | project key | body `{query}` |
| `POST /:bu/preview/puck-pages/query` | project key (**E: bearer**) | body `{query}` |
| `GET /:bu/puck-pages/:key/states` | project key | draft/published |
| `PUT /:bu/puck-pages/:key/states/published?clearDraft=true` | `validateJwt` | publish |
| `DELETE /:bu/puck-pages/:key/states/draft` | `validateJwt` | revert draft |
| `GET /:bu/puck-pages/:key/versions` | project key | version history (`MAX_VERSIONS`, default 5, `service/src/constants.ts:8`) |

**Injection hazard (verified):** `controllers/puck-page.controller.ts:354-356` and `puck-content.controller.ts:265-267` interpolate the client's `query` string into a commercetools custom-object predicate: ``value(${query} AND businessUnitKey = "${bu}")``. A free-text `query` tool argument from an LLM would let it craft arbitrary predicates. The MCP tools therefore take **structured** input (`slug`; or `field` enum + `value`) and build the predicate themselves with escaping (design.md D6).

### 3.2 puck-templates (`routes/puck-template.route.ts`)
`GET /:bu/puck-templates?kind=page|content`, `GET /:bu/puck-templates/:key`, `POST /:bu/puck-templates` (`{value:{name,kind,puckData}}`, 201), `DELETE /:bu/puck-templates/:key` (204). Writes `validateJwt`.

### 3.3 configuration (`routes/configuration.route.ts`, 3187 total lines across routes)
`GET /:bu/configuration` (all slices), and per slice `GET|POST|PUT|DELETE /:bu/configuration/<slice>` for slices `theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links`. Writes `validateJwt`. `controllers/custom-object.controller.ts` `createCustomObject` (line 26) and `updateCustomObject` (line 89) both `POST` a commercetools custom object, i.e. **both are upserts**; so one `upsert_configuration` tool (PUT) is enough. `getTheme` falls back to BU `default` when the BU has none.

### 3.4 datasource (`routes/datasource.route.ts`)
`GET /datasource`, `GET /datasource/:key`, `POST /datasource/:key` (`{value}`, 400 if exists), `PUT /datasource/:key`, `DELETE /datasource/:key`, `POST /datasource/:key/test` (`{params}`). **Currently Firestore-backed** (`getDatasourcesCollection`) - spec D/F move storage; the HTTP contract the MCP calls is unchanged. Not BU-scoped, no BU in the path. `datasource.value` = `{name,key,params[{key,type,required}],deployedUrl}`; `test` makes the service call `deployedUrl` (SSRF-adjacent; keep behind writes flag).

### 3.5 products, media, content-type import
* `GET /products/search?text=&limit=&locale=` (`routes/product.route.ts`; limit capped 50, default 20, locale default `en-US`; returns `{id,name,sku,image,slug}[]`).
* (source) `GET /:bu/media-library?page=&limit=&extensions=a,b` (**superseded by spec G**: cursor pagination, see section 7); `POST /:bu/upload-file` multipart (`file`, `title`, `description`; multer memory storage) returns `{url}`.
* `POST /content-type/import` (`routes/content-type.route.ts:66`, `validateJwt`) returns `{imported:string[], failed:[{key,error}]}`.
  **Inconsistency (resolved by spec E/F: both `POST /:bu/content-type/import` and `POST /content-type/import` are served by one handler):** `puck/packages/puck-api/src/api/configuration.api.ts:81` calls `${baseURL}/${businessUnitKey}/content-type/import` (BU-prefixed), but the service only registers `/content-type/import`. One of them is a latent bug. MCP follows the final route chosen by specs C/F; default assumption `POST /:bu/content-type/import` (what the shipped client calls). Recorded in `questions.md` Q-M3.

### 3.6 Health
`routes/auth.route.ts:16` `GET /health` (returns `service: 'multitenant-contentools'`; removed with auth). Spec D/H own the replacement; this spec assumes `GET /service/status` (Connect checklist) and only *warns* if it is absent.

### 3.7 Kept-route confirmation (grep of `puck/packages/puck-api/src`)
Used: `puck-pages` (list/get/create/update/delete/states/versions/query), `puck-contents` (same), `puck-templates` (list/create/delete/get), `configuration/theme`, `datasource/:key/test`, `products/search`, `media-library`, `upload-file`, `content-type/import`. Matches the locked list in the brief. Not called by puck-api but kept in the MCP because they exist on the kept service surface: other config slices, datasource CRUD, `published/preview` routes beyond those the editor uses.

## 4. Template and sibling references

### 4.1 `/Users/behnam/code/connect-mcp-server-template`
* `connect.yaml`: one app `name: modelcontextprotocol`, `applicationType: service`, `endpoint: /mcp`; standardConfiguration `AUTH_TYPE` (default `client_credentials`), `AUTH_URL`, `API_URL`, `TOOLS` (default `all`), `IS_ADMIN` (default `false`); securedConfiguration `PROJECT_KEY`, `CLIENT_ID`, `CLIENT_SECRET`. (It does not use `inheritAs`.)
* `modelcontextprotocol/src/index.ts`: wraps `@commercetools/agent-essentials/modelcontextprotocol` `CommercetoolsAgentEssentialsStreamable`, listens on **8080**, `stateless: false` with `sessionIdGenerator: randomUUID` (stateful sessions; **a problem on autoscaled Connect instances**: session lives in one instance's memory). Template `package.json` still lists `sdk-client-v2@^2`, `platform-sdk@^4`, Node 18 types and `.nvmrc` v20.9.0 - all superseded by the Connect skill rules (Node 22, `platform-sdk@^8`, `ts-client@^4`). Its `.env` file is committed with real-looking keys: do not copy it.
* We keep: app name idea, `endpoint: /mcp`, tool-group switch (`TOOLS`), write gate (`IS_ADMIN`), `auth_token` idea (bearer on each call). We drop: the commercetools-API tool set (our MCP wraps the content service, not the CT API), stateful sessions, `client_credentials` public mode.

### 4.2 Sibling `/Users/behnam/code/commercetools-labs/search-config`
`service/src/mcp/index.ts` is a working **stateless Streamable-HTTP MCP** on Connect: per POST a fresh `McpServer` + `StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true})`, `res.on('close', ...)` closes both, GET/DELETE -> 405 with `Allow: POST`, Origin allow-list -> 403, bearer key -> 401 + `WWW-Authenticate`, 64 KiB body cap, JSON-RPC-shaped error bodies. Pinned `@modelcontextprotocol/sdk` `1.30.1`, `zod 4.6.5`. Its `connect.yaml` declares keys shared by several apps once under root `inheritAs.configuration` and reaches the service from the MC app through a plain config key (`SEARCH_CONFIG_SERVICE_URL`). We copy that shape.

## 5. Verified platform / SDK facts

* **MCP SDK**: `npm view @modelcontextprotocol/sdk` -> latest `1.32.1` (dist-tag `latest`, v1.x line), peer `zod ^3.25 || ^4`, node `>=18`. Scratch experiment (scratchpad `mcpexp/`, express 4 + zod 4 + sdk 1.32.1) confirmed: `McpServer.registerTool(name, {description, inputSchema: <raw zod shape>}, handler)` works; stateless `StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true})` + `transport.handleRequest(req,res,req.body)` works behind `express.json()`; SDK `Client` + `StreamableHTTPClientTransport` lists and calls tools; `GET /mcp` returns 405 when the app declares it; JSON-Schema for the raw shape is emitted with `$schema: draft-07`.
* **MCP Inspector CLI** (`@modelcontextprotocol/inspector@2.10.1`, run with `npx -y`): `npx -y @modelcontextprotocol/inspector --cli http://localhost:8099/mcp --transport http --method tools/list --header "Authorization: Bearer x"` printed the tool list (verified). `--method tools/call --tool-name <n> --tool-arg k=v` is the call form.
* **Connect**: root-level `inheritAs` (docs `modify-connector`: placed after `deployAs`, unindented); the docs do **not** describe any variable exposing a *sibling* app's URL, so the MCP app needs an explicit `CONTENT_SERVICE_URL` config key. `CONNECT_SERVICE_URL` is the app's *own* external URL (used in search-config `src/env.ts`). Service requests time out after 5 minutes (skill `service-applications.md`); the 2 s/10 s limit applies only to API-extension mode, which this app is not. Connect apps are stateless/no shared disk (`project-structure.md` Pattern 6), which is why stateful MCP sessions are rejected.
* Connect build: runs install + build **inside the app folder** (`monorepo-with-storefront.md` line 63), so `mcp/` must be self-contained: the shared tool core lives **inside** `mcp/src/core` (no `shared/` import across folders).

## 6. Risks found
1. No Puck tools exist: net-new authoring (largest effort of M).
2. Predicate injection via `query` (3.1) - structured inputs mandatory.
3. Per-call `jwtToken`/`projectKey` overrides in `api.ts` must not survive: the LLM must never choose credentials.
4. Cross-app URL: no Connect-provided way to learn the service URL -> manual install step (`manual.md` MM-1).
5. Two specs (H, M) edit `connect.yaml`: M owns only the `mcp` block + its keys; coordinate ordering (questions.md Q-M4).
6. Template uses stateful sessions; must not be copied.
7. Datasource routes are Firestore-backed today; if spec F changes the contract, `core/tools/datasources.ts` changes with it (single file).
8. `upload_media` through JSON-RPC base64 is size-bound; cap at 5 MiB.

## 7. Alignment with finished specs E, F, G (applied 2026-10-08)

* **E (auth):** `SERVICE_API_TOKEN` is accepted on **every protected route** (preview, writes, and now also draft reads, lists, states, versions, templates, `products/search`, `datasource*`, `media-library`, `upload-file`, content-type import). Public: health + published reads + configuration reads. Therefore the MCP sends the bearer on every call (it already does) and the read tools `list_puck_pages`, `get_puck_page`, states/versions, templates, datasources, `search_products`, `list_media` are *protected reads*: they only work because the app holds the service token. Error body contract: `{ message, statusCode, correlationId, code?, errors? }`. Health: `GET /service/health` (alias `GET /service/status`), no auth.
* **F (content API):** datasources are now custom objects (container `datasource`); built-in datasources cannot be written/deleted (409). Query grammar for `.../query`: `clause (AND clause)*`, `clause := field = "value"` with `\"` and `\\` escapes, fields pages `slug|name|key`, contents `contentType|name|key`, max 512 chars, anything else `400 Invalid query`, `businessUnitKey` appended server-side. M's `buildEqualsPredicate` emits exactly this grammar (single clause), so the tools call the documented grammar. Both content-type import paths exist (source bug fixed in F).
* **G (media):** `GET /:bu/media-library?limit=&cursor=&extensions=` returns `{ files, pagination: { limit, nextCursor, hasMore } }` (limit 1..100 default 20; extensions 1..20 entries `[A-Za-z0-9]{1,10}`; no `page`, `totalItems`, `totalPages`). Files carry `url, key, name, isImage` and optional `title, description, createdAt, size, contentType`. Errors carry `code`: `MEDIA_NOT_CONFIGURED` (**501**, provider `none`), `MEDIA_INVALID_CURSOR`/`MEDIA_INVALID_EXTENSIONS` (400), `MEDIA_TYPE_NOT_ALLOWED` (415), `MEDIA_STORAGE_UNAVAILABLE` (502). Upload: `title` <= 200, `description` <= 2000 chars; service max file default 10 MiB (the MCP's own 5 MiB cap stays lower because of base64 in JSON-RPC).
* Resolved questions: Q-M3 (route), Q-M5 (service-side grammar), Q-M6 (`/service/health`). Q-M4 remains an H decision (see questions.md).
