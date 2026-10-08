## ADDED Requirements

### Requirement: Fake commercetools server for browser runs
`tools/fake-ct/server.mjs` SHALL start a standalone HTTP server (default port 8099) implementing the same endpoints and in-memory store semantics as the jest fake, so the service can be started with `CTP_API_URL=http://localhost:8099` and `CTP_AUTH_URL=http://localhost:8099` and exercised from a browser without a sandbox project.

#### Scenario: Token and custom object round trip
- **WHEN** the server is running and `curl -s -X POST localhost:8099/oauth/token -d grant_type=client_credentials` is called
- **THEN** a JSON body with `access_token` and `expires_in` is returned

### Requirement: Chrome DevTools playbooks
`tools/verify/` SHALL contain numbered playbooks (markdown) giving, for each UI check, the exact ordered Chrome DevTools connector calls (`new_page`, `navigate_page`, `wait_for`, `take_snapshot`, `click`/`fill`, `evaluate_script`, `list_console_messages`, `list_network_requests`, `take_screenshot`), the expected text/status per step and the evidence file name under `plans/evidence/<spec>/`.

#### Scenario: Playbook is executable
- **WHEN** an implementer follows `tools/verify/02-playground-smoke.md` with the stack from `01-start-stack.md` running
- **THEN** every step lists a tool, parameters and an objective assertion, and the final checklist states "no console errors, no 4xx/5xx, no `x-project-key` header"

### Requirement: Merchant Center checks are labelled owner-assisted
Playbooks touching `admin-app` in Merchant Center MUST be split into "A. automatable" and "B. needs MC login (owner-assisted)" and state that MC SSO/2FA cannot be automated.

#### Scenario: Labelled
- **WHEN** `tools/verify/05-mc-app-owner-assisted.md` is opened
- **THEN** its first lines name the human-only precondition (manual step M-04)

### Requirement: Evidence is never published
Evidence output (`plans/evidence/`) SHALL be git-ignored and the playbooks MUST NOT instruct saving secrets (tokens, client secrets) in screenshots or snapshots.

#### Scenario: Ignored path
- **WHEN** `git check-ignore plans/evidence/b/x.png` is run in a scratch repo with the root `.gitignore`
- **THEN** the path is reported ignored
