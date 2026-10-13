## Context

Publishing is the only irreversible part of the migration: commits stay fetchable by SHA, npm versions cannot be reused (release candidates are public too). The
publish skill gives the generic procedure; `explore.md` records what the two scripts really do (including two traps found by
experiment: ossify excludes a whole directory that carries a LICENSE, and refuses files that merely contain the identifier
`copyright`). This design fixes the order of operations for this repository (Yarn, four parts, ten npm packages with workspace
dependencies, an admin app that must install them from the registry, no CI).

Paths: `$SKILL` = `/Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish`
(scripts `ossify.mjs`, `gate.mjs`, data `policy.json` - read in place, never copied). `$DEV` = `/Users/behnam/code/commercetools-labs/contentools`.
`$REL` = release tree, default `/Users/behnam/code/commercetools-labs/_release/contentools` (a sibling directory outside `$DEV`, outside any other repo; created by the export).

## Goals / Non-Goals

Goals: one clean public commit; gate green on exactly that commit; labs property/topic; packages on npm in dependency order; anonymous proof; clear checkpoints.
Non-goals: CI, automated releases, provenance attestations (no CI to produce them), mirroring history, a docs site.

## Decisions

### D-1 Export, not clone
The dev tree is not a git repository, so a "fresh clone" is an rsync export through a filter (Appendix A, proven on the source tree: `.env` removed, `.env.example` kept, builds and dependency folders excluded). The export is repeatable: every fix goes into `$DEV` and the export is regenerated, so `$DEV` and the published tree never diverge.
Alternative rejected: running ossify in `$DEV` (it rewrites files and `package.json` in place, mixing release edits with development).

### D-2 Order of operations: no private fork, public from the first push
Owner decision: there is no private staging repository. The Connect deployment tests run from the same public repository, by tag. Three phases:
```
PHASE A  before anything is public
  export -> ossify (dry, apply) -> sanitise -> local verify -> SCRATCH commit + gate (pre-flight, fix loop)
  -> CP-1 `go npm-rc` -> npm publish of the puck release candidate 1.0.0-rc.N (--access public, dist-tag next)
  -> pin admin-app to that rc + regenerate yarn.lock -> verify
  -> INITIAL commit (one squashed commit, author = the owner's global git identity) -> gate (exact commit)
  -> CP-2 `go repo` -> gh repo create --public -> push -> property + topic -> tag v1.0.0-rc.N
PHASE B  public, same repository
  -> anonymous clone proof of the rc tag -> Connect staging/deploy tests from this repository by tag (spec Q phase 2:
     `connectorstaged create --repository-url https://github.com/commercetools/contentools --repository-tag v1.0.0-rc.N`)
  -> every fix = a NORMAL commit made through the update procedure (Appendix B2), gate clean, new rc tag (and new puck rc if puck changed)
PHASE C  final
  -> CP-3 `go final` -> bump to 1.0.0 -> publish puck 1.0.0 (dist-tag latest) -> pin admin-app to 1.0.0 + yarn.lock -> verify
  -> normal commit -> gate -> push -> tag v1.0.0 -> repository settings -> anonymous proof of v1.0.0
