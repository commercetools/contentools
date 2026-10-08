## 0. Conventions and pre-conditions (read first)

Vocabulary: **Puck** (`@measured/puck`) is the open-source React page-builder library the packages wrap. **Workspace** = a Yarn 4 monorepo where several `package.json`
projects live in one folder tree and link to each other. **tsup** = the bundler that turns `src/index.ts` of each package into `dist/` (CJS + ESM + `.d.ts`).
**corepack** = the Node tool that downloads the exact Yarn version named in `packageManager`. **SPDX header** = the 5-line license comment at the top of every source file.
**Scope** = the `@name/` prefix of an npm package.

Shorthand used below: `$SRC=/Users/behnam/code/cms/puck` (read-only, never edit it), `$REPO=/Users/behnam/code/commercetools-labs/contentools`, `$PUCK=$REPO/puck`.
All commands are run from `$PUCK` unless stated. Always call Yarn as `corepack yarn ...` until `corepack enable` has been run once (`yarn --version` must print `4.5.1` inside `$PUCK`; the global Yarn 1.22 is wrong).

Pre-conditions:
* Spec A is done: `$REPO` has the skeleton, root `.nvmrc` (Node 22), `LICENSE` (MIT) and `.gitignore`. If `$REPO/LICENSE` does not exist yet, copy the MIT text from spec A's output (do not invent one).
* Spec C is done or at least merged for the service side; this spec does not need the service.
* Tools: Node 22.x (`node -v`), corepack (`corepack --version` -> 0.3x), `rsync`, `python3`, network access to the npm registry for `yarn install`.
* No npm login is needed except task 8.6 (optional real publish dry-check) and the manual release steps.

Rules for every task: do not edit `$SRC`; do not add `any`; do not comment code out; after each group run the "Verification" block of that group and tick boxes only when the "Done when" line is true.

## 1. Copy the tree into `puck/`

Context: we copy only the sources. Local artefacts (`node_modules`, `dist`, `.env` with real endpoints, Yarn cache) must never reach the new repo (the publish gate fails on `.env`).

- [ ] 1.1 Create the folder and copy.
  ```bash
  mkdir -p $REPO/puck
  rsync -a \
    --exclude node_modules --exclude dist --exclude .yarn --exclude '.env' --exclude '*.log' --exclude .DS_Store \
    --exclude bump-versions.sh --exclude publish-puck-packages.sh \
    /Users/behnam/code/cms/puck/ $REPO/puck/
  ```
  Done when: `ls -a $PUCK` shows `.gitignore .prettierrc .yarnrc.yml README.md docs package.json packages puck-react-test scripts tsconfig.json yarn.lock` and **no** `node_modules`, `.yarn`, `bump-versions.sh`, `publish-puck-packages.sh`.
- [ ] 1.2 Prove nothing secret came along: `find $PUCK -name '.env*' -not -name '.env.example'` -> empty; `grep -rIlE "(token|secret|password)\s*[:=]\s*['\"][^'\"]{8,}" $PUCK --exclude=yarn.lock --exclude-dir=node_modules` -> empty (if a hit is a harmless placeholder like `your-jwt-token-here`, note it; spec J removes it).
  Done when: both commands print nothing (or only the documented placeholder in `puck-react-test/.env.example`).
- [ ] 1.3 Move the playground: `mv $PUCK/puck-react-test $PUCK/playground`.
  Done when: `ls $PUCK/playground` shows `index.html package.json src tsconfig.json vite.config.ts .env.example`.
- [ ] 1.4 Append to `$PUCK/.gitignore` the lines `.env`, `.env.*`, `!.env.example`, `coverage/`, `*.tgz`, `packages/*/LICENSE`.
  Done when: `git check-ignore -v $PUCK/playground/.env` (after `touch`, then delete the file) reports the rule.

Pitfalls: `rsync` with a trailing slash on the source copies the folder *contents*; without it you get `puck/puck/`. `.yarnrc.yml` and `.prettierrc` are dotfiles - `ls` without `-a` hides them.
Rollback: `rm -rf $REPO/puck`.

## 2. Rename the scope, the playground and the `cms` directories

Context: the old scope `@commercetools-demo` is replaced by `@commercetools-labs` everywhere, the playground changes name, and two source folders called `cms` are renamed `blocks` because the repository rule forbids the string "cms" in any path or identifier.

- [ ] 2.1 Replace the scope in all text files (macOS `sed`; on Linux drop the `''`):
  ```bash
  cd $PUCK
  grep -rIl "commercetools-demo" . --exclude-dir=node_modules --exclude-dir=.yarn --exclude=yarn.lock \
    | xargs sed -i '' 's#@commercetools-demo/#@commercetools-labs/#g'
  grep -rIn "commercetools-demo" . --exclude-dir=node_modules --exclude-dir=.yarn --exclude=yarn.lock
  ```
  Expected: the last grep prints nothing. Files touched (about 130): 10 `package.json`, 10 `tsup.config.ts`, `playground/{package.json,vite.config.ts,src/App.tsx}`, `README.md`, `packages/puck-components/README.md`, ~100 `src/**/*.ts(x)` import lines. `yarn.lock` is regenerated in group 11, not edited.
  Done when: grep above is empty.
- [ ] 2.2 Rename the root workspace and playground references. Edit `$PUCK/package.json`: `"name": "@commercetools-labs/puck-workspace"`, `"workspaces": ["packages/*", "playground"]`, script `"start:playground": "yarn workspace @commercetools-labs/puck-playground dev"` (replace `start:test`). Edit `$PUCK/playground/package.json`: `"name": "@commercetools-labs/puck-playground"`, `"version": "1.0.0"`.
  Done when: `grep -rn "puck-react-test" $PUCK --exclude-dir=node_modules --exclude=yarn.lock` shows only `README.md` lines (fixed in task 10.1).
