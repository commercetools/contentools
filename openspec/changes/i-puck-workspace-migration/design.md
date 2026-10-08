## Context

`/Users/behnam/code/cms/puck` is a Yarn 4.5.1 workspace of 10 tsup-built React libraries plus a Vite playground (see `explore.md`). It builds and typechecks
today but has no lint config, no tests, bash release scripts and the `@commercetools-demo` scope. The target is `puck/` inside the Contentools repo
(`/Users/behnam/code/commercetools-labs/contentools/puck`), published as `@commercetools-labs/puck-*`, consumed from the npm registry by `admin-app`
and by external storefronts. Single-tenant API changes (no `projectKey`) are spec J, which depends on this spec.

## Goals / Non-Goals

Goals: faithful move, new identity, publishable metadata, reproducible install, green build/typecheck/lint/test, guarded local release scripts, no forbidden words/paths.
Non-goals: changing any public prop or hook signature (J), rewriting README usage text (J for connection props, P for final docs), any CI/workflow (none exists by owner decision), publishing to npm (R / manual), Nimbus/Puck version upgrades, i18n catalog changes.

## Target layout (produced by this spec)

```
puck/
├── package.json              # @commercetools-labs/puck-workspace (private), workspaces [packages/*, playground]
├── .yarnrc.yml               # nodeLinker: node-modules, enableGlobalCache: false (unchanged)
├── .gitignore  .prettierrc   # carried over (+ .env, coverage)
├── tsconfig.json             # carried over
├── eslint.config.mjs         # NEW (ESLint 9 flat)
├── vitest.config.ts          # NEW
├── yarn.lock                 # regenerated
├── README.md                 # renamed/worded; usage rewritten by J, finalised by P
├── docs/api-contracts.json   # paths + wording refreshed
├── scripts/
│   ├── bump-versions.mjs         # NEW (replaces bump-versions.sh)
│   ├── publish-packages.mjs      # NEW (replaces publish-puck-packages.sh)
│   ├── verify-metadata.mjs       # NEW (names, versions, repo fields, files, exports, workspace: ranges, undeclared imports)
│   ├── check-headers.mjs         # NEW (SPDX header check/fix)
│   ├── fixtures/consumer/        # NEW (ESM + CJS type-resolution fixture)
│   ├── translate-messages.mjs    # carried (header + path wording)
│   └── i18n-glossary.json        # carried
├── packages/puck-{types,api,components,version-history,image-picker,theme-manager,editor,renderer,page-manager,content-manager}/
│   ├── package.json  tsup.config.ts  tsconfig.json  README.md  src/  (src/components/blocks/ replaces src/components/cms/)
└── playground/               # was puck-react-test
```

## Decisions

### D-0 SPDX edge case
`ossify` refuses to add a header to a file that contains the word `copyright` in its first 2000 characters. In this tree that is `FooterBlock.tsx` in `puck-components` and `puck-editor` (a footer copyright line). Those two files get the SPDX block by hand (tasks 6.2b); `check-headers.mjs` still verifies them.

### D-1 Copy, do not move history
Sources are copied with `rsync -a --exclude node_modules --exclude dist --exclude .yarn --exclude .env --exclude '*.log' --exclude .DS_Store`. No git history is carried (spec R makes a single commit). `.yarn/cache` and `install-state.gz` are never copied; Yarn itself comes from corepack, so no `.yarn/releases/*.cjs` and no `yarnPath`.

### D-2 Rename mechanically, then verify with greps
One scripted replacement (`sed -i '' 's#@commercetools-demo/#@commercetools-labs/#g'` over `*.ts *.tsx *.json *.md *.mjs *.html`), followed by explicit greps in the tasks as the verification. `puck-react-test` -> `playground` in paths and the root `workspaces`. Rejected: a codemod library (overkill for a literal-string replace).

### D-3 Lockstep version `1.0.0`
The old bash bumper bumped packages independently (0.8.1 / 0.8.3 mixed). With `workspace:^` ranges, independent versions give consumers confusing combinations. All packages move together (`bump-versions.mjs <patch|minor|major|x.y.z[-pre]>`), first release `1.0.0` (Q-05), pre-releases `1.0.0-rc.N` published under the `next` dist-tag. Rejected: changesets/lerna (extra tooling, no benefit for one lockstep set).

