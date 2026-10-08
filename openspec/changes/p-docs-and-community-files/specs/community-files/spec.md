## ADDED Requirements

### Requirement: SUPPORT.md states the unsupported terms
`SUPPORT.md` SHALL state that the repository is commercetools-labs reference code and is unsupported, that it is available under MIT AS IS without warranty, that issues are the only channel and nobody is obliged to answer, and that commercetools product questions go to commercetools Support. It SHALL contain the word "unsupported" (case-insensitive).

#### Scenario: Unsupported stated three times
- **WHEN** the repository is checked for the word UNSUPPORTED in a source file header, in `README.md` lines 1-10 and in `SUPPORT.md`
- **THEN** all three are found

### Requirement: CONTRIBUTING.md gives the exact pre-PR commands
`CONTRIBUTING.md` SHALL list the install, typecheck, lint, test and build commands for each of `service/`, `admin-app/`, `mcp/` and `puck/`, the SPDX header block, the no-"cms" and no-secrets rules, and state that contributions are licensed MIT and that review is not promised.

#### Scenario: Commands are runnable
- **WHEN** an implementer runs every command block in `CONTRIBUTING.md` on a clean clone
- **THEN** each exits 0

### Requirement: SECURITY.md routes vulnerability reports privately
`SECURITY.md` SHALL tell reporters to use GitHub private vulnerability reporting (Security tab -> Report a vulnerability) and not a public issue, state there is no SLA and no support, and list what is in scope (the service auth, token handling, CORS, media upload).

#### Scenario: No contact data required
- **WHEN** `SECURITY.md` is read
- **THEN** it contains no email address and no phone number, and links to the repository's security advisories page

### Requirement: Community files pass the publish gate
`SUPPORT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `README.md` SHALL contain no customer or prospect name, internal host, GCP project id, secret, or the words "demo", "POC", "pre-sales" at word boundaries.

#### Scenario: Gate dry run clean for docs
- **WHEN** `node <skill>/scripts/gate.mjs --repo <scratch clone> --no-history` runs after the docs are committed in a scratch repository
- **THEN** it reports zero findings located in `*.md` files
