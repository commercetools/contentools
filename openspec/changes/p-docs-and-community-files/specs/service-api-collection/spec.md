## ADDED Requirements

### Requirement: Postman collection reflects the single-token API
`service/postman/contentools-api.postman_collection.json` and `contentools-api.postman_environment.json` SHALL contain exactly the mounted routes documented in `docs/api-reference.md`, authenticate with a collection-level bearer variable `{{service_api_token}}` (health, status, published reads and configuration reads marked "No Auth", matching the access table of spec E), and SHALL NOT contain `x-project-key`, `project_key`, `authenticate-project`, `refresh-jwt`, `proxy-script`, `compile-upload`, legacy content-type CRUD, or any "cms" string.

#### Scenario: Collection matches the route table
- **WHEN** `node tools/check-docs-postman.mjs` lists every `METHOD {{base_url}}/path` in the collection and every row of the route table
- **THEN** the two sets are equal after normalising `:param` to `{{param}}`

#### Scenario: No secrets in the environment file
- **WHEN** the environment JSON is read
- **THEN** every `value` is empty or a localhost/default placeholder and `service_api_token` has type `secret`

### Requirement: Collection documents how to obtain a token
The collection description SHALL state that the bearer is the deployment's `SERVICE_API_TOKEN` (or, for Merchant Center sessions, a forwarded session JWT, which Postman cannot mint).

#### Scenario: Description reviewed
- **WHEN** the collection `info.description` is read
- **THEN** it names `SERVICE_API_TOKEN` and says health, published reads and configuration reads need no token
