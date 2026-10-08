## 0. Vocabulary (read once)

* **TARGET** = `/Users/behnam/code/commercetools-labs/contentools` (paths below are relative to it). **SOURCE** = `/Users/behnam/code/cms` (read-only; consult it for original line numbers, the files are identical to the TARGET copies at this stage).
* **Legacy** = the older content model of the source: "content items" and grid "pages" made of rows/cells/components, compiled web components (lit + rollup bundler) and a proxy route. Superseded by **Puck** (`puck-pages`, `puck-contents`, `puck-templates`). The `cms/` web-component package is the legacy front end; it never entered the TARGET.
* **Custom object** = a JSON document stored in commercetools (container + key); the service keeps all content there.
* **BU** = business unit (`:businessUnitKey` in URLs). **MC** = Merchant Center.
* **Pending list** = `tools/forbidden-pending.txt`: files that still contain tenant/Firestore terms because a later spec (D, E, J, K, M) rewrites them.
* **Guard** = `tools/check-forbidden-terms.mjs`.
* Shell: macOS. `perl -pi -e` is used for in-place edits (portable, unlike `sed -i`). All `listFiles` commands use A's `tools/lib/files.mjs` so `node_modules`/build output are never touched.
* Helper used many times (define once in your shell): 
  ```bash
  lf() { node -e "import('./tools/lib/files.mjs').then(m=>console.log(m.listFiles('.').join('\n')))"; }
  ```

## 1. Pre-conditions

Context: C only edits the copied trees. Pre-conditions: spec A archived (`yarn test:tools` green, `yarn check:spdx` green), Node 22.

- [ ] 1.1 Verify the starting point: `ls service admin-app mcp puck tools/lib/files.mjs` works and `ls cms .github 2>&1` says "No such file or directory" for both. Done when: both are absent (the legacy `cms/` package and the old workflows are intentionally not in the TARGET).
- [ ] 1.2 Baseline counts (to compare at the end): `lf | wc -l` (about 490). Write the number in your notes.

Rollback for the whole spec: re-run A's tasks 3.1-3.6 for the tree you want to reset (the copy is deterministic), then 6.x of A (ossify).

## 2. Guard and proof scripts (tools first, so progress is measurable)

Context: two zero-dependency Node scripts. The guard fails on forbidden words; the proof script fails on calls to legacy routes. Both have `node --test` tests (style of A). Every `.mjs` carries the SPDX header (`yarn headers` adds it).

