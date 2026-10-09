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
| R publish gate + launch | in progress (prep only, no publish) | CP-1/2/3 require your literal replies |

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
