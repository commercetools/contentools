# Contentools (commercetools-labs) — Master Plan

> Status: DRAFT v1 — high-level plan. Detailed, junior-developer-ready plans live in
> `openspec/changes/<letter>-<name>/` (one OpenSpec change per spec, see `01-dependency-plan.md`).
> Open decisions that need the owner are in `owner-questions.md`; things only a human can do are
> in `manual-steps.md`.

## 1. Goal

Take the internal, **multi-tenant** Puck-based CMS from `/Users/behnam/code/cms`
(`commercetools-demo/cms`) and re-create it as a clean, **single-tenant**, open-source
**commercetools-labs** project at `/Users/behnam/code/commercetools-labs/contentools`
(future home: `github.com/commercetools/contentools`, MIT, unsupported).

| Requirement (from owner)                         | How we satisfy it                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Keep all features except multitenancy            | Feature-parity matrix in §3; only the tenant registry / per-tenant auth goes   |
| service + contentools + mcp as a **Connect app** | One `connect.yaml`, three apps (`service`, `admin-app`, `mcp`) — spec H, L, M  |
| Follow `/commercetools:commercetools-connect`    | Every Connect spec gates on that skill's production-readiness checklist         |
| Keep puck as an npm module package               | `puck/` stays a Yarn workspace, published as `@commercetools-labs/puck-*`       |
| No "cms"                                         | Legacy `cms/` web-component package, legacy grid-pages/content-items API and every "cms" identifier/string are removed — spec C |
| Follow `commercetools-labs-publish`              | `@commercetools-labs/<name>` package names, MIT + SPDX headers, `SUPPORT.md`, `CONTRIBUTING.md`, "unsupported" ×3, single-commit history, `gate.mjs` — specs A, P, R |
| Don't depend on the owner; test on our own       | Self-driven tests incl. Chrome DevTools connector — spec B + every spec's test section |

## 2. Source inventory (what exists today in `/Users/behnam/code/cms`)

| Source path        | What it is                                                                 | Size     | Target |
| ------------------ | -------------------------------------------------------------------------- | -------- | ------ |
| `service/`         | Express + TS API (`/service`), **multi-tenant** (Firestore tenant registry + JWT minted from CT API creds), Cloud Run deploy. Mixes **legacy** routes (content-items, grid pages, page-rows/components, content-types, proxy-script, lit/rollup bundler) with **Puck** routes (puck-pages, puck-contents, puck-templates, configuration, datasource, product search, media upload, content-type/import) | ~12.4k LOC | `service/` (Connect `service` app) |
| `contentools/`     | Merchant Center custom app wrapper. Mounts `PageManager`/`ContentManager`/`ThemeManager`; contains the **tenant onboarding flow** (`connect-project.tsx`, `use-create-api-client`, credentials stored in a CT custom object, JWT refresh) | small | `admin-app/` (Connect `merchant-center-custom-application`) |
| `mcp/`             | `@commercetools-demo/contenttools-mcp`: npm library exposing service routes as AI-SDK / LangChain tools + a stdio MCP entry. Covers legacy routes too | small | `mcp/` (Connect `service` app serving MCP over HTTP) |
| `puck/`            | Yarn 4 workspace: 10 packages (`puck-types, -api, -components, -editor, -renderer, -page-manager, -content-manager, -theme-manager, -version-history, -image-picker`) + `puck-react-test` Vite playground. v0.8.x | ~16.9k LOC | `puck/` (kept as npm packages) |
| `cms/`             | **Legacy** web-component (lit) CMS monorepo | — | **dropped** |
| root `connect.yaml`| Existing, out-of-sync Connect definition (service only, GCP-only keys) | — | rewritten from scratch |
| `.github/`         | Cloud Run deploy + e2e workflows (internal GCP, `demo` environment) | — | **dropped, not replaced** (no GitHub Actions) |
| `README.md`, `release.md`, `task.md`, `TODO.md`, `todo-rest.md`, `.cursor/`, `.playwright-mcp/` | internal notes | — | not migrated (README is rewritten, spec P) |