### D-4 `components/cms` -> `components/blocks`
Two directories named `cms` (27 and 28 files) violate the "no cms" rule (a path counts). `blocks` matches what they are (page building blocks); `git mv` keeps blame in the scratch history and the rename is internal: `exports` only exposes `"."`, so no public deep import breaks. Export names such as `HeroBanner` are unchanged. Comments saying "CMS components" become "Content blocks". Rejected: flattening into `components/` (name collisions with existing `Hero.tsx`, `Grid.tsx`).

### D-5 Publish surface
```jsonc
"exports": { ".": {
  "import":  { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
  "require": { "types": "./dist/index.d.ts",  "default": "./dist/index.js"  } } },
"main": "dist/index.js", "module": "dist/index.mjs", "types": "dist/index.d.ts",
"files": ["dist", "README.md"],   // LICENSE is injected at pack time (see D-6); npm/Yarn always include it
"license": "MIT", "engines": { "node": ">=22" },
"publishConfig": { "access": "public" },
"repository": { "type": "git", "url": "git+https://github.com/commercetools/contentools.git", "directory": "puck/packages/<name>" },
"bugs": { "url": "https://github.com/commercetools/contentools/issues" },
"homepage": "https://github.com/commercetools/contentools/tree/main/puck/packages/<name>#readme"
```
`tsup` already emits `.d.mts` (verified in `dist/`). No `sideEffects: false` (the editor/content-manager dists import `@measured/puck/puck.css` for its side effect). `engines.node >=22` on the root only would not reach consumers, so it is on each package; peer ranges for React stay `>=19`.
**No `LICENSE` is committed inside any package folder**: the labs `ossify` tool skips every directory that carries its own LICENSE (it would not write SPDX headers there) and the gate FAILs such directories. npm/Yarn only ship a LICENSE that sits in the package dir, so `publish-packages.mjs` copies the root `LICENSE` into each package dir right before `yarn pack` and deletes it in a `finally` block; `packages/*/LICENSE` is git-ignored as a second safety net. Each package gets a short README (banner "unsupported", install, one import example, link to root docs). Spec P enriches READMEs.

### D-6 Local release scripts (no CI)
Owner decision: Contentools is a Connect application; there are no GitHub Actions and no trusted publishing. Releasing the puck packages is a local, documented, guarded script run by a maintainer who is logged in to npm (2FA OTP is requested by npm itself). Constraints that shape it:
1. `npm publish` from a workspace folder does **not** rewrite `workspace:^`. Therefore `yarn pack --filename <tmp>.tgz` first (verified to rewrite) and `npm publish <tmp>.tgz --access public`.
2. Re-runs must be safe: `npm view <name>@<version> version` non-empty -> skip.
3. A mistaken publish is permanent (72 h unpublish window at best), so the default is a dry run and `--execute` needs four guards.

`publish-packages.mjs` behaviour (pure Node ESM, no deps):
* package order from a topological sort of internal `dependencies` (not a hand list; the old script listed `puck-content-manager` before `puck-editor`/`puck-renderer`), printed before anything runs and asserted by a unit test; `bump-versions.mjs` prints in the same order;
* before each `yarn pack`: `copyFileSync(<repo root>/LICENSE, <pkg>/LICENSE)`, after pack (always, in `finally`): `rmSync(<pkg>/LICENSE)`; abort if the root LICENSE is missing;
* default: `npm publish <tgz> --dry-run --access public` for each package; prints the tarball file list;
* `--execute`: requires (a) clean `git status --porcelain`, (b) `npm whoami` exit 0, (c) all 10 versions equal (lockstep), (d) `dist/` present for every package, then asks the user to type `publish <version>`; only then runs real `npm publish` (npm prompts for the OTP itself; the script passes stdio through and never sees it);
* dist-tag: prerelease id (`1.0.0-rc.0`) -> `--tag next` (any prerelease), stable -> `latest`;
* never reads `.npmrc`, never prints the environment; exit 1 if any package failed, listing them at the end; continues with the remaining packages only for "already published" skips, stops at the first real failure (a half-published set is easier to reason about when ordered).
Root script aliases: `yarn release:bump <arg>` and `yarn release:publish [--execute]`. Spec O documents the maintainer runbook; spec R/Q use `--tag next` for the rc.
Rejected: keeping bash (portability, untestable), `changesets publish` (calls `npm publish` per workspace without Yarn pack, breaks `workspace:^`), CI trusted publishing (owner decision), provenance (needs CI OIDC).

