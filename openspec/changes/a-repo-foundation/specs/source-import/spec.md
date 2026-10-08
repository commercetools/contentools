## ADDED Requirements

### Requirement: Copy only tracked source files
The import SHALL copy exactly the files listed by `git -C /Users/behnam/code/cms ls-files service contentools mcp puck` minus the exclude list in design.md, mapping `contentools/` to `admin-app/` and `puck/puck-react-test/` to `puck/playground/`.

#### Scenario: File count matches
- **WHEN** the import has finished
- **THEN** `service/` has 138 files, `admin-app/` 60, `mcp/` 35 and `puck/` 246 (of which `puck/playground/` 9)

### Requirement: No forbidden artifacts are imported
The target tree MUST NOT contain `node_modules`, `build`, `dist`, `.yarn`, `coverage`, `temp` directories, `.env` or `.env.<anything>` other than `.env.example`, `.DS_Store`, `*.log`, `.git`, `yarn.lock`, `Dockerfile`, `.dockerignore`, `docker-compose*.yml`, `netlify.toml`, a nested `LICENSE`, the `cms/` directory, or a `.github/` directory.

#### Scenario: Forbidden-artifact scan is empty
- **WHEN** the `find` command from tasks.md 3.4 is run over `service admin-app mcp puck`
- **THEN** it prints nothing

### Requirement: Path-rename fallout is fixed
After the rename `puck/package.json` SHALL list `playground` (not `puck-react-test`) in `workspaces`, SHALL expose a `start:playground` script, and `puck/playground/package.json` SHALL have `"name": "@commercetools-labs/puck-playground"`.

#### Scenario: Workspace entry renamed
- **WHEN** `grep -rn "puck-react-test" puck/package.json puck/playground/package.json` is run
- **THEN** there is no output

### Requirement: Every copied source file carries the SPDX header
After A, every `.ts .tsx .js .jsx .mjs .cjs` file outside generated/ignored directories SHALL start with the exact five-line header (comment delimiters included) (`SPDX-License-Identifier: MIT` / `Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors` / `Freely available, AS IS and UNSUPPORTED. See LICENSE.`).

#### Scenario: SPDX checker passes
- **WHEN** `yarn check:spdx` is run at the root
- **THEN** it exits 0 and prints `spdx: OK (<n> files)`

### Requirement: Source repository is never modified
The import MUST be read-only with respect to `/Users/behnam/code/cms`.

#### Scenario: Source unchanged
- **WHEN** `git -C /Users/behnam/code/cms status --short` is run after the import
- **THEN** its output equals its output before the import
