## Why

The source `mcp/` is a stdio-only npm library whose 89 tools mostly target the legacy grid-pages/content-items API (deleted by Q-02) and a multi-tenant auth flow (removed by D/E), and it has no tools at all for the Puck routes that remain. Contentools needs an AI-agent entry point that runs *with* the product: a commercetools Connect `service` app that serves the Model Context Protocol over Streamable HTTP and drives the single-tenant content service.

## What Changes

- New Connect application `mcp` (`applicationType: service`, `endpoint: /mcp`) in root `connect.yaml`, folder `mcp/`, serving **stateless Streamable HTTP MCP** on `POST /mcp` (+ `GET /mcp/status`).
- New tool catalog: 44 tools over only the kept Puck surface (puck-pages, puck-contents, puck-templates, configuration, datasources, product search, media, content-type import); 20 of them are mutating and are **not registered unless `MCP_ENABLE_WRITES=true`**. All legacy tools (auth, content-items, grid pages, rows, components, proxy, compile-upload, legacy content-type CRUD) are dropped.
- A **transport-neutral tool core** (`mcp/src/core`, zod schemas + request builders + HTTP client) that M consumes now and spec N later re-exposes as AI-SDK/LangChain adapters. The core lives inside `mcp/` because Connect apps must be self-contained.
- Auth model: inbound `Authorization: Bearer <MCP_ACCESS_TOKEN>` (secured config, constant-time compare, rotation list); outbound the app calls the service with its own `SERVICE_API_TOKEN` (the same static token spec E accepts). Inbound tokens are **never forwarded** (no passthrough).
- Per-call `projectKey`/`jwtToken`/`businessUnitKey` overrides from tool arguments are removed; structured inputs replace the free-text `query` predicate.
- `connect.yaml` block, config table, README (fail-open/closed, scopes, runbook), post-deploy probe, tests (jest + supertest + msw), Chrome-free verification (MCP Inspector CLI + SDK client script).
- **BREAKING** (vs the source package): tool names change (snake_case Puck names), no `projectKey`, no JWT tools, stdio entry moves to spec N.

## Capabilities

### New Capabilities
- `mcp-http-endpoint`: stateless Streamable-HTTP MCP endpoint, health, config validation, Connect packaging, observability.
- `mcp-tool-catalog`: the exact kept tool set, schemas, routes, write gating, group filter, structured-query safety.
- `mcp-auth`: inbound bearer auth, origin policy, outbound service token, no passthrough, error hygiene.

### Modified Capabilities
<!-- none: openspec/specs/ is empty; capabilities above are new -->

## Impact

- New dir `mcp/` (package.json, src/core, src/server, tests, scripts); new `mcp` block in root `connect.yaml` (coordinate with H, see design D9).
- Depends on service contracts from F (routes), E (static-token acceptance, preview protection), H (`connect.yaml` skeleton), E (`/service/health`, token accepted on all protected routes), G (cursor media listing), C (legacy removed, confirms kept list).
- Dependencies: `@modelcontextprotocol/sdk@1.32.1`, `express@^4.21`, `zod@^3.25.76`; Node 22.
- Manual: install-time values `CONTENT_SERVICE_URL`, `MCP_ACCESS_TOKEN`, `SERVICE_API_TOKEN` (see `manual.md`).
- Unblocks N (adapters), O (local verify/gate scripts), Q (acceptance). No GitHub Actions: quality gates are local scripts plus Connect's own build and `commercetools connect application test`.
