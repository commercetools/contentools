## Vocabulary (read once)

* **Connect**: commercetools' hosting service for connectors; `connect.yaml` at the repo root lists the applications (`service`, `admin-app`, `mcp`).
* **Custom object**: a key/value JSON document stored in a commercetools project under a *container* name. All content is stored this way.
* **BU**: business unit (`businessUnitKey` in URLs); content is scoped by it.
* **MC**: Merchant Center. **Custom application**: a React app MC loads from a URL.
* **Labs gate**: `gate.mjs` from the `commercetools-labs-publish` skill, run by spec R. It FAILs on customer names / internal hosts / secrets and WARNs on the words demo, POC, pre-sales.
* **Appendix X**: a section of `design.md` in this change dir. Paste text from it; do not retype.

## 0. Pre-conditions

* Specs F, G, H, J, L, M are implemented and archived (so routes, env names and props exist). Check: `ls /Users/behnam/code/commercetools-labs/contentools/service/src/routes /Users/behnam/code/commercetools-labs/contentools/admin-app /Users/behnam/code/commercetools-labs/contentools/mcp /Users/behnam/code/commercetools-labs/contentools/puck/packages` lists them.
* Node 22, Yarn 4. Working dir for every command: `/Users/behnam/code/commercetools-labs/contentools` (the "repo root") unless stated.
* Rule for the whole spec: **the code wins**. If an appendix text disagrees with the code, fix the doc (and, in the same change, the appendix).
* Forbidden in any document: the word "cms" (any case), multi-tenant wording, Firestore, Cloud Run, "demo", "POC", "pre-sales", customer or internal names, real keys/hosts/IDs. Use `<placeholder>` values.

## 1. Collect the facts the drafts need

Context: the appendix drafts contain bracketed items `[V1]`..`[V6]`, `[V-F1]`..`[V-F3]`. Each is a fact owned by another spec. This group resolves them so the later groups are paste-and-go. Write the answers into a scratch note (scratchpad dir), not into the repo.

- [x] 1.1 Applications and paths. Run `grep -nE "name:|applicationType:|endpoint:|entryPointUriPath" connect.yaml`. Expected: three `name:` entries `service`, `admin-app`, `mcp`; `endpoint: /service` and the mcp endpoint. Done when you can fill V1.
- [x] 1.2 Env names. Run `grep -nE "^[A-Z_]+=" service/.env.example admin-app/.env.example puck/playground/.env.example`. Expected: `CTP_*` (service), `SERVICE_API_TOKEN`, storage keys, `CUSTOM_APPLICATION_ID`/`ENTRY_POINT_URI_PATH`/`CLOUD_IDENTIFIER`/`APPLICATION_URL` (admin-app), `VITE_*` (playground). Done when V2, V3 are answered.
- [x] 1.3 Root scripts. `node -e "console.log(Object.keys(require('./package.json').scripts))"`. Expected to include `verify`, `test`, `gate`. Done when V4 is answered with real names.
- [x] 1.4 Component props. `grep -n "baseURL\|businessUnitKey\|jwtToken\|getAuthHeaders\|fetcher" puck/packages/puck-types/src/*.ts puck/packages/puck-api/src/context/PuckApiProvider.tsx`. Done when V5 is answered (the exact prop list of `PageManager`, `ContentManager`, `ThemeManager`, `PuckRenderer`).
- [x] 1.5 Failure stance. Read the "stance" section of `service/README.md` (spec H) and `service/src/middleware/error*.ts`. Done when V6 is answered in one sentence and quoted from H's README.
- [x] 1.6 Route/auth matrix. Read spec E's route-auth table (`openspec/changes/e-service-auth-model/design.md`, or archived under `openspec/changes/archive/`), then confirm against code: `grep -rn "router\.\(get\|post\|put\|delete\)" service/src/routes | wc -l` and note which routes have the auth middleware. Done when the Public/Token column of Appendix F is final (V-F3).
- [~] 1.7 Status codes. Start the service (`yarn --cwd service start:dev`) and run: `curl -i http://localhost:8080/service/health`, `curl -i http://localhost:8080/service/default/puck-pages` (expect 401), and for each of: create page, update, delete, publish, revert, run it with a valid token (V-F1). Done when the success code for each verb is known.

