## ADDED Requirements

### Requirement: Service application declaration
The root `connect.yaml` SHALL declare an application with `name: service`, `applicationType: service` and `endpoint: /service`. The folder
`service/` SHALL exist at the repository root and be self-contained (own `package.json`, own lockfile, no npm/yarn workspaces at the repository root).
The Express application SHALL mount its router at `/service`, so that a request to `<connect-url>/service/health` is served and a request to
`/health` (without prefix) is a 404.

#### Scenario: Name, folder and endpoint agree
- **WHEN** the manifest test parses `connect.yaml`
- **THEN** every `deployAs[].name` is an existing directory at the repository root, and the `service` entry has `endpoint` `/service`

#### Scenario: Router mount matches the endpoint
- **WHEN** supertest calls `GET /service/health` and `GET /health` against the exported app
- **THEN** the first answers 200 and the second answers 404

#### Scenario: No root workspaces
- **WHEN** the root `package.json` is parsed
- **THEN** it has no `workspaces` field

### Requirement: Complete configuration table with correct secrecy
Every environment variable that the service reads from configuration SHALL be declared in the `service` application's `configuration`
section (`standardConfiguration` or `securedConfiguration`), each with a non-empty `description`, a boolean `required`, and a string `default`
where one exists. Credentials (identifiers of a credential pair, secrets, tokens, key material) SHALL be in `securedConfiguration`; locations, names and limits SHALL
be in `standardConfiguration`. The keys `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`, `CTP_API_URL` and `CTP_AUTH_URL` SHALL NOT be declared
(Connect injects them). No key whose name contains `SECRET`, `TOKEN`, `PRIVATE`, `PASSWORD`, `API_KEY`, `ACCESS_KEY` or ends in `_B64` SHALL be in `standardConfiguration`.
The manifest SHALL contain no Firestore key and no commented-out configuration.

#### Scenario: Drift guard
- **WHEN** the drift test scans `service/src/**/*.ts` for environment reads (`process.env.<NAME>`, `env.<NAME>` in the configuration readers, and the keys of the zod schema in `src/config/env.ts`)
- **THEN** every `<NAME>` is either declared in `connect.yaml` (the `service` block or `inheritAs.configuration`), or is in the allow-list of injected or runtime-only variables (`CTP_*`, `CONNECT_SERVICE_URL`, `NODE_ENV`, `PORT`), and the test fails with the list of undeclared names otherwise

#### Scenario: Parked files are gone
- **WHEN** the manifest test checks the file system
- **THEN** `service/src/_pending` does not exist

#### Scenario: Secret classification
- **WHEN** the manifest test inspects `standardConfiguration`
- **THEN** no key name matches the secret patterns, and `SERVICE_API_TOKEN`, `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64`, `MEDIA_AWS_ACCESS_KEY_ID`, `MEDIA_AWS_SECRET_ACCESS_KEY`, `MEDIA_CLOUDINARY_API_KEY` and `MEDIA_CLOUDINARY_API_SECRET` are present in `securedConfiguration`

#### Scenario: Injected keys are not redeclared
- **WHEN** the manifest test lists all declared keys
- **THEN** none starts with `CTP_`

#### Scenario: Optional provider keys are enforced in code
- **WHEN** `MEDIA_STORAGE_PROVIDER=gcp` is set and `MEDIA_GCP_BUCKET` is empty
- **THEN** the service refuses to start (spec G) even though `connect.yaml` marks the key `required: false`

### Requirement: Least-privilege API client
`connect.yaml` SHALL request the API client through `inheritAs.apiClient.scopes` containing exactly `manage_key_value_documents` and `view_products`, and SHALL NOT
contain `manage_project`, `manage_products`, any `manage_*` scope other than `manage_key_value_documents`, or any scope not backed by a call in `service/src`.
The scope list and the reason for each SHALL appear in `service/README.md`.

#### Scenario: Scope allow-list test
- **WHEN** the manifest test reads `inheritAs.apiClient.scopes`
- **THEN** the list equals `['manage_key_value_documents','view_products']` (order-insensitive) and the README scope table names both

#### Scenario: Scopes are used
- **WHEN** the scope audit test greps `service/src` for `.customObjects(` and `.products().search(`
- **THEN** at least one match exists for each, and no match exists for `.extensions(`, `.subscriptions(`, `.orders(`, `.customers(`, `.businessUnits(`, `.stores(`

### Requirement: Connect-conformant package scripts and runtime
`service/package.json` SHALL define the scripts `build`, `gcp-build`, `start`, `start:dev`, `test`, `typecheck`, `lint`, `test:e2e`, `connector:post-deploy` and
`connector:pre-undeploy`; set `engines.node` to `>=22`; depend on `@commercetools/platform-sdk` `^8` and `@commercetools/ts-client` `^4` and NOT on `@commercetools/sdk-client-v2`;
and use Yarn 1 classic (`yarn.lock` committed, no `package-lock.json`). `start` SHALL run `node build/index.js`, and the process SHALL listen on port 8080 (override with `PORT` for local runs only).
`test` SHALL pass offline, without environment variables and without network access.

#### Scenario: Required scripts exist
- **WHEN** the manifest test parses `service/package.json`
- **THEN** all ten scripts exist and `dependencies` has no `@commercetools/sdk-client-v2`

#### Scenario: Tests run through the Connect CLI
- **WHEN** `commercetools connect application test` is run inside `service/`
- **THEN** it runs `yarn run test` and exits 0

#### Scenario: Build and start
- **WHEN** `yarn build` then `node build/index.js` run with valid injected variables
- **THEN** the process listens on 8080 and `GET /service/health` answers 200

### Requirement: Cloud Run artefacts removed
The files `service/Dockerfile`, `service/.dockerignore` and `service/docker-compose.e2e.yml` SHALL NOT exist, and no file in the target tree SHALL reference
`Cloud Run`, `gcloud` or `GCP_FIRESTORE`.

#### Scenario: Grep gate
- **WHEN** `grep -rniE 'dockerfile|cloud run|gcloud|firestore' service connect.yaml` runs (excluding `node_modules` and `build`)
- **THEN** it prints nothing

### Requirement: Manifest validates with the Connect CLI
`commercetools connect validate` SHALL succeed on the repository (Docker required): buildpack build, offline tests, static analysis and dependency scan without
HIGH or CRITICAL findings that have a fix.

#### Scenario: Validation
- **WHEN** `commercetools connect validate .` runs on the final tree
- **THEN** it ends with a success status for the `service` application
