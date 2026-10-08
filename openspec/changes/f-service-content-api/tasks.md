## 0. How to read this file

Vocabulary:

* **Custom Object** - a JSON document stored in a commercetools project at `container` + `key`; the only database we use. D's `customObjects('puckPage')` is our typed handle to one container.
* **Business unit (BU)** - the `:businessUnitKey` path segment. Here it only partitions content (for example one site or one B2B company); it is not an access-control boundary.
* **Puck** - the open-source drag-and-drop page editor; a page's layout is its `puckData` JSON (`{content: [...], root: {...}, zones?: {...}}`).
* **Page / content item / template** - a page is a routable document (`slug`); a content item is reusable structured content (`contentType`); a template is a saved `puckData` snapshot used to seed new pages or items.
* **Draft / published state** - every save updates the stored value and the *draft*; "publish" copies the stored value into *published*; the public site only reads published.
* **Version history** - every save also prepends an entry to a list capped at `MAX_VERSIONS` (default 5).
* **Datasource** - a named recipe that turns "SKUs" typed into a Puck component into product data at read time (`resolvedData`).
* **msw / supertest** - as in D: msw fakes outgoing HTTP, supertest calls the Express app in memory. D's `tests/support/fake-ct.ts` is a stateful fake of the commercetools Custom Objects API.
* **Gate** - E's `requireAuth`: routers mounted before it are public, after it protected.

`<root>` = `/Users/behnam/code/commercetools-labs/contentools`; commands run in `<root>/service` unless stated; `SRC` = `<root>/service/src/_pending` (files parked by D) and the read-only source repo is `/Users/behnam/code/cms/service/src`.
Every new `.ts` file starts with the SPDX header (exact text, see D/E tasks). No `console.*`, no `any`, no commented-out code, never the word "cms". Use `crypto.randomUUID()` (from `node:crypto`), never the `uuid` package.
The route table (73 routes) is `design.md` section 2; the source facts are `explore.md`. Read both before starting.

Order of work matters: groups 2-4 build shared pieces; 5-9 port the route groups; 10 wires and verifies everything.

---

## 1. Preflight and small core extensions

**Context.** F builds on D and E. We verify they are in place and make three small additions F needs.

**Pre-conditions.** Specs D and E archived; `yarn test` green in `service/`; `ls src/_pending/routes` lists the 8 parked route files (`puck-page`, `puck-content`, `puck-template`, `configuration`, `datasource`, `product`, `content-type`, `file`).

- [ ] 1.1 `cd <root>/service && yarn test && ls src/_pending/routes src/_pending/controllers src/_pending/samples/content-types | head -60`. Expected: tests pass; the 27 sample files are under `_pending/samples/content-types/`.
  Done when: both true.
- [ ] 1.2 Install the transpiler dependency: `yarn add @babel/standalone@^7.28.0 && yarn add -D @types/babel__standalone@^7`. Expected: `package.json` lists both; `yarn list --pattern @babel/standalone` shows one version.
- [ ] 1.3 Extend D's `ct/custom-objects.ts`: `list(where?: string, options?: { limit?: number })` stops paginating as soon as `options.limit` objects were collected (and then requests `min(500, remaining)` per page). Add a unit test in `tests/unit/custom-objects.test.ts`: seed 30 objects, `list(undefined, {limit: 1})` returns 1 and the fake saw one list request with `limit=1`.
  Done when: `yarn jest tests/unit/custom-objects.test.ts` is green.
- [ ] 1.4 Extend `tests/support/fake-ct.ts` with the Product Search API: handler `POST https://api.test.local/test-project/products/search` that pushes the body into `requests` and answers `{limit, offset: 0, count, total, results}` where `results` is produced by a programmable function: `fake.productSearch.respondWith((body) => results)` (default: `[]`), `fake.productSearch.failWith(status)` (answers `{statusCode: status, message: 'x', errors: [{code:'InvalidInput', message:'x'}]}` with that HTTP status), `fake.productSearch.calls` (array of received bodies). A result is `{id, productProjection?: {...}}`.
  Done when: a 3-line unit test in `tests/unit/fake-ct.test.ts` calls the endpoint through `getApiRoot().products().search().post({body:{query:{exact:{field:'variants.sku', value:'S'}}}}).execute()` and gets the programmed result.
- [ ] 1.5 Create `tests/support/api.ts` (used by every integration test below). Export `async function setupApiTest()` that: (a) calls `resetConfigurationForTests(); resetApiRootForTests(); resetAuthenticatorForTests(); resetPublicResolveForTests();` (b) creates `const server = setupServer(); const fake = startFakeCt(server); listenQuietly(server);` (c) returns `{ app: createApp(), http: supertest(createApp()), server, fake, auth, teardown }` where `auth = { Authorization: 'Bearer ' + process.env.SERVICE_API_TOKEN }` (set by `tests/support/env.ts`, spec E) and `teardown = () => server.close()`. Tests call `const t = await setupApiTest()` in `beforeEach` and `t.teardown()` in `afterEach`; a test that needs Merchant Center tokens also does `server.use(...kit.handlers)` with E's `createMcKit()` (see group 10).
  Done when: `tests/integration/smoke-api.test.ts` (1 test: `GET /service/health` 200 via `t.http`) passes.

**Pitfalls.** Do not import the real `uuid`. Do not touch files under `_pending/` except by `mv`-ing them out.

**Rollback.** Revert `package.json`, `custom-objects.ts`, `fake-ct.ts`; delete `tests/support/api.ts`.

---

## 2. Shared building blocks: types, parameter validation, schemas, query grammar

**Context.** Pieces every route group uses: data types, path-parameter validation (a hostile key must never reach a commercetools predicate), request-body schemas with the source's error messages, and the restricted query parser that replaces predicate splicing (bug B3).

**Pre-conditions.** Group 1.

- [ ] 2.1 `src/types/content.ts`: copy and merge the interfaces from `SRC/controllers/puck-page.controller.ts` lines 19-77 (`PuckComponentData`, `PuckData`, `PuckPageMeta`, `PuckPageValue`, `PuckPageState`, `PuckPageVersionEntry`, `PuckPageVersion`; drop `PuckPage`/`PuckPageWithStates` for now, re-add generically below), `puck-content.controller.ts` lines 18-65 and `puck-template.controller.ts` lines 12-32. Add generic helpers:

```ts
export interface ItemValue { key: string; businessUnitKey: string; createdAt: string; updatedAt: string }
export interface ItemState<V> { key: string; businessUnitKey: string; states: { draft?: V; published?: V } }
export interface ItemVersions<V> { key: string; businessUnitKey: string; versions: Array<V & { id: string; timestamp: string }> }
export type StoredObject<V> = { id: string; version: number; container: string; key: string; value: V } // CustomObject narrowed
export type WithStates<V> = StoredObject<V> & { states: ItemState<V>['states'] };
```
  Done when: `yarn typecheck` passes.
- [ ] 2.2 `src/routes/params.ts`:

```ts
import type { Router } from 'express';
import { assertSafeKey } from '../utils/predicate';
export function validateKeyParams(router: Router): void {
  router.param('businessUnitKey', (_req, _res, next, value: string) => { try { assertSafeKey(value, 'businessUnitKey'); next(); } catch (e) { next(e); } });
  router.param('key', (_req, _res, next, value: string) => { try { assertSafeKey(value, 'key'); next(); } catch (e) { next(e); } });
}
export const wrap = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => { fn(req, res).catch(next); };   // Express 4 does not catch async errors
```
  Note: `router.param` only applies to the router it is called on: call `validateKeyParams` for every router you create.
