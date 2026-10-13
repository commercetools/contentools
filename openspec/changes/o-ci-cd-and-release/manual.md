# Manual steps discovered by O

| ID | Step | Needed before |
| -- | ---- | ------------- |
| M-O1 | Install Docker Desktop (or another Docker engine) and the Connect CLI (`npm install -g @commercetools/cli`) on the release machine. | `yarn verify:strict`, task 5.1 |
| M-O2 | Owner approvals at the release checkpoints (CP-1 before `--execute` publish, CP-3 before pushing the tag) as defined in spec R. | Runbook steps 7 and 12 |
| M-05 (existing) | `commercetools auth login` with a Connect-capable API client (only if task 5.1 shows `validate` needs it). | Task 5.1, step 13 of the runbook |
