# @commercetools-labs/contentools-image-picker

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Standalone image picker field with a media library, for Puck editors.

## Install

```bash
yarn add @commercetools-labs/contentools-image-picker @chakra-ui/react @commercetools/nimbus @commercetools/nimbus-icons react react-dom react-intl
```

## Usage

```tsx
import { ImagePickerProvider, ImagePickerField } from '@commercetools-labs/contentools-image-picker';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads
};

<ImagePickerProvider {...connection}>{/* render ImagePickerField as a Puck custom field */}</ImagePickerProvider>;
```

The picker lists media with Previous and Next (cursor pagination) and hides upload when the service has no media store (HTTP 501).

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `ImagePickerProvider` | component | Props are `PuckConnection`, `messageOverrides?` and `children` |
| `ImagePickerField` | component | The field widget |
| `useMediaLibrary` | hook | Re-exported from `contentools-api` |
| `MediaFile`, `MediaLibraryPagination`, `MediaLibraryResult` | type | Re-exported from `contentools-types` |
| `intlCatalogs` | const | The `intlCatalogs` export holds the message catalogs for `en`, `de` and `es`. The `de` catalog is machine-translated and has not been reviewed by a native speaker. |

## Peer dependencies

- `@chakra-ui/react` `^3.36.0`
- `@commercetools/nimbus` `^3.2.0`
- `@commercetools/nimbus-icons` `^3.2.0`
- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
