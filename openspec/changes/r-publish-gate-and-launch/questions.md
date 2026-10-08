# New owner questions: r-publish-gate-and-launch

| ID | Question | Status / recommended default | Affects |
| -- | -------- | ---------------------------- | ------- |
| R-Q1 | What of `openspec/` is published? | CLOSED (coordinator): only `specs/` + `config.yaml`; never `plans/` or `openspec/changes/**`. If the scratch gate flags `specs/`, drop `openspec/` entirely. | R, P |
| R-Q2 | Is the sentence "single-project rewrite of an internal multi-tenant implementation" acceptable in the public commit message? | Default yes (names nothing); the README never mentions multitenancy. | R |
| R-Q3 | Author identity of the public commit. | CLOSED (owner): the global git identity (`git config --global user.name/user.email`), shown at CP-2, not asked. | R |
| R-Q4 | Publish puck to npm before the repository is public? | CLOSED (owner flow): yes, a public release candidate (`--access public`, dist-tag `next`) after the pre-flight gate and before the initial commit, so the `admin-app` lockfile can resolve it; final 1.0.0 after FULL ACCEPTED. | R, O, L, Q |
| R-Q5 | If the proof fails after the push: recreate or fix commit? | CLOSED (owner): normal fix commits while `gate.mjs` stays clean; squash/recreate only for leaks. | R |
| R-Q6 | Publish `@commercetools-labs/contentools-mcp` to npm at launch (spec N)? | Only if N is implemented (as rc, then final). | R, N |
| R-Q7 | GitHub release notes for v1.0.0 or tag only? | Tag plus short release notes (task 11.4). | R |
