# @commercetools-labs/puck-content-manager

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Router-aware manager for standalone content items (list and editor) for the Contentools content API.

## Install

```bash
yarn add @commercetools-labs/puck-content-manager @chakra-ui/react @commercetools/nimbus @commercetools/nimbus-icons react react-dom react-intl react-router-dom
```

## Usage

```tsx
import { ContentManager } from '@commercetools-labs/puck-content-manager';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads
};

<ContentManager {...connection} parentUrl="/content" defaultContentType="hero" />;
```

`ContentManager` creates its own React Router v5 instance with `parentUrl` as the basename (needs `react-router-dom` v5).

| Prop | Meaning |
| --- | --- |
| `parentUrl` (required) | Path the manager is mounted at |
| `baseURL`, `businessUnitKey` (required), `locale?`, `jwtToken?`, `getAuthHeaders?`, `fetcher?`, `publicDatasourceResolve?` | The connection |
| `config?` | Custom Puck config |
| `defaultContentType?` | Content type preselected when creating an item |
| `backButton?`, `messageOverrides?` | As for the page manager |

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `ContentManager` | component | List and editor routes |
| `ContentManagerList`, `ContentEditor` | components | The two screens, for custom routing |
| `intlCatalogs` | const | The `intlCatalogs` export holds the message catalogs for `en`, `de` and `es`. The `de` catalog is machine-translated and has not been reviewed by a native speaker. |

## Peer dependencies

- `@chakra-ui/react` `^3.36.0`
- `@commercetools/nimbus` `^3.2.0`
- `@commercetools/nimbus-icons` `^3.2.0`
- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`
- `react-router-dom` `>=5.0.0 <6`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
