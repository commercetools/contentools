## 0. Vocabulary (read once)

* **TARGET** = `/Users/behnam/code/commercetools-labs/contentools`; paths are relative to it.
* **Gate** = a script that exits non-zero when a rule is broken. **Strict mode** = the release-grade run (nothing skipped, nothing pending).
* **Connect** = commercetools' platform that builds and hosts the apps from `connect.yaml`; **`commercetools connect validate`** = its CLI check (builds in an image, runs tests, static analysis; needs Docker).
* **Dist-tag** = npm label for a published version (`latest` for stable, `next` for prereleases such as `1.0.0-rc.0`).
* **Lockstep** = all packages share one version (Q-05).
* **No CI**: there is NO GitHub Actions / no `.github/` in this project (owner decision). Nothing in this spec creates a workflow file, and Section 4 adds a gate that fails if one appears.
* `lf` helper (as in spec C): `lf() { node -e "import('./tools/lib/files.mjs').then(m=>console.log(m.listFiles('.').join('\n')))"; }`.

## 1. Pre-conditions

Context: O wraps scripts defined by other specs. Pre-conditions: A, C archived; H, I, L, M archived (their `connect.yaml` blocks and scripts exist). If one is missing, the matching step shows `SKIP` and Section 7 is the point where everything must be green.

