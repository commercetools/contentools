## ADDED Requirements

### Requirement: Workspace layout
The repository SHALL contain `puck/` as a self-contained Yarn 4 workspace with exactly the workspaces `packages/*` and `playground`. The repository root `package.json` SHALL NOT declare `workspaces`, and no Connect application folder SHALL depend on `puck/` through a workspace or `file:` link.

#### Scenario: Workspaces resolve
- **WHEN** a developer runs `yarn workspaces list` inside `puck/`
- **THEN** the output lists the root plus 10 `packages/puck-*` workspaces plus `playground`, and nothing else

#### Scenario: Root hub stays workspace-free
- **WHEN** `package.json` at the repository root is inspected
- **THEN** it has no `workspaces` key

#### Scenario: No local artefacts are carried over
- **WHEN** `git ls-files puck` is listed
- **THEN** it contains no `node_modules/`, `dist/`, `.yarn/cache`, `.env` or `.npmrc` path

### Requirement: Package identity
Each of the ten packages (`puck-types`, `puck-api`, `puck-components`, `puck-version-history`, `puck-image-picker`, `puck-theme-manager`, `puck-editor`, `puck-renderer`, `puck-page-manager`, `puck-content-manager`) SHALL be named `@commercetools-labs/<same-name>`, versioned `1.0.0`, licensed `MIT`, and declare `repository` (with `directory`), `bugs`, `homepage`, `engines.node` and `publishConfig.access = "public"`. The workspace root and the playground SHALL also be named under `@commercetools-labs/` and be `private`.

#### Scenario: Descriptions are reworded
- **WHEN** any published `package.json` `description` is read
- **THEN** it does not contain "CMS" (case-insensitive)

#### Scenario: Names and versions
- **WHEN** `node puck/scripts/verify-metadata.mjs` runs
- **THEN** it exits 0 and prints 10 package names of the form `@commercetools-labs/puck-*` all at `1.0.0`

#### Scenario: Old scope is gone
- **WHEN** `grep -rI "commercetools-demo" puck` (excluding `node_modules`, `.yarn`) is run
- **THEN** it returns no matches

#### Scenario: Repository metadata
- **WHEN** any published `package.json` is read
- **THEN** `repository.url` is `git+https://github.com/commercetools/contentools.git`, `repository.directory` is `puck/packages/<name>`, and `bugs.url` and `homepage` point at the same GitHub repository

### Requirement: Internal dependency rewiring
Every internal dependency SHALL use the `@commercetools-labs/` scope and the `workspace:^` range in source `package.json` files, SHALL be declared by every package that imports it, and SHALL NOT be declared by a package that does not import it. Source imports and `tsup` `external` lists SHALL reference only the new scope.

#### Scenario: Pack output has real ranges
- **WHEN** `yarn pack` is run for `puck-renderer`
- **THEN** the tarball's `package.json` lists `@commercetools-labs/puck-api`, `puck-components` and `puck-types` with caret ranges of `1.0.0` and contains no `workspace:` string

#### Scenario: Undeclared imports are rejected
- **WHEN** the dependency check script runs over every `packages/*/src`
- **THEN** it reports zero imports of a package that is not in that package's `dependencies`, `peerDependencies` or `devDependencies`

### Requirement: Published surface
Each package SHALL publish only `dist/`, `README.md` and the MIT `LICENSE` (copied from the repository root into the package directory at pack time by the release script, git-ignored, removed afterwards; no `LICENSE` file SHALL be committed inside `puck/packages/*`), expose one `exports["."]` entry with separate `types` for `import` and `require`, SHALL NOT set `sideEffects: false`, and SHALL emit both CJS and ESM builds with declaration files.

#### Scenario: Tarball contents
- **WHEN** `node puck/scripts/publish-packages.mjs` (dry run) packs any package
- **THEN** the tarball lists only `dist/*`, `README.md`, `LICENSE` and `package.json`, and afterwards `git status --porcelain` shows no `LICENSE` file inside `puck/packages/*`

#### Scenario: No per-package LICENSE committed
- **WHEN** `git ls-files 'puck/packages/*/LICENSE'` is run
- **THEN** it prints nothing

#### Scenario: Types resolve for ESM and CJS consumers
- **WHEN** the consumer fixture in `puck/scripts/fixtures/consumer` imports each package once as ESM (`moduleResolution: NodeNext`, `type: module`) and once as CJS and runs `tsc --noEmit`
- **THEN** both compile without "masquerading as CJS" or missing-types diagnostics

### Requirement: Licensing and wording hygiene
Every `.ts`, `.tsx`, `.mjs` file under `puck/` (excluding generated output and `node_modules`) SHALL start with the exact SPDX header from the Contentools conventions (including the two `FooterBlock.tsx` files, which contain the word "copyright" and therefore need the header added by hand); each published package SHALL ship a README opening with the "unsupported" banner. No file under `puck/` SHALL contain the words "cms" (case-insensitive, except the phrase "content management"), "demo", "POC" or "pre-sales", and no path SHALL contain `cms`.

