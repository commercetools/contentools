## ADDED Requirements

### Requirement: Front ends call only kept routes
`tools/check-legacy-route-calls.mjs` SHALL extract every template literal beginning with `${baseURL}` or `${baseUrl}` from `puck/packages/*/src`, `puck/playground/src`, `admin-app/src` and `mcp/src` and classify its path against the allow-list: `/${businessUnitKey}/[{published|preview|${mode}}/](puck-pages|puck-contents|puck-templates|configuration|upload-file|media-library|content-type/import)...`, `/datasource/...`, `/products/search...`, and (until spec K/E remove them) `/authenticate-project`, `/refresh-jwt`, `/health`; any other path SHALL make the script exit 1.

#### Scenario: Puck API is clean
- **WHEN** `yarn check:legacy-calls` is run after C
- **THEN** it prints `legacy-calls: OK (<n> endpoint templates, 0 legacy)` and exits 0

#### Scenario: A legacy call is caught
- **WHEN** a file contains `` `${baseURL}/${businessUnitKey}/content-items` ``
- **THEN** the script exits 1 naming that file and path

### Requirement: Evidence recorded
tasks.md SHALL record the script output in `plans/evidence/c/legacy-calls.txt` (git-ignored) as proof that removal is safe.

#### Scenario: Evidence file exists
- **WHEN** task 3.3 is done
- **THEN** `plans/evidence/c/legacy-calls.txt` exists and ends with `0 legacy`
