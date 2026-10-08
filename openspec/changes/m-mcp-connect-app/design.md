## Context

Contentools is a single-tenant Puck CMS: a Connect `service` app (`/service`), a Merchant Center custom app, and published `puck-*` npm packages. This change adds the AI entry point: a Connect `service` app `mcp` that serves MCP over HTTP and calls the content service. Locked inputs: Q-01a auth (published reads public; preview, mutations and configuration writes need a bearer that is an MC session JWT or the static `SERVICE_API_TOKEN`), Q-02 legacy dropped, Q-03 BU scoping kept, Q-07 "both" (HTTP app and npm adapters; adapters are spec N), Q-10 folder name `mcp`. Facts are in `explore.md`.

## Goals / Non-Goals

**Goals:** a deployable, secure, stateless MCP endpoint; a catalog limited to kept routes; one tool core reusable by npm adapters; verification without a browser.
**Non-Goals:** talking to the commercetools API directly (the MCP wraps the content service only; it needs no CT scopes); OAuth 2.1 authorization-server flows for MCP clients; per-user identity (single shared agent token); rate limiting (platform concern; documented); stdio and npm packaging (spec N); changing service routes (F/E).

## Decisions

### D1. Single package `mcp/` holds core + server (+ later adapters)
Connect builds each app from its own folder, so the core cannot live in a sibling `shared/`. Layout (to be created):
```
mcp/
  package.json  yarn.lock  tsconfig.json  tsconfig.build.json  jest.config.cjs
  .env.example  .gitignore  .nvmrc  README.md  LICENSE
  src/core/        # NO imports from express, @modelcontextprotocol/sdk, ai, @langchain/*; only zod
    index.ts  types.ts  client.ts  errors.ts  format.ts  registry.ts  schemas.ts  predicate.ts
    tools/{pages,contents,templates,configuration,datasources,products,media,content-types}.ts
  src/mcp/         # SDK glue: createContentoolsMcpServer(tools, deps)
    server.ts
  src/server/      # Connect app: express, auth, config, logger
    index.ts app.ts config.ts auth.ts logger.ts post-deploy.ts
  tests/{unit,integration,support}/   scripts/verify-mcp.mjs
```
`mcp/package.json` stays `"private": true` permanently (it is the Connect app manifest); spec N publishes a *derived* manifest built by a local script, adds `src/adapters/*` and `tsup`. Rejected: separate `mcp-core/` package (needs workspaces or npm publish before M can build); copying the core into two folders (drift).

### D2. Transport: stateless Streamable HTTP, JSON responses
Per verified SDK 1.32.1 behaviour (explore section 5) and the sibling app: new `McpServer` + `StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true})` per POST. Why: Connect autoscales instances and has no shared storage, so session state would break `Mcp-Session-Id` routing; no tool streams or pushes notifications, so SSE adds nothing. GET/DELETE -> 405. Rejected: template's `stateless:false` sessions; `@commercetools/agent-essentials` wrapper (its tools wrap the CT API, not our service).
Server construction cost is trivial (44 `registerTool` calls); the registry is built once at boot and each request only re-registers.

### D3. Auth
* **Inbound:** static bearer `MCP_ACCESS_TOKEN` (secured; comma-separated list for rotation; each >= 32 chars; `openssl rand -base64 32`). Compare SHA-256 digests with `crypto.timingSafeEqual`. Applied to everything under `POST /mcp`, including `initialize`. `GET /mcp/status` open.
* **Outbound:** `SERVICE_API_TOKEN` (secured), the same value the service accepts (spec E: accepted on **every protected route**, which covers all 44 tools; only published reads and configuration reads are public). It is a *different secret from MCP_ACCESS_TOKEN* so that leaking an agent's token does not leak the service credential, and rotating either is independent.
* **Passthrough rejected.** Options: (a) forward the caller's bearer to the service; (b) own service token (chosen). (a) fails because MCP callers (agents, IDEs) hold no Merchant Center session JWT, the service would have to accept arbitrary tokens, and the MCP spec's authorization guidance forbids accepting/forwarding tokens not issued for the MCP server (confused deputy). (b) keeps one auditable credential, at the cost that all MCP callers act with the service's full authority: hence the write gate (D4), group filter, and the explicit README warning. A future per-user mode would validate MC JWTs (spec E middleware) inside the MCP and is out of scope (question Q-M2).
* **Origin:** reject any request with an `Origin` header not in `MCP_ALLOWED_ORIGINS` (DNS-rebinding defence required by the MCP Streamable HTTP spec); no CORS.
* **Fail-closed:** no token configured -> process refuses to start.