- [ ] 2.3 Rename the two `cms` directories with plain `mv` (no git needed in the scratch tree):
  ```bash
  mv packages/puck-components/src/components/cms packages/puck-components/src/components/blocks
  mv packages/puck-editor/src/components/cms     packages/puck-editor/src/components/blocks
  grep -rIln "/cms\b\|/cms'" packages/*/src
  ```
  Then fix the import specifiers in exactly these places (and any other file the grep prints): `packages/puck-components/src/index.ts:33-34` (`./components/cms/shared` -> `./components/blocks/shared`), `packages/puck-components/src/components/index.ts:15-40` (27 `export * from './cms/X'` lines -> `'./blocks/X'`), `packages/puck-components/src/components/ProductTeaser.tsx:6` (`./cms/shared` -> `./blocks/shared`), `packages/puck-editor/src/index.ts:46` (`./components/cms` -> `./components/blocks`), `packages/puck-editor/src/components/index.ts:30`, `packages/puck-editor/src/components/ProductTeaser.tsx:6`, plus the `blocks/index.ts` inside the editor folder if it uses relative `./cms`.
  Use: `grep -rIl "'\./cms/\|'\./components/cms\|components/cms/" packages/*/src | xargs sed -i '' -E "s#(\./)?(components/)?cms/#\1\2blocks/#g"` only after reading the grep output; review `git diff`-style by eye (the scratch tree is not a repo: use `diff -r $SRC/packages $PUCK/packages | head -200`).
  Done when: `find $PUCK -ipath '*cms*' -not -path '*/node_modules/*'` prints nothing and `corepack yarn typecheck` still passes (needs group 11's install first; if not installed yet, defer this check to the end of group 5).
- [ ] 2.4 Reword the comments and descriptions that contain "CMS" (list from `explore.md` section 4). Replacements: `// CMS components` -> `// Content blocks` (`puck-editor/src/index.ts:45`, `puck-editor/src/config/defaultPuckConfig.ts:70`, `puck-components/src/components/index.ts:14`); `puck-editor/src/components/index.ts:29` "CMS components (from /service/src/samples/CMS)" -> "Content blocks"; `components/blocks/shared.ts:1` in both packages: "Shared RENDER helpers used across content blocks (Nimbus-free)." / "Editor-side shared helpers for content blocks."; `puck-editor/src/fields/RichTextField.tsx:21` "the cms/* blocks" -> "the content blocks"; `puck-components/README.md:3` "for the Puck CMS" -> "for Puck page content".
  Done when: `grep -rniIE "\bcms\b" $PUCK --exclude-dir=node_modules --exclude-dir=.yarn --exclude=yarn.lock` shows only `README.md` and `package.json` descriptions (fixed in tasks 3.2 and 10.1).
- [ ] 2.5 Scan for the other forbidden words: `grep -rniIE "\bdemo\b|\bpoc\b|pre-?sales|multitenant|ct-poc|run\.app" $PUCK --exclude-dir=node_modules --exclude-dir=.yarn --exclude=yarn.lock`.
  Done when: no output. (Today there is none outside the scope; if a newer source change added one, reword it, e.g. "demo" -> "example".)

Pitfalls: do not run the scope `sed` over `yarn.lock` (it is regenerated and hand edits break checksums). `sed -i ''` is BSD syntax; on GNU/Linux use `sed -i`. The editor and components packages each have their own `blocks/shared.ts` (two different files) - rename both, do not merge.
Verification: after groups 1-2 the `grep` commands above are the checks; the full build runs in group 5.
Rollback: re-run group 1 into an empty `puck/` (it is a pure copy).

## 3. Package metadata and dependency rewiring

Context: every published package needs the same publishable metadata, accurate dependency declarations, and a `1.0.0` version. Do it by script so the 10 files stay identical in shape, then review by eye.

- [ ] 3.1 Create `$PUCK/scripts/verify-metadata.mjs` (checker; used by the final verification) with this behaviour (write it first so the following tasks can be checked):
  ```js
  /*
   * SPDX-License-Identifier: MIT
   * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
   * Freely available, AS IS and UNSUPPORTED. See LICENSE.
   */
  import { readdirSync, readFileSync, existsSync } from 'node:fs';
  import { join, dirname } from 'node:path';
  import { fileURLToPath } from 'node:url';
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const PKG_DIR = join(root, 'packages');
  const errors = [];
  const pkgs = readdirSync(PKG_DIR).filter((d) => existsSync(join(PKG_DIR, d, 'package.json')));
  const names = new Set();
  for (const d of pkgs) {
    const pj = JSON.parse(readFileSync(join(PKG_DIR, d, 'package.json'), 'utf8'));
    names.add(pj.name);
    const expect = `@commercetools-labs/${d}`;
    if (pj.name !== expect) errors.push(`${d}: name ${pj.name} != ${expect}`);
    if (pj.version !== '1.0.0' && process.argv[2] !== '--any-version') errors.push(`${d}: version ${pj.version}`);
    if (pj.license !== 'MIT') errors.push(`${d}: license`);
    if (pj.repository?.directory !== `puck/packages/${d}`) errors.push(`${d}: repository.directory`);
    if (!pj.bugs?.url || !pj.homepage) errors.push(`${d}: bugs/homepage`);
    if (pj.publishConfig?.access !== 'public') errors.push(`${d}: publishConfig.access`);
    if (JSON.stringify(pj.files) !== JSON.stringify(['dist', 'README.md'])) errors.push(`${d}: files`);
    if (/cms/i.test(pj.description ?? '')) errors.push(`${d}: description mentions cms`);
    if (existsSync(join(PKG_DIR, d, 'LICENSE'))) errors.push(`${d}: LICENSE must not be committed in the package dir (copied at pack time)`);
    if (pj.sideEffects === false) errors.push(`${d}: sideEffects false is forbidden`);
    for (const f of ['README.md']) if (!existsSync(join(PKG_DIR, d, f))) errors.push(`${d}: missing ${f}`);
    for (const [dep, range] of Object.entries(pj.dependencies ?? {}))
      if (dep.startsWith('@commercetools-labs/') && range !== 'workspace:^') errors.push(`${d}: ${dep} must be workspace:^`);
    // undeclared-import check (type imports count as imports)
    // ... walk src/**/*.ts(x), regex /(?:from|import)\s+['"]([^'"./][^'"]*)['"]/g, take the package name
    // (first 2 segments if it starts with '@'), skip node: builtins, error if not in deps/peerDeps/devDeps.
  }
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`${pkgs.length} packages OK`); for (const n of [...names].sort()) console.log(n + '@1.0.0');
  ```
  Complete the `walk src` part (about 15 lines using `readdirSync(..., { recursive: true })`).
  Done when: `node scripts/verify-metadata.mjs` runs and (before tasks 3.2-4.x) prints a list of errors.
- [ ] 3.2 Write `$PUCK/scripts/apply-metadata.mjs` (one-off helper, delete after use in task 3.5) that rewrites every `packages/*/package.json` with these exact rules, then run it: (a) `version` = `1.0.0`; (b) keep `name` (already renamed) and reword `description` so no "CMS" remains: puck-types "TypeScript types for the Puck page content integration", puck-api "API client and React hooks for the Puck page content integration", puck-editor "Puck editor wrapper with built-in components and content API integration", puck-page-manager "Router-aware page manager UI (list, editor, preview) for the Puck page content integration", puck-theme-manager "Theme manager and content type import components for Puck" (the other five have no CMS wording); (c) set `license`, `repository`, `bugs`, `homepage`, `engines`, `publishConfig`, `files`, `keywords` per design.md D-5 (`keywords`: `["commercetools","puck","page-builder","react"]`); (d) remove the per-package `resolutions` block (puck-content-manager, puck-page-manager, puck-theme-manager); (e) devDependencies `@types/react`/`@types/react-dom` -> `^19`; (f) key order: name, version, description, license, repository, bugs, homepage, keywords, main, module, types, exports, files, publishConfig, engines, scripts, dependencies, peerDependencies, devDependencies. Write with `JSON.stringify(obj, null, 2) + '\n'`.
  Done when: `git diff`-style review (`diff -r $SRC/packages $PUCK/packages -x src -x dist | less`) shows only the intended edits, and `grep -il cms packages/*/package.json` prints nothing.
- [ ] 3.3 Remove unused declarations (verified by the script in `explore.md`): delete `"@commercetools-labs/puck-types"` from `packages/puck-components/package.json` dependencies and its entry in `packages/puck-components/tsup.config.ts` `external` is **kept** only if the package still imports it (it does not -> remove the entry too); delete `"isomorphic-dompurify"` from `packages/puck-editor/package.json` and from `packages/puck-editor/tsup.config.ts` (`external` entry and its two-line comment).
  Done when: `grep -rn "isomorphic-dompurify" packages/puck-editor` prints nothing; after group 5 `yarn build` still passes (if it fails, restore only the failing removal and add a line to design.md D-9).
- [ ] 3.4 Normalise peer dependencies: leave ranges as they are (React `>=19`, `react-intl >=6`, `react-router-dom >=5 <6`, nimbus `^3.2.0`). Add `@commercetools/nimbus-icons` to `puck-theme-manager` peers **only if** `grep -rn "nimbus-icons" packages/puck-theme-manager/src` finds an import (today it does not; do nothing otherwise).
  Done when: `node scripts/verify-metadata.mjs` reports no "undeclared" lines for any package.
- [ ] 3.5 Delete `scripts/apply-metadata.mjs`; run `node scripts/verify-metadata.mjs`.
  Done when: it exits 0 except for the `README.md` missing messages (created in group 4).

Pitfalls: `files` must not contain `package.json` (npm always includes it). Do not set `sideEffects`. Do not change `@measured/puck` ranges. Keep `"private": true` out of the 10 packages (they are published) but keep it in root and playground.
Rollback: re-run groups 1-3.

## 4. Published surface: exports, README, consumer fixture

Context: published tarballs must contain only `dist`, `README.md`, `LICENSE` (the latter injected by the release script, never committed per package), and must resolve types for both ESM and CJS consumers.

- [ ] 4.1 In each `packages/*/package.json` replace `exports` with the nested form from design.md D-5 (`import.types` -> `./dist/index.d.mts`, `require.types` -> `./dist/index.d.ts`). Keep `main`, `module`, `types`.
  Done when: `node -e "for (const d of require('fs').readdirSync('packages')) console.log(d, Object.keys(require('./packages/'+d+'/package.json').exports['.']))"` prints `[ 'import', 'require' ]` for all 10.
- [ ] 4.2 Do **not** put a `LICENSE` in the package folders (ossify skips directories with their own LICENSE and the publish gate fails them). Add `packages/*/LICENSE` to `$PUCK/.gitignore` (so a leftover copy can never be committed) and make sure `$REPO/LICENSE` exists; the release script (task 8.3) copies it in at pack time and removes it afterwards.
  Done when: `ls packages/*/LICENSE 2>/dev/null | wc -l` prints 0 and `grep -n 'packages/\*/LICENSE' .gitignore` finds the rule.
- [ ] 4.3 Create `packages/<name>/README.md` for the nine packages that have none (puck-components already has one; add the banner to it). Template (replace `<name>` and the one-line purpose from the package `description`):
  ```md
  > **UNSUPPORTED - commercetools-labs.** Freely available, AS IS and UNSUPPORTED. See [LICENSE](./LICENSE). Not covered by commercetools support.

  # @commercetools-labs/<name>

  <description>

  ```bash
  npm install @commercetools-labs/<name>
  ```

  Part of [Contentools](https://github.com/commercetools/contentools). Usage, peer dependencies and the connection API are documented in the [puck README](https://github.com/commercetools/contentools/blob/main/puck/README.md).
  ```
  Done when: `grep -L "UNSUPPORTED" packages/*/README.md` prints nothing.
- [ ] 4.4 Create the consumer fixture `scripts/fixtures/consumer/`: `package.json` (`"private": true`, `"type": "module"`, name `@commercetools-labs/puck-consumer-fixture`, no dependencies), `tsconfig.esm.json` (`module: NodeNext`, `moduleResolution: NodeNext`, `strict`, `noEmit`, `skipLibCheck: false`, `paths` none), `tsconfig.cjs.json` (`module: CommonJS`, `moduleResolution: Node10`... use `Bundler` for the second run), `esm.ts` and `cjs.cts` each importing one value/type from each of the 10 packages by name (e.g. `import { PuckApiProvider } from '@commercetools-labs/puck-api'`). Because the packages are workspace members, resolution works through `node_modules/@commercetools-labs/*` symlinks created by `yarn install`. Add the fixture to nothing (it is not a workspace); run it with `corepack yarn tsc -p scripts/fixtures/consumer/tsconfig.esm.json` from `$PUCK` after a build.
  Note the fixture must also set `"include": ["esm.ts"]` / `["cjs.cts"]` respectively and `"rootDir": "."`.
  Done when (after group 5): both `tsc` runs exit 0 with no output. If TS reports `TS1479` ("The current file is a CommonJS module...") the nested `types` conditions are wrong: fix 4.1.
- [ ] 4.5 Add `"verify:pack"` to `package.json` scripts: `node scripts/verify-metadata.mjs && node scripts/publish-packages.mjs` (the default dry run packs every package through the real code path, including the temporary LICENSE copy). Run it after a build: each tarball must list only `dist/*`, `README.md`, `LICENSE`, `package.json`.
  Done when: no tarball lists `src/`, `tsup.config.ts`, `tsconfig.json` or `*.test.*`, and `git status --porcelain` afterwards shows no `LICENSE` inside `packages/*`.

Pitfalls: `index.d.mts` exists only after a build (tsup `dts: true`). Do not hand-edit `dist`. A README without the word "unsupported" fails the spec.
Rollback: `git checkout`-equivalent: re-run 3.2 and delete the added files.

## 5. Toolchain: root package.json, ESLint 9, vitest

Context: the source repo has no lint config (`yarn lint` fails with "couldn't find a configuration file") and no tests. We add both with the smallest viable setup (design D-7, D-8).

- [ ] 5.1 Rewrite `$PUCK/package.json` scripts and devDependencies:
  ```json
  {
    "name": "@commercetools-labs/puck-workspace",
    "private": true,
    "license": "MIT",
    "workspaces": ["packages/*", "playground"],
    "packageManager": "yarn@4.5.1",
    "engines": { "node": ">=22" },
    "scripts": {
      "build": "yarn workspaces foreach --all --topological-dev run build",
      "build:watch": "yarn workspaces foreach --all --parallel run build:watch",
      "typecheck": "yarn workspaces foreach --all run typecheck",
      "lint": "eslint \"packages/*/src/**/*.{ts,tsx}\" \"playground/src/**/*.{ts,tsx}\" \"scripts/**/*.mjs\"",
      "test": "vitest run",
      "check:headers": "node scripts/check-headers.mjs",
      "check:metadata": "node scripts/verify-metadata.mjs",
      "verify": "yarn check:headers && yarn check:metadata && yarn build && yarn typecheck && yarn lint && yarn test",
      "start:playground": "yarn workspace @commercetools-labs/puck-playground dev",
      "release:bump": "node scripts/bump-versions.mjs",
      "release:publish": "node scripts/publish-packages.mjs"
    },
    "resolutions": { "@types/react": "^19", "@types/react-dom": "^19" },
    "devDependencies": {
      "@eslint/js": "^9", "eslint": "^9", "eslint-plugin-react-hooks": "^5", "globals": "^15", "typescript-eslint": "^8",
      "@testing-library/jest-dom": "^6", "@testing-library/react": "^16", "@testing-library/user-event": "^14",
      "jsdom": "^26", "vitest": "^3", "prettier": "^3.4.2", "typescript": "^5.7.2"
    }
  }
  ```
  Add `typecheck` to `playground/package.json` (`"typecheck": "tsc --noEmit"`) so `yarn typecheck` covers it. Remove `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`.
  Done when: `corepack yarn install` (first install; not `--immutable`) exits 0.
- [ ] 5.2 Create `$PUCK/eslint.config.mjs` (verified working in a scratch install):
  ```js
  /*
   * SPDX-License-Identifier: MIT
   * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
   * Freely available, AS IS and UNSUPPORTED. See LICENSE.
   */
  import js from '@eslint/js';
  import tseslint from 'typescript-eslint';
  import reactHooks from 'eslint-plugin-react-hooks';
  import globals from 'globals';

  export default tseslint.config(
    { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      plugins: { 'react-hooks': reactHooks },
      languageOptions: { globals: { ...globals.browser, ...globals.node } },
      rules: {
        ...reactHooks.configs.recommended.rules,
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': ['error', { allow: ['warn', 'error'] }],
      },
    },
    { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } }
  );
  ```
  Done when: `corepack yarn lint` runs (it will report the findings fixed in group 7; it must no longer say "couldn't find a configuration file").
- [ ] 5.3 Create `$PUCK/vitest.config.ts` and `$PUCK/vitest.setup.ts` (both with the SPDX header):
  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      include: ['packages/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
      setupFiles: ['./vitest.setup.ts'],
    },
  });
  ```
  `vitest.setup.ts`: `import '@testing-library/jest-dom/vitest';`.
  Add `"vitest.config.ts"`/`"vitest.setup.ts"` to nothing else; `tsconfig.json` root `exclude` stays.
  Done when: `corepack yarn test` prints "No test files found" with exit code 1 (expected until group 7); proceed.
- [ ] 5.4 Build and typecheck: `corepack yarn build && corepack yarn typecheck`.
  Expected: build finishes with 10 packages + `playground` ("built in ..."), typecheck exits 0 (about 35 s total).
  Done when: both exit 0 and `ls packages/*/dist/index.d.mts | wc -l` prints 10. If an import fails because of the `cms` -> `blocks` rename, fix the specifier named in the error.
- [ ] 5.5 Run the consumer fixture from task 4.4 and `corepack yarn verify:pack`.
  Done when: both succeed.

Pitfalls: Yarn 4 prints 24 `YN0002` peer warnings; they are expected (workspace packages declare peers they do not provide) and are not errors. Vitest 3 needs Node >=18; jsdom 26 needs Node >=18. The root `resolutions` keep `@types/react` at 19.
Verification: `corepack yarn build && corepack yarn typecheck` green.
Rollback: restore the previous `package.json` from step 3 and delete `eslint.config.mjs`, `vitest.*`.

## 6. SPDX headers on every source file

Context: the header travels with code that is copy-pasted out of the repo; the gate fails on a missing header. Required text (exact):
```
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
(Copy it exactly from `plans/04-spec-author-brief.md`; the year is 2026.)

- [ ] 6.1 Create `$PUCK/scripts/check-headers.mjs`: walks `packages/*/src`, `playground/src`, `playground/*.ts`, `scripts` for `.ts .tsx .mjs .js .cjs`, skipping `node_modules`, `dist`, `coverage`; a file passes if its first 6 lines contain `SPDX-License-Identifier: MIT`; `--fix` prepends the header + blank line (keeping a leading `#!` shebang line first, and `'use client'` directives are not present in this code base). `--fix` must **skip** (and list as "needs manual header") any file whose first 2000 characters contain the word `copyright` (case-insensitive), mirroring the labs `ossify` tool, so the two footer files are handled by task 6.2b; without `--fix` such a file passes only if it already has the header. Exit 1 and list the offenders when any file fails and `--fix` is absent.
  Done when: `node scripts/check-headers.mjs` lists about 190 files.
- [ ] 6.2 Run `node scripts/check-headers.mjs --fix` (it prints the two `FooterBlock.tsx` files as "needs manual header"), do task 6.2b, then `node scripts/check-headers.mjs` -> exit 0. Also add the header to `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts` and the playground `vite.config.ts` if the script skipped them.
  Done when: the check passes and `git diff`-style spot check (`head -8 packages/puck-api/src/index.ts`) shows the header followed by the original first line.
- [ ] 6.2b Add the SPDX block **by hand** to the two files the tool cannot header because they contain the word "copyright" near the top (`ossify` refuses any file with `copyright` in its first 2000 characters, and `check-headers.mjs --fix` should mirror the safe choice and not touch them silently): `packages/puck-components/src/components/blocks/FooterBlock.tsx` and `packages/puck-editor/src/components/blocks/FooterBlock.tsx`. Paste the 5-line block (exact text above) followed by a blank line at the very top, above the existing first line. Do not remove the footer's own copyright text (it is rendered UI copy, not a license claim); if it names a company or year, reword it to a neutral placeholder such as `\u00A9 {year} Your Company` only if it contains a real third-party name (read the file).
  Done when: `head -7` of both files shows the SPDX block, `node scripts/check-headers.mjs` exits 0, and `grep -c SPDX` on each is 1.
- [ ] 6.3 Re-run `corepack yarn build` (header comments must not break tsup) and `corepack yarn prettier --check "packages/*/src/**/*.{ts,tsx}"` is **not** required (the source is not Prettier-clean today; do not reformat).
  Done when: build exits 0.

