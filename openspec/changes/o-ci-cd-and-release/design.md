## Context

No hosted CI exists by owner decision. Quality is enforced by local scripts the maintainer runs and by Connect itself (which builds the
apps and runs their tests during `connect validate` and deployment). Specs A, B, C, H, I, K, L, M each ship their own checks; O's job is
to make them one command, add what nobody owns (Connect contract, hygiene, release tagging) and wire a strict mode that R and the
release runbook rely on.

## Goals / Non-Goals

**Goals**: one `verify`; strict mode; Connect contract check; hygiene check; release preflight/tag/runbook; wrappers for I's puck scripts.
**Non-Goals**: any workflow/pipeline file, token-based or trusted publishing, deploying (R, owner), the labs gate (R), reimplementing I's bump/publish, test authoring (B and per-spec).

## Decisions

1. **Orchestrator in plain Node, steps as data.** `tools/lib/verify-steps.mjs` exports `buildSteps(opts, scriptsOf)` (pure, unit-tested) returning `{id, cwd, cmd, args, skipReason?}`; `tools/verify.mjs` executes them. Rejected: a Makefile (not portable to the maintainers' Windows/WSL setups), shell script (hard to test), turborepo/nx (a dependency, and the repo is deliberately not a workspace).
2. **Run all steps, summarise, exit non-zero** (default); `--fail-fast` optional. A developer fixing three things wants one run, not three.
3. **Per-app: prefer the app's own `verify`.** K and I already define the exact sequence for admin-app and puck (including `check:pins`, `check:metadata`); duplicating it would drift. service and mcp have no `verify`, so the four standard scripts are used.
4. **Strict = release mode.** `--strict` = skips are failures + pending list empty + `connect validate` mandatory. Preflight calls strict; daily runs stay fast.
5. **Connect contract check is text-based on a documented subset** (blocks split on `^  - name:`; state machine for `standardConfiguration`/`securedConfiguration`), like L's checker, because the root hub has no dependencies and must not gain a YAML library (a dependency would invite `workspaces`-style temptation and install steps). `commercetools connect validate .` stays the authority, and `check:connect` is the canonical static check of `connect.yaml` for the whole repo (other specs' ad-hoc snippets, e.g. a Python YAML parse in M, should call `yarn check:connect` instead of re-implementing it); the static check exists to fail in seconds on the commonest mistakes (secret in the wrong section, folder/name mismatch, forgotten endpoint).
6. **Hygiene check replaces "no secrets in workflows".** With no workflows, the risk moves to files: committed env/key files and token-looking strings. Patterns are the PUBLIC ones from the labs skill's gate table (ghp_, sk-, AIza, Slack, private keys, `*_SECRET=<value>`); customer/internal-name scanning remains exclusively R's `gate.mjs` (the list is confidential and must never enter this repo).
7. **Tag script never pushes.** Pushing publishes the repo state; that is owner checkpoint CP-3 in R. The script prepares the annotated tag after a green preflight and a typed confirmation; the runbook shows the push command for the owner.
8. **Wrap, do not copy, spec I's release scripts.** Root scripts forward to `yarn --cwd puck release:bump|release:publish` so safety properties (dry run default, `--execute`, clean tree, `npm whoami`, typed confirmation, `--tag next` for prereleases) live in one place.
9. **Lockstep versions across all packages** (`1.0.0`, Q-05) are checked by `release/versions.mjs`. The Connect apps' versions are cosmetic but kept in step so the tag `v1.0.0` describes one coherent state.
10. **Ignored artefacts**: `.verify-logs/` added to the root `.gitignore`.

11. **Release candidates from the same repo (owner decision)**: Connect is tested from the public repository after R's gate using `v1.0.0-rc.N` tags; `tag.mjs --next-rc` automates numbering and the preflight is rerun for every rc. Fix commits after publication are allowed only with a clean gate; the squash rule is for leaks only.
12. **Yarn only**: hygiene forbids `package-lock.json` and (strict) requires `yarn.lock`; the step builder uses `yarn` for every app.

## Risks / Trade-offs

- [Gates skipped by habit] -> strict preflight is a precondition of `tag.mjs --execute` and of R's CP-1.
- [Text-based YAML check misses an exotic construct] -> documented subset; `connect validate` in strict mode.
- [`verify` too slow] -> `--only/--skip`; installs opt-in; Docker step opt-in outside strict.
- [False secret positives in fixtures] -> excluded test paths and the `hygiene-ok` marker (reviewed in code review, counted in the summary).

## Migration Plan

Replace A's provisional `verify` script, add scripts, run `yarn verify` until green, then run `yarn verify --strict --connect` once (needs Docker) and record the date. Rollback: delete the new scripts and restore A's `verify` line.

## File layout produced

```
tools/verify.mjs  tools/lib/verify-steps.mjs
tools/check-connect-contract.mjs  tools/lib/connect-blocks.mjs
tools/check-repo-hygiene.mjs
tools/release/{preflight.mjs,tag.mjs,versions.mjs,README.md}
tools/test/{verify-steps,connect-contract,repo-hygiene,release-versions,release-tag}.test.mjs
```

## Open Questions

Q-O1 (`Dockerfile` forbidden?), Q-O2 (does `connect validate` need `auth login`?) in questions.md.
