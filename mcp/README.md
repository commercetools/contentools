# Contentools MCP server

> Unsupported: this is a commercetools-labs project, provided AS IS without support. See [../LICENSE](../LICENSE).

## What it is

A commercetools Connect `service` application that serves the Model Context Protocol (MCP) over **stateless Streamable HTTP** at `POST /mcp`, so AI agents and IDE assistants can read and (optionally) edit Contentools content. It calls the Contentools content service (the sibling `service` application) over HTTP; it never talks to commercetools itself. Health: `GET /mcp/status` answers `{"status":"ok"}` without authentication.

Stateless means each request is self-contained (no `Mcp-Session-Id`), so it scales on Connect without shared state. `GET` and `DELETE` on `/mcp` answer 405.

## Tools (44)

Read tools (24) are always registered. Write tools (20, marked **W**) are registered only when `MCP_ENABLE_WRITES=true`. Every tool accepts an optional `businessUnitKey` (default `DEFAULT_BUSINESS_UNIT_KEY`) except the datasource and product tools, which are not business-unit scoped.

| Group | Tools |
| ----- | ----- |
| pages | `list_puck_pages`, `get_puck_page`, `get_published_puck_page`, `get_preview_puck_page`, `query_published_puck_page`, `query_preview_puck_page`, `get_puck_page_states`, `get_puck_page_versions`, `create_puck_page` **W**, `update_puck_page` **W**, `delete_puck_page` **W**, `publish_puck_page` **W**, `revert_puck_page_draft` **W** |
| contents | the same 13 for content items: `list_puck_contents`, `get_puck_content`, `get_published_puck_content`, `get_preview_puck_content`, `query_published_puck_content`, `query_preview_puck_content`, `get_puck_content_states`, `get_puck_content_versions`, `create_puck_content` **W**, `update_puck_content` **W**, `delete_puck_content` **W**, `publish_puck_content` **W**, `revert_puck_content_draft` **W** |
| templates | `list_puck_templates`, `get_puck_template`, `create_puck_template` **W**, `delete_puck_template` **W** |
| configuration | `list_configurations`, `get_configuration`, `upsert_configuration` **W**, `delete_configuration` **W** (slices: theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links) |
| datasources | `list_datasources`, `get_datasource`, `create_datasource` **W**, `update_datasource` **W**, `delete_datasource` **W**, `test_datasource` **W** (makes the service call the datasource URL) |
| products | `search_products` |
| media | `list_media` (cursor pagination: `limit`, `cursor`, `extensions`), `upload_media` **W** (5 MiB, base64) |
| content-types | `import_default_content_types` **W** |

Page and content queries are structured (`slug`, or `field` plus `value`); the server builds one escaped `field = "value"` clause, so agent text can never inject query syntax. Tool inputs never carry credentials, project keys or URLs (unknown arguments are rejected).

## Configuration

Mirrors the `mcp` block in the root `connect.yaml`.

| Key | Secured | Required | Default | Purpose |
| --- | ------- | -------- | ------- | ------- |
| `CONTENT_SERVICE_URL` | no | yes | - | External URL of the service application, ending in `/service` (https; http only for localhost). |
| `DEFAULT_BUSINESS_UNIT_KEY` | no | no | `default` | Business unit used when a call omits `businessUnitKey`. |
| `MCP_ENABLE_WRITES` | no | no | `false` | `true` registers the 20 mutating tools. |
| `MCP_TOOL_GROUPS` | no | no | `all` | `all` or a comma-separated subset of the groups above. |
| `MCP_ALLOWED_ORIGINS` | no | no | empty | Browser origins allowed to call `/mcp`; empty allows only non-browser clients. |
| `MCP_REQUEST_TIMEOUT_MS` | no | no | `15000` | Timeout of each call to the service (1000 to 120000). |
| `MCP_ACCESS_TOKEN` | yes | yes | - | Bearer token(s) MCP clients send. Comma-separated list for rotation. At least 32 characters each. |
| `SERVICE_API_TOKEN` | yes | yes | - | Static token the service accepts; must equal the service application's `SERVICE_API_TOKEN`. At least 32 characters. Must differ from `MCP_ACCESS_TOKEN`. |

Generate secrets with `openssl rand -base64 32`. The server exits at start-up, naming the offending variables (never their values), if the configuration is invalid.

## Authentication

