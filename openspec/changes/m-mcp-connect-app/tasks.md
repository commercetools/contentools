## Conventions for every task below

* Repo root = `/Users/behnam/code/commercetools-labs/contentools` (written `<root>`). All new paths are relative to `<root>/mcp/` unless they start with `<root>`.
* **Every** `.ts/.js/.mjs/.cjs` file you create starts with this exact header (the snippets below omit it to save space):
```ts
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
* Never write the word "cms" (any case) in code, docs or env var names; never use "demo/POC/pre-sales" wording.
* Vocabulary (explained once): **MCP** = Model Context Protocol, the JSON-RPC protocol AI agents use to discover and call "tools". **Streamable HTTP** = the MCP transport where the client `POST`s JSON-RPC to one URL. **Stateless** = the server keeps nothing between requests (no `Mcp-Session-Id`). **Connect** = commercetools' hosting platform; a `service` application is an HTTP server it runs for you; `connect.yaml` declares it. **Business unit (BU)** = a key that scopes content (`/:businessUnitKey/...`). **Puck** = the visual page-builder library; a "puck page/content/template" is Puck JSON (`puckData`) stored as commercetools custom objects by the content service.
* A working scratch prototype of the core + server (tsc clean, 4 jest tests green) informed every snippet here; the snippets are therefore known-good shapes, but you still run the commands.

---

## 1. Scaffold the `mcp/` package

**Context.** Create an empty but buildable Node 22 TypeScript package in `mcp/`. It must be self-contained because Connect builds each app from its own folder (no workspaces, no imports from siblings).
**Pre-conditions.** Specs A (repo skeleton) and C (legacy `mcp` tools pruned/legacy removed) archived; `<root>/mcp/` exists (A copied the source tree there) or you create it. Node 22 (`node -v` prints `v22.x`), npm 10+. Specs E, F, H need not be archived to *write* code (contracts are in `design.md`), but E/F must be done before section 11 (live e2e).

- [x] 1.1 Clear the source copy. If `mcp/` still contains the old tree (`src/shared`, `src/ai-sdk`, `src/langchain`, `src/modelcontextprotocol`, `src/types`, `bin/`, `tsup.config.ts`, `yarn.lock` (the old one is stale: regenerate), `README.md`), delete all of it: `cd <root>/mcp && rm -rf src bin tsup.config.ts yarn.lock README.md node_modules ai-sdk langchain mastra`. (Reason: the legacy tools are removed by Q-02; the adapters come back in spec N from the new core; the Mastra mentions were stale, see `explore.md` section 2.) **Done when** `ls <root>/mcp` shows at most `package.json`, `tsconfig.json`, `.gitignore`.
- [x] 1.2 Create `package.json`:
```json
{
  "name": "@commercetools-labs/contentools-mcp",
  "version": "1.0.0",
  "private": true,
  "description": "Model Context Protocol server (Streamable HTTP) for the Contentools content service",
  "license": "MIT",
  "engines": { "node": ">=22" },
  "main": "build/server/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "gcp-build": "tsc -p tsconfig.build.json",
    "start": "node build/server/index.js",
    "start:dev": "tsx watch src/server/index.ts",
    "dev:fake": "tsx tests/support/dev-fake.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts",
    "test": "jest",
    "verify": "node scripts/verify-mcp.mjs",
    "check:app": "yarn typecheck && yarn test && yarn gcp-build",
    "connector:post-deploy": "node build/server/post-deploy.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.32.1",
    "express": "^4.21.2",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/express": "^4.17.21", "@types/jest": "^29.5.14", "@types/node": "^22.13.0", "@types/supertest": "^6.0.2",
    "jest": "^29.7.0", "msw": "^2.15.0", "supertest": "^7.0.0", "ts-jest": "^29.2.5", "tsx": "^4.21.0", "typescript": "^5.7.0"
  }
}
```
  `private: true` is deliberate and permanent: this is the Connect app manifest (spec N publishes a derived manifest instead). Note: Connect's build step compiles TypeScript, so `typescript` must be installable at build time (devDependencies are installed by the platform build; the template does the same). **Done when** `yarn install` succeeds and creates `yarn.lock` (Yarn 1 classic; commit it).
- [x] 1.3 Create `tsconfig.json` (editor/tests) and `tsconfig.build.json` (Connect build):
```json
// tsconfig.json
{ "compilerOptions": { "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext", "strict": true,
  "noUncheckedIndexedAccess": true, "skipLibCheck": true, "esModuleInterop": true, "outDir": "build", "rootDir": "." },
  "include": ["src", "tests", "scripts"] }
// tsconfig.build.json
{ "extends": "./tsconfig.json", "compilerOptions": { "rootDir": "src", "declaration": false, "sourceMap": true },
  "include": ["src"], "exclude": ["src/adapters", "**/*.test.ts"] }
