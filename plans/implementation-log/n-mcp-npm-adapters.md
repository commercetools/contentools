# Implementation log: n-mcp-npm-adapters

Tasks: 23/23 ticked. The real `npm publish` was NOT run (needs owner login, OTP, checkpoint); only the dry run.

## Done
- `mcp/src/adapters/{options,ai-sdk,langchain}`, `src/mcp/index.ts`, `src/stdio/index.ts` (thin wrappers over `src/core`).
- `tsup.config.ts` (CJS + ESM + dts, stdio bin CJS with shebang); scripts `build:npm`, `verify:package`, `publish:npm`, `clean`; `dist`/`.publish` ignored; `src/stdio` excluded from `tsconfig.build.json` (`build/` has only core, mcp, server).
- `publish/package.template.json`, `publish/README.md` (npm landing page), `scripts/lib/manifest.mjs` (`assembleManifest`, `tagFor`), `scripts/publish.mjs` (dry run default, `--publish` with typed confirmation, `--tag`), `scripts/verify-package.mjs` (publint, attw, tarball contents, 2-set consumer matrix, CJS/ESM smoke, bin check, tsc nodenext + bundler).
- Tests: 6 new suites (options, ai-sdk, langchain, parity across ai-sdk/langchain/MCP, stdio via `StdioClientTransport`, manifest helper). Whole `mcp/` suite: 16 suites, 193 tests green.
- `mcp/README.md` gets an "npm package" section.

## Deviations
1. `mcp/package.json` version set to `1.0.0-rc.0` (Q-05: rc under `next` first); the file stays `private: true`. `server.ts` still reports MCP server version `1.0.0`.
2. Migration table in `publish/README.md` does not name the old package: the grep gate 8.2 (`contenttools`, `commercetools-demo`) conflicts with naming it. It says "previous internal package". Tool-name mapping is not listed (M's design has no old-to-new name table); it points at the Connect README tool table.
3. `publint` is run with `--pack npm` (default `yarn pack` inside the Yarn 1 project listed every file as unpublished).
4. Consumer TypeScript check installs `@types/node@22` and `@types/json-schema` and uses `--target es2022`: peer `ai` needs them. The node10 `tsc` run was dropped because `ai` itself does not type-check under node10 (our own node10 resolution is covered by attw: all green).
5. `assemble.test.ts` runs the `.mjs` helper in a child node process (jest here is CommonJS and cannot import `.mjs`).
6. Consumer simulations use `npm install` in temp dirs (as the tasks say), not yarn.
7. `check:app` (run by `publish.mjs` step 3) now also runs the 3 new adapter/stdio/publish suites; the stdio suite runs `yarn build:npm` in `beforeAll` (~6 s).
8. CJS bundles are not code-split (tsup): each CJS entry carries its own copy of the core (~32 KB each); ESM shares chunks. Harmless since our classes are not `instanceof`-checked (design risk noted).
9. AI SDK tools are typed `Record<string, Tool>` per the task; checked against ai 6 and 7 by the matrix.

## Questions for the owner
- Q-N-a: first publish `1.0.0-rc.0` under `next` (default, done in manifest) or straight `1.0.0`? Change `mcp/package.json` `version` before running `--publish`.
- Q-N-b: should `publish/README.md` name the previous internal package for migrators? Default: no (gates forbid it); add after the gate list is adjusted if wanted.

## MISSED / TODO
- Real publish (manual.md MN-1..MN-3): `cd mcp && npm login && node scripts/publish.mjs --publish`, type the confirmation, enter the OTP. Needs the `@commercetools-labs` scope. Not run.
- Old-to-new tool name table for migrators is not written (no source in the repo).
- Spec P/O hand-offs: npm README lives at `mcp/publish/README.md`; local checks are `yarn check:app && yarn build:npm && yarn verify:package` (after `node scripts/publish.mjs`). No workflow files.

## Verification (commands run, all exit 0 unless noted)
- `yarn typecheck`, `yarn test` (16 suites, 193 tests), `yarn gcp-build` (`build/` = core, mcp, server only), `yarn build:npm` (exact dist file set; `head -1 dist/stdio/index.js` is `#!/usr/bin/env node`).
- `node scripts/publish.mjs` (dry run): check:app, build, assemble (40 files, only `dist/**`, README, LICENSE, package.json), `verify-package` ALL CHECKS PASSED (publint clean, attw "No problems found", matrix A: ai 6 / @langchain/core 0.3 / zod 3.25.76 / sdk 1.27.1 and matrix B: ai 7 / @langchain/core 1 / zod 4 / sdk 1.32.1: CJS + ESM smoke, bin exits 1 naming the missing variable, tsc nodenext and bundler), registry check E404 (name free), `npm publish --dry-run` with tag `next`, "DRY RUN OK".
- Negative check: renaming an exports target made `verify-package` fail (publint), then reverted.
- Grep gate 8.2 over `mcp/` (excluding node_modules, dist, build, .publish, yarn.lock): empty. SPDX: root `yarn check:spdx` OK (548 files), `yarn check:forbidden` OK. `grep "express\|server/logger" src/mcp/*.ts`: empty.

## Not run
- `npm publish` for real (see above). Inspector CLI one-liner: the Inspector picked up a user-level multi-server config ("Multiple servers found") in this environment; the stdio behaviour is covered by the `StdioClientTransport` test instead. `openspec validate`/archive.
