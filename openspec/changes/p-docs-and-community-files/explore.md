# Explore notes: p-docs-and-community-files

Working note (not an OpenSpec artifact). Evidence that the source and the publish rules were read.
Source = `/Users/behnam/code/cms` (read-only). Target = `/Users/behnam/code/commercetools-labs/contentools`
(at authoring time only `plans/` and `openspec/` exist; every target path below is "to be created").

## 1. What the source documents today

| Source file | Facts | Fate |
| --- | --- | --- |
| `/Users/behnam/code/cms/README.md` (~470 lines) | Warning banner says "NOT official ... NOT production ready" (wrong wording for labs). Sections: Features, Layout, Architecture, Puck packages (9 listed, `puck-components` missing from the table), Prerequisites, Local development, Using the packages, **Authentication & multi-tenancy**, Backend API, Data model (Firestore tenant registry), Theming, Publishing packages, Deployment (Cloud Run + `gcloud run deploy multitenant-contentools`), License ("provided as-is for demonstration purposes. See `service/LICENSE`"). | Rewritten (draft text in `design.md` Appendix A). Every multi-tenant, Firestore, Cloud Run, `x-project-key`, `authenticate-project`, "demonstration" and `CMS_API_URL` passage is dropped. |
| `/Users/behnam/code/cms/service/README.md` | Long per-endpoint reference that still documents legacy content-types CRUD; points at `postman/cms-api-postman-collection.json`. | Not copied. Spec H owns `service/README.md` (config table, scopes, fail stance). `docs/api-reference.md` (this spec) is the route table. |
| `/Users/behnam/code/cms/service/LICENSE` | A LICENSE file inside a subdirectory. `ossify.mjs` stops at any directory carrying its own LICENSE and `gate.mjs` FAILs "third-party subtree" on it. | MUST NOT be copied to the target (spec A should not copy it; spec R re-checks). Root `LICENSE` is written by `ossify.mjs --apply`. |
| `/Users/behnam/code/cms/mcp/README.md` | Documents `@commercetools-demo/contenttools-mcp`, `projectKey`/`jwtToken` auth, Mastra export, "All CMS service routes". | Rewritten by spec M/N; this spec only checks the result (task 7). |
| `/Users/behnam/code/cms/puck/packages/puck-components/README.md` | The ONLY package README in the source (rich-text CSS variable theming). Other 9 packages have none. | Kept (renamed scope) + 9 new package READMEs. |
| `/Users/behnam/code/cms/puck/README.md`, `puck/docs/api-contracts.json` | Workspace readme; JSON API contract snapshot. | `puck/README.md` rewritten; `api-contracts.json` goes through the `.json` path of the gate (names/infra scan) - spec I decides keep/drop. |
| `/Users/behnam/code/cms/service/postman/cms-api-postman-collection.json` + `cms-api-postman-environment.json` | 76 requests in 9 folders: Auth (3), Configuration (30), Content Types (6), File Management (3), Datasources (6), Puck Pages (13), Puck Contents (13), Health (1), Proxy (1). 41 requests carry a per-request bearer `{{bearer_token}}`, 30 an `x-project-key: {{project_key}}` header. Names contain "CMS" (collection name, env id). | **Migrate** (decision D-4 in design.md). A proof-of-feasibility transform was run in the scratchpad and produced 76 -> 71 requests (pruned 10, added 5: 4 template requests + product search) (see design.md D-4); 4 more for `b2b-account-menu-links` are added by task 5.3. |
| `/Users/behnam/code/cms/release.md`, `task.md`, `TODO.md`, `todo-rest.md` | Internal notes. | Not migrated. |

## 2. Route inventory for `docs/api-reference.md` (source: `service/src/routes/*.route.ts`)

Mounted in `service/src/routes/service.route.ts` (19 routers). Routers that survive (Q-02 default): `puck-page`, `puck-content`, `puck-template`, `configuration`, `datasource`, `product`, `file` (`upload-file`, `media-library`), `content-type` (**only** `POST /content-type/import`), `auth` (**only** `GET /health`, rewritten). Removed: `auth` (`/authenticate-project`, `/refresh-jwt`), legacy `content-item*`, `pages`, `page-row`, `page-component`, `page-state`, `page-version`, `page-content-item-state`, `proxy` (`/proxy-script`), `file` `POST /compile-upload`, `content-type` CRUD (`GET /content-type`, `GET|PUT|DELETE /content-type/:key`, `POST /content-type`).

