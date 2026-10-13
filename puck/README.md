# Puck packages

> **UNSUPPORTED - commercetools-labs.** Freely available, AS IS and UNSUPPORTED. See [LICENSE](../LICENSE). Not covered by commercetools support.

A set of `@commercetools-labs/contentools-*` packages that add a Puck-based visual page
editor, content manager, theme manager and renderer to a commercetools project.
This guide covers **how to consume the packages from a host application**.

For how the packages fit with the service and the Merchant Center app, see
[docs/architecture.md](../docs/architecture.md); the reference wiring is [playground/](playground/README.md).

---

## Packages

Each package has its own README with install, usage, API and peer dependencies.

| Package | Import | What it gives you |
| --- | --- | --- |
| [`@commercetools-labs/contentools-page-manager`](packages/contentools-page-manager/README.md) | `PageManager` | Page list + editor/preview routes |
| [`@commercetools-labs/contentools-content-manager`](packages/contentools-content-manager/README.md) | `ContentManager` | Standalone content-block list + editor |
| [`@commercetools-labs/contentools-theme-manager`](packages/contentools-theme-manager/README.md) | `ThemeManager`, `ImportContentTypes` | Design-token editor and content-type import |
| [`@commercetools-labs/contentools-renderer`](packages/contentools-renderer/README.md) | `PuckRenderer`, `PuckDataRenderer`, `loadPuckData` | Storefront rendering (data-fetching / pure / server side) |
| [`@commercetools-labs/contentools-editor`](packages/contentools-editor/README.md) | `PuckEditor`, `createDefaultPuckConfig`, built-in component factories | Raw editor + Puck config for custom compositions |
| [`@commercetools-labs/contentools-components`](packages/contentools-components/README.md) | `defaultRenderConfig`, render fns | Nimbus-free component render layer shared by the editor + renderer ([rich-text theming variables](packages/contentools-components/README.md#theming-rich-text-puck-rich-text-content)) |
| [`@commercetools-labs/contentools-api`](packages/contentools-api/README.md) | `PuckApiProvider`, `createPuckClient`, hooks | Data layer (pages, contents, media, datasource, theme) |
| [`@commercetools-labs/contentools-version-history`](packages/contentools-version-history/README.md) | `VersionHistoryButton`, hooks | Version history panel and diff |
| [`@commercetools-labs/contentools-image-picker`](packages/contentools-image-picker/README.md) | `ImagePickerField`, `ImagePickerProvider` | Image picker with a media library |
| [`@commercetools-labs/contentools-types`](packages/contentools-types/README.md) | types only | Shared TypeScript types |

Dependency graph (an arrow means "depends on"):

```
contentools-types                 (base)
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

`PageManager`, `ContentManager`, `ThemeManager`, `PuckEditor` and `PuckRenderer`
are **self-contained**: each mounts its own data + UI context internally, so you
can drop them straight into a route without wiring providers yourself.

---

## Requirements

- **React 19** (the packages target React 19 and Nimbus requires it).
- A running **service backend** exposing the `/:businessUnitKey/puck-pages`
  routes (see [Backend](#backend)).

### Peer dependencies

The packages do **not** bundle their UI toolkit — install these peers in your
host app:

```bash
# UI toolkit (commercetools Nimbus, built on Chakra UI v3)
npm install @commercetools/nimbus@^3.2.0 \
            @commercetools/nimbus-icons@^3.2.0 \
            @commercetools/nimbus-tokens@^3.2.0 \
            @chakra-ui/react@^3.36.0 \
            @emotion/react@^11.14.0

# Puck core + framework peers
npm install @measured/puck@^0.18.2 \
            react@^19 react-dom@^19 \
            react-intl@^10 \
            react-router-dom@^5   # v5 — the managers use the v5 router API

# Rich-text editing (Nimbus RichTextInput, used by the editor)
npm install slate@^0.123.0 slate-dom@^0.123.0 slate-history@^0.115.0 \
            slate-hyperscript@^0.115.0 slate-react@^0.123.0
```

> `react-router-dom` must be **v5**. If your app is on v6+, mount the managers in
> an isolated route subtree pinned to v5, or use `PuckRenderer` (no router
> dependency) for the storefront side.

Then install the packages you need:

```bash
npm install @commercetools-labs/contentools-page-manager \
            @commercetools-labs/contentools-content-manager \
            @commercetools-labs/contentools-theme-manager \
            @commercetools-labs/contentools-renderer
```

---

## Using Tailwind alongside the editor

The editor UI is built with Nimbus (Chakra UI v3), which ships a global CSS
reset. The packages mount Nimbus through a **reset-isolated** provider so that
reset is not injected document-wide and does **not** clobber your app's Tailwind
(or other global) styles.

Nothing extra is required on the host side for basic coexistence. If you are on
**Tailwind v4** and want a belt-and-suspenders guarantee that your utilities win
the cascade, declare the layer order at the top of your global stylesheet,
before importing Tailwind:

```css
/* app.css */
@layer reset, tokens, recipes, theme, base, components, utilities;
@import 'tailwindcss';
```

---

## Usage

Common configuration passed to every manager:

```tsx
const connection = {
  baseURL: 'https://your-service.example.com/service',
  businessUnitKey: 'your-business-unit-key',
  jwtToken: 'optional-token', // or getAuthHeaders / fetcher, see "Authentication"
  locale: 'en-US', // optional; sets the UI language (en/es/de) + locale-aware calls (e.g. product search)
};
```

The connection is the same for every component (`PuckConnection` from
`@commercetools-labs/contentools-types`). There is no project key: one service serves one
commercetools project, and `businessUnitKey` only scopes the content.

### Page manager

```tsx
import { PageManager } from '@commercetools-labs/contentools-page-manager';

export function PagesRoute() {
  return (
    <PageManager
      {...connection}
      parentUrl="/pages" // route path this manager is mounted at (router basename)
    />
  );
}
```

Props: `parentUrl` (required), the connection (`baseURL`, `businessUnitKey`,
`locale?`, `jwtToken?`, `getAuthHeaders?`, `fetcher?`), `config?` (custom Puck
`Config`), `backButton?`, `messageOverrides?` (see
[Localization](#localization-i18n)).

### Content manager

```tsx
import { ContentManager } from '@commercetools-labs/contentools-content-manager';

export function ContentRoute() {
  return <ContentManager {...connection} parentUrl="/content" defaultContentType="hero" />;
}
```

Props: same as `PageManager`, plus `defaultContentType?`.

### Theme manager

```tsx
import { ThemeManager } from '@commercetools-labs/contentools-theme-manager';

export function ThemeRoute() {
  return <ThemeManager {...connection} />;
}
```

Props: the connection, `backButton?`, `messageOverrides?` (see
[Localization](#localization-i18n)).

### Renderer (storefront)

Render a published (or preview/draft) page or content item. `PuckRenderer`
fetches the data itself:

```tsx
import { PuckRenderer } from '@commercetools-labs/contentools-renderer';

// Render a page by key (or by slug). Published content needs no token.
<PuckRenderer
  type="page"
  baseURL={connection.baseURL}
  businessUnitKey={connection.businessUnitKey}
  pageKey="home-page"      // or: slug="/home"
  mode="published"          // or "preview" (needs jwtToken, getAuthHeaders or fetcher)
/>

// Render a content item
<PuckRenderer
  type="content"
  baseURL={connection.baseURL}
  businessUnitKey={connection.businessUnitKey}
  contentKey="hero-banner"  // or: query="hero" (content type)
  mode="published"
/>
```

For SSR or when you already hold the Puck data, use the pure renderer:

```tsx
import { PuckDataRenderer } from '@commercetools-labs/contentools-renderer';

<PuckDataRenderer data={puckData} />;
```

`PuckRenderer`'s `baseURL`/`businessUnitKey` are optional if a
`PuckApiProvider` is already mounted higher in the tree. Without either it shows
a message instead of throwing.

#### Theming rendered rich text

Rich-text blocks render inside `.puck-rich-text-content` with a scoped
stylesheet whose every property reads a CSS variable (default as fallback), so
you can restyle headings, links, lists, code, etc. from your own CSS:

```css
.puck-rich-text-content {
  --puck-rich-text-content--h1--font-size: 3rem;
  --puck-rich-text-content--a--color: #e94560;
}
```

See the full variable reference in
[`@commercetools-labs/contentools-components` README](packages/contentools-components/README.md#theming-rich-text-puck-rich-text-content).

### Custom Puck config

Every manager builds a **localized** default config automatically — omit the
`config` prop and the built-in components render with labels in the active
`locale`.

To customize, build from `createDefaultPuckConfig(intl)` and extend it. Labels
are resolved at build time, so build the config inside a component that has a
react-intl context (e.g. your host app's `<IntlProvider>`):

```tsx
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { createDefaultPuckConfig } from '@commercetools-labs/contentools-editor';

function PagesRoute() {
  const intl = useIntl();
  const puckConfig = useMemo(() => {
    const base = createDefaultPuckConfig(intl);
    return {
      ...base,
      components: {
        ...base.components,
        // your custom components here
      },
    };
  }, [intl]);

  return <PageManager {...connection} parentUrl="/pages" config={puckConfig} />;
}
```

> The older `defaultPuckConfig` **const** is still exported but **deprecated**
> (English-only). Prefer `createDefaultPuckConfig(intl)` so component and field
> labels follow the active locale.

The **same `config` must be used** in the manager (authoring) and the renderer
(display) so component data round-trips correctly.

---

## Authentication

Every component takes the same three optional ways to authenticate. Reads of
published content and the theme are public; everything else (editing, preview,
lists, media, product search) needs credentials.

1. **Static token.** `jwtToken: '...'` is sent as `Authorization: Bearer <token>`.
   Use a service token on a server or in local development only; never ship a
   long-lived token to a browser.
2. **Refreshing credentials.** `getAuthHeaders: async () => ({ Authorization: ... })`
   runs before every request and wins over `jwtToken`, so a rotated token applies to
   the next call without remounting anything.
3. **Transport override (Merchant Center).** `fetcher: (request) => Promise<response>`
   replaces `fetch`. Inside the Merchant Center a custom application cannot hold a
   token; the host sends requests through the forward-to proxy, which adds the
   credentials itself. This adapter is implemented by the Contentools admin app
   (sketch below); the packages only guarantee that the fetcher receives the
   absolute URL, method, headers and body (JSON string or `FormData`) and returns
   anything shaped like a `Response`.

```tsx
import type { PuckFetcher } from '@commercetools-labs/contentools-types';

// Implemented by the Contentools admin app (Merchant Center application kit).
const fetcher: PuckFetcher = async ({ url, method, headers, body }) =>
  executeHttpClientRequest(
    async ({ credentials, headers: mcHeaders }) => {
      const res = await fetch(buildApiUrl('/proxy/forward-to'), {
        method,
        credentials,
        headers: {
          ...mcHeaders,
          // custom headers for the backend are prefixed
          ...Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [`x-forward-header-${k.toLowerCase()}`, v])
          ),
        },
        body: body as BodyInit | undefined,
      });
      return { data: res, statusCode: res.status, getHeader: (n) => res.headers.get(n) };
    },
    { forwardToConfig: { uri: url, audiencePolicy: 'forward-url-origin', version: 2 } }
  );