- [ ] 2.3 Schemas (zod 4, custom messages via `{ error: '...' }`). Create `src/schemas/common.ts` with `parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T` which throws `CustomError(400, issues[0].message)`, and `valueBody(data)`: returns `data.value` when `data` is an object with a non-null object (non-array) `value`, else throws `CustomError(400, 'value is required in request body')`. Then:
  * `src/schemas/puck-data.ts`: `component = z.object({type: z.string(), props: z.record(z.string(), z.unknown())}).loose()`; `puckData = z.object({content: z.array(component), root: z.object({}).loose(), zones: z.record(z.string(), z.array(component)).optional()}).loose()`. (Loose on purpose: Puck evolves; we do not want to reject valid editor output.)
  * `src/schemas/pages.ts`: `pageCreate = z.object({name: z.string({error:'name is required'}).min(1,'name is required').max(256), slug: z.string({error:'slug is required'}).min(1,'slug is required').max(512), puckData: puckData.optional(), meta: z.record(z.string(), z.unknown()).optional()})`; `pageUpdate = z.object({name: ..., slug: ..., puckData, meta}).partial()` (same field rules, all optional; unknown keys stripped, which is the whitelist of bug B8).
  * `src/schemas/contents.ts`: `contentCreate = {name (required), contentType: string required message 'contentType is required', data: z.record(...).optional(), meta: z.record(...).optional()}`; `contentUpdate = partial`.
  * `src/schemas/templates.ts`: `templateCreate = {name required, kind: z.enum(['page','content'], {error: 'kind must be "page" or "content"'}), puckData optional}`.
  * `src/schemas/query.ts`: `queryBody = z.object({ query: z.string({error:'query is required in request body'}).min(1,'query is required in request body').max(512) })`.
  Unit test `tests/unit/schemas.test.ts`: each message from the specs is produced (missing name, slug, contentType, kind, query; `value` missing/array/null); unknown fields stripped (`createdAt` removed from an update); `puckData` with extra Puck fields accepted.
- [ ] 2.4 `src/services/query-grammar.ts`: parse `query` into clauses.

```ts
const CLAUSE = /^\s*(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*(?:AND\s+|$)/i;
export interface Clause { field: string; value: string }
export function parseQuery(query: string, allowed: readonly string[]): Clause[] {
  const clauses: Clause[] = []; let rest = query;
  while (rest.trim().length > 0) {
    const m = CLAUSE.exec(rest);
    if (!m) throw new CustomError(400, 'Invalid query');
    const [whole, field, raw] = m as unknown as [string, string, string];
    if (!allowed.includes(field)) throw new CustomError(400, 'Invalid query');
    clauses.push({ field, value: raw.replace(/\\(.)/g, '$1') });
    rest = rest.slice(whole.length);
  }
  if (clauses.length === 0) throw new CustomError(400, 'Invalid query');
  return clauses;
}
```
  (`AND` inside a quoted value is safe because the regex consumes quoted strings whole. A trailing `AND` with nothing after it fails the next loop and yields 400.)
  Unit test `tests/unit/query-grammar.test.ts`, table: `slug = "/home"` -> ok; `slug="/home" and name = "A"` -> 2 clauses; value with escaped quote `slug = "a\"b"` -> value `a"b`; value containing ` AND ` inside quotes stays one clause; rejected (400): `slug = "x" OR key = "y"`, `slug = "x" AND`, `slug != "x"`, `unknown = "x"`, `slug = x`, empty string, `(slug = "x")`, `slug = "x\"` (unterminated), 600-char input (schema max).
  Run `yarn jest tests/unit/schemas.test.ts tests/unit/query-grammar.test.ts` -> all green.

**Pitfalls.** zod 4: use `.loose()` (was `.passthrough()` in zod 3); error customisation is `{ error: '...' }` (older `message` is deprecated but works). `m` from `RegExp.exec` needs the cast for `noUncheckedIndexedAccess`.

**Rollback.** Delete the files created.

---

## 3. Products, datasource resolution

**Context.** Pages resolve datasources when read, and the picker and datasource test use product search; both live on one small service. They come first because pages depend on them.

**Pre-conditions.** Group 2.

- [ ] 3.1 `src/services/products.ts` (source: `SRC/services/products.ts`, 51 lines):

```ts
export async function searchProductProjections(body: ProductSearchRequest): Promise<ProductPagedSearchResponse> {
  try {
    return (await getApiRoot().products().search().post({ body }).execute()).body;
  } catch (error) {
    const status = (error as { statusCode?: number } | null)?.statusCode;
    if (status === 400) throw new CustomError(502, 'Product search is not available for this project');
    throw toCustomError(error, 'products.search');
  }
}
```
  Drop `getProductTypeById` (unused: `grep -rn getProductTypeById SRC` shows no caller).
- [ ] 3.2 `src/controllers/products.controller.ts` (source: `SRC/controllers/product.controller.ts` lines 19-150). Port `searchProductsController(text, limit = 20, locale = 'en-US')`, `getProductBySku(sku)`, `getProductsBySku(skus)`; remove the `req` parameter everywhere; keep `pickLocalized`, the wildcard sanitising (`term.replace(/[*?]/g, '')`), the three `or` clauses and the slim mapping exactly. Changes: (a) `getProductBySku` throws `CustomError(400, 'Product SKU is required')` OUTSIDE the try that converts to 500 (source wrapped it and turned the 400 into 500); (b) `getProductsBySku(skus: string)`: split on `,`, trim, drop empties, if empty -> 400 `SKUs are required`, if more than `MAX_DATASOURCE_SKUS = 25` -> 400 `Too many SKUs (max 25)`; (c) catch blocks rethrow `CustomError` unchanged and wrap anything else as `CustomError(500, ...)` only when it is not already a `CustomError`.
- [ ] 3.3 `src/services/datasource-resolution.ts`: 

```ts
export const BUILT_IN_DATASOURCES = [
  { key: 'product-by-sku',  value: { name: 'Get Product by SKU',  key: 'product-by-sku',  params: [{ key: 'sku',  type: 'string', required: true }], builtIn: true } },
  { key: 'products-by-sku', value: { name: 'Get Products by SKU', key: 'products-by-sku', params: [{ key: 'skus', type: 'string', required: true }], builtIn: true } },
] as const;                                        // source: constants.ts lines 49-66 and samples/datasource.ts
export const isBuiltInDatasource = (key: string) => BUILT_IN_DATASOURCES.some((d) => d.key === key);
export async function resolveDatasource(key: string, params: Record<string, unknown>): Promise<unknown> {
  try {
    if (key === 'product-by-sku') return await getProductBySku(String(params.sku ?? ''));
    if (key === 'products-by-sku') return await getProductsBySku(String(params.skus ?? ''));
    return undefined;
  } catch (error) { getLogger().warn('datasource resolution failed', { key }); return null; }   // source: swallow, return null
}
export async function resolvePuckData(puckData: PuckData): Promise<PuckData> { /* see design section 6 */ }
```
  `resolvePuckData`: port `isDatasourceValue`, `resolveComponentProps`, `resolvePuckPageDatasources` from `SRC/controllers/puck-page.controller.ts` lines 100-167 without `req`; SKUs are filtered with `Boolean`, truncated with `.slice(0, 25)`; `resolvedData` is `data ?? null`. The `resolveDatasource` used by `/datasource/:key/test` must NOT swallow errors (the test endpoint should show failures): export a second function `resolveDatasourceStrict(key, params)` that is the same switch without try/catch, and have `resolveDatasource` call it inside the try/catch.