### D4. Tool catalog, gating, groups
Tool object (core, transport-neutral):
```ts
export interface ToolDefinition<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;                     // snake_case, unique
  title: string;
  description: string;              // written for an LLM: when to use, what is returned
  group: ToolGroup;                 // 'pages'|'contents'|'templates'|'configuration'|'datasources'|'products'|'media'|'content-types'
  access: 'read' | 'write';
  shape: S;                         // zod raw shape (SDK + adapters call z.object(shape).strict())
  request(input: z.infer<z.ZodObject<S>>, ctx: RequestContext): ServiceRequest; // pure: no I/O
}
export interface ServiceRequest {
  method: 'GET'|'POST'|'PUT'|'DELETE';
  path: string;                     // relative to CONTENT_SERVICE_URL, already percent-encoded, may include ?query
  body?: unknown;                   // JSON
  multipart?: { fields: Record<string,string>; file?: { name: string; contentBase64: string } };
}
```
A pure `request()` makes the whole catalog unit-testable by table without HTTP. The generic `ContentoolsClient.execute(req)` does the fetch (timeout via `AbortSignal.timeout`, headers, error mapping). Descriptions say whether a tool reads published or preview content and warn on writes.

#### Tool catalog (the contract; 44 tools). `:bu` = optional `businessUnitKey` (default `DEFAULT_BUSINESS_UNIT_KEY`). All paths are relative to `CONTENT_SERVICE_URL` (which ends in `/service`).