```
  (The package is CommonJS: no `"type": "module"`, so imports are extensionless. Spec N adds `src/adapters` and excludes it from this build.) **Done when** `npx tsc --noEmit` exits 0 (it may report "no inputs" until 2.x exist; create `src/core/index.ts` containing only the header and `export {};` first).
- [x] 1.4 Create `jest.config.cjs`. msw 2 ships ESM-only helper packages, so they must be transformed (this exact config was verified):
```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: { '^.+\\.(t|m?j)sx?$': ['ts-jest', {
    tsconfig: { allowJs: true, module: 'commonjs', moduleResolution: 'node10', esModuleInterop: true, target: 'ES2022', strict: true, skipLibCheck: true },
    diagnostics: false } ] },
  transformIgnorePatterns: ['/node_modules/(?!(msw|@mswjs|@open-draft|rettime|until-async|strict-event-emitter|outvariant|is-node-process|headers-polyfill)/)'],
};
```
  **Done when** a trivial `tests/unit/smoke.test.ts` (`test('ok',()=>expect(1).toBe(1))`) passes with `yarn test` (delete it after 4.x exist).
- [x] 1.5 Create `.nvmrc` (`22`), `.gitignore` (`node_modules`, `build`, `.env`, `.env.e2e`, `coverage`), `.env.example`:
```
CONTENT_SERVICE_URL=http://localhost:8080/service
MCP_ACCESS_TOKEN=change-me-to-a-random-value-of-32-chars-or-more
SERVICE_API_TOKEN=change-me-to-a-random-value-of-32-chars-or-more
DEFAULT_BUSINESS_UNIT_KEY=default
MCP_ENABLE_WRITES=false
MCP_TOOL_GROUPS=all
MCP_ALLOWED_ORIGINS=
MCP_REQUEST_TIMEOUT_MS=15000
```
  Copy the MIT `LICENSE` from `<root>/LICENSE` (created by spec A). **Done when** `git check-ignore -v .env` (in a scratch repo) or visual review shows `.env` ignored and no real secret is present.

**Pitfalls.** (1) Package manager is **Yarn 1 classic** (owner decision) for this app: commit `yarn.lock`, install with `yarn install --frozen-lockfile`, never create `package-lock.json`, and never run `npm install` here (puck is the only Yarn 4 part of the repo). Yarn 1 has a **built-in `yarn check`** command (lockfile integrity) that shadows a script of that name, which is why the aggregate script is called `check:app`. (2) Do not add a `"workspaces"` field anywhere. (3) On macOS `sed -i` needs `''`; prefer editing files directly.
**Verification.** `cd <root>/mcp && yarn install --frozen-lockfile && yarn typecheck && yarn test` -> exit 0.
**Rollback.** `rm -rf <root>/mcp/{node_modules,yarn.lock,build}`; nothing else is touched.

---

## 2. Core: types, predicate builder, HTTP client

**Context.** `src/core` is the transport-neutral heart (later reused by npm adapters, spec N): tool *definitions* are data (name, zod schema, a pure function that builds the service request), and one small client performs the HTTP call. It must import only `zod` and Node built-ins, never `express` or the MCP SDK, so adapters stay light. (Design D1, D4.)
**Pre-conditions.** Section 1 done.

- [x] 2.1 Create `src/core/types.ts` (the exact contract from `design.md` D4):
```ts
import type { z } from 'zod';
export const TOOL_GROUPS = ['pages','contents','templates','configuration','datasources','products','media','content-types'] as const;
export type ToolGroup = (typeof TOOL_GROUPS)[number];
export interface RequestContext { defaultBusinessUnitKey: string }
export interface ServiceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string; // relative to CONTENT_SERVICE_URL, percent-encoded, may contain ?query
  body?: unknown;
  multipart?: { fields: Record<string, string>; file?: { name: string; contentBase64: string } };
}
export interface ToolDefinition<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string; title: string; description: string; group: ToolGroup; access: 'read' | 'write';
  shape: S;
  request(input: z.infer<z.ZodObject<S>>, ctx: RequestContext): ServiceRequest;
}
export type AnyToolDefinition = ToolDefinition<z.ZodRawShape>;
/** Erases the shape generic so heterogeneous tools fit in one array while the callback stays typed. */
export function defineTool<S extends z.ZodRawShape>(def: ToolDefinition<S>): AnyToolDefinition {
  return def as unknown as AnyToolDefinition;
}
```
  **Done when** `npx tsc --noEmit` passes.
- [x] 2.2 Create `src/core/predicate.ts` (injection defence, design D6):
```ts
const CONTROL = /[\u0000-\u001f\u007f]/;
export class ToolInputError extends Error {}
export function quote(value: string): string {
  if (value.length === 0 || value.length > 200) throw new ToolInputError('value must be 1-200 characters');
  if (CONTROL.test(value)) throw new ToolInputError('value must not contain control characters');
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; // backslash first, then quote
}
export const buildEqualsPredicate = (field: string, value: string): string => `${field} = ${quote(value)}`;
```
  **Done when** unit test (task 4.1) proves `buildEqualsPredicate('slug','/x" OR key = "y')` === `slug = "/x\" OR key = \"y"`.
- [x] 2.3 Create `src/core/client.ts` with `ServiceError` and `ContentoolsClient` (verified shape). Requirements: constructor options `{ baseUrl, token, timeoutMs, fetchImpl? }`; `execute(req, correlationId?)` sets headers `Authorization: Bearer <token>`, `x-source: mcp`, `Accept: application/json`, optional `x-correlation-id`; JSON body -> `Content-Type: application/json`; multipart -> `FormData` with `file` built from `Buffer.from(base64,'base64')`; `AbortSignal.timeout(timeoutMs)`; maps timeout -> `ServiceError(504,'Service request timed out after N ms')`, network error -> `ServiceError(502,'Service is unreachable')` (never include the cause: it may contain the URL); non-2xx -> `ServiceError(status, text)` where, for the spec-E error body `{ message, statusCode, correlationId, code?, errors? }`, `text` = `Service returned <status>` + (` <code>` if present) + `: <message>` + (` (correlationId <id>)` if present) + (` ` + compact JSON of `errors` if present), truncated to 500 chars in total; a non-JSON body uses the raw text instead of `<message>`; 2xx with empty body (204) -> `undefined`. Use Node 22 global `fetch`/`FormData`/`Blob` (no dependency). Copy the body from the scratch prototype shape in `design.md` D4/D8 and this list. **Done when** typecheck passes and task 4.2 tests pass.
- [x] 2.4 Create `src/core/errors.ts` re-exporting `ServiceError` and `ToolInputError` (so adapters import from one place), `src/core/run.ts` and `src/core/format.ts`. `run.ts` is the single place that turns a tool call into text, used by the MCP server now and by the npm adapters in spec N:
```ts
import type { AnyToolDefinition, RequestContext } from './types';
import { ContentoolsClient, ServiceError } from './client';
import { ToolInputError } from './predicate';
import { formatToolOutput } from './format';
export interface ToolRunResult { ok: boolean; text: string }
export async function runTool(tool: AnyToolDefinition, args: unknown, deps: { client: ContentoolsClient; ctx: RequestContext; correlationId?: string }): Promise<ToolRunResult> {
  try {
    const input = z.object(tool.shape).strict().parse(args); // adapters that skip SDK validation still get strictness
    return { ok: true, text: formatToolOutput(await deps.client.execute(tool.request(input, deps.ctx), deps.correlationId)) };
  } catch (e) {
    if (e instanceof ServiceError || e instanceof ToolInputError) return { ok: false, text: e.message };
    if (e instanceof z.ZodError) return { ok: false, text: `Invalid input: ${e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`.slice(0, 500) };
    return { ok: false, text: 'Unexpected error' };
  }
}
```
(add `import { z } from 'zod';`). `format.ts`:
```ts
export function formatToolOutput(result: unknown): string {
  if (result === undefined) return 'OK (no content)';
  return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}
```
  (Replaces the source `mcp/src/shared/format.ts`, which returned `''` for empty results; an empty string confuses models.) **Done when** compiled.

**Pitfalls.** The source `api.ts` let tool arguments override `projectKey`/`jwtToken`: do **not** port that. `encodeURIComponent` every path segment (task 3). Never put `req.body` or tokens in thrown messages.
**Verification.** `npx tsc --noEmit`; tests in section 4.
**Rollback.** Delete `src/core`.

---

## 3. Core: the 44 tool definitions

**Context.** Author the catalog exactly as the table in `design.md` ("Tool catalog"). Reference material: route behaviour in `explore.md` section 3; source shapes to borrow descriptions/schemas from: `/Users/behnam/code/cms/mcp/src/shared/configuration/tools.ts`, `datasource/tools.ts`, `file/tools.ts` (everything else is new). Puck value types: `/Users/behnam/code/cms/puck/packages/puck-types/src/{puck-page,puck-content,puck-template}.types.ts`.
**Pre-conditions.** Section 2 done.

- [x] 3.1 Create `src/core/schemas.ts` with shared schemas:
```ts
import { z } from 'zod';
export const businessUnitKey = z.string().min(1).max(128).optional()
  .describe('Business unit key. Omit to use the server default.');