Findings that shape the plan:

1. **Multi-tenancy touches 4 layers**: (a) Firestore tenant registry + `validateProject`
   middleware, (b) `authenticate-project` / `refresh-jwt` endpoints, (c) every Puck package takes
   `projectKey`+`jwtToken` props and sends `x-project-key`, (d) the MC wrapper's onboarding flow
   creates an API client and stores its secret in a shared custom object. All four are removed or
   replaced (specs D, E, J, K).
2. **Connect gives us exactly one CT API client** (`inheritAs`, least-privilege scopes) injected as
   `CTP_*` env vars — this *is* the single tenant.
3. **Connect apps must be root siblings with their own `package.json`; npm/yarn workspaces at the
   root are forbidden** (Connect runs install+build inside each app folder). `puck/` is a workspace
   but is **not** a Connect app, so it can keep its own workspace internally. The MC app therefore
   consumes puck via the **npm registry**, which makes "publish puck to npm" a prerequisite of the
   first Connect deploy of `admin-app` (see `manual-steps.md`).
4. **Connect has no persistent disk and no Firestore**: the Firestore tenant store disappears, but
   media upload (GCP/S3/Cloudinary) needs an external bucket — spec G.
5. Service already contains deprecation middleware flagging the legacy API; the legacy surface
   is the bulk of "cms" code and can be deleted wholesale once confirmed unused by puck-api/MC app
   (spec C verifies by grepping `puck-api` call sites — only `puck-pages`, `puck-contents`,
   `puck-templates`, `configuration/theme`, `upload-file`, `media-library`, `content-type/import`,
   `products/search`, `datasource/*` are used).

## 3. Feature-parity matrix (what "keep all features" means)

| Feature                                                              | Kept? | Spec |
| -------------------------------------------------------------------- | :---: | ---- |
| Puck visual page builder + built-in components (Hero, RichText, …)   | ✅ | I |
| Standalone content items (`puck-contents`)                           | ✅ | F, I |
| Draft / published / preview states, revert draft                     | ✅ | F |
| Version history (+ `MAX_VERSIONS`) with diff panel                   | ✅ | F, I |
| Page templates (`puck-templates`)                                    | ✅ | F |
| Theme + presets + CSS variables; other configuration docs (header, footer, facet, site-metadata, category-listing, translations, b2b-account-menu-links) | ✅ | F |
| Content-type import (`content-type/import`, samples)                 | ✅ | F |
| Datasources (CRUD + test + resolution) and product search            | ✅ | F |
| Media library + upload (GCP / S3 / Cloudinary)                       | ✅ | G |
| Business-unit scoped content                                          | ✅ (see Q-03) | F |
| Renderer (`PuckRenderer`, SSR `PuckDataRenderer`), render-only entry | ✅ | I |
| Merchant Center custom app                                            | ✅ | K, L |
| AI tools (AI-SDK, LangChain, MCP)                                    | ✅ re-shaped | M, N |
| i18n (en, de)                                                         | ✅ | K |
| **Multi-tenancy** (project registry, authenticate-project, per-tenant credentials) | ❌ removed | D, E |
| **Legacy** content-items / grid pages / page-rows / lit bundler / `cms/` package | ❌ removed (Q-02) | C |
| Cloud Run + Firestore deploy                                         | ❌ replaced by Connect | H, O |

## 4. Target repository layout