```
Why the rc is published before the first commit: `admin-app` is built by Connect from its own folder and cannot resolve workspace packages, so its `yarn.lock` must point at
registry versions, and integrity hashes exist only after the packages are published. The packages are public npm packages (the owner only has public npm access, hence `--access public`).
Publishing to npm is irreversible, so it happens only after a clean pre-flight gate on a scratch commit of the complete tree; the packed tarballs come from that same tree.
Squash rule: the history is squashed ONLY to remove leaks (secrets, customer names, internal infrastructure). Ordinary fixes after publication are normal commits as long as `gate.mjs`
stays clean; the gate scans every ancestor commit on each run, so history cannot silently regress.

### D-3 What is not published
Exactly this is published from `openspec/`: `openspec/specs/**` and `openspec/config.yaml`. **`plans/**` and `openspec/changes/**` (including `archive/`) are excluded by the export filter** (Appendix A: `- plans/`, `- openspec/changes/`) because their explore/tasks/proposal files cite internal source paths and planning vocabulary the gate warns on. Also excluded: `.claude/`, `.cursor/`, `.vscode/`, `.playwright-mcp/`, logs, evidence, local env files. If the scratch gate shows findings in `openspec/specs/**`, fix the wording in `$DEV` or drop `openspec/` entirely (question R-Q1).

### D-3b Pre-checks that are not gate checks
The gate cannot know our own conventions, so `tasks.md` group 3 adds explicit pre-checks before the scratch commit: no `service/src/_pending/` directory (spec F/G staging area for ported-but-not-yet-compiled source: it must be gone at release, otherwise unfinished or foreign-shaped code is published), `yarn.lock` present in `service/`, `admin-app/`, `mcp/` and `puck/` and no `package-lock.json` anywhere, no committed per-package `LICENSE`, no `plans/`, and the vocabulary grep.

### D-4 Making ossify's refusals disappear at the source
* `service/LICENSE` (generic template with placeholders) is not copied by spec A; R deletes it if found: a LICENSE in any subdirectory turns the subtree into "third-party" for ossify (no headers written for ~12k lines) and into a gate FAIL.
* Per-package `LICENSE` copies for npm are produced by `publish-packages.mjs` at pack time and removed afterwards (git-ignored as a second guard), so they never exist when ossify or the gate run (this needs a change in spec I: see D-6).
* Files containing the word `copyright` in their first 2000 characters (`FooterBlock.tsx` in `puck-components` and `puck-editor`, `service/src/samples/.../footer-block.ts`) get the SPDX block by hand in `$DEV`; ossify then reports them as "already".
Alternative rejected: patching ossify (it lives in a private plugin and the loose match is deliberately conservative).

### D-5 Pre-flight gate on a scratch commit
Before the first publication: `git init` in `$REL`, commit everything, run `gate.mjs`. The scratch repository is deleted and recreated (`rm -rf .git`) before the initial commit, so the real first commit contains the final content, with the owner's identity. The pre-flight output is the TODO list; the loop is: fix in `$DEV` -> re-export -> re-ossify -> re-commit -> re-gate (Appendix B). After the first push this helper is no longer used (it deletes `.git`); Appendix B2 takes over.

### D-6 npm publish: local scripts of spec I, inspected tarballs
No CI means no trusted publishing and no provenance. Spec I provides the local scripts (read in its design D-6): `puck/scripts/bump-versions.mjs <patch|minor|major|x.y.z[-pre.N]> [--dry-run]` (all ten packages move in lockstep; aliases `yarn release:bump`) and `puck/scripts/publish-packages.mjs [--execute]` (alias `yarn release:publish`). The publish script: orders packages by a topological sort of internal dependencies (not a hand list), packs each with `yarn pack --filename <tmp>.tgz` (rewrites `workspace:^`), publishes the tarball with `npm publish <tgz> --access public --tag <next|latest>`; it is a **dry run by default**; `--execute` needs a clean git tree, `npm whoami`, equal versions, `dist/` present and a typed confirmation `publish <version>`; npm asks for the 2FA one-time password itself; already-published versions are skipped (re-runnable); stops at the first real failure; prerelease versions go to dist-tag `next`.
The order must be a valid topological order of the real dependency graph; levels (verified from each `package.json`): `puck-types`, `puck-image-picker` | `puck-api`, `puck-version-history` | `puck-components`, `puck-theme-manager` | `puck-editor`, `puck-renderer` | `puck-page-manager`, `puck-content-manager` (the old bash script listed content-manager before editor, which was wrong). R verifies the printed order with a check (task 6.2) instead of comparing to one fixed sequence, since order inside a level is free.
**Conflict found in spec I (reported to the coordinator):** I's design puts a `LICENSE` file in each package folder in git (its tree listing and a "files": ["dist","README.md","LICENSE"] rule). Any LICENSE below the repository root is, for both tools, a third-party subtree: ossify skips the directory (no SPDX headers) and the gate FAILs. Required resolution (owner of the change: I, with O's docs): the package LICENSE is NOT committed; `publish-packages.mjs` copies the root `LICENSE` into each package folder right before `yarn pack` and removes it afterwards (and `puck/packages/*/LICENSE` is git-ignored as a second guard). R's task 1.4 detects a committed per-package LICENSE.
Alternative rejected: publishing without LICENSE inside the tarball (npm pages then show no license file; `license: MIT` in `package.json` alone is weaker for a labs repo).

### D-7 `--ack` policy
`--ack` clears every WARN at once. Procedure: run without it, save the output to a file outside the repo, classify each WARN (fix / legitimate), prefer fixing; acknowledge only when every remaining WARN is legitimate (record count and reasoning in the local release notes, not the output text: it may echo a name).

### D-8 Anonymous proof adapted to Yarn and several apps
The skill's `npm ci && npm run typecheck && npm test && npm run build` becomes `tools/release/anonymous-proof.sh` (Appendix C): empty HOME, no git credential helper, no npm config, `GIT_TERMINAL_PROMPT=0`; per app (`service/`, `admin-app/`, `mcp/`: `yarn install --frozen-lockfile` with Yarn 1 classic; `puck/`: Yarn 4.5.1 `--immutable`): install, lint, typecheck (only when the script exists), test, build; puck including the playground; docs check; `commercetools connect validate` if the CLI exists. It also compares the clone HEAD with the gated commit and the commit count. The script was tested in the scratchpad against a local bare repository (hash match, commit count, REF checkout of a tag, failure on a wrong hash or commit count).

### D-9 Checkpoints
CP-1 (before the first `npm publish`, the release candidate): the owner sees the pre-flight gate output (clear), the dry-run tarball listings and the exact package list, version and tag; replies `go npm-rc`.
CP-2 (before `gh repo create`, `git push` and the rc tag): the owner sees the final gate output (commit sha, files, history 1), the add list, the commit message and the author identity that will be public (taken from `git config --global user.name/user.email`: shown, not asked), the repository name/description; replies `go repo`.
CP-3 (final release): after FULL ACCEPTED (spec Q phase 2): the owner sees the gate output of the final commit, the diff since the rc (`git diff --stat v1.0.0-rc.N`), the 1.0.0 package list; replies `go final`, which covers `npm publish` of 1.0.0, the push, the `v1.0.0` tag, release notes and repository settings (vulnerability reporting).
Message templates in Appendix D. Approval = the owner's own message containing the stated words; agent output never counts. M-06 covers GitHub permissions and the org property, M-07 npm scope, M-10 the approvals.
Between checkpoints (phase B) no outward-facing command beyond those already approved is run: a fix commit and rc tag after `go repo` is covered by the standing approval for the rc phase ONLY while the gate is clean and the change is a fix found by tests (it is pushed to `main`; the owner is told); a new npm rc needs a fresh `go npm-rc`.

### D-10 Failure handling
Before the first push: fix and repeat. After an npm publish: `npm deprecate` the broken rc and publish the next rc; never rely on unpublish. After the push, a defect or gate WARN/FAIL of ordinary kind (broken build, wrong text, missing file): normal fix commit through Appendix B2, gate clean. A **leak** (secret, customer or prospect name, internal host or identifier) in any pushed commit: stop, rotate anything exposed, delete the repository (`gh repo delete`, owner approval), fix `$DEV`, and restart at the initial commit with a new single squashed commit (a force-push does not remove old commits from GitHub; the name stays held by a rename redirect until the delete completes). If the leak is also inside a published npm tarball: deprecate those versions, publish a clean rc, and treat what was exposed as compromised.

### D-11 Update procedure after publication
`$REL` keeps its `.git` (the export filter excludes `.git/` and rsync `--delete` does not remove excluded paths). Appendix B2 re-exports, re-runs ossify, makes one commit with the owner's identity and the required trailer, and runs the gate on the new HEAD (the gate scans the whole history, now more than one commit). Tags: `v1.0.0-rc.N` increments per deployable fix; Connect stages by tag (`setRepository` -> `publish` -> `redeploy` with `updateConnector: true`, spec Q/P runbook).

## Risks

* First-publish permissions (M-07) not ready: pre-flight can be completed without them; the plan then pauses at CP-1.
* GitHub org property undefined (422): ask an org admin; read-only check before creating the repo: `gh api orgs/commercetools/properties/schema`.
* Finding output prints matched text (names): keep outputs local, never paste them into issues or chat summaries.
* The commit author identity is public (the owner's global git identity, shown at CP-2).
* A defect in a puck package found during the Connect tests costs another rc (and `admin-app` pin/lockfile update): expected and cheap, since the rc exists for that purpose.


## Appendix A - export filter (`$REL`), proven on the source tree

Save as `rsync-filter.txt` in the scratchpad (not in the repo). Order matters: the `+` lines for `.env.example` come before the `.env*` exclusions.
```
- .git/
- node_modules/
- build/
- dist/
- coverage/
- .turbo/
- .yarn/cache/
- .yarn/install-state.gz
- plans/
- openspec/changes/
- .claude/
- .cursor/
- .vscode/
- .playwright-mcp/
- .DS_Store
- *.log
- *.tgz
+ .env.example
+ **/.env.example
- .env
- .env.*
- **/.env
- **/.env.*
```
Command: `rsync -a --delete --filter='merge rsync-filter.txt' "$DEV"/ "$REL"/`. (A bare `--exclude cms/` was used only in the experiment; do not use it here: the target contains no "cms" folders - spec C - and the grep in task 3.4 proves it.)

## Appendix B - fix-loop helper (scratchpad, not committed)

```bash
# rebuild.sh <year>: regenerate $REL from $DEV and run ossify + a scratch commit + gate, printing only counts
set -euo pipefail
DEV=/Users/behnam/code/commercetools-labs/contentools
REL=${REL:-/Users/behnam/code/commercetools-labs/_release/contentools}
SKILL=/Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish
mkdir -p "$REL" && rsync -a --delete --filter="merge $(dirname "$0")/rsync-filter.txt" "$DEV"/ "$REL"/
node "$SKILL/scripts/ossify.mjs" --repo "$REL" --apply --year "${1:-2026}" | tee "$REL/../ossify-report.txt" | sed -n '1,10p'
cd "$REL" && rm -rf .git && git init -q -b main && git add . && git -c user.name=release -c user.email=release@localhost commit -qm scratch
rc=0; node "$SKILL/scripts/gate.mjs" --repo . > "$REL/../gate-output.txt" || rc=$?
tail -3 "$REL/../gate-output.txt"; exit $rc
```
(`ossify-report.txt` and `gate-output.txt` are written OUTSIDE `$REL` so the tree stays clean for the gate.)

## Appendix B2 - update helper after the first publication (scratchpad, not committed)

```bash
# update-release.sh "<commit subject>"   (run only after the initial push; $REL has a .git with origin)
set -euo pipefail
DEV=/Users/behnam/code/commercetools-labs/contentools
REL=${REL:-/Users/behnam/code/commercetools-labs/_release/contentools}
SKILL=/Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish
rsync -a --delete --filter="merge $(dirname "$0")/rsync-filter.txt" "$DEV"/ "$REL"/
node "$SKILL/scripts/ossify.mjs" --repo "$REL" --apply --year 2026 | sed -n '1,10p'
cd "$REL"; git status --short | head -40
git add -A && git commit -q -m "$1" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
rc=0; node "$SKILL/scripts/gate.mjs" --repo . > "$REL/../gate-output.txt" || rc=$?
tail -3 "$REL/../gate-output.txt"; exit $rc
```
Run `git push` and the tag only after the gate printed CLEAR (and, per D-9, within the approved scope). If `git status --short` shows files you did not intend (for example a `LICENSE` copy inside a package folder), stop: delete the file in `$DEV`/`$REL`, do not commit it.

## Appendix C - `tools/release/anonymous-proof.sh`

Tested in the scratchpad: hash match and single-commit checks pass against a local bare repository, a wrong expected hash fails, `bash -n` clean. The install/build steps need the real repository.

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
# Freely available, AS IS and UNSUPPORTED. See LICENSE.
#
# Anonymous clone proof. Usage:
#   [REF=<tag-or-branch>] [EXPECT_COMMITS=<n>] tools/release/anonymous-proof.sh <clone-url> <expected-commit-prefix> [workdir]
# Runs with an empty HOME, no git credential helper and no npm configuration, so nothing
# private can be used. REF checks out a tag (default: the default branch); EXPECT_COMMITS is the
# number of commits the history must have (1 for the initial publication; omit the check with 0).
# Writes one log per step to <workdir>/logs and prints PASS/FAIL lines.
# SKIP_BUILDS=1 only checks clone, hash and commit count (used to test this script).
set -uo pipefail
URL="${1:?clone url}"; WANT="${2:?expected commit prefix (8 chars) from the final gate run}"
WORK="${3:-$(mktemp -d)}"; LOGS="$WORK/logs"; mkdir -p "$LOGS"
FAKEHOME="$WORK/home"; mkdir -p "$FAKEHOME"
export HOME="$FAKEHOME" XDG_CONFIG_HOME="$FAKEHOME/.config" GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export npm_config_userconfig=/dev/null npm_config_globalconfig=/dev/null
unset NPM_TOKEN NODE_AUTH_TOKEN GH_TOKEN GITHUB_TOKEN YARN_NPM_AUTH_TOKEN
fail=0
step() { # step <name> <dir> <command...>
  local name=$1 dir=$2; shift 2
  if (cd "$dir" && "$@") > "$LOGS/$name.log" 2>&1; then echo "PASS $name"; else echo "FAIL $name (see $LOGS/$name.log)"; fail=1; fi
}
# run "yarn <script>" only when the package defines it (lint/typecheck are not defined everywhere)
script_step() { local name=$1 dir=$2 sc=$3; if node -e "process.exit(require(process.argv[1]).scripts?.[process.argv[2]]?0:1)" "$dir/package.json" "$sc" 2>/dev/null; then step "$name" "$dir" yarn "$sc"; else echo "SKIP $name (no $sc script)"; fi; }
git clone --quiet "$URL" "$WORK/clone" > "$LOGS/clone.log" 2>&1 || { echo "FAIL clone"; exit 1; }
C="$WORK/clone"
[ -n "${REF:-}" ] && git -C "$C" checkout --quiet "$REF" 2>>"$LOGS/clone.log"
head=$(git -C "$C" rev-parse HEAD); count=$(git -C "$C" rev-list --count HEAD); EXPECT="${EXPECT_COMMITS:-1}"
[ "${head:0:${#WANT}}" = "$WANT" ] && echo "PASS commit $WANT matches gated commit" || { echo "FAIL commit $head != $WANT"; fail=1; }
if [ "$EXPECT" = 0 ] || [ "$count" = "$EXPECT" ]; then echo "PASS history has $count commit(s)"; else echo "FAIL $count commits, expected $EXPECT"; fail=1; fi
if [ "${SKIP_BUILDS:-0}" != 1 ]; then
  command -v corepack >/dev/null && corepack enable >/dev/null 2>&1 || true
  for app in service admin-app mcp; do   # Yarn 1 classic projects (own yarn.lock)
    step "$app-install"   "$C/$app" yarn install --frozen-lockfile
    script_step "$app-lint" "$C/$app" lint
    script_step "$app-typecheck" "$C/$app" typecheck
    step "$app-test"      "$C/$app" yarn test
    step "$app-build"     "$C/$app" yarn build
  done
  step puck-install   "$C/puck" yarn install --immutable
  script_step puck-lint "$C/puck" lint
  script_step puck-typecheck "$C/puck" typecheck
  step puck-build     "$C/puck" yarn build
  step puck-test      "$C/puck" yarn test
  step playground-build "$C/puck/playground" yarn build
  step root-docs-check "$C" node tools/check-docs-lint.mjs
  command -v commercetools >/dev/null && step connect-validate "$C" commercetools connect validate
fi
echo; [ "$fail" -eq 0 ] && echo "ANONYMOUS PROOF: PASS (logs in $LOGS)" || echo "ANONYMOUS PROOF: FAIL (logs in $LOGS)"
exit $fail
```

