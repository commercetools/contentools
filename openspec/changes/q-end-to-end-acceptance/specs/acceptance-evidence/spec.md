## ADDED Requirements

### Requirement: Evidence is captured per scenario and redacted
Each acceptance run SHALL write its artefacts to `plans/evidence/q/<run-id>/` containing `RESULTS.md` (one row per scenario: id, status PASS/FAIL/WAIVED/SKIPPED, evidence file, notes), `api/` (redacted request/response transcripts and `results.tsv`), `ui/` (screenshots, console and network summaries), `mc/`, `mcp/`, `connect/` (CLI output, deployment logs). No file SHALL contain a token, client secret, private key or an unredacted `Authorization` header.

#### Scenario: Redaction check
- **WHEN** `grep -rEn "Bearer [A-Za-z0-9._-]{20,}|client_secret|BEGIN [A-Z ]*PRIVATE KEY" plans/evidence/q/<run-id>` runs
- **THEN** it prints nothing

#### Scenario: Run accepted
- **WHEN** every phase-1 row of RESULTS.md is PASS, or WAIVED with the owner's written reason, or SKIPPED for an optional scenario
- **THEN** the run is marked LOCAL ACCEPTED and spec R may start its first checkpoint

#### Scenario: Full acceptance
- **WHEN** after the public release candidate tag every phase-2 row (deployed run, Merchant Center checks, redeploy, token rotation) is PASS or WAIVED with the owner's reason
- **THEN** the run is marked FULL ACCEPTED, which spec R requires before the final release

### Requirement: Evidence stays out of the published repository
`plans/` SHALL NOT be present in the commit published by spec R, and `.gitignore` SHALL list `plans/evidence/` and `**/.env.e2e`.

#### Scenario: Ignore rules
- **WHEN** `git check-ignore plans/evidence/q/x/RESULTS.md service/.env.e2e` runs
- **THEN** both paths are reported as ignored
