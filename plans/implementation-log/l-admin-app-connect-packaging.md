# Implementation log: l-admin-app-connect-packaging

Branch: worktree branch, reset to `develop` 5ae9e85. Tasks: 19 ticked, 26 marked `[~]` (deferred or partly done, see below), 0 open.

## Done
- Root `connect.yaml`: appended the `admin-app` application (type `merchant-center-custom-application`, no endpoint/scripts/secrets; keys `CUSTOM_APPLICATION_ID` required, `ENTRY_POINT_URI_PATH` required default `contentools`, `CONTENTOOLS_SERVICE_URL` optional) directly before `inheritAs:`, and `inheritAs.configuration.standardConfiguration[CLOUD_IDENTIFIER]` (required, no default) after `inheritAs.apiClient`, which is untouched. M should append its `mcp` block right after the service/admin-app blocks (merge conflict in the same area is possible; resolve by keeping both).
- `admin-app/custom-application-config.mjs` finalised (see deviation 1).
- `tools/check-admin-app-connect.mjs` (+ `tools/test/check-admin-app-connect.test.mjs`) and root script `check:admin-app-connect`.
- `tools/admin-app-simulate-connect-build.mjs` (+ `tools/test/admin-app-simulate-connect-build.test.mjs`) and root script `check:admin-app-build`. Clean environment, canary secret, optional `--service-url`, `--skip-install`.
- `admin-app/README.md`: Deploy section (configuration table, two-pass sequence with exact commands, scopes, config:sync sentence, fail-closed, CSP policy, troubleshooting, unsupported sentence).
- `design.md` D5: observed default CSP table. `tasks.md` ticked.

## Deviations
1. Real bug found by the simulated build and fixed: `env.development.initialProjectKey: '${env:CTP_INITIAL_PROJECT_KEY}'` made the production build throw ("Missing environment variable") because Connect never sets that variable. The `development` env is required by the config schema, so the file now reads `process.env.CTP_INITIAL_PROJECT_KEY ?? ''` directly (the design D2 text had the placeholder). K's `yarn verify` passed only because its shell had the variable set.
2. `tools/admin-app-simulate-connect-build.mjs` has `--skip-install`: the frozen install needs the puck pre-release on npm (deferred), so local runs use `tools/admin-app-use-local-puck.mjs` and then `--skip-install`.
3. CSP assertion (task 3.1 item 5): instead of a blacklist of internal hosts (the forbidden-term checker rejects those words in source files) the tool allowlists the hosts the shell adds by default plus the app origin; any other host fails. Stronger than the task text. The "legacy name in index.html" assertion was dropped (covered repo-wide by `check:forbidden`).
4. `connect.yaml` descriptions are quoted strings (matches the service block style); required-ness and defaults are as design D1.
5. Task 2.2 verified via a full `mc-scripts build` in the simulation rather than `compile-html` alone.

## Questions for the owner
- None new. Q-L1 (empty manage scope), Q-L4 (`APPLICATION_URL` may need declaring after the first Connect build) stay open as in `questions.md`.

## Deferred (manual / needs login, public repo or npm)
- 0.1/0.3/A4 frozen install: `cd admin-app && yarn install --frozen-lockfile` fails until the puck rc is published and its entries are in `yarn.lock` (K deviation 3). After publish (M-08): `npm view @commercetools-labs/puck-page-manager@next version`, `cd admin-app && yarn install`, commit `yarn.lock`, then `yarn test --coverage --coverageReporters=text`. The same coverage command passed locally with the local-puck tarballs (6 suites, 25 tests).
- 1.4/A2: `commercetools connect validate . --skip tests` (CLI 0.0.17): "Cannot connect to the Docker daemon". Run once Docker is up; look for errors mentioning `admin-app`.
- A5: `commercetools connect application build|test` inside `admin-app`: not run (Docker).
- 5.1 register in MC (M-L1), 5.2 `cd admin-app && npx mc-scripts login && CUSTOM_APPLICATION_ID=<id> CLOUD_IDENTIFIER=gcp-eu ENTRY_POINT_URI_PATH=contentools APPLICATION_URL=https://example.com npx mc-scripts config:sync --dry-run` (needs MC login; `--dry-run` confirmed in `--help`, but it logs in).
- 6.x deploy: `commercetools auth login ...`, `git tag v1.0.0-rc.1 && git push origin v1.0.0-rc.1`, `connectorstaged create`, `connectorstaged preview` / `publish` + `deployment create`, `deployment describe`, `deployment redeploy` with `admin-app.CONTENTOOLS_SERVICE_URL`: exact commands are in `admin-app/README.md` and tasks.md 6.x; blocked on public repository (spec R), CLI login (M-05), npm puck (M-08), MC registration.
- 4.3, A7, B1-B9: Merchant Center browser checks, not run: connector detached and no MC login. Evidence dir `plans/evidence/l/` not created.

## Verification
- `node tools/check-admin-app-connect.mjs` -> `admin-app connect.yaml ok`; negative cases covered by the tools test (stray `endpoint`, second `CLOUD_IDENTIFIER`, `APPLICATION_URL`, missing key, missing folder).
- `yarn check:admin-app-build` equivalent (local-puck tarballs, `--skip-install`): 5 `ok:` lines, with and without `--service-url https://service-abc.europe-west1.gcp.commercetools.app/service`; the CSP was reviewed by eye (table in design D5).
- admin-app: `yarn typecheck`, `yarn lint` exit 0; `yarn test` (also with coverage flags) 6 suites / 25 tests; `.env.example` has 6 keys; no `headers` key in the config; hit-free grep of the config for hosts/legacy names.
- Repo root: `yarn check:spdx` OK (517 files), `yarn check:forbidden` OK, `yarn test:tools` all pass (37 before the last test file, plus 3).
- service: `yarn install --frozen-lockfile`, `npx jest tests/connect`: 7 suites, 71 tests pass with the new `admin-app` and `CLOUD_IDENTIFIER` entries in `connect.yaml`.
- Remaining grep hits for `localhost` under `admin-app` are K's test fixtures that reject an http URL (`src/contexts/service.spec.tsx`).
- The local-puck script was restored afterwards (`package.json` unchanged); `puck/node_modules` was installed for the local-puck build (git-ignored).
