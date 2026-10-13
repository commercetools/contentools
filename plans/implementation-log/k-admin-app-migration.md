# Implementation log: k-admin-app-migration

Branch: worktree branch `worktree-agent-a428e50371ebded34`, reset to `develop` 25d4e77 (spec J merged). Tasks: 43 of 57 ticked; 14 marked `[~]` (2.2 partly, group 8, A3, B1-B8: see "Not run" and deviation 3).

## Done
- Pruned the already-imported `admin-app/` tree (spec A had copied it): removed the onboarding wizard, auth/connect contexts, custom-object and API-client hooks, dead hooks/types/utils, the old Jest-ESLint runner files, `.yarnrc.yml`, the old `yarn.lock`. Remaining `src` files are the ones D1 lists plus new ones.
- New: `contexts/service.tsx` (`ServiceProvider`, `useService`, `normalizeServiceUrl`), `hooks/use-service-fetcher/forward-to-fetcher.ts`, `components/service-not-configured`, `components/service-error-boundary.tsx`, `i18n/messages.ts`, `routes.tsx` rewritten (no `projectKey`/`jwtToken`; `fetcher`, `key={businessUnit}`), `entry-point.tsx` (Shell, Nimbus, ServiceProvider, BusinessUnitProvider), `admin-layout` (Nimbus icons, react-intl, badge `CT`), `business-unit.tsx` dependency fix.
- `package.json` rebuilt per D5, `eslint.config.js`, `tsconfig.json`, `.env.example`, `.gitignore`, `README.md`, i18n `core/en/de` (10 keys each).
- Guards `scripts/check-{pins,deps,i18n}.mjs` + `deps-allowlist.json`; each negative case tried (pin 27.12.0, extra `moment` dependency, local `file:` specifiers) and fails as intended.
- `tools/admin-app-use-local-puck.mjs` (use / `--restore`) and root script `admin-app:local-puck`.
- Tests: 25 pass in 6 suites (forward-to headers/FormData/401 retry/403 no retry, service URL, routes wiring, business-unit selector, German nav, error boundary).
- `tools/forbidden-pending.txt`: removed the `admin-app/  # K` entry (it was stale; `check:forbidden` OK).
- `custom-application-config.mjs`: replaced with exactly the content of spec L's design D2 so the app builds (L owns the file and will confirm it).

