# @commercetools-labs/puck-theme-manager

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Theme editor and content-type import screens for the Contentools content API.

## Install

```bash
yarn add @commercetools-labs/puck-theme-manager @chakra-ui/react @commercetools/nimbus react react-dom react-intl react-router-dom
```

## Usage

```tsx
import { ThemeManager } from '@commercetools-labs/puck-theme-manager';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads
};

<ThemeManager {...connection} />;
```

`ThemeManager` and `ImportContentTypes` create their own React Router v5 instance (needs `react-router-dom` v5). Props: the connection, `backButton?`, `messageOverrides?`.

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `ThemeManager` | component | Design-token editor with presets (reads and writes the `theme` configuration document) |
| `ImportContentTypes` | component | Imports the default content types through `POST /content-type/import` |
| `DEFAULT_THEME`, `themePresets`, `paradigmLabels`, `PRESET_KEYS_SELECTOR`, `buildCssVars` | const, function | Theme defaults, presets and CSS variable builder for storefronts |
| `ThemeTokens`, `ImportResult` | type | Re-exported from `puck-types` |
| `intlCatalogs` | const | The `intlCatalogs` export holds the message catalogs for `en`, `de` and `es`. The `de` catalog is machine-translated and has not been reviewed by a native speaker. |

## Peer dependencies

- `@chakra-ui/react` `^3.36.0`
- `@commercetools/nimbus` `^3.2.0`
- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`
- `react-router-dom` `>=5.0.0 <6`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