- [ ] 3.4 Tests `tests/unit/products-and-resolution.test.ts` (fake-ct): (a) slim mapping with localisation fallback (`{"de":"Schuh"}` for locale `en-US` -> first available), master variant without SKU falls back to first variant with SKU; (b) text `a*b?` produces request `value: '*ab*'` in all three clauses; (c) empty text -> `[]` and `fake.productSearch.calls.length === 0`; (d) limit cap handled by the route test later; (e) `failWith(400)` -> `CustomError` 502 with the message; `failWith(503)` -> 503; (f) `products-by-sku` with 26 SKUs -> 400, with `'a, ,b'` -> 2 calls; (g) `resolvePuckData`: a page with a datasource prop in `content` and another in `zones.sidebar` gets `resolvedData` in both, a non-datasource prop untouched, failure -> `resolvedData: null`, unknown `type` -> `resolvedData: null`.
  Run `yarn jest tests/unit/products-and-resolution.test.ts` -> green.

**Pitfalls.** The Product Search API returns `productProjection` only when `productProjectionParameters` is sent (even `{}`): keep it in every body. `ProductSearchRequest` and `_SearchQueryExpression` come from `@commercetools/platform-sdk` (v8).

**Rollback.** Delete the three files.

---

## 4. The generic item store (states, versions, pruning)

**Context.** Pages and content items share all behaviour except validation and datasource resolution. The store owns the persistence rules documented in the `content-states-versions` spec, including `MAX_VERSIONS` pruning. It replaces `content-state-controller.ts` (310 lines) and `content-version-controller.ts` (152 lines) and the per-type duplicated functions.

**Pre-conditions.** Groups 2-3.

- [ ] 4.1 Create `src/services/item-store.ts`. Public shape:

```ts
export interface ItemStoreOptions<V extends ItemValue, C, U> {
  keyPrefix: string;                                  // 'puck-page-' | 'puck-content-'
  containers: { item: ContainerKey; state: ContainerKey; version: ContainerKey };
  queryFields: readonly string[];                     // ['slug','name','key'] | ['contentType','name','key']
  build(businessUnitKey: string, key: string, input: C): V;     // full value for a new item (adds createdAt/updatedAt)
  applyUpdate(existing: V, input: U): V;              // whitelist merge, sets updatedAt, keeps key/businessUnitKey/createdAt
  extraListWhere?(filter: Record<string, string | undefined>): string[];   // contents: contentType
  resolveRead?(value: V): Promise<V>;                 // pages: datasource resolution
}
export interface ItemStore<V extends ItemValue, C, U> {
  list(bu: string, filter?: Record<string, string | undefined>): Promise<WithStates<V>[]>;
  getWithStates(bu: string, key: string): Promise<WithStates<V>>;
  create(bu: string, input: C): Promise<StoredObject<V>>;
  update(bu: string, key: string, input: U): Promise<StoredObject<V>>;
  remove(bu: string, key: string): Promise<void>;
  published(bu: string, key: string): Promise<V | undefined>;
  preview(bu: string, key: string): Promise<V | undefined>;
  query(bu: string, query: string, mode: 'published' | 'preview'): Promise<V | undefined>;
  states(bu: string, key: string): Promise<ItemState<V>>;
  publish(bu: string, key: string, clearDraft: boolean): Promise<ItemState<V>>;
  revertDraft(bu: string, key: string): Promise<ItemState<V>>;
  versions(bu: string, key: string): Promise<ItemVersions<V>>;
}
export function createItemStore<V extends ItemValue, C, U>(o: ItemStoreOptions<V, C, U>): ItemStore<V, C, U>;
```
  Implementation rules (write each as a small internal function; cite the source lines you are replacing in a one-line code comment is NOT allowed: put them in the PR description instead):
  * handles: `const items = customObjects(o.containers.item)`, `states`, `versions`; `const stateKey = (bu, key) => `${bu}_${key}``; `emptyState(bu, key) = {key, businessUnitKey: bu, states: {}}`; `assertOwned(obj, bu)` throws `CustomError(404, 'Not found')` when `obj.value.businessUnitKey !== bu`.
  * `create`: `key = o.keyPrefix + randomUUID()`; `value = o.build(bu, key, input)`; `obj = await items.put(key, value)`; `await setDraft(bu, key, value)`; `await pushVersion(bu, key, value)`; return `obj`.
  * `update`: `let updated!: V; const obj = await items.update<V>(key, (cur) => { if (!cur || cur.businessUnitKey !== bu) throw new CustomError(404, 'Not found'); updated = o.applyUpdate(cur, input); return updated; });` then `setDraft`, `pushVersion`, return `obj`. (`update()` of D re-reads and retries on 409, so concurrent saves cannot overwrite each other.)
  * `setDraft(bu, key, value)`: `states.update<ItemState<V>>(stateKey, (cur) => { const base = cur ?? emptyState(bu, key); return { ...base, states: { ...base.states, draft: value } }; })`.
  * `pushVersion(bu, key, value)`: 

```ts
await versions.update<ItemVersions<V>>(stateKey(bu, key), (cur) => {
  const base = cur ?? { key, businessUnitKey: bu, versions: [] };
  const entry = { ...value, id: randomUUID(), timestamp: new Date().toISOString() };
  return { ...base, versions: [entry, ...base.versions].slice(0, getConfiguration().maxVersions) };   // MAX_VERSIONS pruning
});
```
  * `publish`: `const obj = await items.getOrThrow(key); assertOwned(obj, bu);` then `states.update` with `states: clearDraft ? { published: obj.value } : { ...base.states, published: obj.value }`; return the new state value. (When `clearDraft` the draft key disappears because the new `states` object lacks it.)
  * `revertDraft`: `const cur = await states.get(stateKey)`; `const pub = cur?.value.states.published`; if `!pub` throw `CustomError(404, 'No published state found')`; `await items.update(key, () => ({ ...pub, businessUnitKey: bu }))`; then `states.update` removing `draft` (`const { draft: _d, ...rest } = base.states` - lint: name it `_draft`); return the new state.
  * `remove`: `const obj = await items.get(key); if (!obj || obj.value.businessUnitKey !== bu) throw new CustomError(404, 'Not found'); await items.delete(key); await states.delete(stateKey); await versions.delete(stateKey);`.
  * `list`: `const where = inValue(and(eq('businessUnitKey', bu), ...(o.extraListWhere?.(filter ?? {}) ?? [])))`; `const objs = await items.list(where)`; `const stateObjs = objs.length ? await states.list(inValue(eq('businessUnitKey', bu))) : []`; index states by `value.key`; return `objs.map((o) => ({ ...o, states: byKey.get(o.key)?.states ?? {} }))`.
  * `getWithStates`: `obj = await items.getOrThrow(key); assertOwned; st = await states.get(stateKey)`; return `{ ...obj, states: st?.value.states ?? {} }`.
  * `published`/`preview`: `const st = await states.get(stateKey(bu, key)); const v = st?.value.states.published` (preview: `draft ?? published`); return `v && o.resolveRead ? o.resolveRead(v) : v`.
  * `query`: `const clauses = parseQuery(query, o.queryFields)`; `const found = await items.list(inValue(and(...clauses.map((c) => eq(c.field, c.value)), eq('businessUnitKey', bu))), { limit: 1 })`; if none return `undefined`; then the same as `published`/`preview` for `found[0].key`.
  * `states`: `st?.value ?? emptyState(bu, key)`; `versions`: `v?.value ?? { key, businessUnitKey: bu, versions: [] }`.
  Done when: `yarn typecheck` passes.