Pitfalls: `.json` files cannot carry comments, so they are exempt; the translate script `scripts/translate-messages.mjs` starts with `#!/usr/bin/env node` - the header must come after the shebang. Do not add the header to generated `dist/`.
Rollback: re-copy the touched files from `$SRC` is not possible after renames; instead run a reverse script that strips the first 6 lines when they start with `/*` and contain SPDX.

## 7. Lint and test fixes

Context: with the config in place `yarn lint` reports the findings measured in `explore.md` section 3. We fix the code instead of silencing rules. Do **one file at a time** and re-run the file's lint after each.

- [ ] 7.1 Convert hook-calling `render` functions into components (the `rules-of-hooks` findings). Pattern, shown for `packages/puck-components/src/components/blocks/ProductBanner.tsx`:
  ```tsx
  // before
  export const renderProductBanner: NonNullable<ComponentConfig<ProductBannerProps>['render']> = ({ title, ... }) => { const { data } = useDatasource(...); ... };
  // after
  const ProductBannerRender: React.FC<ProductBannerProps> = ({ title, ... }) => { const { data } = useDatasource(...); ... };
  export const renderProductBanner: NonNullable<ComponentConfig<ProductBannerProps>['render']> = (props) => <ProductBannerRender {...props} />;
  ```
  Keep the exported `renderXxx` name and signature (other files reference it). If the render signature has Puck's extra props (`puck`, `id`, `editMode`), type `ProductBannerRender` with `React.ComponentProps<NonNullable<ComponentConfig<ProductBannerProps>['render']>>`. Files (line = first hook call): `components/ProductTeaser.tsx:55`, `blocks/CountdownBanner.tsx:31`, `blocks/CrossSellBlock.tsx:25`, `blocks/FAQAccordion.tsx:21`, `blocks/NewsletterSignup.tsx:15`, `blocks/ProductBanner.tsx:31`, `blocks/ProductSlider.tsx:25`, `blocks/RelatedProductsSlider.tsx:25`, `blocks/WebsiteLogo.tsx:14` (all under `packages/puck-components/src/components/`), plus the editor-side twins if they report the same rule (re-run lint).
  Done when: `corepack yarn eslint packages/puck-components/src --rule 'react-hooks/rules-of-hooks: error'` prints no errors.
