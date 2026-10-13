## Conventions

* Repo root = `/Users/behnam/code/commercetools-labs/contentools` (`<root>`); work in `<root>/mcp/` unless a path starts with `<root>`.
* Every `.ts/.js/.mjs/.cjs` file starts with the SPDX header:
```ts
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
* No "cms", no "demo/POC", **no Mastra**, **no CI/GitHub Actions wording**: publishing is a local script.
* Vocabulary: **npm package** = tarball of files published to the npm registry. **Subpath export** = `import x from 'pkg/ai-sdk'`. **Dual package** = ships CommonJS (`require`) and ESM (`import`). **Peer dependency** = a library the *consumer* installs (so one copy is shared). **AI SDK** = Vercel `ai` package (`tool()`, `generateText`). **LangChain** = `@langchain/core` (`DynamicStructuredTool`). **tsup** = bundler that emits JS + `.d.ts`. **publint / attw** = linters that check a package's `exports` against how Node, bundlers and TypeScript resolve it.
* **This spec is optional (Q-07/Q-N1) and off the critical path.** If the owner answers "HTTP only", do nothing here; M stays complete.
* Scratch experiments backing these snippets (tsup output names, exports map, peer matrix) are recorded in `explore.md` section 4.

**Pre-conditions for the whole spec.** Spec M archived: `mcp/src/core/index.ts` exports `ALL_TOOLS, selectTools, parseGroups, ContentoolsClient, ServiceError, ToolInputError, runTool, defineTool, types`; `mcp/src/mcp/server.ts` exports `createContentoolsMcpServer({tools, client, ctx, correlationId?, onToolResult?})`; `yarn test` and `yarn gcp-build` pass in `mcp/`.

---

## 1. Adapter options and toolset builder

**Context.** One function turns user options into a configured client plus the filtered tool list, so both adapters (and the stdio entry) behave identically.
**Pre-conditions.** As above.

- [x] 1.1 Install dev tools (no runtime deps change): `cd <root>/mcp && yarn add -D tsup@^8.5.1 ai@^6.0.116 @langchain/core@^0.3.80 publint @arethetypeswrong/cli`. (Dev versions pick the **older** end of each peer range; the matrix in section 6 covers the newer end.) **Done when** `npm ls tsup ai @langchain/core` lists them and `yarn gcp-build` still passes (adapters are excluded from it).
- [x] 1.2 Create `src/adapters/options.ts`:
```ts
import { ContentoolsClient, selectTools, runTool, type AnyToolDefinition, type ToolGroup } from '../core';
export interface AdapterOptions {
  baseUrl: string; token: string; defaultBusinessUnitKey?: string;
  groups?: 'all' | ToolGroup[]; enableWrites?: boolean; timeoutMs?: number; fetch?: typeof fetch;
}
export interface Toolset { tools: AnyToolDefinition[]; run(tool: AnyToolDefinition, args: unknown): Promise<string> }
export function buildToolset(o: AdapterOptions): Toolset {
  if (!o.baseUrl || !/^https?:\/\//.test(o.baseUrl)) throw new Error('baseUrl must be an http(s) URL ending in /service');
  if (!o.token) throw new Error('token is required');
  const client = new ContentoolsClient({ baseUrl: o.baseUrl, token: o.token, timeoutMs: o.timeoutMs ?? 15000, fetchImpl: o.fetch });
  const ctx = { defaultBusinessUnitKey: o.defaultBusinessUnitKey ?? 'default' };
  return {
    tools: selectTools({ groups: o.groups ?? 'all', enableWrites: o.enableWrites ?? false }),
    run: async (tool, args) => (await runTool(tool, args, { client, ctx })).text,
  };
}
```
  (If M's `ClientOptions.fetchImpl` is typed required-optional, pass `...(o.fetch ? { fetchImpl: o.fetch } : {})`.) **Done when** `npx tsc --noEmit` passes.
- [x] 1.3 Unit test `tests/adapters/options.test.ts`: bad URL throws; empty token throws; defaults (24 read tools, BU `default`); `enableWrites: true` -> 44; `groups: ['pages']` read-only -> 8. **Done when** green.

**Pitfalls.** Do **not** validate token length >= 32 here (library users may use dev tokens). Never log `token`. The returned `run` returns text and never throws for service/validation errors (that is `runTool`'s contract).
**Verification.** `npx jest tests/adapters/options`. **Rollback.** Delete `src/adapters/options.ts`.

---

## 2. AI SDK adapter

**Context.** `ai` exports `tool({ description, inputSchema, execute })`; the result goes into `generateText({ tools })`.

- [x] 2.1 Create `src/adapters/ai-sdk/index.ts` (shape verified against ai 6.0.116 and 7.0.134):
```ts
import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { buildToolset, type AdapterOptions } from '../options';
export type { AdapterOptions } from '../options';
export function createAiSdkTools(options: AdapterOptions): Record<string, Tool> {
  const { tools, run } = buildToolset(options);
  const out: Record<string, Tool> = {};
  for (const t of tools) {
    out[t.name] = tool({
      description: t.description,
      inputSchema: z.object(t.shape).strict(),
      execute: async (args: Record<string, unknown>) => run(t, args),
    });
  }
  return out;
}
```
  **Done when** `npx tsc --noEmit` passes.
- [x] 2.2 Test `tests/adapters/ai-sdk.test.ts` with msw: default is 24 tools and has no `create_puck_page`; with `enableWrites` has it; call `tools.get_puck_page.execute({ key: 'a b' }, { toolCallId: '1', messages: [] })` -> msw saw `GET http://svc.test/service/default/puck-pages/a%20b` with `Authorization: Bearer <token>`; 404 -> resolves (does not reject) to a string starting `Service returned 404`; extra key `token` -> string starting `Invalid input`. Use msw's `setupServer` with `onUnhandledRequest: 'error'` (no supertest here). **Done when** green.

**Pitfalls.** `execute`'s second argument differs between ai versions; do not use it. Do not pass `strict` flags that exist only in v7.
**Rollback.** Delete `src/adapters/ai-sdk`.

---

## 3. LangChain adapter

- [x] 3.1 Create `src/adapters/langchain/index.ts`:
```ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { buildToolset, type AdapterOptions } from '../options';
export type { AdapterOptions } from '../options';
export function createLangChainTools(options: AdapterOptions): DynamicStructuredTool[] {
  const { tools, run } = buildToolset(options);
  return tools.map((t) => new DynamicStructuredTool({
    name: t.name, description: t.description, schema: z.object(t.shape).strict(),
    func: async (args: Record<string, unknown>) => run(t, args),
  }));
}
```
- [x] 3.2 Test `tests/adapters/langchain.test.ts`: `tools.find(t => t.name==='get_puck_page').invoke({ key: 'k' })` -> service saw `GET .../default/puck-pages/k`; names equal the AI SDK adapter's names; unknown-key input rejects (LangChain throws a `ToolInputParsingException` for schema failures: assert `rejects.toThrow()`; document that difference in the npm README). **Done when** green.

**Pitfalls.** `@langchain/core` 0.3 and 1.x both accept a zod object `schema`; if a future major wants a different schema type, only this file changes.
**Rollback.** Delete `src/adapters/langchain`.

---

## 4. MCP server factory export and stdio entry

**Context.** Lets users run the same tools in their own MCP server (any transport) or via `npx contentools-mcp` over stdio, the successor of the source's `bin/run-mcp.cjs`.

- [x] 4.1 Create `src/mcp/index.ts`: `export { createContentoolsMcpServer } from './server'; export type { /* options type from server.ts */ } from './server';`. Ensure `src/mcp/server.ts` has no import of Express/logger (M requirement). **Done when** `grep -n "express\|server/logger" src/mcp/*.ts` prints nothing.
- [x] 4.2 Create `src/stdio/index.ts`:
```ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContentoolsClient, selectTools, parseGroups } from '../core';
import { createContentoolsMcpServer } from '../mcp';
function need(n: string): string { const v = process.env[n]; if (!v) { process.stderr.write(`Missing environment variable ${n}\n`); process.exit(1); } return v; }
async function main() {
  const baseUrl = need('CONTENT_SERVICE_URL'); const token = need('SERVICE_API_TOKEN');
  const client = new ContentoolsClient({ baseUrl, token, timeoutMs: Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000) });
  const tools = selectTools({ groups: parseGroups(process.env.MCP_TOOL_GROUPS), enableWrites: process.env.MCP_ENABLE_WRITES === 'true' });
  const server = createContentoolsMcpServer({ tools, client, ctx: { defaultBusinessUnitKey: process.env.DEFAULT_BUSINESS_UNIT_KEY ?? 'default' } });
  await server.connect(new StdioServerTransport());
  process.stderr.write('contentools-mcp running on stdio\n');
}
main().catch((e: unknown) => { process.stderr.write(`contentools-mcp error: ${e instanceof Error ? e.message : 'unknown'}\n`); process.exit(1); });
```
  **Pitfall:** stdout belongs to JSON-RPC; **never** `console.log` here or in imported modules.
- [x] 4.3 Test `tests/stdio/stdio.test.ts`: after the build (task 5), spawn `node dist/stdio/index.js` with env pointing at a local msw-less fake service (reuse `tests/support/fake-service.ts` from M on a random port) using the SDK's `StdioClientTransport` (`@modelcontextprotocol/sdk/client/stdio.js`): `listTools` -> 24; with `MCP_ENABLE_WRITES=true` -> 44; `callTool get_puck_page` works; without `SERVICE_API_TOKEN` the process exits 1 and stderr names it. Mark the test `beforeAll(() => run build:npm)`. **Done when** green.

**Verification.** `npx -y @modelcontextprotocol/inspector --cli node dist/stdio/index.js --method tools/list` with env set -> JSON with the tool list.
**Rollback.** Delete `src/stdio`, `src/mcp/index.ts`.

---

## 5. Build with tsup and package manifest

**Context.** Produce `dist/` and a correct manifest. Everything here was verified in a scratch package (explore 4.1-4.2): CJS is `.js`, ESM is `.mjs`, declarations `.d.ts`/`.d.mts`.

- [x] 5.1 Create `tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';
const external = ['ai', '@langchain/core', 'zod', '@modelcontextprotocol/sdk', /^@modelcontextprotocol\/sdk\//, /^@langchain\/core\//];
export default defineConfig([
  { entry: { index: 'src/core/index.ts', 'ai-sdk/index': 'src/adapters/ai-sdk/index.ts', 'langchain/index': 'src/adapters/langchain/index.ts', 'mcp/index': 'src/mcp/index.ts' },
    outDir: 'dist', format: ['cjs', 'esm'], dts: true, sourcemap: true, clean: true, target: 'node22', external },
  { entry: { 'stdio/index': 'src/stdio/index.ts' }, outDir: 'dist', format: ['cjs'], dts: false, sourcemap: false, clean: false,
    target: 'node22', external, banner: { js: '#!/usr/bin/env node' } },
]);
```
  Add scripts to `mcp/package.json`: `"build:npm": "tsup"`, `"verify:package": "node scripts/verify-package.mjs"`, `"publish:npm": "node scripts/publish.mjs"`. Add `src/stdio` to `tsconfig.build.json` `exclude`. Add `dist`, `.publish` to `.gitignore`. **Done when** `yarn build:npm` creates exactly: `dist/{index,ai-sdk/index,langchain/index,mcp/index}.{js,mjs,d.ts,d.mts}`, `dist/stdio/index.js` (+ maps and one shared `client-*.d.ts`/`.d.mts` chunk) and `head -1 dist/stdio/index.js` is the shebang. Then `yarn gcp-build` still passes and `ls build` contains no `adapters` or `stdio` folder.
- [x] 5.2 Make the stdio file executable in the tarball: tsup does not set modes; npm sets bin permissions on install, so no action. **Done when** `tar -tvf` of the packed tarball (task 6) shows the bin path present.
- [x] 5.3 Create `publish/package.template.json` (no `name`/`version`: injected):
```json
{
  "description": "AI SDK, LangChain and MCP tools for the Contentools content service",
  "license": "MIT",
  "type": "commonjs",
  "sideEffects": false,
  "engines": { "node": ">=20" },
  "main": "./dist/index.js", "module": "./dist/index.mjs", "types": "./dist/index.d.ts",
  "bin": { "contentools-mcp": "./dist/stdio/index.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "keywords": ["commercetools", "contentools", "mcp", "model-context-protocol", "ai-sdk", "langchain", "puck"],
  "repository": { "type": "git", "url": "git+https://github.com/commercetools/contentools.git", "directory": "mcp" },
  "exports": { "...": "per design D5, five entries incl. ./package.json" },
  "typesVersions": { "*": { "ai-sdk": ["dist/ai-sdk/index.d.ts"], "langchain": ["dist/langchain/index.d.ts"], "mcp": ["dist/mcp/index.d.ts"] } },
  "peerDependencies": { "zod": "^3.25.0 || ^4.0.0", "ai": "^6.0.0 || ^7.0.0", "@langchain/core": "^0.3.0 || ^1.0.0", "@modelcontextprotocol/sdk": ">=1.27.0 <2" },
  "peerDependenciesMeta": { "ai": { "optional": true }, "@langchain/core": { "optional": true }, "@modelcontextprotocol/sdk": { "optional": true } }
}
```
  Expand `exports` fully (copy the block from `design.md` D5, writing the `./langchain` and `./mcp` entries out; JSON has no ellipsis). The repository URL is the Q-08 default; if the owner changes it, edit here. **Done when** `node -e "JSON.parse(require('fs').readFileSync('publish/package.template.json','utf8'))"` exits 0.
- [x] 5.4 Write `publish/README.md` (npm landing page): unsupported banner (same text as spec P standard), what/why, install (`npm i @commercetools-labs/contentools-mcp zod ai`), three snippets (AI SDK with `generateText`, LangChain, MCP/stdio with `npx -y @commercetools-labs/contentools-mcp` and the env table), **options table** (from design D3), **security** (token sent only to `baseUrl`; writes off by default and why; do not expose the token to browsers), **error behaviour** (service/validation errors are returned as text; LangChain throws on schema failures), **migration table** from `@commercetools-demo/contenttools-mcp` (`ContentToolsAgent({authConfig})` -> `createAiSdkTools({baseUrl, token})`; `projectKey`, `jwtToken`, tenant tools removed; tool names changed: list from `m-mcp-connect-app/design.md`; media listing is cursor-paginated (`list_media` takes `limit`/`cursor`/`extensions`, returns `pagination.nextCursor`/`hasMore`; no `page`)), link to the Connect app docs (`mcp/README.md`). **No Mastra mention.** **Done when** `grep -ni mastra publish/README.md` is empty.

**Pitfalls.** (1) tsup treats an `external` regex array fine; do not bundle `zod` (would break instance sharing). (2) `typesVersions` is required for node10 subpaths (attw fails without it). (3) Do not set `"type": "module"`; the `.mjs`/`.js` naming relies on CJS default.
**Rollback.** `rm -rf dist tsup.config.ts publish`; revert `package.json` scripts and `.gitignore`.

---

## 6. Package verification script

**Context.** One command proves the tarball works for real consumers, with both ends of the peer ranges.

- [x] 6.1 Create `scripts/verify-package.mjs` taking `--dir .publish` (default). Steps, each printing `== <name> ==` and aborting non-zero on failure:
  1. `npx publint <dir>` -> must print no "Errors"/"Warnings" (suggestions allowed).
  2. `npx @arethetypeswrong/cli --pack <dir>` (default profile) -> must contain `No problems found`.
  3. `npm pack <dir> --pack-destination <tmp>`; list files with `tar -tzf`; fail if any path outside `package/{dist,README.md,LICENSE,package.json}` appears (spec scenario "tarball contents").
  4. Matrix: for each set `A = ai@6 @langchain/core@0.3 zod@3.25 @modelcontextprotocol/sdk@1.27.1`, `B = ai@7 @langchain/core@1 zod@4 @modelcontextprotocol/sdk@1.32.1`: create temp dir, `npm init -y`, `npm i <tgz> <set>`, then run `smoke.cjs` (CJS `require` of `.`, `/ai-sdk`, `/langchain`, `/mcp`) and `smoke.mjs` (`await import(...)`), each constructing the adapter with a fake `fetch` and executing `get_puck_page` expecting the URL `http://svc.test/service/default/puck-pages/k`; for `/mcp` build the server object and assert `typeof server.connect === 'function'`; for the bin, spawn `node node_modules/.bin/contentools-mcp` without env and expect exit code 1 and `SERVICE_API_TOKEN`/`CONTENT_SERVICE_URL` in stderr.
  5. TypeScript consumer check in the temp dir: `yarn add -D typescript@5`, a `check.ts` importing every subpath, `tsc --noEmit --module nodenext --moduleResolution nodenext` and again with `--moduleResolution bundler --module esnext` -> exit 0.
  Use `execFileSync` (no shell string interpolation); temp dirs via `fs.mkdtempSync(path.join(os.tmpdir(), 'ctmcp-'))`; clean up in `finally`. **Done when** `node scripts/verify-package.mjs --dir .publish` ends with `ALL CHECKS PASSED` (after task 7.2 creates `.publish`; until then test against a manually assembled dir).

**Pitfalls.** The matrix needs network access to the npm registry; the script must say so and exit 2 (not 1) on registry/network failure to distinguish from real failures. Install steps take ~30-60 s each.
**Verification.** Run it; deliberately break the exports map (rename `./ai-sdk` types path) and confirm attw fails, then revert.
**Rollback.** Delete the script.

---

## 7. Local publish script

**Context.** No CI exists (owner decision). A person runs this on their machine; it defaults to a dry run.

- [x] 7.1 Create `scripts/publish.mjs` with flags `--publish` (real), `--tag <t>` (override), default dry-run. Implement the D7 steps in order, using `execFileSync` and printing each step:
  1. `node --version` major >= 22; cwd basename is `mcp`.
  2. `npm whoami` (only required when `--publish`; dry-run skips).
  3. `yarn check:app` and `yarn build:npm`.
  4. Assemble `.publish/`: `rm -rf .publish; mkdir`, copy `dist/`, copy `publish/README.md` -> `README.md`, copy `../LICENSE` -> `LICENSE` (abort if missing), write `package.json` = `{ name: '@commercetools-labs/contentools-mcp', version: <mcp/package.json version>, ...template }`. Assertions (throw with message): no `private`, no `scripts`, no `dependencies`/`devDependencies`, no value matching `/^(workspace|file|link):/` anywhere, `bin` target exists in `dist`, version is valid semver.
  5. `node scripts/verify-package.mjs --dir .publish`.
  6. Registry check: `npm view <name>@<version> version` -> if it prints a version, abort "already published"; a 404 is the expected case (distinguish E404 from other errors).
  7. Tag: prerelease (`/-/.test(version)`) -> `next`, else `latest` (unless `--tag`).
  8. Without `--publish`: `npm publish ./.publish --access public --tag <tag> --dry-run` and print "DRY RUN OK; re-run with --publish". With `--publish`: print package, version, tag, tarball file count; ask `Type "publish <name>@<version>" to continue:` via `readline`; mismatch -> abort; then `npm publish ./.publish --access public --tag <tag>` with `stdio: 'inherit'` so npm can ask for the OTP. **No** `--provenance`.
  **Done when** `node scripts/publish.mjs` (dry-run) completes, prints the file list (only `dist/**`, README, LICENSE, package.json) and exits 0.
- [x] 7.2 Add `tests/publish/assemble.test.ts` exporting and testing the pure helper `assembleManifest(template, pkg)` (move it to `scripts/lib/manifest.mjs`): rejects `private`, `scripts`, `workspace:` values; injects name/version; prerelease tag selection function `tagFor(version)` (`1.0.0-rc.0` -> `next`, `1.0.0` -> `latest`). **Done when** green.
- [x] 7.3 Do **not** run `--publish` as part of implementation. The final publish is a human step (manual.md MN-1..MN-3); record "dry run output attached" in the PR.

**Pitfalls.** (0) Dev workflow is Yarn 1 (`yarn.lock`, `yarn <script>`), but the **publish step deliberately stays `npm publish ./.publish`** (owner decision; `yarn publish` has different semantics, and the derived manifest has no lockfile). Consumer simulations in `verify-package.mjs` use `npm install` in temp dirs on purpose (what most users run). (1) `npm publish ./.publish` publishes the directory (not `mcp/`), so `files` and `private` of the app manifest are irrelevant; do not run plain `npm publish` in `mcp/` (it would fail on `private`, intentionally). (2) npm may print a "bin script name was cleaned" warning; ignore. (3) Never write an npm token into the repo or `.npmrc`; use `npm login`.
**Rollback.** Delete `scripts/publish.mjs`, `scripts/lib`, `.publish`. A wrong real publish: `npm deprecate` and publish a fixed patch (design Migration).

---

## 8. Cleanup of legacy artefacts and Mastra

- [x] 8.1 Confirm nothing of the old package remains in `mcp/` (M task 1.1 deleted it): `ls mcp` must not show `bin`, `ai-sdk`, `langchain`, `mastra` (a regenerated `yarn.lock` is expected and must be committed). If the old `clean` script or `.gitignore` entries `ai-sdk/*`, `langchain/*`, `mastra/*` exist, delete them. Add `"clean": "rm -rf dist build .publish"`.
- [x] 8.2 Grep gates (all must print nothing): `grep -rniE "mastra|zod-to-json-schema|AvailableNamespaces|contenttools|commercetools-demo|\bcms\b" <root>/mcp --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.publish`.
- [x] 8.3 SPDX check: `cd <root>/mcp && grep -L "SPDX-License-Identifier: MIT" $(git ls-files -co --exclude-standard 'src/**/*.ts' 'tests/**/*.ts' 'scripts/*.mjs' 'scripts/lib/*.mjs' tsup.config.ts)` prints nothing.

---

## 9. Documentation hooks

- [x] 9.1 In `mcp/README.md` (written by M) add a short "npm package" section: package name, install line, link to `publish/README.md`, and the sentence "Published manually with `yarn publish:npm` (dry run by default); there is no CI."
- [x] 9.2 Tell spec P that the npm README lives at `mcp/publish/README.md` and spec O/Q that the local checks for this spec are `yarn check:app && yarn build:npm && yarn verify:package` (after `node scripts/publish.mjs` created `.publish`). No workflow files are created or referenced.

---

## Definition of Done (maps to `specs/**` scenarios)

| Scenario | Evidence |
| --- | --- |
| Same catalog everywhere; identical behaviour | `tests/adapters/*` parity test (names equal `ALL_TOOLS`; one request asserted identical across ai-sdk, langchain, MCP via msw) |
| AI SDK read-only default / tool execution | 2.2 |
| LangChain invoke | 3.2 |
| Extra argument rejected | 2.2, 3.2 |
| stdio inspector / missing configuration | 4.3 + Inspector one-liner |
| No Mastra | 8.2 |
| Tarball contents | 6.1 step 3, 7.1 dry-run listing |
| Resolution checks (publint, attw) | 6.1 steps 1-2 |
| Consumer smoke + compatibility matrix | 6.1 steps 4-5 |
| Dry run default; refusing private/dirty/existing version | 7.1, 7.2 |
| App build unaffected | 5.1 (`yarn gcp-build` passes, `build/` has no adapters) and M's own tests still green |
| Labs rules | 8.2, 8.3, `publish/README.md` banner |
| Quality | `yarn check:app`, `yarn build:npm`, `yarn verify:package`, `node scripts/publish.mjs` (dry run) all exit 0 |
