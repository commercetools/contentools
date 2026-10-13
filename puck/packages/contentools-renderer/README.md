# @commercetools-labs/contentools-renderer

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Lightweight Puck page renderer for storefronts: fetches published (or preview) content, or renders data you already hold.

## Install

```bash
yarn add @commercetools-labs/contentools-renderer react react-dom react-intl
```

## Usage

```tsx
import { PuckRenderer, PuckDataRenderer, loadPuckData } from '@commercetools-labs/contentools-renderer';
import { createPuckClient } from '@commercetools-labs/contentools-api';

// Published content is public: no token needed.
<PuckRenderer baseURL="https://<your-service-host>/service" businessUnitKey="my-business-unit" type="page" slug="/home" mode="published" />;

// Server side: fetch on the server, render the data
const client = createPuckClient({ baseURL: process.env.CONTENTOOLS_URL!, businessUnitKey: 'my-business-unit' });
const puckData = await loadPuckData(client, { type: 'page', slug: '/home', mode: 'published' });
// then: <PuckDataRenderer data={puckData} />
```

`PuckRenderer` props:

| Prop | Meaning |
| --- | --- |
| `type?` | `'page'` (default) or `'content'` |
| `pageKey?` or `slug?` | Which page (type `page`) |
| `contentKey?` or `query?` | Which content item, by key or by content type (type `content`) |
| `mode?` | `'published'` (default) or `'preview'` (draft if present; needs credentials) |
| `config?` | Puck config; must match the one used in the editor (default: render-only config) |
| `locale?` | `en`, `de` or `es`; others fall back to English |
| connection props | `baseURL`, `businessUnitKey`, `jwtToken?`, `getAuthHeaders?`, `fetcher?`, `publicDatasourceResolve?`; optional when a `PuckApiProvider` is above |
| loading and error elements | Custom loading and error indicators |

Preview without credentials shows "Preview requires authentication" and sends nothing. Without a connection or provider it shows a message instead of throwing.

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `PuckRenderer` | component | Fetches and renders a page or content item |
| `PuckDataRenderer` | component | Pure renderer for data you already have (`data`, `config?`, `locale?`) |
| `loadPuckData` | function | React-free loader for server side rendering |
| `EnsureIntlProvider`, `resolveLang` | component, function | Locale helpers |
| `defaultRenderConfig`, `createRenderConfig`, `intlCatalogs` | const, function | Re-exported from `contentools-components`. The `intlCatalogs` export holds the message catalogs for `en`, `de` and `es`. The `de` catalog is machine-translated and has not been reviewed by a native speaker. |

## Peer dependencies

- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
