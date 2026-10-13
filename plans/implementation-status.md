# Implementation status (develop branch)

Per-spec detail: `plans/implementation-log/<spec>.md`. Updated by the coordinator after each merge.

## Status board

| Spec | State | Notes |
| ---- | ----- | ----- |
| A repo foundation | merged | 479 files imported, ossify run, hand-added SPDX headers (5 files) |
| B test harness | merged | service/mcp/admin-app/puck test stacks; live sandbox smoke OK; Chrome playbooks not run |
| C legacy removal | merged | 44 legacy routes, 46 MCP tools removed |
| D service core | merged | single-tenant core, no Firestore |
| E auth model | merged | deny-by-default gate; real MC forward-to check deferred |
| F content API | merged | 73 routes; live sandbox OK |
| G media storage | merged | GCS/S3/Cloudinary; live GCS check deferred (no bucket vars/Docker) |
| H connect service app | merged | `connect validate` deferred (Docker) |
| I puck workspace | merged | 10 packages `@commercetools-labs/puck-*`, local release scripts |
| J puck connection contract | merged | Chrome checks not run |
| K admin-app | merged | MC checks not run; yarn.lock lacks puck entries until rc is published |
| L admin-app Connect packaging | merged | deploy/registration deferred |
| M mcp Connect app | merged | 44 tools; live sandbox OK |
| N mcp npm adapters | merged | real publish not run |
| O local gates / release tooling | merged | `verify:strict` and `connect validate` need Docker |
| P docs | merged | 77-route API reference |
| Q acceptance | merged (phase 1) | LOCAL ACCEPTED (116 checks); FULL ACCEPTED needs phase 2 |
| R publish gate + launch | prep done, gate CLEAR (716 files, 0 FAIL, 0 WARN); versions 1.0.0-rc.0 | CP-1/2/3 await your literal replies |

## Blocked on you / the environment (all "not run", never faked)

1. **Chrome DevTools connector is detached** → no browser verification anywhere (playground AC-10, Merchant Center checks, B1–B9, K groups 8/9, J group 10, B playbooks). Reattach it and ask me to run them.
2. **Docker daemon not running** → `commercetools connect validate .`, `connect application build|start`, `yarn verify:strict`, fake-gcs-server live media check. Start Docker Desktop.
3. **GCS bucket variables** missing from `service/.env.e2e.local` → live media check (G 6.2–6.4, Q AC-08). Add `MEDIA_*` GCS keys (public-read bucket + base64 service-account key).
4. **npm**: rc publish of the 10 puck packages (CP-1) → needed before `admin-app` can `yarn install --frozen-lockfile`, and before a Connect build of admin-app. Then run `yarn install` in `admin-app/` and commit `yarn.lock`.
5. **Merchant Center**: register the custom app (Application ID), login session → phase-2 checks, forward-to PUT/multipart verification.
6. **Public repo + rc tag** → Connect deploy tests (H 9.3, L group 6, Q phase 2).

## Open questions (with the default already implemented)

| ID | Question | Default |
| -- | -------- | ------- |
| Q-A5 | Labs `gate.mjs` may flag the three files containing the word "copyright" (FooterBlock x2, footer sample) | Headers added by hand; R reports the gate result |
| Q-D6 | Log `err.message` for unexpected 500s (client body generic)? | Keep |
| Q-F1 | Datasource POST/PUT require `name` (stricter than source) | Keep |
| Q-F2 | Keep runtime `@babel/standalone` transpile at content-type import | Keep for 1.0 |
| Q-H8 | `connect validate` Trivy may flag a dev-only `braces` advisory (no patched version) | Decide after the first validate run |
| Q-H9 | `CONTAINER_PREFIX` has no `default: ""` (Connect empty-default behaviour unverified) | Keep omitted |
| Q-J-A | German catalogs are machine-translated | Ship flagged; native review before 1.0.0 |
| Q-J3 / Q-K-B | Does the MC gateway pass PUT / multipart / large uploads through forward-to? | Verify live; fallbacks designed (method override, base64 upload) |
| Q-L1 / Q-L4 | Empty MC "manage" scope accepted? `APPLICATION_URL` declaration needed? | First registration / first Connect build decides |
| Q-M7 | `create_puck_page` requires `puckData.root` (service rejects without it) | Keep required |
| Q-N-a/b | First MCP npm publish `1.0.0-rc.0` under `next`; npm README naming the old package | rc first; do not name it |
| Q-O2 / Q-O4 | Does `connect validate` need `auth login`? Version bump of root/service/admin-app/mcp stays manual | Decide at R; later `--all` flag |
| Q-Q6 | Should the MCP app honour `PORT` (fixed 8080 today)? | Keep fixed |
| P-Q | Provenance/review of the Spanish catalog | Wording as written ("carried over") |

## Missed / not ported / TODO

* Old→new MCP tool-name migration table not written (source of truth not kept in repo).
* `mcp/README.md` and INSTALL/FEATURES MCP rows do not yet mention the npm/stdio adapters (spec N) — docs follow-up pass.
* Pre-existing behaviour kept: retrying a create `POST` creates a duplicate (new UUID); only `POST /datasource/:key` answers 409.
* Runbook commands marked "to be verified": `connectorstaged update/publish` flags, API client re-creation on redeploy, partial-merge rule of `deployment redeploy`, restore procedure.
* `tools/e2e/tools.test.mjs` is not yet wired into the root scripts.
* Graceful shutdown with in-flight requests untested; S3 and Cloudinary providers verified with mocks only.
* Package READMEs use absolute GitHub URLs assuming `commercetools/contentools`.
* `develop` is already public on `origin` and contains `plans/` and `openspec/changes/**` (internal source paths). Release plan publishes a clean single commit on `main`; decide whether to delete the `develop` branch (or its history) at launch.

