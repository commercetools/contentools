# Questions for the owner

All 18 specs are written and proceed on the **default** shown for each question. Reply
"defaults" to accept everything, or answer by ID. Changing an answer later means editing the
specs listed under *Affects* (`openspec/changes/<id>/`).

Per-spec detail (and the many already-settled sub-questions) lives in
`openspec/changes/<id>/questions.md`; this file is the consolidated list of things that are
**genuinely yours to decide**.

## OWNER ANSWERS (recorded 2026-10-08) — these supersede the defaults below

| ID | Answer |
| -- | ------ |
| Q-01, Q-02, Q-07 | Defaults accepted. |
| Q-06 | Media backend for live testing: **GCP (GCS)**. S3/Cloudinary stay mock-tested, "unverified live". |
| Q-12 | **Yarn for all**: `service`, `admin-app`, `mcp` = Yarn 1 classic (`yarn.lock`, `yarn install --frozen-lockfile`); `puck/` = Yarn 4.5.1. No `package-lock.json` anywhere. |
| Q-18 | Publishing puck to npm before the push is OK. |
| Q-19 | **No private fork.** Same repo, public after the gate, `v1.0.0-rc.N` tags tested with Connect (`connectorstaged create --repository-url … --tag`). Post-publication fixes are normal commits as long as `gate.mjs` stays clean. |
| Q-20 | Commit author = `Behnam Tehrani <behnam777@gmail.com>` (from global git config). Commit message wording OK. |
| Q-22 | Sandbox project available (credentials to be placed in `service/.env.e2e` when implementation starts). |
| Q-23 | Owner logs in to Merchant Center when the Chrome prompt appears (note: the Chrome DevTools connector is currently **disconnected** in this session — must be reattached before UI verification). |
| Q-24 | Docker Desktop + Connect CLI login available. |
| Q-25 | Only **public** npm packages (`--access public`); fine. |
| All other IDs (Q-03–05, 08–11, 13–17, 21) | Defaults accepted. |

## A. Decisions to confirm (design is already built on these defaults)

