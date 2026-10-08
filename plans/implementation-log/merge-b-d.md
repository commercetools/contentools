# Merge log: spec D (service core) into develop (spec B harness)

Merged `worktree-agent-aa3800190fb69741e` with `--no-ff`. All of D's runtime source kept.

## Conflict resolutions
- `service/e2e/*`: B's guarded smoke suite kept (README, jest.config.js, smoke.e2e.ts, support/); D's deletion of legacy e2e files stands.
- `service/package.json`: D's manifest (Yarn 1, express 4 types, no `resolutions`; the @types/express 5 pins are not needed with `@types/express@4`) plus B's `test:e2e` script, `typecheck` = `tsc -p tsconfig.test.json`, and `dotenv` devDependency (B's e2e env-setup). msw stays at exact 2.10.5. `yarn.lock` regenerated with `yarn install --ignore-engines`.
- `service/jest.config.cjs`: B's config (msw-setup, env setup, uuid shim) plus `testPathIgnorePatterns` for `src/_pending`.
- `tests/support/{env,fake-ct}.ts`: B's canonical fake CT kept and extended: API/AUTH moved to `https://*.ct.test` (D's config requires https), `LOG_LEVEL=error` added, recorded `requests`, `reset`/`seed`/`failNextWriteWith` helpers, `sort: id asc` accepted by the store router. `tests/unit/fake-ct.test.ts` = B's.
- D's `custom-objects.test.ts` adapted to the shared msw server (no private `startFakeCt`); store key is `container|key`.
- `app-smoke.test.ts` uses `createApp()` (D has no default export); `fake-ct-msw.test.ts` got casts for `noUncheckedIndexedAccess`-free typing.
- `tsconfig.test.json`: excludes `src/_pending`, `noUncheckedIndexedAccess: false` for tests (B's store code predates D's strict flag).
- `.eslintrc.cjs`: override for `e2e/**` and `tests/**` (console, any, NodeJS globals).
- `tools/forbidden-pending.txt`: union; dropped 26 stale entries (deleted files) plus 4 entries the checker flagged stale (`service/.env.example`, `service/package.json`, `service/src/app.ts`, `service/e2e/README.md`); D's `_pending` entries and develop's narrowed puck entries kept.
- `tools/verify/02,03,04`: reworded 4 playbook lines that tripped the `tenant-api` pattern (`x-project-key`) to "project-scoping header".

## Verification (service/ unless noted)
- `yarn install --ignore-engines`, `yarn typecheck`, `yarn lint`, `yarn build`: OK.
- `yarn test`: 10 suites, 71 tests pass.
- Root: `yarn check:spdx` OK (404 files), `yarn check:forbidden` OK (0 hits, 15 pending), `yarn test:tools` 34 pass.
- Live smoke (`E2E_ENV_FILE` owner file): `yarn test:e2e` 1 passed; `node tools/sandbox-sweep.mjs` deleted 0. No values printed.
- Not run: puck/admin-app/mcp tests (untouched by this merge).