Pitfalls: do not copy facts from `/Users/behnam/code/cms` - it is the old system.

## 2. Root community files: SUPPORT, CONTRIBUTING, SECURITY, README

Context: these four are what a stranger reads first. SUPPORT.md and CONTRIBUTING.md are required by the gate (missing = FAIL); the README banner is one of the three "unsupported" statements (file header, README banner, SUPPORT.md).

- [x] 2.1 Create `SUPPORT.md` at the repo root: paste Appendix B unchanged. Done when `grep -ci unsupported SUPPORT.md` prints >= 1.
- [x] 2.2 Create `CONTRIBUTING.md`: paste Appendix C. For each command line run it once (they take a few minutes in total) and fix names according to task 1.3. Done when every command exits 0 (record in the scratch note).
- [x] 2.3 Create `SECURITY.md`: paste Appendix D. Done when `grep -nE "@|tel:" SECURITY.md` prints nothing (no contact data).
- [x] 2.4 Create `README.md`: paste Appendix A, resolve each `[Vn]` using task 1 answers and delete the markers. Done when `sed -n 1,10p README.md` shows the banner containing UNSUPPORTED, and `grep -ciE "\bcms\b|multi-?tenan|firestore|cloud run|\bdemo\b|\bPOC\b|pre-?sales|\[V[0-9]" README.md` prints 0.
- [x] 2.5 Check links: `grep -oE "\]\(([^)#]+)" README.md SUPPORT.md CONTRIBUTING.md SECURITY.md | sed 's/.*](//' | sort -u | while read f; do [ -e "$f" ] || echo MISSING $f; done`. Expected: only files created in later groups are missing; re-run at the end of the spec, expected empty.

Pitfalls: the README must not claim features the code does not have (re-read after 1.x); the word "reference implementation" is allowed, "demo" is not.

Rollback: delete the four files; nothing else depends on them until spec R.

## 3. INSTALL.md and FEATURES.md

Context: INSTALL.md is the Connect deployment guide. The model is `/Users/behnam/code/commercetools-labs/search-config/INSTALL.md` (sections 0-7) and its README "Deploying on Connect". The Connect sequence is: register the MC custom application with a placeholder URL, deploy, put the real URLs in, redeploy, set the application Ready, install, grant team permissions. Source of truth for commands: skill references `connect-cli.md` Step 5 and `deployment-installation.md` Patterns 2-4.

