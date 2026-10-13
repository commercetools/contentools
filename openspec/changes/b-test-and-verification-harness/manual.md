# Manual steps discovered by B

| ID | Step | Needed before |
| -- | ---- | ------------- |
| M-01 (existing) | Provide the sandbox project and `service/.env.e2e` with `E2E_CTP_PROJECT_KEY`, `E2E_CTP_CLIENT_ID`, `E2E_CTP_CLIENT_SECRET`, `E2E_CTP_REGION`, `E2E_CTP_SCOPE`, `E2E_BUSINESS_UNIT_KEY`, `E2E_ALLOW_PROJECT_KEY` (same value as the project key). The API client needs `manage_key_value_documents`, `view_products`, `view_business_units`, `view_stores`. | B task 5.6 (live run); F, G, Q |
| M-B1 | Attach the Chrome DevTools connector to the session and to a Chrome profile (any, for playground checks); if it is detached the playbooks are skipped and the gap is recorded. | B playbook runs (tasks 7.x) |
| M-04 (existing) | Logged-in Merchant Center session for owner-assisted playbook 05. | Playbook 05 |
