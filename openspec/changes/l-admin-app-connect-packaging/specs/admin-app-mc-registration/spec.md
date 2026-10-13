## ADDED Requirements

### Requirement: Register first, update the URL last
The documented deployment sequence SHALL be: (1) register the custom application in the Merchant Center with a placeholder Application URL and obtain its Application ID, (2) publish puck packages to npm, (3) deploy the Connector with `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `CLOUD_IDENTIFIER`, (4) read the `admin-app` and `service` URLs from the deployment, (5) redeploy with `admin-app.CONTENTOOLS_SERVICE_URL=<service URL>`, (6) replace the placeholder Application URL in the registration with the `admin-app` URL, (7) install the application for the project and grant team permissions.

#### Scenario: Runbook is complete
- **WHEN** a reader follows `admin-app/README.md` section "Deploy" from a project with no prior setup
- **THEN** every step names the exact command or Merchant Center screen, and the step order matches the list above

#### Scenario: URL lookup
- **WHEN** `commercetools connect deployment describe --key <deployment>` is run after a successful deployment
- **THEN** the output lists the URL of application `admin-app` and of application `service`

### Requirement: Registration mirrors the config file
The registered scopes, main-menu label and link permissions SHALL equal those in `custom-application-config.mjs`, and the README SHALL state that changing the file does not change the registration and that `mc-scripts config:sync` (or the UI) must be used.

#### Scenario: Dry-run sync
- **WHEN** `yarn --cwd admin-app mc-scripts config:sync --dry-run` is run with a logged-in CLI and `CUSTOM_APPLICATION_ID` set
- **THEN** it reports no pending difference for scopes and menu

### Requirement: Permission mapping to the service
The View permission SHALL gate the application and the Manage permission SHALL be the one the service maps to write access through the forwarded `userPermissions` claim (`canManage<EntryPointPascalCase>`); the documentation SHALL give the exact claim names for the default entry point (`canViewContentools`, `canManageContentools`).

#### Scenario: Claim names
- **WHEN** a user with the Manage permission opens the app and a request is sent through forward-to
- **THEN** the exchange token's `user_permissions` claim contains `canManageContentools` (verified by the service log or a decoded token in the Chrome network panel)

### Requirement: Verification split
The verification section SHALL separate checks that need no Merchant Center login (validate, simulated build, bundle and CSP inspection, unit tests) from checks that need a logged-in session (menu entry, forward-to calls, CSP console, German UI, permission denial), and mark the latter as owner-assisted.

#### Scenario: Automatable part
- **WHEN** tasks.md part A is executed by an agent without any Merchant Center credential
- **THEN** every A check can reach a pass or fail verdict

#### Scenario: Login-gated part
- **WHEN** part B is executed
- **THEN** it begins with the prerequisite "Merchant Center session available (M-04)" and records evidence screenshots under `plans/evidence/l/`

### Requirement: Teardown and redeploy safety
Redeploying SHALL always send every `admin-app` configuration key (because omitted keys lose their value), and the README SHALL document the command with all keys.

#### Scenario: Redeploy keeps values
- **WHEN** the documented redeploy command is run to change only `CONTENTOOLS_SERVICE_URL`
- **THEN** after it completes `deployment describe` still shows the previous `CUSTOM_APPLICATION_ID` and `ENTRY_POINT_URI_PATH`
