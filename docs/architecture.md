# Architecture

How Contentools fits together. Unsupported commercetools-labs reference code, see [SUPPORT.md](../SUPPORT.md).
Routes: [api-reference.md](api-reference.md). Operations: [runbook.md](runbook.md).

## 1. Overview

```
 Merchant Center (browser)
   |  loads the custom application (static files, Connect application `admin-app`)
   |  every API call goes through the Merchant Center proxy: /proxy/forward-to
   v
 Merchant Center proxy  --(Authorization: Bearer <session token>, audience = service origin)-->
                                                         |
 Storefront (server or browser) --(published reads, no credentials)-->
                                                         v
 MCP client --Bearer MCP_ACCESS_TOKEN--> mcp ---Bearer SERVICE_API_TOKEN---> service  (Connect `service`, /service)
 (AI agent)      (Connect `mcp`, /mcp)                                          |
                                                                                +--> commercetools custom objects (one project)
                                                                                +--> Product Search (product picker, SKU datasources)
                                                                                +--> media store (GCS, S3 or Cloudinary), optional
```

One deployment serves one commercetools project: the project of the API client Connect generates for the
deployment. Nothing is stored outside commercetools and the media store.

## 2. Components

**`service/`** is the content API: an Express and TypeScript server on port 8080 whose router is mounted at
`/service` (`service/src/app.ts`, `service/src/routes/service.route.ts`). It talks to commercetools with a
client built from the injected `CTP_*` variables (`service/src/ct/client.ts`), stores everything as custom
objects (`service/src/ct/custom-objects.ts`) and resolves datasources while reading a published page
(`service/src/services/datasource-resolution.ts`). It is not an API Extension and not a Subscription
handler: commercetools never calls it.

**`admin-app/`** is a Merchant Center custom application (static files built by Connect). It has no login or
onboarding: it mounts the page, content and theme managers from the puck packages and gives them a
`fetcher` that sends every request through the Merchant Center `forward-to` proxy
(`admin-app/src/hooks/use-service-fetcher/`). The service URL is configuration (`CONTENTOOLS_SERVICE_URL`).

**`mcp/`** is an MCP server (stateless Streamable HTTP at `/mcp`) with 44 tools over the content API. It
never talks to commercetools; it calls the service with its own `SERVICE_API_TOKEN`. Clients authenticate
with `MCP_ACCESS_TOKEN`. Write tools are off unless `MCP_ENABLE_WRITES=true`.

**`puck/`** is a Yarn 4 workspace of ten npm packages and a Vite playground. Dependency graph (an arrow means
"depends on"):

```
contentools-types                 (base: shared types)
contentools-api                 -> contentools-types
contentools-components          -> contentools-api
contentools-version-history     -> contentools-types
contentools-image-picker        -> contentools-api, contentools-types
contentools-theme-manager       -> contentools-api, contentools-types
contentools-editor              -> contentools-api, contentools-components, contentools-version-history, contentools-types
contentools-renderer            -> contentools-api, contentools-components, contentools-types
contentools-page-manager        -> contentools-api, contentools-editor, contentools-renderer, contentools-version-history, contentools-types
contentools-content-manager     -> contentools-api, contentools-editor, contentools-renderer, contentools-version-history, contentools-types
```

Read it as: `contentools-types` is the base; `contentools-api` adds the client and hooks; `contentools-components` is the render-only
(Nimbus-free) component layer; `contentools-editor` composes the editor from it; `contentools-renderer` renders for
storefronts; the three managers (`contentools-page-manager`, `contentools-content-manager`, `contentools-theme-manager`) are the
router-aware screens. `contentools-image-picker` (media library field) and `contentools-version-history` are leaf packages that the editor and the managers use. Per-package details: [puck/README.md](../puck/README.md).

## 3. Authentication

(Referenced by the README as `#authentication`.)

**Public** (no credentials; an `Authorization` header is ignored): `GET /health` and `/status`, published
page and content reads and queries, and configuration reads. `POST /datasource/:key/test` is public only for
the two built-in keys `product-by-sku` and `products-by-sku`, and only when `PUBLIC_DATASOURCE_RESOLVE=true`
(rate limited). **Everything else needs a bearer token**: the draft list, preview, templates, product search,
datasource management, the media library and every write. Anything unknown below the gate answers 401.
The exact table is [api-reference.md](api-reference.md); the order is fixed in
`service/src/routes/service.route.ts` (public routers, then `requireAuth`, then the protected routers).

Two kinds of token are accepted (`service/src/auth/authenticate.ts`):

1. **Merchant Center session token.** The `admin-app` sends the request through the Merchant Center proxy
   with `forwardToConfig.audiencePolicy = 'forward-url-origin'`; the proxy adds a session token for the
   service origin. The service verifies it server side (`service/src/auth/mc-verifier.ts`, built on
   `@commercetools-backend/express`): signature against the Merchant Center key set of the issuer given by
   `CLOUD_IDENTIFIER`, audience equal to the origin of `CONNECT_SERVICE_URL` (the full-path audience form is
   accepted too), and the project claim must equal the configured project (otherwise 403). `MC_REQUIRED_PERMISSION`
   optionally demands a permission claim for writes. If the key set cannot be reached the answer is 503 with `Retry-After`.
