# Explore notes: n-mcp-npm-adapters (working note)

Read 2026-10-08. Source: `/Users/behnam/code/cms/mcp` (read-only). Companion: `../m-mcp-connect-app/explore.md` (tool inventory, routes, SDK facts).

## 1. What the source package ships

| Item | Evidence |
| --- | --- |
| Name/version | `mcp/package.json`: `@commercetools-demo/contenttools-mcp` 1.1.7 (typo `contenttools`; scope is the internal org). `publishConfig.access: public`. |
| Format | `"type": "module"`, `main: ./ai-sdk/index.js`, **no root export**; `exports` only `./ai-sdk` and `./langchain` each with `types/import/require` pointing at `ai-sdk/index.{d.ts,js,cjs}` and `langchain/...` (outputs are in top-level folders, not `dist/`). `files`: `ai-sdk/**/*`, `langchain/**/*`, `LICENSE`, `README.md`, `package.json`. No `LICENSE` file exists in the folder (listed but absent). |
| Build | `tsup.config.ts` (24 lines): two configs, entries `src/ai-sdk/index.ts` and `src/langchain/index.ts`, `format: ['cjs','esm']`, `dts: true`, `sourcemap: true`, `external` = `['ai','zod']` / `['@langchain/core','zod']`. |
| Peers | `@langchain/core >=0.3.0`; `@modelcontextprotocol/sdk >=1.0.0` (optional); `ai ^6.0.0 \|\| ^7.0.0`; `zod >=3.0.0`. **Also** `dependencies`: `zod ^3.24`, `zod-to-json-schema ^3.24` (the latter is imported nowhere: `grep -r zod-to-json-schema src` is empty; dead dependency). zod listed both as dependency and peer (conflicting). |
| Installed versions | `node_modules`: sdk 1.27.1, zod 3.25.76, ai 6.0.116, @langchain/core 0.3.80. |
| Adapters | `src/ai-sdk/{agent,tool,index}.ts` -> `ContentToolsAgent({authConfig}).getTools(): Record<string, Tool>` using `tool({description, inputSchema, execute})` from `ai`; `src/langchain/...` -> `DynamicStructuredTool[]`. Both wrap `ContentToolsAPI.run(method,args)`. Both import `../shared/*` with a **bundled copy of the whole tool list** (every build inlines `shared/`). |
| Types leaked | `export type { AvailableNamespaces } from '../types/tools'`: an enum-typed export used nowhere (`actions` never filters anything). `AuthConfig` carries `projectKey`/`jwtToken` (tenant concepts, removed). |
| stdio entry | `src/modelcontextprotocol/index.ts` + `bin/run-mcp.cjs`, run only via `tsx`; not in `exports`/`files`; cannot be used from an installed package. |
| README | Documents install via `pnpm add`, usage with `projectKey`, and a **`/mastra` export** that does not exist (explore M section 2). |
| `.gitignore` | `ai-sdk/*`, `langchain/*`, `mastra/*` (build outputs at top level). |

## 2. Mastra claim: verified stale
`src/` has no `mastra/` dir; `tsup.config.ts` has no mastra entry; `package.json` has no `./mastra` export and no `@mastra/*` dependency; `node_modules/@mastra` is absent; residue only in `clean` script, `.gitignore` and README text. Conclusion: never shipped. Remove all of it; Mastra users can use the AI-SDK adapter or the HTTP endpoint (spec M).

## 3. Registry versions (npm view, 2026-10-08)
`ai` 7.0.134, `@langchain/core` 1.2.17 (the old peer `>=0.3.0` covered it only nominally), `@modelcontextprotocol/sdk` 1.32.1, `zod` 4.6.5 (dist-tag latest; 3.25.x still current for v3), `tsup` 8.5.1, `@arethetypeswrong/cli` and `publint` available via `npx`.

## 4. Experiments run (scratchpad `proto/`, `compat/`; not in the target tree)
1. **tsup layout.** Config with `entry: { index, 'ai-sdk/index', 'langchain/index' }`, `outDir: 'dist'`, `format: ['cjs','esm']`, `dts: true` in a package **without** `"type"` produced: `dist/index.{js,mjs,d.ts,d.mts}`, `dist/ai-sdk/index.{js,mjs,d.ts,d.mts}`, `dist/langchain/index.{js,mjs,d.ts,d.mts}` plus a shared chunk `dist/client-<hash>.d.{ts,mts}`. (CJS = `.js`, ESM = `.mjs`.)
2. **Exports map** with `import`/`require` each carrying nested `types`, plus `typesVersions` for `ai-sdk` and `langchain`, passed `publint` (only an `engines` suggestion) and `@arethetypeswrong/cli --pack .` -> **"No problems found"** for node10, node16 (CJS and ESM) and bundler. Without `typesVersions`, the node10 resolution fails for subpaths.
3. **Compatibility matrix.** Adapters + core compile (`tsc --noEmit`) and execute against: `ai@6.0.116` + `@langchain/core@0.3.80` + `zod@3.25.76`, and `ai@7.0.134` + `@langchain/core@1.2.17` + `zod@4.6.5` (ran both adapters with a fake `fetch`; `execute({key:'a b'})` produced `.../puck-pages/a%20b`). Same source, no conditional code. Peer ranges below are therefore evidence-based.
4. **Strict schema + MCP SDK** (see M explore): `z.object(shape).strict()` accepted by `registerTool`.

## 5. Decisions that follow
* Core lives in M's `mcp/src/core` (it must, for Connect). N adds `src/adapters/{ai-sdk,langchain}`, `src/mcp/index.ts`, a stdio entry, tsup, and a **derived publish manifest**: the app `package.json` stays `private` (Express and the Connect scripts do not belong in a library tarball; zod would be both dependency and peer).
* No CI exists (owner decision): publishing is a local script with a dry-run default and a confirmation, no provenance/trusted publishing.
* Q-07 default is "Both"; N is off the critical path; if the owner answers "HTTP only", skip N entirely: M is unaffected (M has no import from adapters).