Counted from the route files (grep `Router.(get|post|put|delete)`):

* `puck-page.route.ts`: 13 routes (lines 21, 39, 61, 90, 120, 139, 165, 192, 219, 246, 269, 295, 322): list, get, create, update, delete, `published/:key`, `preview/:key`, `published/query`, `preview/query`, `:key/states`, `PUT :key/states/published`, `DELETE :key/states/draft`, `:key/versions`.
* `puck-content.route.ts`: the same 13 under `/:businessUnitKey/puck-contents`.
* `puck-template.route.ts`: 4 (list `?kind=page|content`, get, create, delete - **no PUT**).
* `configuration.route.ts`: `GET /:bu/configuration` (+ alias `/configurations`) and GET/POST/PUT/DELETE for 8 keys: theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links (34 handlers = 8x4 + 2; verified with `grep -c` on the route file). The constant `CONFIGURATION_CONTENTOOLS_BASE_URL_KEY` in `service/src/constants.ts` has no route. The Postman collection only covers 7 keys (no b2b-account-menu-links) - the api-reference must list what the code mounts, not what Postman had.
* `datasource.route.ts`: `GET /datasource`, `GET|POST|PUT|DELETE /datasource/:key`, `POST /datasource/:key/test`. NOTE: in the source these read/write a **Firestore** collection (`getDatasourcesCollection(projectKey)`, lines ~328-420). Firestore is removed (spec D), so spec F must move datasources to custom objects; the route contract stays.
* `product.route.ts`: `GET /products/search?text=&limit=&locale=`.
* `file.route.ts`: `POST /:bu/upload-file` (multipart), `GET /:bu/media-library?extensions=&page=&limit=`.
* `content-type.route.ts`: `POST /content-type/import` (kept).
* health: `GET /health` (today behind `requireProjectKey`; target `GET /service/health`, no auth - testing strategy requires 200).

Auth column in the target route table: derived from the E default (Q-01a): `published/*` reads public, `preview/*` + every write + configuration writes need bearer. Reads of configuration (`theme` is needed by the public renderer), datasources and media library are spec E's call: `docs/api-reference.md` is written from E's final route-auth matrix (task 4.1 says where to read it). Until E lands, the draft table in `design.md` Appendix F uses the E default.

## 3. Facts used by the runbook / INSTALL

* Connect redeploy semantics (skill `references/deployment-installation.md`, Pattern 4): `configurationValues` on `redeploy` is a **partial merge**; code updates need `updateConnector: true` AND a new git tag -> `setRepository` -> `publish` first; failed new build keeps the old code serving; `postDeploy` re-runs by default (idempotent required); logs via `deployment logs` / `GET /{projectKey}/deployments/{id}/logs`.
* Connect CLI (skill `references/connect-cli.md` Step 5): `commercetools connect connectorstaged create|describe|preview|publish`, `deployment create|describe|logs|redeploy|list|delete`, `connect validate`, `connect application build|start|test`.
* Injected API client env names (skill `references/security.md` line 86): `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`, `CTP_PROJECT_KEY`, `CTP_API_URL`, `CTP_AUTH_URL` (the locked-decision list mentions `CTP_REGION`; spec D/H settle which of these the service reads - docs say "see `service/README.md` config table").
* MC custom application registration steps - model: `/Users/behnam/code/commercetools-labs/search-config/INSTALL.md` (register with placeholder URL -> deploy -> replace URL -> Ready -> install -> team permissions; `mc-scripts config:sync` caveat). Connect-deploy two-pass model (`APPLICATION_URL` dummy first, then real) in `search-config/README.md` "Deploying on Connect".
* Source MC config `/Users/behnam/code/cms/contentools/custom-application-config.mjs` has a hard-coded internal CSP (`*.run.app` regions, `*.ct-poc.net`) - Q-13 default replaces it (spec L). The docs must not repeat those hosts.
* Runbook "poison message / replay": there is NO `event` or `job` app and no Subscription in this connector (brief + master plan), so the Connect-skill README requirement is satisfied with an explicit "not applicable" section that says why and what to do instead (client retry on 5xx, idempotent PUT/DELETE).

