# @commercetools-labs/puck-editor

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

Puck editor wrapper with the built-in components, fields and toolbar, bound to the content API.

## Install

```bash
yarn add @commercetools-labs/puck-editor @chakra-ui/react @commercetools/nimbus @commercetools/nimbus-icons react react-dom react-intl
```

## Usage

```tsx
import { PuckEditor, createDefaultPuckConfig } from '@commercetools-labs/puck-editor';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads
};

<PuckEditor {...connection} pageKey="puck-page-<id>" onPublish={(data) => console.log(data)} />;
```

Props: the connection (`baseURL`, `businessUnitKey`, `locale?`, `jwtToken?`, `getAuthHeaders?`, `fetcher?`, `publicDatasourceResolve?`), `pageKey` (required), `config?`, `onSave?`, `onPublish?`, `onError?`, `onPreview?`, `onDirtyChange?`, `showPublishButton?` (default `true`), `autoSaveDebounceMs?` (default `1500`), `messageOverrides?`.

Extend the default config with a custom component (build it inside a component that has a react-intl context):

```tsx
const intl = useIntl();
const base = createDefaultPuckConfig(intl);
const config = { ...base, components: { ...base.components, MyBlock: { /* Puck component config */ } } };
<PuckEditor {...connection} pageKey={key} config={config} />;
```

Use the same config in the editor and in the renderer so component data round-trips.

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `PuckEditor` | component | The editor with toolbar, auto-save, publish, templates and version history |
| `createDefaultPuckConfig(intl)`, `defaultPuckConfig` | function, const | Localized default config (the const is deprecated and English only) |
| `createHeroConfig`, `createRichTextConfig`, `createGridConfig`, `createColumnsConfig`, `createImageConfig`, `createButtonConfig`, `createCardConfig`, `createSpacerConfig`, `createProductTeaserConfig` | functions | Config factories of the built-in components |
| `ImagePickerField`, `DatasourceField`, `RichTextField`, `richTextField` | fields | Custom Puck field widgets |
| `EditorToolbar`, `UnsavedChangesDialog`, `CreateTemplateDialog`, `stripPuckDataToTemplate` | components, function | Toolbar parts and template creation |
| `useDirtyState` | hook | Unsaved-changes tracking |
| `ComponentSearchProvider`, `ComponentsPanel`, `ComponentItemFilter`, `nimbusFieldTypes`, `PanelResizer`, `PropertiesResizer`, `ComponentsResizer` | overrides | Puck UI overrides |
| `sanitizeHtml`, `intlCatalogs` | function, const | Re-exported from `puck-components`. The `intlCatalogs` export holds the message catalogs for `en`, `de` and `es`. The `de` catalog is machine-translated and has not been reviewed by a native speaker. |

## Peer dependencies

- `@chakra-ui/react` `^3.36.0`
- `@commercetools/nimbus` `^3.2.0`
- `@commercetools/nimbus-icons` `^3.2.0`
- `react` `>=19.0.0`
- `react-dom` `>=19.0.0`
- `react-intl` `>=6.0.0`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