| # | Tool | Group | Access | Route | Input (zod, besides `businessUnitKey?`) |
|--:|------|-------|--------|-------|------------------------------------------|
| 1 | `list_puck_pages` | pages | read | `GET /:bu/puck-pages` | none |
| 2 | `get_puck_page` | pages | read | `GET /:bu/puck-pages/:key` | `key: string` |
| 3 | `get_published_puck_page` | pages | read | `GET /:bu/published/puck-pages/:key` | `key` |
| 4 | `get_preview_puck_page` | pages | read | `GET /:bu/preview/puck-pages/:key` | `key` |
| 5 | `query_published_puck_page` | pages | read | `POST /:bu/published/puck-pages/query` body `{query:'slug = "<slug>"'}` | `slug: string` (starts with `/`, no control chars) |
| 6 | `query_preview_puck_page` | pages | read | `POST /:bu/preview/puck-pages/query` | `slug` |
| 7 | `get_puck_page_states` | pages | read | `GET /:bu/puck-pages/:key/states` | `key` |
| 8 | `get_puck_page_versions` | pages | read | `GET /:bu/puck-pages/:key/versions` | `key` |
| 9 | `create_puck_page` | pages | write | `POST /:bu/puck-pages` body `{value}` | `value: {name:string, slug:string, puckData?:PuckData, meta?:{title?,description?}.passthrough()}` |
| 10 | `update_puck_page` | pages | write | `PUT /:bu/puck-pages/:key` body `{value}` | `key`, `value`: same fields, all optional, at least one |
| 11 | `delete_puck_page` | pages | write | `DELETE /:bu/puck-pages/:key` | `key` |
| 12 | `publish_puck_page` | pages | write | `PUT /:bu/puck-pages/:key/states/published[?clearDraft=true]` | `key`, `clearDraft?: boolean` |
| 13 | `revert_puck_page_draft` | pages | write | `DELETE /:bu/puck-pages/:key/states/draft` | `key` |
| 14 | `list_puck_contents` | contents | read | `GET /:bu/puck-contents[?contentType=]` | `contentType?: string` |
| 15 | `get_puck_content` | contents | read | `GET /:bu/puck-contents/:key` | `key` |
| 16 | `get_published_puck_content` | contents | read | `GET /:bu/published/puck-contents/:key` | `key` |
| 17 | `get_preview_puck_content` | contents | read | `GET /:bu/preview/puck-contents/:key` | `key` |
| 18 | `query_published_puck_content` | contents | read | `POST /:bu/published/puck-contents/query` body `{query:'<field> = "<value>"'}` | `field: 'key'\|'name'\|'contentType'`, `value: string` |
| 19 | `query_preview_puck_content` | contents | read | `POST /:bu/preview/puck-contents/query` | `field`, `value` |
| 20 | `get_puck_content_states` | contents | read | `GET /:bu/puck-contents/:key/states` | `key` |
| 21 | `get_puck_content_versions` | contents | read | `GET /:bu/puck-contents/:key/versions` | `key` |
| 22 | `create_puck_content` | contents | write | `POST /:bu/puck-contents` body `{value}` | `value: {name:string, contentType:string, data?:PuckData, meta?:{description?,tags?:string[]}.passthrough()}` |
| 23 | `update_puck_content` | contents | write | `PUT /:bu/puck-contents/:key` | `key`, `value` (all optional, >=1) |
| 24 | `delete_puck_content` | contents | write | `DELETE /:bu/puck-contents/:key` | `key` |
| 25 | `publish_puck_content` | contents | write | `PUT /:bu/puck-contents/:key/states/published[?clearDraft=true]` | `key`, `clearDraft?` |
| 26 | `revert_puck_content_draft` | contents | write | `DELETE /:bu/puck-contents/:key/states/draft` | `key` |
| 27 | `list_puck_templates` | templates | read | `GET /:bu/puck-templates[?kind=]` | `kind?: 'page'\|'content'` |
| 28 | `get_puck_template` | templates | read | `GET /:bu/puck-templates/:key` | `key` |
| 29 | `create_puck_template` | templates | write | `POST /:bu/puck-templates` body `{value}` | `value: {name, kind:'page'\|'content', puckData: PuckData}` |
| 30 | `delete_puck_template` | templates | write | `DELETE /:bu/puck-templates/:key` | `key` |
| 31 | `list_configurations` | configuration | read | `GET /:bu/configuration` | none |
| 32 | `get_configuration` | configuration | read | `GET /:bu/configuration/:slice` | `slice: enum` (below) |
| 33 | `upsert_configuration` | configuration | write | `PUT /:bu/configuration/:slice` body `{value}` | `slice`, `value: record \| array` |
| 34 | `delete_configuration` | configuration | write | `DELETE /:bu/configuration/:slice` | `slice` |
| 35 | `list_datasources` | datasources | read | `GET /datasource` | none |
| 36 | `get_datasource` | datasources | read | `GET /datasource/:key` | `key` |
| 37 | `create_datasource` | datasources | write | `POST /datasource/:key` body `{value}` | `key`, `value: {name,key,params:[{key,type,required}],deployedUrl: url}` |
| 38 | `update_datasource` | datasources | write | `PUT /datasource/:key` | same |
| 39 | `delete_datasource` | datasources | write | `DELETE /datasource/:key` | `key` |
| 40 | `test_datasource` | datasources | write | `POST /datasource/:key/test` body `{params}` | `key`, `params?: record` (write because the service calls an external URL) |
| 41 | `search_products` | products | read | `GET /products/search?text=&limit=&locale=` | `text: string(1..200)`, `limit?: int 1..50 (default 20)`, `locale?: string (default en-US)` |
| 42 | `list_media` | media | read | `GET /:bu/media-library?limit=&cursor=&extensions=` (cursor pagination, spec G) | `limit?: int 1..100`, `cursor?: string (opaque, from the previous `pagination.nextCursor`)`, `extensions?: string[1..20] each [A-Za-z0-9]{1,10}` |
| 43 | `upload_media` | media | write | `POST /:bu/upload-file` multipart | `fileName: string`, `fileContentBase64: string (<=5 MiB decoded)`, `title?: string(<=200)`, `description?: string(<=2000)` |
| 44 | `import_default_content_types` | content-types | write | `POST /:bu/content-type/import` (service also serves `/content-type/import`) | none |

