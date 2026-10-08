## 0. Vocabulary (read once)

* **SOURCE** = `/Users/behnam/code/cms` (an internal git repo; READ-ONLY, never edit, never run `git` write commands in it).
* **TARGET** = `/Users/behnam/code/commercetools-labs/contentools` (this repo; all relative paths below are relative to it).
* **Connect** = commercetools' hosting platform for backend apps; it reads a `connect.yaml` at the repo root and builds each app folder on its own (installing dependencies per folder). That is why the root `package.json` must NOT use `workspaces`.
* **Tooling hub** = a root `package.json` whose only job is to hold convenience scripts.
* **SPDX header** = the 5-line license comment every source file must start with (text in 6.1).
* **ossify / gate** = two scripts from the labs-publish skill. `ossify` prepares (LICENSE, headers, package names); `gate` blocks publication. We only wrap them here.
* **Scratch dir** = any folder OUTSIDE the target (e.g. `$TMPDIR/contentools-a`). Temporary lists go there, never into the repo.

## 1. Pre-conditions and tool check

Context: nothing is copied until we know the tools exist and the source is clean. Pre-conditions: no other spec is required (A is first). Needed: Node 22, `tar`, `git`, `corepack`.

- [ ] 1.1 Check tools. Run:
  ```bash
  node -v        # expect v22.x
  git --version
  tar --version | head -1
  corepack --version   # if missing: npm i -g corepack
  ls ~/.claude/plugins/cache/presales-plugin/presales/*/skills/commercetools-labs-publish/scripts/ossify.mjs
  ```
  Done when: Node is v22+, and the `ossify.mjs` path prints (if not, see manual.md M-A2).
- [ ] 1.2 Check the SOURCE is clean and note its commit. Run `git -C /Users/behnam/code/cms status --short` (expect empty output) and `git -C /Users/behnam/code/cms rev-parse HEAD`; write the hash into `$SCRATCH/source-head.txt`.
  Done when: status is empty (if not: STOP and tell the owner; uncommitted source edits would be missed by a tracked-file copy).
- [ ] 1.3 Check the TARGET is as expected. Run `ls -A /Users/behnam/code/commercetools-labs/contentools` (expect only `README.md openspec plans`, possibly `.claude`).
  Done when: no `service`, `admin-app`, `mcp`, `puck`, `tools`, `package.json` exist yet. If they do, this spec is already (partly) applied: compare with Section 7 before continuing.

Pitfalls: do not run `yarn install` in the SOURCE; do not `cd` into the SOURCE and run scripts there.
Rollback: nothing changed yet.

## 2. Skeleton and root files

Context: create the folders and the small root files. Pre-condition: Section 1 done.

- [ ] 2.1 Create folders: `mkdir -p tools/lib tools/test docs && touch docs/.gitkeep`.
  Done when: `ls -d tools docs` prints two paths.
- [ ] 2.2 Create `.nvmrc` with the single line `22` (`printf '22\n' > .nvmrc`).
  Done when: `cat .nvmrc` prints `22`.
- [ ] 2.3 Create `.gitignore` with exactly:
  ```gitignore
  # dependencies and build output (no leading slash: matches in every app)
  node_modules
  build/
  dist/
  coverage/
  *.log
  *.tgz
  .DS_Store
  # Merchant Center build output of the admin app
  /admin-app/public/
  # scratch dirs
  /service/temp/
  /plans/evidence/
  .connect/
  # secrets: only the .example files are tracked
  .env
  .env.*
  !.env.example
  # yarn 4 (puck/)
  .yarn/cache
  .yarn/install-state.gz
  # local agent settings
  .claude/settings.local.json
  ```
  Done when: `git check-ignore` proof in 7.3 passes.
