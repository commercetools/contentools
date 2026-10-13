# Brief for implementers ("junior devs")

You implement ONE OpenSpec change. Work only in your own git worktree (your current directory).

## Setup (do first)
1. Your worktree may start at an old commit. Run `git reset --hard develop` (your branch has no work yet) and confirm `git log --oneline | head -3` shows the latest develop commits.
2. Read: `plans/00-master-plan.md`, `plans/02-spec-workflow.md`, `plans/04-spec-author-brief.md` (locked decisions), the OWNER ANSWERS at the top of `plans/owner-questions.md`, and your change in `openspec/changes/<id>/` (`proposal.md`, `specs/**`, `design.md`, `explore.md`, `tasks.md`, `questions.md`, `manual.md`), plus `plans/implementation-log/*` from earlier specs (deviations that affect you).
3. Execute `tasks.md` top to bottom; tick boxes (`- [x]`). Follow exact paths/commands. The SOURCE repo `/Users/behnam/code/cms` is read-only.

## Locked rules
* Yarn 1 classic for `service/`, `admin-app/`, `mcp/`; Yarn 4.5.1 for `puck/` (needs a `puck/yarn.lock` file to exist before the first `yarn install`). No `package-lock.json`. No GitHub Actions / `.github`. No Firestore. No "cms" (case-insensitive) in code, names, docs. SPDX header on every source file (see `tools/` checker). No secrets in files, logs or commits. The owner's secret file `service/.env.e2e.local` exists only in the main checkout, is git-ignored; you can reference it by path `/Users/behnam/code/commercetools-labs/contentools/service/.env.e2e.local` for LIVE sandbox checks ONLY when your tasks say so: `set -a; . that file; set +a` in a shell — never print or copy its values, never commit it.
* Live sandbox checks: only against the sandbox project in that file, only containers prefixed with `contentools-test-`, and clean up after yourself.
* Chrome DevTools connector is currently unavailable: record UI/browser checks as "not run: connector detached" instead of faking them.
* If something in tasks.md is impossible or wrong, do the closest correct thing, record the deviation, and continue. Do not edit other changes' specs (you may fix typos in your own change's artifacts).
* If a dependency spec is not yet merged (check `plans/01-dependency-plan.md` + git log), implement what you can and record the gap.

## Finish
* Commit in logical commits on your worktree branch (author `Behnam Tehrani <behnam777@gmail.com>`; end each message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Do NOT push or merge; the coordinator merges.
* Write `plans/implementation-log/<id>.md`: what was done, deviations + why, QUESTIONS for the owner (with recommended default), MISSED/UNPORTED features, TODOs, verification commands run and results, commands that could not run.
* Final message (<= 12 lines): branch name, commits, tasks done/total, verification results, blockers.
