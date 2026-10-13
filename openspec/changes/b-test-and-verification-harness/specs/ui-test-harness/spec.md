## ADDED Requirements

### Requirement: Puck packages use vitest
`puck/` SHALL provide a shared vitest configuration (jsdom, Testing Library, msw 2 with `onUnhandledRequest: 'error'`) and every package that gets tests SHALL expose `"test": "vitest run"`; the root `puck/package.json` SHALL expose `"test"` running all packages.

#### Scenario: puck-api smoke test
- **WHEN** `yarn test` is run in `puck/`
- **THEN** a smoke test of `puck-api` HTTP calls (msw-mocked) passes with no network

### Requirement: Admin app keeps the Merchant Center jest preset
`admin-app/` SHALL keep `jest.test.config.js` with `@commercetools-frontend/jest-preset-mc-app/typescript`, SHALL provide `src/test-utils/` helpers (existing `renderApplication*`) plus an msw handler helper compatible with the pinned msw 0.49.x `rest` API, and `yarn test` MUST run at least one passing smoke test.

#### Scenario: Render helper works
- **WHEN** the app's `test` script is run in `admin-app/`
- **THEN** the smoke test renders a component through `renderApplication` and passes

### Requirement: MCP package smoke test
`mcp/` SHALL run `vitest run` in `yarn test` with at least one test asserting the tool registry loads and every tool has a unique `method` name.

#### Scenario: Unique tool names
- **WHEN** `yarn test` is run in `mcp/`
- **THEN** the uniqueness test passes
