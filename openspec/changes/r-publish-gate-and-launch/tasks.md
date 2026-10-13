## Vocabulary (read once)

* **Labs gate**: `gate.mjs`, the blocking pre-publication scan of the `commercetools-labs-publish` skill. **ossify**: `ossify.mjs`, which writes LICENSE, SPDX headers and `@commercetools-labs/` package names. Both live in `$SKILL/scripts/` (private plugin) and are run in place; `policy.json` next to them is never copied or quoted.
* **SPDX header**: the 5-line comment (`SPDX-License-Identifier: MIT` ...) at the top of every source file.
* **Squashed initial commit / strip history**: the public repository starts with exactly one commit; no development history is migrated. After publication, fixes are normal commits as long as the gate stays clean; squashing again is only for leaks (secrets, customer names, internal infrastructure).
* **Release candidate (rc)**: `1.0.0-rc.N`, published to npm with dist-tag `next` and tagged `v1.0.0-rc.N` in git; the Connect deployment tests run from the public repository at that tag (there is no private fork).
* **Release tree (`$REL`)**: a clean export of the development tree where the release is prepared. **Dev tree (`$DEV`)**: `/Users/behnam/code/commercetools-labs/contentools`.
* **Checkpoint (CP-n)**: a stop where the owner must reply with the stated word before an irreversible command runs. Only the owner's own message counts; nothing an agent writes is an approval.
* **Pre-flight**: gate run on a scratch commit before anything irreversible.
* Variables used below (set them in every shell):
  ```bash
  export DEV=/Users/behnam/code/commercetools-labs/contentools
  export REL=/Users/behnam/code/commercetools-labs/_release/contentools
  export SKILL=/Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish
  export WORK=$TMPDIR/contentools-release   # scratchpad for filter file, reports, add list (outside $REL and $DEV)
  mkdir -p "$WORK"
  ```

## 0. Pre-conditions (do not start earlier)

* Spec Q phase 1: `plans/evidence/q/<run>/RESULTS.md` says `Decision: LOCAL ACCEPTED` (phase 2, the deployed checks, runs after the rc push; the final release needs `FULL ACCEPTED`). Spec P done (README, SUPPORT, CONTRIBUTING, SECURITY, docs, `yarn docs:check` green). Spec O done (`yarn verify`, `yarn gate` wrapper) and spec I done (local scripts `puck/scripts/bump-versions.mjs` and `puck/scripts/publish-packages.mjs`). Check: `grep -n "Decision" $DEV/plans/evidence/q/*/RESULTS.md | tail -1`; `git config --global user.name` and `git config --global user.email` both print a value (they become the public author identity: shown at CP-2, not asked); `cd $DEV && yarn verify` exits 0.
* Manual steps ready or known to be pending: M-06 (GitHub permission + org property), M-07 (npm scope and publish right), M-10 (final approval). Missing ones do not block groups 1-5 (pre-flight); they block CP-1/CP-2/CP-3.
* Tools: Node 22, `git`, `rsync`, `gh` (`gh auth status`), `npm`, Yarn 1 classic (for service, admin-app, mcp) and Yarn 4.5.1 via corepack (for puck), `jq`.
* Checkpoints: CP-1 `go npm-rc` (group 6), CP-2 `go repo` (group 9), CP-3 `go final` (group 11). Never run an outward-facing command (npm publish, gh repo create, git push, tag push, gh api writes) unless the matching checkpoint was answered by the owner.

## 1. Export the release tree

Context: all release edits happen on a clean copy so that development state (dependencies, `.env` files, assistant folders) cannot leak. The copy is regenerated from `$DEV` every time something changes, so fixes are always made in `$DEV`.

- [ ] 1.1 Create `$WORK/rsync-filter.txt` with the text of `design.md` Appendix A. Done when `wc -l $WORK/rsync-filter.txt` prints 22.
- [ ] 1.2 Create `$WORK/rebuild.sh` from design Appendix B (`chmod +x`). It exports, runs ossify `--apply`, makes a scratch commit and runs the gate. Done when `bash -n $WORK/rebuild.sh` prints nothing.
- [ ] 1.2b Create `$WORK/update-release.sh` from design Appendix B2 (used only after the first push, group 10). Done when `bash -n $WORK/update-release.sh` prints nothing.
- [ ] 1.3 Export only (before ossify) to inspect: `mkdir -p $REL && rsync -a --delete --filter="merge $WORK/rsync-filter.txt" $DEV/ $REL/`. Expected: exit 0. Check the exclusions: `find $REL -name ".env*" -not -name ".env.example"` prints nothing; `find $REL \( -name node_modules -o -name build -o -name dist -o -name plans -o -name .claude \) -prune -print` prints nothing; `ls -a $REL` shows `connect.yaml service admin-app mcp puck docs tools openspec README.md LICENSE?` (LICENSE may already exist from spec A; ossify rewrites it).
- [ ] 1.4 Third-party license files: `find $REL -iname 'LICENSE*' -o -iname 'LICENCE*' -o -iname 'COPYING*' | grep -v "^$REL/LICENSE$"`. Expected: no output. **If `service/LICENSE` (or any other) is listed: delete it in `$DEV` (`rm $DEV/service/LICENSE`), re-run 1.3.** Reason: a LICENSE in a subdirectory makes ossify skip the whole directory (no SPDX headers written) and makes the gate print `third-party subtree` FAIL. Also check inside npm package folders: `puck/packages/*/LICENSE` must not exist in git (spec I currently plans to commit one per package: that is the conflict described in design D-6; if present, stop and get spec I fixed, the publish script copies the root LICENSE at pack time instead).
- [ ] 1.5 Forbidden tracked-file names: `find $REL \( -name ".npmrc" -o -name "*.pem" -o -name "*.key" -o -name "*.p12" -o -name "service-account*.json" -o -name ".env" -o -name ".env.local" \) -not -path "*/node_modules/*"`. Expected: no output.