```
contentools/                         (becomes github.com/commercetools/contentools)
├── connect.yaml                     # service + admin-app + mcp   (MUST be at root)
├── package.json                     # tooling hub ONLY — no "workspaces" (Connect rule)
├── LICENSE  SUPPORT.md  CONTRIBUTING.md  README.md  SECURITY.md?  .gitignore  .nvmrc
├── service/                         # Connect app `service`  (endpoint /service)
├── admin-app/                       # Connect app `admin-app` (merchant-center-custom-application)
├── mcp/                             # Connect app `mcp`      (service, endpoint /mcp)
├── puck/                            # Yarn-4 workspace → npm: @commercetools-labs/puck-*
│   ├── packages/…  └── playground/  # was puck-react-test
├── shared/                          # (only if truly needed) plain folder, relative imports
├── docs/                            # architecture, API reference, runbook, install
├── tools/                           # gate/ossify wrappers, dev scripts, e2e driver
├── plans/                           # THIS planning folder (removed or kept? Q-12)
├── openspec/                        # specs + changes (spec-driven development)
(no .github/workflows — Connect builds/deploys; checks run locally via `yarn verify`)
```

Folder name == `deployAs[].name` for each Connect app (platform rule).

## 5. Execution model

1. **Plan** (this folder) → 2. **Specs** (`openspec/changes/*`, one per letter A…R) →
3. **Owner answers `owner-questions.md`** → 4. **Implement** specs in dependency order
   (`01-dependency-plan.md`), each via `/opsx:apply` → verify → `/opsx:archive`.

Per-spec authoring procedure (already applied to every spec; see `02-spec-workflow.md`):
`explore` (read source, record facts) → `proposal` → `specs` (requirements+scenarios) →
`design` → `tasks` (junior-developer level: exact files, commands, expected output, definition of
done, test commands, Chrome-driven checks).

## 6. Cross-cutting rules (apply to every spec)

* **No "cms"** anywhere in code, identifiers, package names, env vars, docs, URLs (case-insensitive;
  exceptions only for the literal words "content management" in prose). A local `yarn check:no-cms` guard enforces it (spec O).
* **No "demo / POC / pre-sales" framing** (gate WARNs on it) — we call it *reference implementation*.
* **No customer names, internal hosts, GCP project ids** (`ct-poc.net`, `*.run.app` regions of the
  old deployment, `commercetools-demo`, `multitenant-contentools`) — gate FAILs.
* **SPDX header in every source file** (`.ts .tsx .js .jsx .mjs .cjs`) and `LICENSE` (MIT).
* **"Unsupported" stated 3×**: file header, README banner, `SUPPORT.md`.
* **Connect production-readiness checklist** (`commercetools-connect` skill) is the definition of done
  for specs H, L, M.
* **No GitHub Actions** (owner decision). Quality enforcement = local `yarn verify`/`yarn gate` + Connect build/test; puck npm release = local script.
* Typed end to end, no `any` escapes, no commented-out code, fail-fast env validation.
* Every spec ends with a **self-run verification section**: unit/integration tests plus, for UI,
  Chrome DevTools-driven checks (see `03-testing-strategy.md`).

## 7. Corrections discovered during spec authoring (supersede earlier text in this folder)

* Connect injects `CTP_API_URL`/`CTP_AUTH_URL` (no `CTP_REGION`). Service scopes: only `manage_key_value_documents` + `view_products`.
* `CONNECT_SERVICE_URL` is injected only into `service` apps; the MC app uses an explicit `CONTENTOOLS_SERVICE_URL` (two-pass deploy), and `mcp` uses `CONTENT_SERVICE_URL`.
* Package managers: `service`, `admin-app`, `mcp` = npm (committed `package-lock.json`); `puck/` = Yarn 4.
* The MCP has no Puck tools today; spec M creates 44 new tools (24 read / 20 write) against the Puck routes.
* Datasources were stored in Firestore (not only tenants); they move to custom objects (spec F).
* Puck packages ship `en`+`es`; spec J adds a machine-translated `de`.
* Two `cms` folders exist inside puck (`components/cms`) — renamed to `blocks` in spec I; legacy `samples/CMS` handled in C.
* Release order (spec R): scratch gate → npm rc publish of puck → pin admin-app → final single commit + gate → public push.
