## Why

Unit and integration tests prove pieces; nothing yet proves that the finished single-tenant system works end to end on a real commercetools project: Connect run, content API, playground editing, Merchant Center app, MCP and negative auth. The publish rules ask for a repo that "builds for anyone", and spec R must not publish something that was only tested with mocks. Evidence has to be reproducible and capturable without the owner except for the Merchant Center login.

## What Changes

- Define the acceptance scenarios AC-01..AC-12 (API walkthrough, negative auth matrix, playground UI journey, Merchant Center checks, MCP checks, Connect local run, optional deployed run, cleanup).
- Add `tools/e2e/acceptance.sh` (curl + jq, redacting, results table), `tools/e2e/cleanup.mjs` (delete test custom objects by container prefix), `tools/e2e/forge-jwt.mjs` (token forging for negative tests), `tools/e2e/mcp-check.sh`.
- Define the Chrome DevTools playbook for the playground journey and the owner-assisted MC checklist.
- Define evidence layout (`plans/evidence/q/<run-id>/`), redaction rules and the RESULTS.md template; a run is only "accepted" when every scenario is PASS or explicitly waived by the owner.
- No product code changes; defects found are fixed in the owning spec's code and re-run.

## Capabilities

### New Capabilities
- `acceptance-scenarios`: the system-level scenarios and pass criteria (API, UI, MC, MCP, Connect, negative auth, cleanup).
- `acceptance-evidence`: how evidence is captured, redacted, stored and judged.

### Modified Capabilities
<!-- none -->

## Impact

- New tooling under `tools/e2e/` (published; contains no secrets) and git-ignored `plans/evidence/`.
- Requires manual steps M-01 (sandbox project + API client), M-02 (media backend, optional), M-03 (registered custom application), M-04 (MC session), M-05 (Connect CLI access), M-08 (rc publish of puck for the deployed `admin-app`).
- Gates spec R: R refuses to start without an accepted RESULTS.md.
