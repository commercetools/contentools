# Spec Dependency Plan (A → R)

Each letter is one OpenSpec change in `openspec/changes/<letter>-<slug>/`
(`proposal.md`, `specs/**/spec.md`, `design.md`, `tasks.md`). A spec may start implementation only
when everything in **Depends on** is *done* (archived). **Parallel** lists what can run at the same time.

| ID | Slug | One-line scope | Depends on | Blocks |
| -- | ---- | -------------- | ---------- | ------ |
| A | `a-repo-foundation` | Repo skeleton, copy of source trees, root tooling hub, LICENSE/SPDX tooling, `.gitignore`, `.nvmrc`, Node/Yarn pinning | — | everything |
| B | `b-test-and-verification-harness` | Test stack (jest/supertest/msw), local CT sandbox config, Chrome-DevTools browser verification playbook, fixtures | A | D…R (testing) |
| C | `c-legacy-removal-and-rename` | Delete `cms/`, legacy routes/controllers/bundler, rename demo/cms identifiers, prune MCP legacy tools | A | D, I, K, M |
| D | `d-service-core-single-tenant` | Remove Firestore/tenant registry; CT client from Connect-injected `CTP_*`; env validation; logging; error middleware; health | C | E, F, G, H |
| E | `e-service-auth-model` | Replace per-tenant JWT with single-tenant auth (MC session JWT + optional service token); CORS | D | F, G, H, J, M |
| F | `f-service-content-api` | Puck pages/contents/states/versions/templates/configuration/datasource/product/content-type-import on the single-tenant core | D, E, B | H, J, M, Q |
| G | `g-service-media-storage` | Media upload/library with pluggable GCP / S3 / Cloudinary, Connect config keys | D, E | H, Q |
| H | `h-service-connect-app` | `connect.yaml` `service` app, scopes, lifecycle scripts, build/test scripts, README config table, fail-open/closed + replay docs; passes the Connect checklist | F, G | L, M, O, Q |
| I | `i-puck-workspace-migration` | Move `puck/` workspace, rename to `@commercetools-labs/*`, SPDX, remove "demo", build/typecheck/lint green | C | J |
| J | `j-puck-connection-contract` | Drop `projectKey`/`jwtToken`-per-tenant props; new auth-provider contract matching E; release-ready 1.0 API; renderer/SSR; playground app | I, E, F | K, Q |
| K | `k-admin-app-migration` | Move `contentools/` → `admin-app/`; delete onboarding/credentials flow; use new puck packages + service auth; i18n; nimbus UI | J | L |
| L | `l-admin-app-connect-packaging` | `merchant-center-custom-application` block in `connect.yaml`, `custom-application-config.mjs` env placeholders, CSP, scopes, register-first deploy sequence | K, H | O, Q |
| M | `m-mcp-connect-app` | `mcp/` as Connect `service` (Streamable-HTTP MCP) exposing Puck tools against the service; auth passthrough | F, E, H, C | N, O, Q |
| N | `n-mcp-npm-adapters` | (Optional per Q-07) keep AI-SDK / LangChain adapters as npm package sharing tool definitions with M | M | O |
| O | `o-ci-cd-and-release` | (re-scoped: **no GitHub Actions**) local quality gates: `yarn verify`, no-cms grep guard, `connect validate`, Connect build/test conventions, local puck npm release script, release tagging | H, I, L, M | P, R |
| P | `p-docs-and-community-files` | README (banner), INSTALL, architecture, API reference, runbook, SUPPORT, CONTRIBUTING, SECURITY, package READMEs | F, G, H, J, L, M | R |
| Q | `q-end-to-end-acceptance` | Full-system verification on a real CT sandbox: Connect local run + MC app + renderer + MCP, scripted + Chrome-driven | H, J, L, M | R |
| R | `r-publish-gate-and-launch` | `ossify.mjs`, `gate.mjs`, history strip, single commit, create public repo, labs property/topic, anonymous-clone proof, npm publish | O, P, Q | — |

## Graph

```
A ──┬─► B ─────────────────────────────────────────────┐ (testing used by D…Q)
    └─► C ──┬─► D ─► E ──┬─► F ──┐
            │            └─► G ──┼─► H ──┬─► L ◄── K ◄── J ◄── I ◄── C
            │                    │       ├─► M ─► N
            └─► I ───────────────┘       │
                  (I,E,F) ─► J ─► K ─────┘
H,I,L,M ─► O ─┐
F,G,H,J,L,M ─► P ─┼─► R
H,J,L,M ─► Q ─────┘
```

## Critical path

`A → C → D → E → F → H → M/L → Q → R`  (and `C → I → J → K → L`). Longest chain: A, C, D, E, F, H,
(J via I+E+F), K, L, Q, R.

## Parallel lanes (when more than one implementer is available)

* After **A**: B ∥ C.
* After **C**: D ∥ I.
* After **E**: F ∥ G.
* After **H** and **K**: L ∥ M ∥ (O prep) ∥ P (drafting).
* **N** is off the critical path.

## Sequencing rationale (non-obvious edges)

* **E before F**: every content route needs the auth decision (reads public? preview protected?).
* **I before J**: rename/move first so the contract change is a clean, reviewable diff.
* **J before K**: the MC app must consume the *new* puck API; otherwise K is written twice.
* **H before L**: the MC app gets the service URL via an explicit `CONTENTOOLS_SERVICE_URL` key (Connect injects `CONNECT_SERVICE_URL` only into service apps).
* **Puck must be on npm before the first Connect deploy of `admin-app`** (Connect cannot resolve workspace packages) — hence Q needs a *pre-release* npm publish (manual-steps M-08) or a tarball/`file:` strategy for local runs (decided in spec K).
* **R is last** and runs the blocking `gate.mjs` on the final tree; nothing is pushed publicly before it is green.

## Status board (update as specs complete)

| ID | Explore | Proposal | Specs | Design | Tasks | Implemented | Archived |
| -- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| A–R | see `openspec list` / `openspec status --change <id>` | | | | | | |
