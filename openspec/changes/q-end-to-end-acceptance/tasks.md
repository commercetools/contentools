## Vocabulary (read once)

* **Sandbox project**: a commercetools project dedicated to testing (manual step M-01). Never use a project with real data.
* **Custom object / container**: key-value JSON stored in the project; the service keeps all content in containers. The acceptance run uses containers prefixed `contentools-test-`.
* **BU**: business unit key in the URL (`/service/<bu>/...`).
* **MC**: Merchant Center. **forward-to**: the MC gateway endpoint (`/proxy/forward-to`) through which the MC app calls our service with the user's session token; https targets only.
* **Evidence**: files proving a scenario passed, under `plans/evidence/q/<run-id>/` (git-ignored, never published).
* **Appendix X**: a section of `design.md` of this change; copy the file text from there.
* **Run id**: `date +%Y%m%d-%H%M%S`, exported as `RUN_ID` and reused by every command of one run.

## 0. Pre-conditions

**Two phases (release flow decided by the owner: there is no private fork).** Phase 1 (groups 1-4, 6, 8 for the local scenarios) runs on the local tree BEFORE spec R publishes anything and ends with the decision `LOCAL ACCEPTED`. Phase 2 (groups 5 and 7: deployed run, Merchant Center checks, redeploy, token rotation) runs AFTER spec R has pushed the public repository and tagged `v1.0.0-rc.N`: the Connect connector is staged from the same public repository by tag (`commercetools connect connectorstaged create --repository-url https://github.com/commercetools/contentools --repository-tag v1.0.0-rc.N ...`). Phase 2 ends with `FULL ACCEPTED`, which spec R requires before the final `v1.0.0` (CP-3). Defects found in phase 2 are fixed as normal commits in the development tree and released through R's update procedure (new rc tag); the affected scenarios are re-run.

* Specs B, F, G, H, J, L, M archived (so everything below exists). Spec N optional. Spec P (docs) done or in progress (INSTALL/runbook are exercised here).
* Manual steps done by the owner, in this order of need (M-08, the npm rc publish, is now performed by spec R at CP-1, before phase 2): M-01 (sandbox project + API client, `service/.env.e2e` placed), M-02 (optional, media), M-05 (Connect CLI login, for AC-14 and the deployed service used by AC-11), M-03 (registered custom application) and M-04 (MC session) for AC-11, M-08 (puck rc on npm) for the deployed `admin-app`. If a manual step is missing, ask once with a list of everything missing, and mark the affected scenarios SKIPPED/WAIVED rather than waiting.
* Tools: Node 22, `jq`, `curl`, Connect CLI (`npm i -g @commercetools/cli`), Chrome connector tools (`mcp__chrome-devtools__*`).
* Working directory: `/Users/behnam/code/commercetools-labs/contentools` (repo root).

## 1. Prepare tooling and an isolated environment

Context: the walkthrough must never touch real data and must leave nothing behind, so the service is started with test container names and a dedicated BU key.

