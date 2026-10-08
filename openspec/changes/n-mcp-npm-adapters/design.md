## Context

Spec M leaves `mcp/` with: `src/core` (tool definitions, `runTool`, `ContentoolsClient`, `selectTools`), `src/mcp/server.ts` (`createContentoolsMcpServer`), `src/server` (Express/Connect). N turns the core into an installable library. Locked: npm scope `@commercetools-labs`, package `@commercetools-labs/contentools-mcp` (Q-04), version 1.0.0 with rc first (Q-05), Q-07 default **Both** (so N proceeds, but is off the critical path and skippable), owner decision **no CI / no GitHub Actions**: release is a local script. Facts: `explore.md`.

## Goals / Non-Goals
**Goals:** AI SDK + LangChain adapters and MCP factory/stdio from one core; correct dual-format package; reproducible local publish with verification.
**Non-Goals:** Mastra adapter (never existed); new tools (M owns catalog); streaming/OAuth; publishing automation in CI.

## Decisions

### D1. Publish a derived manifest, keep `mcp/package.json` private
`mcp/package.json` is the Connect app manifest (`express`, `gcp-build`, `connector:*`, `zod` as dependency). A library must have peers instead of dependencies and no Express. Options: (a) one manifest for both (rejected: zod in both `dependencies` and `peerDependencies`, Express shipped to every consumer, scripts leak); (b) separate folder/package (rejected: breaks "core inside mcp/" and risks drift); (c) **derived manifest**: `publish/package.template.json` (checked in, reviewable) merged with the version from `mcp/package.json` into `.publish/package.json` by `scripts/publish.mjs`. Chosen (c). `.publish/` is git-ignored.

### D2. Layout additions
```
mcp/
  src/adapters/ai-sdk/index.ts        # createAiSdkTools
  src/adapters/langchain/index.ts     # createLangChainTools
  src/adapters/options.ts             # shared AdapterOptions + buildToolset()
  src/mcp/index.ts                    # re-exports createContentoolsMcpServer (+ types)
  src/stdio/index.ts                  # bin: contentools-mcp (stdio)
  tsup.config.ts
  publish/package.template.json  publish/README.md
  scripts/publish.mjs  scripts/verify-package.mjs
  tests/adapters/*.test.ts  tests/stdio/*.test.ts  tests/compat/ (matrix runner)
```
`tsconfig.build.json` (Connect build) already excludes `src/adapters`; add `src/stdio` to the exclude list so the app image contains no adapter code.

### D3. Adapter options and behaviour
```ts
export interface AdapterOptions {
  baseUrl: string;                      // ends with /service
  token: string;                        // SERVICE_API_TOKEN-equivalent bearer
  defaultBusinessUnitKey?: string;      // default 'default'
  groups?: 'all' | ToolGroup[];         // default 'all'
  enableWrites?: boolean;               // default false (same least-privilege default as the app)
  timeoutMs?: number;                   // default 15000
  fetch?: typeof fetch;                 // injection for tests/proxies
}
```
`buildToolset(opts)` validates (https or localhost, token >= 32 chars is NOT enforced here: library users may point at dev services; only non-empty), builds one `ContentoolsClient`, returns `{ tools: selectTools(...), run: (tool,args)=>runTool(tool,args,{client,ctx}) }`. Adapters map each definition: AI SDK `tool({ description, inputSchema: z.object(shape).strict(), execute: async (a) => (await run(t, a)).text })`; LangChain `new DynamicStructuredTool({ name, description, schema, func: async (a) => (await run(t, a)).text })`. Errors are returned as text (not thrown) so an agent loop can recover; this matches the source behaviour for service errors, and is stricter for validation (strict schemas).
Source API `new ContentToolsAgent({ authConfig })` is dropped (BREAKING, noted in README migration table).

### D4. Build: tsup, CJS + ESM + dts, no bundling of peers
Verified config (explore 4): `entry` object with `index`, `ai-sdk/index`, `langchain/index`, `mcp/index`, `stdio/index`; `format: ['cjs','esm']`, `dts: true` (not for stdio), `outDir: dist`, `target: node22`, `clean`, `external: ['ai','@langchain/core','zod','@modelcontextprotocol/sdk']`. The bin is built from `src/stdio/index.ts` with `banner: { js: '#!/usr/bin/env node' }` (config entry via a second array element, CJS only, no dts). `target: node22` (the app runs Node 22 and tests run on 22); `engines.node` is `>=20` (global `fetch`, `FormData`, `AbortSignal.timeout` are available; Q-N4).