- [ ] 2.4 Create the root `package.json` (tooling hub only, NO `workspaces`, NO dependencies):
  ```json
  {
    "name": "@commercetools-labs/contentools",
    "version": "1.0.0",
    "private": true,
    "description": "Tooling hub for the Contentools reference implementation. Not a workspace root: each Connect app is self-contained.",
    "license": "MIT",
    "engines": { "node": ">=22" },
    "scripts": {
      "install:all": "node tools/run-all.mjs install",
      "build": "node tools/run-all.mjs build",
      "typecheck": "node tools/run-all.mjs typecheck",
      "lint": "node tools/run-all.mjs lint",
      "test": "node tools/run-all.mjs test",
      "test:e2e": "node tools/run-all.mjs test:e2e",
      "verify": "node tools/run-all.mjs lint typecheck test build",
      "headers": "node tools/labs-publish.mjs ossify --apply",
      "check:spdx": "node tools/check-spdx-headers.mjs",
      "test:tools": "node --test \"tools/test/*.test.mjs\"",
      "gate": "node tools/labs-publish.mjs gate"
    }
  }
  ```
  Done when: `node -e "const p=require('./package.json');process.exit(p.workspaces||p.dependencies||p.devDependencies?1:0)"; echo $?` prints `0`.

Pitfalls: a `workspaces` key here would make Connect install every app's dependencies together. Later specs add scripts (`check:forbidden` in C, `check:pins` in O); keep this file tiny.
Rollback: `rm -rf tools docs .nvmrc .gitignore package.json`.

## 3. Import the source trees

Context: copy the four trees using the list of files git tracks (so ignored junk and secrets cannot come along), then rename two paths. The legacy `cms/` folder is deliberately not in the list. Pre-condition: Section 2 done.

- [ ] 3.1 Build the file list in the scratch dir (copy-paste as one block):
  ```bash
  set -euo pipefail
  SRC=/Users/behnam/code/cms
  SCRATCH="${TMPDIR:-/tmp}/contentools-a"; mkdir -p "$SCRATCH"
  git -C "$SRC" ls-files -z service contentools mcp puck | tr '\0' '\n' \
   | grep -vE -e '^service/(Dockerfile|\.dockerignore|docker-compose\.e2e\.yml|LICENSE|postman/)' \
              -e '^contentools/netlify\.toml$' \
              -e '(^|/)yarn\.lock$' \
              -e '^puck/publish-puck-packages\.sh$' \
              -e '(^|/)(node_modules|build|dist|\.yarn|coverage|temp)/' \
              -e '(^|/)(\.DS_Store|\.env|\.env\.[^e][^/]*)$' \
              -e '\.log$' > "$SCRATCH/import-list.txt"
  wc -l < "$SCRATCH/import-list.txt"          # expect 479
  for d in service contentools mcp puck; do printf '%s ' $d; grep -c "^$d/" "$SCRATCH/import-list.txt"; done
  # expect: service 138 / contentools 60 / mcp 35 / puck 246
  ```
  Done when: the four counts above match. If a count differs, the source changed since 2026-10-08: re-read `git -C $SRC ls-files` diff, decide per file, and update explore.md/design.md numbers in the same change.
- [ ] 3.2 Copy with tar (preserves file modes, creates folders, never touches the source):
  ```bash
  tr '\n' '\0' < "$SCRATCH/import-list.txt" > "$SCRATCH/import-list.z"
  tar -C "$SRC" --null -T "$SCRATCH/import-list.z" -cf - | tar -C /Users/behnam/code/commercetools-labs/contentools -xf -
  ```
  Done when: `ls` in the target shows `service contentools mcp puck` next to the files from Section 2.
- [ ] 3.3 Rename two paths:
  ```bash
  cd /Users/behnam/code/commercetools-labs/contentools
  mv contentools admin-app
  mv puck/puck-react-test puck/playground
  ```
  Done when: `ls -d contentools puck/puck-react-test 2>&1` reports "No such file" for both, and `admin-app/package.json`, `puck/playground/package.json` exist.
