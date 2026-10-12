# @commercetools-labs/contentools-types

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

TypeScript types shared by the other packages: pages, content items, states, versions, templates, theme tokens and the connection contract (`PuckConnection`, `PuckFetcher`).

## Install

```bash
yarn add @commercetools-labs/contentools-types
```

## Usage

```ts
import type { PuckConnection, PuckPageValue, PuckData } from '@commercetools-labs/contentools-types';

const connection: PuckConnection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
};
```

The package contains types only; it has no runtime code.

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `PuckConnection`, `PuckFetcher`, `PuckRequest`, `PuckResponse`, `PuckAuthHeaders`, `PuckGetAuthHeaders`, `PuckHttpMethod` | type | The connection every component takes and the transport and auth hooks it can use |
| `PuckData`, `PuckComponentData`, `PuckConfig`, `PuckComponentConfig`, `Fields`, `Field` | type | Puck data and configuration shapes |
| `PuckPageValue`, `PuckPageMeta`, `PuckPageListItem`, `PuckPageWithStates` | type | Pages |
| `PuckContentValue`, `PuckContentMeta`, `PuckContentListItem`, `PuckContentWithStates`, `PuckContentState`, `PuckContentVersion`, `PuckContentVersionEntry`, `PuckContentStateInfo` | type | Content items and their states and versions |
| `PuckStateInfo`, `PuckPageState`, `PuckPageVersion`, `PuckPageVersionEntry` | type | Page states and versions |
| `PuckTemplateValue`, `PuckTemplateKind`, `PuckTemplateListItem`, `CreatePuckTemplateInput`, `PuckTemplateResponse`, `PuckTemplateListResponse` | type | Templates |
| `ThemeTokens`, `ImportResult` | type | Theme configuration and content-type import result |
| `MediaFile`, `MediaUploadResult`, `MediaLibraryPagination`, `MediaLibraryResult` | type | Media library (cursor pagination) |
| `CreatePuckPageInput`, `UpdatePuckPageInput`, `CreatePuckContentInput`, `UpdatePuckContentInput`, `CtCustomObject` and the `Puck*Response` types | type | Request and response shapes of the content API |

## Peer dependencies

None.

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
