## ADDED Requirements

### Requirement: Package identity and layout
The published package SHALL be named `@commercetools-labs/contentools-mcp`, version from `mcp/package.json` (1.0.0, release candidates `1.0.0-rc.N` first per Q-05), MIT licensed, and contain only `dist/`, `README.md`, `LICENSE` and `package.json`. Output SHALL be CommonJS (`.js`), ESM (`.mjs`) and declarations for each entry.

#### Scenario: tarball contents
- **WHEN** `npm pack --dry-run` is run on the publish directory
- **THEN** the file list contains only `dist/**`, `README.md`, `LICENSE`, `package.json`, and no `src`, `tests`, `.env*`, `build`, or `node_modules`

### Requirement: Exports map correct for all resolvers
The manifest SHALL expose `.`, `./ai-sdk`, `./langchain`, `./mcp`, `./package.json` with `import`/`require` conditions each carrying `types`, plus `typesVersions` for the subpaths, and a `bin` entry.

#### Scenario: resolution checks
- **WHEN** `publint` and `attw --pack` (default profile) run on the publish directory
- **THEN** both report no errors, and node10, node16 (CJS and ESM) and bundler resolution are green for every entry

#### Scenario: consumer smoke
- **WHEN** the tarball is installed into an empty temp project with `ai`, `@langchain/core` and `zod`, and each subpath is loaded with `require` and `import()`
- **THEN** every load succeeds and `Object.keys` of the exports match the documented API

### Requirement: Peer dependencies
The manifest SHALL declare peers `zod ^3.25.0 || ^4.0.0`, `ai ^6.0.0 || ^7.0.0` (optional), `@langchain/core ^0.3.0 || ^1.0.0` (optional), `@modelcontextprotocol/sdk >=1.27.0 <2` (optional); it MUST have no runtime `dependencies` and MUST NOT include `express`, Connect scripts, or `zod-to-json-schema`.

#### Scenario: compatibility matrix
- **WHEN** the adapter tests run against `ai@6/@langchain/core@0.3/zod@3.25` and against `ai@7/@langchain/core@1/zod@4`
- **THEN** both matrices pass

### Requirement: Local, confirmation-gated publishing
Publishing SHALL be done by `mcp/scripts/publish.mjs` run by a person: it MUST run checks, build, assemble `.publish/`, verify (publint, attw, smoke) and then default to `npm publish --dry-run`; a real publish requires `--publish` plus an interactive typed confirmation of the package name and version, uses the dist-tag `next` for prereleases, and MUST NOT use CI, provenance or tokens stored in the repository.

#### Scenario: dry run is the default
- **WHEN** `node scripts/publish.mjs` is run with no flags
- **THEN** it prints the tarball file list and exits 0 without publishing

#### Scenario: refusing a dirty or private publish
- **WHEN** `.publish/package.json` would contain `"private": true`, a `workspace:` range, or the version already exists on the registry
- **THEN** the script aborts before publishing with an explanatory message

### Requirement: App build unaffected
Adding adapters MUST NOT change the Connect build: `yarn gcp-build` SHALL still compile only `src/core`, `src/mcp`, `src/server`, and the app SHALL not require `ai` or `@langchain/core` at runtime.

#### Scenario: app build without adapters installed
- **WHEN** `ai` and `@langchain/core` are absent from `node_modules` and `yarn gcp-build && yarn start` is run
- **THEN** the build succeeds and the server starts
