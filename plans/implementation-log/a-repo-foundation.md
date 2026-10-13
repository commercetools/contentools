# Implementation log: a-repo-foundation

Branch: `worktree-agent-ac680f87881841700`. Source HEAD during import: `9544b35e62a112a6111741b216588c59bff238cf` (source clean before and after; `service/.env.e2e.local` never touched).

## Done
All tasks in `openspec/changes/a-repo-foundation/tasks.md` ticked (1.1 - 7.7).
- Skeleton: `.nvmrc` (22), `.gitignore`, root `package.json` (hub, no workspaces), `docs/.gitkeep`, `tools/`.
- Import: 479 files (service 138, admin-app 60, mcp 35, puck 246, puck/playground 9); forbidden-artifact scan empty; no `cms/`, no `.github`.
- Path fixes: `puck/package.json` workspaces `playground`, script `start:playground`; playground name `@commercetools-labs/puck-playground`.
- Tools: `run-all`, `labs-publish` (wrapper; policy.json never read or copied), `check-spdx-headers`, `lib/{files,targets}`; 13 tests pass.
- ossify: 14 package renames, 412 headered, LICENSE written; 3 refusals exactly as predicted; idempotent re-run (0 changes). `check:spdx` -> `spdx: OK (418 files)`.
- Commits: 3 (tooling+skeleton, import, ossify) plus this log/tasks commit.

## Deviations
1. Worktree started from the first commit, not `develop`; fast-forwarded to `develop` (9e82d03) before starting.
2. Root `.gitignore`: spec content plus `*.local` and `.claude/` (the pre-existing develop file had both; needed to keep `service/.env.e2e.local` and agent worktrees out).
3. `service/.gitignore`: the copy overwrote the develop version (which ignored `.env.e2e.local`); I appended `.env.e2e.local` back to the source content. Root `.env.*` and `*.local` also cover it.
4. Task 7.3 (ignore proof): the agent sandbox refuses `git init` outside the worktree, so I ran `git check-ignore` inside the worktree with temporary `service/.env` and `service/.env.e2e` (both ignored: pass) and `service/.env.example` (not ignored: exit 1, pass). I accidentally deleted the real tracked `service/.env.example` during cleanup and restored it with `git checkout`; the tree is clean.
5. Task 6.2a: the two SPDX-checker files (`tools/check-spdx-headers.mjs`, its test) were also skipped by ossify (they contain the header text as content, "already had SPDX"), so I hand-added headers there too (5 hand-added files, not 3).
6. ossify renames `mcp` to `@commercetools-labs/contenttools-mcp` (old typo); spec N/Q-04 must rename to `contentools-mcp`. `puck` root became `@commercetools-labs/puck-workspace`; `admin-app` -> `@commercetools-labs/contentools-custom-application-wrapper`.

## Findings for later specs
- Yarn 4 in `puck/`: with a `package.json` at the repo root, `yarn run` in `puck/` fails ("nearest package directory doesn't seem to be part of the project declared in <root>") until `puck/yarn.lock` exists. Spec I should `touch puck/yarn.lock` before the first `yarn install` (Yarn 4 then treats puck as its own project). `yarn lint` from the hub shows this failure for puck until then.
- `service`/`admin-app` lint fails only because dependencies are not installed (nothing installed in A, by design).
- Informational counts: 114 files mention `commercetools-demo`, 17 service files mention `x-project-key` (C has work).

## Questions for the owner
- Q-A5 (open): gate.mjs may still flag the three `copyright` field files. Recommended default: leave header by hand; R decides after running the gate (do not rename the stored field).

## MISSED / UNPORTED
Intentionally not copied (per spec): Dockerfile/.dockerignore/docker-compose, postman collection, netlify.toml, all yarn.lock, `publish-puck-packages.sh`, `.github`, `cms/`.

## TODO
- Spec I: `puck/yarn.lock` bootstrap (see above). Spec N: fix mcp package name typo.

## Commands not run / limitations
- `yarn install`/builds not run (out of scope for A). Gate (`yarn gate`) not run (R). Scratch-git ignore proof replaced as in deviation 4.
