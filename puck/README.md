# Puck CMS packages

A set of `@commercetools-demo/puck-*` packages that add a Puck-based visual page
editor, content manager, theme manager and renderer to a commercetools project.
This guide covers **how to consume the packages from a host application**.

For the internal architecture and build workflow, see the package sources under
`packages/*` and the reference test app in `puck-react-test/`.

---

## Packages

| Package | Import | What it gives you |
| --- | --- | --- |
| `@commercetools-demo/puck-page-manager` | `PageManager` | Page list + editor/preview routes |
| `@commercetools-demo/puck-content-manager` | `ContentManager` | Standalone content-block list + editor |
| `@commercetools-demo/puck-theme-manager` | `ThemeManager` | Design-token editor |
| `@commercetools-demo/puck-renderer` | `PuckRenderer`, `PuckDataRenderer` | Storefront rendering (data-fetching / pure) |
| `@commercetools-demo/puck-editor` | `PuckEditor`, `createDefaultPuckConfig`, built-in component factories | Raw editor + Puck config for custom compositions |
| [`@commercetools-demo/puck-components`](packages/puck-components/README.md) | `defaultRenderConfig`, render fns | Nimbus-free component render layer shared by the editor + renderer ([rich-text theming variables](packages/puck-components/README.md#theming-rich-text-puck-rich-text-content)) |
| `@commercetools-demo/puck-api` | `PuckApiProvider`, hooks | Data layer (pages, contents, media, datasource, theme) |
| `@commercetools-demo/puck-types` | types only | Shared TypeScript types |

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
npm install @commercetools-demo/puck-page-manager \
            @commercetools-demo/puck-content-manager \
            @commercetools-demo/puck-theme-manager \
            @commercetools-demo/puck-renderer
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
const config = {
  baseURL: 'https://your-service.example.com',
  projectKey: 'your-project-key',
  businessUnitKey: 'your-business-unit-key',
  jwtToken: 'your-jwt-token',
  locale: 'en-US', // optional; sets the UI language (en/es) + locale-aware calls (e.g. product search)
};
```

### Page manager

```tsx
import { PageManager } from '@commercetools-demo/puck-page-manager';

export function PagesRoute() {
  return (
    <PageManager
      {...config}
      parentUrl="/pages" // route path this manager is mounted at (router basename)
    />
  );
}
```

Props: `parentUrl` (required), `baseURL`, `projectKey`, `businessUnitKey`,
`jwtToken`, `locale?`, `config?` (custom Puck `Config`), `backButton?`,
`messageOverrides?` (see [Localization](#localization-i18n)).

### Content manager

```tsx
import { ContentManager } from '@commercetools-demo/puck-content-manager';

export function ContentRoute() {
  return <ContentManager {...config} parentUrl="/content" defaultContentType="hero" />;
}
```

Props: same as `PageManager`, plus `defaultContentType?`.

### Theme manager

```tsx
import { ThemeManager } from '@commercetools-demo/puck-theme-manager';

export function ThemeRoute() {
  return <ThemeManager {...config} />;
}
```

Props: `baseURL`, `projectKey`, `businessUnitKey`, `jwtToken`, `locale?`,
`backButton?`, `messageOverrides?` (see [Localization](#localization-i18n)).

### Renderer (storefront)

Render a published (or preview/draft) page or content item. `PuckRenderer`
fetches the data itself:

```tsx
import { PuckRenderer } from '@commercetools-demo/puck-renderer';

// Render a page by key (or by slug)
<PuckRenderer
  type="page"
  baseURL={config.baseURL}
  projectKey={config.projectKey}
  businessUnitKey={config.businessUnitKey}
  pageKey="home-page"      // or: slug="/home"
  mode="published"          // or "preview"
/>

// Render a content item
<PuckRenderer
  type="content"
  baseURL={config.baseURL}
  projectKey={config.projectKey}
  businessUnitKey={config.businessUnitKey}
  contentKey="hero-banner"  // or: query="hero" (content type)
  mode="published"
/>
```

For SSR or when you already hold the Puck data, use the pure renderer:

```tsx
import { PuckDataRenderer } from '@commercetools-demo/puck-renderer';

<PuckDataRenderer data={puckData} />;
```

`PuckRenderer`'s `baseURL`/`projectKey`/`businessUnitKey` are optional if a
`PuckApiProvider` is already mounted higher in the tree.

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
[`@commercetools-demo/puck-components` README](packages/puck-components/README.md#theming-rich-text-puck-rich-text-content).

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
import { createDefaultPuckConfig } from '@commercetools-demo/puck-editor';

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

  return <PageManager {...config} parentUrl="/pages" config={puckConfig} />;
}
```

> The older `defaultPuckConfig` **const** is still exported but **deprecated**
> (English-only). Prefer `createDefaultPuckConfig(intl)` so component and field
> labels follow the active locale.

The **same `config` must be used** in the manager (authoring) and the renderer
(display) so component data round-trips correctly.

---

## Localization (i18n)

All manager UIs are localized with **react-intl**. Shipped languages: English
(`en`) and Spanish (`es`). The `locale` prop selects the language; a full locale
falls back to its base language (`en-US` → `en`, `es-PE` → `es`, anything else →
`en`):

```tsx
<PageManager {...config} parentUrl="/pages" locale="es-PE" />
```

**Overrides.** Every manager accepts `messageOverrides` — a flat
`{ messageId: string }` map applied on top of the resolved catalog:

```tsx
<PageManager
  {...config}
  parentUrl="/pages"
  messageOverrides={{ 'PageManager.pagesTitle': 'My Pages' }}
/>
```

**Host provider.** If your app already mounts a react-intl `<IntlProvider>`
(e.g. the Merchant Center shell), its messages are preserved: each manager nests
its own provider and merges the package catalogs on top.

**Regenerating catalogs (maintainers).** Each package owns its catalog under
`src/intl/` (`en.json` is the source of truth; `es.json` and other locales are
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

The managers talk to a service backend exposing (per business unit):

```
/:businessUnitKey/puck-pages
```

with the same auth middleware as the existing pages routes. Pages are stored as
`PuckPageValue` `{ key, businessUnitKey, name, slug, puckData, meta, createdAt,
updatedAt }` in custom objects. See `service/` for the controller, routes and
container constants.

---

## Reference app

`puck-react-test/` is a Vite + React + TypeScript app that mounts all managers.
Copy `.env.example` to `.env`, fill in your credentials, then:

```bash
yarn install
yarn start:test   # http://localhost:5174
```

Its `src/App.tsx` is a concise, working example of mounting every component.