- [ ] 7.2 Remove `any` (15 findings). `blocks/shared.ts` (lines 25, 30, 35, 40, 45, 66) is the root cause: type the product payload once:
  ```ts
  export interface CtLocalizedString { [locale: string]: string }
  export interface CtPriceLike { value?: { centAmount: number; currencyCode: string; fractionDigits?: number }; discounted?: { value: { centAmount: number; currencyCode: string } } }
  export interface CtProductLike { id?: string; slug?: CtLocalizedString; name?: CtLocalizedString; description?: CtLocalizedString; masterVariant?: { sku?: string; images?: { url: string }[]; prices?: CtPriceLike[] } }
  ```
  and replace `any` params/returns with these or with `unknown` + narrowing; then the call sites in `CrossSellBlock.tsx:48,53`, `ProductBanner.tsx:36`, `ProductSlider.tsx:56,57,62`, `RelatedProductsSlider.tsx:55,60` use `as CtProductLike`. `puck-theme-manager/src/components/theme-editor.tsx:416`: replace with the exact type that line handles (read the line; usually `ThemeTokens[keyof ThemeTokens]` or `unknown`).
  Done when: `corepack yarn eslint "packages/*/src/**/*.{ts,tsx}" | grep -c no-explicit-any` prints 0 and `yarn typecheck` passes.