#### Scenario: Footer blocks
- **WHEN** the first 8 lines of `FooterBlock.tsx` in `puck-components` and `puck-editor` are read
- **THEN** they contain the SPDX block

#### Scenario: Header present everywhere
- **WHEN** `node puck/scripts/check-headers.mjs` runs
- **THEN** it reports zero files without the header

#### Scenario: Forbidden words
- **WHEN** `grep -rniIE "\bcms\b|demo|\bpoc\b|pre-?sales" puck --exclude-dir=node_modules --exclude-dir=.yarn --exclude-dir=dist --exclude=yarn.lock` is run
- **THEN** it returns no matches, and `find puck -ipath '*cms*' -not -path '*/node_modules/*'` returns nothing

#### Scenario: Unsupported stated in each package README
- **WHEN** a package README is read
- **THEN** its first paragraph contains the word "unsupported"

### Requirement: Reproducible toolchain
`puck/` SHALL pin Node 22 (`engines`, repo `.nvmrc`) and Yarn `4.5.1` through `packageManager` (corepack), commit a regenerated `puck/yarn.lock`, use `nodeLinker: node-modules`, and install cleanly with `yarn install --immutable`.

#### Scenario: Clean install
- **WHEN** a fresh clone runs `corepack enable && cd puck && yarn install --immutable`
- **THEN** it exits 0 and the lockfile is unchanged (`git diff --exit-code puck/yarn.lock`)

### Requirement: Quality gates are green
From `puck/`, `yarn build`, `yarn typecheck`, `yarn lint` and `yarn test` SHALL each exit 0, and `yarn verify` SHALL run all four in order. Lint SHALL be configured (ESLint 9 flat config with typescript-eslint and react-hooks rules), forbid `any` and unused variables, and the build SHALL include the playground.

#### Scenario: Verify passes
- **WHEN** `yarn verify` is run in `puck/` on a clean checkout
- **THEN** it exits 0 and the output contains the build of 10 packages plus the playground, "0 errors" from ESLint and at least one passing vitest suite

#### Scenario: Hook-using render functions are components
- **WHEN** `yarn lint` runs
- **THEN** there are no `react-hooks/rules-of-hooks` findings in `puck-components`, and the 10 converted blocks render in a vitest smoke test without throwing

### Requirement: Local release tooling
`puck/scripts/bump-versions.mjs` and `puck/scripts/publish-packages.mjs` SHALL replace the bash scripts and run locally only (the project has no CI service). Publishing SHALL pack with Yarn, publish each tarball with `npm publish --access public` in dependency order, SHALL default to a dry run, SHALL require `--execute`, a clean git tree, a successful `npm whoami` and an interactive typed confirmation before any real publish, SHALL skip a package whose exact version already exists on the registry, SHALL map prerelease versions to a non-`latest` dist-tag, and SHALL NOT read, write or print npm tokens or `.npmrc` content.

#### Scenario: Default dry run
- **WHEN** a developer runs `node puck/scripts/publish-packages.mjs`
- **THEN** it prints the 10 `name@version` lines in dependency order, performs `npm publish --dry-run` for each tarball and exits 0 without any registry write

#### Scenario: Real publish is guarded
- **WHEN** `--execute` is passed with uncommitted changes, or without an npm login, or the confirmation is not typed
- **THEN** the script exits non-zero before publishing anything

#### Scenario: Idempotent re-run
- **WHEN** `--execute` is run and `@commercetools-labs/puck-types@1.0.0` already exists on npm
- **THEN** that package is logged as skipped and the remaining unpublished packages are still published

#### Scenario: Release candidates do not take latest
- **WHEN** the package version is `1.0.0-rc.0`
- **THEN** the publish command carries `--tag next`

#### Scenario: Valid dependency order
- **WHEN** the publish or bump script prints its package list
- **THEN** every package appears after all of its internal dependencies (for example `puck-editor` and `puck-renderer` before `puck-content-manager`)

#### Scenario: Lockstep bump
- **WHEN** `node puck/scripts/bump-versions.mjs 1.0.1` is run
- **THEN** all 10 package versions become `1.0.1` and no internal dependency range needs editing because ranges are `workspace:^`

### Requirement: Playground builds against the workspace
`puck/playground` SHALL build and type-check against the workspace packages (Vite aliases to package sources, dependencies declared as `workspace:^`), SHALL ship `.env.example` without credentials, and SHALL carry no "CMS" title.

#### Scenario: Playground build
- **WHEN** `yarn workspace @commercetools-labs/puck-playground build` runs
- **THEN** it exits 0 and `dist/index.html` has the title "Puck Playground"

### Requirement: API contract document stays truthful
`puck/docs/api-contracts.json` SHALL reference file paths that exist in the target tree and SHALL NOT describe fixed bugs as open.

#### Scenario: Paths exist
- **WHEN** a script reads every `file` field in `puck/docs/api-contracts.json` and strips any `:<line>` suffix
- **THEN** each path that starts with `puck/` exists in the repository