## 4. Sibling-repo conventions checked (`/Users/behnam/code/commercetools-labs/`)

* `search-config` has: `README.md` (banner blockquote, layout table, quick start, "Deploying on Connect"), `INSTALL.md`, `FEATURES.md` ("what it does, with pointers to the code"), `SUPPORT.md`, `CONTRIBUTING.md`, `LICENSE`, `docs/service-runbook.md`, `docs/scenarios/`. No `SECURITY.md` anywhere in the labs repos (`ls` of every sibling).
* Other siblings (`ai-assistant`, `commercetools-magic-view`, `discounts-preview`, `industry-starter`): only SUPPORT/CONTRIBUTING (checked with `ls | grep`). Only `search-config` has FEATURES.md and INSTALL.md.
* The publish skill says "no `FEATURES.md` requirement" - so FEATURES.md is optional. DECISION: include it (sibling parity, and it is the cheapest place to show feature -> code mapping; parity matrix is in `plans/00-master-plan.md` section 3). Raised as question P-Q1 (default include).
* `search-config/SUPPORT.md` and `CONTRIBUTING.md` are the wording models; adapted in `design.md` Appendix B and C.

## 5. Gate behaviours that constrain docs (read from `scripts/gate.mjs`, `scripts/ossify.mjs`; policy.json NOT copied)

* Docs are scanned too: every tracked text file (md included) goes through secret, customer-name, internal-infra (FAIL) and name-review, **demo framing** (WARN: the words "demo", "POC", "pre-sales" at word boundary) scans. A README sentence such as "this is a demo" costs a WARN; prose saying "commercetools-demo" costs a WARN (hyphen is a word boundary). Docs must not contain either.
* `gate.mjs` required files: `LICENSE`, `SUPPORT.md`, `CONTRIBUTING.md` (FAIL if missing). README/SECURITY/FEATURES/INSTALL are not checked by the gate - the local doc checks (task 9, run by `yarn verify`) are.
* `.md` is in ossify's skip list (no SPDX header on markdown); `.json` too, so the Postman JSON needs no header.
* Forbidden tracked files include `.env` and `*.key`: docs must refer to `.env.example`, never ship a real `.env`.

## 6. Risks / cross-spec observations

1. Package descriptions in the source still say "Puck CMS integration" (e.g. `puck-api`, `puck-editor`, `puck-page-manager`, `puck-theme-manager`, `puck-types`) and source folders are named `puck-editor/src/components/cms`, `puck-components/src/components/cms/shared`. The no-"cms" grep (spec C/O) must catch folder names AND descriptions; per-package READMEs here must use the new descriptions. Reported to coordinator.
2. Package READMEs are consumed on npmjs.com; relative links (`../puck-api`) break there. Use absolute `https://github.com/commercetools/contentools/tree/main/...` links in package READMEs only (task 6.2).
3. Docs reference prop names fixed by spec J and env names fixed by D/E/H/L/M. To avoid invented facts the tasks add two automated doc-drift checks (task 8): config keys in `connect.yaml` vs the INSTALL table, and documented routes vs mounted routes (supertest, status != 404).
4. Public-repo hygiene: runbook must not name real hosts, project keys or tokens; examples use `<placeholder>`.
5. npm package pages need a LICENSE inside each published package directory; a per-package `LICENSE` file in git would trip `gate.mjs` ("third-party subtree"). Resolution recorded in spec R design (copy in `prepack`, git-ignored). Package READMEs must therefore say "MIT, see the repository LICENSE" without relying on a local file.

## 7. Updates after coordinator messages

* No CI anywhere (owner decision): CONTRIBUTING says run `yarn verify` locally; docs checks run through `yarn verify`; puck releases use the local scripts of spec I (`puck/scripts/bump-versions.mjs`, `puck/scripts/publish-packages.mjs`).
* Locales: `en`, `de`, `es` (spec J adds a machine-translated `de`, keeps `es`); docs flag `de` as machine-translated (task 7.8b).
