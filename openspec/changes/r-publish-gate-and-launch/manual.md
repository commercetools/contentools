# Human-only steps: r-publish-gate-and-launch

| ID | Needed at | What the owner does |
| -- | --------- | ------------------- |
| M-06 | before CP-2 | Confirm `gh auth status` has `repo` (and org admin for properties); confirm the org custom property `commercetools-labs` (true/false) is defined (otherwise ask an org admin); confirm permission to create `commercetools/contentools`; allow deleting it if a leak forces recreation. |
| M-07 | before CP-1 | npm: `npm login` as a member allowed to publish PUBLIC packages to scope `@commercetools-labs` (2FA OTP prompts per publish; the owner only has public npm packages, so `--access public` is always used); for the rc and again for 1.0.0. |
| M-10 | CP-1, CP-2, CP-3 | Read the gate output, add list/diff and commands; reply exactly `go npm-rc`, `go repo`, `go final` at the three checkpoints. Nothing outward-facing runs otherwise. |
| M-11 | task 11.4 | Confirm no contact email is wanted in `SECURITY.md` (private vulnerability reporting is used). |
| new | task 10.4 | Phase B: Connect CLI access (M-05) for staging from the public tag; Merchant Center session (M-04) for spec Q phase 2. |
| new | group 9 prep | If the org property is undefined, an org admin must create it (boolean `commercetools-labs`). |
| new | task 11.4 | Enable private vulnerability reporting if the agent's token cannot (repository settings -> Security). |