- [ ] 2.1 Create `tools/check-forbidden-terms.mjs`:
  ```js
  #!/usr/bin/env node
  import { existsSync, readFileSync } from 'node:fs';
  import { dirname, extname, join, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { listFiles } from './lib/files.mjs';

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  // Patterns are assembled from fragments so this file never matches itself.
  const f = (...p) => new RegExp(p.join(''), 'i');
  export const TERMS = [
    { id: 'cms', re: f('c', 'ms') },
    { id: 'demo', re: f('\\bdemos?\\b|commercetools-', 'demo') },
    { id: 'ct-poc', re: f('ct-', 'poc|\\bpoc\\b|pre-?sales') },
    { id: 'multitenant', re: f('multi-?', 'tenant') },
    { id: 'contenttools', re: f('content', 'tools') },
    { id: 'hosting', re: f('\\.run', '\\.app|cloud\\s?run|gcloud') },
    { id: 'internal', re: f('seller', 'tools|frontend\\.', 'site') },
    { id: 'firestore', re: f('fire', 'store') },
    { id: 'tenant-api', re: new RegExp('x-project-key|authenticate-project|refresh-jwt|validate' + 'Project|' + 'X-Project-Key', 'i') },
  ];
  // NOTE: `contenttools` must not match "Content Tools" (with space) - the pattern above has no space, good.

  const SKIP_PREFIX = ['openspec/', 'plans/', '.claude/', 'tools/check-forbidden-terms.mjs', 'tools/test/check-forbidden-terms.test.mjs'];
  const SKIP_FILE = [/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/, /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf|zip|tgz|svg)$/i];

  const readList = (p) => (existsSync(p) ? readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean) : []);

  /** Pure: hits for a file or folder NAME (every path segment is checked, e.g. `components/cms/`, `samples/CMS/`). Line 0 marks a path hit. */
  export function scanPath(path) {
    return TERMS.filter((t) => t.re.test(path)).map((t) => ({ path, line: 0, term: t.id, text: '(path name)' }));
  }

  /** Pure: hits for one file's text. */
  export function scanText(path, text) {
    const hits = [];
    text.split('\n').forEach((line, i) => {
      for (const t of TERMS) if (t.re.test(line)) hits.push({ path, line: i + 1, term: t.id, text: line.trim().slice(0, 140) });
    });
    return hits;
  }

  const inPending = (path, pending) => pending.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p));

  /** Pure decision: returns { failures: string[], tolerated: number } */
  export function evaluate(hits, pending, allow, existing) {
    const failures = [];
    let tolerated = 0;
    const allowed = new Set(allow.map((l) => l.replace(/\s+/g, ' ')));
    const withHits = new Set();
    for (const h of hits) {
      if (allowed.has(`${h.path} ${h.term}`)) continue;
      withHits.add(h.path);
      if (inPending(h.path, pending)) { tolerated++; continue; }
      failures.push(`${h.path}:${h.line}: [${h.term}] ${h.text}`);
    }
    for (const p of pending) {
      const anyHit = [...withHits].some((w) => (p.endsWith('/') ? w.startsWith(p) : w === p));
      if (!anyHit) failures.push(`stale pending entry: ${p}${existing.has(p) ? '' : ' (file missing)'}`);
    }
    return { failures, tolerated };
  }

  if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const files = listFiles(ROOT).filter((p) => !SKIP_PREFIX.some((s) => p.startsWith(s)) && !SKIP_FILE.some((re) => re.test(p)));
    const hits = files.flatMap((p) => [...scanPath(p), ...scanText(p, readFileSync(join(ROOT, p), 'utf8'))]);
    const pending = args.includes('--no-pending') ? [] : readList(join(ROOT, 'tools/forbidden-pending.txt'));
    if (args.includes('--require-empty-pending') && pending.length) { console.error('forbidden-terms: pending list must be empty in strict mode (' + pending.length + ' entries)'); process.exit(1); }
    const allow = readList(join(ROOT, 'tools/forbidden-allow.txt'));
    if (args.includes('--list')) { // counts per file, for baselines
      const by = new Map(); for (const h of hits) by.set(h.path, (by.get(h.path) ?? 0) + 1);
      for (const [p, n] of [...by].sort()) console.log(`${String(n).padStart(4)}  ${p}`);
      console.log(`total files: ${by.size}, hits: ${hits.length}`);
      process.exit(0);
    }
    const { failures, tolerated } = evaluate(hits, pending, allow, new Set(files));
    if (failures.length) { console.error(failures.join('\n') + `\nforbidden-terms: FAILED (${failures.length})`); process.exit(1); }
    console.log(`forbidden-terms: OK (${hits.length - tolerated} hits, ${pending.length} pending)`);
  }
  ```
  (`OK (0 hits, N pending)`; spec O's final state is `0 pending`.)
  Create empty `tools/forbidden-pending.txt` and `tools/forbidden-allow.txt` (each with a one-line `#` header comment explaining the format: pending = `<path or dir/>  # owner spec`; allow = `<path> <term-id>  # reason`).
- [ ] 2.2 Create `tools/check-legacy-route-calls.mjs`:
  ```js
  #!/usr/bin/env node
  import { readFileSync } from 'node:fs';
  import { dirname, extname, join, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { listFiles } from './lib/files.mjs';

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const SCOPES = ['puck/packages/', 'puck/playground/src/', 'admin-app/src/', 'mcp/src/'];
  const BU = '\\$\\{businessUnitKey\\}';
  export const ALLOW = [
    new RegExp(`^/${BU}/(?:\\$\\{mode\\}/|published/|preview/)?(?:puck-pages|puck-contents|puck-templates|configuration|upload-file|media-library|content-type/import)(?:[/?$].*)?$`),
    /^\/datasource\/.+/,
    /^\/products\/search(?:\?.*)?$/,
    /^\/health$/,
    // removed by spec K/E together with the tenant onboarding flow; keep until then:
    /^\/(?:authenticate-project|refresh-jwt)$/,
  ];

  /** Pure: every `${baseURL}/...` / `${baseUrl}/...` path found in `text`. */
  export function extractPaths(text) {
    return [...text.matchAll(/`\$\{(?:baseURL|baseUrl)\}(\/[^`]*)`/g)].map((m) => m[1]);
  }

  export function classify(paths) {
    return paths.map((p) => ({ path: p, ok: ALLOW.some((re) => re.test(p)) }));
  }

  if (import.meta.url === `file://${process.argv[1]}`) {
    const files = listFiles(ROOT).filter((p) => SCOPES.some((s) => p.startsWith(s)) && ['.ts', '.tsx'].includes(extname(p)));
    const seen = new Map(); // path -> first file
    for (const f of files) for (const p of extractPaths(readFileSync(join(ROOT, f), 'utf8'))) if (!seen.has(p)) seen.set(p, f);
    let bad = 0;
    for (const [p, f] of [...seen].sort()) {
      const ok = classify([p])[0].ok;
      if (!ok) bad++;
      console.log(`${ok ? 'OK   ' : 'FAIL '}${p.padEnd(80)} ${f}`);
    }
    console.log(`legacy-calls: ${bad ? 'FAILED' : 'OK'} (${seen.size} endpoint templates, ${bad} legacy)`);
    process.exit(bad ? 1 : 0);
  }
  ```
  Note on the regex: the `${query}` suffix of `puck-templates${query}` is accepted by the `[/?$]` class.
- [ ] 2.3 Tests (`node:test`) in `tools/test/`: `check-forbidden-terms.test.mjs` (scanText finds `Firestore` on line 3; `scanPath('puck/packages/x/src/components/cms/A.tsx')` and `scanPath('service/src/samples/CMS/a.ts')` each return a `cms` hit with line 0; a `package.json` text line `"description": "... Puck CMS integration"` is a `cms` hit; `evaluate` fails an unlisted hit, tolerates a listed hit, fails a stale pending entry, honours `allow`; "Content Tools" with a space is NOT a hit); `check-legacy-route-calls.test.mjs` (`extractPaths` on a template string; `classify` marks `/${businessUnitKey}/content-items` FAIL and `/${businessUnitKey}/puck-pages/${key}` OK, `/${businessUnitKey}/puck-templates${query}` OK).
  Command: `yarn test:tools` -> all pass.
- [ ] 2.4 Add root scripts to `package.json`: `"check:forbidden": "node tools/check-forbidden-terms.mjs"`, `"check:legacy-calls": "node tools/check-legacy-route-calls.mjs"`.
- [ ] 2.5 Baseline: `node tools/check-forbidden-terms.mjs --no-pending --list | tail -60 > <scratch>/baseline.txt` and read it. Done when: it lists the classes of explore.md section 1 (about 190 files; `puck/packages` dominates because of the scope name).

Pitfalls: `\bpoc\b` is a word match (no hit in "pocket"). The guard intentionally ignores `openspec/` and `plans/`. `listFiles` skips `public`, `dist`, `build` dirs.
Rollback: delete the two scripts, tests, two list files and the two package.json entries.

## 3. Prove what is used (before deleting anything)

Context: the HTTP calls of the front ends are plain template strings, so the compiler cannot tell us which routes are used. This script is the proof that the kept list is complete.

- [ ] 3.1 Run `mkdir -p plans/evidence/c && node tools/check-legacy-route-calls.mjs | tee plans/evidence/c/legacy-calls.txt`.
  Expected (copy of the source analysis): 28 lines, all `OK`, ending `legacy-calls: OK (28 endpoint templates, 0 legacy)` (26 puck templates + the two tenant calls `/authenticate-project` in `admin-app/src/hooks/use-contentools-api/use-contentools-api.ts:28` and `/refresh-jwt` in `admin-app/src/contexts/auth.tsx:68`). If a FAIL line appears, STOP: a legacy route is used. Record it in `questions.md` and do NOT delete that route.
- [ ] 3.2 Cross-check the service side: `grep -rn "validateJwt\|requireProjectKey" service/src/routes/puck-*.route.ts | wc -l` is informational; more importantly run `grep -rnE "from '\.\./controllers/(content-item|page|page-content-item)\.controller'" service/src | grep -v "^service/src/routes/\(content-item\|pages\|page-\)"` and expect NO output (no kept file imports the three legacy controllers except each other).
- [ ] 3.3 Confirm the three helper controllers that LOOK legacy are shared: `grep -n "content-state-controller\|content-version-controller" service/src/controllers/puck-page.controller.ts service/src/controllers/puck-content.controller.ts` prints lines (keep them).
  Done when 3.1-3.3 behave as stated and `plans/evidence/c/legacy-calls.txt` exists.

Pitfalls: the script only sees template literals that start with `${baseURL}`/`${baseUrl}`. If you ever find a call built differently (string concatenation), add a case to the script and its test.
Rollback: none (read-only).

## 4. Service: delete the legacy surface

Context: removes 44 routes and everything only they used (explore.md section 2). Work in this order so the compiler guides you. Pre-condition: Section 3.

- [ ] 4.1 Edit `service/src/routes/service.route.ts`: delete the imports of `contentItemStateRouter`, `contentItemVersionRouter`, `contentItemRouter`, `pageComponentRouter`, `pageRowRouter`, `pageStateRouter`, `pageVersionRouter`, `pagesRouter`, `proxyRouter`, `pageContentItemStateRouter`, `deprecationMiddleware` and their `serviceRouter.use('/', ...)` lines plus the `serviceRouter.use(deprecationMiddleware)` line and its comment. Final body keeps `configurationRouter`, `contentTypeRouter`, `fileRouter`, `datasourceRouter`, `productRouter`, `authRouter`, `puckPageRouter`, `puckContentRouter`, `puckTemplateRouter` in that order.
- [ ] 4.2 Delete the ten route files: `cd service/src/routes && rm content-item.route.ts content-item-state.route.ts content-item-version.route.ts page-component.route.ts page-content-item-state.route.ts page-row.route.ts page-state.route.ts page-version.route.ts pages.route.ts proxy.route.ts`.
- [ ] 4.3 Reduce `service/src/routes/content-type.route.ts` to the import route only. Keep the handler for `POST /content-type/import` (original lines 65-78, shown below) and delete the other five handlers (lines 13-64 and 80-152). Keep only these imports: `Router, RequestHandler` (express), `logger`, `importDefaultContentTypes`, `validateJwt`, `validateProject`. Remove `CustomObjectController`, `CONTENT_TYPE_CONTAINER`, `uuidv4`, `requireProjectKey` imports (unused now).
  ```ts
  const contentTypeRouter = Router();
  contentTypeRouter.post('/content-type/import', validateJwt, validateProject, (async (req, res, next) => {
    try {
      const result = await importDefaultContentTypes(req);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to import default content types:', error);
      next(error);
    }
  }) as RequestHandler);
  export default contentTypeRouter;
  ```
- [ ] 4.4 Edit `service/src/routes/file.route.ts`: delete the whole `fileRouter.post('/compile-upload', ...)` handler (from the line `fileRouter.post('/compile-upload'` to its closing `}) as RequestHandler);` just above `export default fileRouter;`). Remove imports `bundleCode` (`../utils/bundler.utils`), `CustomObjectController`, `CONTENT_TYPE_CONTAINER` (only that handler used them). Keep `POST /:businessUnitKey/upload-file` and `GET /:businessUnitKey/media-library`.
- [ ] 4.5 Delete legacy code: from `service/src`: `rm controllers/content-item.controller.ts controllers/page.controller.ts controllers/page-content-item.controller.ts mappers/page.ts utils/bundler.utils.ts utils/constants.ts utils/assert.utils.ts utils/distance.ts middleware/deprecation.middleware.ts types/rollup-plugin-string.d.ts types/sdkError.ts types/index.types.ts validators/helpers.validators.ts samples/content-types.ts samples/datasource.ts api/success.api.ts interfaces/config.interface.ts interfaces/resource.interface.ts interfaces/response.interface.ts` and `rm -r mappers api interfaces utils/__mocks__ samples/bb 2>/dev/null` (empty dirs; `samples/bb` is untracked junk and not in the TARGET - ignore the error). KEEP `validators/env.validators.ts`.
- [ ] 4.6 Edit `service/src/constants.ts`: delete the exports `CONTENT_ITEM_CONTAINER`, `CONTENT_ITEM_STATE_CONTAINER`, `CONTENT_ITEM_VERSION_CONTAINER`, `JWT_TOKEN_KEY`, `DATASOURCES` (the whole array), `SHARED_CONTAINER`, `CMS_DEPLOYED_URL_KEY`, `PAGE_VERSION_CONTAINER`, `PAGE_STATE_CONTAINER`, `CONTENT_PAGE_CONTAINER`, `PAGE_CONTENT_ITEMS_CONTAINER`, `PAGE_CONTENT_ITEM_STATE_CONTAINER`, `PAGE_CONTENT_ITEM_VERSION_CONTAINER`, `NUMBER_OF_COLUMNS`. Change the default of `CORS_ALLOWED_ORIGINS` to `'localhost:5173,localhost:3000,localhost:3001,localhost:5174'` (removes `commercetools.com,frontend.site,ct-poc.net`; spec E rewrites CORS). Keep the rest.
- [ ] 4.7 Rename the samples directory and fix its import: `git`-free: `mv service/src/samples/CMS service/src/samples/content-types`; in `service/src/controllers/content-type-import.controller.ts` change line 6 `'../samples/CMS'` to `'../samples/content-types'` and the comment at line 33 `samples/CMS/index` to `samples/content-types/index`; in `service/src/utils/constants.ts` - already deleted. In `service/src/samples/content-types/*.ts` replace any `CMS` word (run `grep -rn -i "cms" service/src/samples` - expected no output after the move; fix by hand otherwise).
  Note: `samples/content-types/footer-block.ts` is one of the three files ossify refused (a form field named `copyright`); it already carries the hand-added header from A task 6.2a. Check with `head -6 service/src/samples/content-types/footer-block.ts`.
- [ ] 4.8 Edit `service/package.json`: remove dependencies `lit`, `rollup`, `@rollup/plugin-commonjs`, `@rollup/plugin-node-resolve`, `@rollup/plugin-typescript`, `rollup-plugin-string` and devDependencies `rollup-plugin-typescript2`, `vite`, `vite-node`. Keep `@babel/standalone`, `@types/babel__standalone`. Delete the line `/temp/` from `service/.gitignore` and `temp-compile/*` from `service/.eslintignore`. (Do NOT touch `@google-cloud/firestore`, `jsonwebtoken`: D removes them; they are guarded via the pending list.)
- [ ] 4.9 Delete legacy e2e and docs: `cd service/e2e && rm auth.e2e.ts content-item.e2e.ts content-type.e2e.ts page-component.e2e.ts page-content-item-state.e2e.ts page-row.e2e.ts page-state.e2e.ts page-version.e2e.ts pages.e2e.ts proxy.e2e.ts`. Replace `service/README.md` (1132 lines of legacy API docs) by this stub:
  ```md
  # Contentools service

  Express API for Contentools (Connect `service` application, endpoint `/service`).
  This README is rewritten by spec P. Until then see `openspec/changes/` for the plan.
  ```
  Also fix `service/e2e/README.md` lines 1 and 3: `CMS service` -> `Contentools service`.
- [ ] 4.10 Compile: `cd service && yarn install && yarn tsc --noEmit -p tsconfig.json`. Expected: exit 0. Typical fixes: an `import` of a deleted module that you missed (the error names the file); unused imports are not errors for `tsc` but remove them anyway (`yarn lint`).
  Done when: `yarn tsc --noEmit` exits 0 and `yarn lint` shows no new errors.
- [ ] 4.11 Runtime proof (no credentials needed): `cd service && yarn build && (PORT=8080 node build/index.js & echo $! > /tmp/svc.pid) && sleep 2` then
  ```bash
  for p in test-bu/content-items test-bu/pages test-bu/page-items/x/states test-bu/pages/x/rows proxy-script compile-upload content-type content-type/x; do printf '%s ' $p; curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/service/$p; done
  ```
  Expected: every line ends `404`. Then `curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/service/health` -> `400` (kept route, still demands the tenant header until D/E) and `curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/service/content-type/import` -> `400`/`401` (kept route reached, auth fails). Stop the server: `kill $(cat /tmp/svc.pid)`. (If spec B is already applied, add the same checks as `service/tests/integration/legacy-removed.test.ts` with supertest; expected body `{"message":"Path not found."}`.)

Pitfalls: (1) `content-state-controller.ts` and `content-version-controller.ts` are NOT legacy: do not delete (puck controllers import them). (2) `datasource.route.ts` imports Firestore: leave it, it is pending-D. (3) `src/utils/secure-transpiler.ts` stays (content-type import). (4) Do not delete `uuid` from package.json (D prunes unused dependencies once).
Verification: 4.10 + 4.11 + the import-graph walk (spec scenario): reuse the walker from explore.md section 2 or run `npx ts-prune -p tsconfig.json` (`npx` installs it on demand) - expected: only `validators/env.validators.ts` and unused exports are reported.
Rollback: `cd` TARGET; re-copy `service/` per A and redo A 6.x (ossify) and 2.x/3.x of this spec.

## 5. MCP: prune legacy tools, rename the typo

Context: `mcp/` turns service routes into AI tools. 46 of its 88 tools call routes that no longer exist. Pre-condition: Section 4 (so you know the route list is final).

- [ ] 5.1 Delete tool groups: `cd mcp/src/shared && rm -r auth content-item content-item-version content-item-state page page-version page-state page-row page-component page-content-item-state proxy`.
- [ ] 5.2 Edit `mcp/src/shared/content-type/tools.ts`: keep only the `import_content_types` entry (original lines 73-79) and the imports/schemas it needs; delete `list_content_types`, `get_content_type`, `create_content_type`, `update_content_type`, `delete_content_type` and now-unused schema constants. Edit `mcp/src/shared/file/tools.ts`: delete the `compile_upload` entry (original line 33). 
- [ ] 5.3 Edit `mcp/src/shared/tools.ts`: keep imports/spreads only for `configurationTools`, `contentTypeTools`, `datasourceTools`, `fileTools`; `allTools = [...configurationTools, ...contentTypeTools, ...datasourceTools, ...fileTools]`.
- [ ] 5.4 Edit `mcp/src/shared/functions.ts` (592 lines): delete every map entry whose key is not one of the 42 kept methods: `get_all_configurations`; `{get,create,update,delete}_{theme,header,facet,footer,site_metadata,category_listing,translations,b2b_account_menu_links}`; `list_datasources`, `get_datasource`, `create_datasource`, `update_datasource`, `delete_datasource`, `test_datasource`; `upload_file`, `get_media_library`; `import_content_types`. Remove helper code that only the deleted entries used.
- [ ] 5.5 Rename (typo and scope), then fix names by hand where a sentence needs it:
  ```bash
  lf | grep '^mcp/' | xargs perl -pi -e 's/ContentToolsAPI/ContentoolsAPI/g; s/ContentToolsAgent/ContentoolsAgent/g; s/ContentToolsTool/ContentoolsTool/g; s/createContentToolsMcpServer/createContentoolsMcpServer/g; s/contenttools-mcp/contentools-mcp/g; s#\@commercetools-demo/#\@commercetools-labs/#g'
  ```
  In `mcp/package.json`: `"name": "@commercetools-labs/contentools-mcp"` (ossify had produced `...contenttools-mcp`; the perl above fixes it), `"description": "Contentools MCP - AI SDK, LangChain and MCP tools for the Contentools service API"`, `"clean": "rm -rf ai-sdk langchain"` (drop `mastra`). In `mcp/.gitignore` delete the `mastra/*` line.
- [ ] 5.6 Rewrite `mcp/README.md` minimally (spec P/M finish it): title `# @commercetools-labs/contentools-mcp`; one-sentence intro "Contentools MCP exposes the Contentools service API as tools for the AI SDK, LangChain and the Model Context Protocol."; keep the install and usage examples with the new names; delete the `/mastra` example and bullet (lines 47-49, 57 of the original); replace `https://your-service.run.app/service` by `https://<your-connect-service-url>/service`; replace "All CMS service routes (configuration, content types, content items, pages, datasources, file, auth, etc.)" by "Tools for configuration documents, datasources, media files and content-type import.".
- [ ] 5.7 Verify: `cd mcp && yarn install && yarn tsc --noEmit` exits 0; registry vs implementation:
  ```bash
  cd mcp && yarn tsx -e "import {allTools} from './src/shared/tools'; import * as f from './src/shared/functions'; console.log(allTools.length)"
  ```
  Expected `42`. Also `grep -rIil contenttools mcp --exclude-dir=node_modules` prints nothing. (If `functions.ts` exports the map under another name, compare with that export; the goal is: the set of `allTools[].method` equals the set of map keys.)

Pitfalls: `mcp/src/shared/api.ts` and `types/auth.ts` still carry `projectKey`/`x-project-key`: leave (spec M, pending list). The `ai-sdk/` and `langchain/` folders at `mcp/` root are build output (git-ignored), not sources.
Rollback: re-copy `mcp/` per A.

## 6. Handoff: puck and admin-app renames are NOT done in C

Context: coordinator decision after the specs I/J were drafted: C covers `service/` and `mcp/` only. Spec I renames the two `cms` directories inside `puck/` (`components/cms` -> `components/blocks` in puck-components and puck-editor), the `@commercetools-demo/` -> `@commercetools-labs/` scope inside `puck/`, and the puck prose; spec K does the admin-app renames. C therefore does NOT edit `puck/` or `admin-app/` at all, but the guard scans the whole tree, so both trees are pending entries (Section 8) until I and K finish.
This section is the checked, verbatim work list handed to I and K (do not execute it in C).

- [ ] 6.1 Confirm nothing in `puck/` or `admin-app/` was edited by C: `lf | grep -E '^(puck|admin-app)/'` timestamps are unchanged since A (`find puck admin-app -newer package.json -type f -not -path '*/node_modules/*'` prints only files A's ossify touched, or nothing).
- [ ] 6.2 Reference for spec I (puck). Scope rename command: `lf | grep '^puck/' | xargs grep -Il "@commercetools-demo" | xargs perl -pi -e 's#\@commercetools-demo/#\@commercetools-labs/#g'`. Directory renames: `mv puck/packages/puck-components/src/components/cms .../blocks`, same for puck-editor; fix imports with `perl -pi -e "s#\./cms/#./blocks/#g; s#\./cms'#./blocks'#g; s#components/cms#components/blocks#g"` over `puck/packages/(puck-components|puck-editor)/src`. Remaining prose to fix by hand (original lines from SOURCE):

  | File | Old text | New text |
  | --- | --- | --- |
  | `puck-components/src/components/index.ts:14` | `// CMS components` | `// Content block components` |
  | `puck-components/src/components/blocks/shared.ts:1,3` | `across CMS Puck components` / `cms/shared.ts` | `across the content-block Puck components` / `blocks/shared.ts` |
  | `puck-editor/src/components/index.ts:29` | `// CMS components (from /service/src/samples/CMS)` | `// Content block components (sample content types: service/src/samples/content-types)` |
  | `puck-editor/src/components/blocks/shared.ts:1,5` | `for CMS components` / `./cms/shared` | `for content-block components` / `./blocks/shared` |
  | `puck-editor/src/config/defaultPuckConfig.ts:70` | `// CMS components` | `// Content block components` |
  | `puck-editor/src/index.ts:45` | `// CMS components` | `// Content block components` |
  | `puck-editor/src/fields/RichTextField.tsx:21` | `the cms/*` | `the blocks/*` |
  | `puck-api/package.json` description | `... for the Puck CMS integration` | `... for the Contentools Puck integration` |
  | `puck-editor/package.json` | `... and CMS API integration` | `... and Contentools API integration` |
  | `puck-page-manager/package.json` | `... for the Puck CMS integration` | `... for the Contentools Puck integration` |
  | `puck-theme-manager/package.json` | `... components for Puck CMS` | `... components for Contentools Puck` |
  | `puck-types/package.json` | `... for the Puck CMS integration` | `... for the Contentools Puck integration` |
  | `puck-components/README.md:3` | `for the Puck CMS:` | `for Contentools Puck:` |
  | `puck/README.md:1` | `# Puck CMS packages` | `# Contentools Puck packages` |
  | `puck/playground/index.html:6` | `<title>Puck CMS Test App</title>` | `<title>Contentools Playground</title>` |
  I's done-when: `grep -rIil cms puck --exclude-dir=node_modules` prints nothing; each `puck/packages/*/package.json` `exports` contains only `"."` so the folder rename cannot break consumers; `cd puck && yarn install && yarn typecheck` is green.
- [ ] 6.3 Reference for spec K (admin-app). (a) `admin-app/src/constants.ts`: `entryPointUriPath = 'contentools'` and `.env.example` `ENTRY_POINT_URI_PATH=contentools` (was `multitenant-contentools-wrapper` / `contentools-wrapper`). (b) `CMS_API_URL` -> `CONTENTOOLS_SERVICE_URL` (Q-C1) in `.env.example`, `custom-application-config.mjs:20`, `src/contexts/auth.tsx:42-43`, `src/hooks/use-contentools-api/use-contentools-api.ts:21-22`, `src/routes.tsx:23,46,55,64`. (c) `custom-application-config.mjs`: delete the three `*.<region>.run.app` hosts in `connect-src` and `script-src` and the `'frame-src': ['*.ct-poc.net']` line (L rebuilds the CSP). (d) `package.json`: `"versions:demo"` -> `"versions:labs": "manypkg upgrade @commercetools-labs"`. (e) `src/components/admin-layout/index.tsx:68` badge `CMS` -> `Contentools`. (f) `src/i18n/data/core.json`: delete the five unused `Welcome.*` keys (one contains "for demo purposes"). (g) the onboarding files (`connect-project.tsx`, `contexts/auth.tsx`, `use-create-api-client`, `use-contentools-api`, `types/tenant-config.ts` with `CmsConfig`) are deleted by K. 

Pitfalls: do not "helpfully" run the scope rename over the whole tree in C: it would conflict with I's own commits. The MCP scope is renamed in C (task 5.5) because spec M/N build on it.
Rollback: n/a (nothing changed).

## 8. Pending list and final guard run

Context: tenant/Firestore terms are removed by D, E, J, K, M. The pending list records each owner so nothing is forgotten.

- [ ] 8.1 Run `node tools/check-forbidden-terms.mjs --no-pending --list`. Expected files (this is the list produced from the SOURCE analysis; reconcile by hand if yours differs, and explain any extra file in `questions.md`): 
  * D: `service/.env.example`, `service/package.json`, `service/src/app.ts`, `service/src/controllers/auth.controller.ts`, `service/src/controllers/datasource-resolution.route.ts`, `service/src/middleware/jwt.middleware.ts`, `service/src/middleware/project-key.middleware.ts`, `service/src/middleware/project.middleware.ts`, `service/src/routes/auth.route.ts`, `service/src/routes/configuration.route.ts`, `service/src/routes/content-type.route.ts`, `service/src/routes/datasource.route.ts`, `service/src/routes/file.route.ts`, `service/src/routes/puck-content.route.ts`, `service/src/routes/puck-page.route.ts`, `service/src/routes/puck-template.route.ts`, `service/src/types/service.types.ts`, `service/src/utils/firestore.utils.ts`
  * B/F (service e2e, rewritten for the new auth): `service/e2e/README.md`, `service/e2e/setup.ts`, `service/e2e/helpers/http.ts`, `service/e2e/configuration.e2e.ts`, `service/e2e/datasource.e2e.ts`, `service/e2e/file.e2e.ts`, `service/e2e/puck-content.e2e.ts`, `service/e2e/puck-page.e2e.ts`
  * I/J (whole tree, because I renames the scope and the `cms` dirs, J removes `x-project-key`): the directory prefix `puck/`
  * K (whole tree): the directory prefix `admin-app/`
  * M: `mcp/src/shared/functions.ts`, `mcp/src/types/auth.ts`
  Write them into `tools/forbidden-pending.txt`, one per line, `<path or dir/>  # <owner>` (e.g. `service/src/utils/firestore.utils.ts  # D`, `puck/  # I,J`, `admin-app/  # K`). A directory prefix is stale only if NO file under it has a hit; I and K narrow or delete their prefix as they finish.
