## Context

Everything user-facing in the published repository is a document. The source has one README (wrong
for labs), no INSTALL, no SUPPORT/CONTRIBUTING and a single package README. This spec produces the
whole documentation set. Text is drafted here so the implementer pastes and adjusts, rather than
inventing wording that might trip the gate (WARN on "demo", FAIL on names/hosts) or contradict the
"unsupported x3" rule.

Authoritative inputs: `plans/00-master-plan.md`, `plans/04-spec-author-brief.md` (locked decisions),
the publish skill (`commercetools-labs-publish`), sibling `search-config` docs, the Connect skill
`references/deployment-installation.md` (README contract: fail-open/closed, scopes, config table,
replay runbook).

## Goals / Non-Goals

Goals: a stranger can install, operate, extend and contribute from docs; docs cannot drift silently
(two automated checks); wording passes `gate.mjs`.
Non-goals: marketing material; a docs site; documenting legacy routes; restating `connect.yaml`
descriptions verbatim in more than one place (single table, linked elsewhere).

## Decisions

### D-1 Document set and ownership

| File | Owner (writes first draft) | This spec's job |
| --- | --- | --- |
| `README.md`, `INSTALL.md`, `FEATURES.md`, `SUPPORT.md`, `CONTRIBUTING.md`, `SECURITY.md` | P | write |
| `docs/architecture.md`, `docs/api-reference.md`, `docs/runbook.md` | P | write |
| `puck/packages/*/README.md`, `puck/README.md`, `puck/playground/README.md` | P | write |
| `service/README.md` (config table, scopes, fail stance, replay N/A) | H | verify it satisfies the Connect README contract, link from root docs |
| `admin-app/README.md` | L | verify |
| `mcp/README.md` | M / N | verify |
| `openspec/**` | all | not documentation for users; see spec R for what is published |

Rationale: H/L/M carry the Connect production-readiness checklist, so their READMEs are their
Definition of Done; P must not duplicate their config tables (drift) - it links and checks.

### D-2 FEATURES.md: include
Publish skill: "no FEATURES.md requirement". `search-config` (the working Connect-layout sibling)
ships one. Include it: the parity matrix in `plans/00-master-plan.md` section 3 converts almost
mechanically. Alternative rejected: skip it and fold features into README (README gets long, loses the
feature -> path mapping). Question P-Q1 (default include).

### D-3 SECURITY.md: include a short one
No sibling has it; the master plan lists it with a question mark. A public repo that handles auth
tokens and file upload should say where to report vulnerabilities privately without implying support.
Content (Appendix D) uses GitHub private vulnerability reporting, so no email is needed (Q-11 default:
issues only, no email). Spec R enables the setting (`gh api -X PUT repos/commercetools/contentools/private-vulnerability-reporting`) behind checkpoint M-06.

### D-4 Postman: MIGRATE (pruned and rewritten), not drop
Evidence: the source collection has 76 requests; 66 are still valid once `Auth`, `Proxy`, legacy
content-type CRUD and `compile-upload` (10 requests) are removed. A scratch transform
(`migrate-postman.mjs`, scratchpad, not committed) turned 76 requests into 71 (10 removed, 5 added:
`puck-templates` x4, `products/search`) with zero remaining matches for
`cms|project_key|authenticate|proxy-script|compile`. Published-read requests get "No Auth", everything
else inherits a collection-level bearer `{{service_api_token}}`. Value: the cheapest manual API
explorer, and the MCP/curl docs can point at it. Cost: one more artifact to keep in sync, mitigated by
`tools/check-docs-postman.mjs` (D-6). Alternative rejected: delete it (loses the only copy-paste
request bodies, e.g. page create body `{ "value": { "name", "slug", "content" } }`). The migration
script is committed as `tools/migrate-postman.mjs` ONLY if it is useful beyond this one run;
default: run once, commit the output, do not commit the script (Appendix G has the full script text for
the implementer).