- [ ] 3.4 Forbidden-artifact scan (must print NOTHING):
  ```bash
  find service admin-app mcp puck \( -name node_modules -o -name build -o -name dist -o -name .yarn -o -name coverage -o -name temp -o -name .git -o -name .DS_Store -o -name yarn.lock -o -name 'LICENSE*' -o -name Dockerfile -o -name netlify.toml -o -name '*.log' -o -name '.env' -o -name '.env.*' -o -name 'docker-compose*' \) -not -name '.env.example'
  ls -d cms .github 2>&1 | grep -v 'No such'     # prints nothing (no legacy cms/, no .github/)
  ```
  Done when: both commands print nothing. (Note `puck/packages/*/dist` do not exist because they were untracked.)
- [ ] 3.5 Count proof: `for d in service admin-app mcp puck; do printf '%s ' $d; find $d -type f | wc -l; done`, expect `service 138`, `admin-app 60`, `mcp 35`, `puck 246`; `find puck/playground -type f | wc -l` expect `9`.
  Done when: numbers match.
- [ ] 3.6 Prove the source is untouched: `git -C /Users/behnam/code/cms status --short` still prints nothing and `rev-parse HEAD` equals `$SCRATCH/source-head.txt`.

Pitfalls: (a) never use `cp -R /Users/behnam/code/cms/service ...` - that copies `node_modules` and the real `service/.env`. (b) On macOS `tar` is bsdtar; `--null -T` works there and in GNU tar. (c) `contentools` exists as folder name only after the copy: the TARGET itself is also called `contentools`, so `mv contentools admin-app` must run INSIDE the target (the `cd` above).
Rollback: `cd` to the target and `rm -rf service admin-app contentools mcp puck`.

## 4. Fix the path-rename fallout (and only that)

Context: `puck/package.json` still names the old playground folder in its `workspaces` list and in the `start:test` script; Yarn would fail. Pre-condition: Section 3 done. Other occurrences of `puck-react-test` are prose in `puck/README.md` (spec I/P).

- [ ] 4.1 Edit `puck/package.json`: in `"workspaces"` replace `"puck-react-test"` with `"playground"`; replace the script line `"start:test": "yarn workspace puck-react-test dev"` with `"start:playground": "yarn workspace @commercetools-labs/puck-playground dev"`.
- [ ] 4.2 Edit `puck/playground/package.json`: set `"name": "@commercetools-labs/puck-playground"` (the name specs I and L use; the folder stays `puck/playground`) (it stays `"private": true`).
  Done when (4.1 + 4.2): `grep -rn "puck-react-test" puck/package.json puck/playground/package.json` prints nothing, and `node -e "JSON.parse(require('fs').readFileSync('puck/package.json','utf8'))"` exits 0.

Pitfalls: the scoped name matters: `ossify` (Section 6) re-scopes names and would otherwise rename a bare `playground` name and break `yarn workspace <name>`. Do NOT touch `@commercetools-demo/*` imports here (spec C does one repo-wide rename).
Rollback: re-run Section 3 for `puck/` only.

## 5. Tooling scripts (zero dependencies, each with a test)

Context: small Node scripts (ESM `.mjs`, no npm packages) so `yarn verify`, SPDX checking and the publish wrapper work from day one. Style reference: `/Users/behnam/code/commercetools-labs/search-config/tools/*.mjs` and `tools/test/*.test.mjs`. Every `.mjs` file below starts with the SPDX header (6.1 shows the text; step 6 will also add it automatically, so you may leave it out and let `ossify` add it).

- [ ] 5.1 Create `tools/lib/targets.mjs`:
  ```js
  /** The four buildable trees. `pm` picks the package manager used to run their scripts (owner decision: all Yarn). */
  export const TARGETS = [
    { name: 'puck', dir: 'puck', pm: 'yarn' },       // Yarn 4 workspace, published to npm
    // Owner decision: Yarn everywhere (service, mcp, admin-app = Yarn 1 classic with a committed yarn.lock; puck = Yarn 4.5.1).
    { name: 'service', dir: 'service', pm: 'yarn' },     // Connect app
    { name: 'mcp', dir: 'mcp', pm: 'yarn' },             // Connect app
    { name: 'admin-app', dir: 'admin-app', pm: 'yarn' }, // Connect app (Merchant Center custom application)
  ];
  ```