## Appendix D - checkpoint messages (send verbatim, then wait)

CP-1 (npm release candidate): "Release checkpoint 1 of 3 (npm release candidate). The pre-flight gate is clear on commit <sha8> (<N> files, 0 FAIL, <W> WARN reviewed). I am about to publish these 10 public packages at 1.0.0-rc.<N> with `--access public` and dist-tag next, in this order: <list>. Tarball listings: <path>. Published versions cannot be undone. Reply `go npm-rc` to proceed, or tell me what to change."
CP-2 (public repository): "Release checkpoint 2 of 3 (public repository). Final gate output on commit <sha8>: clear (history 1 commit, <N> files). Add list reviewed: <path>. The public author will be <git config --global user.name / user.email, printed>. I am about to run `gh repo create commercetools/contentools --public --description \"<text>\"`, `git push -u origin main`, set the labs property and topic, and push tag v1.0.0-rc.<N>. Once public, the commit is permanently fetchable. Reply `go repo` to proceed."
CP-3 (final): "Release checkpoint 3 of 3 (final 1.0.0). FULL ACCEPTED on rc.<N> (<link to RESULTS.md>). Changes since the rc: <git diff --stat>. Gate on the final commit <sha8>: clear (history <n> commits). I am about to publish the 10 packages at 1.0.0 (dist-tag latest), push, tag v1.0.0, enable private vulnerability reporting and create release notes. Reply `go final` to proceed."

