# Explore note: i-puck-workspace-migration

Working note (not an OpenSpec artifact). Source read-only: `/Users/behnam/code/cms/puck`. All numbers below were
measured on 2026-10-08. A baseline copy (without `node_modules`, `.env`) was installed/built in the scratchpad.

## 1. Inventory of `/Users/behnam/code/cms/puck`

Root files: `package.json`, `.yarnrc.yml`, `.gitignore`, `.prettierrc`, `tsconfig.json`, `yarn.lock` (286 KB, lockfile v8,
793 entries, 63 lines mention `commercetools-demo`), `README.md` (10.4 KB), `bump-versions.sh`, `publish-puck-packages.sh`,
`docs/api-contracts.json` (20 KB, 13 entries), `scripts/translate-messages.mjs`, `scripts/i18n-glossary.json`,
`puck-react-test/` (playground), `packages/*`. Not tracked / must not be copied: `node_modules/`, `.yarn/cache`,
`.yarn/install-state.gz`, `dist/`, `puck-react-test/.env` (git-ignored by the parent repo, contains real endpoints/keys).
There is **no** `.eslintrc*`/`eslint.config.*`, **no** test file (`*.test.*`/`*.spec.*`) and **no** `.yarn/releases/` (Yarn comes from
corepack via `"packageManager": "yarn@4.5.1"`).