- [ ] 4.2 Tests `tests/unit/item-store.test.ts` (fake-ct; use a tiny test item type, not pages): 
  1. create writes item, `draft` state and 1 version entry (assert via `fake.store`);
  2. update merges and refreshes `updatedAt`, version list grows, newest first;
  3. **pruning**: `MAX_VERSIONS=5` (default): create + 6 updates -> `versions.versions.length === 5`, first entry is the 6th update, the creation entry is absent; `process.env.MAX_VERSIONS='2'` + `resetConfigurationForTests()`: create + 1 update -> 2, one more update -> 2; `MAX_VERSIONS='1'`: always 1;
  4. publish keeps draft; `publish(..., true)` removes draft;
  5. `revertDraft` without published -> 404 `No published state found`; after publish + update -> stored item equals published value, `draft` absent;
  6. other BU: `getWithStates('other', key)` and `remove('other', key)` -> 404, item still exists;
  7. remove deletes the three objects; second remove -> 404;
  8. `list` returns 45 items (seed 45 through the store) and the fake saw exactly ONE state list request (`where` contains `businessUnitKey` only, no `OR`);
  9. concurrency: `fake.store.failNextWriteWith(409)` before an `update` call -> still succeeds and exactly two writes were attempted for the version object;
  10. `query`: `slug = "/a"` finds the item; `slug = "x\" OR name = \"y"` finds nothing and the `where` sent to commercetools contains the escaped text `x\" OR name = \"y` as ONE quoted string (assert on `fake.requests`); `OR` form -> 400.
  Run `yarn jest tests/unit/item-store.test.ts` -> all green.

**Pitfalls.** `getConfiguration().maxVersions` must be read INSIDE the callback (not at module load) so tests and redeploys see current values. State objects store `draft: undefined` as absent (commercetools drops null/undefined fields): never write `draft: null`. Do not call `items.put` for updates (that is last-writer-wins): always `items.update`.

**Rollback.** Delete `src/services/item-store.ts` and its test.

---

## 5. Pages and content items: routes (public and protected), states, versions

**Context.** One route factory registers the 13 routes of a content type into two routers (public published reads; everything else protected). Then two definitions (pages, contents) use it.

**Pre-conditions.** Group 4.

- [ ] 5.1 Pages and contents definitions (controllers): 
  * `src/controllers/puck-pages.controller.ts` (replaces `SRC/controllers/puck-page.controller.ts`): `export const pageStore = createItemStore<PuckPageValue, PageCreate, PageUpdate>({ keyPrefix: 'puck-page-', containers: { item: 'puckPage', state: 'puckPageState', version: 'puckPageVersion' }, queryFields: ['slug', 'name', 'key'], build, applyUpdate, resolveRead: async (v) => ({ ...v, puckData: await resolvePuckData(v.puckData) }) })`. `build`: `{ key, businessUnitKey, name, slug, puckData: input.puckData ?? { content: [], root: { props: {} } }, meta: input.meta, createdAt: now, updatedAt: now }`. `applyUpdate`: `{ ...existing, ...pick(input, ['name','slug','puckData','meta']), updatedAt: now }` (pick only defined fields).
  * `src/controllers/puck-contents.controller.ts`: same for `puckContent...`, `queryFields: ['contentType','name','key']`, `build` with `data: input.data ?? {}`, `extraListWhere: (f) => f.contentType ? [eq('contentType', f.contentType)] : []`, no `resolveRead`.
- [ ] 5.2 `src/routes/item-routes.ts`:

```ts
export interface ItemRouteDef<V extends ItemValue, C, U> {
  path: 'puck-pages' | 'puck-contents';
  store: ItemStore<V, C, U>;
  createSchema: z.ZodType<C>; updateSchema: z.ZodType<U>;
  listFilter?: (req: Request) => Record<string, string | undefined>;
  messages: { publishedNotFound: string; previewNotFound: string };
}
export function buildItemRouters<V extends ItemValue, C, U>(def: ItemRouteDef<V, C, U>): { publicRouter: Router; protectedRouter: Router } { ... }
```
  Public router: `GET /:businessUnitKey/published/${path}/:key` -> `def.store.published`; 404 `messages.publishedNotFound` when `undefined`; `POST /:businessUnitKey/published/${path}/query` -> `queryBody` parse, `store.query(bu, query, 'published')`, 404 same message. Protected router (13 - 2 = 11 routes): `GET /:bu/${path}` (list; `listFilter`), `GET /:bu/${path}/:key`, `POST /:bu/${path}` (`const value = parseOrThrow(def.createSchema, valueBody(req.body))`, `201`), `PUT /:bu/${path}/:key` (`updateSchema`; `value` required), `DELETE /:bu/${path}/:key` (`204`), `GET /:bu/preview/${path}/:key` (404 `previewNotFound`), `POST /:bu/preview/${path}/query`, `GET /:bu/${path}/:key/states`, `PUT /:bu/${path}/:key/states/published` (`clearDraft = req.query.clearDraft === 'true'`), `DELETE /:bu/${path}/:key/states/draft`, `GET /:bu/${path}/:key/versions`. Every handler is wrapped with `wrap(...)`. Call `validateKeyParams` on both routers. Route registration ORDER inside the protected router: `GET /:bu/preview/${path}/:key` must not be shadowed by `GET /:bu/${path}/:key` (different segment count, no conflict) - still keep static-prefix routes before parameterised ones.
  Source messages to keep verbatim: pages `Published puck page not found` / `Puck page not found`; contents `Published puck content not found` / `Puck content not found` (source `routes/puck-content.route.ts` lines 150-190; confirm with `grep -n "not found" SRC/routes/puck-content.route.ts` and copy exactly).
