# Implementation log: p-docs-and-community-files

Branch: worktree branch (reset to `develop` 656c2be first). Tasks: 38 of 40 ticked; `[~]`: 1.7 (live status-code probe, covered by service tests instead) and 5.4 (Postman/newman import not run).

## Done
- Root: `README.md`, `INSTALL.md` (config table generated from `connect.yaml`, 34 keys), `FEATURES.md`, `SUPPORT.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- `docs/architecture.md`, `docs/api-reference.md` (77 rows: 2 health, 13+13 items, 4 templates, 34 configuration, 6 datasources, 1 products, 2 content-type, 2 media), `docs/runbook.md`.
- `service/postman/contentools-api.postman_{collection,environment}.json` (77 requests, token variable empty and `secret`), migrated with the Appendix G script (not committed) plus fixes (see deviations).
- Package READMEs for all 10 packages (template; peer lists generated from package.json), `puck/README.md` extended (package table, dependency graph, build and release), new `puck/playground/README.md`.
- Verified/extended app READMEs: link to `docs/api-reference.md` in `service/README.md`, INSTALL link in `admin-app/README.md`, JSON client snippet and INSTALL link in `mcp/README.md`.
- Checks: `tools/check-docs-lint.mjs`, `tools/check-docs-config.mjs`, `tools/check-docs-postman.mjs`, `tools/docs-lint-allow.json` (`[]`), `tools/test/check-docs.test.mjs` (8 tests), `service/tests/docs/api-reference.test.ts` (4 tests); root scripts `docs:check` and `verify` now end with the three checks.

## Deviations (code wins over the P drafts)
1. Playground port is 5174 (not 5173); service `yarn start:dev` is Yarn 1; the playground can run against `puck` mock service.
2. Route table vs Appendix F: `DELETE /datasource/:key` is 204 (PUT 200); `GET /media-library` takes `limit`, `cursor`, `extensions` (cursor pagination, no `page`); media upload body also carries `title`/`description`; configuration aggregate also answers `contentoolsBaseUrl`; page create body uses `puckData` (the old Postman body used `content`). Content queries support only `field = "value"` clauses joined by AND (fields `slug|name|key`, `contentType|name|key`).
3. Retried `POST` create is NOT rejected with 409 (design D-7 draft said it would): item keys are generated UUIDs, so a retry duplicates. Runbook section 7 and README follow H's text; only `POST /datasource/:key` answers 409.
4. Redeploy semantics: the tasks say `configurationValues` is a partial merge; H and L READMEs say omitted keys may be lost and keys must all be re-sent. Docs say "send every key"; unverified until a real deployment (Q).
5. Route-existence test uses the Express router stack (`tests/support/route-inventory.ts`) in both directions (documented = mounted), because auth answers 401 for unknown paths; only the two lazily mounted media routes are probed over HTTP. `jest.config.cjs` testMatch gained `docs`.
6. `check-docs-config.mjs` uses a line parser (no `yaml` dependency; root hub stays dependency-free). Allow list extended with `APPLICATION_URL`, `CTP_INITIAL_PROJECT_KEY`.
7. Lint FEATURES path check only validates tokens starting with a top-level repo dir; lint also scans fenced blocks for forbidden words. Forbidden-word ids in the lint use neutral names so `check:forbidden` stays green.
8. FEATURES/Appendix paths fixed to real files (e.g. `puck-pages.route.ts`, `item-routes.ts`, `slices.ts`). Languages: Spanish described as carried over from earlier code (not "machine-translated"), German as machine-translated and unreviewed; `puck/README.md` sentence changed accordingly.
9. CONTRIBUTING: no `yarn install` at the root (hub has no dependencies and no lockfile); lists real per-app commands. `admin-app` `yarn install --frozen-lockfile` cannot pass until the puck rc is on npm (K deviation 3).
10. INSTALL registration scopes and Connect commands come from L/H READMEs (`connectorstaged create ... --supported-regions`, `preview`, application-qualified `--configuration`), not the generic `deployment create` line of the task.
11. Postman: media-library URL, page, datasource bodies fixed; four `b2b-account-menu-links` requests added (array body `[]`).

## TODO-after-O/N (follow-up pass)
- N (npm adapters for mcp): `mcp/README.md` has no npm/stdio adapter section; INSTALL section 3 and `FEATURES.md` MCP rows mention only the HTTP server.
- O (root verify/gate tooling): `package.json` `verify` was extended by hand with the docs checks (O may rewrite it; keep `docs:check` in it). CONTRIBUTING lists `yarn verify`, `check:spdx`, `check:forbidden`, `docs:check`; update if O renames them. Root `yarn verify` runs puck through Yarn 1 (known B finding); not run end to end here (puck verified directly).
- Q: runbook commands marked "to be verified" (connectorstaged update/publish flags, API client re-creation on redeploy, partial-merge rule, restore procedure). INSTALL no longer links the acceptance spec.
- R: docs link to `service/postman` and absolute GitHub URLs in package READMEs assume the final repository `commercetools/contentools`.

## Questions for the owner
- P-Q: Spanish catalog provenance (carried over; reviewed?). Default: wording as written.

## Verification
- `yarn docs:check`: `docs lint ok (33 files)`, `docs config ok (34 keys)`, `postman and api-reference agree (77 routes)`.
- `yarn test:tools` 48 pass; `yarn check:spdx` OK (542 files); `yarn check:forbidden` OK (0 hits).
- `service`: `yarn verify:service` (install, typecheck, lint, test, build) exit 0, 58 suites / 669 tests (incl. `tests/docs`); renaming a documented route made the docs test fail, reverted.
- `mcp`: `yarn verify:mcp` exit 0. `puck`: `corepack yarn verify` exit 0 (118 tests).
- Forbidden-word greps over all new docs (cms, tenant, Firestore, Cloud Run, demo, POC, pre-sales, legacy auth names, `[V` markers): empty.

## Not run
- `admin-app` install/verify (needs published puck rc), Postman/newman import, status-code probe against a running service (1.7), `npm pack --dry-run` per package (publish test in puck verify covers tarballs), gate dry run (see final message), any deployed Connect procedure from the runbook, Merchant Center/browser checks (connector detached).