```

Anything shaped like `fetch` adapts in one line with `fetcherFromFetch(fetch)`
(exported from `contentools-api`).

**Public rendering and preview.** `PuckRenderer` and `PuckDataRenderer` work
without any provider. Published product blocks use the `resolvedData` the service
embeds in the page, so a storefront needs no token to render published pages.
`mode="preview"` without an auth source shows "Preview requires authentication"
and sends no request. Product blocks that were never resolved stay empty unless
the connection sets `publicDatasourceResolve` (mirror of the service flag
`PUBLIC_DATASOURCE_RESOLVE`) or has credentials.

**Errors.** Calls reject with `PuckHttpError` (`status`, `body`, `serverMessage`,
`code`, `correlationId`). `PuckAuthError` extends it for 401 and 403 and carries
`authCode`: `PUCK_AUTH_REQUIRED` (no auth source configured, nothing was sent) or
`PUCK_AUTH_REJECTED` (the service said no).

**Server side rendering.** `createPuckClient` and `loadPuckData` are React-free:

```ts
import { createPuckClient } from '@commercetools-labs/contentools-api';
import { loadPuckData } from '@commercetools-labs/contentools-renderer';

const client = createPuckClient({
  baseURL: process.env.CONTENTOOLS_URL!,
  businessUnitKey: 'main-store',
  jwtToken: process.env.SERVICE_API_TOKEN, // server only: enables preview and datasource resolve
});
const puckData = await loadPuckData(client, { type: 'page', slug: '/home', mode: 'published' });
// then: <PuckDataRenderer data={puckData} />
```

**Semantic versioning.** After 1.0.0 a change to `PuckConnection`,
`PuckClient.request`, `PuckFetcher`/`PuckResponse`, `PuckAuthError`, the exported
raw API functions or the keys of `PUCK_AUTH_POLICY` is a major change; adding
optional fields or new functions is minor. Moving from the earlier packages with
a project key is described in [docs/migration-1.0.md](docs/migration-1.0.md).

---

## Localization (i18n)

All manager UIs are localized with **react-intl**. Shipped languages: English
(`en`), German (`de`) and Spanish (`es`). The German catalog is machine-translated and has not been
reviewed by a native speaker; the Spanish catalog was carried over from earlier code and has not been
reviewed either (see below for how catalogs are generated). The
`locale` prop selects the language; a full locale falls back to its base language
(`en-US` → `en`, `es-PE` → `es`, `de-DE` → `de`, anything else → `en`):

```tsx
<PageManager {...connection} parentUrl="/pages" locale="es-PE" />
```

**Overrides.** Every manager accepts `messageOverrides` — a flat
`{ messageId: string }` map applied on top of the resolved catalog:

```tsx
<PageManager
  {...connection}
  parentUrl="/pages"
  messageOverrides={{ 'PageManager.pagesTitle': 'My Pages' }}
