# Manual steps discovered by spec L

| ID | Step | When |
| -- | ---- | ---- |
| M-L1 | Register the Merchant Center custom application with placeholder URL `https://example.com`, entry path `contentools`, scopes `view_business_units` / `manage_key_value_documents`, menu label `Contentools`, link permissions View+Manage; copy the Application ID (exact field list in tasks.md 5.1). This refines M-03 (old plan listed other scopes). | before tasks 6.x |
| M-L2 | After the first deployment, replace the placeholder Application URL in the registration with the `admin-app` URL from `deployment describe` (tasks 6.6). | after each new deployment key |
| M-L3 | Install the custom application for the organization/project and give a team View (and Manage) permission; create a second view-only team for the 403 test (tasks 6.7, B5). | before B-checks |
| M-L4 | `mc-scripts login` (browser; the owner completes the login when asked) once for `config:sync --dry-run` (tasks 5.2). | task 5.2 |
| M-L5 | Connect CLI login with an API client that has `manage_connectors`, `manage_connectors_deployments`, `manage_api_clients` (M-05, scopes spelled out). | before group 6 |
| M-L6 | Connect testing uses this same repository with git tags (no private fork): after the publish gate (spec R) makes the repository public, push release-candidate tags `v1.0.0-rc.N`; the agent deploys them with `connectorstaged create` / `update`. (An HTTPS repository URL works only for public repositories.) | before group 6 |
| M-L7 | For part B the agent opens Merchant Center in Chrome and asks the owner to log in when the login prompt appears (owner does SSO/2FA, then confirms); the owner stays available while part B runs (M-04). | part B |