## Local `commercetools connect validate .` (2026-10-12, Docker running, CLI 0.0.17)

* `service`: build OK, tests OK (58 suites / 669 tests inside the Connect container). `mcp`: build OK, tests OK (16 suites / 193 tests).
* `admin-app`: **build FAILS as expected** until the 10 `@commercetools-labs/puck-*@1.0.0` packages are on npm (buildpack runs `yarn install --frozen-lockfile`; confirms Connect uses Yarn from the lockfile).
* Fixes found by running it for real: (1) the Connect test container holds only the app folder, so service suites that read repo-root files (`connect.yaml`, `docs/`) are skipped there and still run in `yarn verify`; (2) jest workers were OOM-killed in the memory-limited containers (Docker Desktop 7.6 GB): `maxWorkers: 2`, `workerIdleMemoryLimit: 512MB`, ts-jest `isolatedModules` in service and mcp.
* "Composition Analysis (Dependencies)" and "Code Analysis" were **skipped** by the CLI in every run, so the Trivy/`braces` question (Q-H8) is still open; `--skip` flag semantics need a look.

## Browser verification (Chrome DevTools connector, 2026-10-12): playground against the real service + sandbox

Run: built service on :8080 (sandbox, prefix `contentools-test-ui-*`, token mode), playground on :5174. Data removed afterwards (sweep deleted 3 objects), env file and processes cleaned up.

Verified in a real browser:
* Playground loads, no JS errors (only a favicon 404 and Nimbus accessibility `aria-label` warnings, 192x).
* CORS preflight 204 and authenticated reads 200 against the real service; Pages list and templates load.
* **Create page** via the UI → stored as a custom object in the sandbox; editor opens with the component palette (8 categories, 27 blocks), outline, viewport switches, page properties.
* **Save** → status "Draft"; **Publish** → both `draft` and `published` states exist (checked via the API); reload shows "Draft" + "Published" and the saved title.
* API access policy confirmed live: anonymous published read 200, anonymous list 401.
* **Theme tab** renders (presets selector, theme configuration).

Found and fixed: the playground's fourth tab was labelled "Renderer" instead of "Theme" (`puck/playground/src/App.tsx`).

Not verified (automation limits): Puck drag-and-drop of a block into the canvas (the canvas is inside an iframe; the connector's drag tool cannot target it; keyboard drag reported a drop but the outline stayed empty), Renderer tab rendering a page, Content Items tab, version history/revert, media picker, Merchant Center app.

## Rename (2026-10-12): `@commercetools-labs/puck-*` → `@commercetools-labs/contentools-*`

Done across code, docs, scripts, package folders (`puck/packages/contentools-*`), the Postman/docs checks and the workspace name. Verified: `puck` `yarn verify` (118 tests), publish dry run lists the 10 new names (all free on npm), `check:forbidden`, `check:hygiene`, `check:spdx`, `check:connect`, `docs:check`, `test:tools`.

**Open finding (not caused by the rename):** `admin-app` jest tests fail 15 of 25 ("Page unauthorized"/missing text) on a fresh local install that re-resolved dependencies without the lockfile (local-puck mode). The same failure reproduces with the pre-rename sources, so it is dependency drift or an environment/permissions-context difference vs. the install the K spec verified. Investigate when `admin-app` gets its real lockfile (after the npm publish): run `yarn install --frozen-lockfile` with the committed lock and re-run `yarn verify`.

## npm publish done (2026-10-13): admin-app now installs from the registry

All 10 `@commercetools-labs/contentools-*@1.0.0` packages are on npm (each also carries a registry placeholder `0.0.0-stage`, harmless). Metadata took a few minutes to propagate (`yarn cache clean` helps).

* `admin-app/yarn.lock` now has the puck entries; `yarn install --frozen-lockfile` passes.
* `admin-app` jest: **25/25 pass** with the real packages, so the earlier 15 failures were local-puck dependency drift, not a code bug.
* `yarn build` compiles (needs Connect's `ENTRY_POINT_URI_PATH`, `CUSTOM_APPLICATION_ID`, `APPLICATION_URL`, `CLOUD_IDENTIFIER` at compile-html).
* `contentools-components@1.0.0` depends on `isomorphic-dompurify@^3.18.0`, which resolves to 3.23.0 (needs Node `^22.22.2`). `admin-app/package.json` pins `resolutions: isomorphic-dompurify 3.19.0` (engines `^22.13`). Consider narrowing the range to `~3.19.0` in the next puck release (1.0.1).

## `connect validate` after the npm publish (2026-10-13, Docker 7.6 GB, CLI 0.0.17)

* Full run (3 apps in parallel): `service` build+tests OK, `mcp` build+tests OK, `admin-app` frozen install OK but webpack build **killed (exit 137, OOM)** because three builds share Docker Desktop's 7.6 GB.
* `admin-app` validated alone (scratch project with only its `connect.yaml` block, `--skip analysis`): **build OK**; tests first failed 5/25 because Connect's test container sets `ENTRY_POINT_URI_PATH` to a placeholder (`Build_Template`) and the tests read it. `src/constants.ts` now uses the `'${env:ENTRY_POINT_URI_PATH}'` placeholder (no `process.env`) and `admin-app/test-setup.js` mocks `src/constants` with `contentools` for jest; rerun (with the earlier process.env pin): **build OK, tests 25/25, "Validation Completed Successfully"**.
* To run the full three-app validate locally, raise Docker Desktop memory to 12 GB or more. Composition/Code analysis steps are still skipped by the CLI.
* Labs `gate.mjs` on a fresh export after the rename: 716 files, 1 commit, 0 failure(s), 0 warning(s), CLEAR.
