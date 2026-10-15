# Contentools

> **commercetools-labs reference code.** Freely available under the MIT license, shared as-is and
> not supported by commercetools. See [SUPPORT.md](SUPPORT.md) and [LICENSE](LICENSE).

**Let merchants build and publish storefront pages visually, with their content kept in commercetools.**

Storefront content usually means a developer for every new landing page, or a separate CMS to run
alongside commerce. This project is for merchants who want to own their pages, and for the
developers who wire those pages into a storefront.

Merchants compose **pages** and reusable **content items** with the [Puck](https://puckeditor.com/)
editor inside the Merchant Center, manage a **media library**, apply a **theme**, and keep
**draft / published** states with **version history**. Any storefront can then render the result
through a small content API (an MCP server also exposes it to AI agents). It is built for one
commercetools project: the one the Connect deployment is installed in.

When it works, a merchant edits a page, publishes it, and the storefront shows it, with no release.


What each part does, with pointers to the code: [FEATURES.md](FEATURES.md).
How it fits together: [docs/architecture.md](docs/architecture.md).

## What is in the repository

| Path | What it is |
| --- | --- |
| `service/` | The content API (Express + TypeScript), a commercetools Connect `service` application served at `/service` |
| `admin-app/` | A Merchant Center custom application (Connect `merchant-center-custom-application`) that hosts the editors |
| `mcp/` | An MCP server (Connect `service` application served at `/mcp`) that exposes the content API to AI agents |
| `puck/` | A Yarn workspace of ten npm packages (`@commercetools-labs/contentools-*`) and a Vite playground |
| `docs/` | Architecture, API reference, runbook |
| `tools/` | Repository checks and helper scripts |
| `connect.yaml` | The Connect definition for `service`, `mcp` and `admin-app` |

## Quick start

You need Node.js 22 (`.nvmrc`), Yarn 1 for `service/`, `admin-app/` and `mcp/`, Yarn 4 for `puck/`
(`corepack enable`), a commercetools project and an API client (see [INSTALL.md](INSTALL.md) for the
scopes). Each application installs on its own; there is no root workspace.

```bash
# 1. the content API on http://localhost:8080/service
cd service
cp .env.example .env     # fill in the CTP_* values and a SERVICE_API_TOKEN of at least 32 characters
yarn install --frozen-lockfile && yarn start:dev

# 2. the playground on http://localhost:5174 (in a second terminal)
cd puck && yarn install --immutable && yarn build
cp playground/.env.example playground/.env   # VITE_BASE_URL=http://localhost:8080/service
# put the same SERVICE_API_TOKEN in VITE_SERVICE_TOKEN, then
yarn start:playground
```

No commercetools project yet? The playground also runs against a bundled mock service:
`yarn workspace @commercetools-labs/contentools-playground mock` (see [puck/playground/README.md](puck/playground/README.md)).

The playground shows the canonical wiring: tabs for the page manager, content manager, theme manager
and a renderer panel.

Repository-wide checks (no network once dependencies are installed): `yarn verify` at the root runs
lint, typecheck, test and build for every application and for `puck/`. Per-part commands are listed in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Using the packages

```bash
yarn add @commercetools-labs/contentools-page-manager @commercetools-labs/contentools-renderer
yarn add react react-dom react-intl react-router-dom@5 @commercetools/nimbus @commercetools/nimbus-icons @chakra-ui/react
```

The full peer-dependency list (Nimbus, Chakra UI, slate for rich text) is in [puck/README.md](puck/README.md).

```tsx
import { PageManager } from '@commercetools-labs/contentools-page-manager';
import { PuckRenderer } from '@commercetools-labs/contentools-renderer';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads, required to edit
};

<PageManager {...connection} parentUrl="/pages" />
<PuckRenderer {...connection} type="page" slug="/home" mode="published" />
```

Packages: see [puck/README.md](puck/README.md) for the list, dependency graph and each package's props.

The editor UI ships English, German and Spanish messages. The German messages are machine-translated and have not been reviewed by a native speaker; the Spanish ones were carried over from earlier code and are also open to review. Both are open to correction by pull request.

## Authentication

Health, published page and content reads and configuration reads are public. Everything else (the draft
list, preview, templates, product search, datasource management, the media library and every write) needs
`Authorization: Bearer <token>`, where the token is either a Merchant Center session token forwarded by
the Merchant Center proxy (the `admin-app` does this for you) or the static `SERVICE_API_TOKEN` you
configure on the deployment (for scripts and the MCP server). Errors are JSON
`{ message, statusCode, correlationId }`. Details: [docs/architecture.md](docs/architecture.md#authentication).

## API

Base path `/service`, content scoped by business unit: `/service/<businessUnitKey>/puck-pages`, and so on.
Every route, its auth requirement and its payloads: [docs/api-reference.md](docs/api-reference.md).
A Postman collection is in [`service/postman/`](service/postman).

## Data and storage

Pages, content items, their draft and published states, version history, templates, the theme and other
configuration documents, content types and datasource definitions are commercetools **custom objects**
in the project (containers `puck-*`, `configuration`, `content-type` and `datasource`). Uploaded media goes
to the object store you choose (Google Cloud Storage, Amazon S3 or Cloudinary) because Connect
applications have no persistent disk; with no store configured the media endpoints answer 501.

## Deploying

The connector deploys three applications. Follow [INSTALL.md](INSTALL.md) (register the Merchant Center
application first, deploy, then update URLs and redeploy). Operating it: [docs/runbook.md](docs/runbook.md).

## Fail behaviour

The service keeps no state of its own. If commercetools cannot be reached it answers 503 (rate limit or
upstream 5xx) or 502 (upstream authorization) for that request, with no stale cache, so nothing is lost
and nothing is half-written outside commercetools. The full table is in [service/README.md](service/README.md#fail-open-and-fail-closed).

## Contributing, support, security

[CONTRIBUTING.md](CONTRIBUTING.md) - [SUPPORT.md](SUPPORT.md) - [SECURITY.md](SECURITY.md)

## License

MIT, see [LICENSE](LICENSE). Provided AS IS and UNSUPPORTED.
