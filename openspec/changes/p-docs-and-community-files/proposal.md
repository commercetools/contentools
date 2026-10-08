## Why

The source repository's documentation describes a multi-tenant, Cloud-Run-hosted system with a
"NOT production ready" banner and a demonstration-only license note. None of that is true or
publishable for the single-tenant, Connect-deployed commercetools-labs project. The publish rules
(`commercetools-labs-publish`) require `LICENSE`, `SUPPORT.md`, `CONTRIBUTING.md` and a README that says
"unsupported" up front, and a stranger must be able to install, operate and contribute to the project
from the docs alone.

## What Changes

- Rewrite `README.md` from `/Users/behnam/code/cms/README.md`: labs banner (unsupported), single project, Connect deploy, no multitenancy / Firestore / Cloud Run / demonstration wording / "cms".
- Add `INSTALL.md` (Connect deploy, register-first sequence, Merchant Center registration, verification), `FEATURES.md` (feature -> code map, sibling parity), `SUPPORT.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- Add `docs/architecture.md`, `docs/api-reference.md` (route table), `docs/runbook.md` (redeploy, rotate `SERVICE_API_TOKEN`, poison/replay "not applicable" with rationale, troubleshooting).
- Add per-package READMEs for the 10 `puck/packages/*`, plus `puck/README.md`, `puck/playground/README.md`, and verify `service/`, `admin-app/`, `mcp/` READMEs written by H, L, M/N.
- Migrate the Postman collection to `service/postman/` (pruned, single-token auth, renamed, templates + product search added).
- Add two automated doc-drift checks (config keys vs `connect.yaml`, documented routes vs mounted routes) and a docs lint (banner present, forbidden words absent).
- **BREAKING (docs only)**: every documented flow that used `authenticate-project`, `x-project-key`, `projectKey` props, Firestore or Cloud Run disappears.

## Capabilities

### New Capabilities
- `repository-documentation`: README, INSTALL, FEATURES, architecture, API reference, runbook and per-package READMEs, with their content rules and drift checks.
- `community-files`: SUPPORT, CONTRIBUTING, SECURITY and the "unsupported" x3 / wording rules enforced by the publish gate.
- `service-api-collection`: the migrated Postman collection and environment.

### Modified Capabilities
<!-- none: openspec/specs is empty at authoring time -->

## Impact

- New files only: repo root docs, `docs/`, `puck/**/README.md`, `service/postman/`, `tools/check-docs-*.mjs`, one supertest file in `service/tests/docs/`.
- Reads (does not change) code owned by specs D-N; documents their final names. Depends on F, G, H, J, L, M being implemented (dependency plan), so the text is verified against real code, not assumed.
- Feeds spec R: `SUPPORT.md` and `CONTRIBUTING.md` are gate-required files; wording scanned by `gate.mjs`.