## Deviations (and why)
1. The puck fetcher contract (spec J) is `PuckFetcher = (request: {url, method, headers, body}) => Promise<PuckResponse>`, not `(url, init)` as K's tasks assumed. `forwardToFetch` takes the request object; the puck headers go through `forwardToConfig.headers` (the shell prefixes them `x-forward-header-*`, the documented MC mechanism). `ServiceFetcher` is derived from `ComponentProps<typeof PageManager>['fetcher']` so no extra `puck-types` dependency is needed. JSON bodies also get an outer `Content-Type: application/json` on the proxy request (unverified against the real gateway, see Not run). Tests 9.2-9.4 were adapted to this signature.
2. `executeHttpClientRequest`/`buildApiUrl` are imported from `@commercetools-frontend/application-shell-connectors` (already a dependency), not from `application-shell`: the shell's published `.d.ts` re-exports resolve to a path that does not exist, so those symbols are `any` there. Same typing issue forced `skipLibCheck: true` in `tsconfig.json` and an explicit parameter type in `use-business-units.ts`.
3. `yarn.lock` is committed WITHOUT the ten `@commercetools-labs/puck-*` entries: the pre-release is not on npm, so a registry install is impossible and the tarball install must not leak `file:` entries. The lock was generated in a scratch copy with the tarballs and the puck blocks were removed; every other package is pinned. Consequences: `yarn install --frozen-lockfile` and `yarn check --integrity` fail until the puck rc is published and `yarn install` adds the entries (TODO for spec R / M-08). `check:pins` only requires the file to exist, so it passes. Task 2.2's "done when" is therefore not met.
4. Yarn 1 does not apply `resolutions` to the root's direct dependencies, and a leading `@` in a `file:` path breaks Yarn 1's tarball extraction. The local-puck script therefore rewrites the direct puck dependencies as well as `resolutions`, and renames the packed `@commercetools-labs-puck-x.tgz` to `commercetools-labs-puck-x.tgz`. It keeps the pristine `package.json` in `.local-puck/package.json.orig` even when re-run, accepts `--ignore-engines`, and `--restore` only warns (exit 0) if the registry reinstall fails because puck is not published yet.
5. The spec's `yarn --cwd admin-app` flag for `--frozen-lockfile=false` is invalid in Yarn 1; `--no-lockfile` alone is used.
6. `extract-intl` got `--ignore='**/*.d.ts'` (formatjs crashed on `graphql.d.ts`).
7. The Merchant Center jest preset cannot transform the ESM-only puck packages, so `jest.test.config.js` maps the three manager packages to `src/test-utils/puck-stubs.tsx` (props printed as JSON). This replaced spec B's per-test `jest.mock('../../routes')` workaround, so the msw 0.49 helper (`test-utils/msw.ts`, `msw` dependency) and the B smoke spec were deleted (D5 removes msw; the new specs cover rendering).
8. `test-utils/index.tsx` now wraps in `NimbusProvider` and filters exactly one console message (React 19's "Encountered a script tag" from Nimbus colour-mode script), because the preset fails tests on `console.error`.
9. `PERMISSIONS.View` is `ViewContentools` (not `canViewContentools` as the task text says); the test asserts the real value. The user-permission claim sent by forward-to is a list of permission names; service-side check names belong to E.
10. German catalog test (9.7) provides the catalog with `IntlProvider`, because the test shell does not call `load-messages`.
11. A1 grep in the task (`x-project-key|jwtToken|authenticate-project` in the bundle) cannot return 0: the puck packages legitimately keep the optional `jwtToken`/`getAuthHeaders`/`fetcher` props and the Merchant Center shell itself sends `X-Project-Key` to the MC API. Meaningful variant: lowercase `x-project-key` and `authenticate-project` in app code and puck output: 0 hits; `ct-poc|run.app|multitenant`: 0 hits.
12. The tree was already imported and `ossify`ed by spec A, so task 1.1 (rsync) was skipped; only the deletions and rewrites ran.

## Questions for the owner
- Q-K-A: With the puck pre-release unpublished, `yarn.lock` lacks the puck entries (deviation 3). Recommended default: after M-08 (publish rc), run `yarn install` in `admin-app/` and commit the lock before the Connect rc tag.
- Q-K-B: Whether the Merchant Center gateway accepts `PUT`/multipart through forward-to and whether the outer `Content-Type` is needed is unverified (browser/MC checks not run). Recommended default: keep as implemented; if B3/B4 fail, record in `manual.md` M-K2 and open risk R2.

## MISSED / UNPORTED
- Nothing from the source app is knowingly dropped except what D1 deletes. Business-unit selector and the three routes are kept.

## TODO for others
- L: `custom-application-config.mjs` already holds D2; L only needs to confirm, add `config:sync` docs and the Connect block. `admin-app/README.md` has a short dev section; L adds Deploy.
- E: service must check `req.session.projectKey` against `CTP_PROJECT_KEY`, use `audiencePolicy: 'forward-url-origin'`, and answer 403 (not 401) for a missing permission (see design D2, Q-K4).
- R/Q: add puck entries to `admin-app/yarn.lock` after the first publish; run the Merchant Center checks.

## Verification (run in `admin-app/` unless noted)
Node 22.21.1, Yarn 1.22.22. Yarn warns about the `isomorphic-dompurify` engines mismatch (wants Node ^22.22.2), so all installs used `--ignore-engines`.
- puck: `cd puck && corepack yarn install --immutable && corepack yarn build` OK (10 packages).
- `node tools/admin-app-use-local-puck.mjs --ignore-engines`: builds, packs 10 tarballs (`ls .local-puck` shows 10 plus the `.orig`), installs 9 puck packages at 1.0.0 (`puck-image-picker` is not a dependency of any of the three managers, so it is not installed); `yarn check:pins` FAILS naming the `file:` leftovers (intended).
- `--restore`: `package.json` byte-identical to the saved original; registry reinstall warns (puck unpublished).
- `yarn typecheck` OK; `yarn lint` OK (0 problems); `yarn test` 6 suites, 25 tests passed; `check:pins`, `check:deps`, `check:i18n` print ok.
- `yarn verify` (with `ENTRY_POINT_URI_PATH, CLOUD_IDENTIFIER, CUSTOM_APPLICATION_ID, APPLICATION_URL, CTP_INITIAL_PROJECT_KEY, CONTENTOOLS_SERVICE_URL` set in the shell): exit 0, build compiled, `public/` populated (git-ignored). Run against the local-tarball `node_modules`.
- Single copies (task 2.3): `react`, `react-dom`, `react-intl`, `@chakra-ui/react`, `@commercetools/nimbus`, `nimbus-icons`, `puck-types`, `puck-api`: 1 each.
- Repo root: `yarn check:spdx` OK (493 files); `yarn check:forbidden` OK (0 hits, 2 pending); `yarn check:legacy-calls` OK; `yarn test:tools` 34 pass.
- `grep -rniE "cms|multitenant|ct-poc|run\.app" admin-app` (excluding `node_modules`, `public`, `yarn.lock`): empty.

## Not run
- Merchant Center browser checks B1-B8 and A3 (puck playground in Chrome): not run, Chrome DevTools connector detached and no Merchant Center login. No screenshots under `plans/evidence/k/`. forward-to behaviour for PUT/multipart, deep-link reload (R6), German UI in MC, 403 notice with a view-only user are all unverified live; only the unit-level header proof (A4) ran.
- Group 8 (tunnel + local service + `yarn start`): not run (needs tunnel, service, MC login).
- `yarn install --frozen-lockfile` from a clean `node_modules` (2.2) and the clean-install variant of `yarn verify`: not possible until the puck rc is published (deviation 3).
- `openspec validate` not run.
