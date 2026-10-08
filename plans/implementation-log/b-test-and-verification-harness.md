# Implementation log: b-test-and-verification-harness

Branch: worktree branch of `agent-a6db4bb0d96507456` (reset to `develop` 156bf39 first).

## Done (tasks 34 of 37 ticked; unticked: 6.2, 8.2, 8.6)
- Service: jest + ts-jest, supertest 7, msw 2, `tsconfig.test.json`, narrow `jest.config.cjs`, scripts `test`/`test:watch`/`typecheck`.
  `tests/support/{fake-ct-store,fake-ct,msw-setup,env,fixtures,assertions,auth-matrix,uuid-shim}.ts`, 5 hand-written fixtures
  (real field names: `puckData`, not `data`), 3 test files (10 tests), stale `routes.spec.ts` deleted.
- Fake CT store: token, custom objects (create/update/409/GET/DELETE/list with `where`, `sort`, `limit`, `offset`), product search; Node-strippable TS.
- Live e2e: `service/e2e/support/{containers,sandbox-guard,env-setup,gate,ct-http,cleanup,after-all}.ts`, `smoke.e2e.ts`, new `jest.config.js`, rewritten README; `tools/sandbox-sweep.mjs` + tests.
- puck: vitest 3 / jsdom / Testing Library / msw 2 shared config (`vitest.shared.ts`, `vitest.setup.ts`), puck-api http-client test (2 tests), `yarn test` script, empty `puck/yarn.lock` bootstrap.
- mcp: vitest config + registry smoke (2 tests). admin-app: `src/test-utils/msw.ts` (msw 0.49 `rest`/`graphql` helpers) + smoke spec.
- `tools/fake-ct/server.mjs` + README + test, root `dev:fake-ct`; playbooks `tools/verify/01..05 + README` + `playbooks.test.mjs`.

## Deviations
1. msw pinned to `2.10.5` in `service/` (exact). msw 2.15 depends on ESM-only `rettime`, which jest 29 cannot load. Newer is fine in vitest (puck, `^2.10.5`).
2. `uuid` 14 is ESM-only: jest maps `uuid` to `tests/support/uuid-shim.ts` (`crypto.randomUUID`). Spec D/C should keep or replace it.
3. `service/package.json` `resolutions` pins `@types/express` 5.0.1 and `@types/express-serve-static-core` 5.0.6. A fresh `yarn install` (no source lockfile was copied) otherwise resolves newer types where `req.params` is `string | string[]`, giving 111 compile errors in `src/routes` (and ts-jest failing `app-smoke`). Source lock had exactly these versions.
4. New lockfiles committed: `service/yarn.lock`, `mcp/yarn.lock`, `admin-app/yarn.lock` (Yarn 1; none existed). `admin-app` installed with `--ignore-engines` (`isomorphic-dompurify` wants Node ^22.22.2; local is 22.21.1).
5. Added `@testing-library/dom ^10` to puck devDependencies (peer of RTL 16, needed by jest-dom/vitest).
6. e2e: plain Node `fetch` client (`ct-http.ts`) instead of the SDK (no coupling to spec D's SDK choice). e2e `jest.config.js` selects only `smoke.e2e.ts` and `sandbox/**/*.e2e.ts`; legacy `*.e2e.ts`, `setup.ts`, `helpers/http.ts`, `constants.ts`, `env.ts` are left untouched for C/F (deleting them would conflict with C tasks 4.9/9.x and the legacy files still typecheck).
7. Extra: `E2E_ENV_FILE` (absolute path) and `service/.env.e2e` + `.env.e2e.local` are loaded by `env-setup.ts` and the sweep; `E2E_CTP_API_URL`/`E2E_CTP_AUTH_URL` optional overrides (the owner's file has them).
8. msw handlers include a loopback passthrough so supertest's ephemeral server is not intercepted.
9. admin-app smoke mocks `../../routes` (the route tree imports `@commercetools-demo/puck-*` ESM packages that the MC jest preset cannot transform; `@preact/signals-core` etc.). Spec K should fix transformIgnorePatterns and can then drop the mock.
10. puck package tsconfig excludes `src/**/__tests__` (rootDir `src`); tests import `vitest` explicitly.

## Blocker found (affects task 6.2 / 8.2)
`puck/` cannot `yarn install` yet: all puck package.json files still say `@commercetools-demo/*` (workspace deps and playground `link:`), so Yarn 4 fails with "Workspace not found". That rename belongs to spec I. I verified the puck setup in a scratch workspace (puck-api + puck-types, names sed-renamed to `@commercetools-labs/`): `yarn test` -> 1 file, 2 tests passed. In the repo, `puck/package.json` devDependencies are declared but no real `puck/yarn.lock` content exists (empty placeholder only). After spec I: run `yarn install` in `puck/` then `yarn test`.

## Findings for other specs
- `tools/run-all.mjs`: `yarn test` at the root runs puck through Yarn 1, whose PATH injection makes the nested `yarn workspaces foreach` resolve to Yarn 1 ("Invalid subcommand"). Fix in run-all (strip the Yarn 1 bin dir from PATH or call `corepack yarn`) before relying on the puck line; independent of the lockfile issue.
- Service lint config is unchanged; `yarn eslint tests --ext .ts` passes.
- Remaining `@commercetools-demo` references exist in puck/admin-app (specs I/K).

## Questions for the owner
- None new. (Recommended default for deviation 1: keep msw 2.10.5 in service until jest is replaced or ESM is configured.)

## MISSED / UNPORTED
- Nothing intentionally skipped except browser runs and puck lock content (above). Fixtures `theme-configuration.json` is a plain value object (no key wrapper) to match the controller storing the theme as the object value.

## Verification run
- `cd service && yarn test` -> 3 suites, 10 tests passed (offline; msw rejects `example.invalid`; the logged MSW error is that expected rejection). `yarn typecheck` OK. `yarn eslint tests --ext .ts` OK. `yarn jest --listTests` lists only the 3 `*.test.ts` files.
- `yarn test:e2e` without env -> skip message, exit 0. LIVE (sandbox via `E2E_ENV_FILE=/Users/behnam/code/commercetools-labs/contentools/service/.env.e2e.local`): smoke 1 passed; with `E2E_ALLOW_PROJECT_KEY=other` -> `refusing to run`; `node tools/sandbox-sweep.mjs` -> `deleted 0`. No values printed or copied.
- `cd mcp && yarn test` -> 2 passed. `cd admin-app && yarn test` -> 1 passed.
- `yarn test:tools` -> 28 passed. `yarn check:spdx` -> OK (449 files). `openspec validate b-test-and-verification-harness --strict` -> valid.
- Root `yarn test`: service/mcp/admin-app pass; puck fails (see run-all finding + blocker).

## Not run
- 8.6 playbooks 01 + 02 with Chrome: not run: connector detached. Playbook 05 (MC login) not run for the same reason.
- `fake-ct` + service + playground stack was not started end to end (needs the playground install, spec I).
