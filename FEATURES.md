# Features

What Contentools does, with pointers to the code. Operating it: [docs/runbook.md](docs/runbook.md).
Routes: [docs/api-reference.md](docs/api-reference.md). Unsupported reference code, see [SUPPORT.md](SUPPORT.md).

## The parts

| Part | Where | Role |
| --- | --- | --- |
| Content API | `service/`, Connect application `service` | Pages, content items, states, versions, templates, configuration documents, datasources, product search, media |
| Merchant Center app | `admin-app/`, Connect application `admin-app` | Hosts the page, content and theme managers |
| MCP server | `mcp/`, Connect application `mcp` | 44 AI tools over the content API (24 read, 20 write; writes are off by default) |
| Packages | `puck/packages/` | `@commercetools-labs/contentools-*`, ten npm packages |

## Features

- **Visual page builder:** `puck/packages/contentools-editor/src/PuckEditor.tsx`, built-in components in `puck/packages/contentools-editor/src/components/`
- **Standalone content items:** `puck/packages/contentools-content-manager/`, routes `service/src/routes/puck-contents.route.ts`
- **Draft / published / preview, revert draft:** `service/src/routes/puck-pages.route.ts` and `service/src/routes/item-routes.ts` (`/states/published`, `/states/draft`), storage in `service/src/services/item-store.ts`
- **Version history with diff:** `puck/packages/contentools-version-history/`, `MAX_VERSIONS` in `service/src/config/env.ts`
- **Page templates:** `service/src/routes/puck-templates.route.ts`, `puck/packages/contentools-editor/src/toolbar/CreateTemplateDialog.tsx`
- **Theme and configuration documents** (theme, header, footer, facet, site-metadata, category-listing, translations, b2b-account-menu-links): `service/src/routes/configuration.route.ts`, `service/src/config/slices.ts`, `puck/packages/contentools-theme-manager/`
- **Content-type import:** `POST /content-type/import`, `service/src/routes/content-type.route.ts`, `puck/packages/contentools-theme-manager/src/components/import-content-types.tsx`
- **Datasources and product search:** `service/src/routes/datasource.route.ts`, `service/src/routes/products.route.ts`, `service/src/services/datasource-resolution.ts`, `puck/packages/contentools-editor/src/fields/DatasourceField.tsx`
- **Media library and upload (Google Cloud Storage, Amazon S3, Cloudinary):** `service/src/media/`, `service/src/routes/media.route.ts`, `puck/packages/contentools-image-picker/`
- **Authentication (Merchant Center session token or static service token):** `service/src/auth/`, `service/src/middleware/auth.middleware.ts`; the client side adapter `admin-app/src/hooks/`
- **Business-unit scoping:** every content route is `/:businessUnitKey/...`, see `service/src/routes/params.ts`
- **Renderer (client and server-side):** `puck/packages/contentools-renderer/` (`PuckRenderer`, `PuckDataRenderer`, `loadPuckData`), render-only config in `puck/packages/contentools-components/`
- **Languages (English, German, Spanish):** `intl/` folder of each UI package; the German catalogs are machine-translated and not reviewed by a native speaker
- **MCP tools:** `mcp/src/core/tools/`, transport in `mcp/src/mcp/server.ts`, HTTP app in `mcp/src/server/app.ts`
- **Connect packaging and lifecycle checks:** `connect.yaml`, `service/src/connector/`, `mcp/src/server/post-deploy.ts`

## Not included

Multi-project hosting, a database other than commercetools custom objects, and any legacy per-project
authentication flow. One deployment serves one commercetools project.
