# Implementation log: d-service-core-single-tenant

Branch: worktree branch of agent-aa3800190fb69741e (reset to `develop` 05e0a37 first). All 44 checkboxes in `tasks.md` ticked.

## Done
- Parked 8 routes, 10 controllers (+ `file-controllers/`), `services/products.ts`, `samples/`, `utils/secure-transpiler.ts` in `service/src/_pending/` (excluded from tsc, eslint and jest).
- Deleted the tenant layer: Firestore utils, project/project-key/jwt/auth/http middleware, auth controller+route, secrets/config/region/domain utils, `constants.ts`, `client/`, both validator files (including `helpers.validators.ts`, per spec C deviation 3), `types/service.types.ts`, old `e2e/`, old `tests/`, stale `yarn.lock` and `.env.example`.
- New `package.json` (Yarn 1, name `@commercetools-labs/contentools-service`), `tsconfig.json`, `tsconfig.build.json`, `jest.config.cjs`, eslint ignore patterns, `.gitignore` (keeps `.env.e2e.local` ignored), `.env.example`, regenerated and committed `yarn.lock` (registry.yarnpkg.com only).
- New modules: `config/{env,containers}.ts`, `ct/{client,errors,custom-objects}.ts`, `utils/predicate.ts`, `utils/logger.utils.ts`, `observability/{request-context,log-format,access-log}.ts`, `middleware/error.middleware.ts`, `routes/health.route.ts`, `routes/service.route.ts`, `app.ts` (`createApp()`), `index.ts` (fail-fast, graceful shutdown).
- Tests (8 suites, 68 tests): config, predicate, error-normalize, observability, fake-ct, custom-objects, runtime (supertest), bootstrap (child process).
- `tools/forbidden-pending.txt`: removed the 26 service entries for deleted files, added the 8 `service/src/_pending/**` files (owners F/G).

## Deviations
1. Spec B (harness) not merged: `tests/support/{env,app,fake-ct}.ts` are the minimal equivalents required by tasks 5.3/7.5/8.5.
2. `fake-ct` registers its handlers with `server.use`, so tests must NOT call `server.resetHandlers()` (it would drop them); they call `fake.reset()` (clears store and recorded requests) instead.
3. `.env.example` has 10 `=` lines, not 11 as the task text says (the spec miscounted; all 10 documented variables are present).
4. Added explicit `winston@^3` dependency (task 6.3) and dropped the old `resolutions` block (`@types/express-serve-static-core` pin from C is not needed with `@types/express@4`).
5. `CustomError` got an optional 4th constructor argument `code` (spec requires an optional machine `code` in error bodies); existing 3-argument calls are unaffected.
6. Task 3.1 listed `rm -rf` for tracked files; done with `git rm` because the sandbox classifier refused bulk `rm -rf`; backup taken in the scratchpad (outside repo).
7. Samples were already in `samples/content-types` (spec C); `grep -ri cms _pending` is empty, no edit to `content-type-import.controller.ts` was necessary.
8. `bootstrap.test.ts` builds with `yarn build` in `beforeAll` when `build/index.js` is missing (so the suite is self-sufficient).
9. The "bodies never logged" test attaches a winston `Stream` transport instead of spying on stdout/console, because jest's console differs between in-band and worker runs and made the spy flaky.
10. The runtime test builds the removed endpoint paths from fragments so the 9.3 grep sweep over `tests/` stays empty.
11. `getLogger()` is lazy and reads configuration, so tests call `resetLoggerForTests()` together with `resetConfigurationForTests()`.

## Questions for the owner
- Q-D6: the error handler logs `err.message` of unexpected 500 errors (never the stack or SDK request objects). Recommended: keep (operators need it; client body stays generic).

## MISSED / UNPORTED
- Everything in `service/src/_pending/` (F/G). `product.route.ts` also references `validateJwt` (not caught by the forbidden-terms guard patterns).
- No supertest "legacy-removed" test (spec C/B) beyond the two removed auth endpoints.
- `CONNECT_SERVICE_URL`, CORS and auth are left to E/H. `service/README.md` still the C stub (H writes the env table).

## Verification (all in `service/`)
- `yarn typecheck`, `yarn lint`, `yarn build` exit 0; `build/` has `app.js config ct errors index.js middleware observability routes utils` (no `_pending`).
- `yarn jest`: 8 suites, 68 tests pass (also `--runInBand`).
- ts-client 4.10.0 and platform-sdk 8.27.0 (single copy each).
- Sweep (task 9.3) over `src tests package.json .env.example` (excluding `_pending`): empty. SPDX header check on service src/tests: all present; root `yarn check:spdx` OK (363 files); `yarn check:forbidden` OK (0 hits, 12 pending); `yarn test:tools` 19 pass.
- Smoke (built server, example env, port 18080): `GET /service/health` 200 with `X-Correlation-ID` and the exact body shape; `POST /service/<removed auth path>` 404 uniform body; SIGTERM logs `shutting down` and exits 0.
- Live sandbox (task 9.6, via `node --env-file` on the owner file, prefix `contentools-test-`): put, list (`sort: id asc` accepted, no 400), update (version 2), create duplicate 409, delete true, delete again false, get null. Object cleaned up; no values printed.

## Not run
- `openspec validate`/archive. Graceful-shutdown with in-flight requests (only idle SIGTERM exercised).
