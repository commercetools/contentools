## Why

Contentools agents are not all MCP clients: many are built with the Vercel AI SDK or LangChain and want in-process tools, not an HTTP hop. The source `mcp/` already served them, but its package name is wrong (typo, internal scope), it bundles a copy of legacy tools, documents a Mastra export that never existed, and ships no LICENSE. Q-07 (default "Both") keeps adapters alongside the HTTP app, now fed by the single tool core created in spec M.

## What Changes

- Add `src/adapters/ai-sdk` and `src/adapters/langchain` to `mcp/`, thin wrappers over `@core` (`runTool`, `selectTools`, `ContentoolsClient`), exposing the same 44 (or filtered) tools.
- Add `src/mcp/index.ts` (public `createContentoolsMcpServer`) and a stdio entry (`contentools-mcp` bin) replacing the `tsx`-only `bin/run-mcp.cjs`.
- Build with `tsup` into `dist/` (CJS + ESM + `.d.ts`), subpaths `.`, `./ai-sdk`, `./langchain`, `./mcp`; exports map with `typesVersions` verified by `publint` and `@arethetypeswrong/cli`.
- Publish `@commercetools-labs/contentools-mcp@1.0.0` (rc first) from a **derived manifest** via a local, confirmation-gated script; no CI, no trusted publishing.
- Remove every Mastra mention (verified stale), the dead `zod-to-json-schema` dependency, `AvailableNamespaces`, `projectKey`/`jwtToken` config.
- **BREAKING** vs `@commercetools-demo/contenttools-mcp@1.x`: new name, new factory API (`createAiSdkTools`, `createLangChainTools`), no tenant parameters.

## Capabilities

### New Capabilities
- `mcp-npm-adapters`: AI SDK, LangChain and MCP-server/stdio entry points sharing one tool core, with credentials only in client configuration.
- `mcp-npm-publishing`: package layout, exports map, peer ranges, derived manifest, verification and local publish procedure.

### Modified Capabilities
<!-- none -->

## Impact

- `mcp/` gains `src/adapters/**`, `src/stdio/**`, `tsup.config.ts`, `publish/` (manifest template + npm README), `scripts/publish.mjs`, `scripts/verify-package.mjs`, tests; app build (`gcp-build`) is unchanged and excludes adapters.
- Depends on M. Off the critical path (Q-07). Needs M-07 (npm scope access) only at publish time.
- Docs (spec P) link the npm README; no workflows anywhere.
