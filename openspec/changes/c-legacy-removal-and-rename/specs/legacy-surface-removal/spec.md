## ADDED Requirements

### Requirement: Legacy HTTP routes are removed
The service SHALL NOT expose any of the 44 legacy routes listed in explore.md section 2 (content-items and their states/versions, grid pages and their rows/components/states/versions, page-items states, content-type CRUD, `proxy-script`, `compile-upload`); the service SHALL keep `POST /service/content-type/import`, all `puck-pages`, `puck-contents`, `puck-templates`, `configuration/*`, `datasource/*`, `products/search`, `upload-file`, `media-library` routes and `GET /service/health`.

#### Scenario: Legacy route answers 404
- **WHEN** the app is exercised with supertest for `GET /service/test-bu/content-items`, `GET /service/test-bu/pages`, `GET /service/proxy-script` and `POST /service/compile-upload`
- **THEN** each answers 404 with body `{"message":"Path not found."}` (fallthrough to the app 404 handler)

#### Scenario: Kept route still mounted
- **WHEN** the express router stack of `routes/service.route.ts` is inspected
- **THEN** `puck-pages`, `puck-contents`, `puck-templates`, `configuration`, `datasource`, `products/search`, `upload-file`, `media-library`, `content-type/import` handlers are present

### Requirement: Legacy code and dependencies are deleted
The files listed in tasks.md Section 4 MUST be deleted from `service/`, the bundler packages (`lit`, `rollup`, `@rollup/plugin-commonjs`, `@rollup/plugin-node-resolve`, `@rollup/plugin-typescript`, `rollup-plugin-string`, `rollup-plugin-typescript2`, `vite`, `vite-node`) MUST be removed from `service/package.json`, and `@babel/standalone` MUST remain (content-type import uses it).

#### Scenario: Service has no dead module
- **WHEN** an import-graph walk from `service/src/index.ts` is run and compared with `find service/src -name '*.ts'`
- **THEN** the only unreachable file is `validators/env.validators.ts` (kept for spec D)

#### Scenario: Service still compiles
- **WHEN** `yarn tsc --noEmit -p service/tsconfig.json` is run after the deletions
- **THEN** it exits 0

### Requirement: MCP legacy tools are pruned
`mcp/` SHALL expose only the `configuration`, `datasource`, `file` (`upload_file`, `get_media_library`) tool groups and `import_content_types`; the 46 legacy tools and their entries in `shared/functions.ts` MUST be removed and every `method` in the registry MUST have an implementation.

#### Scenario: Registry matches implementations
- **WHEN** a script compares `allTools.map(t => t.method)` with the keys of the functions map
- **THEN** the sets are equal and the count is 42

### Requirement: Legacy e2e and docs are removed
The ten legacy e2e files, `service/README.md` legacy content, the old `.github/` workflows and Docker packaging MUST NOT exist in the repository; `.github/` MUST NOT exist at all.

#### Scenario: No workflows
- **WHEN** `ls .github 2>&1` is run
- **THEN** it reports that the directory does not exist