/>
```

**Host provider.** If your app already mounts a react-intl `<IntlProvider>`
(e.g. the Merchant Center shell), its messages are preserved: each manager nests
its own provider and merges the package catalogs on top.

**Regenerating catalogs (maintainers).** Each package owns its catalog under
`src/intl/` (`en.json` is the source of truth; `es.json`, `de.json` and other locales are
generated, not hand-written). From the repo root:

```bash
node scripts/translate-messages.mjs --locale es          # generate/refresh es
node scripts/translate-messages.mjs --locale es --force  # retranslate all keys
```

It machine-translates missing keys (Google Translate — set
`GOOGLE_TRANSLATE_API_KEY` for the official API, otherwise a free endpoint is
used), protects ICU placeholders and rich-text tags, and applies
`scripts/i18n-glossary.json` for domain terms (e.g. `Slug`, `SKU`, `Hero`). Add
a new language with `--locale <code>`.

---

## Backend

The managers talk to the Contentools service, which exposes (per business unit) routes such as

```
/:businessUnitKey/puck-pages
```

The complete list is [docs/api-reference.md](../docs/api-reference.md). Pages are stored as
`PuckPageValue` `{ key, businessUnitKey, name, slug, puckData, meta, createdAt,
updatedAt }` in custom objects. See `service/` for the controller, routes and
container constants.

---

## Building and releasing

```bash
corepack enable                    # Yarn 4.5.1, pinned by "packageManager"
yarn install --immutable
yarn build                         # all packages, topological order, then the playground
yarn verify                        # headers, metadata, build, typecheck, consumer check, lint, tests
```

Releases are local and manual (there is no CI): from `puck/`, `node scripts/bump-versions.mjs <patch|minor|major|x.y.z[-pre.N]>`
changes all versions in lockstep (`yarn release:bump`), and `node scripts/publish-packages.mjs` packs and publishes the ten
packages in dependency order (`yarn release:publish`). It is a **dry run unless you pass `--execute`**, which needs a clean git
tree, an `npm login` session and a typed confirmation; pre-releases go to the `next` dist-tag. The runbook is the header
comment of `scripts/publish-packages.mjs`.

---

## Reference app

[`playground/`](playground/README.md) is a Vite + React + TypeScript app that mounts all managers and the
renderer. It runs against the bundled mock service (no real backend needed) or against a real Contentools service:

```bash
yarn install
cp playground/.env.example playground/.env
yarn workspace @commercetools-labs/contentools-playground mock   # mock service on http://localhost:8080/service
yarn start:playground                                      # http://localhost:5174
```

`VITE_AUTH_MODE` switches between `token` (static token), `fetcher` (simulates the
Merchant Center proxy transport) and `none` (anonymous: only published rendering
works). The mock accepts the token `dev-token` (`MOCK_SERVICE_TOKEN` changes it);
`MOCK_MEDIA=none` makes the media endpoints answer 501. Its `src/App.tsx` is a
concise, working example of mounting every component.