- [ ] 5.2 Create `tools/lib/files.mjs` (lists files to check; git when available, else a filesystem walk):
  ```js
  import { execFileSync } from 'node:child_process';
  import { existsSync, readdirSync } from 'node:fs';
  import { join, relative } from 'node:path';

  /** Directory names never scanned (mirrors the labs `ossify` skip list, plus our scratch dirs). */
  export const SKIP_DIRS = new Set(['.git', 'node_modules', 'public', 'dist', 'build', 'coverage', '.next', '.turbo', '.yarn', 'temp', '.connect']);

  const skipped = (rel) => rel.split('/').some((seg) => SKIP_DIRS.has(seg));

  /** Repo-relative file paths, sorted. */
  export function listFiles(root) {
    let files;
    if (existsSync(join(root, '.git'))) {
      files = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
        .split('\0').filter(Boolean).filter((f) => existsSync(join(root, f)));
    } else {
      files = [];
      (function walk(dir) {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name)); }
          else files.push(relative(root, join(dir, e.name)));
        }
      })(root);
    }
    return files.filter((f) => !skipped(f)).sort();
  }
  ```
- [ ] 5.3 Create `tools/run-all.mjs`:
  ```js
  #!/usr/bin/env node
  import { spawnSync } from 'node:child_process';
  import { existsSync, readFileSync } from 'node:fs';
  import { dirname, join, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { TARGETS } from './lib/targets.mjs';

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

  /** Pure: which (target, script) pairs run or are skipped. `scriptsOf(dir)` returns the package.json "scripts" object or null. */
  export function plan(targets, scripts, scriptsOf) {
    const steps = [];
    for (const script of scripts) {
      for (const t of targets) {
        const have = scriptsOf(t.dir);
        const runnable = script === 'install' ? have !== null : have !== null && script in have;
        steps.push({ ...t, script, action: runnable ? 'run' : 'skip' });
      }
    }
    return steps;
  }

  export function commandFor(step) {
    if (step.script === 'install') return step.pm === 'yarn' ? ['yarn', ['install']] : ['npm', ['install']];
    return step.pm === 'yarn' ? ['yarn', ['run', step.script]] : ['npm', ['run', step.script]];
  }

  const scriptsOf = (dir) => {
    const p = join(ROOT, dir, 'package.json');
    return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).scripts ?? {}) : null;
  };

  if (import.meta.url === `file://${process.argv[1]}`) {
    const scripts = process.argv.slice(2);
    if (scripts.length === 0) { console.error('usage: node tools/run-all.mjs <script> [<script>...]'); process.exit(2); }
    const failed = [];
    for (const step of plan(TARGETS, scripts, scriptsOf)) {
      if (step.action === 'skip') { console.log(`skip  ${step.name}: no "${step.script}" script`); continue; }
      console.log(`\n== ${step.name}: ${step.script}`);
      const [cmd, args] = commandFor(step);
      const r = spawnSync(cmd, args, { cwd: join(ROOT, step.dir), stdio: 'inherit' });
      if (r.status !== 0) failed.push(`${step.name}:${step.script}`);
    }
    if (failed.length) { console.error(`\nFAILED: ${failed.join(', ')}`); process.exit(1); }
  }
  ```
  Notes: `test` for `service` currently is an echo stub; B replaces it. `node --test` style scripts print nothing when skipped.
- [ ] 5.4 Create `tools/labs-publish.mjs` (wrapper around the installed skill; NEVER reads/copies `policy.json`):
  ```js
  #!/usr/bin/env node
  import { spawnSync } from 'node:child_process';
  import { existsSync, readdirSync } from 'node:fs';
  import { homedir } from 'node:os';
  import { dirname, join, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const SKILL_REL = 'skills/commercetools-labs-publish/scripts';

  const cmpVersion = (a, b) => a.split('.').map(Number).reduce((r, n, i) => r || n - (Number(b.split('.')[i]) || 0), 0);

  /** Directory holding ossify.mjs/gate.mjs, or null. `LABS_PUBLISH_DIR` wins over the plugin cache lookup. */
  export function findScriptsDir(env = process.env, home = homedir()) {
    if (env.LABS_PUBLISH_DIR) return existsSync(join(env.LABS_PUBLISH_DIR, 'ossify.mjs')) ? env.LABS_PUBLISH_DIR : null;
    const base = join(home, '.claude/plugins/cache/presales-plugin/presales');
    if (!existsSync(base)) return null;
    for (const v of readdirSync(base).sort(cmpVersion).reverse()) {
      const dir = join(base, v, SKILL_REL);
      if (existsSync(join(dir, 'ossify.mjs'))) return dir;
    }
    return null;
  }

  /** Pure: argv for `node`. ossify gets --year 2026 unless given; nothing else is added (no --apply by default). */
  export function buildArgs(sub, extra, dir, root = ROOT) {
    if (!['ossify', 'gate'].includes(sub)) throw new Error(`unknown subcommand "${sub}" (use ossify|gate)`);
    const args = [join(dir, `${sub}.mjs`), '--repo', root, ...extra];
    if (sub === 'ossify' && !extra.includes('--year')) args.push('--year', '2026');
    return args;
  }

  if (import.meta.url === `file://${process.argv[1]}`) {
    const [sub, ...extra] = process.argv.slice(2);
    const dir = findScriptsDir();
    if (!dir) { console.error('labs-publish: skill scripts not found. Set LABS_PUBLISH_DIR to the folder containing ossify.mjs and gate.mjs.'); process.exit(2); }
    let args;
    try { args = buildArgs(sub, extra, dir); } catch (e) { console.error(`labs-publish: ${e.message}`); process.exit(2); }
    process.exit(spawnSync('node', args, { stdio: 'inherit' }).status ?? 1);
  }
  ```
- [ ] 5.5 Create `tools/check-spdx-headers.mjs`:
  ```js
  #!/usr/bin/env node
  import { readFileSync } from 'node:fs';
  import { dirname, extname, join, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { listFiles } from './lib/files.mjs';

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const BLOCK = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.css', '.scss', '.java', '.kt', '.kts'];
  const HASH = ['.graphql', '.sh'];
  const LINES = [
    'SPDX-License-Identifier: MIT',
    /^Copyright \(c\) \d{4} commercetools GmbH and the commercetools-labs contributors$/,
    'Freely available, AS IS and UNSUPPORTED. See LICENSE.',
  ];
  const GENERATED = [/(^|\/)generated\//, /\.generated\.[a-z]+$/, /-lock\.[a-z]+$/];

  const match = (want, got) => (want instanceof RegExp ? want.test(got) : want === got);

  /** True when `text` (of a file with extension `ext`) starts with the exact header (a leading #! line is allowed). */
  export function hasHeader(text, ext) {
    const lines = text.split('\n');
    let i = lines[0]?.startsWith('#!') ? 1 : 0;
    if (BLOCK.includes(ext)) {
      if (lines[i] !== '/*') return false;
      return LINES.every((w, k) => lines[i + 1 + k]?.startsWith(' * ') && match(w, lines[i + 1 + k].slice(3))) && lines[i + 4] === ' */';
    }
    if (HASH.includes(ext)) return LINES.every((w, k) => lines[i + k]?.startsWith('# ') && match(w, lines[i + k].slice(2)));
    return true;
  }

  export function findOffenders(root, files = listFiles(root)) {
    const out = [];
    let checked = 0;
    for (const f of files) {
      const ext = extname(f);
      if (![...BLOCK, ...HASH].includes(ext) || GENERATED.some((re) => re.test(f))) continue;
      checked++;
      if (!hasHeader(readFileSync(join(root, f), 'utf8'), ext)) out.push(f);
    }
    return { checked, offenders: out };
  }

  if (import.meta.url === `file://${process.argv[1]}`) {
    const { checked, offenders } = findOffenders(ROOT);
    if (offenders.length) { console.error(`spdx: ${offenders.length} file(s) without the header:\n${offenders.join('\n')}`); process.exit(1); }
    console.log(`spdx: OK (${checked} files)`);
  }
  ```
- [ ] 5.6 Tests in `tools/test/` (use `node:test` + `node:assert/strict`; write temp dirs with `mkdtempSync(join(tmpdir(), 'ct-'))`):
  * `run-all.test.mjs`: `plan([{name:'a',dir:'a',pm:'npm'}], ['lint'], () => ({}))` gives one `skip`; with `() => ({lint:'x'})` gives `run`; `commandFor({pm:'yarn',script:'build'})` equals `['yarn',['run','build']]`; `install` with `scriptsOf` null gives `skip`.
  * `labs-publish.test.mjs`: `findScriptsDir({LABS_PUBLISH_DIR: <tmp without ossify.mjs>})` is `null`; with an `ossify.mjs` present returns it; plugin-cache lookup picks `0.29.4` over `0.9.0` in a fake home (build `<home>/.claude/plugins/cache/presales-plugin/presales/{0.9.0,0.29.4}/skills/commercetools-labs-publish/scripts/ossify.mjs`); `buildArgs('gate', ['--ack'], '/d', '/r')` equals `['/d/gate.mjs','--repo','/r','--ack']`; `buildArgs('ossify', [], '/d', '/r')` ends with `['--year','2026']` and does NOT contain `--apply`; `buildArgs('x',...)` throws.
  * `check-spdx-headers.test.mjs`: `hasHeader` true for the exact block (also after `#!/usr/bin/env node`), false for missing header, false for `Copyright (c) 2026 Someone Else`; `findOffenders` over a tmp dir with one good and one bad `.ts` returns the bad one; a `.md` file is ignored.
  * `files.test.mjs`: filesystem-walk branch ignores `node_modules` and `build` folders and returns sorted relative paths.
  Run `yarn test:tools`. Done when: all tests pass (`# pass N`, `# fail 0`).

Pitfalls: `import.meta.url === \`file://${process.argv[1]}\`` is false when the path has spaces/symlinks; the repo path has none. Never print `policy.json`. `listFiles` skips any dir literally named `public` or `build` at any depth (same as ossify) - that is intended.
Rollback: `rm -rf tools/*.mjs tools/lib tools/test`.

## 6. Apply LICENSE, headers and package names with ossify

Context: ossify writes the MIT `LICENSE`, adds the header to every source file and re-scopes package names. Pre-conditions: Sections 3-5 done.

- [ ] 6.1 Dry run first (expect exactly three refusals, handled in 6.2a): `node tools/labs-publish.mjs ossify | tee "$SCRATCH/ossify-dry.txt"`. Read the report. Expected: a list of files "to header", package renames (`service-typescript -> @commercetools-labs/service-typescript`, `@commercetools-demo/puck-api -> @commercetools-labs/puck-api`, ...), and exactly the three refused FooterBlock files of 6.2a (no third-party directory). If it lists any OTHER refused file or directory, STOP: add it to `questions.md` (never relicense foreign code).
  The header it will write (for reference, exact):
  ```
  /*
   * SPDX-License-Identifier: MIT
   * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
   * Freely available, AS IS and UNSUPPORTED. See LICENSE.
   */
  ```
- [ ] 6.2 Apply: `yarn headers` (= `ossify --apply --year 2026`).
  Done when: `LICENSE` exists at the root and `node tools/check-spdx-headers.mjs` prints `spdx: OK (<n> files)` (n is roughly 400; record the number in the PR/notes).
- [ ] 6.2a ossify REFUSES a file whose first 2000 characters contain the word `copyright` (it reads a prop named `copyright` as a foreign notice). Three of our files trip it: `puck/packages/puck-components/src/components/cms/FooterBlock.tsx`, `puck/packages/puck-editor/src/components/cms/FooterBlock.tsx`, `service/src/samples/CMS/footer-block.ts` (their paths change later in C/I; the dry-run report lists them under "FOREIGN COPYRIGHT - refused"). They are false positives (a form field called `copyright`). Add the header BY HAND as the first lines of each file:
  ```
  /*
   * SPDX-License-Identifier: MIT
   * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
   * Freely available, AS IS and UNSUPPORTED. See LICENSE.
   */
  ```
  Then `yarn check:spdx` must pass. Note for R: the labs `gate.mjs` may flag the same three files (it scans for foreign copyright too); if it does, R decides between a gate `--ack`-free fix (rename the prop to `copyrightText` in the three files plus the stored content-type field - a data-shape change, avoid) or an upstream gate fix. Recorded as Q-A5.
- [ ] 6.3 Inspect results: `head -8 service/src/app.ts` shows the header then the original first line (`import * as dotenv`); `head -12 mcp/bin/run-mcp.cjs` shows `#!/usr/bin/env node` first and the header right after; `grep '"name"' puck/packages/puck-api/package.json` shows `@commercetools-labs/puck-api`; `find . -name 'LICENSE*' -not -path './node_modules/*'` prints only `./LICENSE`.
- [ ] 6.4 Re-run `yarn headers` and then `yarn check:spdx`: second run must change nothing (idempotent).

Pitfalls: ossify renames only `package.json` `name` fields. Dependency entries and imports still say `@commercetools-demo/...`; spec C replaces them everywhere in one pass. `ossify` skips `.json/.md/.yaml`: that is why C/O add their own checks.
Rollback: re-run Section 3 (fresh copy), then 4, then 6.

## 7. Verification (all automated, no browser)

- [ ] 7.1 `yarn test:tools` -> all pass.
- [ ] 7.2 `yarn check:spdx` -> `spdx: OK (...)`, exit 0.
- [ ] 7.3 Scratch-git ignore proof (never inside the target):
  ```bash
  T="$SCRATCH/ignore-proof"; rm -rf "$T"; mkdir -p "$T/service" && cp .gitignore "$T/" && cd "$T" && git init -q && touch service/.env service/.env.e2e service/.env.example
  git check-ignore service/.env service/.env.e2e      # prints both paths
  git check-ignore service/.env.example; echo $?      # prints 1 (not ignored)
  cd /Users/behnam/code/commercetools-labs/contentools
  ```
- [ ] 7.4 Root-hub proof: `node tools/run-all.mjs lint` prints `skip`/`== ...` lines without crashing for the apps (apps may legitimately fail lint before D/K; what matters is the runner reports per-app status and exit code non-zero only when a script actually fails). Use `node tools/run-all.mjs nonexistent-script` -> four `skip` lines, exit 0.
- [ ] 7.5 `node -e "const p=require('./package.json');console.log(Object.keys(p).includes('workspaces'))"` -> `false`.
- [ ] 7.6 Forbidden-artifact `find` from 3.4 -> empty; counts from 3.5 -> as listed (headers do not change counts; `LICENSE` and tool files are outside those folders).
- [ ] 7.7 Grep sanity (informational, C fixes them): `grep -rIl "commercetools-demo" service admin-app mcp puck | wc -l` is still > 0 (expected, proves C has work); `grep -rIl "x-project-key" service | wc -l` > 0.

## 8. Definition of Done (mapped to scenarios)

* Skeleton present (repo-skeleton: Target directory skeleton) -> 2.1, 3.3, 3.4.
* No workspaces at root -> 2.4, 7.5. Node pinned -> 2.2.
* Env file ignored, example tracked -> 2.3, 7.3. One LICENSE -> 6.2, 6.3.
* File count matches / forbidden scan empty / source unchanged (source-import) -> 3.1-3.6, 7.6.
* Path-rename fallout fixed -> 4.1-4.2.
* Every file carries header -> 6.2, 6.2a, 7.2.
* run-all, labs-publish (dry run default, missing skill exit 2), SPDX checker, tools tested (tooling-hub) -> 5.x, 7.1, 7.4.
* `LICENSE` (MIT, written by ossify in 6.2) and `.nvmrc` (`22`, 2.2) exist: spec I and later specs rely on both.
* `openspec validate a-repo-foundation --strict` passes.