- [ ] 7.3 Remove unused variables: `packages/puck-editor/src/PuckEditor.tsx:62`, `packages/puck-editor/src/fields/ImagePickerField.tsx:13`, `packages/puck-theme-manager/src/components/theme-editor.tsx:166,174,180,186,193`. Delete the variable/import, or prefix with `_` only for required positional params.
  Done when: grep for `no-unused-vars` in lint output is 0.
- [ ] 7.4 Fix `react-hooks/exhaustive-deps`: `packages/puck-api/src/hooks/useDatasource.ts:58` (the effect already has an `eslint-disable` comment; spec J rewrites this hook, so keep the disable **with a justification comment** `// deps intentionally limited: skusKey is the stable key for skus` and set `--report-unused-disable-directives` off for it), `packages/puck-content-manager/src/ContentEditor.tsx:105`, `ContentManagerRouter.tsx:550`, `packages/puck-editor/src/PuckEditor.tsx:94` (x2): wrap the `currentData` expression in its own `useMemo` (`const currentData = useMemo(() => states.draft ?? page, [states.draft, page])`) so the callback depends on a stable value; `puck-editor/src/fields/ImagePickerField.tsx:453` and `puck-image-picker/src/ImagePickerField.tsx:496`: hoist `const extensions = useMemo(() => ..., [deps])`. `puck-editor/src/overrides/ComponentListSearch.tsx:144`: read the line and satisfy the rule or add a justified one-line disable.
  Done when: lint reports 0 `exhaustive-deps` warnings (warnings are errors for us: `yarn lint --max-warnings 0`; update the `lint` script accordingly).
