# Human-only steps discovered (spec M). Do not edit plans/manual-steps.md; the coordinator merges.

| ID | Step | Needed before | Details |
| -- | ---- | ------------- | ------- |
| MM-1 | Provide `CONTENT_SERVICE_URL` at install | first `mcp` deployment | Connect gives no variable with a sibling app's URL (docs `modify-connector`, verified). After the `service` app is deployed, copy its URL (ends in `/service`) into the `mcp` deployment configuration. Deploy order: service, then mcp. |
| MM-2 | Generate and set the two secrets | first `mcp` deployment | `openssl rand -base64 32` twice: one for `MCP_ACCESS_TOKEN` (give to MCP clients), one for `SERVICE_API_TOKEN` (must equal the value configured on the `service` app). Store only in the Connect deployment configuration / a git-ignored `.env`. |
| MM-3 | Optional: Connect sandbox deployment of `mcp` (same repository; use an rc tag, no private fork) | spec Q acceptance (remote check) | Needs M-05 (CLI login). Local-only verification (explore/tasks section 10) works without it. |
| MM-4 | Connect an MCP client | optional smoke | In Claude Code: `claude mcp add --transport http contentools <https-url>/mcp --header "Authorization: Bearer <MCP_ACCESS_TOKEN>"`. |
