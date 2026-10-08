# Human-only steps discovered by spec H

| ID | Step | Needed before | Details |
| -- | ---- | ------------- | ------- |
| M-H1 | Docker Desktop must be running for `commercetools connect validate` (buildpack build, tests in the image, Trivy scan). First run downloads several GB. | task 9.1 | Not a credential, but the agent cannot start Docker Desktop on your machine if it is stopped. |
| M-H2 | Activate **Product Search** in the sandbox project if it is not (Merchant Center > Settings > Project settings > Storefront Search), and call it once every 30 days or it deactivates itself. | live checks, postDeploy `ok` instead of `warn` | Docs: api/projects/product-search "Activate the Product Search API". |
| M-H3 | Create the **API client** for local runs with exactly the two scopes `manage_key_value_documents` and `view_products` (replaces the four scopes drafted in `plans/manual-steps.md` M-01: `view_business_units` and `view_stores` are not used by any call). | task 8.2, spec G/F live tests | Use `service/.env` (git-ignored). |
| M-H4 | Connect deployment access (M-05 in `plans/manual-steps.md`) for task 9.3: a CLI login in a sandbox region. There is no private fork: the SAME repository is made public first (after the spec R gate), then tags `v1.0.0-rc.N` are pushed and deployed with `connectorstaged create --repository-url <public repo url> --repository-tag v1.0.0-rc.N`. | task 9.3 (after R) | Until the repository is public, Connect cannot clone it; all earlier checks run locally. |