- [ ] 5.3 `src/routes/puck-pages.route.ts`: `const { publicRouter, protectedRouter } = buildItemRouters({ path: 'puck-pages', store: pageStore, createSchema: pageCreate, updateSchema: pageUpdate, messages: {...} }); export const publishedPagesRouter = publicRouter; export const puckPagesRouter = protectedRouter;` and the same in `src/routes/puck-contents.route.ts` (`listFilter: (req) => ({ contentType: typeof req.query.contentType === 'string' ? req.query.contentType : undefined })`). Delete `SRC/routes/puck-page.route.ts`, `puck-content.route.ts`, `SRC/controllers/puck-page.controller.ts`, `puck-content.controller.ts`, `content-state-controller.ts`, `content-version-controller.ts` (`rm` them: the generic store replaced them).
- [ ] 5.4 Mount in `src/routes/service.route.ts` (E layout): public section: `serviceRouter.use(publishedPagesRouter, publishedContentsRouter);` before `requireAuth`; protected section after it: `serviceRouter.use(puckPagesRouter, puckContentsRouter);`.
- [ ] 5.5 Tests `tests/integration/puck-pages.test.ts` (supertest + `setupApiTest`; each bullet is one `it`; BU key `default` unless stated):
  * list: 45 pages -> 45 entries; 3 published carry `states.published`; no `OR` in any recorded state query;
  * `POST` -> 201 with `key` prefix `puck-page-`, `value.businessUnitKey === 'default'`, default `puckData`, draft state + 1 version in the fake store; body `{}` -> 400 `value is required in request body`; missing name / slug -> 400 messages; non-object `value` -> 400;
  * `GET :key` -> 200 with `states`; unknown key -> 404; other BU -> 404;
  * `PUT` merges, ignores `createdAt` and `key` in the body, refreshes `updatedAt`; missing page -> 404;
  * `DELETE` -> 204 and the three objects are gone; second `DELETE` -> 404;
  * published read: 404 before publish (anonymous OK); after `PUT states/published` -> 200 anonymous; contains `resolvedData` for a `{type:'product-by-sku', skus:['S1']}` prop (program `fake.productSearch.respondWith`); with the search failing (`failWith(503)`) the read is 200 and `resolvedData` is `null`;
  * preview read: anonymous -> 401; with credential returns draft when it exists (edit after publish and compare), else published; 404 `Puck page not found` for unknown;
  * published query: `{"query":"slug = \"/home\""}` anonymous -> 200; missing `query` -> 400 `query is required in request body`; `OR`/unknown field -> 400 `Invalid query`; no match -> 404 `Published puck page not found`; injection string -> 400 or 404 and the recorded `where` has the value escaped;
  * preview query: anonymous 401; with credential draft-then-published;
  * hostile key `x%22%20OR%20key` -> 400 `Invalid key` and the fake saw ZERO custom-object requests;
  * 1 MB-ish body (`puckData.content` with a 900 KB string prop) -> 201 (body limit 2 MB).
  `tests/integration/puck-contents.test.ts`: the same shape with `contentType` rules: create without `contentType` -> 400 `contentType is required`; `?contentType=hero` filter; query `contentType = "hero"`; published read has NO `resolvedData`/no product search calls (`fake.productSearch.calls.length === 0`); BU isolation (create in `b2b-eu`, list `b2c-us` empty).
  `tests/integration/states-versions.test.ts` (`describe.each([pages, contents])`): `GET states` for a fresh item returns `{states:{draft:...}}` and for unknown key `{states:{}}` (200); publish default keeps draft, `?clearDraft=true` drops it; revert without publication 404 `No published state found`; revert after edit restores the stored value and removes draft; `GET versions` newest first; **pruning table**: default 5 (create + 6 updates -> 5 entries, creation entry gone); `MAX_VERSIONS=3` env + reset (create + 3 updates -> 3); unknown key versions `{versions: []}`; concurrency: arm `fake.store.failNextWriteWith(409)` then send two parallel `PUT`s with `Promise.all` -> both 200 and the version list has both entries.
  Run `yarn jest tests/integration/puck-pages.test.ts tests/integration/puck-contents.test.ts tests/integration/states-versions.test.ts` -> all green (roughly 60 tests).

**Pitfalls.** (1) Express route order with `/:businessUnitKey/published/puck-pages/query` (POST) vs `GET /:businessUnitKey/published/puck-pages/:key`: different methods, no clash; but never register a `GET .../query`. (2) `router.param('key')` also fires for the `:key` of `/datasource/:key`: harmless (valid keys pass). (3) The fake's `where` evaluator throws `fake-ct: unsupported predicate` if a new predicate shape appears: extend it, do not loosen the assertions. (4) `PUT .../states/published` before any save of a page created through the store works because create already stored the item.

**Rollback.** Delete the new route/controller/test files and `mv` the removed source files back from the backup of D (`$SCRATCH/service-d-backup`).

---

## 6. Templates

**Context.** Plain objects (no states, no versions), protected, filtered by BU and `kind`.

**Pre-conditions.** Group 2.

- [ ] 6.1 `src/controllers/puck-templates.controller.ts` (source `SRC/controllers/puck-template.controller.ts`, 109 lines): functions `listTemplates(bu, kind?)` (where `value(businessUnitKey = bu [AND kind = kind])` via predicate helpers, `kind` only when `page|content`), `getTemplate(bu, key)` (`getOrThrow` + ownership 404), `createTemplate(bu, input)` (key `puck-template-<uuid>`, default `puckData`, `createdAt/updatedAt`), `deleteTemplate(bu, key)` (get + ownership; `delete`; 404 if missing). No `req` parameters.
- [ ] 6.2 `src/routes/puck-templates.route.ts` (source `SRC/routes/puck-template.route.ts`): 4 routes, `validateKeyParams`, `wrap`; POST uses `templateCreate` (`value` required message as for pages), `201`; DELETE `204`. Mount in `service.route.ts` after the gate. `rm SRC/controllers/puck-template.controller.ts SRC/routes/puck-template.route.ts`.
- [ ] 6.3 `tests/integration/puck-templates.test.ts`: list filter by `?kind=page` / `content` / invalid kind (no filter); create 201 + defaults; invalid kind -> 400 `kind must be "page" or "content"`; no name -> 400 `name is required`; get other BU -> 404; delete twice 204/404; anonymous on every route -> 401; 45 templates listed fully.
  Run `yarn jest tests/integration/puck-templates.test.ts` -> green.

**Rollback.** Delete the new files; restore the two source files.

---

## 7. Configuration

**Context.** Eight configuration slices (theme, header, ...) stored one custom object each, plus an aggregate read used by storefronts. Reads are public (storefront), writes protected.

**Pre-conditions.** Group 2.

- [ ] 7.1 `src/config/slices.ts`:

```ts
export const DEFAULT_BUSINESS_UNIT_KEY = 'default';
export const SLICES = [
  { path: 'theme',                   suffix: 'theme',                   aggregateKey: 'theme',               shape: 'object' },
  { path: 'header',                  suffix: 'header',                  aggregateKey: 'header',              shape: 'object' },
  { path: 'facet',                   suffix: 'facet',                   aggregateKey: 'facetConfiguration',  shape: 'object' },
  { path: 'footer',                  suffix: 'footer',                  aggregateKey: 'footer',              shape: 'object' },
  { path: 'site-metadata',           suffix: 'site-metadata',           aggregateKey: 'siteMetadata',        shape: 'object' },
  { path: 'category-listing',        suffix: 'category-listing',        aggregateKey: 'categoryListing',     shape: 'object' },
  { path: 'translations',            suffix: 'translations',            aggregateKey: 'translations',        shape: 'object' },
  { path: 'b2b-account-menu-links',  suffix: 'b2b-account-menu-links',  aggregateKey: 'b2bAccountMenuLinks', shape: 'array'  },
] as const;
export const CONTENTOOLS_BASE_URL = { suffix: 'contentools-base-url', aggregateKey: 'contentoolsBaseUrl' } as const;
export const sliceKey = (bu: string, suffix: string) => `${bu}-${suffix}`;
```
  (Key suffixes equal the source constants `CONFIGURATION_*_KEY` in `/Users/behnam/code/cms/service/src/constants.ts` lines 28-47.)
