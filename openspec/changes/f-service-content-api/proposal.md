## Why

The Puck editor, the renderer, storefronts and the MCP app all talk to one HTTP API: pages, standalone content items, draft/published states, version history, templates,
theme and other configuration, datasources, product search and the default content-type import. This API exists in the source service but is written against the multi-tenant
core (per-request client, Firestore, tenant middleware) and carries bugs (truncated lists, injectable predicates, lost updates, a wrong import path, Firestore-backed datasources).
After D (single-tenant core) and E (auth) it must be ported onto the new core with the same HTTP contract, hardened, and covered by tests per route group.

## What Changes

- Port 73 routes from `service/src/_pending/` onto D's `customObjects()` client and E's access gate, with the source's request/response shapes preserved (documented route table).
- **Datasources move from Firestore to commercetools custom objects** (container `datasource`, key = datasource key) with the same HTTP contract; built-ins (`product-by-sku`, `products-by-sku`) are always available; no data migration (fresh repository).
- Split every route group into a public router (published reads, configuration reads, opt-in built-in datasource resolve; mounted before the gate) and a protected router (mounted after).
- Hardening: strict path-parameter validation, restricted `query` grammar (replaces predicate splicing), escaped predicates everywhere, input whitelisting on update, `value` validation on configuration writes, business-unit ownership checks on get/delete, SKU cap on datasource resolution, state lookup without per-item OR predicates, complete (paginated) lists, concurrency-safe state and version writes.
- Version history keeps `MAX_VERSIONS` newest entries (default 5) with exact pruning semantics; documented and tested.
- `POST /:bu/content-type/import` (what the editor calls) and `POST /content-type/import` (what the MCP calls) both served; the transpiler's stateful-regex bug fixed.
- **BREAKING** (relative to the source service): auth model (E), draft-exposing reads protected, `409` instead of `400` for duplicate datasource, uniform error body, datasource `/test` for an unknown non-built-in key is `404`/`501`.
- Tests: supertest + msw (D's stateful fake commercetools) per route group, a route-inventory test, a Merchant-Center-token happy path and an env-gated live sandbox smoke.

## Capabilities

### New Capabilities
- `content-api-conventions`: business-unit scoping, parameter and body validation, route inventory and access split, list completeness.
- `content-pages-api`: puck-pages CRUD, published/preview reads, slug queries, datasource resolution on read.
- `content-items-api`: puck-contents CRUD, published/preview reads, queries by content type.
- `content-states-versions`: draft/published states, publish, revert, version history and `MAX_VERSIONS` pruning (pages and content items).
- `content-templates-api`: puck-templates.
- `configuration-api`: theme and the other configuration slices, aggregate read, default-business-unit fallback.
- `datasource-api`: datasource definitions on custom objects, built-ins, test/resolve.
- `product-search-api`: free-text product search for the editor picker.
- `content-type-import-api`: import of the default content types.

### Modified Capabilities
<!-- none -->

## Impact

- Code: `service/src/routes/*`, `controllers/*`, `services/*`, `schemas/*`, `samples/content-types/*` (moved out of `_pending/`), tests.
- Dependencies added: `@babel/standalone`, `@types/babel__standalone` (content-type import). Dev: none new.
- Config used: `MAX_VERSIONS`, `CONTAINER_PREFIX` (D), `PUBLIC_DATASOURCE_RESOLVE` (E). Scopes needed: `manage_key_value_documents`, `view_products` (for H).
- Depends on D, E (and B's test conventions); unblocks H, J, M, Q.
