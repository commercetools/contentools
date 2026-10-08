# New owner questions: q-end-to-end-acceptance

| ID | Question | Recommended default (assumed) | Affects |
| -- | -------- | ----------------------------- | ------- |
| Q-Q1 | May the acceptance run write into the real (un-prefixed) containers of the sandbox project when run against a deployed service whose container overrides were not set? | No: set the override keys in the deployment configuration first; if that is impossible, accept it only because the project is a sandbox and clean by run-id (tasks 5.3, 8.3). | Q, H |
| Q-Q2 | Is a second Merchant Center account (or a team without the app permission) available for the permission-denial check? | If not, WAIVE that single check with a written reason. | Q |
| Q-Q3 | Should the optional broken-tag scenario (AC-14) be part of acceptance? | Optional; skipped unless the owner asks. | Q |
| Q-Q4 | Keep `tools/e2e/*` in the published repo? | Yes (no secrets, useful to adopters); `plans/evidence` never. | Q, R |
