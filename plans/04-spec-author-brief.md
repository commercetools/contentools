# Brief for spec authors (read fully before writing anything)

You are authoring ONE OR MORE OpenSpec changes for the **Contentools** migration. Do NOT implement
the migration (no copying source into the target tree, no code changes) — you produce planning artifacts only.
You MAY run read-only commands, and scratch experiments in the scratchpad dir (never in the target tree).

## Read first
1. `/Users/behnam/code/commercetools-labs/contentools/plans/00-master-plan.md`, `01-dependency-plan.md`,
   `02-spec-workflow.md` (the junior-developer bar for tasks.md is MANDATORY), `03-testing-strategy.md`,
   `manual-steps.md`, `owner-questions.md` (global questions and their DEFAULTS).
2. The Connect skill references (authoritative for Connect rules):
   `/Users/behnam/.claude/plugins/cache/commercetools/commercetools/0.47.0/skills/commercetools-connect/SKILL.md`
   and `references/*.md` relevant to your spec (project-structure, service-applications, lifecycle-scripts,
   security, testing, deployment-installation, merchant-center-*, monorepo-with-storefront, connect-cli).
   Verify platform facts there / in docs (`https://docs.commercetools.com/connect/...`,
   `https://docs.commercetools.com/merchant-center-customizations/...`) — do not invent.
3. The labs publish rules: `/Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish/SKILL.md`
   (+ `scripts/policy.json` — NEVER copy policy.json content into any artifact; refer to it only).
4. The SOURCE: `/Users/behnam/code/cms` (read-only!): `service/`, `contentools/`, `mcp/`, `puck/`, `connect.yaml`.
5. A sibling labs repo with a working Connect layout for reference: `/Users/behnam/code/commercetools-labs/search-config`
   (its `connect.yaml`, `service/`, `app/`, `tools/`, `docs/`, CONTRIBUTING/SUPPORT).

## Where to write
Each change already exists: `/Users/behnam/code/commercetools-labs/contentools/openspec/changes/<id>/`.
Use the CLI for the official templates/instructions, e.g.
`cd /Users/behnam/code/commercetools-labs/contentools && openspec instructions proposal --change <id>` (also `specs`, `design`, `tasks`),
then write the files. Produce in this order: `explore.md` (working note: facts with file paths/line numbers,
route/env lists, risks — evidence that you actually read the source), `proposal.md`, `specs/<capability>/spec.md`
(requirements with `#### Scenario:` WHEN/THEN; use `## ADDED Requirements` headers; use SHALL/MUST), `design.md`,
`tasks.md`. Then run `openspec validate <id> --strict` and fix until it passes.
Also write, inside the change dir: `questions.md` (new owner questions, each with a recommended default; do NOT
edit plans/owner-questions.md) and `manual.md` (human-only steps you discovered; do NOT edit plans/manual-steps.md).
Leave the file out only if empty (write "None" instead).

## The bar for tasks.md — "any junior developer can pick it up" (VERY IMPORTANT)
Follow `plans/02-spec-workflow.md` exactly: context paragraph per group, pre-conditions, numbered checkbox
tasks (≤~2h each) with exact paths, source file to copy from and what to change, code skeletons/snippets,
commands + expected output, a "Done when" per task, Pitfalls, Verification (automated + Chrome-DevTools-driven
where UI), Rollback, and a spec-level Definition of Done mapped to the scenarios. Explain domain terms the first
time they appear. Prefer concrete over generic: real filenames, real route names, real env var names you
verified in the source. A task like "refactor the service" is a failure; "Delete
`service/src/middleware/project.middleware.ts`, then remove its 14 imports (list them) …" is the standard.
Typical size: 250–700 lines of tasks.md per spec; proposal ~1 page; design as long as needed.

## Locked decisions (all specs must be consistent with these; if you must deviate, say why in design.md and add a question)
* Target repo root: `/Users/behnam/code/commercetools-labs/contentools`. Layout: `connect.yaml`, `service/`, `admin-app/`, `mcp/`,
  `puck/` (Yarn 4 workspace, packages in `puck/packages/*`, playground at `puck/playground` renamed from `puck-react-test`),
  `docs/`, `tools/`, `openspec/` (no `.github`). Root `package.json` is a tooling hub ONLY (no `workspaces`).
