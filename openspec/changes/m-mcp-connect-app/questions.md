# Owner questions (spec M). Each proceeds on its default.

| ID | Question | Status / recommended default | Affects |
| -- | -------- | ---------------------------- | ------- |
| Q-M1 | Should MCP writes be available at all in a default install? | Open. Default: registered only when `MCP_ENABLE_WRITES=true`; default `false` (read-only agent). | M, P (README warning) |
| Q-M2 | Per-user identity for MCP callers (validate Merchant Center session JWTs / OAuth) instead of one shared agent token? | Open. Default: no. Shared `MCP_ACCESS_TOKEN` (rotation list) + service-held `SERVICE_API_TOKEN`; no passthrough (design D3). Revisit after launch. | M, E |
| Q-M3 | Content-type import route mismatch (BU-less vs `/:bu/`). | **Resolved by F/E:** both `POST /:bu/content-type/import` and `POST /content-type/import` exist (one handler). M uses the BU-scoped path. | F, M |
| Q-M4 | Where is `SERVICE_API_TOKEN` declared in `connect.yaml`: per app or once under root `inheritAs.configuration.securedConfiguration`? | **Still H's call.** M declares it per app (value must be identical to the service's); if H hoists it, M deletes its copy (one-line change). Not resolved by E/F/G, which only define what the service accepts. | H, M |
| Q-M5 | Should the service validate the `query` body (predicate injection)? | **Resolved by F:** restricted, escaped grammar service-side (`field = "value"` clauses). M emits one clause of exactly that grammar and does not rely on the service check. | F, M |
| Q-M6 | Service health route after `/health` is removed with the auth router. | **Resolved by E:** `GET /service/health` (alias `/service/status`), public. M's post-deploy probes `/health` for reachability, then an authenticated preview 404 probe for credentials. | D, E, H, M |