| ID | Question | Default | Affects |
| -- | -------- | ------- | ------- |
| Q-01 | **Auth model.** Preview, drafts, templates, media and all writes need `Authorization: Bearer` = a Merchant Center session JWT forwarded by MC `forward-to` (verified server-side), **or** a static `SERVICE_API_TOKEN` (for MCP / storefront preview / scripts). Published page/content reads and `configuration/*` reads are public. Datasource resolve is public only if you set `PUBLIC_DATASOURCE_RESOLVE=true`. Note this is **stricter than the source**, where drafts, templates, media library and datasources were readable with just a project key. | As described | E, F, G, J, K, M |
| Q-02 | **Drop the legacy API completely** (content-items, grid pages, page-rows/components, content-types, proxy-script, lit/rollup bundler, `cms/` package, 46 of the 88 MCP tools). `puck-api` provably calls none of them (re-checked by `tools/check-legacy-route-calls.mjs`). | Drop | C, F, M |
| Q-03 | Keep **business-unit scoped content** (`/:businessUnitKey/…`)? (BU = content scoping, not tenancy.) | Keep | F, J, K |
| Q-04 | npm names: keep `puck-*` → `@commercetools-labs/puck-api`, `…/puck-editor` …; MCP lib → `@commercetools-labs/contentools-mcp`. | Keep | I, N |
| Q-05 | First release: `1.0.0-rc.0` under tag `next`, then `1.0.0` at launch. Breaking API (no `projectKey` prop). | rc then 1.0.0 | I, O, R |
| Q-06 | **Media storage.** Connect has no disk. Default provider is `none` (media endpoints answer 501, picker falls back to URL entry). Backends: GCS, S3, Cloudinary, **public-read buckets only** (no expiring signed URLs, because page JSON stores the URL). Default MIME allowlist: jpeg/png/gif/webp/avif/pdf — **SVG and video off**. GCP credential = one secured **base64 service-account JSON** key. Upload default 10 MiB. Which backend will you give me a test bucket for? | GCS for live test; others mock-tested | G, H, J |
| Q-07 | **MCP.** A Connect `service` app serving MCP over stateless Streamable HTTP (44 tools: 24 read, 20 write) **and** an optional npm package (AI-SDK/LangChain adapters + stdio bin). Writes **off** unless `MCP_ENABLE_WRITES=true`; one shared `MCP_ACCESS_TOKEN` (no per-user identity); the app calls the service with its own `SERVICE_API_TOKEN` (never forwards the caller's token). | Both; writes off | M, N |
| Q-08 | Public repo: `github.com/commercetools/contentools`. | As stated | R |
| Q-09 | What of `openspec/` is published? `plans/` and `openspec/changes/**` never (they cite internal paths). | Publish only `openspec/specs/` + `config.yaml` | R, P |
| Q-10 | Connect app folder/names: `service`, `admin-app`, `mcp`. | As stated | A, H, L, M |
| Q-11 | `SUPPORT.md` / `SECURITY.md`: GitHub issues + GitHub private vulnerability reporting, no email; add `FEATURES.md` like the sibling labs repo. | As stated | P, R |
| Q-12 | **Package managers.** Each Connect app is self-contained and Connect builds with `npm`: `service`, `admin-app`, `mcp` use **npm** (`package-lock.json`); `puck/` stays **Yarn 4**; the root hub has no deps and runs either. (K may keep Yarn 1 for `admin-app` only if it proves Connect supports it.) | npm for Connect apps | A, B, C, D, H, K, M |
| Q-13 | **Env contract:** Connect injects `CTP_API_URL`, `CTP_AUTH_URL`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_PROJECT_KEY`, `CTP_SCOPE` (no `CTP_REGION`). Service scopes are only `manage_key_value_documents` + `view_products` (audited). | As stated | D, E, H |
| Q-14 | **Merchant Center permission.** Optional `MC_REQUIRED_PERMISSION` (e.g. only users with a "manage contentools" permission may write); default unset = any user with access to the project. | Unset | E, K, L |
| Q-15 | **MC app:** keep the in-app sidebar (Pages / Items / Theme + BU selector); default `entryPointUriPath` = `contentools` (must be unique per MC region; overridable); MC app scopes `view_business_units` + `manage_key_value_documents`; no custom CSP block (all internal hosts dropped). | As stated | K, L |
| Q-16 | **Locales.** Puck packages ship `en` + `es`; the admin app wants `en`/`de`. J adds a machine-translated `de` (flagged in READMEs) and keeps `es`. | Add de, keep es | I, J, K, P |
| Q-17 | **Dockerfiles forbidden** in the repo (Connect builds from source); the hygiene gate fails on `Dockerfile*`/`docker-compose*`. | Forbid | A, O |
| Q-18 | **Release order.** (1) scratch gate, (2) publish puck `rc` to npm **before** the repo is public (admin-app lockfile needs real versions; Connect cannot resolve workspace packages), (3) pin admin-app, (4) one squashed commit + gate, (5) public push. Three checkpoints require your literal replies `go npm`, `go repo`, `go settings`; nothing outward-facing runs without them. | As stated | R, O, L |
| Q-19 | Pre-publication Connect testing needs a repo Connect can clone (public repos only after R). | A **private GitHub fork** for rc tests | L, Q, R |
| Q-20 | Author name/email on the single public commit; and may the commit message say "single-project rewrite of an internal multi-tenant implementation"? | Your commercetools identity (confirmed at CP-2); yes | R |
| Q-21 | Rotation of `SERVICE_API_TOKEN`: single token, rotate by redeploy (short 401 window) vs. two tokens. Declared **per app** (service, mcp), not hoisted to `inheritAs`. | Single, per app | E, H, M, P |

## B. Inputs only you can provide (see `manual-steps.md`)

| ID | Question | Needed for |
| -- | -------- | ---------- |
| Q-22 | Do you already have a commercetools **sandbox project** I should use (M-01)? Product Search must be activated on it. | B, F, G, Q |
| Q-23 | Will a **logged-in Merchant Center session** be available in the Chrome profile attached to the Chrome connector (M-04)? Also: a second MC user/team without the app permission for the 403 check (else that one check is waived)? | K, L, Q |
| Q-24 | Are Docker Desktop and the Connect CLI available / can you `commercetools auth login` in a sandbox region (M-05, M-O1)? | H, L, M, Q |
| Q-25 | npm: does the `@commercetools-labs` scope exist and can you publish (2FA OTP per package) (M-07)? | I, R |

## C. Settled during spec authoring (FYI — change only if you disagree)

* Firestore is removed entirely; datasources move to commercetools custom objects (`datasource` container; built-ins are constants; no data migration).
* Content stays in custom objects; container names are fixed constants plus optional `CONTAINER_PREFIX` (source had ~20 overrides).
* `@commercetools/ts-client@^4` + `platform-sdk@^8` (Connect-checklist versions); `msw` pinned to `2.10.5`.
* Content-type import is served at both `POST /content-type/import` and `POST /:bu/content-type/import`.
* Predicate-injection hole in `query` replaced by a restricted grammar; several source bugs fixed (list truncation at 20, missing `await`, lost version-history updates).
* Service health route is `GET /service/health` (alias `/service/status`), public.
* Error body: `{message, statusCode, correlationId, code?, errors?}`.
* MC token checks: `projectKey === CTP_PROJECT_KEY`, 403 (not 401) on permission failure, audience policy `forward-url-origin`.
* Media-library response becomes cursor-paginated; media 501 code is `MEDIA_NOT_CONFIGURED`.
* The MC app finds the service via an explicit `CONTENTOOLS_SERVICE_URL` key (Connect only injects `CONNECT_SERVICE_URL` into `service` apps) → two-pass deploy.
* No GitHub Actions anywhere; local `npm run verify` / gates; puck release via local scripts.

## D. Open technical risks to be verified during implementation (not owner decisions)

* MC gateway handling of PUT / multipart / large uploads through `forward-to` (K, M-K2).
* Custom-object size limit for version history (F task 12.2 checks on the sandbox).
* Whether Connect needs `APPLICATION_URL` declared for the MC app (L Q-L4: first build is the test).
* Whether `commercetools connect validate` works without login (O Q-O2).
* Whether an empty MC "manage" scope list is accepted (L Q-L1).

## Per-spec question files

`openspec/changes/{a…r}-*/questions.md` (A: Q-A1–5, B: Q-B1–4, C: Q-C1–5, D: Q-D1–5, E: Q-E1–7,
F: Q-F1–6, G: Q-G1–5, H: Q-H1–6, I: Q-I1–4, J: Q-J1–7, K: Q-K1–6, L: Q-L1–6, M: Q-M1–6,
N: Q-N1–5, O: Q-O1–4, P: P-Q1–5, Q: Q-Q1–4, R: R-Q1–7). Each carries its own default.
