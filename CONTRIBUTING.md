# Contributing

Contributions are welcome. This is unsupported reference code ([SUPPORT.md](SUPPORT.md)), so there is
no promise that a pull request is reviewed or merged.

## Layout rules that matter

Each Connect application (`service/`, `admin-app/`, `mcp/`) is self-contained: its own `package.json`
and lockfile, built from its own folder by Connect. Package managers differ per part: `service/`,
`admin-app/` and `mcp/` use Yarn 1 classic (committed `yarn.lock`, `yarn install --frozen-lockfile`),
`puck/` uses Yarn 4.5.1 (`yarn.lock`, `yarn install --immutable`, enabled with `corepack enable`); there
is no `package-lock.json` anywhere. There is no root workspace: the root `package.json` is only a
tooling hub with no dependencies. `puck/` is a Yarn 4 workspace of npm packages; `admin-app/` consumes
them from the npm registry, not from the workspace.

## Before a pull request

Node.js 22 (`.nvmrc`), Yarn 1 and `corepack enable` for the Yarn 4 part.

This repository has no CI service: Connect builds and deploys the applications, and quality gates are
local. The repository-wide commands, run from the repository root, need no network once the
applications' dependencies are installed:

```bash
yarn verify            # lint, typecheck, test and build for puck/, service/, mcp/ and admin-app/
yarn test:tools        # unit tests of the tools/ scripts
yarn check:spdx        # every source file has the SPDX header
yarn check:forbidden   # forbidden words and legacy surface
yarn docs:check        # documentation lint, configuration tables vs connect.yaml, Postman vs API reference
```

The per-application commands behind them (for working on one part), each run from the repository root:

```bash
yarn --cwd service install --frozen-lockfile && yarn --cwd service typecheck && yarn --cwd service lint && yarn --cwd service test && yarn --cwd service build
yarn --cwd mcp install --frozen-lockfile && yarn --cwd mcp check:app && yarn --cwd mcp check:connect-block
yarn --cwd admin-app install --frozen-lockfile && yarn --cwd admin-app verify   # needs the puck packages on npm, or see admin-app/README.md for the local-tarball route
cd puck && yarn install --immutable && yarn verify
```

Shortcuts: `yarn verify:service` and `yarn verify:mcp` at the root run the first two lines.
Tests that talk to a real commercetools project (`yarn test:e2e` in `service/`) are optional and need
your own sandbox project; never point them at a project you care about.

## Rules

- New source files carry the SPDX header the others have (`yarn headers` adds it):

  ```
  /*
   * SPDX-License-Identifier: MIT
   * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
   * Freely available, AS IS and UNSUPPORTED. See LICENSE.
   */
  ```

- Never commit credentials. Local configuration lives in git-ignored `.env` files next to a
  committed `.env.example`.
- Keep the documentation in step with the code: a new route needs a row in
  [docs/api-reference.md](docs/api-reference.md) and a request in the Postman collection, and a new
  configuration key needs a row in the tables of the README of its application
  (`yarn docs:check` fails otherwise).
- Do not add customer names, internal hostnames or project identifiers anywhere, including tests and fixtures.

By contributing you agree that your contribution is licensed under the MIT license.
