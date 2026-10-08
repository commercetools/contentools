# New owner questions: p-docs-and-community-files

| ID | Question | Recommended default (assumed) | Affects |
| -- | -------- | ----------------------------- | ------- |
| P-Q1 | Include `FEATURES.md`? The labs publish skill does not require it; sibling `search-config` ships one. | Include (design D-2). | P |
| P-Q2 | Include `SECURITY.md` with GitHub private vulnerability reporting (no email)? No sibling has one. | Include; enable private reporting at launch (spec R, behind checkpoint M-06). | P, R |
| P-Q3 | Migrate the Postman collection (pruned, single bearer) or drop it? | Migrate (design D-4). | P |
| P-Q4 | Support two valid `SERVICE_API_TOKEN` values during rotation (zero-downtime) or a single token with a short 401 window? | Single token, documented window. (Decision belongs to spec E; runbook follows it.) | E, P |
| P-Q5 | Commit the Postman migration script as `tools/migrate-postman.mjs`? | No (one-shot; appendix G keeps the text). | P |