- [ ] 1.1 Create `tools/e2e/` and add the four files from the appendices: `tools/e2e/acceptance.sh` (Appendix A), `tools/e2e/forge-jwt.mjs` (B), `tools/e2e/cleanup.mjs` (C), `tools/e2e/mcp-check.sh` (D). `chmod +x tools/e2e/*.sh`. Run `bash -n tools/e2e/acceptance.sh && bash -n tools/e2e/mcp-check.sh && node --check tools/e2e/cleanup.mjs && node --check tools/e2e/forge-jwt.mjs`. Expected: no output. Done when all four checks pass. (The files already carry the SPDX header.)
- [ ] 1.2 Add to the root `.gitignore` (create lines if missing): `plans/evidence/` and `**/.env.e2e`. Check: `mkdir -p plans/evidence/q/x && touch plans/evidence/q/x/RESULTS.md service/.env.e2e && git check-ignore plans/evidence/q/x/RESULTS.md service/.env.e2e` (run in a git repo; if the folder is not yet a repo, `git init` a scratch copy). Expected: both paths printed. Remove the touched files.
- [ ] 1.3 Verify the container env names still exist: `grep -nE "CONTAINER" service/src/constants.ts` (or the file that spec D/F moved them to: `grep -rn "PUCK_PAGE_CONTAINER" service/src | head -3`). Expected: `PUCK_PAGE_CONTAINER`, `PUCK_PAGE_STATE_CONTAINER`, `PUCK_PAGE_VERSION_CONTAINER`, `PUCK_CONTENT_CONTAINER`, `PUCK_CONTENT_STATE_CONTAINER`, `PUCK_CONTENT_VERSION_CONTAINER`, `PUCK_TEMPLATE_CONTAINER`, `CONFIGURATION_CONTAINER`, plus the datasource container constant added by spec F. If a name changed, use the new name everywhere below and in `CONTAINERS`.
- [ ] 1.4 Create `service/.env.e2e` (git-ignored; M-01 file; add the lines that are missing, never print its content):
  ```
  CTP_PROJECT_KEY=...   CTP_CLIENT_ID=...   CTP_CLIENT_SECRET=...   CTP_API_URL=...   CTP_AUTH_URL=...   CTP_SCOPE=...   CTP_REGION=...   (exact names per service/.env.example)
  SERVICE_API_TOKEN=<openssl rand -base64 32>
  E2E_ALLOW_PROJECT_KEY=<same as CTP_PROJECT_KEY>
  MAX_VERSIONS=3
  PUCK_PAGE_CONTAINER=contentools-test-puck-page
  PUCK_PAGE_STATE_CONTAINER=contentools-test-puck-page-state
  PUCK_PAGE_VERSION_CONTAINER=contentools-test-puck-page-version
  PUCK_CONTENT_CONTAINER=contentools-test-puck-content
  PUCK_CONTENT_STATE_CONTAINER=contentools-test-puck-content-state
  PUCK_CONTENT_VERSION_CONTAINER=contentools-test-puck-content-version
  PUCK_TEMPLATE_CONTAINER=contentools-test-puck-template
  CONFIGURATION_CONTAINER=contentools-test-configuration
  <datasource container variable from spec F>=contentools-test-datasource
  CORS_ALLOWED_ORIGINS=localhost:5173,localhost:3001   (names per spec E)
  ```
  Done when `grep -c contentools-test- service/.env.e2e` >= 9 and `grep -c . service/.env.e2e` shows the file is non-empty.
- [ ] 1.5 Export the helper variables for the whole run (every shell): `export RUN_ID=$(date +%Y%m%d-%H%M%S); export EVIDENCE_DIR=$PWD/plans/evidence/q/$RUN_ID; mkdir -p $EVIDENCE_DIR/{api,ui,mc,mcp,connect}; set -a; . service/.env.e2e; set +a; export BASE_URL=http://localhost:8080/service`. Write the first lines of `$EVIDENCE_DIR/RESULTS.md` from the Appendix E template (date, `git status --short | wc -l` as "tree state", sandbox project key redacted to its first 3 characters).

Pitfalls: `.env.e2e` must never be committed or pasted; `set -a` exports every variable, so do not run `env` afterwards into evidence. If `E2E_ALLOW_PROJECT_KEY` does not equal the project key, cleanup refuses (by design).

Rollback: delete `plans/evidence/q/<run-id>`; remove `tools/e2e/` files if the whole spec is abandoned.

## 2. Connect local run (AC-13)

Context: Connect builds each application from its own folder and starts it; running the same commands locally proves the contract before anything is deployed. Commands: skill reference `connect-cli.md` Step 4.