- [ ] 7.2 `src/controllers/configuration.controller.ts` (source `SRC/controllers/configuration.controller.ts`, 523 lines: collapse the 9x4 functions into generic ones):
  * `getSlice(bu, slice)`: `const obj = await configs.get(sliceKey(bu, slice.suffix))`; if `obj` return `obj.value`; if `bu !== 'default'` return `getSlice('default', slice)`; else `null`. (`configs = customObjects('configuration')`.)
  * `putSlice(bu, slice, value)`: validate shape (`'object'`: plain non-array object; `'array'`: array; else `CustomError(400, 'value must be an object')` / `'value must be an array'`), `configs.put(key, value)`, return `value`.
  * `deleteSlice(bu, slice)`: `await configs.delete(key)` (idempotent).
  * `getAllConfigurations(bu)`: ONE query for the BU and the default BU: `const keys = [...SLICES, CONTENTOOLS_BASE_URL].flatMap((s) => bu === 'default' ? [sliceKey(bu, s.suffix)] : [sliceKey(bu, s.suffix), sliceKey('default', s.suffix)])`; `const objs = await configs.list(inList('key', keys))` (<= 18 keys); build `{theme, header, facetConfiguration, footer, siteMetadata, categoryListing, translations, contentoolsBaseUrl, b2bAccountMenuLinks}` with BU value first, default value as fallback, `null` otherwise. `contentoolsBaseUrl` only when the value is a string; `b2bAccountMenuLinks` only when an array; `translations` only when an object.
- [ ] 7.3 Routes: `src/routes/configuration-read.route.ts` (public): `GET /:businessUnitKey/configuration` and `/:businessUnitKey/configurations` (aggregate) and, in a `for (const slice of SLICES)` loop, `GET /:businessUnitKey/configuration/${slice.path}` returning `res.status(200).json(await getSlice(...))` (`null` renders as JSON `null`). Route ORDER: register the 8 slice routes AND the aggregate route; there is no conflict because the aggregate path has no third segment. `src/routes/configuration.route.ts` (protected): in the same loop `POST` (201, body via `valueBody`-like check: for configuration the `value` may be an array, so use `if (req.body?.value === undefined || req.body.value === null) throw new CustomError(400, 'value is required in request body')`), `PUT` (200), `DELETE` (204). `validateKeyParams` on both routers. `rm SRC/controllers/configuration.controller.ts SRC/routes/configuration.route.ts`.
  Mount: `configurationReadRouter` before the gate, `configurationRouter` after.
- [ ] 7.4 `tests/integration/configuration.test.ts`: `describe.each(SLICES)`: PUT then anonymous GET returns the value (use an array for the b2b slice); POST -> 201; missing slice -> 200 with body `null`; DELETE -> 204 twice (idempotent); body `{}` -> 400 `value is required in request body`; wrong shape (`value: [1]` for an object slice) -> 400; anonymous POST/PUT/DELETE -> 401 (assert once per method, not per slice). Fallback tests: only `default-theme` stored -> `GET /service/b2b-eu/configuration/theme` returns it; both stored -> own value; aggregate: theme+footer stored -> 2 values + 7 `null`; aggregate for `b2b-eu` merges BU value for header with default values for the rest; `contentoolsBaseUrl` read from `default-contentools-base-url` string; the aggregate triggered exactly one list request (assert on `fake.requests`); `/configurations` equals `/configuration`.
  Run `yarn jest tests/integration/configuration.test.ts` -> green.

**Pitfalls.** The aggregate must not fail when the stored value of a slice has an unexpected type: ignore it (set `null`). Commercetools stores JSON `null` fields as absent: `value` of `null` is never stored (we reject it).

**Rollback.** Delete the new files; restore the source files.

---

## 8. Datasources on custom objects (Firestore replacement)

**Context.** In the source, datasource definitions lived in Firestore (`routes/datasource.route.ts` lines 15-20). Firestore is gone, so definitions become custom objects in container `datasource`, key = datasource key; built-in datasources are constants.

**Pre-conditions.** Groups 2-3.

- [ ] 8.1 `src/controllers/datasource.controller.ts`:

```ts
const defs = () => customObjects('datasource');
export async function listDatasources() {
  const stored = await defs().list();
  const storedItems = stored.map((o) => ({ key: o.key, value: o.value }));
  const builtIns = BUILT_IN_DATASOURCES.map((d) => ({ key: d.key, value: d.value }));
  return [...builtIns, ...storedItems.filter((s) => !isBuiltInDatasource(s.key))];
}
export async function getDatasource(key: string) { builtIn -> its def; else defs().getOrThrow(key) mapped to {key, value} (404 `Datasource '<key>' not found`) }
export async function createDatasource(key: string, value: unknown) { if built-in -> 409; defs().create(key, value) (409 `Datasource '<key>' already exists`); return {key, value} }
export async function putDatasource(key: string, value: unknown) { if built-in -> 409; defs().put(key, value); return {key, value} }
export async function deleteDatasource(key: string) { if built-in -> 409; await defs().delete(key) }    // idempotent
export async function testDatasource(key: string, params: Record<string, unknown>) {
  if (isBuiltInDatasource(key)) return resolveDatasourceStrict(key, params);
  const stored = await defs().get(key);
  if (!stored) throw new CustomError(404, `Datasource '${key}' not found`);
  throw new CustomError(501, 'Datasource has no resolver');
}
```
  Messages for 404/409 mirror the source `error` strings (`routes/datasource.route.ts` lines 39, 57, 100).
- [ ] 8.2 `src/schemas/datasource.ts`: `datasourceValue = z.object({ name: z.string().min(1), key: z.string().optional(), params: z.array(z.object({ key: z.string(), type: z.string(), required: z.boolean().optional() }).loose()).optional() }).loose()`; body must be `{ value: datasourceValue }` else 400 (`value is required in request body` for missing). `testBody = z.object({ params: z.record(z.string(), z.unknown()).default({}) })`.
- [ ] 8.3 Routes: `src/routes/datasource.route.ts` (protected; `validateKeyParams`): `GET /datasource`, `GET /datasource/:key`, `POST /datasource/:key` (201 `{key, value}`), `PUT /datasource/:key` (200), `DELETE /datasource/:key` (204), `POST /datasource/:key/test` (200 with `res.json(result ?? null)`; the source returned an empty body for `undefined`; JSON `null` is clearer: documented difference). `src/routes/datasource-public-resolve.route.ts` (public section): `router.post('/datasource/:key/test', publicResolveGuard, handler)` where the handler is the SAME function as the protected one (export it from a shared module `routes/datasource-handlers.ts`). E's guard calls `next('route')` when not eligible, so the request continues to the gate. Mount order in `service.route.ts`: `datasourcePublicResolveRouter` before `requireAuth`; `datasourceRouter` after. `rm SRC/routes/datasource.route.ts SRC/controllers/datasource-resolution.route.ts SRC/controllers/product.controller.ts SRC/services/products.ts` (replaced by group 3 and this group) and `routes/product.route.ts` is handled in group 8.5.
- [ ] 8.4 `tests/integration/datasource.test.ts`: list on empty -> exactly the 2 built-ins (`value.builtIn === true`); POST create -> 201; second POST -> 409 `Datasource 'x' already exists`; POST built-in key -> 409; PUT upsert creates then updates; PUT built-in -> 409; GET stored -> `{key, value}`; GET unknown -> 404; GET built-in -> definition; DELETE twice -> 204/204; DELETE built-in -> 409; invalid body -> 400; key `a/b`-like hostile -> 400; `/test` built-in `product-by-sku` with `{"params":{"sku":"S1"}}` returns the programmed projection; `products-by-sku` with 26 SKUs -> 400; stored custom -> 501; unknown -> 404; anonymous -> 401 for every route; **public resolve opt-in** (E): with `process.env.PUBLIC_DATASOURCE_RESOLVE='true'` + reset: anonymous `POST /service/datasource/product-by-sku/test` -> 200, custom key anonymous -> 401, `GET /service/datasource` anonymous -> 401; flag unset: anonymous built-in -> 401. No-Firestore guard: `grep -rni firestore src --exclude-dir=_pending` is empty (also checked in group 11).
  Run `yarn jest tests/integration/datasource.test.ts` -> green.