`slice` enum: `theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links`.
`PuckData` schema: `z.object({ content: z.array(z.record(z.string(), z.unknown())), root: z.record(z.string(), z.unknown()).optional(), zones: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional() }).passthrough()`.
Counts: read 24 (pages 8, contents 8, templates 2, configuration 2, datasources 2, products 1, media 1), write 20.

Pruned relative to source (89 -> 44): auth 3, content-item* 14, page/page-* 9+1+3+3+4+3 = 23, legacy content-type CRUD 5, proxy 1, compile_upload 1, and 33 configuration tools collapsed into 4, 3 service-side health/auth tools dropped.

Why collapse configuration: eight slices share route shape and are all JSON documents; one parameterised tool cuts 33 tool descriptions (~tokens in every LLM context) to 4 and is easier to keep in sync with the service. Why `upsert` only: both service create and update POST a CT custom object (upsert).

### D5. Write gate and group filter
`MCP_ENABLE_WRITES` (default `false`) removes all `access: 'write'` tools from the registry; `MCP_TOOL_GROUPS` (default `all`) restricts groups. Defaults are least-privilege because the service token is all-powerful (D3). Mirrors the template's `IS_ADMIN`/`TOOLS`.

### D6. Structured query predicates
The source spliced `query` into a commercetools predicate (explore 3.1); spec F now parses a restricted grammar service-side (explore 7: `field = "value"` clauses joined by `AND`, escapes `\"` and `\\`, max 512 chars). The MCP does not rely on that: tools never pass LLM text as `query` and instead emit a **single clause of exactly that grammar** (defence in depth, and always accepted by the service); `buildEqualsPredicate(field, value)` in `core/predicate.ts` escapes `\` then `"`, rejects `\u0000-\u001f\u007f`, caps length 200. `field` is a closed enum, so it cannot inject. Recommendation to spec F (questions.md Q-M5): also harden the service by validating `query` there; the MCP must not depend on it.

### D7. No credentials in tool inputs
Schemas are `.strict()`. The only credentials are env-based. `ContentoolsClient` is constructed once with `{baseUrl, token, defaultBusinessUnitKey, timeoutMs, fetchImpl}`. (Source `api.ts` allowed per-call `jwtToken`/`projectKey`.)

### D8. Result shape and errors
Service error body (spec E): `{ message, statusCode, correlationId, code?, errors? }`. The client text is `Service returned <status>[ <code>]: <message>` (+ ` (correlationId <id>)` when present), e.g. `Service returned 501 MEDIA_NOT_CONFIGURED: Media storage is not configured`. The `code` and `correlationId` let an agent (and an operator grepping the service logs) tell a missing media provider from a bad request; `errors` (validation details) are appended as compact JSON if the total stays under 500 chars.
Success: `{content:[{type:'text', text: JSON.stringify(result, null, 2)}]}` (text only; no `structuredContent`/output schemas, because list results are arrays and the service payloads are open-ended Puck JSON). 204 -> text `OK (no content)`. Failure -> `isError:true` with the text described above (non-JSON bodies: raw text, truncated). Timeouts: `Service request timed out after <n> ms`. Zod validation failures are produced by the SDK as JSON-RPC errors.