- [ ] 2.1 `commercetools connect validate 2>&1 | tee $EVIDENCE_DIR/connect/validate.txt`. Expected: validation passes, no errors for `service`, `admin-app`, `mcp`. Done when exit code 0.
- [ ] 2.2 For each app `<a>` in `service admin-app mcp`: `(cd <a> && commercetools connect application build 2>&1 | tee $EVIDENCE_DIR/connect/build-<a>.txt)`. Expected: exit 0; build output folder exists (`ls service/build`, `ls admin-app/build` or `public`, `ls mcp/build`). Done when all three exit 0.
- [ ] 2.3 Run each app's own tests with the CLI: `(cd service && commercetools connect application test)` and the same for `mcp`; for `admin-app` use `yarn --cwd admin-app test`. Expected: all pass. Save output into `connect/test-<a>.txt`.
- [ ] 2.4 Start the service in its own terminal/background with the e2e env: `(cd service && set -a && . ./.env.e2e && set +a && commercetools connect application start) > $EVIDENCE_DIR/connect/start-service.log 2>&1 &` (if the CLI cannot read the env file, use `yarn start:dev` inside `service/`; the service is a Yarn 1 project with its own `yarn.lock`). Wait until `curl -fsS $BASE_URL/health` answers (poll up to 60 s). Expected: HTTP 200. Done when the health call succeeds. Keep it running for groups 3-6; stop it in group 8.
- [ ] 2.5 postDeploy idempotency: `(cd service && set -a && . ./.env.e2e && set +a && yarn connector:post-deploy) ; echo rc=$?` twice. Expected: `rc=0` twice. Then list what it manages (see spec H's README: the resources, e.g. custom types or none) with a read request through the CT API (`curl -H "Authorization: Bearer $(token)" "$CTP_API_URL/$CTP_PROJECT_KEY/<resource>?limit=1"`; token via client-credentials, never print it) and compare counts before/after the second run. Done when both runs exit 0 and counts are equal. If `postDeploy` creates nothing, record "no resources" in `connect/postdeploy.txt`.
- [ ] 2.6 Same for `mcp` if it has a `postDeploy` (spec M): run twice, expect `rc=0`.

Pitfalls: `connect application start` may expect Connect-injected env var names (`CONNECT_SERVICE_URL`); read the failing message and add the variable to the shell only. Do not edit product code to make the run pass; report the defect to the owning spec.

Rollback: kill background processes (`pkill -f "connect application start"`), delete build folders (`git clean` rules in the repo ignore them).

## 3. Scripted API walkthrough (AC-01 .. AC-09)

Context: the script drives the real HTTP API with curl and checks status codes and bodies; every request/response is stored redacted. Service from task 2.4 must be running with the test containers.

- [ ] 3.1 Run `tools/e2e/acceptance.sh | tee $EVIDENCE_DIR/api/console.txt`. Expected: lines `PASS ...`, a final line `RESULT pass=<N> fail=0`, exit code 0. Time: ~1-3 minutes.
- [ ] 3.2 For each `FAIL` line: open `$EVIDENCE_DIR/api/transcript.txt` at the matching `# <id>` header and decide: (a) the script's expectation is wrong (status/shape differs but the behaviour is correct per the specs of E/F) -> fix the script (Appendix A in this change and `tools/e2e/acceptance.sh`) and re-run everything; (b) a product defect -> file it for the owning spec (note id, request, response) and fix it there; re-run everything. Done when `fail=0`.
- [ ] 3.3 Confirm the expectations against spec F's route table (`openspec/changes/f-service-content-api/design.md` section 2, or the archived copy) and spec E's access table (section 4): create 201, update 200, delete 204, datasource test 200 (built-in `products-by-sku`, body `{params}`), content-type import 200 on both `/:bu/content-type/import` and `/content-type/import`, upload per spec G. Compare with the code: `grep -rn "res.status" service/src/routes/*.ts`. Adjust the script where the code differs (and tell the owner of the spec that differs). If `PUBLIC_DATASOURCE_RESOLVE=true` is set on the service, AC02-18 must be changed to expect 200. Done when no expectation is a guess.
- [ ] 3.4 Enable the media block when a storage backend is configured (M-02): set the storage env for the service (restart it), then `E2E_MEDIA=1 tools/e2e/acceptance.sh`. Expected: AC08-01..03 PASS. If no backend: record AC-08 SKIPPED (or WAIVED) in RESULTS.md.
- [ ] 3.5 MAX_VERSIONS: the script asserts the version list length is `<= ${MAX_VERSIONS:-5}`; confirm the service ran with `MAX_VERSIONS=3` (task 1.4) so the check is meaningful: read the AC03-20c row and the transcript for `AC03-20` and verify the array length is exactly 3 (6 extra edits happened).
- [ ] 3.6 Negative matrix review: open the transcript for AC02-01..AC02-18, AC06-pub and AC09-02; every 401 body must be `{message, statusCode, correlationId, ...}` (AC02-01c asserts it) and the public configuration reads (AC06-pub, AC06-pub-all) must be 200 without a token; every response must be a JSON body with a message and no stack text (the script's `nostack` rows cover two of them; eyeball the rest). Verify AC02-08 (token only in `?access_token=`) is refused, and that AC09-02 (`x-project-key: some-other-project`) is refused for lack of token and, with a valid token, still operates on the configured project: `curl -sS -H "Authorization: Bearer $SERVICE_API_TOKEN" -H "x-project-key: some-other-project" $BASE_URL/default/puck-pages | head -c 300` returns content of the configured project (200) - save as `api/x-project-key.txt`.
- [ ] 3.7 Write the AC-01..AC-09 rows into RESULTS.md with the evidence file `api/results.tsv` (+ `api/transcript.txt`).

Pitfalls: the page `key` is server-generated (`puck-page-<uuid>`), the script reads it from the create response, never hard-code one. If the sandbox project has no products, AC07-05 may return an empty list with 200: that is a PASS. The first call after idle can take ~15 s on a deployed sandbox; the script has no timeout, curl waits.

Rollback: re-run `node tools/e2e/cleanup.mjs` (group 8) at any time; the script's own created objects are deleted by its last steps, but a failed run can leave objects.

## 4. Playground UI journey (AC-10) - Chrome DevTools connector

Context: proves the packages (`puck-editor`, `puck-page-manager`, `puck-renderer`, `puck-version-history`, `puck-theme-manager`, `puck-content-manager`, `puck-image-picker`) work together against the real service. All steps are automatable: the playground needs no Merchant Center login. Tool names are the `mcp__chrome-devtools__*` connector: load their schemas with ToolSearch first (`select:mcp__chrome-devtools__new_page,mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__take_snapshot,mcp__chrome-devtools__click,mcp__chrome-devtools__fill,mcp__chrome-devtools__drag,mcp__chrome-devtools__wait_for,mcp__chrome-devtools__evaluate_script,mcp__chrome-devtools__list_network_requests,mcp__chrome-devtools__list_console_messages,mcp__chrome-devtools__take_screenshot,mcp__chrome-devtools__upload_file,mcp__chrome-devtools__press_key`).

- [ ] 4.1 Configure and start the playground: `cp puck/playground/.env.example puck/playground/.env`; set `VITE_BASE_URL=http://localhost:8080/service`, the business unit key `contentools-acceptance`, and the credential variable that spec J defines (read `.env.example` comments: the static service token goes there; the file is git-ignored). `yarn --cwd puck install --immutable && yarn --cwd puck build && yarn --cwd puck/playground dev &` . Expected: `Local: http://localhost:5173/`. Done when `curl -fsS http://localhost:5173/ | head -c 100` returns HTML.
- [ ] 4.2 Open the app: connector `new_page` url `http://localhost:5173/`; `wait_for` text from the page list (e.g. "Pages" tab). `take_snapshot` and save it to `ui/01-pages.snapshot.txt`; `take_screenshot` to `ui/01-pages.png`. Assert via `list_console_messages` that there are no `error` entries and via `list_network_requests` that calls go to `localhost:8080/service/contentools-acceptance/...` with status 200 and that no request carries an `x-project-key` header (`get_network_request` on one request, inspect request headers). Done when all three hold.
- [ ] 4.3 **Create a page**: click the create control in the page list (label from `puck/packages/puck-page-manager/src/intl/en.json`, key `PageManager.create*`; locate in the snapshot), fill name `UI journey <RUN_ID>` and slug `/ui-<RUN_ID>`, choose template "Empty" (`PageManager.templateEmpty`), confirm. Expected: the editor opens. Screenshot `ui/02-editor-empty.png`.
- [ ] 4.4 **Add a component and edit**: with `drag` move the "Hero" entry of the component list onto the canvas drop area (from/to uids from `take_snapshot`). If the canvas shows no Hero afterwards (snapshot), use the fallback: `curl` the `PUT` of the page with the Hero data (the same body as the script's `DATA1`), reload the page in the connector (`navigate_page` type reload) and write "drag: fallback" in RESULTS notes. Then select the Hero, `fill` the title field with `UI title v1 <RUN_ID>`; wait 2.5 s (autosave is 1.5 s) using `wait_for` on the "saved"/dirty indicator or an `evaluate_script` sleep; verify persistence from the shell (never put the token into `evaluate_script`): `curl -sS -H "Authorization: Bearer $SERVICE_API_TOKEN" $BASE_URL/contentools-acceptance/puck-pages | jq '.. | .title? // empty'` includes the new title. Screenshot `ui/03-edited.png`.
- [ ] 4.5 **Publish**: click Publish (label per intl catalog). Expected: status "Published" (`PageManager.statusPublished`). Check `curl -sS $BASE_URL/contentools-acceptance/published/puck-pages/<key>` (no auth) returns the title. Screenshot `ui/04-published.png`.
- [ ] 4.6 **Render**: go to the Renderer tab (`navigate_page` `http://localhost:5173/renderer`), enter the slug/key per the tab's inputs, `wait_for` the text `UI title v1 <RUN_ID>`. Expected: visible. Screenshot `ui/05-renderer.png`. Also `evaluate_script` `() => document.body.innerText.includes('UI title v1')` returns true.
- [ ] 4.7 **Version history and revert**: back in the editor, change the title to `... v2`, wait for autosave, change to `... v3`, wait. Click "Show version history" (`VersionHistory.showHistory`), `take_snapshot`: "Saved versions" lists >= 2 entries. Click an older entry ("Previewing: <timestamp>" banner appears, `VersionHistory.previewingVersion`), then "Apply this Version" (`VersionHistory.applyThisVersion`). Expected: the editor shows the older title; `curl` preview read returns that older title; published read still returns v1 (not republished). Then use the draft revert control (the "Revert"/discard draft action of the toolbar; label from the editor intl catalog) and check preview equals published. Screenshots `ui/06-history.png`, `ui/07-reverted.png`.
- [ ] 4.8 **Theme**: open `/theme`; change one colour token (e.g. primary) to `#ff00aa`; save. `curl` the theme document `GET $BASE_URL/contentools-acceptance/configuration/theme` contains `ff00aa` (case-insensitive). Open the Renderer tab for the page and `evaluate_script` `() => getComputedStyle(document.documentElement).cssText` (or the container element) and search for `#ff00aa`/`rgb(255, 0, 170)` in any `--*` custom property: `() => [...document.styleSheets].length` is not enough; use `() => Array.from(document.querySelectorAll('*')).some(e => /255,\s*0,\s*170|ff00aa/i.test(e.getAttribute('style')||''))`. Expected true. Screenshot `ui/08-theme.png`. Restore the theme afterwards (delete via API: `DELETE $BASE_URL/contentools-acceptance/configuration/theme` with token).
- [ ] 4.9 **Template**: in the editor toolbar use "Create template" (`CreateTemplateDialog`), name `UI template <RUN_ID>`, confirm. Back to the page list, create a new page choosing that template: the editor opens with the Hero already present. `curl .../puck-templates?kind=page` lists the template. Screenshot `ui/09-template.png`.
- [ ] 4.10 **Datasource**: in the editor select a component with a datasource field (e.g. ProductTeaser: `DatasourceField`), pick a datasource (create `acceptance-ds` through the datasource UI of the field, or via API `POST /datasource/acceptance-ds`), run its test. Expected: the field shows resolved data or a clear empty-result message, network shows `POST /datasource/<key>/test` 200. Screenshot `ui/10-datasource.png`. If the project has no products, a 200 with empty data is a PASS.
- [ ] 4.11 **Media** (only when a backend is configured): select an Image component, open the image picker, `upload_file` a small PNG (generate with `printf ... | base64 -d > /tmp-free scratch path` as in the script; use a path inside the evidence dir), wait for it to appear in the library grid (`GET .../media-library` 200), select it, publish, and in the Renderer `evaluate_script` `() => [...document.images].every(i => i.complete && i.naturalWidth > 0)` returns true. Screenshot `ui/11-media.png`. Otherwise mark SKIPPED/WAIVED.
- [ ] 4.12 **Content manager**: open `/content`, create a content item, publish it, delete it (UI), verify via `curl` that it is gone (404 on preview). Screenshot `ui/12-content.png`.
- [ ] 4.13 **Final health of the session**: `list_console_messages` (types error/warn): save `ui/console.txt` - expected no errors (warnings are listed and judged); `list_network_requests`: save a summary (method, url path only, status) to `ui/network.txt` - expected no 4xx/5xx except deliberate ones (404 before publish checks if any), and no header named `x-project-key`. Write rows AC-10 into RESULTS.md with per-step PASS/FAIL notes.
- [ ] 4.14 Stop the playground (`kill %1` or `pkill -f vite`). Delete leftover pages in the UI or leave them for cleanup (group 8 removes everything).

Pitfalls: Puck is a React app with iframes: `take_snapshot` may need the iframe context; if elements are missing, take a screenshot and use coordinates with `click`. Autosave debounce is 1500 ms, so asserting too early produces false FAILs. Never put the token into `evaluate_script` bodies that are logged to evidence: read it from `$SERVICE_API_TOKEN` only in shell `curl` commands.

Verification: each step has an explicit expected result above; screenshots are the evidence.

Rollback: stop vite; group 8 cleanup.

## 5. Docs walkthrough and deployed run (AC-14, optional)

Context: spec P's INSTALL and runbook claim procedures; this group executes them, which is the only proof they are right. **Phase 2, after spec R's rc push.** Needs M-05 (Connect CLI) and the puck release candidate already on npm (published by spec R at CP-1) so Connect can build `admin-app`; the connector is staged from the public repository tag, not from a local folder. Do this group before group 7 (the MC checks need the deployed service). Replace every "stage from the repository" step by the tag form above (`--repository-url https://github.com/commercetools/contentools --repository-tag v1.0.0-rc.N`); after a fix, create a new tag, `setRepository` to it, `publish`, then `redeploy` with `updateConnector: true` (runbook, code-update chain).

- [ ] 5.1 Follow `INSTALL.md` literally from the top in a scratch directory with a fresh clone (or the current tree) and record each section `ok` / `fixed: <what>` in `connect/install-walkthrough.md`. Fix any wrong command in INSTALL.md (spec P's file) immediately.
- [ ] 5.2 Stage and deploy to a **sandbox** deployment (deployment type `sandbox`) in the project's region: follow INSTALL sections 5-6; save CLI output in `connect/deploy.txt` with `commercetools connect deployment describe --key <k>`; redact project keys. Check `curl -fsS https://<service-url>/service/health` (allow ~15 s cold start) -> 200.
- [ ] 5.3 Run the walkthrough script against the deployed service: `BASE_URL=https://<service-url>/service SERVICE_API_TOKEN=<the deployed token> tools/e2e/acceptance.sh` (the deployed service uses the real container names unless the deployment configuration overrides them: set the override keys in the deployment configuration and redeploy BEFORE running, otherwise the run writes into the real containers `puck-page` ... of the sandbox project; acceptable only because the project is a sandbox - say so in RESULTS.md and adjust cleanup `CONTAINERS`). Expected `fail=0`.
- [ ] 5.4 Redeploy with a changed configuration value: `commercetools connect deployment redeploy --key <k> --configuration MAX_VERSIONS=2`; wait; repeat the version-count check (AC03-20 style: 6 edits -> list length 2). Expected: pruned to 2. Restore the value afterwards. Record in `connect/redeploy.txt` (runbook section "Redeploy after a configuration change" verified).
- [ ] 5.5 Rotate the static token per `docs/runbook.md` ("Rotate SERVICE_API_TOKEN"): redeploy with a new `SERVICE_API_TOKEN`; the old token -> 401 and the new -> 200 (use `curl` on a write route). Record in `connect/rotate-token.txt` (no token values).
- [ ] 5.6 Broken-tag behaviour (optional, only when time allows): create a tag whose build fails (e.g. a deliberate TypeScript error in a throwaway branch), run the code-update chain from the runbook, and confirm the previous code keeps serving (`/health` still 200). Record, then delete the tag/staged version.
- [ ] 5.7 Logs: `commercetools connect deployment logs --key <k> --application service --startDate <iso> --endDate <iso> > connect/logs-service.txt`. Grep for a correlation id on a request you made (name per spec D) and note it in RESULTS.md. Redact before keeping (`sed -E 's/Bearer [A-Za-z0-9._-]+/Bearer <redacted>/'`).
- [ ] 5.8 If anything in the runbook/INSTALL was wrong, the fix is made in those files now (spec P files) and noted in RESULTS.md under "docs fixed".

Pitfalls: a sandbox deployment may take up to ~15 minutes; do not delete and recreate for config changes (redeploy only). `configurationValues` is a partial merge: pass only the keys you change. Never put the token on a command line that is saved in shell history files you share; use `read -s`.

Rollback: `commercetools connect deployment delete --key <k>` when finished (or keep it for the MC checks and delete in group 8).

## 6. MCP checks (AC-12)

- [ ] 6.1 Start the `mcp` app locally (`commercetools connect application start` in `mcp/`, port from `mcp/README.md`) pointing at the running service and with the credential variable per spec M. Confirm the endpoint path and the session-header behaviour from spec M's README and adjust `tools/e2e/mcp-check.sh` accordingly (Appendix D is a convention-based draft). Run `MCP_URL=http://localhost:<port>/<path> MCP_TOKEN=$SERVICE_API_TOKEN tools/e2e/mcp-check.sh | tee $EVIDENCE_DIR/mcp/check.txt`. Expected: `PASS initialize`, `PASS tools/list (N names)`, `PASS no legacy tools`, `PASS unauthenticated call refused`, exit 0.
- [ ] 6.2 Real client check: run `npx @modelcontextprotocol/inspector` (or add the server to an MCP-capable client with the JSON snippet from `mcp/README.md`), call the list-pages tool, then the create-page tool with name `MCP <RUN_ID>` and slug `/mcp-<RUN_ID>`, then read it back through the service: `curl -sS -H "Authorization: Bearer $SERVICE_API_TOKEN" $BASE_URL/contentools-acceptance/puck-pages | jq '.[].value.name'` includes it. Save the tool-call transcript (redacted) to `mcp/tools-call.txt`.
- [ ] 6.3 Negative: start the MCP app with a wrong `SERVICE_API_TOKEN` toward the service (or no token) and call create-page: the tool result must be an error and no page created. Save `mcp/negative.txt`.
- [ ] 6.4 If spec N (npm adapters) is implemented: from a scratch folder `npm i` the built tarball (`npm pack` in `mcp/`) and run a 10-line script using the AI-SDK adapter's `getTools()` to list tool names; expected the same set as `tools/list`. Save `mcp/adapter.txt`. Otherwise mark N/A.
- [ ] 6.5 Write the AC-12 row.

Pitfalls: Streamable HTTP responses may be `text/event-stream`; `curl` prints `data:` lines - the script greps for `"result"`; if the server answers with SSE only, the `grep -q '"result"'` still matches. Tools names must have no legacy vocabulary (content items, grid pages, authenticate).

Rollback: stop the mcp process.

## 7. Merchant Center checks (AC-11) - owner-assisted

**Phase 2.** Context: the MC app can only be exercised inside a logged-in Merchant Center session (SSO/2FA; manual step M-04). The service must be reachable over https and its `CONNECT_SERVICE_URL` must be that https URL (the session-token audience is its origin, spec E design 1b): use the deployed sandbox service from group 5 (or a tunnel, see design D-3). Prepare everything, then ask the owner once: "MC session ready? (M-04)".

- [ ] 7.1 Preparation (no owner needed): the custom application is registered (M-03) with the entry point from `admin-app/custom-application-config.mjs`; `admin-app` deployed on Connect (or run locally with `yarn --cwd admin-app start`, http://localhost:3001, which MC dev mode opens inside the MC); the app's service URL points at the https service; the deployment's allowed origins include the app URL. Run `curl -fsS https://<service-url>/service/health` first.
- [ ] 7.2 Ask the owner for M-04 (stay logged in; the Chrome connector must use that profile). `list_pages`/`select_page` to find the MC tab or `navigate_page` to `https://mc.<region>.commercetools.com/<project-key>/<entry-point>`. If a login page appears, stop and ask; never type credentials.
- [ ] 7.3 Checks (each: `take_snapshot`, `take_screenshot` into `mc/NN-*.png`, console and network review):
  1. App loads, main menu entry present, page list renders (no 401/403 in network for `forward-to` requests; the request path contains `/proxy/forward-to`).
  2. Create a page `MC <RUN_ID>`, edit the Hero title, publish. `curl` the public published route: returns the title. The service logs (`connect/logs-service.txt` or local console) show the request authorised through the session-token path, not the static token.
  3. Theme manager loads and saves (change a token, restore).
  4. Content manager lists and creates an item.
  5. Version history opens for the page.
  6. i18n: switch the MC user language to German (profile settings) and confirm labels change (catalogs exist for `en`, `de`, `es`; `de` is machine-translated, so judge only that the labels switch, not the wording); switch back.
  7. Permission denial: with a user (or temporarily a team) that lacks the application's view permission, navigating to the app route shows the MC access-denied page. If no second account is available mark WAIVED with the reason.
  8. Read-only/manage split if spec L defines separate permission groups: a view-only user sees the editor disabled or writes fail with 403.
- [ ] 7.4 Negative at the MC boundary: from the browser console on the MC tab, `fetch('https://<service-url>/service/<bu>/puck-pages', {method:'POST', ...})` without the session token (direct, not through forward-to) must be refused (401; the CORS error is also acceptable evidence) - record `mc/direct-call.txt`.
- [ ] 7.5 Write AC-11 rows (PASS/FAIL/WAIVED per check). If the owner cannot provide a session within the working session, mark AC-11 WAIVED "owner-assisted, pending" and keep a ready-to-run list in `mc/CHECKLIST.md` (copy of 7.3).

Pitfalls: the audience: if every call is 401 with a log line mentioning audience, check that `CONNECT_SERVICE_URL` equals the real https origin (plus `/service`) the browser forwards to (for a tunnel: the tunnel URL): the service accepts `aud` = origin of `CONNECT_SERVICE_URL` (admin-app sends `forward-url-origin`) and also the full-path form (spec E design 1b); fix the configuration, not the code. MC proxies cache the app assets; hard-reload after redeploy. The session-token path cannot be reproduced with curl.

Rollback: restore any changed MC permissions or language; delete the test pages via the app.

## 8. Cleanup, redaction and acceptance decision (AC-15)

- [ ] 8.1 Stop all background processes (service, mcp, vite). `jobs; pkill -f "connect application start"; pkill -f vite`.
- [ ] 8.2 Dry run of cleanup: `CONTAINERS=contentools-test-puck-page,contentools-test-puck-page-state,contentools-test-puck-page-version,contentools-test-puck-content,contentools-test-puck-content-state,contentools-test-puck-content-version,contentools-test-puck-template,contentools-test-configuration,<datasource container> node tools/e2e/cleanup.mjs --dry-run` (env from `service/.env.e2e` already exported). Expected: lists the leftover objects (e.g. UI/MC test pages).
- [ ] 8.3 Real cleanup: same command without `--dry-run`. Expected: `deleted N object(s); containers empty`. Run `--dry-run` again: `dry run: 0 object(s) listed`. If group 5.3 wrote into real containers (`puck-page`, ...), clean those too, listing only objects whose key contains the run id (manual `curl` delete by key; never a blanket delete of un-prefixed containers).
- [ ] 8.4 Media: delete the test prefix/bucket by hand in the storage console (M-02) and note it.
- [ ] 8.5 Optional deployments: `commercetools connect deployment delete --key <k>` for sandbox deployments created in group 5 (keep one if the owner wants to continue testing).
- [ ] 8.6 Redaction check: `grep -rEn "Bearer [A-Za-z0-9._-]{20,}|client_secret|BEGIN [A-Z ]*PRIVATE KEY" $EVIDENCE_DIR` -> must print nothing. Also `grep -rn "$SERVICE_API_TOKEN" $EVIDENCE_DIR` -> nothing (do not echo the token into the terminal log). Fix by editing/deleting the offending file.
- [ ] 8.7 Complete `RESULTS.md` (all AC-01..AC-15 rows, defects found and where fixed, waivers with reasons, decision LOCAL ACCEPTED / FULL ACCEPTED / NOT ACCEPTED (run group 8 at the end of each phase)). Share the summary with the owner. Record `LOCAL ACCEPTED` after phase 1 (spec R may then start CP-1) and `FULL ACCEPTED` after phase 2 (required for the final `v1.0.0` at CP-3).

## Verification summary

Automated: `tools/e2e/acceptance.sh` -> `RESULT pass=N fail=0`; `tools/e2e/mcp-check.sh` exit 0; `cleanup.mjs --dry-run` -> 0 objects; redaction grep empty. UI (Chrome DevTools): screenshots `ui/01..12`, console without errors, network without `x-project-key`. Owner-assisted: AC-11 rows.

## Rollback / recovery for the spec

All side effects are in the sandbox project's `contentools-test-*` containers (cleanup tool), the storage test prefix (manual), optional sandbox deployments (`deployment delete`) and local files under `plans/evidence/` (delete the run folder). No product code is changed by this spec except fixes made through the owning specs.

## Definition of Done (mapped to scenarios)

| Scenario (spec) | Evidence |
| --- | --- |
| Page lifecycle; Published reads public; Business-unit isolation (acceptance-scenarios) | AC03-xx rows PASS, `api/results.tsv` |
| Cleanup leaves nothing behind | task 8.3 second dry run prints 0 |
| Write without token; Forged alg none; Wrong static token; protected reads | AC02-01..AC02-18 PASS, task 3.6 review |
| Create, edit, publish, render; Version history and revert; Theme change reaches the renderer | tasks 4.4-4.8 with screenshots `ui/03..08` |
| MC session JWT accepted; Permission denied | task 7.3 items 2 and 7 (or WAIVED with reason) |
| Tool call creates and reads a page; Unauthenticated MCP call | tasks 6.1-6.3 |
| Idempotent postDeploy; Redeploy applies configuration | tasks 2.5 and 5.4 |
| Redaction check; Run accepted (acceptance-evidence) | task 8.6; RESULTS.md decision LOCAL ACCEPTED (phase 1) and FULL ACCEPTED (phase 2) |
| Ignore rules | task 1.2 |