- [x] 1.1 Confirm inputs exist: `ls connect.yaml tools/check-forbidden-terms.mjs tools/check-legacy-route-calls.mjs tools/lib/targets.mjs tools/check-spdx-headers.mjs puck/package.json service/package.json mcp/package.json admin-app/package.json` (all present) and `node -e "const s=require('./puck/package.json').scripts;console.log(s['release:bump'],s['release:publish'])"` prints the two script lines from spec I.
- [x] 1.2 Check tools: `node -v` (v22+), `corepack --version` (needed for puck's Yarn 4), `docker --version` (only for the Connect step), `commercetools --version` (install: `npm install -g @commercetools/cli`; if absent the Connect step is skipped outside strict mode).
- [x] 1.3 `ls .github 2>&1` must say "No such file or directory". If a `.github` exists (someone added it), delete it: the owner decided against workflows.

Rollback: nothing changed yet.

## 2. Hygiene gate (`check:hygiene`)

Context: with no workflows, the "no secrets / no CI files" promise is enforced on the files themselves. Pre-condition: 1.x.

- [x] 2.1 Create `tools/check-repo-hygiene.mjs` (zero dependencies, SPDX header):
  ```js
  #!/usr/bin/env node
  import { readFileSync } from 'node:fs';
  import { basename, dirname, join, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { listFiles } from './lib/files.mjs';

  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

  /** [rule, regex, options?] - checked against every file path. */
  export const PATH_RULES = [
    // strictOnly rules run only with --strict (release): work-in-progress folders must be gone by then.
    ['no _pending folder at release', /(^|\/)_pending(\/|$)/, { strictOnly: true }],
    ['no CI files (Connect builds and deploys)', /(^|\/)(\.github|\.circleci)\/|(^|\/)(\.gitlab-ci\.yml|Jenkinsfile|azure-pipelines\.yml|bitbucket-pipelines\.yml|cloudbuild\.ya?ml)$/],
    ['no container packaging (Connect builds from source)', /(^|\/)(Dockerfile[^/]*|docker-compose[^/]*\.ya?ml)$/],
    ['no env files (only *.example)', /(^|\/)\.env(\..+)?$/],
    ['no key material', /\.(pem|key)$|service-account[^/]*\.json$/i],
    ['no package-lock.json (Yarn only)', /(^|\/)package-lock\.json$/],
    ['no .npmrc', /(^|\/)\.npmrc$/],
    ['no tarballs', /\.tgz$/],
    ['no .DS_Store', /(^|\/)\.DS_Store$/],
    ['no tracked node_modules', /(^|\/)node_modules\//],
    ['only the root LICENSE', /(^|\/)(?!LICENSE$)LICENSE[^/]*$|(^|\/)[^/]+\/LICENSE[^/]*$/],
  ];
  const ENV_OK = /\.example$/;

  const SECRET_PATTERNS = [
    ['github token', /\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}\b|github_pat_[A-Za-z0-9_]{30,}/],
    ['api key (sk-)', /\bsk-[A-Za-z0-9_-]{20,}/],
    ['google api key', /\bAIza[0-9A-Za-z_-]{35}\b/],
    ['slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
    ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
    ['secret assignment', /\b[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*['"]?[A-Za-z0-9+/_=.-]{16,}/],
  ];
  const SKIP_CONTENT = /(^|\/)(tests?|__tests__|e2e|fixtures)\/|\.test\.|\.spec\.|\.example$|^openspec\/|^plans\/|^tools\/test\/|^tools\/check-repo-hygiene\.mjs$|(^|\/)(package-lock\.json|yarn\.lock)$/;

  export const LOCKFILE_DIRS = ['service', 'admin-app', 'mcp', 'puck'];
  /** strict only: each app that has a package.json must also have a committed yarn.lock. `exists(path)` is injected for tests. */
  export function lockfileFindings(files, exists = (p) => files.includes(p)) {
    return LOCKFILE_DIRS.filter((d) => exists(`${d}/package.json`) && !exists(`${d}/yarn.lock`)).map((d) => ({ path: `${d}/yarn.lock`, rule: 'missing yarn.lock (commit the Yarn lockfile)' }));
  }

  export function pathFindings(files, { strict = false } = {}) {
    const out = [];
    for (const f of files) for (const [rule, re, opt] of PATH_RULES) {
      if (opt?.strictOnly && !strict) continue;
      if (rule === 'no env files (only *.example)' && ENV_OK.test(f)) continue;
      if (rule === 'only the root LICENSE' && f === 'LICENSE') continue;
      if (re.test(f)) out.push({ path: f, rule });
    }
    return out;
  }

  /** The matched text is deliberately NOT returned (it may be a real secret). */
  export function secretFindings(path, text) {
    if (SKIP_CONTENT.test(path)) return [];
    const out = [];
    text.split('\n').forEach((line, i) => {
      if (line.includes('hygiene-ok')) return;
      for (const [rule, re] of SECRET_PATTERNS) if (re.test(line)) out.push({ path, line: i + 1, rule: `secret pattern: ${rule}` });
    });
    return out;
  }

  if (import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.includes('--help')) { console.log('check-repo-hygiene: fast pre-check (CI files, env/key files, secret patterns). It is not a replacement for gate.mjs (labs gate, spec R), which also scans customer/internal names.'); process.exit(0); }
    const files = listFiles(ROOT).filter((f) => !f.startsWith('openspec/') && !f.startsWith('plans/'));
    const strict = process.argv.includes('--strict');
    const findings = [...pathFindings(files, { strict }), ...(strict ? lockfileFindings(listFiles(ROOT)) : [])];
    for (const f of files) {
      if (/\.(png|jpe?g|gif|ico|woff2?|ttf|pdf|zip)$/i.test(f)) continue;
      findings.push(...secretFindings(f, readFileSync(join(ROOT, f), 'utf8')));
    }
    if (findings.length) { for (const x of findings) console.error(`${x.path}${x.line ? ':' + x.line : ''}: ${x.rule}`); console.error(`hygiene: FAILED (${findings.length})`); process.exit(1); }
    console.log(`hygiene: OK (${files.length} files)`);
  }
  ```
  Note: `package-lock.json` is forbidden everywhere (always), while the required-`yarn.lock` check runs only with `--strict`/`verify:strict` because owners generate their lockfiles when they first install. Important: `listFiles` (spec A) skips `node_modules`, `public`, `dist`, `build`, so they are not flagged; the "tracked node_modules" rule matters only inside a git index (R's single commit).
- [x] 2.2 Test `tools/test/repo-hygiene.test.mjs`: `pathFindings(['.github/workflows/ci.yml'])` has rule `no CI files...`; `pathFindings(['service/package-lock.json'])` is flagged (`no package-lock.json`); `lockfileFindings(['service/package.json','mcp/package.json','mcp/yarn.lock'])` reports `service/yarn.lock` only; `pathFindings(['service/src/_pending/a.ts'])` is `[]` but with `{ strict: true }` has rule `no _pending folder at release`; `['service/.env']` flagged, `['service/.env.example']` not; `['service/LICENSE']` flagged, `['LICENSE']` not; `Dockerfile` flagged; `secretFindings('src/a.ts', "const k = 'AIza" + 'x'.repeat(35) + "'")` returns one finding and the finding object has no `text` field; `secretFindings('service/tests/a.test.ts', ...)` returns `[]`; a line with `// hygiene-ok` returns `[]`; assemble token-like test strings from fragments so the test file itself does not trip the check (the file is excluded by `^tools/test/` anyway).
  Command: `yarn test:tools` -> pass.
- [x] 2.3 Add root scripts: `"check:hygiene": "node tools/check-repo-hygiene.mjs"`. Run `yarn check:hygiene` -> `hygiene: OK (<n> files)`. Fix real findings (Dockerfile etc. should be absent since A).
  Done when: it exits 0; creating `.github/workflows/x.yml` makes it exit 1 (try, then delete).

Pitfalls: never print the matched secret; `AIza...` patterns in docs must carry `hygiene-ok` if they are examples. `.env.example` files may hold placeholders only.
Rollback: delete script, test, package.json entry.

## 3. Connect contract check (`check:connect`)

Context: `connect.yaml` is the install contract; most mistakes (secret under the wrong key, wrong folder name, forgotten endpoint) can be caught in seconds without Docker. Pre-condition: H (and L, M) wrote their blocks into the root `connect.yaml`.

- [x] 3.1 Create `tools/lib/connect-blocks.mjs` (pure, tested): parses the documented subset.
  ```js
  /** Split connect.yaml text into { apps: [{name, applicationType, endpoint, start, end, lines}], inheritAs: {start,end,lines} }.
      Supported subset: the `deployAs:` list written with two-space indentation (`  - name: x`), scalar `key: value` lines,
      `standardConfiguration:` / `securedConfiguration:` lists of `- key: NAME`, and the top-level `inheritAs:` map.
      Anything else is ignored (connect validate is the authority). */
  export function parseConnectYaml(text) {
    const lines = text.split('\n');
    const apps = []; let cur = null; let section = null; let inherit = null; let top = null;
    lines.forEach((raw, i) => {
      const n = i + 1;
      if (/^\S/.test(raw) && !raw.startsWith('#')) { top = raw.replace(/:.*/, ''); cur = null; section = null; if (top === 'inheritAs') inherit = { start: n, lines: [] }; return; }
      if (top === 'inheritAs' && inherit) inherit.lines.push({ n, text: raw });
      if (top !== 'deployAs') return;
      const m = /^  - name:\s*(\S+)/.exec(raw);
      if (m) { cur = { name: m[1], start: n, applicationType: null, endpoint: null, keys: [], scripts: {} }; apps.push(cur); section = null; return; }
      if (!cur) return;
      let k;
      if ((k = /^\s+applicationType:\s*(\S+)/.exec(raw))) cur.applicationType = k[1];
      else if ((k = /^\s+endpoint:\s*(\S+)/.exec(raw))) cur.endpoint = { value: k[1], n };
      else if ((k = /^\s+(standardConfiguration|securedConfiguration):/.exec(raw))) section = k[1];
      else if ((k = /^\s+(postDeploy|preUndeploy):\s*(.+)$/.exec(raw))) cur.scripts[k[1]] = { cmd: k[2].trim(), n };
      else if ((k = /^\s+- key:\s*(\S+)/.exec(raw))) cur.keys.push({ key: k[1], section, n });
    });
    return { apps, inherit };
  }
  ```
  Also export `scopesOf(inherit)`: collect the `- <scope>` list items under `scopes:` (accepts inline `[a, b]` arrays too).
- [x] 3.2 Create `tools/check-connect-contract.mjs` implementing the rules of the spec, each as a small function returning `{n, msg}` problems; main prints `connect.yaml:<n>: <msg>` and exits 1 on any. Rules (exact):
  1. file `connect.yaml` exists at the root (else `connect.yaml missing`).
  2. for each app: folder `<name>/` with `package.json` exists (`app folder missing: <name>`).
  3. `applicationType` is `service` or `merchant-center-custom-application` (`unsupported applicationType`).
  4. `service` app: `endpoint` is `/service`; `mcp` app: `/mcp` and type `service`; MC app: no `endpoint` line.
  5. exactly one `inheritAs` block with a `scopes` list; the list is non-empty and has no `manage_project` (`scope too broad`).
  6. no key in `{CTP_PROJECT_KEY, CTP_CLIENT_ID, CTP_CLIENT_SECRET, CTP_SCOPE, CTP_API_URL, CTP_AUTH_URL}` (injected by `inheritAs`: `CTP_* keys are injected, do not declare`).
  7. every key matching `/(SECRET|TOKEN|PRIVATE_KEY|PASSWORD|API_KEY)/` has `section === 'securedConfiguration'` (`secret-like key must be in securedConfiguration`).
  8. each app `package.json`: no `workspaces`; `engines.node` string matches `/>=\s*22/`; for `service`/`mcp` scripts `build`, `start`, `test` exist; root `package.json` has no `workspaces`.
  9. for `postDeploy`/`preUndeploy` commands matching `^(yarn run|yarn)\s+(\S+)`: that script name exists in the app's `package.json`.
  10. if `tools/check-admin-app-connect.mjs` exists, run it with `spawnSync(process.execPath, [...])` and add its output as a problem when it exits non-zero.
  Print `connect-contract: OK (<apps> apps)` on success.
- [x] 3.3 Tests `tools/test/connect-contract.test.mjs` with inline YAML strings (write temp dirs with `mkdtempSync`; create folder + package.json stubs): a valid two-app file passes; `SERVICE_API_TOKEN` under `standardConfiguration` fails with the secret message; a `CTP_CLIENT_ID` key fails; a missing folder fails; `endpoint: /svc` on `service` fails; MC block with `endpoint:` fails; `postDeploy: yarn connector:post-deploy` with no such script fails; `workspaces` in an app `package.json` fails.
- [x] 3.4 Add root script `"check:connect": "node tools/check-connect-contract.mjs"`. Run `yarn check:connect` on the real tree -> `connect-contract: OK (3 apps)` (`service`, `admin-app`, `mcp`). Fix real findings by editing `connect.yaml` only in coordination with the owning spec (H/L/M): record the discrepancy in the PR instead of silently changing their block.
  Done when: exit 0; mutation test: move `SERVICE_API_TOKEN` into `standardConfiguration` in a scratch copy of `connect.yaml` (never the real one) and see exit 1.

Pitfalls: `default:` values and multi-line strings are not parsed (ignored by design). Comments (`# ...`) inside lists are ignored. Indentation must be the two-space style used by H/L/M; a different indentation makes rule 2 report "no apps found" - then fix the checker or the file, do not skip the rule.
Rollback: delete the two scripts, test and package.json entry.

## 4. The `verify` orchestrator

Context: one command for all gates, strict mode for releases. Pre-condition: Sections 2 and 3, plus A's `tools/lib/targets.mjs`.

- [x] 4.1 Create `tools/lib/verify-steps.mjs` (pure):
  ```js
  import { TARGETS } from './targets.mjs';

  /** scriptsOf(dir) -> package.json "scripts" object or null. Returns the ordered step list. */
  export function buildSteps(opts, scriptsOf) {
    const steps = [
      { id: 'tools', cmd: 'node', args: ['--test', 'tools/test/*.test.mjs'], cwd: '.' },
      { id: 'spdx', cmd: 'node', args: ['tools/check-spdx-headers.mjs'], cwd: '.' },
      { id: 'forbidden', cmd: 'node', args: ['tools/check-forbidden-terms.mjs', ...(opts.strict ? ['--require-empty-pending'] : [])], cwd: '.' },
      { id: 'legacy-calls', cmd: 'node', args: ['tools/check-legacy-route-calls.mjs'], cwd: '.' },
      { id: 'hygiene', cmd: 'node', args: ['tools/check-repo-hygiene.mjs', ...(opts.strict ? ['--strict'] : [])], cwd: '.' },
      { id: 'connect-contract', cmd: 'node', args: ['tools/check-connect-contract.mjs'], cwd: '.' },
    ];
    for (const t of TARGETS) {
      const scripts = scriptsOf(t.dir);
      const names = scripts === null ? [] : 'verify' in scripts ? ['verify'] : ['typecheck', 'lint', 'test', 'build'].filter((s) => s in scripts);
      if (opts.install && scripts !== null) steps.push({ id: `${t.name}:install`, ...installCmd(t) });
      if (names.length === 0) { steps.push({ id: t.name, skip: scripts === null ? 'no package.json' : 'no verify/typecheck/lint/test/build script' }); continue; }
      steps.push({ id: t.name, cwd: t.dir, seq: names.map((s) => runCmd(t, s)) });
    }
    if (opts.connect || opts.strict) steps.push({ id: 'connect-validate', cmd: 'commercetools', args: ['connect', 'validate', '.'], cwd: '.', requires: 'commercetools' });
    return steps.filter((s) => !opts.only || opts.only.includes(s.id.split(':')[0])).filter((s) => !(opts.skip ?? []).includes(s.id.split(':')[0]));
  }
  const runCmd = (_t, s) => ['yarn', ['run', s]];
  const installCmd = (t) => ({ cwd: t.dir, cmd: 'yarn', args: t.dir === 'puck' ? ['install', '--immutable'] : ['install', '--frozen-lockfile'] });
  ```
  Note: Node 22 expands the quoted glob itself (no shell needed). Keep tool test files named `*.test.mjs`.
- [x] 4.2 Create `tools/verify.mjs`:
  * parse flags: `--only a,b`, `--skip a,b`, `--fail-fast`, `--install`, `--connect`, `--strict`, `--help`.
  * for each step: if `skip` -> row `SKIP (<reason>)` (becomes `FAIL (strict: nothing to run)` under `--strict`); if `requires` and the executable is missing (`spawnSync('command',['-v',x])` or `which`) -> `SKIP (install: npm install -g @commercetools/cli)` / `FAIL` under strict; else spawn, capture stdout+stderr into `.verify-logs/<id>.log` (mkdir -p), measure seconds, `PASS`/`FAIL`.
  * `seq` steps run each command in order and stop at the first failure.
  * print the table at the end: `step  status  seconds` plus the path of the log of each FAIL; exit 1 when any FAIL (also stop early with `--fail-fast`).
- [x] 4.3 Test `tools/test/verify-steps.test.mjs`: with a fake `scriptsOf` (admin-app has `verify`, service has typecheck+test, mcp null, puck has verify): `buildSteps({}, ...)` gives admin-app `seq` of one `yarn run verify`, service `seq` of typecheck then test, mcp `skip` 'no package.json'; `--strict` adds `connect-validate`, `--require-empty-pending` for forbidden and `--strict` for hygiene; `--install` adds `service:install` with `--frozen-lockfile` and `puck:install` with `--immutable`, `mcp:install` with `--frozen-lockfile`; every install command starts with `yarn`; `--only spdx` keeps only spdx; `--skip puck` drops puck steps.
- [x] 4.4 Root `package.json` scripts (replace A's `verify`): 
  ```json
  "verify": "node tools/verify.mjs",
  "verify:strict": "node tools/verify.mjs --strict",
  ```
  keep `verify:service` (spec H) untouched; keep `install:all`, `build`, `typecheck`, `lint`, `test`, `test:e2e` from A. Add `.verify-logs/` to the root `.gitignore`.
- [x] 4.5 Run: `yarn verify --only tools,spdx,forbidden,legacy-calls,hygiene,connect-contract` -> six `PASS` rows, exit 0 (this subset needs no installs). Then `yarn verify --install` (needs network; first run 10+ minutes) -> all apps `PASS`; record the table in the PR notes.
  Done when: both runs exit 0; `ls .verify-logs` shows one log per executed step.

Pitfalls: `yarn run verify` inside `admin-app` is K's long chain (including `build`); that is intended. Do not put secrets in step output; the logs are git-ignored but may be shared. On Windows use WSL (Node `spawnSync('yarn')` needs `yarn.cmd`; not supported natively).
Rollback: restore A's `verify` line; delete the two scripts and the test.

## 5. Connect validate and the app test conventions

Context: Connect itself is the CI. Every Connect app must satisfy the same script contract, and the one authoritative check is the CLI.

- [ ] 5.1 Install the CLI and try it: `npm install -g @commercetools/cli && commercetools --version`; then `commercetools connect validate .` from the repo root (Docker running; 15 min first run). Record: (a) whether it required `commercetools auth login` (answers Q-O2; if it does, note in `tools/release/README.md` step 1 and manual M-05), (b) duration, (c) output summary. Done when: it exits 0 (fix findings in the owning spec's files, not here).
- [ ] 5.2 Per-app test command check (documentation + proof): from `service/` run `commercetools connect application test` (expected: runs `yarn test`/jest offline and exits 0), from `mcp/` the same (`yarn test`), and note that `admin-app` is a Merchant Center custom application: its tests run through `yarn test` and the Connect build, `connect application test` may be unsupported for that app type (record the actual CLI message; L's A5 step has the same note).
- [x] 5.3 Write the conventions into `tools/release/README.md` section "Connect conventions" (the file is created in 6.4): each `service`/`mcp` app has `build`, `gcp-build` (Connect's build entry), `start`, `test`, `typecheck`, `lint`; lifecycle scripts `connector:post-deploy` / `connector:pre-undeploy`; Node 22; no workspaces; `commercetools connect application test` must pass offline; `commercetools connect validate .` is mandatory before `connectorstaged create`.
- [x] 5.4 Wire `verify --connect` / `--strict` behaviour already covered by 4.1/4.2; test it: `yarn verify --only connect-validate --connect` -> PASS (or SKIP with the install hint when the CLI is absent).

Pitfalls: first `validate` run pulls several GB of build images; do not run it on a metered connection. `connect validate` also runs static analysis and a dependency scan: HIGH/CRITICAL advisories fail it (fix in the owning app by upgrading or `resolutions`).
Rollback: none (read-only commands).

## 6. Release tooling

Context: puck packages are published to npm from a maintainer's machine using spec I's scripts; the repository state is tagged `v<version>`; the owner pushes (checkpoint CP-3 of spec R). Pre-condition: Section 4 and spec I.

- [x] 6.1 Create `tools/release/versions.mjs`:
  ```js
  import { readFileSync, readdirSync, existsSync } from 'node:fs';
  import { join } from 'node:path';

  export const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

  /** Every package.json that carries the release version: root, puck packages, service, admin-app, mcp (+ playground if versioned). */
  export function versionFiles(root) {
    const files = ['package.json', 'service/package.json', 'admin-app/package.json', 'mcp/package.json'];
    const pk = join(root, 'puck/packages');
    if (existsSync(pk)) for (const d of readdirSync(pk).sort()) files.push(`puck/packages/${d}/package.json`);
    return files.filter((f) => existsSync(join(root, f)));
  }

  export function collectVersions(root) {
    return versionFiles(root).map((f) => ({ file: f, version: JSON.parse(readFileSync(join(root, f), 'utf8')).version }));
  }

  /** { ok, version, problems[] } - lockstep + semver. */
  export function checkLockstep(entries) {
    const problems = [];
    const versions = new Set(entries.map((e) => e.version));
    for (const e of entries) if (!SEMVER.test(String(e.version))) problems.push(`${e.file}: invalid version "${e.version}"`);
    if (versions.size > 1) for (const e of entries) problems.push(`${e.file}: ${e.version}`);
    return { ok: problems.length === 0, version: [...versions][0], problems };
  }

  export const distTag = (version) => (version.includes('-') ? 'next' : 'latest');
  ```
- [x] 6.2 Create `tools/release/preflight.mjs`: (1) run `node tools/verify.mjs --strict` (inherit stdio; fail if non-zero); (2) `collectVersions` + `checkLockstep` (print the problems); (3) print `release version: <v>`, `dist-tag: <next|latest>`, `tag: v<v>`; (4) if `.git` exists: `git status --porcelain` must be empty (else `git tree is not clean`), and `git rev-parse --abbrev-ref HEAD` printed; if no `.git` print `warning: not a git repository (R creates the release repository)` and continue. Exit 1 on any failure; final line `preflight: OK`.
- [x] 6.3 Create `tools/release/tag.mjs` (supports release candidates `v1.0.0-rc.N` and iterating on them):
  ```js
  // usage: node tools/release/tag.mjs <version | --next-rc> [--execute]
  //   --next-rc : base = lockstep version without prerelease part; find existing tags `v<base>-rc.*` (git tag -l) and use rc.(max+1), starting at rc.0.
  import { spawnSync } from 'node:child_process';
  import { createInterface } from 'node:readline/promises';
  import { collectVersions, checkLockstep, SEMVER } from './versions.mjs';
  // 1. version must match SEMVER (so `1.0.0-rc.3` is valid) and equal the lockstep version (bump first: `yarn release:puck:bump 1.0.0-rc.3`).
  // 2. tag = `v${version}`; message = `Contentools ${version}`.
  // 3. dry run (default): print
  //      git tag -a v1.0.0 -m "Contentools 1.0.0"
  //      git push origin v1.0.0        # run by the owner at checkpoint CP-3, not by this script
  //    and exit 0 without touching git.
  // 4. --execute: require .git, clean tree (`git status --porcelain` empty else exit 1 "git tree is not clean"),
  //    run preflight (spawn node tools/release/preflight.mjs; non-zero -> exit 1),
  //    refuse if the tag already exists (`git rev-parse -q --verify refs/tags/<tag>`),
  //    ask the operator to type the tag name exactly, then run `git tag -a <tag> -m <message>`. NEVER run git push.
  ```
  Iteration rule (owner decision): Connect is tested from the SAME public repository using `v1.0.0-rc.N` tags. After the repo is public (right after R's gate) fix commits are allowed ONLY when the labs gate is clean on the new commit; squashing/recreating the repository is reserved for leaks. Each fix -> `yarn verify:strict` -> gate (R) -> bump to the next rc -> `tag.mjs --next-rc --execute` -> the owner pushes the tag -> `connectorstaged create --repository-tag v1.0.0-rc.N` (or redeploy with the new tag). Tags are never moved or deleted once pushed.
  Implement the pure parts (`planTag(version, lockstep)` returning the commands/errors) separately so they can be tested.
- [x] 6.4 Create `tools/release/README.md` (the runbook; numbered, each with the exact command):
  1. `yarn verify:strict` (needs Docker + `commercetools` CLI; record date/CLI version).
  2. Choose the version: first `1.0.0-rc.0` (dist-tag `next`), then `1.0.0`.
  3. Bump all packages (lockstep): `yarn release:puck:bump 1.0.0-rc.0` (spec I script; also bump the root, `service`, `admin-app`, `mcp` versions to the same value with `yarn version --new-version <v> --no-git-tag-version` in each; `release/versions.mjs` verifies).
  4. `node tools/release/preflight.mjs`.
  5. Commit the bump (local scratch repo only; R produces the single public commit).
  6. Dry run publish: `yarn release:puck:publish` (prints 10 `npm publish --dry-run`).
  7. OWNER CHECKPOINT CP-1 (spec R): show preflight and dry-run output, wait for approval.
  8. Publish: `yarn release:puck:publish --execute` (I's safeguards: clean tree, `npm whoami`, typed confirmation; prerelease -> `--tag next`).
  9. Point `admin-app` at the rc (K/L), rebuild, run spec Q.
  10. Final: bump to `1.0.0`, preflight, publish `--execute` (dist-tag `latest`).
  11. Tag: `node tools/release/tag.mjs 1.0.0` (dry run), then `--execute`. For Connect testing use release candidates: `node tools/release/tag.mjs --next-rc` (dry run) then `--execute` creates `v1.0.0-rc.N`.
  12. Owner pushes: `git push origin v1.0.0-rc.N` / `v1.0.0` (CP-3 in spec R). The repository is public from R's gate onward; Connect is tested from this same repo with rc tags; later fixes are normal commits allowed only when the gate is clean (squash only for leaks); then bump, verify:strict, next rc tag.
  13. Connect: `commercetools connect connectorstaged create --repository-url <url> --repository-tag v1.0.0 --creator-email <email> --name contentools` (spec H README, manual M-05); `deployment create` per region.
  14. Rollback: never `npm unpublish`; `npm deprecate @commercetools-labs/<pkg>@<version> "<reason>"`, publish a patch; delete an unpushed local tag with `git tag -d v<version>`.
  Plus the "Connect conventions" section from 5.3 and the explicit statement "There is no CI in this repository; `yarn verify:strict` is the gate."
- [x] 6.5 Root `package.json` scripts: `"release:puck:bump": "yarn --cwd puck release:bump"`, `"release:puck:publish": "yarn --cwd puck release:publish"`, `"release:preflight": "node tools/release/preflight.mjs"`, `"release:tag": "node tools/release/tag.mjs"`. (`yarn release:puck:publish --execute` forwards `--execute`.)
- [x] 6.6 Tests: `tools/test/release-versions.test.mjs` (lockstep ok/drift; invalid semver; `distTag('1.0.0-rc.0') === 'next'`, `distTag('1.0.0') === 'latest'`), `tools/test/release-tag.test.mjs` (`planTag('1.0.0', ...)` yields the two commands; `nextRc('1.0.0', ['v1.0.0-rc.0','v1.0.0-rc.1'])` returns `1.0.0-rc.2` and `nextRc('1.0.0', [])` returns `1.0.0-rc.0`; and never contains `git push` as an executed command; mismatching version errors; dirty tree error via an injected `git` runner).
  Command: `yarn test:tools` -> pass.
- [x] 6.7 Smoke: `yarn release:puck:publish` (dry run; needs a prior `cd puck && yarn build`) prints 10 dry-run results and publishes nothing; `node tools/release/tag.mjs 1.0.0` prints the two commands and `git tag -l v1.0.0` (in a scratch repo) is empty. Done when both behave so.

Pitfalls: never run `--execute` of the publish script from this task (that is spec R's checkpoint). Do not add `npm publish` anywhere in O. If versions are intentionally different for the playground (private), exclude it from `versionFiles` (it is not listed).
Rollback: delete `tools/release/`, the four scripts and their tests.

## 7. Verification and Definition of Done

- [x] 7.1 `yarn test:tools` -> pass (all new tests).
- [x] 7.2 `yarn verify` -> table all `PASS` (apps may `SKIP` only if their owning spec is not implemented yet); exit 0.
- [ ] 7.3 `yarn verify:strict` (Docker + CLI present) -> all `PASS`, no `SKIP`, `forbidden` reports `0 pending`; exit 0. Record date, CLI version, duration. If it cannot run here (no Docker), record "not run: no Docker" and R must run it.
- [x] 7.4 Negative proofs (scratch copies only): create an empty-file folder `service/src/_pending/x.ts` -> `yarn check:hygiene` passes but `node tools/check-repo-hygiene.mjs --strict` and `yarn verify:strict` fail with `no _pending folder at release` (delete it afterwards); add `.github/workflows/a.yml` -> `yarn check:hygiene` fails; put a token-shaped string into a scratch source file -> hygiene fails without echoing it; move a `*_TOKEN` key to `standardConfiguration` in a scratch `connect.yaml` -> `check:connect` fails; make `service/package.json` version differ -> `node tools/release/preflight.mjs` fails with the drift list.
- [x] 7.5 `ls .github 2>&1` -> "No such file or directory".

Definition of Done (scenario mapping): Green run / one failure does not hide others / per-app contract / strict skip / pending must be empty / installs explicit / no hosted CI -> 4.x, 7.2, 7.3, 7.5. Secret in wrong section / folder missing / missing start script / L's checker / CLI missing -> 3.x, 5.x. Version drift / prerelease tag rule / dry run default / dirty tree refused / wrappers / runbook -> 6.x, 7.4. Workflow file added / env file / token committed / help text -> 2.x, 7.4. `openspec validate o-ci-cd-and-release --strict` passes.
