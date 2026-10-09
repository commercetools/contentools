# @commercetools-labs/puck-page-manager

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Router-aware page manager (list, editor, preview) for the Contentools content API.

## Install

```bash
yarn add @commercetools-labs/puck-page-manager @chakra-ui/react @commercetools/nimbus @commercetools/nimbus-icons react react-dom react-intl react-router-dom
```

## Usage

```tsx
import { PageManager } from '@commercetools-labs/puck-page-manager';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads
};

<PageManager {...connection} parentUrl="/pages" />;
```

`PageManager` creates its own React Router v5 instance with `parentUrl` as the basename, so it needs `react-router-dom` v5 (mount it in an isolated subtree if your app uses v6).

| Prop | Meaning |
| --- | --- |
| `parentUrl` (required) | Path the manager is mounted at |
| `baseURL`, `businessUnitKey` (required), `locale?`, `jwtToken?`, `getAuthHeaders?`, `fetcher?`, `publicDatasourceResolve?` | The connection |
| `config?` | Custom Puck config (default: localized default config) |
| `backButton?` | Element rendered before the breadcrumb in the editor and preview headers |
| `messageOverrides?` | Per-message-id overrides of UI strings |

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `PageManager` | component | Page list, editor and preview routes |
| `PageManagerProps` | type | Props of the component |

## Peer dependencies

- `@chakra-ui/react` `^3.36.0`
- `@commercetools/nimbus` `^3.2.0`
- `@commercetools/nimbus-icons` `^3.2.0`
- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`
- `react-router-dom` `>=5.0.0 <6`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