### D-7 ESLint 9 flat config (verified in a scratch install)
Devs: `eslint@^9`, `@eslint/js@^9`, `typescript-eslint@^8`, `eslint-plugin-react-hooks@^5`, `globals@^15` replace `eslint@^8`, `@typescript-eslint/eslint-plugin|parser` in the root. Config: `js.configs.recommended` + `tseslint.configs.recommended` + react-hooks recommended rules; `no-explicit-any: error`, `no-unused-vars` with `^_` ignore, `no-console` allowing `warn`/`error`; ignores `dist`, `node_modules`. Scope of lint: `packages/*/src` and `playground/src` and `scripts`. The probe produced 43 findings; fixing them (not disabling rules) is part of the work. `react-hooks/rules-of-hooks` findings are fixed by converting `renderXxx` arrow functions that call hooks into PascalCase components.

### D-8 Test baseline
`vitest@^3`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `jsdom@^26`, `react`/`react-dom` already present. One root `puck/vitest.config.ts` (`environment: 'jsdom'`, `include: ['packages/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs']`, `setupFiles: ['./vitest.setup.ts']`). This spec adds only smoke tests (render each converted block, metadata script, publish-script dry run). Spec J adds the connection-contract tests. msw is not required by this spec.

### D-9 Normalisation decisions
* `@types/react` / `@types/react-dom` devDependency -> `^19` everywhere; remove the per-package dead `resolutions` blocks (Yarn only honours the root's).
* Remove unused declarations: `puck-components` -> `@commercetools-labs/puck-types`; `puck-editor` -> `isomorphic-dompurify` (and its `external` entry + comment). Verified by build + typecheck + a grep for the import. If `yarn build` fails after removal, revert that single removal and record it in design.md.
* `@measured/puck` stays a regular dependency (7 packages) to keep the version consistent for consumers; documenting a duplicate-Puck risk is deferred to P. No upgrade.
* `puck-image-picker` stays standalone (no internal deps); spec J decides how it shares the connection contract.

### D-10 Lockfile strategy
Regenerate once with `corepack yarn install` after all edits (workspace entries change; third-party resolutions must stay identical). Review with `git diff --stat puck/yarn.lock` in the scratch repo: expected changes are only the `@commercetools-demo/*` -> `@commercetools-labs/*` workspace entries, the playground rename and the added dev tools (ESLint 9, vitest, testing-library, jsdom). `yarn verify` and the local gate use `yarn install --immutable`. The lockfile is committed; `.yarn/cache` is not.

### D-11 Stale docs
`puck/docs/api-contracts.json`: fix every `file` that starts `puck/packages/` (-> unchanged, path is right after the move) but replace the header "@puck/ packages" with "@commercetools-labs/puck-* packages", replace the `resolveDatasourceApi` bug entry (`compatible: true`, drop `incompatibilityNote`), and leave the two `projectKey` mentions for J. Backend paths `service/src/routes/*.ts:<line>` are re-pointed by spec F when routes move; this spec only checks `puck/` paths exist.

## Risks / Trade-offs

* [Lint fixes alter runtime behaviour] -> converting `renderXxx` to components keeps the same JSX; add smoke tests before and after; do the conversion one file at a time.
* [Lockfile drift] -> single regeneration, diff review, `--immutable` in `yarn verify`.
* [Publishing is manual and OTP-gated] -> documented in manual.md; the script's dry run and tarball listing catch everything except registry-side configuration.
* [Playground aliases to sources, so playground success does not prove the dist artifacts work] -> consumer fixture (ESM+CJS tsc check) and `yarn pack` dry-run in verification.
* [`.d.mts` conditions differ per TS `moduleResolution`] -> fixture covers `Bundler` and `NodeNext`.

## Migration Plan

1. Copy and rename (group 1-2); 2. metadata and exports (3-4); 3. toolchain (5); 4. lint/test fixes (6-7); 5. scripts (8); 6. playground and docs (9-10); 7. lockfile and final verification (11). Rollback: delete `puck/` (nothing else in the repo depends on it until J/K start).

## Open Questions

See `questions.md` (Q-I1 locales, Q-I2 Yarn version, Q-I3 first-release tag).
