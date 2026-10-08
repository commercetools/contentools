# Questions raised by O

| ID | Question | Recommended default (O proceeds on it) |
| -- | -------- | -------------------------------------- |
| Q-O1 | The hygiene gate forbids `Dockerfile*` and `docker-compose*.yml` anywhere (Connect builds from source). Acceptable, or does the owner want a Dockerfile for local runs? | Forbid (A already excludes them; the labs gate treats them as noise). Revisit only if H needs one. |
| Q-O2 | Does `commercetools connect validate .` work without `commercetools auth login`? Not verified (docs show login first). | Task 5.1 finds out; strict mode requires it to run. |
| Q-O3 | Cross-spec: spec A's provisional root `verify` (run-all) is replaced by `tools/verify.mjs`; H keeps `verify:service` (it installs); R's `tools/release/anonymous-proof.sh` lives in the same `tools/release/` folder. | Accept; R adds its file next to O's. |
| Q-O4 | Versions of root/service/admin-app/mcp are bumped by hand with `yarn version --new-version <v> --no-git-tag-version` (I's script only bumps puck). Should I's `bump-versions.mjs` also bump them? | Yes if cheap (I extends its script via a `--all` flag); otherwise O's runbook step stays manual. |