export const itemKey = (what: string) => z.string().min(1).max(256).describe(`${what} key`);
export const PuckDataSchema = z.object({
  content: z.array(z.record(z.string(), z.unknown())),
  root: z.record(z.string(), z.unknown()).optional(),
  zones: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
}).passthrough().describe("Puck editor data: { content: [...components], root?: {...}, zones?: {...} }");
export const CONFIG_SLICES = ['theme','header','facet','footer','site-metadata','category-listing','translations','b2b-account-menu-links'] as const;
export const seg = encodeURIComponent;
export const bu = (input: { businessUnitKey?: string | undefined }, def: string) => `/${seg(input.businessUnitKey ?? def)}`;
```
  **Done when** it compiles.
- [x] 3.2 Create `src/core/tools/pages.ts` with the 13 page tools. Because `puck-contents` has the same 13 routes, write a local factory only if it stays readable; otherwise write both files explicitly (explicit is preferred for greppable routes). Two verified examples (read and write):
```ts
defineTool({
  name: 'get_puck_page', title: 'Get Puck page', group: 'pages', access: 'read',
  description: 'Get one Puck page by key, including its draft and published states. Use list_puck_pages first to find keys.',
  shape: { businessUnitKey, key: itemKey('Page') },
  request: (i, c) => ({ method: 'GET', path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages/${seg(i.key)}` }),
}),
defineTool({
  name: 'query_published_puck_page', title: 'Find published page by slug', group: 'pages', access: 'read',
  description: 'Find the PUBLISHED page whose slug equals the given slug (for example "/home").',
  shape: { businessUnitKey, slug: z.string().startsWith('/').max(200) },
  request: (i, c) => ({ method: 'POST', path: `${bu(i, c.defaultBusinessUnitKey)}/published/puck-pages/query`,
    body: { query: buildEqualsPredicate('slug', i.slug) } }),
}),
defineTool({
  name: 'create_puck_page', title: 'Create Puck page', group: 'pages', access: 'write',
  description: 'Create a page as a draft. Does NOT publish; call publish_puck_page afterwards. WRITES data.',
  shape: { businessUnitKey, value: z.object({ name: z.string().min(1), slug: z.string().startsWith('/'),
    puckData: PuckDataSchema.optional(), meta: z.object({ title: z.string().max(200).optional(), description: z.string().max(2000).optional() }).passthrough().optional() }).strict() },
  request: (i, c) => ({ method: 'POST', path: `${bu(i, c.defaultBusinessUnitKey)}/puck-pages`, body: { value: i.value } }),
}),
```
  Implement the remaining page tools (rows 1-13 of the table) the same way: `list_puck_pages`, `get_published_puck_page`, `get_preview_puck_page`, `query_preview_puck_page`, `get_puck_page_states`, `get_puck_page_versions`, `update_puck_page` (`value` = same fields all optional, `.refine(v => Object.keys(v).length > 0, 'at least one field')`), `delete_puck_page`, `publish_puck_page` (path suffix `?clearDraft=true` only when `clearDraft === true`), `revert_puck_page_draft`. Descriptions must say "PUBLISHED", "PREVIEW (draft if present)" or "WRITES data" so an LLM chooses correctly. **Done when** the catalog test (4.3) lists these 13.
- [x] 3.3 Create `src/core/tools/contents.ts` (13 tools, rows 14-26): same as pages with `puck-contents`, `contentType` instead of `slug`, `value: { name, contentType, data?: PuckData, meta?: { description?, tags?: string[] }.passthrough() }`; `list_puck_contents` takes optional `contentType` -> `?contentType=<encoded>`; `query_*_puck_content` take `field: z.enum(['key','name','contentType'])` + `value: z.string()` -> `buildEqualsPredicate(i.field, i.value)`. **Done when** catalog test passes.
- [x] 3.4 Create `src/core/tools/templates.ts` (rows 27-30): `list_puck_templates` (`kind?: z.enum(['page','content'])` -> `?kind=`), `get_puck_template`, `create_puck_template` (`value: { name, kind, puckData: PuckDataSchema }`), `delete_puck_template`.
- [x] 3.5 Create `src/core/tools/configuration.ts` (rows 31-34) with `slice: z.enum(CONFIG_SLICES)`: `list_configurations` -> `GET /:bu/configuration`; `get_configuration`, `upsert_configuration` (`value: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])`, `PUT`), `delete_configuration`. Description of `upsert_configuration` must list what each slice holds (theme = design tokens object; b2b-account-menu-links = array of `{label, href}`; others free JSON).
- [x] 3.6 Create `src/core/tools/datasources.ts` (rows 35-40). Datasource paths have **no BU segment**. Schema for create/update `value`: `{ name: string, key: string, params: {key:string,type:string,required:boolean}[], deployedUrl: string.url() }` (borrow from `/Users/behnam/code/cms/mcp/src/shared/datasource/tools.ts`). Add to descriptions: "the service calls `deployedUrl`; only register URLs you trust".
- [x] 3.7 Create `src/core/tools/products.ts` (row 41): `search_products` -> `GET /products/search?text=<enc>&limit=<n>&locale=<enc>` (protected read since spec E; works because the app sends the service token) (omit params the caller left out: the service defaults limit 20, locale `en-US`). Constraints from `service/src/routes/product.route.ts`: limit max 50.
- [x] 3.8 Create `src/core/tools/media.ts` (rows 42-43): `list_media` and `upload_media`. **`list_media` follows spec G's cursor pagination** (`/Users/behnam/code/commercetools-labs/contentools/openspec/changes/g-service-media-storage/specs/media-library/spec.md`; there is **no** `page`, `totalItems` or `totalPages`; the source tool's `page` argument is dropped):
```ts
shape: { businessUnitKey,
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).max(2048).optional().describe('Opaque cursor: pass pagination.nextCursor from the previous response to get the next page'),
  extensions: z.array(z.string().regex(/^[A-Za-z0-9]{1,10}$/)).min(1).max(20).optional() },
request: (i, c) => { const q = new URLSearchParams(); if (i.limit) q.set('limit', String(i.limit)); if (i.cursor) q.set('cursor', i.cursor); if (i.extensions) q.set('extensions', i.extensions.join(',')); const s = q.toString(); return { method: 'GET', path: `${bu(i, c.defaultBusinessUnitKey)}/media-library${s ? `?${s}` : ''}` }; },
```
  The description must say "returns `{ files, pagination: { limit, nextCursor, hasMore } }`; keep calling with `nextCursor` while `hasMore` is true; a page may hold fewer than `limit` files when an extension filter is active". Note `URLSearchParams` encodes the comma as `%2C`. For `upload_media` mention in the description that a `501 MEDIA_NOT_CONFIGURED` means the service has no storage provider. `upload_media`:
```ts
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
shape: { businessUnitKey, fileName: z.string().min(1).max(255), fileContentBase64: z.string().min(1), title: z.string().optional(), description: z.string().optional() },
request: (i, c) => {
  const approxBytes = Math.floor((i.fileContentBase64.length * 3) / 4);
  if (approxBytes > MAX_UPLOAD_BYTES) throw new ToolInputError('File is larger than 5 MiB');
  return { method: 'POST', path: `${bu(i, c.defaultBusinessUnitKey)}/upload-file`,
    multipart: { fields: { title: i.title ?? '', description: i.description ?? '' }, file: { name: i.fileName, contentBase64: i.fileContentBase64 } } };
},
```
  (The service multipart field names are `file`, `title`, `description`: `service/src/routes/file.route.ts` lines 15-45.)
- [x] 3.9 Create `src/core/tools/content-types.ts` (row 44): `import_default_content_types` -> `POST /:bu/content-type/import` with body `{}` (spec F serves both `/:bu/content-type/import` and `/content-type/import`; the BU-scoped one is used).
- [x] 3.9b Datasource and query notes: `create_datasource`/`update_datasource`/`delete_datasource` may receive `409` for built-in datasources (spec F); mention it in the descriptions. The page/content `query_*` tools emit exactly one clause of the service grammar (`/Users/behnam/code/commercetools-labs/contentools/openspec/changes/f-service-content-api/design.md` section 5: `field = "value"`, `\"` and `\\` escapes, fields pages `slug|name|key`, contents `contentType|name|key`, max 512 chars), so the service never answers `400 Invalid query` for them.
- [x] 3.10 Create `src/core/registry.ts`:
```ts
import { TOOL_GROUPS, type AnyToolDefinition, type ToolGroup } from './types';
import { pagesTools } from './tools/pages'; /* ...the other seven imports... */
export const ALL_TOOLS: readonly AnyToolDefinition[] = [...pagesTools, ...contentsTools, ...templatesTools, ...configurationTools, ...datasourcesTools, ...productsTools, ...mediaTools, ...contentTypesTools];
export interface ToolSelection { groups: 'all' | readonly ToolGroup[]; enableWrites: boolean }
export function selectTools(sel: ToolSelection, all: readonly AnyToolDefinition[] = ALL_TOOLS): AnyToolDefinition[] {
  return all.filter((t) => (sel.groups === 'all' || sel.groups.includes(t.group)) && (t.access === 'read' || sel.enableWrites));
}
export function parseGroups(raw: string | undefined): 'all' | ToolGroup[] { /* 'all'|'' -> 'all'; split(','), trim; unknown -> throw Error(`Unknown MCP_TOOL_GROUPS entry: ${x}`) */ }
```
  and `src/core/index.ts` exporting: types, `defineTool`, `ALL_TOOLS`, `selectTools`, `parseGroups`, `ContentoolsClient`, `ServiceError`, `ToolInputError`, `formatToolOutput`, `runTool`. **Done when** `ALL_TOOLS.length === 44` (asserted by 4.3).

**Pitfalls.** (1) Names must be unique and snake_case. (2) Do not add `projectKey`, `jwtToken`, `baseUrl` to any shape. (3) zod: use only APIs common to zod 3.25 and 4 (`z.object/string/number/boolean/array/record(key,value)/enum/union/unknown`, `.optional/.min/.max/.url/.startsWith/.passthrough`) so spec N can ship the core with a `zod ^3.25 || ^4` peer. (4) `exactOptionalPropertyTypes` is off: `i.businessUnitKey` may be `undefined`; the `bu()` helper handles it. (5) Do not copy the legacy tool names/routes (`get_pages`, `content-items`, ...); a test greps for them.
**Verification.** Section 4.
**Rollback.** Delete `src/core/tools`, `registry.ts`.

---

## 4. Core unit tests

**Context.** Because `request()` is pure, every one of the 44 tools is tested without HTTP, plus the client with msw.
**Pre-conditions.** Section 3 done.

- [x] 4.1 `tests/unit/predicate.test.ts`: cases: plain, embedded `"`, backslash `\`, injection string from the design, empty, 201 chars, newline, NUL. Expect escapes/`ToolInputError`. **Done when** `npx jest tests/unit/predicate` passes.
- [x] 4.2 `tests/unit/client.test.ts` with msw `setupServer` (`onUnhandledRequest: 'error'`; no supertest here so no localhost carve-out needed). Cases: sends `Authorization: Bearer <token>`, `x-source: mcp`, `x-correlation-id`; JSON body; 204 -> `undefined`; 404 JSON `{message:'nope'}` -> `ServiceError(404,'Service returned 404: nope')`; 500 HTML text truncated to 500; timeout (`delay('infinite')` with `timeoutMs: 50`) -> status 504; connection refused (`HttpResponse.error()`) -> 502 and message has no URL; spec-E error body `{message:'Media storage is not configured', statusCode:501, correlationId:'c-1', code:'MEDIA_NOT_CONFIGURED'}` -> text `Service returned 501 MEDIA_NOT_CONFIGURED: Media storage is not configured (correlationId c-1)`; body with `errors:[{path:'slug',message:'required'}]` appended compactly and total <= 500; multipart upload: handler reads `await request.formData()` and asserts `file` name/bytes and `title`.
- [x] 4.3 `tests/support/catalog-fixture.ts` exporting `EXPECTED: Array<{name, access, method, path, input, body?}>` with **all 44 rows of the design table** using BU `default`; `tests/unit/catalog.test.ts`:
```ts
test('catalog equals the contract', () => {
  expect(ALL_TOOLS.map((t) => t.name).sort()).toEqual(EXPECTED.map((e) => e.name).sort());
  expect(ALL_TOOLS.filter((t) => t.access === 'read')).toHaveLength(24);
  expect(ALL_TOOLS.filter((t) => t.access === 'write')).toHaveLength(20);
});
test.each(EXPECTED)('$name builds $method $path', (e) => {
  const tool = ALL_TOOLS.find((t) => t.name === e.name)!;
  const input = z.object(tool.shape).strict().parse(e.input);
  const req = tool.request(input, { defaultBusinessUnitKey: 'default' });
  expect([req.method, req.path, req.body]).toEqual([e.method, e.path, e.body]);
});
test('no legacy surface', () => { for (const t of ALL_TOOLS) expect(JSON.stringify(t.request(...)))...; }); // grep names for content-items|/pages|page-items|proxy-script|compile-upload|authenticate-project|refresh-jwt
test('schemas reject credentials', () => { for (const t of ALL_TOOLS) expect(Object.keys(t.shape)).not.toEqual(expect.arrayContaining(['jwtToken'])); /* also projectKey, baseUrl, token */ });
test('path segments are encoded', ...); // key 'a/b c' -> 'a%2Fb%20c'
test('selectTools', ...); // default read-only 24; writes on 44; groups 'pages,products' read-only -> 8 + 1
```
  **Done when** `npx jest tests/unit` shows all green (>= 44 + ~15 tests).

**Verification.** `yarn test` -> "Tests: N passed". **Rollback.** Delete `tests/unit`.

---

## 5. Server: config, logger, auth

**Context.** Turn environment variables into a validated, typed config *once* at startup, and implement bearer auth. (Spec `mcp-auth`, `mcp-http-endpoint` fail-fast requirement.)
**Pre-conditions.** Section 4 done.

- [x] 5.1 `src/server/config.ts`: `loadConfig(env = process.env): Config` returning `{ port: 8080, serviceUrl: string, tokens: string[], serviceToken: string, defaultBusinessUnitKey, enableWrites: boolean, groups, allowedOrigins: Set<string>, timeoutMs }`. Collect **all** problems into one array and throw `new Error('Invalid environment configuration: ' + problems.join('; '))` (names only, never values). Rules: `CONTENT_SERVICE_URL` parses as URL, protocol `https:` or (`http:` and hostname `localhost`/`127.0.0.1`), strip trailing `/`; `MCP_ACCESS_TOKEN` split on `,`, trimmed, each >= 32 chars, at least one; `SERVICE_API_TOKEN` >= 32; `MCP_ENABLE_WRITES` in `true|false` (default `false`); `MCP_TOOL_GROUPS` via `parseGroups`; `MCP_REQUEST_TIMEOUT_MS` integer 1000..120000 (default 15000); `MCP_ALLOWED_ORIGINS` split on `,`; `DEFAULT_BUSINESS_UNIT_KEY` default `default`. **Done when** tests (5.4) pass.
- [x] 5.2 `src/server/logger.ts` (20 lines): `log(entry: Record<string, string|number|boolean|undefined>)` -> `process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n')`. Callers pass only: `msg, correlationId, method, tool, outcome, status, ms`. **Pitfall:** never pass `args`, `body`, headers or tokens.
- [x] 5.3 `src/server/auth.ts`:
```ts
import { createHash, timingSafeEqual } from 'node:crypto';
const digest = (s: string) => createHash('sha256').update(s).digest(); // fixed length => timingSafeEqual is safe
export function makeBearerMatcher(tokens: readonly string[]) {
  const accepted = tokens.map(digest);
  return (header: string | undefined): boolean => {
    const m = /^Bearer ([^\s]+)$/.exec(header ?? '');
    if (!m?.[1]) return false;
    const d = digest(m[1]);
    return accepted.reduce((ok, a) => timingSafeEqual(a, d) || ok, false); // no early exit
  };
}
```
  Origin check is inline in `app.ts` (6.2). **Done when** unit tests pass: matrix `undefined`, `''`, `'Basic x'`, `'Bearer'`, `'Bearer '`, `'bearer <ok>'` (lowercase scheme: accept? DEFAULT: reject, RFC allows case-insensitive but keep strict; document), `'Bearer wrong'`, prefix of the real token, real token + trailing space, real token with inner space -> false; real token -> true; either of two rotation tokens -> true.
- [x] 5.4 `tests/unit/config.test.ts`: valid minimal env; each missing/invalid variable produces a message containing the variable **name**; the thrown message never contains a token value (assert with a recognisable token `'T'.repeat(40)`); `MCP_TOOL_GROUPS=nope` fails; `http://example.com` fails, `http://localhost:8080/service` passes.

**Pitfalls.** `timingSafeEqual` throws on unequal lengths: hashing first avoids it. Do not log `Authorization`. Treat `MCP_ACCESS_TOKEN` equal to `SERVICE_API_TOKEN` as a configuration **problem** (separate secrets by design D3).
**Verification.** `npx jest tests/unit` green. **Rollback.** Delete the three files + tests.

---

## 6. Server: MCP glue, Express app, entrypoint

**Context.** Wire the core to the MCP SDK and Express, statelessly.
**Pre-conditions.** Section 5 done.

- [x] 6.1 `src/mcp/server.ts`: `createContentoolsMcpServer(o: { tools; client; ctx; correlationId?: string; onToolResult?: (e: { tool: string; ok: boolean; ms: number }) => void }): McpServer` (an `onToolResult` hook instead of importing the logger). For each tool: `server.registerTool(t.name, { title, description, inputSchema: z.object(t.shape).strict() }, handler)`. Handler: `const r = await runTool(t, args, { client, ctx, correlationId }); o.onToolResult?.({ tool: t.name, ok: r.ok, ms }); return r.ok ? { content:[{type:'text', text:r.text}] } : { isError:true, content:[{type:'text', text:r.text}] };` (`src/server/app.ts` passes `onToolResult` that calls `log({ msg:'mcp.tool', tool, outcome, ms, correlationId })`; `src/mcp/server.ts` therefore stays importable by spec N without Express). Verified: with `.strict()`, an extra `jwtToken` argument yields a result `isError: true` with `MCP error -32602: Input validation error ... Unrecognized key(s) in object: 'jwtToken'`.
- [x] 6.2 `src/server/app.ts`: `buildApp(deps)` where `deps = { config, client }`. Order (matters):
  1. `app.disable('x-powered-by')`.
  2. `app.get('/mcp/status', (_q, r) => r.json({ status: 'ok' }))` (before auth).
  3. `app.use('/mcp', gate)` where `gate` only acts when `req.path === '/'`: non-POST -> `405`, header `Allow: POST`, body `rpcError(-32000,'Method not allowed')`; `Origin` present and not allowed -> `403`; bearer invalid -> `401` + `WWW-Authenticate: Bearer realm="contentools-mcp"` + `rpcError(-32001,'Unauthorized')`; else `next()`. (Auth runs **before** body parsing so unauthenticated callers cannot make the server buffer 8 MB.)
  4. `app.post('/mcp', express.json({ limit: '8mb' }), handler)`; handler creates `selectTools({groups, enableWrites})` (compute once at boot, not per request), `randomUUID()` correlation id, a new MCP server and `new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`, `res.on('close', () => { void transport.close(); void server.close(); })`, `await server.connect(transport); await transport.handleRequest(req, res, req.body);`, and logs `{msg:'mcp.request', correlationId, method: req.body?.method, ms}` on close.
  5. Error middleware: `err.type === 'entity.parse.failed'` -> 400 `-32700`; `'entity.too.large'` -> 413 `-32600`; anything else -> log `{msg:'mcp.error', correlationId?, error: err.message}` (stack to stderr only) and `500 {"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal server error"},"id":null}`.
  Router mount path must equal `connect.yaml` `endpoint: /mcp` (Connect checklist "route path matches endpoint"). **Done when** the integration tests (7.x) pass. A verified prototype of this file exists in the design discussion; reproduce its structure.
- [x] 6.3 `src/server/index.ts`:
```ts
import { loadConfig } from './config';
import { buildApp } from './app';
import { ContentoolsClient } from '../core';
import { log } from './logger';
const config = (() => { try { return loadConfig(); } catch (e) { process.stderr.write(`${(e as Error).message}\n`); process.exit(1); } })();
const app = buildApp({ config, client: new ContentoolsClient({ baseUrl: config.serviceUrl, token: config.serviceToken, timeoutMs: config.timeoutMs }) });
app.listen(config.port, () => log({ msg: 'mcp.listening', port: config.port, writes: config.enableWrites }));
```
  Port is fixed `8080` (Connect convention; the template and service use it). **Done when** `cp .env.example .env && npx tsx --env-file=.env src/server/index.ts` prints a `mcp.listening` JSON line, and with `MCP_ACCESS_TOKEN` removed it prints `Invalid environment configuration: MCP_ACCESS_TOKEN ...` and exits 1.
- [x] 6.4 `src/server/post-deploy.ts` (read-only, idempotent):
```ts
// GET <CONTENT_SERVICE_URL>/<bu>/preview/puck-pages/__contentools_mcp_probe__ with the service token.
// Step 0: GET <CONTENT_SERVICE_URL>/health (public, spec E; alias /status). Not reachable -> warn + exit 0.
// Step 1: the authenticated probe. 404 -> authenticated OK ("credentials accepted").  401/403 -> console.error + process.exit(1).
// network error / 5xx -> console.warn("service not reachable yet; skipped") and exit 0.
```
  Reuse `loadConfig` and `ContentoolsClient`; catch `ServiceError` by `status`. **Done when** unit-tested in 7.6.

**Pitfalls.** (1) Never `console.log` secrets; (2) forgetting `res.on('close')` leaks a server per request; (3) `express.json()` must not run before auth; (4) the SDK needs `Accept: application/json, text/event-stream` from clients (tests and scripts must send it, else 406); (5) do not enable `trust proxy`/CORS.
**Verification.** `npx tsc -p tsconfig.build.json && node build/server/index.js` with `.env` loaded (`set -a; . ./.env; set +a`) -> `curl -s localhost:8080/mcp/status` -> `{"status":"ok"}`.
**Rollback.** Delete `src/mcp`, `src/server`, `build/`.

---

## 7. Integration tests (supertest + msw)

**Context.** Router-level tests per `plans/03-testing-strategy.md` and the Connect skill `references/testing.md`: drive the Express app, mock the *service* with msw.
**Pre-conditions.** Section 6 done.

- [x] 7.1 `tests/support/app.ts`: helper `makeTestApp(overrides?)` building `buildApp` with `CONTENT_SERVICE_URL=http://svc.test/service`, tokens `'a'.repeat(40)` / `'S'.repeat(40)`, writes on/off param; helper `rpc(method, params)`; constant `H` = `{ Authorization, Accept: 'application/json, text/event-stream' }`.
- [x] 7.2 msw lifecycle in each integration file. **Known trap (verified):** msw also intercepts supertest's own loopback requests and, with `onUnhandledRequest: 'error'`, fails them. Use:
```ts
svc.listen({ onUnhandledRequest: (req, print) => { const h = new URL(req.url).hostname; if (h === '127.0.0.1' || h === 'localhost') return; print.error(); } });
```
  so only requests to unmocked *non-local* hosts (i.e. the service) fail the test.
- [x] 7.3 `tests/integration/endpoint.test.ts` -> scenarios of `mcp-http-endpoint`: `initialize` then `tools/list` as separate requests without session header -> 200 JSON; 405 on `GET /mcp` and `DELETE /mcp` with `Allow: POST`; invalid JSON -> 400; body over 8 MB -> 413; `GET /mcp/status` -> 200 `{status:'ok'}`; error middleware 500 body exact and contains no stack (force by a tool list that throws? inject a `buildApp` dependency that throws -> expect generic message).
- [x] 7.4 `tests/integration/auth.test.ts` -> `mcp-auth`: parameterised rejection matrix (task 5.3 list) all `401` with `WWW-Authenticate`; msw handler counters assert **zero** service calls and that `tools/list` also requires auth; rotation; `Origin: https://evil.example` -> 403 even with the right token; allowed origin passes; **no passthrough**: call `get_preview_puck_page` with inbound token A and assert the msw handler saw `authorization === 'Bearer ' + 'S'.repeat(40)` and `x-source: mcp` and a UUID `x-correlation-id`; strict-schema test (`jwtToken`, `projectKey`, `baseUrl` extras) -> `isError` / `-32602` and msw counter 0.
- [x] 7.5 `tests/integration/tools.test.ts` -> `mcp-tool-catalog`: default (writes off) lists exactly 24 tools; `enableWrites` lists 44; groups `pages,products` lists 9; calling a write tool when disabled -> JSON-RPC error (unknown tool) and no service call; for a representative tool per group assert the outbound request (method, URL incl. `default` BU and encoding, body); injection slug escaped (body `query` equals `slug = "/x\" OR key = \"y"`); newline slug -> `isError` and 0 service calls; service 404 -> `isError`, text starts `Service returned 404`; `list_media` with `{limit:20,cursor:'abc',extensions:['png','jpg']}` -> `GET .../default/media-library?limit=20&cursor=abc&extensions=png%2Cjpg` and `{page:2}` rejected with 0 calls; `upload_media` answered `501 MEDIA_NOT_CONFIGURED` -> `isError` text contains the code; service JSON `{message}` surfaces; service stalls beyond `timeoutMs` -> `isError` text contains `timed out` while HTTP status is 200; upload > 5 MiB -> `isError`, 0 calls; upload small file -> msw handler parses `formData()` and finds the file; 204 delete -> text `OK (no content)`.
- [x] 7.6 `tests/integration/post-deploy.test.ts`: msw returns 404 -> exit code 0 (export a `run(env): Promise<number>` from `post-deploy.ts` and call it; the file's `main` only does `process.exit(await run(process.env))`); 401 -> 1; 403 -> 1; network error -> 0 with warning; 500 -> 0.
- [x] 7.7 Log hygiene test: capture `process.stdout.write`, call `create_puck_page` with name `'Secret launch'` and both tokens configured; assert captured output contains `create_puck_page` and `outcome` but not `Secret launch`, `'a'.repeat(40)` or `'S'.repeat(40)`.

**Verification.** `yarn test` -> all suites green (expect roughly 90-120 tests). `yarn test --coverage` shows core + server > 90% lines.
**Rollback.** Delete `tests/integration`.

---

## 8. `connect.yaml` block and Connect validation

**Context.** Declare the app. File lives at `<root>/connect.yaml` (not in `mcp/`).
**Pre-conditions.** Section 6 done. Spec H may or may not have created the file.

- [x] 8.1 If `<root>/connect.yaml` exists (from H), append the `mcp` entry from `design.md` D9 under `deployAs` (keep H's `service` entry untouched; do not touch root `inheritAs`). If it does not exist yet, create it with `deployAs:` containing **only** the `mcp` entry (H merges later; record in `docs` nothing). Paste the block verbatim from design D9. **Done when** `grep -c "name: mcp" <root>/connect.yaml` -> `1` and the folder `mcp/` exists.
- [ ] 8.2 Validate: `cd <root> && commercetools connect validate` (CLI from `npm i -g @commercetools/cli`; if not installed, record that and rely on 8.3). Expected: validation passes. **Done when** exit 0 (or the CLI-absence note is in the PR).
- [x] 8.3 Offline sanity check of the block: from the repo root run `yarn check:connect` (the canonical static `connect.yaml` check owned by spec O; it needs no extra tooling). **Done when** it exits 0 and reports the `mcp` app with `endpoint: /mcp`, `applicationType: service`, 6 standard keys and 2 secured keys.
- [x] 8.4 Check no secret is in `standardConfiguration`: `MCP_ACCESS_TOKEN` and `SERVICE_API_TOKEN` appear only under `securedConfiguration` (Connect checklist). **Done when** the python check above shows them in the second list only.

**Pitfalls.** Folder name must equal `name: mcp`. `default` values must be strings (`"false"`, `"15000"`). Do not declare any `CTP_*` key for this app (it never calls commercetools; if H's root `inheritAs.apiClient` injects them they are simply unused). `scripts.postDeploy` is a read-only probe, so there is no `preUndeploy` (nothing is registered in the project to clean up).
**Rollback.** Remove the `mcp` entry.

---

## 9. README, SUPPORT headers, docs hooks

**Context.** The Connect checklist requires the README to state config table, scopes, fail-open/closed and replay information; the labs rules require the unsupported banner.
**Pre-conditions.** Section 8 done.

- [x] 9.1 Write `mcp/README.md` with: (1) banner `> **Unsupported.** This project is freely available, AS IS and UNSUPPORTED. See LICENSE and SUPPORT.md.` (the exact banner text spec P standardises; align if P differs); (2) what it is and the 44-tool table grouped (copy names + one-line purpose; mark write tools); (3) **Configuration table** (6 standard + 2 secured keys, columns: key, secured?, required, default, purpose) mirroring `connect.yaml`; (4) **Authentication** (inbound bearer, outbound service token, no passthrough, rotation procedure: set `MCP_ACCESS_TOKEN="new,old"`, move clients, remove old); (5) **Scopes:** "None. This application never calls the commercetools API; it uses no API client. Authority comes from `SERVICE_API_TOKEN`, so treat `MCP_ENABLE_WRITES=true` like handing the service token to every MCP client"; (6) **Failure behaviour:** *fail-closed* on missing/invalid config (process exits), on bad bearer (401), and on service outage (tool returns `isError`, no cached/fallback data, no retries); (7) **Replay runbook:** "Not applicable: synchronous, stateless, no queue, no events; a failed tool call is retried by the caller; writes are as idempotent as the service routes (create fails if the key exists; update/publish are repeatable)"; (8) Local development (`.env`, `yarn start:dev`, `yarn dev:fake`); (9) Verify with Inspector / `yarn verify`; (10) Connect client examples (Claude Code command from `manual.md` MM-4); (11) cold start note (sandbox ~15 s) and deploy order.
- [x] 9.2 Confirm each source file has the SPDX header: `cd <root>/mcp && grep -L "SPDX-License-Identifier: MIT" $(git ls-files -co --exclude-standard 'src/**/*.ts' 'tests/**/*.ts' 'scripts/*.mjs')` prints nothing. **Done when** empty output.
- [x] 9.3 Confirm no forbidden words: `grep -rniE "\bcms\b|demo|poc|pre-?sales|contenttools|commercetools-demo" <root>/mcp --include='*.{ts,mjs,md,json}' --exclude-dir=node_modules` prints nothing (the old package typo `contenttools` must not survive).

**Rollback.** Delete README.

---

## 10. Chrome-free verification (local)

**Context.** No browser is involved: the SDK client and the MCP Inspector CLI exercise the real HTTP server. A fake service stands in for the content service so this works before E/F land.
**Pre-conditions.** Sections 6-9 done.

- [x] 10.1 `tests/support/fake-service.ts`: tiny Express app mimicking `/service/...` routes with in-memory data: `GET /service/:bu/puck-pages` (returns one fixture page), `GET /service/:bu/puck-pages/:key`, `GET /service/:bu/published/puck-pages/:key`, `GET /service/:bu/preview/puck-pages/:key` (**requires** `Authorization: Bearer <fake token>` else 401), `POST /service/:bu/published/puck-pages/query`, `POST /service/:bu/puck-pages` (requires bearer; returns 201 echo), `GET /service/products/search`, `GET /service/:bu/configuration/theme`, `GET /service/health` (public, `{status:'healthy'}`), `GET /service/:bu/media-library?limit=&cursor=&extensions=` (bearer required; two pages of fixtures: first returns `nextCursor:'c2', hasMore:true`, second `nextCursor:null, hasMore:false`), and a spec-E style 401 body `{message,statusCode:401,correlationId}` for missing/wrong bearer. Unknown route -> 404 JSON `{message:'Path not found.'}`. `tests/support/dev-fake.ts` starts it on 8081 **and** the MCP app on 8080 with env `CONTENT_SERVICE_URL=http://localhost:8081/service`, writes on, tokens `'m'.repeat(40)` and `'s'.repeat(40)`; prints both URLs. **Done when** `yarn dev:fake` prints `fake service :8081, mcp :8080`.
- [x] 10.2 `scripts/verify-mcp.mjs` (plain Node, SDK client):
```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const url = new URL(process.env.MCP_URL ?? 'http://localhost:8080/mcp');
const token = process.env.MCP_ACCESS_TOKEN; if (!token) { console.error('Set MCP_ACCESS_TOKEN'); process.exit(2); }
const c = new Client({ name: 'verify', version: '1.0.0' });
await c.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
const tools = (await c.listTools()).tools.map((t) => t.name);
const expectWrites = process.env.EXPECT_WRITES === 'true';
if (tools.length !== (expectWrites ? 44 : 24)) { console.error(`FAIL tool count ${tools.length}`); process.exit(1); }
const r = await c.callTool({ name: 'list_puck_pages', arguments: {} });
if (r.isError) { console.error('FAIL list_puck_pages', r.content); process.exit(1); }
console.log(`OK ${tools.length} tools; list_puck_pages returned ${r.content[0].text.length} chars`);
await c.close();
```
  Extra checks in the same script: wrong token -> connection rejected (catch error, assert it mentions 401), `get_preview_puck_page` works (proves the service token is used), a bogus key returns `isError` containing `404`.
- [x] 10.3 Run the pair: terminal 1 `yarn dev:fake`; terminal 2 `MCP_ACCESS_TOKEN=$(printf 'm%.0s' {1..40}) EXPECT_WRITES=true yarn verify` -> expected last line `OK 44 tools; ...` and exit 0. **Done when** exit 0.
- [x] 10.4 MCP Inspector CLI (verified syntax with `@modelcontextprotocol/inspector@2.10.1`):
```bash
T=$(printf 'm%.0s' {1..40})
npx -y @modelcontextprotocol/inspector --cli http://localhost:8080/mcp --transport http \
  --header "Authorization: Bearer $T" --method tools/list
npx -y @modelcontextprotocol/inspector --cli http://localhost:8080/mcp --transport http \
  --header "Authorization: Bearer $T" --method tools/call --tool-name get_puck_page --tool-arg key=home
```
  Expected: first prints JSON with `"tools": [` and 44 names; second prints `content[0].text` JSON of the fixture page. Wrong token (`--header "Authorization: Bearer nope"`) must print a 401/Unauthorized error. **Done when** all three behave as described. (Interactive UI: `npx @modelcontextprotocol/inspector` then Transport "Streamable HTTP", URL `http://localhost:8080/mcp`, header above: optional, needs a browser, not required.)
- [x] 10.5 Raw `curl` smoke for the doc: `curl -s -X POST localhost:8080/mcp -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` -> JSON with `"result":{"tools":[`; without `Authorization` -> HTTP 401 and `WWW-Authenticate` header (`curl -i`).
- [x] 10.6 Clean-build check as Connect would run it: `rm -rf node_modules build && yarn install --frozen-lockfile && yarn gcp-build && ls build/server/index.js` then start with env and re-run 10.3. **Done when** works from a clean state (this proves the app is self-contained).

**Pitfalls.** The SDK client needs `Accept` handled automatically; raw curl must send it. `--header` is repeatable. Inspector `--tool-arg` values are strings: use `key=home` only for string params.
**Rollback.** Stop the processes; delete `scripts/`, `tests/support/dev-fake.ts`.

---

## 11. Live e2e against the real service (env-gated)

**Context.** Proves the contract with specs E/F/G, not just mocks. Skipped unless env vars are set (strategy in `plans/03-testing-strategy.md`).
**Pre-conditions.** Specs E and F archived; a running service (local `service/` with a sandbox project per M-01, or a Connect sandbox deployment) configured with a known `SERVICE_API_TOKEN`.

- [x] 11.1 `tests/e2e/live.test.ts` with `const live = process.env.MCP_E2E_SERVICE_URL && process.env.MCP_E2E_SERVICE_TOKEN ? describe : describe.skip;`. Start the real app in-process via `buildApp` with the real service URL/token (no msw). Flow using the SDK `Client` through supertest-free `app.listen(0)`: `create_puck_page` (writes on; unique key/slug with a timestamp) -> `get_preview_puck_page` -> `publish_puck_page` -> `query_published_puck_page` by slug -> `get_puck_page_versions` (>= 1 entry) -> `delete_puck_page`; plus `search_products` (text `a`) and `get_configuration` slice `theme`; always `delete_puck_page` in `afterAll`. Add script `"test:e2e": "jest tests/e2e"` and exclude `tests/e2e` from default `yarn test` via `testPathIgnorePatterns` unless `MCP_E2E_SERVICE_URL` is set.
- [x] 11.2 Run: `MCP_E2E_SERVICE_URL=http://localhost:8080/service MCP_E2E_SERVICE_TOKEN=<token> yarn test:e2e` -> all pass; with the wrong token the first call yields `isError` `Service returned 401` (also assert this negative test).
- [x] 11.3 Record in the PR: service version tested, date, and any route or error-body mismatch found.

**Rollback.** Delete `tests/e2e`.

---

## 12. Hand-off

- [x] 12.1 There is no CI service (owner decision: no GitHub Actions). Add to `package.json` scripts `"check:app": "yarn typecheck && yarn test && yarn gcp-build"` and make it the one command the root tooling hub (`<root>/package.json` `verify`/`gate` scripts, owned by spec A/O) calls for this app: `cd mcp && yarn install --frozen-lockfile && yarn check:app`; Connect itself runs `commercetools connect application test` (which runs `yarn test`) and `gcp-build`. Also hand the grep gates 9.2/9.3 to the root `gate` script. Tell spec N that `src/core`, `src/mcp/server.ts` and `src/core/index.ts` exports are its inputs and that `package.json` stays `private: true` (N publishes a derived manifest). Tell spec Q the verify commands from section 10.
- [ ] 12.2 Update `<root>/plans/01-dependency-plan.md` status board for M (Tasks done / Implemented).

---

## Definition of Done (maps to `specs/**` scenarios)

| Scenario group | Evidence |
| --- | --- |
| mcp-http-endpoint: initialize + list without session; two instances; 405; 400/413 | tests 7.3; verify script 10.3 |
| mcp-http-endpoint: connect.yaml validates; clean build and start | 8.2, 10.6 |
| mcp-http-endpoint: fail-fast config | 5.4, 6.3 manual run |
| mcp-http-endpoint: health; log hygiene | 7.3, 7.7 |
| mcp-http-endpoint: deploy-time probe | 7.6 |
| mcp-http-endpoint: README completeness | 9.1 checked against the Connect skill checklist (Security, Observability, Operations) |
| mcp-tool-catalog: exactly 44, no legacy | 4.3 |
| mcp-tool-catalog: write gate, groups, BU default, encoding | 4.3, 7.5 |
| mcp-tool-catalog: structured queries, control chars | 4.1, 7.5 |
| mcp-tool-catalog: errors as results, timeout, upload bound | 4.2, 7.5 |
| mcp-auth: matrix, rotation, status open | 5.3, 7.4 |
| mcp-auth: origin; no passthrough; argument injection; error hygiene | 7.3, 7.4 |
| Live contract with service | 11.2 (or "not run: reason" in PR) |
| Labs rules | 9.2 SPDX, 9.3 forbidden words, README banner |
| Quality | `yarn typecheck`, `yarn test`, `yarn gcp-build` all exit 0 |