* **Single tenant.** The one commercetools project = the Connect-injected API client (`inheritAs.apiClient`) whose env vars are
  `CTP_PROJECT_KEY, CTP_CLIENT_ID, CTP_CLIENT_SECRET, CTP_SCOPE, CTP_REGION` (+ `CTP_API_URL/CTP_AUTH_URL` are derived from region in the app).
  Verify exact injected names in the connect skill (`project-structure.md`/`deployment-installation.md`) and use those.
  Firestore, `authenticate-project`, `refresh-jwt`, `validateProject`, per-tenant creds, `x-project-key` header, `projectKey` URL/prop — all REMOVED.
* **Business-unit scoping stays** (`/:businessUnitKey/...`) (Q-03 default).
* **Auth default (Q-01a):** reads of *published* content are public; preview + all mutations + configuration writes require
  `Authorization: Bearer <token>` where token is EITHER a Merchant Center session JWT forwarded by the MC `forward-to` proxy
  (verified server-side with `@commercetools-backend/express` session auth middleware, audience = service URL) OR a static
  `SERVICE_API_TOKEN` (`securedConfiguration`) for server-to-server/MCP. Spec E owns the exact contract
  (header names, middleware, CORS, error bodies); others reference it. Puck packages take `baseURL`, `businessUnitKey` and an
  auth injection point (optional `jwtToken` string and/or a `fetcher`/`getAuthHeaders` hook — spec J owns the final shape);
  `projectKey` prop is REMOVED.
* **Legacy removed (Q-02 default):** `cms/` package; service routes `content-item*, pages*, page-row, page-component, page-state, page-version, page-content-item-state, content-type (legacy CRUD), proxy-script`,
  lit/rollup/babel bundler; MCP legacy tools. KEEP and verify by grepping `puck/packages/puck-api` call sites: `puck-pages, puck-contents,
  puck-templates, configuration/*, datasource/*, products/search, upload-file, media-library, content-type/import` (spec C re-verifies this list;
  if your spec finds a used legacy dependency, record it in design.md + questions.md).
* **Names:** npm scope `@commercetools-labs/`, packages keep `puck-*` names (Q-04); MCP package `@commercetools-labs/contentools-mcp`
  (fixing the old `contenttools` typo); version `1.0.0` (Q-05). Connect app names `service`, `admin-app`, `mcp`.
* **No "cms"**, no "demo/POC/pre-sales" wording, no customer/internal names or hosts, SPDX header in every source file,
  MIT LICENSE, "unsupported" ×3 (file header, README banner, SUPPORT.md). Header text (exact):
```
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
* **NO GitHub Actions / no `.github/workflows` anywhere** (owner decision: this is a Connect app; Connect builds and deploys it). Quality gates are local scripts (`yarn verify`, `yarn gate`) plus Connect's own build/`commercetools connect application test`. Releasing puck packages to npm is a local, documented, manual-assisted script (no CI trusted publishing). Remove any workflow/CI-service wording from your artifacts.
* Connect rules: root `connect.yaml`; app folder == `deployAs[].name`; each app self-contained (own package.json, no workspaces);
  `service` app `endpoint: /service` and router mounted at `/service`; `postDeploy`/`preUndeploy` idempotent; secrets in
  `securedConfiguration`; least-privilege `inheritAs.apiClient.scopes`; Node 22; `@commercetools/platform-sdk@^8` + `@commercetools/ts-client@^4`
  (replace legacy `sdk-client-v2`); tests run via `commercetools connect application test` where applicable; README states fail-open/closed,
  scopes, config table, replay runbook (Connect skill checklist is the Definition of Done for H, L, M).
* `puck/` is published to npm; `admin-app` consumes it from the registry (workspace packages cannot be resolved by Connect builds).
* Testing is self-driven (see 03-testing-strategy.md): jest+supertest+msw, env-gated live sandbox e2e, Chrome DevTools playbook for UI
  (MC login is the only human-gated part).
* Questions for the owner: only ask when truly blocked/ambiguous; always give a recommended default and proceed on it.

## Quality gates before you finish
* `openspec validate <id> --strict` passes for each of your changes.
* Every file path you cite exists (source) or is clearly marked "to be created" (target). Re-check by `ls`.
* No copy of `policy.json` content, no secrets, no real project keys/IDs from the source.
* tasks.md is executable by someone who has never seen the repo.
* Final message to the coordinator: ≤15 lines — per change: files written, line counts, validate result, new questions/manual steps
  (point to `questions.md`/`manual.md`), and any cross-spec inconsistency you noticed.