### D5. Exports map (verified with publint + attw)
```json
"exports": {
  ".":          { "import": {"types":"./dist/index.d.mts","default":"./dist/index.mjs"}, "require": {"types":"./dist/index.d.ts","default":"./dist/index.js"} },
  "./ai-sdk":   { "import": {"types":"./dist/ai-sdk/index.d.mts","default":"./dist/ai-sdk/index.mjs"}, "require": {"types":"./dist/ai-sdk/index.d.ts","default":"./dist/ai-sdk/index.js"} },
  "./langchain":{ ... same pattern ... },
  "./mcp":      { ... same pattern ... },
  "./package.json": "./package.json"
},
"typesVersions": { "*": { "ai-sdk": ["dist/ai-sdk/index.d.ts"], "langchain": ["dist/langchain/index.d.ts"], "mcp": ["dist/mcp/index.d.ts"] } },
"main": "./dist/index.js", "module": "./dist/index.mjs", "types": "./dist/index.d.ts",
"bin": { "contentools-mcp": "./dist/stdio/index.js" },
"type": "commonjs", "sideEffects": false, "engines": { "node": ">=20" }, "license": "MIT",
"files": ["dist", "README.md", "LICENSE"], "publishConfig": { "access": "public" }
```
(The root export carries the core: types, `selectTools`, `ALL_TOOLS`, `ContentoolsClient`, `runTool`, `defineTool` so users can build their own adapter for another framework.)

### D6. Peers
`zod ^3.25.0 || ^4.0.0` (required); `ai ^6.0.0 || ^7.0.0`, `@langchain/core ^0.3.0 || ^1.0.0`, `@modelcontextprotocol/sdk >=1.27.0 <2` all `peerDependenciesMeta.optional`. Evidence: matrix runs in explore 4.3 (A: ai 6.0.116 / lc 0.3.80 / zod 3.25.76; B: ai 7.0.134 / lc 1.2.17 / zod 4.6.5). `zod` must remain a peer so the schemas share the consumer's zod instance (ai/langchain read them via zod internals).
The core restricts itself to the zod API subset common to 3.25 and 4 (M design/tasks 3.x pitfall); the compat test enforces it.

### D7. Local publish script (no CI)
`scripts/publish.mjs` steps (fail fast, each prints a header): (1) assert clean preconditions: Node >= 22, `npm whoami` works (else instruct `npm login`), cwd is `mcp/`; (2) `yarn check`; (3) `yarn build:npm`; (4) assemble `.publish/`: copy `dist/`, `publish/README.md` as `README.md`, repo `LICENSE`, and write `package.json` = template + `{name, version}` (+ assertion: no `private`, no `workspace:`/`file:` ranges, no `scripts` key, no `dependencies` key); (5) `node scripts/verify-package.mjs` (publint, attw `--pack`, tarball smoke in a temp dir, compat matrix); (6) registry check `npm view <name>@<version>` must 404; (7) `npm publish ./.publish --access public [--tag next if prerelease] --dry-run` by default; with `--publish`, print name/version/tag and require typing `publish <name>@<version>`; npm prompts for 2FA OTP itself. No `--provenance` (needs CI OIDC), no tokens in files. Dist-tag: prerelease -> `next`; stable -> `latest`.

### D8. Documentation
`publish/README.md` is the npm landing page (unsupported banner, install, three usage snippets, option table, security note on tokens/writes, migration table from `@commercetools-demo/contenttools-mcp`, link to the Connect app docs). It deliberately differs from `mcp/README.md` (app operations).

### D9. Verification stack
Unit (jest): option validation, adapters vs mocked service (msw), catalog parity (names equal `ALL_TOOLS`), strictness, error-as-text, three-way identical request test. Package (`verify-package.mjs`): publint, attw, tarball smoke (temp project, `npm i <tgz> ai @langchain/core zod`, CJS `require` + ESM `import()` of every subpath, run one tool with fake fetch). Matrix: same smoke twice with the two peer sets (A/B above). stdio: spawn `node dist/stdio/index.js` with env and talk to it with the SDK `StdioClientTransport`; plus Inspector CLI one-liner.

## Risks / Trade-offs
- ai 8 / langchain 2 / zod 5 may break peers: ranges are capped; matrix is cheap to extend.
- `typesVersions` + exports duplication: verified necessary for node10 (attw).
- A second import path to the core (`.` and `./ai-sdk` share a chunk) can duplicate `ContentoolsClient` classes in dual-mode (CJS vs ESM) installs; no `instanceof` on our own classes is required by users; errors are text.
- Publishing from a laptop is manual and unprovenanced: accepted by owner decision.
- npm scope ownership (M-07) and 2FA must be ready; script cannot do those.

## Migration Plan
Package is new under the new name; deprecate nothing (old `@commercetools-demo` package is outside this repo). Rollback of a bad publish: `npm deprecate @commercetools-labs/contentools-mcp@<v> "<reason>"` (unpublish only within 72 h and per npm policy); fix forward with a new patch.

## Open Questions
`questions.md` Q-N1..Q-N4, all with defaults. Q-07 default recorded: **Both**.
