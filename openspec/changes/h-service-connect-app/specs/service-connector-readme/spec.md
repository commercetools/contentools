## ADDED Requirements

### Requirement: README states the failure stance per use case
`service/README.md` SHALL contain a section titled `Fail-open and fail-closed` with one row per use case: publishing/reading content when the commercetools API is down, preview and
mutations when auth cannot be verified, media upload/library when storage is down, datasource resolution and product search when Product Search is inactive or down, and the effect of
the service being down on commercetools itself. Each row SHALL state `fail-open` or `fail-closed`, the HTTP status returned, and the outbound timeout budget. The section SHALL state
that the service registers no API Extension, so its outage can never block carts, orders or any other commercetools operation.

#### Scenario: Section present
- **WHEN** the README test reads `service/README.md`
- **THEN** the heading `Fail-open and fail-closed` exists and its table has a row containing `API Extension` and `never block`

### Requirement: README lists scopes and every configuration key
The README SHALL contain a `Scopes` section listing each scope of `inheritAs.apiClient.scopes` with the call that needs it, and a `Configuration` table containing EVERY key
declared in `connect.yaml` for the `service` application with columns key, standard or secured, required, default, description, and the rule "CTP_* variables are injected by Connect and are not configured".

#### Scenario: Table matches manifest
- **WHEN** the README test parses `connect.yaml` and the README
- **THEN** every declared key appears in the Configuration table with the same standard/secured classification and the same default, and no key appears in the table that is not declared

#### Scenario: Scopes match manifest
- **WHEN** the README test reads the Scopes section
- **THEN** it names exactly the scopes of `inheritAs.apiClient.scopes`

### Requirement: README explains poison-message and replay handling
The README SHALL contain a section `Poison messages and replay` that states the service is not an event application (no Subscription, no queue, no dead-letter store), that therefore no
message can be redelivered or poisoned, how a failed write is retried (the caller retries; writes are idempotent upserts of Custom Objects by container and key), and how an operator
re-applies a failed change (repeat the request with the same key; read `deployment logs` filtered by `correlationId`).

#### Scenario: Section present
- **WHEN** the README test reads `service/README.md`
- **THEN** the heading `Poison messages and replay` exists and mentions `not an event application`

### Requirement: README documents operation
The README SHALL contain the sections `Run locally` (plain Node and Connect CLI commands), `Deploy` (the ordered `commercetools connect` commands for a sandbox deployment), `Logs and
correlation ids` (how to fetch `deployment logs` and filter by `correlationId`), `Lifecycle scripts`, and the three "unsupported" markers required by the labs rules (banner at the top).

#### Scenario: Required headings
- **WHEN** the README test lists the second-level headings
- **THEN** it contains `Run locally`, `Deploy`, `Logs and correlation ids`, `Lifecycle scripts`, `Scopes`, `Configuration`, `Fail-open and fail-closed`, `Poison messages and replay`