File names (no "cms", Postman convention): `service/postman/contentools-api.postman_collection.json`,
`contentools-api.postman_environment.json`. Collection `info.name` "Contentools Service API", `id` of the
environment `contentools-api-environment`. 4 requests for the `b2b-account-menu-links` configuration key are
added (the old collection missed that key; the code mounts it).

### D-5 Where the long drafts live
Appendices A-G of this file contain the full text for README, SUPPORT, CONTRIBUTING, SECURITY,
FEATURES (skeleton), the API route table and the Postman script. `tasks.md` tells the implementer
which appendix to paste and which bracketed values to verify against code first (every verification is
a command with an expected output).

### D-6 Drift checks (cheap, run locally by `yarn verify`; there is no CI)
1. `tools/check-docs-lint.mjs`: banner in README lines 1-10; forbidden-word scan over tracked `*.md`;
   relative link resolution; FEATURES.md paths exist; package README peer lists equal `package.json`.
2. `tools/check-docs-config.mjs`: `connect.yaml` keys <-> config tables (parses YAML with the `yaml`
   package, already a Connect-app dependency candidate; if not, use a tiny line parser on `- key:` lines).
3. `tools/check-docs-postman.mjs`: collection requests == api-reference rows.
4. `service/tests/docs/api-reference.test.ts`: documented routes are mounted (status != 404 unauthenticated).
All four are plain Node / jest, no network. Alternative rejected: generate docs from code (OpenAPI).
Reason: no OpenAPI exists in the source and generating one is a feature, not documentation.

### D-7 Runbook scope: replay is explicitly N/A
Connect skill requires a poison-message/replay runbook for event apps. This connector has `service`
(+ MC app) only. The runbook says so in one section and gives the substitute: HTTP retries are the
client's job; PUT/DELETE are idempotent; POST create on an existing key returns 409 (verify in spec F)
so a retried create is detected; no queue to drain. Alternative rejected: omit the topic (the
checklist item would look forgotten to a reviewer).

### D-8 Package READMEs on npm
Relative links break on npmjs.com. Package READMEs use absolute links to
`https://github.com/commercetools/contentools/...`. No per-package LICENSE file is committed (gate
"third-party subtree" rule); spec R's `prepack` copy supplies it inside the tarball.

### D-9 Banner and "unsupported" wording
Copy from `search-config/README.md` banner (blockquote), adjusted to this repo. Exact text in
Appendix A. The text avoids `demo`, `POC`, `pre-sales` and uses "reference implementation".

## Risks / Trade-offs

* Docs written before J/E/H final -> mitigated by sequencing (dependency plan: P after F, G, H, J, L, M) plus drift checks. If a prop or env name in an appendix differs from the code, the CODE wins; fix the appendix in this change first.
* Lint false positives on legitimate words (e.g. "demo" inside `commercetools-demo` in a historical note): allow-list file `tools/docs-lint-allow.json` (path + pattern), reviewed by a human.
* `INSTALL.md` Merchant Center steps change in the UI over time; keep screenshots out, name menu labels only.

## Target layout produced

```
README.md  INSTALL.md  FEATURES.md  SUPPORT.md  CONTRIBUTING.md  SECURITY.md
docs/architecture.md  docs/api-reference.md  docs/runbook.md
service/README.md (H)  service/postman/contentools-api.postman_{collection,environment}.json
admin-app/README.md (L)  mcp/README.md (M/N)
puck/README.md  puck/playground/README.md  puck/packages/<10>/README.md
tools/check-docs-lint.mjs  tools/check-docs-config.mjs  tools/check-docs-postman.mjs  tools/docs-lint-allow.json
service/tests/docs/api-reference.test.ts
```

---

## Appendix A - README.md (paste, then verify the bracketed items)

Items to verify before pasting are marked `[V1]`..`[V6]` and listed under the draft.

````markdown
# Contentools

