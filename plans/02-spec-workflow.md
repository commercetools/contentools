# How each spec is produced and executed

Tooling: `openspec` CLI v1.6 (spec-driven schema: proposal → specs → design → tasks).
Change ids are `<letter>-<slug>` (see `01-dependency-plan.md`).

## Authoring (done up-front for A…R)

For every spec the author performs, **in this order**:

1. **Explore** — read the relevant source in `/Users/behnam/code/cms`, the target tree, the
   `commercetools-connect` skill references, and (if needed) the commercetools docs. Record facts in
   `openspec/changes/<id>/explore.md` (not an OpenSpec artifact; a working note that makes the other
   artifacts verifiable: file paths, line counts, route lists, env vars, open risks).
2. **Proposal** (`proposal.md`) — Why / What changes / Capabilities / Impact.
3. **Specs** (`specs/<capability>/spec.md`) — normative requirements with `#### Scenario:` blocks
   (WHEN/THEN). These are the acceptance criteria.
4. **Design** (`design.md`) — decisions with alternatives rejected, risks, migration notes, and the
   exact file/dir layout produced.
5. **Tasks** (`tasks.md`) — the **junior-developer plan** (see the bar below).
6. Any question for the owner is appended to `plans/owner-questions.md` under the spec's heading;
   any human-only step to `plans/manual-steps.md`. The spec proceeds on the **stated default**.

## The junior-developer bar for `tasks.md` (mandatory)

A developer who has never seen this repo must be able to execute the file top to bottom. So each
task group contains:

* **Context paragraph** — what this group achieves and why, in plain language, with the vocabulary
  explained (Connect, custom object, Puck, BU, MC…) the first time it appears.
* **Pre-conditions** — which specs must be archived, which env vars/tools must exist.
* **Numbered, checkbox tasks (`- [ ] 3.2 …`)**, each small (≤ ~2 h), each stating:
  * the **exact files/directories** to create/edit/delete (paths relative to repo root);
  * the **source reference** to copy from (`/Users/behnam/code/cms/...`) and what to change;
  * **code skeletons / snippets** where the shape is non-obvious (signatures, `connect.yaml` blocks, zod schemas…);
  * the **command to run** and the **expected output** (e.g. `yarn test` → "12 passed");
  * a **"Done when"** line that is objectively checkable.
* **Pitfalls** — known traps (from the connect skill and from reading the code).
* **Verification** — automated tests to add/run and, for UI, a Chrome DevTools script
  (navigate → snapshot → assert → screenshot) that the implementer runs themselves.
* **Rollback / recovery** — how to undo the group safely.
* **Definition of Done** for the whole spec, mapped to the `specs/**` scenarios.

If a task needs a decision that is not made yet, the task says "DEFAULT: X (see Q-nn)" and proceeds
with X.

## Execution (after owner answers questions)

```
/opsx:apply <id>    # implement tasks.md top to bottom, ticking boxes
(run verification section; fix)
/opsx:archive <id>  # merge delta specs into openspec/specs and archive
```

Rules during execution:
* Never start a spec whose dependencies are not archived.
* One commit-sized diff per task group is fine, but **no git history is published** — the final
  repo is a single commit (spec R). Local scratch commits are allowed in a throwaway repo only.
* If implementation contradicts a spec, update the spec in the same change first, then code.
* Keep `plans/01-dependency-plan.md` status board current.