- [ ] 7.5 Delete the 6 now-useless `// eslint-disable-next-line no-console` lines in `EnsureIntlProvider.tsx` of puck-content-manager (79), puck-editor (76), puck-image-picker (74), puck-page-manager (79), puck-renderer (68), puck-theme-manager (75) (ESLint reports them as unused directives).
  Done when: `corepack yarn lint` exits 0 with "0 problems".
- [ ] 7.6 Add smoke tests so the refactors are verified: `packages/puck-components/src/components/blocks/blocks.smoke.test.tsx` renders each of the 9 converted blocks plus 3 unconverted ones with minimal props inside `<IntlProvider locale="en" messages={{}} onError={() => {}}>` (and a `PuckApiProvider` stub is **not** used: product blocks pass `product: { resolvedData: {...} }` so no network is needed). Skeleton:
  ```tsx
  import { render, screen } from '@testing-library/react';
  import { IntlProvider } from 'react-intl';
  import { describe, expect, it } from 'vitest';
  import { renderFAQAccordion } from './FAQAccordion';
  const wrap = (ui: React.ReactElement) => render(<IntlProvider locale="en" messages={{}} onError={() => undefined}>{ui}</IntlProvider>);
  describe('content blocks', () => {
    it('renders FAQAccordion items', () => {
      wrap(<>{renderFAQAccordion({ id: 'x', items: [{ question: 'Q1', answer: 'A1' }] } as never)}</>);
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });
  });
  ```
  Read each block's props type to build valid minimal props; assert one visible text each. Note: `useDatasource` currently throws without `PuckApiProvider`; wrap product blocks in `<PuckApiProvider baseURL="http://localhost" projectKey="p" businessUnitKey="b">` (spec J removes `projectKey` and updates this test).
  Also add `scripts/publish-packages.test.mjs` in group 8.
  Done when: `corepack yarn test` shows at least 12 passing tests, 0 failed.

Pitfalls: converting a render function to a component changes React's component identity per render only if you define the component **inside** another function: always define `XxxRender` at module level. Do not "fix" `any` with `as unknown as X` chains everywhere; narrow once in `shared.ts`.
Verification: `corepack yarn lint && corepack yarn test && corepack yarn typecheck && corepack yarn build`.
Rollback: per file; the pre-change files are in `$SRC` (apply only the scope/`blocks` renames again if needed).

## 8. Release scripts (local, no CI)

Context: the old scripts were bash, interactive, and published with whatever npm login the developer had. The new scripts are Node ESM, testable, default to a dry run, and encode the rules in design.md D-6. There is no CI service in this project, so a maintainer runs them on a laptop.

- [ ] 8.1 Create `$PUCK/scripts/lib/workspace.mjs` exporting `listPackages()` (reads `packages/*/package.json`, returns `[{dir, name, version, pj}]`) and `topoSort(pkgs)` (sort by internal `dependencies` that start with `@commercetools-labs/`; throw on cycles). SPDX header on top. Unit test `scripts/lib/workspace.test.mjs`: `topoSort` puts `puck-types` first, and for every package every internal dependency appears **earlier** in the list (the old bash script listed `puck-content-manager` before `puck-editor`/`puck-renderer`, which is invalid); also assert `puck-editor` and `puck-renderer` come before `puck-content-manager` and `puck-page-manager`.
  Done when: the test passes.
- [ ] 8.2 Create `$PUCK/scripts/bump-versions.mjs`. Usage `node scripts/bump-versions.mjs <patch|minor|major|x.y.z[-pre.N]> [--dry-run]`. Print the packages in `topoSort` order (same order as the publish script). Behaviour: read the **common** current version (error if the 10 versions differ), compute the new one (semver arithmetic for `patch|minor|major`; accept an explicit version matching `^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$`), print `name: old -> new`, write each `package.json` with `JSON.stringify(pj, null, 2) + '\n'`, and also update `playground/package.json` version. No prompt (a dry run is the safeguard).
  Done when: `node scripts/bump-versions.mjs 1.0.1 --dry-run` prints 10 lines and changes no file (`git diff`-style: `md5` of package.json files unchanged).