Pitfalls: `rsync` needs the trailing slashes exactly as written. Do not add `--delete-excluded`: it would remove `node_modules` from `$REL` and force re-installs after every export. Do not export with `--exclude cms/` (not needed: spec C removed those folders).

Rollback: `rm -rf $REL` (nothing else is touched).

## 2. ossify: dry run, read the report, apply

Context: `ossify.mjs` prints a report; its exit code is always 0, so a refusal is only visible if you read it. It does three things: (1) `LICENSE` (MIT), (2) the SPDX header in each source file (`.ts .tsx .js .jsx .mjs .cjs .mts .cts .css .scss .java .kt .kts .sh` ...), (3) renames package.json names to `@commercetools-labs/<name>` and repoints GitHub URLs to the `commercetools` org. It never touches `.json`, `.md`, `.yaml`, lockfiles, binaries; skips `node_modules public dist build coverage .git ...` and generated paths.

- [ ] 2.1 Dry run: `node $SKILL/scripts/ossify.mjs --repo $REL --year 2026 | tee $WORK/ossify-dry.txt`. Read the whole report. **Expected in a healthy tree**: `0 package.json renamed`, `0 headered` (all files already carry the header from spec A's tooling), `0 FOREIGN COPYRIGHT — refused`, no "THIRD-PARTY DIRECTORIES EXCLUDED" section, `no comment style` listing only files that need no header (`.html`, `.example`, `.env.example`, `.nvmrc` ...).
- [ ] 2.2 Resolve non-zero items, always in `$DEV`, then re-export (1.3) and re-run 2.1:
  * `headered > 0`: a source file lacks the header (new file, or spec A missed it). Run the project's header tool (spec A) or apply ossify's output by copying the changed files back: simplest is `node $SKILL/scripts/ossify.mjs --repo $DEV --apply --year 2026` on `$DEV` (it only adds missing headers and fixes names) after you have committed or backed up `$DEV`; check `diff -rq` afterwards.
  * `renamed > 0`: a `package.json` has an unscoped or other-scope name (also in test fixtures). Fix the name in `$DEV`.
  * `THIRD-PARTY DIRECTORIES EXCLUDED: <dir> (has its own LICENSE file)`: delete that LICENSE in `$DEV` (task 1.4). If the directory really is third-party code, STOP and ask the owner: we must not relicense someone else's work.
  * `FOREIGN COPYRIGHT — refused: <file>` with a claim like `copyright: string;`: ossify's pattern matches the identifier `copyright` (case-insensitive) in the first 2000 characters and refuses. Known files: `puck/packages/puck-components/src/components/<folder>/FooterBlock.tsx`, `puck/packages/puck-editor/src/components/<folder>/FooterBlock.tsx` and the footer sample under `service/src/samples/`. Add the exact 5-line header block at the very top of each such file in `$DEV`:
    ```
    /*
     * SPDX-License-Identifier: MIT
     * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
     * Freely available, AS IS and UNSUPPORTED. See LICENSE.
     */
    ```
    (the first "Copyright" match in the file is then ours, which is also what the gate checks). A real third-party notice (a name that is not commercetools, in a code header) means STOP and ask.
- [ ] 2.3 Apply: `node $SKILL/scripts/ossify.mjs --repo $REL --apply --year 2026 | tee $WORK/ossify-apply.txt`. Expected: same numbers as the dry run (all zero/"already"), `$REL/LICENSE` rewritten. Check: `head -3 $REL/LICENSE` prints `MIT License`, blank line, `Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors`; `diff <(cd $DEV && cat LICENSE) $REL/LICENSE` shows no difference (otherwise copy `$REL/LICENSE` to `$DEV/LICENSE` so both agree).
- [ ] 2.4 Spot check a headered file: `head -6 $REL/service/src/index.ts` shows the block header, then code. Check the shebang file (if any): `grep -l '^#!' -r $REL --include=*.mjs --include=*.sh --include=*.cjs | head -3 | xargs -n1 head -3` shows the shebang on line 1 and the header after it.

Pitfalls: ossify is idempotent (it skips files with an SPDX line in the first 800 characters) but it treats any directory with a LICENSE as third-party EVERY time: never run it after the release script copied LICENSE files into package folders (they are git-ignored but physically present). `rebuild.sh` re-exports first (the copies disappear because they are not in `$DEV`).

Rollback: delete `$REL` and re-export; nothing in `$DEV` is changed by `--repo $REL`.

## 3. Content hygiene before the gate

- [ ] 3.0 Staging and lockfile pre-checks (not covered by the gate): `test ! -e $REL/service/src/_pending && echo no-pending` prints `no-pending` (**`service/src/_pending/` must not exist at release**: it is the porting area of specs F/G; if it exists, the port is unfinished: stop and report to spec F/G, do not delete files to make the check pass); `ls $REL/service/yarn.lock $REL/admin-app/yarn.lock $REL/mcp/yarn.lock $REL/puck/yarn.lock` lists all four; `find $REL -name package-lock.json -not -path '*/node_modules/*'` prints nothing (**Yarn everywhere: no package-lock.json**; service, admin-app, mcp are Yarn 1 classic, puck is Yarn 4.5.1: `grep -n packageManager $REL/puck/package.json` shows `yarn@4.5.1`, and the three apps have no `packageManager` field or a Yarn 1 one); `find $REL -path '*/node_modules' -prune -o -name '_pending' -print` prints nothing.
- [ ] 3.1 Community files: `ls $REL/{LICENSE,SUPPORT.md,CONTRIBUTING.md,README.md,SECURITY.md,.gitignore,.nvmrc}` all exist (the gate FAILs on missing `LICENSE`, `SUPPORT.md`, `CONTRIBUTING.md`; the rest are ours). `sed -n 1,10p $REL/README.md` shows the UNSUPPORTED banner; `grep -ci unsupported $REL/SUPPORT.md` >= 1; `grep -rl "UNSUPPORTED" $REL/service/src | head -1` shows a source file with the header. This is "unsupported x3".
- [ ] 3.2 Not published: `ls $REL | grep -E "^(plans|\.claude|\.cursor|\.github)$"` prints nothing; `ls $REL/openspec` shows `specs` and `config.yaml` only: **`plans/**` and `openspec/changes/**` are never published** (the export filter excludes them; they cite internal source paths and planning wording). If the scratch gate later flags `openspec/specs/**` and rewording is not enough (R-Q1), add `- openspec/` to the filter.
- [ ] 3.3 Local docs/CI-free checks in the tree: `cd $REL && node tools/check-docs-lint.mjs && node tools/check-docs-config.mjs && node tools/check-docs-postman.mjs`. Expected: three `ok` lines.
- [ ] 3.4 Vocabulary grep on the release tree (case-insensitive, text files only): `cd $REL && git grep -I -n -i -E "\bcms\b|multi-?tenan|firestore|cloud run|authenticate-project|x-project-key|\.run\.app|ct-poc|commercetools-demo" -- . 2>/dev/null || grep -rIn -i -E "\bcms\b|multi-?tenan|firestore|cloud run|authenticate-project|x-project-key|\.run\.app|ct-poc|commercetools-demo" --exclude-dir=node_modules --exclude-dir=.git .`. Expected: no output (the `grep -r` fallback is used because `$REL` has no git repository yet). Each hit is fixed in `$DEV` (or, for a legitimate mention, reported to the owning spec). Note the gate does not search for most of these words; this grep is stricter on purpose. Also look for folder/file names: `find $REL -iname "*cms*" -not -path "*/node_modules/*"` prints nothing.
- [ ] 3.5 Secrets sanity (the gate repeats it): `grep -rIn -E "ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|BEGIN [A-Z ]*PRIVATE KEY|client_secret[\"']?\s*[:=]\s*[\"'][^\"']{8,}" --exclude-dir=node_modules $REL | head`. Expected: no output (test fixtures with obviously fake values must not look like keys: rename them).

## 4. Local verification of the release tree

Context: the skill's rule "prove it runs after the scrub" starts here (cheap) and ends with the anonymous clone (definitive).

- [ ] 4.1 `cd $REL && for a in service admin-app mcp; do yarn --cwd $a install --frozen-lockfile || break; done && yarn --cwd puck install --immutable && yarn verify` (service, admin-app and mcp are Yarn 1 classic projects, puck is Yarn 4.5.1). Expected: every install exits 0 (a `--frozen-lockfile`/`--immutable` failure means a lockfile is out of date: regenerate it in `$DEV` with the app's own package manager, then re-export) and `yarn verify` exits 0. This creates `node_modules` and build output inside `$REL`; they are git-ignored (checked in 5.1).
- [ ] 4.2 `commercetools connect validate` from `$REL` -> passes (skip with a note if the CLI is not installed).
- [ ] 4.3 Run the spec Q cheap subset against the release build if time allows: start the service from `$REL/service` and run `tools/e2e/acceptance.sh` (cleanup after). Expected `fail=0`.

## 5. Pre-flight: scratch commit and gate (fix loop)

Context: the gate refuses a dirty tree, scans the commit it names plus ancestors, prints at most 15 findings per group, FAILs cannot be acknowledged, WARNs block until `--ack`. Pre-flight finds everything before any irreversible command. Behaviour reference: `explore.md` section 3.

- [ ] 5.1 Create the scratch commit and run the gate: `cd $REL && rm -rf .git && git init -q -b main && git add . && git -c user.name=release -c user.email=release@localhost commit -qm scratch && node $SKILL/scripts/gate.mjs --repo $REL | tee $WORK/gate-preflight.txt`. (Or just `$WORK/rebuild.sh`.) Check the header lines: `commit <sha8>  scratch`, `history 1 commit(s)`, `files <N>`. Check ignored output is really ignored: `git -C $REL status --porcelain` prints nothing.
- [ ] 5.2 Read every finding. Use design Appendix F to decide the fix. **Fix in `$DEV`, never only in `$REL`**, then run `$WORK/rebuild.sh` again (re-export, ossify, scratch commit, gate). Repeat until `0 failure(s)`. If a group shows "... and N more", fix the 15 shown and re-run: the rest appear.
- [ ] 5.3 WARN review: when only WARNs remain the gate prints `BLOCKED on warnings`. Print them again into a file (`node $SKILL/scripts/gate.mjs --repo $REL > $WORK/gate-warn.txt`), read each (they are `name (review)` and `demo framing`). Fix by rewording in `$DEV` where possible (use "reference implementation", not "demo"/"POC"/"pre-sales"). A WARN that is a legitimate use (for example the word "demo" inside a quoted product name that is not ours) may be acknowledged: write one line per remaining WARN (path:line + reason) in `$WORK/release-notes.md` (outside the repo; do NOT paste matched text that may be a name). Only then run `node $SKILL/scripts/gate.mjs --repo $REL --ack`; expected last line `CLEAR (warnings acknowledged).` and exit code 0. Remember: `--ack` is global, it never clears a FAIL.
- [ ] 5.4 Final pre-flight state: `gate` prints `0 failure(s), 0 warning(s)` (or only acknowledged ones) and `CLEAR`. Save `$WORK/gate-preflight.txt`, the tarball-relevant file list `git -C $REL ls-files | wc -l`. Done when exit code is 0.

Pitfalls: the gate runs on the COMMITTED tree: editing `$REL` after the commit makes the tree dirty (exit 2) and the fix would be lost on the next export anyway. Do not use `--no-history` for the final run (here history is one commit, so it makes no difference, but the habit matters). The gate prints `match:` text; keep outputs local.

Rollback: `rm -rf $REL/.git`.

## 6. npm publish of the puck release candidate (first irreversible step)

**STOP: CP-1.** Send the CP-1 message (design Appendix D): the pre-flight gate result, the package list and versions (`for p in $REL/puck/packages/*; do jq -r '.name+"@"+.version' $p/package.json; done`), the order, the tag `next`, the dry-run listings. Wait for the owner's `go npm-rc`. M-07 must be satisfied (`npm whoami` works with publish rights on the `@commercetools-labs` scope; the owner runs `npm login`; the packages are **public** packages: `--access public`, which the publish script passes).

Context: packages reference each other with `workspace:^`; `yarn pack` rewrites that to a real range, plain `npm publish` does not. `puck/scripts/publish-packages.mjs` (spec I) does it correctly: topological order, `yarn pack`, `npm publish <tgz> --access public --tag <next|latest>` (prerelease versions go to `next`), dry run by default, `--execute` only with a clean git tree, `npm whoami`, equal versions, `dist/` present and a typed confirmation, npm asks the OTP itself, already-published versions skipped.

- [ ] 6.1 Version: all ten packages share one version (lockstep). In `$DEV` set the release candidate: `node puck/scripts/bump-versions.mjs 1.0.0-rc.0 --dry-run`, then without `--dry-run` (it prints `name: old -> new` x10 and updates the playground; later candidates are `1.0.0-rc.1`, ...). Redo groups 1-5 (the tree changed) until the pre-flight gate is clear again. Check: `for p in $REL/puck/packages/*; do jq -r .version $p/package.json; done | sort -u` prints one line `1.0.0-rc.N`.
- [ ] 6.2 Dry run (default mode, no network write): `cd $REL/puck && yarn install --immutable && yarn build && node scripts/publish-packages.mjs | tee $WORK/publish-dryrun.txt`. Expected: for each of the ten packages an `npm publish --dry-run` output with the tarball file list and `tag next`, exit 0. Check the order is a valid dependency order: `grep -oE "@commercetools-labs/puck-[a-z-]+@1\.0\.0-rc\.[0-9]+" $WORK/publish-dryrun.txt | awk '!s[$0]++' | sed -E 's/@1\.0\.0-rc\.[0-9]+//' > $WORK/order.txt; node -e "const fs=require('fs');const o=fs.readFileSync(process.argv[1],'utf8').trim().split('\n');for(const n of o){const d=Object.keys(JSON.parse(fs.readFileSync('packages/'+n.split('/')[1]+'/package.json','utf8')).dependencies||{}).filter(x=>x.startsWith('@commercetools-labs/puck-'));for(const x of d)if(o.indexOf(x)>o.indexOf(n)){console.error('BAD ORDER',n,'before',x);process.exit(1)}}console.log('order ok',o.length)" $WORK/order.txt` (run from `$REL/puck`). Expected: `order ok 10`. If the order is wrong, fix spec I's script in `$DEV` and redo groups 1-5.
- [ ] 6.3 Inspect each tarball (from the dry run output, or pack manually: `cd $REL/puck/packages/<p> && cp $REL/LICENSE . && yarn pack --filename $WORK/<p>.tgz; rm LICENSE`): `tar -tzf $WORK/<p>.tgz | grep -E "package/(LICENSE|README.md|package.json)"` shows all three; `tar -xOzf $WORK/<p>.tgz package/package.json | jq '{name,version,dependencies,peerDependencies}'` shows real ranges, **no `workspace:`**, names `@commercetools-labs/...`. If LICENSE is missing from the tarball, the copy step of the publish script is missing (design D-6 conflict): fix in `$DEV`, redo groups 1-5. `git -C $REL status --porcelain` must print nothing afterwards.
- [ ] 6.4 Publish (only after `go npm-rc`): `cd $REL/puck && node scripts/publish-packages.mjs --execute`. Type `publish 1.0.0-rc.N` when asked; the owner must be present for the npm one-time password prompts (10 times). Do not automate the OTP. Expected: ten `+ @commercetools-labs/<p>@1.0.0-rc.N` lines (already published ones print `skip ... (already on npm)`). On failure the script stops: fix the cause, run the same command again; never force.
- [ ] 6.5 Verify from the registry with no credentials: `mkdir $WORK/reg && cd $WORK/reg && npm init -y >/dev/null && npm_config_userconfig=/dev/null npm i @commercetools-labs/puck-page-manager@next @commercetools-labs/puck-content-manager@next @commercetools-labs/puck-theme-manager@next @commercetools-labs/puck-renderer@next @commercetools-labs/puck-image-picker@next --legacy-peer-deps && ls node_modules/@commercetools-labs` -> all ten appear (transitive). `for p in puck-types puck-api puck-editor; do npm view @commercetools-labs/$p@1.0.0-rc.N version license repository.url dist-tags; done` prints the rc version, `MIT`, the `commercetools/contentools` URL and `next`.
- [ ] 6.6 MCP npm package (only if spec N publishes it): same inspect-then-publish for `@commercetools-labs/contentools-mcp` after the puck packages, as a release candidate too. Skip with a note otherwise.

Pitfalls: published versions are permanent; a mistake costs another rc. The owner's npm 2FA may prompt for an OTP on each publish: `--otp` interactively, not stored. Never put a token into a file in `$REL`.

Rollback: none by unpublishing (breaks consumers). `npm deprecate @commercetools-labs/<p>@1.0.0-rc.N "<reason>"` and publish the next rc.

## 7. Pin admin-app to the published rc and regenerate its lockfile

Context: Connect builds `admin-app` from its own folder (Yarn 1 classic, `yarn.lock`), so it needs registry versions and a lockfile with integrity hashes that exist only after group 6.

- [ ] 7.1 In `$DEV`: `cd $DEV/admin-app && yarn add --exact $(jq -r '.dependencies|keys[]|select(startswith("@commercetools-labs/puck-"))|.+"@1.0.0-rc.N"' package.json | tr '\n' ' ')` (this writes the rc version and updates `yarn.lock`; replace `N`). Check: `jq '.dependencies|with_entries(select(.key|startswith("@commercetools-labs")))' package.json` shows `"1.0.0-rc.N"` for each; `grep -c "workspace:" package.json` prints 0; `grep -c "file:" package.json` prints 0 (no local tarball resolutions left from spec K's dev loop); `ls package-lock.json` fails (Yarn only).
- [ ] 7.2 Same check for `mcp` and `service` if they depend on puck packages.
- [ ] 7.3 `cd $DEV && yarn verify` -> exit 0. Re-export and re-run groups 1-5 (`$WORK/rebuild.sh`). Expected: gate clear again; the only differences versus the pre-flight tree are the puck versions, `admin-app/package.json` and `admin-app/yarn.lock`.

## 8. Initial commit (one squashed commit), add-list review, gate

- [ ] 8.1 Fresh repository: `cd $REL && rm -rf .git && git init -b main`. Identity = the owner's global git identity: `git config user.name "$(git config --global user.name)" && git config user.email "$(git config --global user.email)"` (local copy; no question is asked, it is shown at CP-2).
- [ ] 8.2 Add list (the skill: "READ THIS before the real add"): `cd $REL && git add --dry-run . | sed -E "s/^add '(.*)'$/\1/" > $WORK/add-list.txt && wc -l $WORK/add-list.txt`. Review commands (tested):
  ```bash
  grep -nE '(^|/)(\.env($|\.)|node_modules/|build/|dist/|coverage/|plans/|\.claude/|\.cursor/|\.npmrc$)|\.(log|pem|key|tgz|p12)$|\.DS_Store' $WORK/add-list.txt | grep -v '\.env\.example$'
  ```
  Expected: no output. Then read the list with your own eyes: `sed -n 1,400p $WORK/add-list.txt` - top-level entries must be exactly: `.gitignore .nvmrc CONTRIBUTING.md LICENSE README.md SECURITY.md SUPPORT.md FEATURES.md INSTALL.md admin-app connect.yaml docs mcp openspec package.json puck service tools` (+ root lockfile / `.yarnrc.yml` if the hub has them). The four lockfiles must be present: `grep -cE "^(service|admin-app|mcp|puck)/yarn.lock$" $WORK/add-list.txt` prints 4, and `grep -E "package-lock.json" $WORK/add-list.txt` prints nothing. No `LICENSE` other than the root one: `grep -n "LICENSE" $WORK/add-list.txt` prints one line.
- [ ] 8.3 `git add . && git commit -F $WORK/commit-message.txt` where the file holds design Appendix E (the trailer line is the required attribution). Check: `git rev-list --count HEAD` prints `1`; `git log -1 --format='%an <%ae>'` equals the global identity; `git status --porcelain` prints nothing.
- [ ] 8.4 **Gate on the exact commit** (immediately before the push, no `--no-history`): `node $SKILL/scripts/gate.mjs --repo $REL | tee $WORK/gate-initial.txt`. Expected: `commit <sha8>  Initial public release of Contentools ...`, `history 1 commit(s)`, `0 failure(s)`, then `CLEAR.` (or `CLEAR (warnings acknowledged).` after `--ack` per 5.3 with the same reviewed warnings). Record the sha: `git -C $REL rev-parse HEAD | cut -c1-8 > $WORK/initial-sha8.txt`.
- [ ] 8.5 If the gate or anything else changes the tree before the first push: fix in `$DEV`, re-run groups 1-5 and 7, then 8 from scratch (`rm -rf .git` again; the commit is still unpublished, so re-creating it is fine). After the first push use group 10's update procedure instead.

## 9. Public repository, labs identification and the rc tag (second irreversible step)

Read-only preparation (no approval needed): `gh auth status` (token with `repo`); `gh api orgs/commercetools/properties/schema --jq '.[] | select(.property_name=="commercetools-labs") | .value_type'` prints `true_false` (if nothing, the later PATCH answers 422: ask an org admin, M-06); `gh repo view commercetools/contentools 2>&1 | head -1` says "Could not resolve" (if it exists, STOP and ask).

**STOP: CP-2.** Send the CP-2 message (design Appendix D) with the gate output, the add-list path, the commit message, the author identity printed from `git config --global`, the description text `Visual page builder for commercetools. commercetools-labs reference code: MIT, AS IS, UNSUPPORTED.`, and the commands below. Wait for `go repo`.

- [ ] 9.1 Create public (never private first, no private fork): `gh repo create commercetools/contentools --public --description "Visual page builder for commercetools. commercetools-labs reference code: MIT, AS IS, UNSUPPORTED."`. Expected: prints the URL. Do not pass `--source`/`--push`.
- [ ] 9.2 `cd $REL && git remote add origin git@github.com:commercetools/contentools.git && node $SKILL/scripts/gate.mjs --repo $REL | tail -3 && git push -u origin main`. The gate runs again right before the push (it refuses a dirty tree, so it proves nothing changed). Expected `CLEAR.` then `* [new branch] main -> main`. If the gate fails now: do NOT push; the repository exists but is empty: fix, redo group 8, push the new commit.
- [ ] 9.3 Mark as labs: `gh api -X PATCH repos/commercetools/contentools/properties/values -f 'properties[][property_name]=commercetools-labs' -f 'properties[][value]=true'` then `gh repo edit commercetools/contentools --add-topic labs`. Verify: `gh api repos/commercetools/contentools/properties/values --jq '.[]|select(.property_name=="commercetools-labs").value'` prints `true`; `gh repo view commercetools/contentools --json repositoryTopics --jq '.repositoryTopics[].name'` includes `labs`. A 422 means the org property is undefined (ask an org admin; the repository stays public and unmarked meanwhile).
- [ ] 9.4 Tag the release candidate: `git -C $REL tag -a v1.0.0-rc.N -m "Contentools 1.0.0-rc.N" && git -C $REL push origin v1.0.0-rc.N` (N equals the published puck rc). Compare: `git ls-remote https://github.com/commercetools/contentools.git refs/heads/main | cut -c1-8` equals `$(cat $WORK/initial-sha8.txt)`.

Pitfalls: private-then-flip is forbidden. `gh repo create` leaves no remote without `--source`: that is why 9.2 adds it.

Rollback: delete the repository right after the push if something is wrong (`gh repo delete commercetools/contentools --yes`, owner approval), fix, redo group 8-9. Do not force-push.

## 10. Phase B: anonymous proof, Connect tests from the same repository, fixes as normal commits

Context: nothing is private any more. The proof and the deployed tests run against what everybody can clone. A fix is a normal commit as long as the gate stays clean; the squash rule is only for leaks.

- [ ] 10.1 Put the proof script in the dev tree BEFORE group 8 (so it is part of the first commit): copy design Appendix C to `$DEV/tools/release/anonymous-proof.sh` (`chmod +x`; SPDX header already inside) and re-export. Done when `bash -n $DEV/tools/release/anonymous-proof.sh` is silent.
- [ ] 10.2 Anonymous clone proof of the rc: `REF=v1.0.0-rc.N EXPECT_COMMITS=1 bash $REL/tools/release/anonymous-proof.sh https://github.com/commercetools/contentools.git "$(cat $WORK/initial-sha8.txt)" $WORK/proof 2>&1 | tee $WORK/proof-output.txt`. Expected lines: `PASS commit <sha8> matches gated commit`, `PASS history has 1 commit(s)`, `PASS service-install` ... `PASS puck-build`, `PASS playground-build`, `PASS root-docs-check`, (`PASS connect-validate`) and `ANONYMOUS PROOF: PASS` (10-20 minutes; logs in `$WORK/proof/logs/`). Failures: read the log; a failure only in the clone is a scrub-induced breakage (a file excluded by the filter, a path that exists only in `$DEV`, a lockfile out of date, an unpublished registry version): fix in `$DEV`, then 10.5.
- [ ] 10.3 Gate on the clone: `node $SKILL/scripts/gate.mjs --repo $WORK/proof/clone` -> exit 0, `CLEAR.`
- [ ] 10.4 Connect tests from the public repository (spec Q phase 2, needs M-05): stage by tag: `commercetools connect connectorstaged create --repository-url https://github.com/commercetools/contentools --repository-tag v1.0.0-rc.N ...`, then deploy to a sandbox deployment, Merchant Center checks, redeploy, token rotation (Q groups 5 and 7). Results go to Q's RESULTS.md.
- [ ] 10.5 **Update procedure for any fix** (code, docs, config): (1) fix in `$DEV`; (2) `yarn verify` in `$DEV`; (3) run `$WORK/update-release.sh "<subject>"` (design Appendix B2): re-export, ossify, one normal commit with the owner's identity and the trailer, gate on HEAD (history now has several commits; the gate scans all of them); (4) only when the gate printed `CLEAR.`: `git -C $REL push origin main`; (5) when the Connect deployment must pick it up: new rc tag `v1.0.0-rc.N+1` (`git tag -a ... && git push origin <tag>`), then `connectorstaged setRepository` -> `publish` -> `deployment redeploy` with `updateConnector: true`; (6) if a puck package changed: bump (`bump-versions.mjs 1.0.0-rc.N+1`), repeat group 6 with a new `go npm-rc`, group 7, then (3)-(5). If the gate reports a FAIL in a commit that is already pushed and it is a leak (secret, customer name, internal host/identifier): this is NOT a normal fix; go to group 12.
- [ ] 10.6 Web check with the Chrome connector (read-only; skip with a note if the connector is unavailable): open `https://github.com/commercetools/contentools`; the README banner shows "UNSUPPORTED", topics include `labs`, license MIT, the commit count shows the expected number.
- [ ] 10.7 Registry check for the lockfile: `grep -A2 '"@commercetools-labs/puck-page-manager@' $WORK/proof/clone/admin-app/yarn.lock | head -4` shows the rc version and a registry `resolved` URL.

## 11. Phase C: final release 1.0.0 (CP-3)

Precondition: Q is `FULL ACCEPTED` on the last rc; the last rc commit has been gated and pushed; working tree of `$DEV` clean.

**STOP: CP-3.** Send the CP-3 message (design Appendix D) with `git diff --stat v1.0.0-rc.N` between the last rc tag and the intended final tree, the gate output of the final commit and the package list. Wait for `go final`.

- [ ] 11.1 In `$DEV`: `node puck/scripts/bump-versions.mjs 1.0.0` (after a `--dry-run`); `cd puck && yarn install --immutable && yarn build`; run the pre-flight via `$WORK/update-release.sh "Prepare 1.0.0"` WITHOUT pushing, gate must be `CLEAR.` (the commit stays local until 11.3).
- [ ] 11.2 Publish the final packages: `cd $REL/puck && node scripts/publish-packages.mjs` (dry run, tag `latest`, order check as in 6.2 with `1\.0\.0` only), then (after `go final`) `node scripts/publish-packages.mjs --execute`; type `publish 1.0.0`; the owner enters the OTPs. Expected ten `+ @commercetools-labs/<p>@1.0.0`. Verify: `npm view @commercetools-labs/puck-types dist-tags` shows `latest: '1.0.0'`; repeat 6.5 with `@1.0.0`.
- [ ] 11.3 Pin `admin-app` (and others) to `1.0.0`: as 7.1 with `@1.0.0`; `yarn verify` in `$DEV`; `$WORK/update-release.sh "Release 1.0.0"` (one normal commit on top of the "Prepare 1.0.0" commit; they may be merged with `git reset --soft HEAD~2 && git commit` before the push, since neither is public yet); gate `CLEAR.`; `git -C $REL push origin main`; `git -C $REL tag -a v1.0.0 -m "Contentools 1.0.0" && git -C $REL push origin v1.0.0`.
- [ ] 11.4 Settings and notes (covered by `go final`): `gh api -X PUT repos/commercetools/contentools/private-vulnerability-reporting` and verify `gh api repos/commercetools/contentools/private-vulnerability-reporting --jq .enabled` prints `true` (if forbidden: amend `SECURITY.md` through 10.5 so it does not promise a channel that does not exist and tell the owner); release notes: `gh release create v1.0.0 --title "Contentools 1.0.0" --notes-file $WORK/release-notes-public.md` (what it is, the unsupported notice, packages and versions, link to INSTALL.md; no internal names). Repository settings the owner may want (ask, do not assume): issues on, discussions/wiki off, no branch protection for labs repos.
- [ ] 11.5 Final proof: `REF=v1.0.0 EXPECT_COMMITS=0 bash $REL/tools/release/anonymous-proof.sh https://github.com/commercetools/contentools.git "$(git -C $REL rev-parse HEAD | cut -c1-8)" $WORK/proof-final` -> `ANONYMOUS PROOF: PASS`; `node $SKILL/scripts/gate.mjs --repo $WORK/proof-final/clone` -> `CLEAR.`; the Connect connector is re-staged from `v1.0.0` (`INSTALL.md` section 5) and a final health check passes.
- [ ] 11.6 Tidy: `rm -rf $WORK/proof*/home`; keep logs outside the repository; archive the OpenSpec changes P, Q, R in `$DEV` (they are not part of the published tree).

## 12. Failure handling summary

| Situation | Action |
| --- | --- |
| Gate FAIL or WARN before the first push | Fix in `$DEV`, redo groups 1-5, 8. A FAIL cannot be acknowledged. |
| npm publish of one package fails | Fix the cause, re-run the same `publish-packages.mjs --execute` (published ones are skipped). |
| Broken or wrong rc on npm | `npm deprecate`, publish the next rc (new `go npm-rc`); never rely on unpublish. |
| Ordinary defect after the push (build, text, config) | Normal fix commit through 10.5; the gate must be `CLEAR.`; new rc tag if Connect must pick it up. |
| Leak in any pushed commit (secret, customer or prospect name, internal host or identifier) | Stop. Rotate exposed secrets. Delete the repository (`gh repo delete commercetools/contentools --yes`, owner approval). Fix `$DEV`. Restart at group 8 with a new squashed initial commit; deprecate npm versions that contain the leak. A force-push does NOT remove the old commit from GitHub. |
| 422 on the property PATCH | Ask an org admin to define `commercetools-labs` (boolean); re-run 9.3. |
| Anonymous proof fails | Read the log, fix via 10.5 (or group 8 if nothing is public yet). |

## Verification summary

Scripted: `ossify` dry run shows zero refusals and zero third-party directories; add-list grep prints nothing; initial history is 1 commit; `gate.mjs` exit 0 on every commit that is pushed (HEAD plus all ancestors) and on the clones; `anonymous-proof.sh` PASS for the rc tag and for `v1.0.0`; `npm view` for the ten packages (rc under `next`, final under `latest`); `gh api` shows property `true` and topic `labs`. Browser (Chrome connector, when available): the repository page (task 10.6).

## Definition of Done (mapped to scenarios)

| Scenario (spec) | Evidence |
| --- | --- |
| Export contains no local secrets (publish-procedure) | tasks 1.3-1.5 outputs empty |
| Directory with its own LICENSE; Loose copyright refusal | tasks 1.4, 2.2: ossify dry run clean; `service` not excluded |
| Pending port area present; Plans and change notes excluded | tasks 3.0, 3.2 |
| Unsupported stated three times | task 3.1 |
| Add list reviewed; Initial commit is one commit with the owner's identity | tasks 8.1-8.3 |
| FAIL cannot be acknowledged; Dirty tree refused | tasks 5.1-5.3 (observed behaviour), 8.4 |
| Follow-up commits keep the gate clean; leak restarts history | tasks 10.5, group 12 |
| No go, no action | CP-1/2/3 messages and the owner's replies recorded in `$WORK/release-notes.md` |
| Tarball inspection; npm order; rc then final | tasks 6.2, 6.3, 11.2 |
| Property and topic present | task 9.3 |
| Each application / registry packages resolve (anonymous-clone-proof) | tasks 10.2, 11.5 logs all PASS; 10.7 |
| Hash equality; history count | tasks 9.4, 10.2 |
| Gate on the clone | tasks 10.3, 11.5 |
| Leak found | group 12 table |