Root `package.json` (`@commercetools-demo/puck-workspace`, private): `workspaces: ["packages/*", "puck-react-test"]`;
scripts `build` = `yarn workspaces foreach --all --topological-dev run build`, `build:watch`, `typecheck`
(`foreach --all run typecheck`), `start:test` (`yarn workspace puck-react-test dev`), `lint` = `eslint "packages/*/src/**/*.{ts,tsx}"`;
`resolutions` pin `@types/react(-dom)` to `^19`; devDeps eslint ^8.57.1, @typescript-eslint/* ^8.18, prettier ^3.4.2, typescript ^5.7.2.
`.yarnrc.yml`: `compressionLevel: mixed`, `enableGlobalCache: false`, `nodeLinker: node-modules`.
`tsconfig.json` (root): ES2020, ESNext modules, `moduleResolution: Bundler`, `jsx: react-jsx`, strict, `noUnused*`, declaration+maps.
`.prettierrc`: semi, singleQuote, trailingComma es5, printWidth 80.

### Packages (10) — all version 0.8.x, scope `@commercetools-demo`, `publishConfig.access: public`, build = `tsup` (cjs+esm+dts, `clean`, sourcemap), `typecheck` = `tsc --noEmit`

| Package | Ver | src files / LOC | Internal deps (`workspace:^`) | Other runtime deps | Peer deps |
| --- | --- | --- | --- | --- | --- |
| puck-types | 0.8.1 | 8 / 397 | - | @measured/puck ^0.18.2 | - |
| puck-api | 0.8.1 | 24 / 2038 | types | - | react >=19 |
| puck-components | 0.8.3 | 46 / 2443 | api, types | @measured/puck, isomorphic-dompurify ^3.18 | react, react-dom, react-intl >=6 |
| puck-version-history | 0.8.1 | 14 / 772 | types | @measured/puck | nimbus ^3.2, nimbus-icons ^3.2, react, react-dom, react-intl |
| puck-image-picker | 0.8.1 | 12 / 1080 | **none (standalone; duplicates its own media API)** | - | chakra ^3.36, nimbus, nimbus-icons, react, react-dom, react-intl |
| puck-theme-manager | 0.8.1 | 12 / 2064 | api, types | - | chakra, nimbus, react*, react-intl, react-router-dom >=5 <6 |
| puck-editor | 0.8.3 | 60 / 4785 | api, components, types, version-history | @measured/puck, isomorphic-dompurify | chakra, nimbus, nimbus-icons, react*, react-intl |
| puck-renderer | 0.8.3 | 4 / 425 | api, components, types | @measured/puck | react*, react-intl |
| puck-page-manager | 0.8.1 | 7 / 817 | api, editor, renderer, types, version-history | @measured/puck | chakra, nimbus, nimbus-icons, react*, react-intl, react-router-dom >=5 <6 |
| puck-content-manager | 0.8.1 | 9 / 1921 | api, editor, renderer, types, version-history | @measured/puck | same as page-manager |

Total ~16.7k LOC TS/TSX. Topological build order (as in the scripts): types, api, components, theme-manager, content-manager (script order is
not topological but `foreach --topological-dev` is), image-picker, editor, page-manager, renderer, version-history. Real order:
types -> api -> {version-history, components, theme-manager, image-picker} -> editor -> renderer -> {page-manager, content-manager}.

Build tooling facts:
* 9 of 10 `tsup.config.ts` are byte-identical except the `external` list; `puck-editor`/`puck-components` keep `isomorphic-dompurify` external on purpose
  (it conditionally `require()`s jsdom for SSR). Internal package names appear in `external` lists -> **must be renamed** (not just `package.json`).
* Each `tsconfig.json` extends `../../tsconfig.json`, overrides `noEmit: false`, relaxes `noUnused*` (root keeps them strict for the playground).
* `exports["."]` maps `types` to `./dist/index.d.ts` for both `import` and `require`, but tsup also emits `index.d.mts`. ESM consumers get a CJS-flavoured
  type file (the "masquerading as CJS" class of problem). Fix in this spec with nested conditions.
* `files: ["dist","package.json"]` (+`README.md` only in puck-components). No `LICENSE`, no per-package README except puck-components, **no**
  `repository`/`bugs`/`homepage`/`license`/`keywords`/`engines`.
* `puck-editor` and `puck-content-manager` `import '@measured/puck/puck.css'` (side-effect) -> dist keeps a `require/import` of the CSS. **Do not add
  `"sideEffects": false`.**
* Typing inconsistency: devDeps `@types/react` is `^18` in 5 packages and `^19` in 5; the root `resolutions` forces `^19`. `react-router-dom`
  `resolutions` blocks sit in 3 package.json files (Yarn only honours root `resolutions`, so they are dead there).
* Declared-vs-used imports (script run on `src/`): `puck-components` declares `puck-types` but never imports it; `puck-editor` declares
  `isomorphic-dompurify` but never imports it (comment says it stays external). Everything else is consistent. README tells hosts to install
  `@commercetools/nimbus-tokens`, `@emotion/react`, `slate*` but no package imports them (they are Nimbus' own peers).
* Only `en` and `es` intl catalogs exist (`packages/*/src/intl/{en,es}.json`; `puck-editor` has an empty `src/intl/`). The master plan says "en, de":
  inconsistency, see questions.md Q-I1.

### Playground `puck-react-test/` (to become `puck/playground/`)
Files: `index.html` (title "Puck CMS Test App"), `package.json` (`puck-react-test` 0.1.0, private, `link:../packages/*` deps for 6 puck packages,
Vite ^6.4.3, Tailwind ^4, react ^19), `vite.config.ts` (16 hits of the scope: alias map to `../packages/*/src/index.ts` + `optimizeDeps.exclude`, port 5174),
`tsconfig.json`, `src/App.tsx` (367 lines), `src/main.tsx`, `src/index.css`, `.env.example`, untracked `.env`. Build script `tsc && vite build` is the
playground's only type check (it has no `typecheck` script, so `yarn typecheck` skips it). `App.tsx` uses `VITE_BASE_URL`, `VITE_PROJECT_KEY`,
`VITE_BUSINESS_UNIT_KEY`, `VITE_JWT_TOKEN`, `VITE_LOCALE` (rewritten by spec J).

## 2. Scripts to replace

* `bump-versions.sh` (bash, 99 lines): hard-coded list of 10 package dirs, bump patch/minor/major or explicit version per package
  (independent versions), writes `package.json` via inline `node -e`; interactive prompt, `--yes`. Does **not** touch internal dependency ranges
  (they are `workspace:^`), emoji output.
* `publish-puck-packages.sh` (bash, 118 lines): `npm whoami` gate (needs a stored login), git-clean check whose `exit 1` is commented out, `yarn build`,
  then per package `yarn pack --filename <tmp>.tgz` + `npm publish <tgz>` (no `--access`, no `--provenance`, no tag). `yarn pack` rewrites `workspace:^`
  to `^<version>` (verified: puck-renderer tarball contains `"@commercetools-demo/puck-api": "^0.8.1"`). The pack-then-publish pattern is
  **kept**; `npm whoami` is kept as a guard, the commented-out clean-tree check becomes mandatory (replaced by guarded local publish, see design.md D-6).
* `scripts/translate-messages.mjs` (+ glossary): dev tool using Google Translate; needs only the SPDX header and wording scan; no secrets inside
  (reads optional `GOOGLE_TRANSLATE_API_KEY` from env).
* `docs/api-contracts.json`: documents 13 FE->backend calls. Stale: `file` paths start with `puck/packages/...` and `service/src/routes/...:<line>`;
  header says `@puck/ packages`; entry `resolveDatasourceApi` is marked `compatible: false` with a bug that is already fixed in code
  (`useDatasource.ts` now sends `{ params }`); two entries mention `projectKey` (lines 425, 453). Spec J rewrites the signatures; spec I fixes
  paths/wording and the datasource entry.

## 3. Baseline measurements (scratchpad copy, Node 22.21.1, corepack Yarn 4.5.1)

| Command | Result |
| --- | --- |
| `corepack yarn install --immutable` | OK, 655 packages, 24 `YN0002` peer-dependency warnings (workspace packages that "don't provide react...") |
| `corepack yarn build` | OK in ~23 s (10 packages + playground `tsc && vite build`; 2.3 MB playground chunk warning only) |
| `corepack yarn typecheck` | OK in ~12 s |
| `corepack yarn lint` | **FAILS** - "ESLint couldn't find a configuration file" (no config exists) |
| Probe: ESLint 9 flat config + `typescript-eslint` recommended + `react-hooks` | 43 findings: 15 `no-explicit-any`, 10 `react-hooks/rules-of-hooks`, 6 `exhaustive-deps`, 6 `no-unused-vars`, 6 unused `eslint-disable` directives |

Lint findings are real work for this spec (see tasks group 6). The 10 `rules-of-hooks` hits are Puck `render` functions named
`renderXxx` that call hooks (`useDatasource`, `useState`, `useIntl`, `useEffect`): in Puck they run as components so it works at runtime, but the lint rule
cannot know. Fix by converting them to PascalCase function components (`ProductBannerRender`) and assigning `render: ProductBannerRender`.
Files: `packages/puck-components/src/components/ProductTeaser.tsx:55`, `.../cms/{CountdownBanner:31,CrossSellBlock:25,FAQAccordion:21,NewsletterSignup:15,ProductBanner:31,ProductSlider:25,RelatedProductsSlider:25,WebsiteLogo:14}.tsx`.
`any` hits: `components/cms/shared.ts` (25,30,35,40,45,66), `CrossSellBlock` (48,53), `ProductBanner` (36), `ProductSlider` (56,57,62), `RelatedProductsSlider` (55,60), `puck-theme-manager/src/components/theme-editor.tsx:416`.
`no-unused-vars`: `puck-editor/src/PuckEditor.tsx:62`, `puck-editor/src/fields/ImagePickerField.tsx:13`, `theme-editor.tsx:166,174,180,186,193`.
Unused `eslint-disable no-console` in the 6 `EnsureIntlProvider.tsx` files (lines 68-79). No `@ts-ignore`, no `console.log`, no TODO comments in `src/`.

`yarn pack --dry-run` on puck-renderer lists only `dist/*` (+ `package.json`): no LICENSE/README unless present in the package dir.

## 4. "demo" / "cms" wording and identifiers in the puck tree

Command used: `grep -rniIE "\bdemo\b|demo[- ]|\bcms\b|cms/|/cms|\bpoc\b|pre-?sales|multitenant|ct-poc|run\.app|contenttools"` (excluding the scope itself).
* Scope `@commercetools-demo/` appears in every package.json (name + internal deps), every `tsup.config.ts` external list, ~100 TS import lines
  (e.g. 47 imports of `puck-components`, 35 of `puck-types`, 16 of `puck-api`), `vite.config.ts` (16), `README.md` (21), `puck-components/README.md` (3), playground `App.tsx` (4).
* Word "CMS": package descriptions (`puck-types`, `puck-api`, `puck-editor`, `puck-page-manager`, `puck-theme-manager`: "...for the Puck CMS integration"), `README.md` title
  "Puck CMS packages", `puck-components/README.md:3`, `index.html` title, `puck-editor/src/components/index.ts:29` ("from /service/src/samples/CMS"), code comments in
  `puck-editor/src/index.ts:45`, `config/defaultPuckConfig.ts:70`, `components/cms/shared.ts:1`, `puck-components/src/components/index.ts:14`, `components/cms/shared.ts:1`, `fields/RichTextField.tsx:21`.
* **Directories named `cms`**: `packages/puck-components/src/components/cms/` (27 files) and `packages/puck-editor/src/components/cms/` (28 files), imported as `./cms/...`
  / `./components/cms` (e.g. `puck-components/src/index.ts:33-34`, `components/ProductTeaser.tsx:6`, `puck-editor/src/index.ts:46`, `puck-editor/src/components/ProductTeaser.tsx:6`).
  The master plan forbids "cms" in identifiers/paths -> rename to `blocks/` (design D-4). Spec C only covers service/mcp/legacy; this spec owns the puck rename.
* The word "demo" (standalone) does not occur in `src/`; the only "demo" is the **scope**. Playground: "test app" wording is fine but title must lose "CMS".
* External hosts in sources: `http://localhost:8080`, `http://localhost:5174`, `https://your-service.example.com`, `https://placehold.co` (playground banner image). No internal hosts.

## 5. Facts needed by the release design

* `yarn pack` handles `workspace:^` rewriting; `npm publish <tarball>` talks to the registry. Owner decision: no CI, so releases are local: the developer is logged in (`npm login`, 2FA OTP is requested by npm on publish). Provenance/trusted publishing are therefore out of scope.
* Labs publish rules (`commercetools-labs-publish`): every `package.json` named `@commercetools-labs/...` (including private workspace root/playground), `repository/bugs/homepage` GitHub URLs at the `commercetools` org (ossify repoints them
  but we set them ourselves so they are correct before R), `.npmrc` and `.env` are forbidden files, SPDX header on `.ts .tsx .js .jsx .mjs .cjs`, the gate's clean-clone proof runs `npm ci && npm run typecheck && npm test && npm run build` at the **repo root**
  (root hub package.json is spec A/O; `puck/` itself is Yarn).

## 6. Risks

1. Lint cleanup touches 20+ files in component render code; behaviour must not change (no tests exist) -> add smoke tests for the 10 converted blocks (spec J adds the test stack; this spec adds the minimal vitest setup so the conversion can be verified).
2. Renaming `components/cms` -> `components/blocks` changes deep import paths only inside the packages (nothing is exported by path; `exports` has only `"."`). Verified: no package.json `exports` subpath references `cms`.
3. Regenerating `yarn.lock` after rename: workspace entries change, third-party resolutions must not drift. Use `yarn install` once (not `--mode update-lockfile` with new ranges) and diff.
4. Publishing is local and OTP-gated; the script cannot be fully tested without a registry login (dry run + `npm pack` checks cover the rest).
5. `exports` change (nested `types`) must be validated with `@arethetypeswrong/cli` or a tsc-based consumer fixture (task 4.4).