- [ ] 8.2 (the `puck/` folder names `components/cms` and the `Puck CMS` descriptions in `package.json` files are reported by the guard through `scanPath` and the text scan; they sit under the pending prefix `puck/` until I renames them.) `yarn check:forbidden` -> `forbidden-terms: OK (0 hits, <N> pending)` where N = number of lines you wrote (about 29). Done when it exits 0. Then remove one pending line temporarily: the guard must fail naming that file with `[term]` hits; restore it. Add an inline comment at the top of the pending file: "Spec O requires this file to be empty."
- [ ] 8.3 `tools/forbidden-allow.txt` must stay empty (comment only).

## 9. Verification (all automated)

- [ ] 9.1 `yarn test:tools` -> pass. `yarn check:spdx` -> OK (new files have headers; run `yarn headers` if not).
- [ ] 9.2 `yarn check:forbidden` -> OK as in 8.2; `yarn check:legacy-calls` -> `legacy-calls: OK (<n> endpoint templates, 0 legacy)`.
- [ ] 9.3 `ls .github 2>&1 | head -1` -> "No such file or directory"; `ls cms 2>&1 | head -1` -> same.
- [ ] 9.4 Service: `cd service && yarn tsc --noEmit` and 4.11 curl checks -> as stated.
- [ ] 9.5 MCP: `cd mcp && yarn tsc --noEmit` -> exit 0; registry count 42.
- [ ] 9.8 Counts: legacy files deleted: `ls service/src/routes | wc -l` -> `10` (auth, configuration, content-type, datasource, file, product, puck-content, puck-page, puck-template, service); `ls service/e2e/*.e2e.ts | wc -l` -> `5`; `ls mcp/src/shared` shows `api.ts auth? ` (no `auth` dir) `configuration content-type datasource file format.ts functions.ts tools.ts`.

## 10. Definition of Done (scenario mapping)

* Legacy route answers 404 / kept route mounted -> 4.1-4.4, 4.11. Service has no dead module / compiles -> 4.5-4.10. Registry matches implementations -> 5.x. No workflows -> 9.3.
* Scope/cms/entry-point renames: service and mcp in 4.6, 4.7, 5.5-5.7; puck and admin-app are handed to I and K (Section 6) and tolerated through pending prefixes (8.1). Only pending files remain -> 8.x, 9.2. MCP naming -> 5.5-5.7.
* Guard hit reported / Firestore forbidden / excluded paths / stale pending fails / final state (empty at O) -> 2.1-2.3, 8.2, 8.3.
* Puck API is clean / legacy call caught / evidence recorded -> 2.2, 3.1.
* `openspec validate c-legacy-removal-and-rename --strict` passes.