- [x] 3.1 Create `FEATURES.md` from Appendix E. For every backticked path run `ls <path>`; fix paths that moved. Done when `node tools/check-docs-lint.mjs` (task 9.1) reports no missing FEATURES paths (until then verify by hand with `grep -o '`[^`]*`' FEATURES.md | tr -d '`' | grep / | while read p; do [ -e "$p" ] || echo MISSING $p; done`).
- [x] 3.2 Create `INSTALL.md` with these sections (use the sibling for tone, but write every step for THIS repo):
  1. **What you need**: commercetools project, Organization Admin in MC, Node 22, `npm install -g @commercetools/cli`, `commercetools auth login --client-credentials ...` (cite `connect-cli.md` Step 1).
  2. **Pre-flight**: scopes of the deploying client (`manage_connectors`, `manage_connectors_deployments`, `manage_api_clients` - confirm with `grep -n scopes -A8 connect.yaml` for the *runtime* client scopes, and with `search-config/tools/connect-deploy.mjs` line 33 for the deployer scopes, then state both lists separately).
  3. **Run locally** (service on 8080, admin-app `yarn start` on 3001, playground on 5173) with the env tables from tasks 1.2.
  4. **Register the Merchant Center custom application**: name "Contentools", URL placeholder `https://example.com`, entry point `contentools` (from `admin-app/custom-application-config.mjs`), scopes copied from that file (do not retype; `sed -n '/oAuthScopes/,/}/p' admin-app/custom-application-config.mjs`), main menu link, then copy the Application ID.
  5. **Deploy on Connect, first pass**: `commercetools connect validate`; `connectorstaged create --repository-url <url> --repository-tag <tag> ...`; `deployment create --connector-key <key> --region <project region> --type sandbox`; a table of configuration keys for the first deploy (from `connect.yaml`; include `SERVICE_API_TOKEN` generation: `openssl rand -base64 48`; mark it secured).
  6. **Second pass**: read the deployed URLs (`deployment describe`), set `APPLICATION_URL`, service URL for the app, allowed origins; `deployment redeploy --key <k> --configuration KEY=value`. Quote the partial-merge rule.
  7. **Publish the app URL in MC, set state Ready, install for the project, assign team permissions.**
  8. **Verify** (the checklist that spec Q automates): health 200; create a page in the app; publish; fetch it publicly; MCP `tools/list`.
  9. **Troubleshooting** table (symptom -> cause): blank page / 404 assets, 401 on every request from the Merchant Center app (`CONNECT_SERVICE_URL` is not the https origin the app forwards to, so the token audience does not match; the service accepts `aud` = origin of `CONNECT_SERVICE_URL`) or 401 from scripts (`SERVICE_API_TOKEN` wrong), CORS error (origin not allowed), first request slow (sandbox cold start ~15 s), `postDeploy` failed (check `deployment logs`, then the created resources), deployment shows old behaviour (code update chain not completed: tag -> setRepository -> publish -> `updateConnector`).
  Done when `node tools/check-docs-config.mjs` (task 9.2) passes, and a second person can follow it without asking (spec Q task 5.x does exactly that).
- [x] 3.3 Add the configuration table to INSTALL.md section 5: columns Key / Application / Secured / Required / Default / Meaning, generated from `connect.yaml`: `node -e "const y=require('yaml').parse(require('fs').readFileSync('connect.yaml','utf8')); for (const a of y.deployAs) for (const k of ['standardConfiguration','securedConfiguration']) for (const e of (a.configuration?.[k]??[])) console.log(['|',e.key,a.name,k==='securedConfiguration',!!e.required,e.default??'',e.description,'|'].join(' | '))"` (install `yaml` in a scratch dir if the repo root lacks it). Paste the output rows, then add the `inheritAs.configuration` rows and the injected `CTP_*` names as "provided by Connect". Done when each connect.yaml key has one row.

Pitfalls: never print a real token in the doc; do not mention internal hosts (the old CSP listed some - do not copy them); the MC UI labels may differ slightly, describe by name not by screenshot.

Rollback: delete the two files.

## 4. docs/architecture.md and docs/api-reference.md

Context: architecture explains how the pieces connect; the API reference is the exhaustive route table.

- [x] 4.1 Create `docs/api-reference.md`: intro (base path, BU scoping, auth legend, error body), then the error-body paragraph and the table of Appendix F (already aligned with specs E and F; only re-check it against the code, task 1.6/1.7), then a short "Payload notes" per group (page value shape `{ key, businessUnitKey, name, slug, puckData, meta, createdAt, updatedAt }` from the source README; publish semantics: `PUT .../states/published` promotes the draft, `?clearDraft=true` removes the draft afterwards; `DELETE .../states/draft` reverts to the published version; versions kept per item limited by `MAX_VERSIONS`, default 5). Done when no row contains `[V` and the number of rows equals 77 after expansion (`grep -cE '^\| [A-Za-z ]+ \| (GET|POST|PUT|DELETE)' docs/api-reference.md`, adjust if you merge `GET /health` and `/status` into two rows).
- [x] 4.2 Create `docs/architecture.md` with these sections: (1) Overview diagram (draw in ASCII like the source README but with Connect: Merchant Center -> forward-to proxy -> `service` -> commercetools custom objects + media store; storefront -> `service` public reads; `mcp` -> `service` with `SERVICE_API_TOKEN`); (2) Components (one paragraph each for service, admin-app, mcp, puck packages with the dependency graph: puck-types -> puck-api -> puck-editor -> puck-renderer / managers; puck-image-picker standalone; puck-components render-only layer); (3) **Authentication** (anchor `#authentication`, referenced by README): public = health/status, published page/content reads and queries and configuration reads; everything else (draft list, preview, templates, product search, datasource management, media library, all writes) requires a bearer; `POST /datasource/:key/test` is public only for the two built-in keys when `PUBLIC_DATASOURCE_RESOLVE=true`; the Merchant Center session token is verified server-side (admin-app sends `forward-url-origin`; the service accepts `aud` = origin of `CONNECT_SERVICE_URL`, and also the full-path form; project claim must equal the configured project) ; static `SERVICE_API_TOKEN` compared in constant time; where verification code lives (path from spec E); CORS; (4) Data model: containers `puck-page`, `puck-page-state`, `puck-page-version`, `puck-content`, `puck-content-state`, `puck-content-version`, `puck-template`, `configuration` (names from `service/src/constants.ts`; overridable by env - list the override env names that survive), key conventions per BU, how draft/published/versions are represented (read `service/src/services/` of spec F and describe, do not guess); datasources storage as implemented by F; (5) Media (backends, path `<businessUnitKey>/...`, no persistent disk on Connect); (6) Connect topology and deploy order (why `admin-app` needs npm-published puck packages); (7) Design decisions in 6 bullets (single project, BU scoping, no workspace at root, no database, public published reads, static token for machines). Done when every claim about code names a file that exists (`grep -o '`[a-z./_-]*\.ts`' docs/architecture.md | tr -d '`' | sort -u | while read f; do [ -e "$f" ] || echo MISSING $f; done` prints nothing).
- [x] 4.3 Add the route-existence test `service/tests/docs/api-reference.test.ts` (SPDX header first). Skeleton:
  ```ts
  import request from 'supertest';
  import { readFileSync } from 'node:fs';
  import { join } from 'node:path';
  import { createApp } from '../../src/app'; // use the real export from spec D/H: grep -n "export" service/src/app.ts

  const rows = readFileSync(join(__dirname, '../../../docs/api-reference.md'), 'utf8')
    .split('\n')
    .map((l) => /^\|[^|]*\|\s*(GET|POST|PUT|DELETE)(?:, (?:POST|PUT|DELETE))*\s*\|\s*`([^`]+)`/.exec(l))
    .filter(Boolean);
  // expand "POST, PUT, DELETE" cells and ":bu" -> "default" in the loop below
  describe('api-reference.md', () => {
    it.each(expanded)('%s %s is mounted', async (method, path) => {
      const res = await (request(createApp()) as any)[method.toLowerCase()](`/service${path.replace(/:bu/g, 'default').replace(/:key/g, 'x').replace(/\?.*$/, '')}`);
      expect(res.status).not.toBe(404);
    });
  });
  ```
  Handle the "same 13 routes" rows by listing them explicitly in the table (expand them in the markdown if the parser cannot). Run `yarn --cwd service test tests/docs` -> expected all pass. Done when it fails if you rename one row (try `/puck-pagez`, see the failure, revert).

Pitfalls: auth middleware may run before routing and return 401 for unknown paths too; if so the test cannot prove existence. Check with `curl -i .../service/default/does-not-exist` first; if that returns 401, assert on a router-level 404 instead (call `app._router`/`app.router.stack` introspection per Express version) and note it in the file.

Rollback: delete the files; the test file is independent.

## 5. Postman migration

Context: see design D-4. Output files are committed JSON; the script is not.

- [x] 5.1 Copy the script from Appendix G to the scratchpad dir (`$TMPDIR` is fine; NOT into the repo) as `migrate-postman.mjs`.
- [x] 5.2 Run `node migrate-postman.mjs /Users/behnam/code/cms/service/postman/cms-api-postman-collection.json service/postman/contentools-api.postman_collection.json service/postman/contentools-api.postman_environment.json` from the repo root after `mkdir -p service/postman`. Expected: exit 0, files written (73 requests; with the 4 b2b requests of task 5.3 the total is 77 = 73 F routes + 2 media + health/status). Check: `grep -ciE "cms|project_key|authenticate|proxy-script|compile" service/postman/*.json` -> `0` for both files.
- [x] 5.3 Add four requests for `b2b-account-menu-links` (GET/POST/PUT/DELETE) in the `Configuration` folder by duplicating the four `Theme` requests (same body, URL key replaced). Add any route that E/F added or renamed; remove any that they dropped, according to `docs/api-reference.md`.
- [~] 5.4 Open the collection in Postman (or run `npx newman run service/postman/contentools-api.postman_collection.json -e service/postman/contentools-api.postman_environment.json --folder Health`) against a locally running service. Expected: Health Check passes (200). Done when the import succeeds without warnings.
- [x] 5.5 Create `tools/check-docs-postman.mjs` (SPDX header; zero dependencies): read the collection, build the set `METHOD path` with `{{business_unit_key}}` -> `:bu`, `{{x_key}}` -> `:key`, drop query strings; read `docs/api-reference.md` table rows the same way; print differences; exit 1 if the sets differ. Expected output on success: `postman and api-reference agree (N routes)`. Done when it exits 0 and exits 1 when you delete one Postman request.

Pitfalls: Postman `variable` values must not contain tokens; `service_api_token` stays empty and type `secret` in the environment file. Do not commit a collection that was re-exported from the Postman app without checking for the `_postman_id` and user-specific `info` fields: `grep -n "_postman_id\|owner" service/postman/*.json`.

Rollback: delete `service/postman/`.

## 6. docs/runbook.md

Context: the Connect skill demands that a connector README states fail-open/closed, scopes, configuration table and a poison-message runbook (`references/deployment-installation.md` Pattern 6). `service/README.md` (spec H) carries those; `docs/runbook.md` is the day-2 operations guide and must stay consistent with it.

- [x] 6.1 Create `docs/runbook.md` with sections, each with exact commands:
  1. **Health and logs**: `curl -fsS https://<service-url>/service/health`; `commercetools connect deployment logs --key <deployment-key> --application service --startDate <iso> --endDate <iso>`; every log line and every error body carries `correlationId` (spec D); a user quoting the `correlationId` of an error lets you find the log lines; how to find a request by id.
  2. **Redeploy after a configuration change**: `commercetools connect deployment redeploy --key <deployment-key> --configuration KEY=value`. State: `configurationValues` is a partial merge, omitted keys keep their value; `postDeploy` re-runs and is idempotent; changes can take up to a minute; a deployment can take up to ~15 minutes.
  3. **Redeploy after a code change**: the four-step chain (push + new git tag; `connectorstaged` `setRepository` with the tag; `publish`, which runs the validation pipeline; `deployment redeploy` with `updateConnector: true`). If behaviour does not change, compare `connector.version` of the deployment with the connector's current version and read the staged connector's publishing report. A failed build leaves the previous code serving.
  4. **Rotate `SERVICE_API_TOKEN`**: (a) generate `openssl rand -base64 48`; (b) `deployment redeploy --key <k> --configuration SERVICE_API_TOKEN=<new>` (only that key; never pass a placeholder for a secured key you cannot recover); (c) wait for the redeploy; (d) update every caller: MCP client configuration, any server job, the Postman `service_api_token` variable; (e) verify: old token -> 401, new token -> 200 on `GET /service/default/preview/puck-pages/<key>` (use a real page key) and a write; (f) there is a short window between (b) and (d) where callers fail with 401: do it outside editing hours. If spec E supports two accepted tokens during rotation, document that here instead (ask in E's notes; default: single token).
  5. **Rotate the commercetools API client secret**: Connect-generated client (`inheritAs.apiClient`); redeploy re-creates it? (verify against `deployment-installation.md`; if the doc is silent, say "redeploy; confirm with `deployment logs`" and mark as verified in spec Q).
  6. **Backups and restore**: content is custom objects; export with `GET /v1/{projectKey}/custom-objects/{container}` (list the containers from architecture.md) or use the draft/version routes to restore a single item (`GET .../versions`, then `PUT` the old value back); media lives in the storage backend and must be backed up there.
  7. **Poison messages and replay: not applicable.** The connector has no event, job or subscription application and no queue or dead-letter topic. A failed request is retried by its caller; `PUT` and `DELETE` are idempotent; a retried `POST` of an existing key is rejected (verify the status in the spec F tests) rather than duplicated. If an `event` application is ever added, this section must be replaced with the detection / containment / replay runbook from the Connect skill (`observability-operations.md`).
  8. **Uninstall**: `deployment delete`; `preUndeploy` removes only what `postDeploy` created (state exactly what, from spec H); custom objects are NOT deleted - say how to delete them if wanted.
  9. **Troubleshooting** table (reuse INSTALL.md rows plus: 403 from CT -> missing scope; 502 -> commercetools unreachable; media upload fails -> storage credentials).
  Done when each procedure was executed once on the sandbox deployment (this is part of spec Q; record `ok` / `fixed: <what>` per section in the scratch note) and `grep -n "replay" docs/runbook.md` shows only section 7.
- [x] 6.2 Cross-check with `service/README.md`: the stance paragraph (fail-open/closed) and scopes list must be identical in wording to the runbook where both appear. Done when `diff <(grep -A3 -i stance service/README.md) <(grep -A3 -i stance docs/runbook.md)` shows no contradiction (differences in formatting are fine).

Pitfalls: use `<placeholders>`; never print a real token or project key; do not claim a command works that you did not run (mark "to be verified in spec Q" and make Q verify it - Q's task 5 lists them).

Rollback: delete the file.

## 7. Package READMEs

Context: the 10 packages are published to npm (`@commercetools-labs/puck-*`, scope per Q-04); npmjs shows the README of each. Source had only `puck-components` with a README. Absolute links only (design D-8).

Template (create once in the scratchpad, instantiate per package):
````markdown
# @commercetools-labs/<name>

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

<one-sentence purpose from the table below>

## Install
```bash
yarn add @commercetools-labs/<name> <peer dependencies from package.json>
```

## Usage
<minimal snippet; connection props for data-bound components>

## API
<table of exports: name | kind | what it does, from src/index.ts>

## Peer dependencies
<list identical to package.json peerDependencies>

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
````

- [x] 7.1 `puck-types`: purpose "TypeScript types shared by the other packages (pages, contents, states, versions, templates, theme tokens)". No peers. API: list from `grep -E "^export" puck/packages/puck-types/src/index.ts` (multi-line exports: open the file).
- [x] 7.2 `puck-api`: "API client and React hooks". Document `PuckApiProvider` (props from `PuckApiProviderProps`: baseURL, businessUnitKey, and the auth injection of spec J), hooks `usePuckPages`, `usePuckPage`, `usePuckContents`, `usePuckContent`, `usePuckTemplates`, `usePuckStateManagement`, `useMediaLibrary`, `resolveDatasourceApi`. Peer: react.
- [x] 7.3 `puck-components`: keep the existing README (rich-text theming section) and add the template header, install, API (`createRenderConfig`, `defaultRenderConfig`, `RichTextContent`, `sanitizeHtml`, `intlCatalogs`). Copy from `/Users/behnam/code/cms/puck/packages/puck-components/README.md`; replace `@commercetools-demo` by `@commercetools-labs`, and replace "Puck CMS" by "Puck page builder".
- [x] 7.4 `puck-editor`: `PuckEditor`, `defaultPuckConfig`/`createDefaultPuckConfig`, fields (`ImagePickerField`, `DatasourceField`, `RichTextField`), toolbar, `useDirtyState`. Include the key props (connection props, `pageKey`, `config`, `onSave`, `onPublish`, `onError`, `showPublishButton`, `autoSaveDebounceMs` default 1500 - verify in `PuckEditor.tsx`). Show how to extend `defaultPuckConfig` with a custom component (snippet in the source README "Pass a custom Puck config").
- [x] 7.5 `puck-page-manager`, `puck-content-manager`, `puck-theme-manager`: props tables (connection props, `parentUrl`, `config`, `backButton`, `defaultContentType` for content manager; theme manager exports `ImportContentTypes`, `DEFAULT_THEME`, `themePresets`, `buildCssVars`). Say they create their own React Router v5 instance with `parentUrl` as basename.
- [x] 7.6 `puck-renderer`: `PuckRenderer` props table (copy the table from `/Users/behnam/code/cms/README.md` "PuckRenderer", drop `projectKey`) and `PuckDataRenderer` for server-side rendering with a snippet that fetches with `puck-api` on the server.
- [x] 7.7 `puck-version-history`, `puck-image-picker`: purpose, exports (`VersionHistoryButton`, `VersionHistorySidebarContent`, `useVersionHistoryPanel`, `useVersionDiff`...; `ImagePickerField`, `ImagePickerProvider`, `useMediaLibrary`).
- [x] 7.8 `puck/README.md`: package table, dependency graph, build (`yarn build`, topological), versioning/publish pointer to the local release scripts of spec I (`node scripts/bump-versions.mjs <patch|minor|major|x.y.z[-pre.N]>` and `node scripts/publish-packages.mjs [--execute]`, aliases `yarn release:bump` / `yarn release:publish`; dry run by default; run by hand, no CI), playground instructions. `puck/playground/README.md`: env variables, what each tab demonstrates, "reference wiring".
- [x] 7.8b Languages: for every UI package with an `intl/` folder, say in its README (API table, `intlCatalogs` row) that catalogs exist for `en`, `de`, `es` and that **`de` is machine-translated and unreviewed** (confirm the set with `ls puck/packages/*/src/intl/` -> `en.json de.json es.json`; if spec J's output differs, the code wins). Same sentence in `puck/README.md`, in README.md (Appendix A already carries it) and in `FEATURES.md`. Done when `grep -L "machine-translated" puck/README.md README.md FEATURES.md` prints nothing.
- [x] 7.9 Verify every package: `for p in puck/packages/*; do (cd $p && npm pack --dry-run 2>&1 | grep -E "README.md|npm notice.*total files"); done` -> README.md listed for all 10. `grep -L "UNSUPPORTED" puck/packages/*/README.md` prints nothing. Peer lists equal: handled by task 9.1.

Pitfalls: scope: `@commercetools-labs` (not `@commercetools-demo`); descriptions in `package.json` must not say "CMS" (spec I) - if they still do, fix the description in that package.json in this task and tell the I owner; do not copy "multi-tenant" or `projectKey` from the old README.

Rollback: delete the READMEs.

## 8. Verify the other applications' READMEs

- [x] 8.1 `service/README.md` (H): contains config table equal to `connect.yaml`, scopes list, fail-open/closed stance, replay section ("not applicable", same text as runbook section 7), link to `docs/api-reference.md`. Fix or file a note for H if missing (this spec may edit the README in this change to finish it).
- [x] 8.2 `admin-app/README.md` (L): env table, register-first sequence summary linking INSTALL.md, scopes.
- [x] 8.3 `mcp/README.md` (M/N): endpoint, auth (`SERVICE_API_TOKEN`), how to add the server to an MCP client (JSON snippet with `<placeholders>`), npm adapters section if N is implemented; no `projectKey`.
- [x] 8.4 `grep -rniE "\bcms\b|x-project-key|authenticate-project|projectKey|firestore" service/README.md admin-app/README.md mcp/README.md puck/README.md puck/packages/*/README.md` -> no output.

## 9. Drift checks

Context: docs rot silently; there is no CI in this repository (owner decision: Connect builds and deploys; no GitHub Actions), so these scripts run locally through `yarn verify` / `yarn docs:check`.

- [x] 9.1 `tools/check-docs-lint.mjs` (SPDX header, zero deps). Behaviour: (a) README lines 1-10 contain `UNSUPPORTED`, `SUPPORT.md`, `LICENSE`; (b) walk tracked `*.md` (use `git ls-files '*.md'` when in git, else `find` excluding `node_modules`, `openspec`, `plans`) and fail on the forbidden patterns from the Pre-conditions, honouring `tools/docs-lint-allow.json` (`[{ "file": "docs/x.md", "pattern": "..." }]`, initially `[]`); (c) resolve relative markdown links; (d) every backticked path in `FEATURES.md` that contains `/` exists; (e) for each `puck/packages/*`, the peer list in its README ("## Peer dependencies") equals `peerDependencies` keys. Exit 1 with `file:line: message`. Expected on success: `docs lint ok (N files)`. Done when you can break each rule once and see the right message.
- [x] 9.2 `tools/check-docs-config.mjs`: parse `connect.yaml` (`yaml` package; add it to the root tooling hub `devDependencies` if absent: `yarn add -D yaml`, spec A's hub allows devDependencies), collect all `key:` values from every `configuration` and `inheritAs.configuration` block; load the markdown tables of `INSTALL.md`, `service/README.md`, `admin-app/README.md`, `mcp/README.md` (first cell backticked UPPER_SNAKE); fail if a key of `connect.yaml` is in no table, or a table key exists neither in `connect.yaml` nor in the allow list of injected variables (`CTP_CLIENT_ID CTP_CLIENT_SECRET CTP_SCOPE CTP_PROJECT_KEY CTP_API_URL CTP_AUTH_URL CTP_REGION CONNECT_SERVICE_URL PORT NODE_ENV` - confirm against H). Expected: `docs config ok (N keys)`.
- [x] 9.3 Wire into the root `package.json` script `docs:check` = `node tools/check-docs-lint.mjs && node tools/check-docs-config.mjs && node tools/check-docs-postman.mjs` and into `yarn verify` (edit the root `package.json` chain defined by spec A so `yarn verify` includes `docs:check`; this is the only enforcement point). Done when `yarn docs:check` exits 0.

## 10. Verification

Automated:
- `yarn docs:check` -> exit 0.
- `yarn --cwd service test tests/docs` -> all route rows pass.
- Gate dry-run on the docs only: in a scratch copy (NOT the repo): `rsync -a --exclude node_modules --exclude .git --exclude plans ./ <scratch>/c && cd <scratch>/c && git init -q -b main && git add . && git commit -qm scratch && node /Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish/scripts/gate.mjs --repo . --no-history`. Expected: no finding whose path ends in `.md` (other findings belong to other specs; note them). WARNs from `openspec/` are expected and handled in spec R.
- `grep -rniE "\bcms\b" --include=*.md . --exclude-dir=node_modules --exclude-dir=openspec --exclude-dir=plans` -> no output.

Manual / Chrome DevTools (docs are not a UI, but links on GitHub are): after spec R pushes, not now. For now: render `README.md` with any markdown preview and confirm tables and the banner render. No Chrome step in this spec.

Rollback for the spec: `git clean`-style removal of the listed files (they are all new); nothing outside docs/tests/tools is modified except possible description fixes in `puck/packages/*/package.json` (revert those individually).

## Definition of Done (mapped to scenarios)

| Scenario (spec) | Evidence |
| --- | --- |
| README banner present / forbidden wording absent / links resolve (repository-documentation) | `yarn docs:check` exit 0; `sed -n 1,10p README.md` |
| Config keys match connect.yaml; register-first order (repository-documentation) | `node tools/check-docs-config.mjs`; reviewer reads INSTALL.md steps 4-6 |
| Every documented route is mounted; removed surface not documented | `yarn --cwd service test tests/docs`; `grep` for removed route names returns nothing |
| Rotation procedure complete; poison/replay N/A | runbook sections 4 and 7 present; executed in spec Q |
| Every package has a README; peer list matches | `npm pack --dry-run` lists README.md x10; docs lint |
| FEATURES paths exist | docs lint |
| Unsupported x3; SUPPORT/CONTRIBUTING/SECURITY content; no contact data | SUPPORT.md present; header check by spec R gate; `grep -nE "@" SECURITY.md` empty |
| Gate clean for docs | gate dry run: no `.md` findings |
| Postman collection matches route table; no secrets; token documented | `node tools/check-docs-postman.mjs`; `grep -ci cms` = 0; env `service_api_token` is `secret` and empty |
