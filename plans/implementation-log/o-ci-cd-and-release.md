# Spec O: local quality gates and release tooling (no CI)

## Done
- `tools/verify.mjs` (+ `lib/verify-steps.mjs`): ordered steps tools, spdx, forbidden, legacy-calls, hygiene, connect-contract, then puck, service, mcp, admin-app; flags `--only --skip --fail-fast --install --connect --strict`; table, per-step logs in `.verify-logs/` (git-ignored). Root `verify` and `verify:strict` replace A's provisional script.
- `tools/check-connect-contract.mjs` (`yarn check:connect`, + `lib/connect-blocks.mjs`): static contract of root `connect.yaml` and app folders; also runs L's `check-admin-app-connect.mjs`. Real tree: `connect-contract: OK (3 apps)`.
- `tools/check-repo-hygiene.mjs` (`yarn check:hygiene`): CI files, Docker, env, key, `.npmrc`, lockfile, tarball, extra LICENSE, secret patterns (never prints the match); `--strict` adds `_pending` and missing `yarn.lock`.
- `tools/release/`: `versions.mjs`, `plan-tag.mjs` (pure), `preflight.mjs`, `tag.mjs` (dry run default, never pushes), `puck-script.mjs`, `README.md` (runbook + Connect conventions). Root scripts `release:puck:bump|publish`, `release:preflight`, `release:tag`.
- Unification: the admin-app Connect build simulation (L) and `connect validate` are steps under `--connect`/`--strict`; `check:admin-app-connect` runs inside `check:connect`. `verify:service` and `verify:mcp` are kept (they install first).
- Fix from earlier logs (B): `tools/lib/yarn.mjs` resolves puck (`packageManager: yarn@4.5.1`) to `corepack yarn` and strips the Yarn 1 temp PATH dir (`yarn--*`); used by `run-all.mjs`, `verify.mjs` and `release/puck-script.mjs`. Root `yarn test` now passes for puck.
- Tests: 4 new test files (hygiene, connect contract, verify steps and yarn resolution, release); `yarn test:tools` 64 pass.

## Deviations
1. mcp's own `verify` script is the live end-to-end check (needs `MCP_ACCESS_TOKEN` and a running server), so the orchestrator uses an override chain for mcp (`check:app`, `check:connect-block`) instead of `verify` (`CHAIN_OVERRIDES` in `lib/verify-steps.mjs`). `mcp/scripts/check-connect.mjs` is not replaced; it runs as `check:connect-block`, and the generic `check:connect` covers the same rules statically (the mcp script needs the `yaml` package, so it only works after mcp is installed).
2. Release wrappers use `node tools/release/puck-script.mjs` instead of `yarn --cwd puck ...` because the root runs under Yarn 1 (PATH injection). `--execute` is forwarded unchanged.
3. Hygiene `only the root LICENSE` regex simplified (the spec regex was wrong). The secret-assignment pattern ignores `import.`/`process.`/`env.` values (false positive in `puck/playground/src/App.tsx`).
4. Added an `admin-app-connect-build` step (L's simulation) under `--connect`; it runs the real frozen install, so it fails until the puck release candidate is on npm.
5. Real finding fixed: `mcp/LICENSE` (identical duplicate of the root LICENSE from the first mcp commit) was removed. Spec N's publish script copies `../LICENSE`, so it does not need it. This is the only touch of `mcp/`.

## Questions for the owner
- Q-O2 (does `connect validate` need `auth login`?) not answered: the Docker daemon is down and the CLI fails at "Cannot connect to the Docker daemon" before anything else. Default: strict mode requires it; answer at R's run.
- Q-O4: the version bump of root/service/admin-app/mcp stays manual (runbook step 3). Default: extend I's `bump-versions.mjs` with `--all` later.

## Verification run
- `yarn test:tools`: 64 pass. `yarn verify --only tools,spdx,forbidden,legacy-calls,hygiene,connect-contract`: 6 PASS.
- `yarn verify --install` (puck 40 s install + 52 s verify, service, mcp): puck, service, mcp PASS; admin-app FAIL because `@commercetools-labs/puck-*@^1.0.0-rc.0` are not on npm yet (expected until the release candidate is published).
- Root `yarn test`: puck 118, service 665, mcp 172 tests pass (puck through corepack works); admin-app fails for the same missing-install reason.
- Negative proofs: a `_pending` file passes default hygiene and fails `--strict`; a workflow file fails; a token-shaped string fails without being echoed; service version drift makes preflight list all versions and fail; connect-contract mutations are unit-tested on scratch dirs.
- `yarn release:puck:publish` (dry run, puck built): dry-run results for all packages, nothing published; `node tools/release/tag.mjs 1.0.0` prints the tag and push commands without touching git; `--next-rc` is rejected while the version is not an rc (bump first).
- No `.github` directory exists.

## Not run
- `yarn verify:strict` and `commercetools connect validate .`: not run: Docker daemon down (`commercetools` CLI 0.0.17 present). Deferred to R. Tasks 5.1, 5.2 (`connect application test` also needs Docker) and 7.3 stay open.
- No npm publish, no tag created or pushed.

## TODO
- Run `yarn verify:strict` with Docker and record date, CLI version, duration, and whether `auth login` was needed.
