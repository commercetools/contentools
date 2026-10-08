# New owner questions (spec N)

| ID | Question | Recommended default | Affects |
| -- | -------- | ------------------- | ------- |
| Q-N1 | (Restates Q-07) Ship the npm adapters at all? | **Both** (HTTP app + adapters). N is off the critical path; if the answer is "HTTP only", skip N completely. M does not depend on it. | M, N |
| Q-N2 | Publish a derived manifest (design D1) instead of making `mcp/package.json` itself publishable? | Yes, derived manifest from `publish/package.template.json`. | N |
| Q-N3 | Keep the stdio bin `contentools-mcp` (replaces the tsx-only `bin/run-mcp.cjs`)? | Yes; it is small and lets desktop MCP clients use the package with `npx`. | N |
| Q-N4 | `engines.node` for the library. | `>=20` (tested on 22). | N |
| Q-N5 | First publish as `1.0.0-rc.0` under tag `next`, then `1.0.0` (Q-05)? | Yes. | N |