**Pitfalls.** Datasource keys come from the URL: always `validateKeyParams`. The `value` posted by the editor may contain extra fields: keep them (loose schema). Do not store `builtIn` in custom objects; it is added only in responses for built-ins.

**Rollback.** Delete the new files.

---

## 9. Product search route and content-type import

**Context.** The picker's search endpoint and the "import default content types" action.

**Pre-conditions.** Groups 3 and 1.2.

- [ ] 9.1 `src/routes/products.route.ts` (source `SRC/routes/product.route.ts`, 35 lines): `GET /products/search`: `text = String(req.query.text ?? req.query.q ?? '')`, `limit = Math.min(Number(req.query.limit) || 20, 50)`, `locale = String(req.query.locale ?? 'en-US')`, `res.json(await searchProductsController(text, limit, locale))`. `rm SRC/routes/product.route.ts`.
- [ ] 9.2 Content type import. Move the code out of `_pending/` (D already renamed the samples folder to `content-types/` and deleted the two dead seed files `samples/content-types.ts` and `samples/datasource.ts`, so there is no name clash with the folder):

```bash
cd <root>/service/src
mkdir -p samples utils
mv _pending/samples/content-types samples/content-types && rmdir _pending/samples
mv _pending/utils/secure-transpiler.ts utils/secure-transpiler.ts
mv _pending/controllers/content-type-import.controller.ts controllers/content-type-import.controller.ts
```
  Edits: (a) add the SPDX header to every moved file that lacks it (27 samples + `index.ts` + the two others): write a throwaway script OUTSIDE the repo (scratch dir) that prepends the exact 5-line header, run it with `node "$SCRATCH/add-spdx.mjs" src/samples/content-types src/utils src/controllers`, then verify `grep -L "SPDX-License-Identifier: MIT" samples/content-types/*.ts | wc -l` prints `0`; (b) `utils/secure-transpiler.ts`: remove the `g` flag from every pattern in `DANGEROUS_PATTERNS` (bug B6), e.g. `/eval\s*\(/`; (c) `controllers/content-type-import.controller.ts`: replace `new CustomObjectController(req, CONTENT_TYPE_CONTAINER)` with `customObjects('contentType')` and `createCustomObject(key, value)` with `put(key, value)`; remove `req`; import samples from `'../samples/content-types'`; replace the `logger` import by `getLogger()`.
  Check the sample count: `ls samples/content-types/*.ts | wc -l` prints `28` (27 samples + `index.ts`).
- [ ] 9.3 `src/routes/content-type.route.ts` (source import handler only, `SRC/routes/content-type.route.ts` lines 65-77): 

