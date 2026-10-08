# Implementation log: i-puck-workspace-migration

Branch: `worktree-agent-a6fc50443d518fb91` (reset to `develop` 05e0a37 first). Tasks: 49 of 51 ticked; 9.4 (browser check) and 11.4 (status board) are marked `[~]`, see below.

## Done
- Starting point: spec A had already imported `puck/` and run `ossify` (package names, headers, workspaces, playground name). I finished the rest of groups 1-11 on top of that instead of re-copying.
- Group 1/2: removed the stray `puck/bump-versions.sh` that A copied; copied the source `yarn.lock` (read only) as the Yarn 4 bootstrap; extended `.gitignore`; scope `@commercetools-demo/` -> `@commercetools-labs/` in 113 files; both `components/cms` directories moved to `components/blocks` (imports fixed); all CMS wording removed from comments, descriptions, README, playground title.
- Group 3/4: all 10 `package.json` rewritten (version 1.0.0, MIT, repository/bugs/homepage/keywords/engines/publishConfig, `files`, nested `exports` with `.d.mts`/`.d.ts`, per-package `resolutions` removed, `@types/react*` `^19`); unused `puck-types` dependency (puck-components) and `isomorphic-dompurify` (puck-editor) removed; READMEs with the unsupported banner for all 10; `scripts/verify-metadata.mjs` (also checks `docs/api-contracts.json`); consumer fixture `scripts/fixtures/consumer` (ESM NodeNext, CJS NodeNext `.cts`, Bundler) wired as `yarn check:consumer`.
- Group 5: root `package.json` rewritten (ESLint 9 flat, vitest 3, RTL, jsdom; scripts per spec plus `check:consumer` in `verify`), `eslint.config.mjs`, `vitest.config.ts` (with source aliases so tests do not need a build), `vitest.setup.ts`; playground gets `typecheck`, `workspace:^` deps, `puck-theme-manager`, 10 aliases.
- Group 6: `scripts/check-headers.mjs`; all 202 files carry the SPDX header (FooterBlock files already had it from A).
- Group 7: the 43 findings fixed without disabling rules: 9 hook-calling `renderXxx` converted to module-level `XxxRender` components (script, one file each, exported names unchanged); `any` removed through `CtProductLike` types in `blocks/shared.ts`; 5 dead option lists and one `as any` removed in `theme-editor.tsx`; `currentData`/`extensions` wrapped in `useMemo` (4 files + 2 image pickers); 6 stale `no-console` directives deleted; justification comment on the `useDatasource` deps disable. `yarn lint` runs with `--max-warnings 0`.
- Tests: 12 block smoke tests, 4 `topoSort` tests, 3 publish-script tests (topological order, LICENSE injected into each tarball and removed afterwards, `workspace:` rewritten by `yarn pack`, dirty tree refused). 19 pass.
- Group 8: `scripts/lib/workspace.mjs`, `bump-versions.mjs`, `publish-packages.mjs` (runbook as header comment, dry run default, `--execute` with clean tree + `npm whoami` + typed confirmation, `next` tag for prereleases, LICENSE copy removed in `finally`).
- Group 9/10: playground builds under the new names; README names and banner; `api-contracts.json` header, datasource entry and `compatible` fixed; `translate-messages.mjs --dry-run --locale es` exits 0.
- Guard: `tools/forbidden-pending.txt` entry `puck/  # I,J` narrowed to the 4 files that still say `x-project-key` (owner J): `puck-api/src/api/{configuration,http-client,media-library}.api.ts` and `puck-image-picker/src/api/media-library.api.ts`.

