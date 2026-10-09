# @commercetools-labs/puck-version-history

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Version history panel, diff and hooks for Puck editor integrations.

## Install

```bash
yarn add @commercetools-labs/puck-version-history @commercetools/nimbus @commercetools/nimbus-icons react react-dom react-intl
```

## Usage

```tsx
import { VersionHistoryProvider, VersionHistoryButton, VersionHistorySidebarContent, useVersionHistoryPanel } from '@commercetools-labs/puck-version-history';
```

The editor package wires these in already (`PuckEditor`); use this package directly only to build your own editor shell.

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `VersionHistoryProvider`, `useVersionHistoryContext` | component, hook | Context for the panel |
| `VersionHistoryButton`, `VersionHistorySidebarContent`, `VersionCard`, `DiffSummary`, `VersionPreviewBanner`, `VersionAwareFieldsPanel` | components | Panel parts |
| `useVersionHistoryPanel`, `useVersionDiff` | hooks | Panel state and the diff between two versions |
| `ComponentDiff`, `PuckDataDiff`, `VersionEntry` | type | Diff and version shapes |
| `intlCatalogs` | const | The `intlCatalogs` export holds the message catalogs for `en`, `de` and `es`. The `de` catalog is machine-translated and has not been reviewed by a native speaker. |

## Peer dependencies

- `@commercetools/nimbus` `^3.2.0`
- `@commercetools/nimbus-icons` `^3.2.0`
- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