### D9. connect.yaml ownership and shape
H owns the file skeleton (service app, root `inheritAs`); M adds only the `mcp` entry below. If H has not landed, M's task 9 creates the file with just this entry and H merges. Final block (the contract):
```yaml
  - name: mcp
    applicationType: service
    endpoint: /mcp
    scripts:
      postDeploy: yarn connector:post-deploy
    configuration:
      standardConfiguration:
        - key: CONTENT_SERVICE_URL
          description: External URL of the contentools service app, ending in /service (https, no trailing slash)
          required: true
        - key: DEFAULT_BUSINESS_UNIT_KEY
          description: Business unit used when a tool call omits businessUnitKey
          required: false
          default: default
        - key: MCP_ENABLE_WRITES
          description: "true registers the 20 mutating tools; they act with the full authority of SERVICE_API_TOKEN"
          required: false
          default: "false"
        - key: MCP_TOOL_GROUPS
          description: "all, or comma-separated: pages,contents,templates,configuration,datasources,products,media,content-types"
          required: false
          default: all
        - key: MCP_ALLOWED_ORIGINS
          description: Comma-separated browser origins allowed to call /mcp; empty allows only non-browser clients
          required: false
        - key: MCP_REQUEST_TIMEOUT_MS
          description: Timeout for each call from a tool to the service
          required: false
          default: "15000"
      securedConfiguration:
        - key: MCP_ACCESS_TOKEN
          description: Bearer token(s) MCP clients must send; comma-separated list allows rotation; each at least 32 characters
          required: true
        - key: SERVICE_API_TOKEN
          description: Static token the content service accepts (same value as the service app's SERVICE_API_TOKEN); at least 32 characters
          required: true
```
No `inheritAs` entry of its own: the app never calls commercetools, so it needs no scopes; if the root `inheritAs.apiClient` injects `CTP_*` to all apps, the app ignores them (documented, never read). `SERVICE_API_TOKEN` is declared again per app (not under root `inheritAs.configuration`) so M does not depend on H's layout; H may hoist it (Q-M4).
`CONNECT_SERVICE_URL` is not used. The `CONTENT_SERVICE_URL` has no Connect-provided source (explore 5): it is entered at install (manual MM-1). Deploy order: service first, then mcp (post-deploy tolerates the reverse).

### D10. Versions and runtime
Node 22 (`.nvmrc` 22, `engines >=22`), TypeScript ^5.7 `module: NodeNext` in a CJS package (no `"type":"module"`; extensionless relative imports), `@modelcontextprotocol/sdk` pinned `1.32.1`, `zod ^3.25.76` (peer-compatible with 4; core uses only APIs common to both, verified by N's compat test), `express ^4.21`, dev: `jest ^29`, `ts-jest`, `supertest`, `msw ^2`. Logging via a 20-line JSON logger (no extra dependency; `@commercetools-backend/loggers` rejected as unnecessary for a proxy). No `@commercetools/platform-sdk`/`ts-client` because the app never talks to commercetools.

### D11. Verification without Chrome
Three layers: (1) jest+supertest+msw (router-level, stub service via msw `onUnhandledRequest:'error'`); (2) `scripts/verify-mcp.mjs` (SDK client) against a locally started app with a fake service (`tests/support/fake-service.ts`, started by `yarn dev:fake`); (3) MCP Inspector CLI one-liners. A live e2e against the real service is env-gated (`MCP_E2E_*`).

## Risks / Trade-offs

- All MCP callers share one powerful token -> default read-only, group filter, documented; per-user auth deferred (Q-M2).
- Service contract drift (F/E/G) -> routes isolated in `core/tools/*.ts` + a table test (`catalog.test.ts`) that mirrors the design table; F's changes must update both.
- `datasource` tools may change if F reshapes storage -> only `core/tools/datasources.ts`.
- Large catalogs hurt LLM tool selection -> groups + collapsed config tools.
- JSON-RPC base64 upload inflates payload ~33% -> 5 MiB cap, 8 MiB body limit.
- Connect cold start (~15 s sandbox) may time out first MCP call -> README note; clients retry.

## Migration Plan
Greenfield: nothing to migrate. Rollback: remove the `mcp` entry from `connect.yaml` and delete `mcp/`; no data is owned by this app.

## Open Questions
See `questions.md` (Q-M1..Q-M6; Q-M3, Q-M5, Q-M6 are resolved by specs E/F, Q-M4 is H's call).
