# Human-only steps: q-end-to-end-acceptance

All are existing entries in `plans/manual-steps.md`; listed with the exact moment this spec needs them.

| ID | Needed at | What the owner does |
| -- | --------- | ------------------- |
| M-01 | task 1.4 | Provide sandbox project + API client; place `service/.env.e2e`. |
| M-02 | task 3.4, 4.11 (optional) | Provide a test media bucket/account; delete its test prefix after the run (task 8.4). |
| M-05 | group 5 | Connect CLI login with deployment scopes in the sandbox region. |
| M-08 | spec R, CP-1 (before phase 2) | Publish the puck release candidate to npm with the local scripts of spec I (spec R runs it; owner types the OTP). |
| M-03 | task 7.1 | Register the Merchant Center custom application and give the Application ID. |
| M-04 | task 7.2 | Keep a logged-in MC session in the Chrome profile used by the connector; tell the agent when ready. |
| new | task 7.3 item 7 | Provide (or create) a user/team without the application permission for the denial check, or approve a waiver. |
| new | task 8.4 | Delete the media test prefix if the storage console is not accessible to the agent. |