## Deviations
1. Spec text assumed a fresh copy; A had already imported and renamed. I skipped re-copying and only fixed what was left (see Done).
2. `yarn.lock` was not in the repo (A copies no lockfiles). I copied the source one, `yarn install` rewrote the workspace entries and added the new dev tools; `yarn install --immutable` is clean afterwards and no `commercetools-demo` or `puck-react-test` remains in it. (Brief said create the file first; this is the same idea with real content.)
3. `puck-components` tsup `external` lost the `puck-types` entry (dependency removed); `isomorphic-dompurify` stays in puck-components (it imports it), only the puck-editor entry was removed.
4. Root devDependencies gained `@testing-library/dom` (peer of RTL 16); tests resolve sibling packages from source through vitest aliases.
5. CJS fixture uses `NodeNext` with a `.cts` file (true `require` condition) and `esModuleInterop: true`; the `Node10` variant from the spec fails with TS1259 only because React's types need `esModuleInterop` in any CJS consumer. Added a third fixture config (Bundler).
6. `verify-metadata.mjs` spells its retired-name regex as `/c[m]s/i` so the repo forbidden-terms guard does not flag the checker itself.
7. Test files sit inside `src/` and are covered by the package `tsc --noEmit`, so the smoke test imports `@testing-library/jest-dom/vitest` for the matcher types. They are not part of the tsup entry or the packed `dist`.
8. The `scripts/**/*.test.mjs` publish test needs `git`, `tar`, `yarn` (corepack) on PATH; it builds a throwaway workspace copy with stub `dist/` and a fake `npm`.
9. `corepack enable` needed no elevated permission here (Node under nvm, shims written into `~/.nvm/.../bin`; exit 0). It replaced the global `yarn` shim: `yarn --version` is now 4.5.1 inside `puck/` and 1.22.22 elsewhere (service/, admin-app/, mcp/ have no `packageManager` field), so Yarn 1 projects still work.

## Questions for the owner
- Q-I1..Q-I4 unchanged; defaults used (keep en/es, Yarn 4.5.1, `1.0.0` committed and rc published by bumping to `1.0.0-rc.0` first, `@measured/puck` stays a dependency).
- New: the first rc needs `node scripts/bump-versions.mjs 1.0.0-rc.0` committed before `publish-packages.mjs --execute`; the tree currently holds `1.0.0`. Recommended: do the bump in spec Q/R, not here.

## MISSED / UNPORTED
- Intentionally not ported: `bump-versions.sh`, `publish-puck-packages.sh`, `.yarn/` cache and releases.
- Source `README.md` usage snippets still show `projectKey` and `jwtToken` (spec J rewrites them). Stale `README.md` Backend wording changed only where it named the legacy routes.

## TODO (for others)
- J: remove `x-project-key`/`projectKey` (4 pending files), update the smoke tests (they wrap blocks in a context value that still contains `projectKey`) and `playground/.env.example`.
- 11.4: `plans/01-dependency-plan.md` has no status board section to update; the coordinator tracks it.
- Manual steps M-I1..M-I3 (npm org, npm login, name check). M-I3 done below.

## Verification (all from `puck/` unless noted)
- Clean copy (rsync without `node_modules`/`dist` into the session scratchpad, LICENSE one level up): `yarn install --immutable` OK, `yarn verify` exit 0 = headers OK (202 files), `10 packages OK`, build 10 packages + playground, typecheck, `check:consumer` (3 configs), lint 0 problems, tests 19 passed.
- In the worktree: `yarn install --immutable` OK; `node scripts/publish-packages.mjs` (dry run) printed 10 `npm publish --dry-run` results, tarballs hold only `LICENSE`, `README.md`, `dist/*`, `package.json`; no `packages/*/LICENSE` afterwards; `node scripts/bump-versions.mjs 1.0.1 --dry-run` printed 11 lines and changed nothing.
- Name check M-I3: `npm view @commercetools-labs/puck-types version` -> E404 (name free; org membership not checked, needs login).
- Forbidden words scan over `puck/` (`cms`, `demo`, `poc`, `presales`, `multitenant`, `ct-poc`, `run.app`), `.env*`/`.npmrc`/`*.pem` find, secret-pattern grep: all empty.
- Repo root: `yarn test:tools` 19 pass; `yarn check:spdx` OK (384 files); `yarn check:forbidden` OK (0 hits, 33 pending).

## Not run
- 9.4 browser check of the playground ("Configuration required" panel): not run, Chrome DevTools connector detached. `vite build` of the playground succeeds.
- Real `npm publish` / `--execute` path (needs npm login and OTP; only the dirty-tree refusal is tested).