- [ ] 8.3 Create `$PUCK/scripts/publish-packages.mjs` following design.md D-6. Skeleton:
  ```js
  import { execFileSync, spawnSync } from 'node:child_process';
  import { mkdtempSync, rmSync, existsSync, copyFileSync } from 'node:fs';
  import { tmpdir } from 'node:os';
  import { join, dirname } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import readline from 'node:readline/promises';
  import { listPackages, topoSort } from './lib/workspace.mjs';

  const execute = process.argv.includes('--execute');
  const pkgs = topoSort(listPackages());
  const versions = new Set(pkgs.map((p) => p.version));
  if (versions.size !== 1) fail(`versions differ: ${[...versions].join(', ')}`);
  const version = [...versions][0];
  const tag = version.includes('-') ? 'next' : 'latest';

  for (const p of pkgs) if (!existsSync(join(p.dir, 'dist/index.mjs'))) fail(`${p.name}: dist/ missing, run "yarn build" first`);

  if (execute) {
    if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) fail('git tree is not clean');
    if (spawnSync('npm', ['whoami'], { stdio: 'ignore' }).status !== 0) fail('not logged in: run "npm login"');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Type "publish ${version}" to publish ${pkgs.length} packages with tag ${tag}: `);
    rl.close();
    if (answer.trim() !== `publish ${version}`) fail('confirmation not given');
  }

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');   // scripts/ -> puck/ -> repo root
  const rootLicense = join(repoRoot, 'LICENSE');
  if (!existsSync(rootLicense)) fail('root LICENSE missing');
  console.log('order:\n' + pkgs.map((p, i) => `  ${i + 1}. ${p.name}@${p.version}`).join('\n'));
  const tmp = mkdtempSync(join(tmpdir(), 'puck-pack-'));
  try {
    for (const p of pkgs) {
      if (execute && alreadyPublished(p.name, version)) { console.log(`skip ${p.name}@${version} (already on npm)`); continue; }
      const tgz = join(tmp, `${p.name.replace('@', '').replace('/', '-')}-${version}.tgz`);
      const pkgLicense = join(p.dir, 'LICENSE');
      copyFileSync(rootLicense, pkgLicense);                 // injected only for packing (ossify/gate forbid a committed copy)
      try { run('yarn', ['pack', '--filename', tgz], p.dir); } finally { rmSync(pkgLicense, { force: true }); }
      const args = ['publish', tgz, '--access', 'public', '--tag', tag, ...(execute ? [] : ['--dry-run'])];
      run('npm', args, p.dir);          // stdio inherited: npm asks for the OTP itself
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  ```
  `alreadyPublished(name, v)` = `spawnSync('npm', ['view', `${name}@${v}`, 'version'], {encoding:'utf8'}).stdout.trim() === v`. `run()` uses `spawnSync(cmd, args, {cwd, stdio:'inherit'})` and calls `fail()` on non-zero. `fail(msg)` prints `error: msg` to stderr and `process.exit(1)`. Never log `process.env`.
  Done when: `corepack yarn build && node scripts/publish-packages.mjs` prints 10 `npm publish --dry-run` outputs ("+ @commercetools-labs/puck-types@1.0.0" lines or "Publishing to https://registry.npmjs.org/ with tag latest and public access (dry-run)") and exits 0; `node scripts/publish-packages.mjs --execute` with a dirty tree exits 1 with "git tree is not clean".
- [ ] 8.4 Test: `scripts/publish-packages.test.mjs` (vitest) spawns the script with `--execute` in a temp copy of the repo with an uncommitted change and asserts exit code 1 and stderr contains "not clean"; spawns the dry run with `PATH` prefixed by a fake `npm` shim (a shell script in a temp dir that echoes its args and exits 0) and asserts 10 `publish` invocations in topological order (every package after its internal dependencies), each with `--dry-run` and `--access public`, that the printed `order:` list equals the invocation order, that each packed tarball (inspect with `tar -tzf`) contains `package/LICENSE` equal to the root LICENSE, and that after the run no `packages/*/LICENSE` exists.
  Done when: the test passes in `yarn test`.
- [ ] 8.5 Write the maintainer runbook as the header comment of `publish-packages.mjs` (10 lines: bump, verify, commit, `npm login`, dry run, `--execute`, how to publish an rc: `node scripts/bump-versions.mjs 1.0.0-rc.0`, publish -> tag `next`).
  Done when: `head -40 scripts/publish-packages.mjs` shows the runbook.
- [ ] 8.6 (Optional, needs an npm login) check name availability without publishing: `npm view @commercetools-labs/puck-types version` -> expect `E404` (name free) or the existing version. Record the result in `manual.md`-style note to the owner; do **not** publish.
  Done when: result recorded in the task notes.

Pitfalls: `yarn pack` must run inside the package dir (it uses that workspace's manifest); `npm publish <tgz>` ignores `publishConfig.access`, so `--access public` is mandatory for the first publish of a scoped name. A scoped package defaults to restricted. 2FA: npm requests the OTP interactively; `stdio: 'inherit'` is required. `--tag` is required for prereleases or npm refuses/uses `latest`.
Verification: group 8 tests plus the dry run above.
Rollback: delete the three scripts; the bash originals remain in `$SRC` for reference only (never copy them).

## 9. Playground

Context: the Vite playground is the self-driven browser verification target for specs J-Q. In this spec it only needs to keep building under the new names; spec J rewrites its connection props and `.env.example`.

- [ ] 9.1 Edit `playground/package.json`: dependencies on puck packages -> `"@commercetools-labs/puck-api": "workspace:^"` (and the other 5: content-manager, editor, page-manager, renderer, types; add `puck-theme-manager`, which `App.tsx` imports but the old file did not list), keep third-party deps. Remove nothing else.
  Done when: `corepack yarn install` accepts it (workspace protocol).
- [ ] 9.2 Edit `playground/vite.config.ts`: rename the 8 alias keys and add `puck-theme-manager`, `puck-version-history`, `puck-image-picker` aliases (all packages from `packages/*/src/index.ts`); keep port **5174**; add the SPDX header; update the doc comment ("All first-party workspace packages").
  Done when: `grep -c "commercetools-labs/puck-" playground/vite.config.ts` prints at least 20 and `yarn workspace @commercetools-labs/puck-playground build` exits 0.
- [ ] 9.3 `playground/index.html`: `<title>Puck Playground</title>`. `playground/src/App.tsx` and `main.tsx`: only the SPDX header and scope are changed here (the 4 `projectKey`/`jwtToken` consts are replaced in spec J).
  Done when: `grep -n "CMS" playground -r --exclude-dir=node_modules --exclude-dir=dist` is empty; `grep -o "<title>[^<]*" playground/dist/index.html` prints `<title>Puck Playground`.
- [ ] 9.4 Start it once to see it renders the "Configuration required" panel (no `.env`): `corepack yarn start:playground`, open `http://localhost:5174` with Chrome DevTools tools (`mcp__chrome-devtools__new_page`, `wait_for` text "Configuration required", `take_snapshot`, `list_console_messages` -> no errors). Stop the server.
  Done when: the panel is visible and the console shows no errors.

Pitfalls: the playground aliases to sources, so Vite compiles package TS directly - a green playground does not prove `dist` works (that is task 4.4/4.5). `link:` deps from the old file must not survive (`grep -n 'link:' playground/package.json` -> nothing).
Rollback: restore from `$SRC/puck-react-test` and re-apply 2.1.

## 10. Docs: README rename pass and api-contracts

Context: the root README is rewritten by spec P and its usage section by spec J. This spec only makes the document truthful about names so nothing says "CMS" or the old scope.

- [ ] 10.1 `puck/README.md`: title `# Puck packages`; first lines: add the unsupported banner (same text as 4.3); replace "Puck CMS" and "puck-react-test/" (lines 8 and 311) with "Puck page content" and "`playground/`"; replace `yarn start:test` with `yarn start:playground`; Backend section keeps content but remove "with the same auth middleware as the existing pages routes" (legacy wording) -> "see the Contentools service documentation". Do **not** touch the `projectKey`/`jwtToken` usage snippets (spec J).
  Done when: `grep -niE "\bcms\b|demo|puck-react-test|start:test" puck/README.md` is empty.
- [ ] 10.2 `puck/docs/api-contracts.json`: change `description` ("... in @puck/ packages" -> "... in @commercetools-labs/puck-* packages"); in the `resolveDatasourceApi` entry set `"compatible": true`, delete `incompatibilityNote`, change the third `transformationChain` description to "Sends `{ params }` as the body root (fixed; see useDatasource)". Verify the JSON parses: `node -e "JSON.parse(require('fs').readFileSync('docs/api-contracts.json','utf8'))"`.
  Done when: no `"compatible": false` remains and every `file` starting `puck/` exists: `node -e "..."` helper (add to `verify-metadata.mjs` as an extra check: strip `:\d+`, resolve against repo root `$REPO`) exits 0.
- [ ] 10.3 `scripts/translate-messages.mjs`: header only (it already references `scripts/i18n-glossary.json` relative paths; confirm `node scripts/translate-messages.mjs --dry-run --locale es` exits 0 from `$PUCK`).
  Done when: dry run exits 0.

Pitfalls: the README's "Localization" section says `en`/`es`; keep it (see questions Q-I1).
Rollback: re-copy README from `$SRC` and re-run 2.1.

## 11. Lockfile and final verification

Context: the lockfile still lists the old workspace names. Regenerate it once, review the diff, then prove a clean checkout works.

- [ ] 11.1 Do **not** delete `yarn.lock` (that would re-resolve every dependency). Keep the copied file and run `cd $PUCK && corepack yarn install` (Yarn rewrites only workspace entries and the new devDependencies). Compare third-party versions: `diff <(grep -E '^  version:' $SRC/yarn.lock | sort | uniq -c) <(grep -E '^  version:' yarn.lock | sort | uniq -c)`; differences should be limited to the packages added in 5.1 (ESLint 9, vitest, jsdom, testing-library, typescript-eslint, globals) and their transitive dependencies; ESLint 8 and `@typescript-eslint/*` 8.x (old plugin entries) disappear.
  Done when: `corepack yarn install --immutable` exits 0 immediately afterwards, and `grep -c "commercetools-demo" yarn.lock` prints 0.
- [ ] 11.2 Clean-checkout proof: use the session scratchpad directory (`$SCRATCH`), not `/tmp`: `mkdir -p $SCRATCH/puck-verify && rsync -a --exclude node_modules --exclude dist $PUCK/ $SCRATCH/puck-verify/ && cd $SCRATCH/puck-verify && corepack yarn install --immutable && corepack yarn verify`.
  Expected: `yarn verify` exits 0 (check headers OK, metadata `10 packages OK`, build 10 packages + playground, typecheck, lint 0 problems, tests >= 12 passed).
  Done when: exit code 0.
- [ ] 11.3 Run the forbidden-word scan once more over `$PUCK` (commands in the spec scenarios) and `find $PUCK -name '.env' -o -name '.npmrc' -o -name '*.pem'` (must print nothing).
  Done when: all empty.
- [ ] 11.4 Update `plans/01-dependency-plan.md` status board for I (Implemented), and list in the PR description: the 4 manual steps from `manual.md`.
  Done when: board updated.

Pitfalls: `yarn install` may print `YN0060`/`YN0002` warnings; only `YN0001` errors matter. If the lockfile diff shows unrelated upgrades (for example a new `@measured/puck` version), you re-resolved by mistake: restore the copied lockfile and rerun `corepack yarn install`.
Rollback: restore `yarn.lock` from `$SRC/yarn.lock` and redo 11.1.

## Definition of Done (mapped to `specs/puck-workspace/spec.md`)

| Requirement / scenario | Proven by |
| --- | --- |
| Workspace layout (3 scenarios) | `yarn workspaces list` shows 12 entries (root + 10 + playground); root `package.json` has no `workspaces` (task 1.1-1.4); no artefacts in tree (1.2, 11.3) |
| Package identity (3) | `node scripts/verify-metadata.mjs` (3.1-3.5); old-scope grep (2.1) |
| Internal dependency rewiring (2) | `yarn pack` tarball inspection (4.5), undeclared-import check (3.4) |
| Published surface (2) | `verify:pack` (4.5), consumer fixture (4.4/5.5) |
| Licensing and wording hygiene (3) | `check-headers` (6.2), word scans (2.4, 2.5, 11.3), README banner grep (4.3) |
| Reproducible toolchain (1) | 11.1, 11.2 |
| Quality gates are green (2) | 5.4, 7.1-7.6, 11.2 (`yarn verify`) |
| Local release tooling (5) | 8.2-8.4 tests and dry run |
| Playground builds (1) | 9.2, 9.3 |
| API contract document truthful (1) | 10.2 |