```ts
const handler = wrap(async (_req, res) => { res.status(200).json(await importDefaultContentTypes()); });
router.post('/:businessUnitKey/content-type/import', handler);
router.post('/content-type/import', handler);
```
  with `validateKeyParams`. Mount after the gate. `rm SRC/routes/content-type.route.ts` (legacy CRUD is spec C's, not ported).
- [ ] 9.4 Tests `tests/integration/products-route.test.ts`: slim mapping end to end; empty text -> `[]` and no search call; `q` alias; `limit=500` -> body `limit: 50`; default `limit` 20; default locale `en-US` appears as the `language` of the name/description clauses; `failWith(400)` -> 502 `Product search is not available for this project`; anonymous -> 401 (even with `PUBLIC_DATASOURCE_RESOLVE=true`).
  `tests/integration/content-type-import.test.ts` (timeout 60 s): both paths with credential -> 200 `imported.length === 27`, `failed === []`, container `content-type` holds 27 objects with keys like `website-logo`, each value's `code.transpiledCode` base64-decodes to a string starting with the `(function(React)` wrapper; run twice -> still 27 objects and identical response; anonymous -> 401; transpiler unit tests in `tests/unit/secure-transpiler.test.ts`: `eval(x)` rejected three times in a row (regression for the `g` flag), `window.location` rejected, a 50 001-character source rejected, a plain component accepted.
  Run `yarn jest tests/integration/products-route.test.ts tests/integration/content-type-import.test.ts tests/unit/secure-transpiler.test.ts` -> green.

**Pitfalls.** `@babel/standalone` is large (loads in ~1 s): import it lazily inside `transpile` if test start-up feels slow (`const { transform } = await import('@babel/standalone')` would make `transpile` async: only do this if needed and update callers). TypeScript may need `declare module '@babel/standalone'` if `@types/babel__standalone` does not resolve: add `src/types/babel-standalone.d.ts` then.

**Rollback.** `mv` the files back into `_pending/` from the D backup; delete new route/test files.

---

## 10. Wiring, route inventory, access matrix

**Context.** Prove the router contains exactly the 73 routes with the intended access.

**Pre-conditions.** Groups 5-9.

- [ ] 10.1 Final `src/routes/service.route.ts` (compare with E's template):

```ts
serviceRouter.use(healthRouter);
serviceRouter.use(publishedPagesRouter, publishedContentsRouter, configurationReadRouter, datasourcePublicResolveRouter);
serviceRouter.use(requireAuth);
serviceRouter.use(puckPagesRouter, puckContentsRouter, puckTemplatesRouter, configurationRouter, datasourceRouter, productsRouter, contentTypeRouter);
```
  Done when: `yarn typecheck && yarn build` pass and `ls src/_pending` contains only G's files (`routes/file.route.ts`, `controllers/file-controller.ts`, `controllers/file-controllers/`); `find src/_pending -type f | sort` should list exactly those (record the list in `explore.md` if different).
- [ ] 10.2 `tests/support/route-inventory.ts`:

```ts
interface Layer { name: string; handle: { stack?: Layer[] } & ((...a: unknown[]) => unknown); route?: { path: string; methods: Record<string, boolean> } }
export interface RouteInfo { method: string; path: string; access: 'public' | 'protected' }
export function listRoutes(app: Express): RouteInfo[] {
  const root = (app as unknown as { _router: { stack: Layer[] } })._router.stack;
  const service = root.find((l) => l.name === 'router' && l.handle.stack);     // the router mounted at /service
  const out: RouteInfo[] = []; let gate = false;
  for (const layer of service?.handle.stack ?? []) {
    if (layer.handle === requireAuth) { gate = true; continue; }
    const visit = (l: Layer) => {
      if (l.route) for (const m of Object.keys(l.route.methods)) out.push({ method: m.toUpperCase(), path: l.route.path, access: gate ? 'protected' : 'public' });
      else if (l.name === 'router') l.handle.stack?.forEach(visit);
    };
    visit(layer);
  }
  return out;
}
```
  (Express 4 internals; if the root has several routers, pick the one whose `regexp` matches `/service`; adjust until `listRoutes(createApp()).length > 0`.)
- [ ] 10.3 `tests/integration/route-inventory.test.ts`: build the expected list programmatically and assert set equality with `listRoutes(createApp())` after removing D's two health routes and G's media routes (G's entries are added to the expected list by spec G):

```ts
const bu = '/:businessUnitKey';
const itemRoutes = (p: string) => [
  ['GET', `${bu}/${p}`, 'protected'], ['GET', `${bu}/${p}/:key`, 'protected'], ['POST', `${bu}/${p}`, 'protected'],
  ['PUT', `${bu}/${p}/:key`, 'protected'], ['DELETE', `${bu}/${p}/:key`, 'protected'],
  ['GET', `${bu}/published/${p}/:key`, 'public'], ['GET', `${bu}/preview/${p}/:key`, 'protected'],
  ['POST', `${bu}/published/${p}/query`, 'public'], ['POST', `${bu}/preview/${p}/query`, 'protected'],
  ['GET', `${bu}/${p}/:key/states`, 'protected'], ['PUT', `${bu}/${p}/:key/states/published`, 'protected'],
  ['DELETE', `${bu}/${p}/:key/states/draft`, 'protected'], ['GET', `${bu}/${p}/:key/versions`, 'protected'],
];
```
  plus templates (4), configuration (2 aggregate public + 8 slices x [GET public, POST/PUT/DELETE protected]), datasource (6 protected + the conditional public `POST /datasource/:key/test`, which appears once as public and once as protected), `GET /products/search`, the two import paths. Expected total = 73 + 1 (the conditional duplicate) = 74 entries. Assert: `expect(sorted(actual)).toEqual(sorted(expected))`.
- [ ] 10.4 `tests/integration/access-matrix.test.ts`: iterate the expected list with concrete URLs (replace `:businessUnitKey` by `default`, `:key` by `k1`, `<slice>` by the real names): for every `protected` route -> request WITHOUT credentials -> `401`, and WITH `Authorization: Bearer wrong-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` -> `401`; for every `public` route (except the conditional datasource test) -> with `Authorization: Bearer garbage` the status is NOT 401/403 (it is 200/400/404 depending on data); with the valid service token every route is NOT 401/403/5xx (`GET`s on empty data give 200/404, POSTs without bodies give 400). Also a Merchant Center happy path: use E's `createMcKit()` on the same msw server (`server.use(...kit.handlers)`), sign a token for project `test-project`, `GET /service/default/puck-pages` -> 200; token for another project -> 403.
  Run `yarn jest tests/integration/route-inventory.test.ts tests/integration/access-matrix.test.ts` -> green.
- [ ] 10.5 Whole suite and gates: `yarn typecheck && yarn lint && yarn test && yarn build`. Expected: all green; total roughly 20 suites.

**Pitfalls.** If `listRoutes` misses routes mounted via `router.use(a, b)` (Express flattens them as separate layers: fine). If the inventory differs from the table by a path style (`:key` vs `:businessUnitKey`), fix the routes to use the names in the table.

---

## 11. Cleanup and static checks

- [ ] 11.1 `cd <root>/service && grep -rniE "firestore|GCP_FIRESTORE|jsonwebtoken|x-project-key|requireProjectKey|validateJwt|validateProject|AuthenticatedRequest|createApiRoot|CustomObjectController|sdk-client-v2|uuid|cms" src tests package.json --exclude-dir=_pending` -> prints nothing. (`uuid` must not appear as a dependency or import; `randomUUID` is fine.)
- [ ] 11.2 `grep -L "SPDX-License-Identifier: MIT" $(find src tests -name '*.ts' -not -path '*/_pending/*')` -> prints nothing.
- [ ] 11.3 `find src/_pending -type f | sort` lists only G's files; copy the list into `explore.md` under "Left for spec G".
- [ ] 11.4 `yarn eslint . --ext .ts` clean; `yarn build && ls build/routes | wc -l` shows the F route modules compiled and `ls build | grep _pending` empty.

---

## 12. Live sandbox smoke (env-gated; owner-assisted M-01)

**Context.** The fake commercetools cannot prove real API behaviour (`sort=id asc`, `where` syntax, Product Search activation, object size). This optional suite runs the same flows against a real sandbox project under a test container prefix.

- [ ] 12.1 Add `jest.live.config.cjs` (`testMatch: ['<rootDir>/tests/live/**/*.live.ts']`, `testTimeout: 120000`, no msw, `setupFiles: ['<rootDir>/tests/live/env.ts']` loading `service/.env.e2e` with `process.loadEnvFile('.env.e2e')`) and `package.json` script `"test:live": "jest -c jest.live.config.cjs"`.
- [ ] 12.2 `tests/live/content.live.ts`: skipped (`describe.skip`) unless `E2E_ALLOW_PROJECT_KEY === process.env.CTP_PROJECT_KEY` and `CONTAINER_PREFIX` starts with `contentools-test-` (guard from 03-testing-strategy). Flow with `createApp()` + supertest and `SERVICE_API_TOKEN` from the env file: create page -> 6 updates -> `versions.length === 5` -> publish -> anonymous published read 200 -> `GET` list contains it -> `DELETE` 204; theme PUT/GET/DELETE; datasource POST/GET/list/DELETE; import content types (27) then delete the 27 test objects via `customObjects('contentType').list()` + `delete`; product search (accept 200 or 502 and print which); `list()` pagination check: create 25 templates, list returns >= 25 (proves `limit/offset/sort=id asc` accepted), delete them; large page check: 900 KB `puckData`, 6 saves (answers Q-F3: record the result in `explore.md`).
  Without `.env.e2e` the suite is skipped: record "live smoke skipped (no sandbox)" in the final notes.
  Run `yarn test:live` -> pass or skipped.
- [ ] 12.3 Manual end check with curl against a locally started service (`node --env-file=.env build/index.js` with a real `.env` and `SERVICE_API_TOKEN`): `curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/service/default/puck-pages` -> `401`; the same with `-H "Authorization: Bearer $SERVICE_API_TOKEN"` -> `200`; `curl -s localhost:8080/service/default/configuration` -> `200` JSON with nine keys.

---

## 13. Rollback / recovery

Each group lists its own rollback. Whole change: restore `service/` from the D archive state (`git checkout` in a scratch repo) and `mv` back from `_pending` copies. No data migration is involved: container names, keys and value shapes are unchanged.

---

## 14. Definition of Done (mapped to spec scenarios)

| Spec (capability) | Scenarios covered by |
| --- | --- |
| content-api-conventions: inventory, protected routes reject anonymous | 10.3, 10.4 |
| content-api-conventions: BU isolation, wrong BU 404, hostile key 400, >20 items, missing value | 5.5 (pages/contents), 6.3, 4.2 |
| content-pages-api: create/update identity/delete cleanup/validation/published-preview/datasource on read/slug query/injection/list with states | 5.5 `puck-pages.test.ts`, 3.4 |
| content-items-api: filter by type, query, BU mismatch | 5.5 `puck-contents.test.ts` |
| content-states-versions: publish/clearDraft/revert/revert 404/concurrency/pruning (5, custom 2-3)/empty history | 4.2, 5.5 `states-versions.test.ts` |
| content-templates-api: filter, validation, delete | 6.3 |
| configuration-api: round trip, missing slice null, missing value, fallback, own value wins, aggregate | 7.5 |
| datasource-api: built-ins listed, create twice 409, no Firestore, resolve, too many SKUs, 501, public opt-in | 8.4, 11.1 |
| product-search-api: slim result, wildcard, limit cap, 502 | 3.4, 9.4 |
| content-type-import-api: both paths, idempotent, unsafe sample x3, anonymous 401 | 9.4 |
| Live behaviour (pagination, size, search activation) | 12.2 (or recorded as skipped) |

Also: `yarn typecheck && yarn lint && yarn test && yarn build` green; `src/_pending` contains only spec G's files; `questions.md` and `manual.md` handed to the coordinator.