2. **Static `SERVICE_API_TOKEN`** (at least 32 characters), compared in constant time
   (`service/src/auth/service-token.ts`). For scripts and the MCP application. With no value set, only
   Merchant Center tokens work.

If neither kind is enabled, every protected call answers 401; the start-up log line `authentication` says which
kinds are on. CORS (`service/src/middleware/cors.middleware.ts`): the allowed browser origins are the exact
origins in `CORS_ALLOWED_ORIGINS`; empty allows no browser origin. The Merchant Center hop is server to server and
needs none. Errors are JSON `{ message, statusCode, correlationId, code?, errors? }`, never a stack.

## 4. Data model

All data is custom objects in the project. Container names are fixed in `service/src/config/containers.ts`;
the only override is `CONTAINER_PREFIX`, prepended to every name (used by tests; changing it on a live
deployment hides existing content).

| Container | Key | Value |
| --- | --- | --- |
| `puck-page` | `puck-page-<uuid>` | the page `{ key, businessUnitKey, name, slug, puckData, meta, createdAt, updatedAt }` (the current, draft-side value) |
| `puck-page-state` | `<businessUnitKey>_<page key>` | `{ key, businessUnitKey, states: { draft?, published? } }` |
| `puck-page-version` | `<businessUnitKey>_<page key>` | `{ key, businessUnitKey, versions: [...] }`, newest first, at most `MAX_VERSIONS` |
| `puck-content`, `puck-content-state`, `puck-content-version` | same conventions, item key `puck-content-<uuid>` | content items `{ name, contentType, data, meta, ... }` |
| `puck-template` | `puck-template-<uuid>` | `{ name, kind, puckData }` |
| `configuration` | `<businessUnitKey>-<slice>` | one document per slice (`theme`, `header`, `facet`, `footer`, `site-metadata`, `category-listing`, `translations`, `b2b-account-menu-links`), falling back to the `default` business unit on read |
| `content-type` | content type key | the imported default content types |
| `datasource` | datasource key | stored datasource definitions; the built-ins `product-by-sku` and `products-by-sku` are constants in the code, not objects |

Draft, published and versions are represented as follows (`service/src/services/item-store.ts`): saving
(`POST`, `PUT`) updates the item object, sets the `draft` entry of its state object and pushes a version.
Publishing copies the item value into the `published` entry (and drops the draft with `?clearDraft=true`);
reverting restores the published value as the item and removes the draft. The state object, not the item, is
what published and preview reads consult. Concurrent writes are retried on a version conflict.
`businessUnitKey` is a content namespace inside the project; an item is only visible under the business unit it
was created in.

## 5. Media

`MEDIA_STORAGE_PROVIDER` selects `none` (default; the two media endpoints answer 501), `gcp`, `aws`
(Amazon S3 or an S3-compatible server) or `cloudinary` (`service/src/media/`). Objects are stored under
`<MEDIA_PATH_PREFIX>/<businessUnitKey>/<reverse timestamp>-<id>-<name>.<ext>`, so listing is newest first and a
business unit never matches another's prefix. Uploads are checked against an allow list of types by their
magic bytes. There is no persistent disk on Connect, so a bucket (or Cloudinary) is required for media. Only
Google Cloud Storage was verified against a live provider in this repository's development; S3 and Cloudinary are
tested against mocks.

## 6. Connect topology and deploy order

`connect.yaml` declares three applications and one shared API client (`inheritAs.apiClient`, scopes
`manage_key_value_documents` and `view_products`) and one shared setting (`CLOUD_IDENTIFIER`). Connect builds
each application from its own folder with its own lockfile. Deploy order and the reason for each step:

1. Register the Merchant Center custom application with a placeholder URL (the deployment needs its Application ID).
2. Deploy all three applications; read the service URL.
3. Redeploy with the service URL for `admin-app` (`CONTENTOOLS_SERVICE_URL`) and `mcp` (`CONTENT_SERVICE_URL`):
   Connect provides no variable holding a sibling application's URL.
4. Put the `admin-app` URL into the registration, install, grant permissions.

`admin-app` installs the puck packages from the npm registry (`yarn install --frozen-lockfile` in its own
folder), not from the workspace, so the puck packages must be published before the first Connect build of
`admin-app`. Step by step: [INSTALL.md](../INSTALL.md).

## 7. Design decisions

- **Single project.** One deployment, one commercetools project, one API client. No per-project registry and no per-request project selection.
- **Business-unit scoping.** Content is namespaced by `businessUnitKey` in the URL; this isolates content, it is not a security boundary between customers.
- **No workspace at the root.** Each Connect application is self-contained with its own lockfile; the root `package.json` only hosts tooling.
- **No database.** Custom objects hold all state, so the service is stateless and can scale to zero.
- **Public published reads.** A storefront reads published pages, content and configuration without credentials; drafts, previews and all writes require a token.
- **Static token for machines.** Scripts and the MCP server use `SERVICE_API_TOKEN` (constant-time comparison, rotated by redeploying); people use their Merchant Center session.