* **Inbound:** `Authorization: Bearer <MCP_ACCESS_TOKEN>` on every `POST /mcp` (including `initialize` and `tools/list`), compared in constant time. Requests with an `Origin` header not listed in `MCP_ALLOWED_ORIGINS` are rejected with 403 (DNS-rebinding defence); there is no CORS.
* **Outbound:** the app calls the service with its own `SERVICE_API_TOKEN`. The caller's token is never forwarded (no passthrough), so leaking an agent token does not leak the service credential.
* **Rotation:** set `MCP_ACCESS_TOKEN="new,old"`, move clients to the new token, then remove the old one.

## Scopes

None. This application never calls the commercetools API and uses no API client. Authority comes from `SERVICE_API_TOKEN`, so treat `MCP_ENABLE_WRITES=true` like handing the service token to every MCP client. (If the root `connect.yaml` `inheritAs.apiClient` injects `CTP_*` variables into all applications, this app ignores them.) The default is read-only.

## Failure behaviour

* **Fail-closed** on missing or invalid configuration (the process exits), on a missing or wrong bearer (401), on a disallowed origin (403), and on a service outage: the tool returns an error result (`isError`), with no cached or fallback data and no retries. Timeouts and unreachable services are reported as `Service request timed out after N ms` and `Service is unreachable`.
* Service errors are passed on as `Service returned <status> [<code>]: <message> (correlationId <id>)`; the id can be searched in the service logs.
* Logs are JSON lines (`msg`, `correlationId`, `tool`, `outcome`, `ms`). Tool arguments, bodies, headers and tokens are never logged.

## Replay runbook

Not applicable: the app is synchronous and stateless, with no queue, no events and no stored state. A failed tool call is retried by the caller. Writes are as repeatable as the service routes: updates, publish, revert and deletes can be repeated; repeating a create adds another item (pages, contents, templates) or answers 409 (datasources).

## Local development

```bash
cd mcp
yarn install --frozen-lockfile
cp .env.example .env        # fill in real values; .env is git-ignored
set -a; . ./.env; set +a
yarn start:dev              # http://localhost:8080/mcp
yarn dev:fake               # fake service on :8081 plus the MCP app on :8080 (token: 40 x "m")
```

Quality gate: `yarn check:app` (typecheck, tests, build). Offline check of the `connect.yaml` block: `yarn check:connect-block`. Live check against a running service: `MCP_E2E_SERVICE_URL=http://localhost:8080/service MCP_E2E_SERVICE_TOKEN=<token> yarn test:e2e` (creates and deletes one page).

## Verify a running server

```bash
MCP_ACCESS_TOKEN=<token> EXPECT_WRITES=true yarn verify      # SDK client: 44 tools, a read, a protected read, a 404 case
npx -y @modelcontextprotocol/inspector --cli http://localhost:8080/mcp --transport http \
  --header "Authorization: Bearer <token>" --method tools/list
curl -s -X POST localhost:8080/mcp -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Clients must send `Accept: application/json, text/event-stream`.

## Connect an MCP client

```bash
claude mcp add --transport http contentools https://<mcp-app-url>/mcp \
  --header "Authorization: Bearer <MCP_ACCESS_TOKEN>"
```

## Deployment notes

Deploy the `service` application first and copy its URL (ending in `/service`) into `CONTENT_SERVICE_URL` of the `mcp` deployment: Connect provides no variable holding a sibling application's URL. Set `SERVICE_API_TOKEN` to the same value on both applications. The post-deploy script (`yarn connector:post-deploy`) is a read-only probe: it checks that the service answers and accepts the token (a 404 for a probe page counts as accepted); it fails the deployment on 401 or 403 and only warns when the service is unreachable. A cold start on a sandbox can take about 15 seconds, so a first MCP call may need a retry.

The folder is self-contained (no imports from sibling folders). `src/core` holds the transport-neutral tool definitions; `src/mcp` the MCP glue; `src/server` the Express app.

## npm package

The same 44 tools are published as `@commercetools-labs/contentools-mcp` for in-process use (AI SDK, LangChain, your own MCP server, or stdio via `npx -y @commercetools-labs/contentools-mcp`):

```bash
npm i @commercetools-labs/contentools-mcp zod
```

The npm landing page is [`publish/README.md`](./publish/README.md). Published manually with `yarn publish:npm` (dry run by default; `--publish` for the real thing); there is no CI. Local checks: `yarn check:app && yarn build:npm && yarn verify:package` (after `node scripts/publish.mjs` created `.publish`).