> **commercetools-labs reference code. Freely available under the MIT license, AS IS and
> UNSUPPORTED:** commercetools offers no support, maintenance or warranty for it. See
> [SUPPORT.md](SUPPORT.md) and [LICENSE](LICENSE).

A visual page builder for commercetools. Merchants compose **pages** and reusable **content
items** with the [Puck](https://puckeditor.com/) editor, manage a **media library**, apply a
**theme**, keep **draft / published** states with **version history**, and render the result in any
storefront. It is built for one commercetools project: the one the Connect deployment is installed in.

What each part does, with pointers to the code: [FEATURES.md](FEATURES.md).
How it fits together: [docs/architecture.md](docs/architecture.md).

## What is in the repository

| Path | What it is |
| --- | --- |
| `service/` | The content API (Express + TypeScript), a commercetools Connect `service` application served at `/service` |
| `admin-app/` | A Merchant Center custom application (Connect `merchant-center-custom-application`) that hosts the editors |
| `mcp/` | An MCP server (Connect `service` application at `/mcp`) that exposes the content API to AI agents [V1] |
| `puck/` | A Yarn workspace of ten npm packages (`@commercetools-labs/puck-*`) and a Vite playground |
| `docs/` | Architecture, API reference, runbook |
| `tools/` | Repository checks and helper scripts |
| `connect.yaml` | The Connect definition for `service`, `admin-app` and `mcp` |

## Quick start

You need Node.js 22 (`.nvmrc`), Yarn 4 (`corepack enable`), a commercetools project and an API client
(see [INSTALL.md](INSTALL.md) for the scopes). Each application installs on its own; there is no
root workspace.

```bash
# 1. the content API on http://localhost:8080/service
cd service && cp .env.example .env     # fill in the CTP_* values [V2]
yarn install --frozen-lockfile && yarn start:dev

# 2. the playground on http://localhost:5173
cd puck && yarn install && yarn build
cd playground && cp .env.example .env  # VITE_BASE_URL=http://localhost:8080/service [V3]
yarn dev
```

The playground shows the canonical wiring: tabs for Pages, Content items, Theme and a Renderer panel.

Repository-wide checks (no network): `yarn verify` at the root runs lint, typecheck, test and build for
every application and for `puck/`. [V4]

## Using the packages

```bash
yarn add @commercetools-labs/puck-page-manager @commercetools-labs/puck-renderer
yarn add react react-dom react-intl @measured/puck react-router-dom@5
```

```tsx
import { PageManager } from '@commercetools-labs/puck-page-manager';
import { PuckRenderer } from '@commercetools-labs/puck-renderer';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // optional for published reads; required to edit [V5]
};

<PageManager {...connection} parentUrl="/" />
<PuckRenderer {...connection} type="page" slug="/home" mode="published" />
```

Packages: see [puck/README.md](puck/README.md) for the list, dependency graph and each package's props.

The editor UI ships English, German and Spanish messages. The German messages are machine-translated and have not been reviewed by a native speaker; the Spanish ones predate this repository. Both are open to correction by pull request.

## Authentication

Health, published page and content reads and configuration reads are public. Everything else (the draft list,
preview, templates, product search, datasource management, the media library and every write) needs
`Authorization: Bearer <token>`, where the token is either a Merchant Center session token forwarded by
the Merchant Center proxy (the `admin-app` does this for you) or the static `SERVICE_API_TOKEN` you
configure on the deployment (for scripts and the MCP server). Errors are JSON `{ message, statusCode, correlationId }`. Details: [docs/architecture.md](docs/architecture.md#authentication).

## API

Base path `/service`, content scoped by business unit: `/service/<businessUnitKey>/puck-pages`, and so on.
Every route, its auth requirement and its payloads: [docs/api-reference.md](docs/api-reference.md).
A Postman collection is in [`service/postman/`](service/postman).

## Data and storage

Pages, content items, their draft and published states, version history, templates and theme and other
configuration documents are commercetools **custom objects** in the project, in containers prefixed
`puck-` and `configuration`. Uploaded media goes to the object store you choose (Google Cloud Storage,
Amazon S3 or Cloudinary) because Connect applications have no persistent disk.

## Deploying

The connector deploys three applications. Follow [INSTALL.md](INSTALL.md) (register the Merchant Center
application first, deploy, then update URLs and redeploy). Operating it: [docs/runbook.md](docs/runbook.md).

## Fail behaviour

If commercetools is unreachable the service answers 502 for the request and keeps no state of its own,
so nothing is lost and nothing is half-written outside commercetools. [V6]

## Contributing, support, security

[CONTRIBUTING.md](CONTRIBUTING.md) - [SUPPORT.md](SUPPORT.md) - [SECURITY.md](SECURITY.md)

## License

MIT, see [LICENSE](LICENSE). Provided AS IS and UNSUPPORTED.
````

Verify before pasting:
* [V1] MCP path and name: `grep -n "endpoint" connect.yaml` -> `/mcp` for app `mcp` (spec M). Adjust the row if M chose another path.
* [V2] Service env example: `ls service/.env.example` and `grep -n CTP_ service/.env.example`; the README must name exactly the variables the file contains.
* [V3] `ls puck/playground/.env.example` and `grep VITE_ puck/playground/.env.example`.
* [V4] `grep -n '"verify"' package.json` -> script exists (spec A/B). If the command is named differently, use the real one.
* [V5] Prop names: `grep -n "jwtToken\|getAuthHeaders\|businessUnitKey" puck/packages/puck-types/src/*.ts` (spec J final shape). Edit the snippet to match; if `jwtToken` was replaced by a fetcher hook, show that hook.
* [V6] Spec D/H error mapping: `grep -rn "502\|BadGateway" service/src/middleware` and the H README "stance" paragraph. State the real behaviour and keep it identical to `service/README.md`.

## Appendix B - SUPPORT.md (paste as is)

````markdown
# Support

This repository is **commercetools-labs reference code. It is unsupported.**

It is freely available under the MIT license ([LICENSE](LICENSE)), AS IS, without warranty of any
kind. commercetools offers no support, maintenance, service-level agreement or guaranteed fixes
for it, through any channel: commercetools Support, your account team or this repository.

- **Questions and bugs:** open a GitHub issue. Someone may answer; nobody is obliged to.
- **Security problems:** do not open an issue; see [SECURITY.md](SECURITY.md).
- **Production use:** you own it. Review the code, run its checks against your own project
  ([README.md](README.md), [INSTALL.md](INSTALL.md)) and keep your copy up to date yourself.
- **commercetools products:** questions about Composable Commerce, the Merchant Center or
  Connect themselves go to commercetools Support as usual, not to this repository.
````

## Appendix C - CONTRIBUTING.md (paste, then run every command once)

````markdown
# Contributing

Contributions are welcome. This is unsupported reference code ([SUPPORT.md](SUPPORT.md)), so there is
no promise that a pull request is reviewed or merged.

## Layout rules that matter

Each Connect application (`service/`, `admin-app/`, `mcp/`) is self-contained: its own `package.json`
and lockfile, built from its own folder by Connect. Package managers differ per part: `service/`, `admin-app/` and `mcp/` use Yarn 1 classic (committed `yarn.lock`, `yarn install --frozen-lockfile`), `puck/` uses Yarn 4.5.1 (`yarn.lock`, `yarn install --immutable`); there is no `package-lock.json` anywhere. There is no root workspace. `puck/` is a Yarn 4
workspace of npm packages; `admin-app/` consumes them from the npm registry, not from the workspace.

## Before a pull request

Node.js 22 and Yarn 4 (`corepack enable`).

This repository has no CI service: Connect builds and deploys the applications, and quality gates are
local. Run everything with one command from the repository root:

```bash
yarn install --immutable   # root tooling hub only
yarn verify                # lint, typecheck, test and build for service/, admin-app/, mcp/ and puck/, plus the documentation checks
```

The per-application commands behind it (for working on one part), each run from the repository root (verify the script names with `grep '"scripts"' -A12 <app>/package.json` first):

```bash
yarn --cwd service install --frozen-lockfile && yarn --cwd service test && yarn --cwd service build
yarn --cwd admin-app install --frozen-lockfile && yarn --cwd admin-app test && yarn --cwd admin-app build
yarn --cwd mcp install --frozen-lockfile && yarn --cwd mcp test && yarn --cwd mcp build
yarn --cwd puck install --immutable && yarn --cwd puck build
```

Tests that talk to a real commercetools project (`yarn test:e2e`) are optional and need your own
sandbox project; never point them at a project you care about.

## Rules

- New source files carry the SPDX header the others have:

  ```
  /*
   * SPDX-License-Identifier: MIT
   * Copyright (c) <year> commercetools GmbH and the commercetools-labs contributors
   * Freely available, AS IS and UNSUPPORTED. See LICENSE.
   */
  ```

- Never commit credentials. Local configuration lives in git-ignored `.env` files next to a
  committed `.env.example`.
- Keep the documentation in step with the code: a new route needs a row in
  [docs/api-reference.md](docs/api-reference.md) and a request in the Postman collection (`yarn verify` fails otherwise).
- Do not add customer names, internal hostnames or project identifiers anywhere, including tests and fixtures.

By contributing you agree that your contribution is licensed under the MIT license.
````

(`[V]` for CONTRIBUTING: after spec A/B/O the script names may differ - `grep '"scripts"' -A12 service/package.json`; use the real names, never ones that do not exist.)

## Appendix D - SECURITY.md (paste)

````markdown
# Security

This is unsupported commercetools-labs reference code ([SUPPORT.md](SUPPORT.md)); there is no
service-level agreement and no guaranteed fix. We would still like to hear about vulnerabilities.

**Please do not open a public issue.** Use GitHub's private reporting: on the repository page choose
**Security -> Report a vulnerability**. Include the affected path, what an attacker can do and a
minimal reproduction.

Areas of most interest: token verification and the `SERVICE_API_TOKEN` comparison in `service/`, CORS
handling, file upload and media listing, and the Merchant Center proxy request path.

If you run this code, you are responsible for reviewing it, rotating `SERVICE_API_TOKEN` (see
[docs/runbook.md](docs/runbook.md)), and keeping your commercetools API client scopes minimal.
````

## Appendix E - FEATURES.md skeleton (fill the Where column by `ls`)

````markdown
# Features

What Contentools does, with pointers to the code. Operating it: [docs/runbook.md](docs/runbook.md).
Routes: [docs/api-reference.md](docs/api-reference.md).

## The parts
| Part | Where | Role |
| --- | --- | --- |
| Content API | `service/`, Connect application `service` | Pages, content items, states, versions, templates, configuration documents, datasources, product search, media |
| Merchant Center app | `admin-app/`, Connect application `admin-app` | Hosts the page, content and theme managers |
| MCP server | `mcp/`, Connect application `mcp` | AI tools over the content API |
| Packages | `puck/packages/` | `@commercetools-labs/puck-*` |

## Features
- **Visual page builder:** `puck/packages/puck-editor/src/PuckEditor.tsx`, built-in components in `puck/packages/puck-editor/src/components/` [path per spec I]
- **Standalone content items:** `puck/packages/puck-content-manager/`, routes `service/src/routes/puck-content.route.ts`
- **Draft / published / preview, revert draft:** `service/src/routes/puck-page.route.ts` (`/states/published`, `/states/draft`)
- **Version history with diff:** `puck/packages/puck-version-history/`, `MAX_VERSIONS`
- **Page templates:** `service/src/routes/puck-template.route.ts`, `puck/packages/puck-editor/src/toolbar/CreateTemplateDialog.tsx`
- **Theme and configuration documents (theme, header, footer, facet, site-metadata, category-listing, translations, b2b-account-menu-links):** `service/src/routes/configuration.route.ts`, `puck/packages/puck-theme-manager/`
- **Content-type import:** `POST /content-type/import`, `puck/packages/puck-theme-manager/src/components/import-content-types`
- **Datasources and product search:** `service/src/routes/datasource.route.ts`, `product.route.ts`, `puck/packages/puck-editor/src/fields/DatasourceField.tsx`
- **Media library and upload (Google Cloud Storage, S3, Cloudinary):** `service/src/routes/file.route.ts`, `puck/packages/puck-image-picker/`
- **Business-unit scoping:** every content route is `/:businessUnitKey/...`
- **Renderer (client and server-side):** `puck/packages/puck-renderer/` (`PuckRenderer`, `PuckDataRenderer`), render-only config in `puck/packages/puck-components/`
- **Languages (English, German, Spanish):** `intl/` folder of each UI package; the German catalogs are machine-translated and not reviewed by a native speaker
- **MCP tools:** `mcp/`
````
Every path above is a *source* path from `/Users/behnam/code/cms`; after spec C/I/D/F the real paths can differ. Task 3.1 verifies each with `ls` and `tools/check-docs-lint.mjs` enforces it.

## Appendix F - docs/api-reference.md route table (authoritative sources: spec F design section 2 = 73 routes, spec E design section 4 = access policy, spec G = media, spec D = health/status)

Legend: **Public** = no credentials needed (an Authorization header is ignored); **Token** = `Authorization: Bearer <Merchant Center session token or SERVICE_API_TOKEN>`. `:bu` = `:businessUnitKey`. Base path `/service`. 77 routes in total = 73 (F) + 2 media (G) + `GET /health`, `GET /status` (D). Success codes are those of F's table.

Error body (spec D/E): `{ "message": string, "statusCode": number, "correlationId": string, "code"?: string, "errors"?: [...] }`, never a stack. 401 `Authentication required` (no header) or `Invalid or expired credentials`; 403 `Forbidden` (token valid but wrong project or missing permission); 503 `Authentication service unavailable` with `Retry-After` when the Merchant Center key set cannot be reached.

| Group | Method | Path | Access | Success | Notes |
| --- | --- | --- | --- | --- | --- |
| Health | GET | `/health`, `/status` | Public | 200 | |
| Pages | GET | `/:bu/puck-pages` | Token | 200 | list with states |
| Pages | POST | `/:bu/puck-pages` | Token | 201 | body `{ value: { name, slug, puckData?, meta? } }`; key is generated |
| Pages | GET | `/:bu/puck-pages/:key` | Token | 200 | page + states |
| Pages | PUT | `/:bu/puck-pages/:key` | Token | 200 | saves a draft and a version |
| Pages | DELETE | `/:bu/puck-pages/:key` | Token | 204 | removes states and versions |
| Pages | GET | `/:bu/published/puck-pages/:key` | Public | 200 | published value with resolved datasources; 404 if not published |
| Pages | POST | `/:bu/published/puck-pages/query` | Public | 200 | body `{ query: 'slug = "/home"' }` |
| Pages | GET | `/:bu/preview/puck-pages/:key` | Token | 200 | draft if present, else published |
| Pages | POST | `/:bu/preview/puck-pages/query` | Token | 200 | |
| Pages | GET | `/:bu/puck-pages/:key/states` | Token | 200 | |
| Pages | PUT | `/:bu/puck-pages/:key/states/published` | Token | 200 | publish; `?clearDraft=true` removes the draft |
| Pages | DELETE | `/:bu/puck-pages/:key/states/draft` | Token | 200 | revert draft; 404 if never published |
| Pages | GET | `/:bu/puck-pages/:key/versions` | Token | 200 | at most `MAX_VERSIONS` |
| Contents | same 13 routes under `/:bu/puck-contents` | Public for `published/puck-contents/:key` and `published/puck-contents/query`, Token for the rest | as pages | | create needs `name` and `contentType`; list takes `?contentType=` |
| Templates | GET | `/:bu/puck-templates` (`?kind=page\|content`) | Token | 200 | |
| Templates | GET | `/:bu/puck-templates/:key` | Token | 200 | |
| Templates | POST | `/:bu/puck-templates` | Token | 201 | body `{ value: { name, kind, puckData } }` |
| Templates | DELETE | `/:bu/puck-templates/:key` | Token | 204 | no PUT |
| Configuration | GET | `/:bu/configuration`, `/:bu/configurations` | Public | 200 | all documents of the business unit |
| Configuration | GET | `/:bu/configuration/<slice>` | Public | 200 | value or `null`; falls back to the default business unit |
| Configuration | POST | `/:bu/configuration/<slice>` | Token | 201 | upsert |
| Configuration | PUT | `/:bu/configuration/<slice>` | Token | 200 | upsert |
| Configuration | DELETE | `/:bu/configuration/<slice>` | Token | 204 | idempotent |
| Datasources | GET | `/datasource`, `/datasource/:key` | Token | 200 | built-in and stored |
| Datasources | POST | `/datasource/:key` | Token | 201 | 409 if the key exists or is built in |
| Datasources | PUT, DELETE | `/datasource/:key` | Token | 200, 204 | 409 for built-in keys |
| Datasources | POST | `/datasource/:key/test` | Token (Public for the built-in keys `product-by-sku`, `products-by-sku` only when `PUBLIC_DATASOURCE_RESOLVE=true`) | 200 | body `{ params }`; at most 25 SKUs |
| Products | GET | `/products/search?text=&limit=&locale=` | Token | 200 | editor product picker |
| Content types | POST | `/:bu/content-type/import`, `/content-type/import` | Token | 200 | same handler |
| Media | POST | `/:bu/upload-file` | Token | 200 | multipart (spec G) |
| Media | GET | `/:bu/media-library?extensions=&page=&limit=` | Token | 200 | (spec G) |

`<slice>` is one of `theme, header, facet, footer, site-metadata, category-listing, translations, b2b-account-menu-links`.
Rows with a combined path (`/health`, `/status`, "same 13 routes") must be expanded to one row per route in `docs/api-reference.md` so the route-existence test and the Postman check can parse them (task 4.1/4.3).
Changes versus the source that readers of old material will notice: drafts, preview, templates, product search, datasource management and the media library are no longer readable without credentials.

* Before pasting, re-check against the code: `openspec/changes/f-service-content-api/design.md` section 2 (or its archived copy) and `openspec/changes/e-service-auth-model/design.md` section 4. If they differ from this table, they win; after implementation compare with `service/src/routes/*.ts` (a route is Token unless it is in the public list of E's table).

## Appendix G - Postman migration script (scratch; run once)

Run from the scratchpad, never inside the target tree; output is committed. Verified on the source
files (76 -> 73 requests: 10 removed, 7 added, 4 more for b2b-account-menu-links added by hand = 77 = 73 F routes + 2 media + health/status; exit 0, no remaining `cms|project_key|authenticate|proxy-script|compile`).

```js
// migrate-postman.mjs <src-collection.json> <out-collection.json> <out-env.json>
import { readFileSync, writeFileSync } from 'node:fs';
const [src, outC, outE] = process.argv.slice(2);
const c = JSON.parse(readFileSync(src, 'utf8'));
const DROP_FOLDERS = new Set(['Auth', 'Proxy']);
const DROP_REQ = new Set(['Content Types/Get All Content Types', 'Content Types/Get Content Type by Key', 'Content Types/Create Content Type',
  'Content Types/Update Content Type', 'Content Types/Delete Content Type', 'File Management/Compile and Upload']);
const PUBLIC = (method, url) => /\/published\/puck-(pages|contents)\/(?!query$)[^/]+$/.test(url) || /\/published\/puck-(pages|contents)\/query$/.test(url) || /\/(health|status)$/.test(url) || (method === 'GET' && /\/configurations?(\/[a-z0-9-]+)?$/.test(url)); // spec E access table
const mkReq = (name, method, path, body) => ({ name, request: { method, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
  ...(body ? { body: { mode: 'raw', raw: body } } : {}), url: { raw: `{{base_url}}${path}`, host: ['{{base_url}}'], path: path.replace(/^\//, '').split('/') } }, response: [] });
const walk = (items, prefix = '') => items.flatMap((i) => {
  if (i.item) { if (!prefix && DROP_FOLDERS.has(i.name)) return []; return [{ ...i, item: walk(i.item, prefix + i.name + '/') }]; }
  if (DROP_REQ.has(prefix + i.name)) return [];
  const r = i.request; delete r.auth;
  r.header = (r.header ?? []).filter((h) => h.key !== 'x-project-key');
  if (PUBLIC(r.method, typeof r.url === 'string' ? r.url : r.url.raw)) r.auth = { type: 'noauth' };
  return [i];
});
const items = walk(c.item);
items.find((f) => f.name === 'Health').item = [{ ...mkReq('Health Check', 'GET', '/health'), request: { ...mkReq('x', 'GET', '/health').request, auth: { type: 'noauth' } } }];
items.push({ name: 'Puck Templates', item: [
  mkReq('List Templates', 'GET', '/{{business_unit_key}}/puck-templates?kind=page'),
  mkReq('Get Template', 'GET', '/{{business_unit_key}}/puck-templates/{{puck_template_key}}'),
  mkReq('Create Template', 'POST', '/{{business_unit_key}}/puck-templates', '{\n  "value": { "name": "Landing", "kind": "page", "puckData": { "content": [], "root": {} } }\n}'),
  mkReq('Delete Template', 'DELETE', '/{{business_unit_key}}/puck-templates/{{puck_template_key}}')] });
items.push({ name: 'Products', item: [mkReq('Search Products', 'GET', '/products/search?text=shoe&limit=20&locale=en-US')] });
items.find((f) => f.name === 'Content Types').item.push(mkReq('Import Default Content Types (business unit)', 'POST', '/{{business_unit_key}}/content-type/import', '{}'));
items.find((f) => f.name === 'Health').item.push({ ...mkReq('Status', 'GET', '/status'), request: { ...mkReq('x', 'GET', '/status').request, auth: { type: 'noauth' } } });
const vars = ['base_url', 'business_unit_key', 'datasource_key', 'puck_page_key', 'puck_content_key', 'puck_template_key', 'service_api_token'];
const defaults = { base_url: 'http://localhost:8080/service', business_unit_key: 'default', datasource_key: 'sample-datasource', puck_page_key: 'homepage', puck_content_key: 'sample-puck-content', puck_template_key: 'sample-template', service_api_token: '' };
const out = { info: { name: 'Contentools Service API', description: 'Health, status, published reads and configuration reads need no token. Everything else needs Authorization: Bearer {{service_api_token}}: the SERVICE_API_TOKEN configured on the deployment (a Merchant Center session token cannot be minted in Postman).', version: '1.0.0', schema: c.info.schema },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{service_api_token}}', type: 'string' }] },
  variable: vars.map((key) => ({ key, value: defaults[key], type: 'string' })), item: items };
writeFileSync(outC, JSON.stringify(out, null, 2) + '\n');
writeFileSync(outE, JSON.stringify({ id: 'contentools-api-environment', name: 'Contentools API Environment',
  values: vars.map((key) => ({ key, value: defaults[key], type: key === 'service_api_token' ? 'secret' : 'default', enabled: true })) }, null, 2) + '\n');
```

After the run, add the four `b2b-account-menu-links` requests (GET/POST/PUT/DELETE, copy the `Theme` group
and replace `theme` with `b2b-account-menu-links`) and update any configuration or route changes that specs E/F made.