## Appendix E - commit message (the initial commit; later fix commits use a normal subject plus the same trailer)

```
Initial public release of Contentools (commercetools-labs)

Contentools is a visual page builder for commercetools: a Connect service
(content API), a Merchant Center custom application, an MCP server and the
@commercetools-labs/puck-* React packages.

This is commercetools-labs reference code: MIT licensed, AS IS and UNSUPPORTED.
It is a single-project rewrite of an internal multi-tenant implementation;
history was intentionally not migrated.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```
(The wording says "internal multi-tenant implementation": allowed in a commit message? The gate scans commit CONTENT, not messages, but the README rule forbids multitenancy wording, and the skill asks the commit to explain "what changed from the internal version". Question R-Q2: default keep this one sentence, it carries no names.)

## Appendix F - gate finding triage

| Finding (gate group) | Typical cause here | Fix |
| --- | --- | --- |
| forbidden file | a `.env`, a `*.key`, `service-account*.json`, `.npmrc` copied by accident | delete in `$DEV`; check `.gitignore` |
| missing SPDX header | new `.ts/.tsx/.js/.jsx/.mjs/.cjs` file created after ossify, or a file ossify refused | re-run `ossify --apply`; or add the block by hand |
| foreign copyright | file whose first 2000 chars contain `copyright`/`(c) 20xx` without "commercetools" | rename the identifier or add the SPDX block first (header's line is then the first match) |
| third-party subtree | any non-root `LICENSE*`/`COPYING*` file | delete it (`find . -name 'LICENSE*' -not -path './LICENSE' -not -path '*/node_modules/*'`) |
| missing file | `SUPPORT.md`, `CONTRIBUTING.md`, `LICENSE` | spec P / ossify |
| package name | a `package.json` (also in test fixtures) whose name is not `@commercetools-labs/...` | rename or remove the name in fixtures |
| secret | token-like string, `*_SECRET=<value>`, private key header | remove, rotate if real |
| customer name / internal infra | sample data, URLs, host names, GCP project ids | replace with neutral placeholders in `$DEV` |
| WARN name (review) / demo framing | words "demo", "POC", "pre-sales" in prose or comments; short acronyms | reword ("reference implementation"); ack only if legitimate |
